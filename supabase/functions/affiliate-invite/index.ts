import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting for verify action - 5 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const verifyRateLimits = new Map<string, { count: number; resetAt: number }>();

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("cf-connecting-ip") || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

function checkVerifyRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = verifyRateLimits.get(ip);
  
  // Clean up old entries periodically
  if (verifyRateLimits.size > 1000) {
    for (const [key, value] of verifyRateLimits.entries()) {
      if (value.resetAt < now) {
        verifyRateLimits.delete(key);
      }
    }
  }
  
  if (!entry || entry.resetAt < now) {
    verifyRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

// Normaliza CPF removendo caracteres não numéricos
function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    console.log(`[affiliate-invite] Action: ${action}, body:`, JSON.stringify(body));

    switch (action) {
      case "send": {
        // Loja envia convite para afiliado - agora usa CPF como identificador principal
        const { 
          store_id, 
          cpf,
          email, // Email agora é opcional
          name,
          coupon_id, // Legacy: single coupon ID
          coupon_ids, // New: array of coupon IDs
          // Commission values from user configuration
          default_commission_type = 'percentage',
          default_commission_value = 0,
          use_default_commission = true,
          commission_maturity_days = 7,
        } = body;
        
        // Support both single coupon_id and array of coupon_ids
        const allCouponIds: string[] = coupon_ids && Array.isArray(coupon_ids) && coupon_ids.length > 0 
          ? coupon_ids 
          : (coupon_id ? [coupon_id] : []);

        console.log(`[affiliate-invite] Send action: cpf=${cpf}, store_id=${store_id}, name=${name}, email=${email}`);

        // Validar autorização
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          console.log(`[affiliate-invite] No auth header`);
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          console.log(`[affiliate-invite] Auth error:`, authError);
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Authenticated user: ${user.id}`);

        // Verificar se é dono da loja
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id, name, owner_id")
          .eq("id", store_id)
          .single();

        console.log(`[affiliate-invite] Store lookup:`, store ? `found: ${store.name}` : 'not found', storeError?.message);

        if (!store || store.owner_id !== user.id) {
          console.log(`[affiliate-invite] Store permission denied. Store owner: ${store?.owner_id}, user: ${user.id}`);
          return new Response(
            JSON.stringify({ error: "Sem permissão para esta loja" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!cpf || !name) {
          console.log(`[affiliate-invite] Missing CPF or name`);
          return new Response(
            JSON.stringify({ error: "CPF e nome são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const normalizedCpf = normalizeCpf(cpf);
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        console.log(`[affiliate-invite] Normalized CPF: ${normalizedCpf}, email: ${normalizedEmail}`);

        // Verificar se e-mail já está cadastrado em outra conta (se fornecido)
        if (normalizedEmail && !normalizedEmail.includes('@temp.local')) {
          const { data: existingWithEmail } = await supabase
            .from("affiliate_accounts")
            .select("id, cpf_cnpj")
            .eq("email", normalizedEmail)
            .single();

          if (existingWithEmail) {
            // Verificar se é outro CPF usando este e-mail
            const existingAccountCpf = normalizeCpf(existingWithEmail.cpf_cnpj || '');
            if (existingAccountCpf !== normalizedCpf) {
              console.log(`[affiliate-invite] Email ${normalizedEmail} already in use by another CPF`);
              return new Response(
                JSON.stringify({ error: "Este e-mail já está cadastrado em outra conta de afiliado" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }

        // Verificar se já existe conta de afiliado com este CPF
        let affiliateAccount;
        
        // Buscar todas as contas com CPF e verificar manualmente
        const { data: allAccounts, error: accountsError } = await supabase
          .from("affiliate_accounts")
          .select("*")
          .not("cpf_cnpj", "is", null);

        let existingAccount = null;
        if (allAccounts) {
          for (const acc of allAccounts) {
            if (normalizeCpf(acc.cpf_cnpj || '') === normalizedCpf) {
              existingAccount = acc;
              break;
            }
          }
        }

        console.log(`[affiliate-invite] Existing account check by CPF:`, existingAccount ? `found: id=${existingAccount.id}, is_verified=${existingAccount.is_verified}` : 'not found');

        if (existingAccount) {
          affiliateAccount = existingAccount;

          // Verificar se já é afiliado desta loja
          const { data: existingAffiliation, error: affiliationError } = await supabase
            .from("store_affiliates")
            .select("*")
            .eq("affiliate_account_id", existingAccount.id)
            .eq("store_id", store_id)
            .single();

          console.log(`[affiliate-invite] Existing affiliation check:`, existingAffiliation ? `found: id=${existingAffiliation.id}, status=${existingAffiliation.status}` : 'not found', affiliationError?.message);

          if (existingAffiliation) {
            if (existingAffiliation.status === "active") {
              console.log(`[affiliate-invite] Affiliation already active`);
              return new Response(
                JSON.stringify({ error: "Este afiliado já está vinculado à sua loja" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Reativar afiliação pendente/inativa
            const inviteToken = generateToken();
            const inviteExpires = new Date();
            inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

            console.log(`[affiliate-invite] Reactivating affiliation: is_verified=${existingAccount.is_verified}, new_token=${inviteToken}, expires=${inviteExpires.toISOString()}`);

            const { data: updatedAffiliation, error: updateError } = await supabase
              .from("store_affiliates")
              .update({
                status: "pending",
                is_active: true,
                invite_token: inviteToken,
                invite_expires: inviteExpires.toISOString(),
                default_commission_type: default_commission_type,
                default_commission_value: default_commission_value,
                use_default_commission: use_default_commission,
                commission_maturity_days: commission_maturity_days,
                coupon_id: allCouponIds[0] || null,
              })
              .eq("id", existingAffiliation.id)
              .select()
              .single();
            
            // Update store_affiliate_coupons junction table
            if (!updateError && updatedAffiliation) {
              // Delete existing coupons
              await supabase
                .from("store_affiliate_coupons")
                .delete()
                .eq("store_affiliate_id", updatedAffiliation.id);
              
              // Insert all coupons
              if (allCouponIds.length > 0) {
                const couponInserts = allCouponIds.map(cId => ({
                  store_affiliate_id: updatedAffiliation.id,
                  coupon_id: cId,
                }));
                const { error: sacError } = await supabase
                  .from("store_affiliate_coupons")
                  .insert(couponInserts);
                
                if (sacError) {
                  console.error("[affiliate-invite] store_affiliate_coupons reactivation insert error:", sacError);
                } else {
                  console.log(`[affiliate-invite] store_affiliate_coupons reactivation: inserted ${allCouponIds.length} coupons`);
                }
              }
            }

            if (updateError) {
              console.error(`[affiliate-invite] Update affiliation error:`, updateError);
              return new Response(
                JSON.stringify({ error: "Erro ao atualizar afiliação" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            console.log(`[affiliate-invite] Affiliation updated successfully:`, {
              id: updatedAffiliation.id,
              invite_token: updatedAffiliation.invite_token,
              invite_expires: updatedAffiliation.invite_expires,
              status: updatedAffiliation.status
            });

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: "Convite reenviado com sucesso",
                invite_token: inviteToken,
                already_verified: existingAccount.is_verified,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Criar nova conta de afiliado (sem senha ainda) - CPF é o identificador principal
          console.log(`[affiliate-invite] Creating new affiliate account for CPF: ${normalizedCpf}`);
          
          const { data: newAccount, error: createError } = await supabase
            .from("affiliate_accounts")
            .insert({
              cpf_cnpj: normalizedCpf,
              email: normalizedEmail || `afiliado_${normalizedCpf}@temp.local`, // Email temporário se não fornecido
              name: name,
              password_hash: "", // Será definido no registro
              is_verified: false,
            })
            .select()
            .single();

          if (createError) {
            console.error("[affiliate-invite] Create account error:", createError);
            return new Response(
              JSON.stringify({ error: "Erro ao criar conta de afiliado" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log(`[affiliate-invite] New account created: id=${newAccount.id}, cpf=${newAccount.cpf_cnpj}, is_verified=${newAccount.is_verified}`);
          affiliateAccount = newAccount;
        }

        // Criar afiliação à loja
        const inviteToken = generateToken();
        const inviteExpires = new Date();
        inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

        console.log(`[affiliate-invite] Creating store_affiliate: account_id=${affiliateAccount.id}, is_verified=${affiliateAccount.is_verified}, token=${inviteToken}, expires=${inviteExpires.toISOString()}`);

        const { data: storeAffiliate, error: affiliateError } = await supabase
          .from("store_affiliates")
          .insert({
            affiliate_account_id: affiliateAccount.id,
            store_id: store_id,
            coupon_id: allCouponIds[0] || null,
            default_commission_type: default_commission_type,
            default_commission_value: default_commission_value,
            use_default_commission: use_default_commission,
            commission_maturity_days: commission_maturity_days,
            invite_token: inviteToken,
            invite_expires: inviteExpires.toISOString(),
            status: "pending",
            accepted_at: null,
          })
          .select()
          .single();

        if (affiliateError) {
          console.error("[affiliate-invite] Create affiliation error:", affiliateError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar afiliação" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Store affiliate created successfully:`, {
          id: storeAffiliate.id,
          invite_token: storeAffiliate.invite_token,
          invite_expires: storeAffiliate.invite_expires,
          status: storeAffiliate.status
        });

        // Insert ALL coupons into store_affiliate_coupons junction table
        if (allCouponIds.length > 0) {
          const couponInserts = allCouponIds.map(cId => ({
            store_affiliate_id: storeAffiliate.id,
            coupon_id: cId,
          }));
          
          const { error: sacError } = await supabase
            .from("store_affiliate_coupons")
            .insert(couponInserts);
          
          if (sacError) {
            console.error("[affiliate-invite] store_affiliate_coupons insert error:", sacError);
          } else {
            console.log(`[affiliate-invite] store_affiliate_coupons inserted: store_affiliate_id=${storeAffiliate.id}, coupon_ids=${allCouponIds.join(', ')}`);
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Convite enviado com sucesso",
            invite_token: inviteToken,
            store_affiliate_id: storeAffiliate.id,
            already_verified: false,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-invite-link": {
        // Buscar ou regenerar link de convite para afiliado existente - agora suporta CPF
        const { store_id, affiliate_email, affiliate_cpf } = body;

        // Validar autorização
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Não autorizado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se é dono da loja
        const { data: store } = await supabase
          .from("stores")
          .select("id, owner_id")
          .eq("id", store_id)
          .single();

        if (!store || store.owner_id !== user.id) {
          return new Response(
            JSON.stringify({ error: "Sem permissão para esta loja" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar conta do afiliado - por CPF ou email
        let affiliateAccount = null;

        if (affiliate_cpf) {
          const normalizedCpf = normalizeCpf(affiliate_cpf);
          const { data: accounts } = await supabase
            .from("affiliate_accounts")
            .select("id, is_verified, cpf_cnpj")
            .not("cpf_cnpj", "is", null);

          if (accounts) {
            for (const acc of accounts) {
              if (normalizeCpf(acc.cpf_cnpj || '') === normalizedCpf) {
                affiliateAccount = acc;
                break;
              }
            }
          }
        } else if (affiliate_email) {
          const normalizedEmail = affiliate_email.toLowerCase().trim();
          const { data: acc } = await supabase
            .from("affiliate_accounts")
            .select("id, is_verified")
            .eq("email", normalizedEmail)
            .single();
          affiliateAccount = acc;
        }

        if (!affiliateAccount) {
          return new Response(
            JSON.stringify({ error: "Afiliado não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar afiliação com a loja
        const { data: storeAffiliate } = await supabase
          .from("store_affiliates")
          .select("*")
          .eq("affiliate_account_id", affiliateAccount.id)
          .eq("store_id", store_id)
          .single();

        if (!storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Afiliação não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se afiliado já verificou a conta, não precisa de link de convite
        if (affiliateAccount.is_verified) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              already_verified: true,
              message: "Este afiliado já está cadastrado e verificado"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Se já tem token válido, retornar
        if (storeAffiliate.invite_token && storeAffiliate.invite_expires) {
          const expiresAt = new Date(storeAffiliate.invite_expires);
          if (expiresAt > new Date()) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                invite_token: storeAffiliate.invite_token,
                expires_at: storeAffiliate.invite_expires
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Gerar novo token
        const inviteToken = generateToken();
        const inviteExpires = new Date();
        inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 dias

        await supabase
          .from("store_affiliates")
          .update({
            invite_token: inviteToken,
            invite_expires: inviteExpires.toISOString(),
            status: "pending",
          })
          .eq("id", storeAffiliate.id);

        console.log(`[affiliate-invite] Generated new invite token for affiliate account: ${affiliateAccount.id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            invite_token: inviteToken,
            expires_at: inviteExpires.toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        // Rate limit check for verify action
        const clientIP = getClientIP(req);
        const rateCheck = checkVerifyRateLimit(clientIP);
        
        if (!rateCheck.allowed) {
          console.log(`[affiliate-invite] Rate limit exceeded for IP: ${clientIP}`);
          return new Response(
            JSON.stringify({ 
              valid: false, 
              error: "Muitas tentativas. Tente novamente em alguns minutos.",
              retry_after: rateCheck.retryAfter 
            }),
            { 
              status: 429, 
              headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "Retry-After": String(rateCheck.retryAfter)
              } 
            }
          );
        }
        
        // Verificar se token de convite é válido
        const { token } = body;

        console.log(`[affiliate-invite] ========== VERIFY ACTION ==========`);
        console.log(`[affiliate-invite] Token received: "${token}", IP: ${clientIP}`);
        console.log(`[affiliate-invite] Token length: ${token?.length}`);

        if (!token) {
          console.log(`[affiliate-invite] ERROR: Token is empty or undefined`);
          return new Response(
            JSON.stringify({ valid: false, error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar especificamente pelo token
        const { data: storeAffiliate, error } = await supabase
          .from("store_affiliates")
          .select(`
            *,
            affiliate_accounts!inner(id, email, name, is_verified, cpf_cnpj),
            stores!inner(id, name, logo_url)
          `)
          .eq("invite_token", token)
          .single();

        console.log(`[affiliate-invite] Query result:`, {
          found: !!storeAffiliate,
          error: error?.message,
          errorCode: error?.code
        });

        if (error || !storeAffiliate) {
          console.log(`[affiliate-invite] Token NOT found in database: "${token}"`);

          return new Response(
            JSON.stringify({ valid: false, error: "Convite não encontrado" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Token FOUND! Affiliate data:`, {
          store_affiliate_id: storeAffiliate.id,
          affiliate_account_id: storeAffiliate.affiliate_account_id,
          is_verified: storeAffiliate.affiliate_accounts.is_verified,
          cpf_cnpj: storeAffiliate.affiliate_accounts.cpf_cnpj,
          status: storeAffiliate.status,
          invite_expires: storeAffiliate.invite_expires,
          now: new Date().toISOString()
        });

        // Verificar se já está verificado - auto-ativar afiliação com nova loja
        if (storeAffiliate.affiliate_accounts.is_verified) {
          console.log(`[affiliate-invite] Affiliate already verified - auto-activating store affiliation`);
          
          // Auto-ativar a afiliação da nova loja
          const { error: activateError } = await supabase
            .from("store_affiliates")
            .update({
              status: "active",
              is_active: true,
              accepted_at: new Date().toISOString(),
              invite_token: null,
              invite_expires: null,
            })
            .eq("id", storeAffiliate.id);

          if (activateError) {
            console.error(`[affiliate-invite] Error auto-activating store affiliation:`, activateError);
            return new Response(
              JSON.stringify({ valid: false, error: "Erro ao ativar afiliação. Tente novamente." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log(`[affiliate-invite] Store affiliation auto-activated for verified affiliate`);
          
          return new Response(
            JSON.stringify({ 
              valid: true,
              already_verified: true,
              message: "Loja adicionada à sua conta com sucesso! Faça login para acessar.",
              store: {
                id: storeAffiliate.stores.id,
                name: storeAffiliate.stores.name,
                logo_url: storeAffiliate.stores.logo_url,
              }
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se expirou
        if (storeAffiliate.invite_expires) {
          const expiresAt = new Date(storeAffiliate.invite_expires);
          const now = new Date();
          console.log(`[affiliate-invite] Expiration check: expires=${expiresAt.toISOString()}, now=${now.toISOString()}, expired=${expiresAt < now}`);
          if (expiresAt < now) {
            console.log(`[affiliate-invite] Token EXPIRED`);
            return new Response(
              JSON.stringify({ valid: false, error: "Convite expirado. Solicite um novo link ao lojista." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verificar status
        if (storeAffiliate.status === "active") {
          console.log(`[affiliate-invite] Status is already active`);
          return new Response(
            JSON.stringify({ valid: false, error: "Este convite já foi aceito. Faça login na sua conta." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[affiliate-invite] Token VALID! Returning success`);

        return new Response(
          JSON.stringify({ 
            valid: true,
            affiliate: {
              email: storeAffiliate.affiliate_accounts.email,
              name: storeAffiliate.affiliate_accounts.name,
              cpf_cnpj: storeAffiliate.affiliate_accounts.cpf_cnpj,
            },
            store: {
              id: storeAffiliate.stores.id,
              name: storeAffiliate.stores.name,
              logo_url: storeAffiliate.stores.logo_url,
            },
            commission_type: storeAffiliate.default_commission_type,
            commission_value: storeAffiliate.default_commission_value,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept": {
        // Afiliado já cadastrado aceita convite para nova loja
        const { affiliate_token, invite_token } = body;

        if (!affiliate_token || !invite_token) {
          return new Response(
            JSON.stringify({ error: "Tokens não fornecidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão do afiliado
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar convite
        const { data: storeAffiliate, error: inviteError } = await supabase
          .from("store_affiliates")
          .select("*, stores!inner(id, name)")
          .eq("invite_token", invite_token)
          .single();

        if (inviteError || !storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Convite não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar se convite expirou
        if (storeAffiliate.invite_expires) {
          const expiresAt = new Date(storeAffiliate.invite_expires);
          if (expiresAt < new Date()) {
            return new Response(
              JSON.stringify({ error: "Convite expirado" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Atualizar afiliação para vincular à conta atual do afiliado
        const { error: updateError } = await supabase
          .from("store_affiliates")
          .update({
            affiliate_account_id: affiliateAccountId,
            status: "active",
            is_active: true,
            accepted_at: new Date().toISOString(),
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", storeAffiliate.id);

        if (updateError) {
          console.error("[affiliate-invite] Accept error:", updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao aceitar convite" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Convite aceito com sucesso",
            store: {
              id: storeAffiliate.stores.id,
              name: storeAffiliate.stores.name,
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list-stores": {
        // Listar lojas do afiliado
        const { affiliate_token } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar lojas usando a função
        const { data: stores, error: storesError } = await supabase.rpc(
          "get_affiliate_stores",
          { p_affiliate_account_id: affiliateAccountId }
        );

        if (storesError) {
          console.error("[affiliate-invite] List stores error:", storesError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar lojas" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ stores: stores || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "stats": {
        // Buscar estatísticas consolidadas
        const { affiliate_token } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar estatísticas usando a função
        const { data: stats, error: statsError } = await supabase.rpc(
          "get_affiliate_consolidated_stats",
          { p_affiliate_account_id: affiliateAccountId }
        );

        if (statsError) {
          console.error("[affiliate-invite] Stats error:", statsError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar estatísticas" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ stats: stats?.[0] || null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "orders": {
        // Buscar pedidos do afiliado
        const { affiliate_token, store_id } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar store_affiliates deste afiliado COM commission_maturity_days
        let storeAffiliatesQuery = supabase
          .from("store_affiliates")
          .select("id, store_id, commission_maturity_days")
          .eq("affiliate_account_id", affiliateAccountId)
          .eq("is_active", true);

        if (store_id) {
          storeAffiliatesQuery = storeAffiliatesQuery.eq("store_id", store_id);
        }

        const { data: storeAffiliates, error: saError } = await storeAffiliatesQuery;

        if (saError || !storeAffiliates || storeAffiliates.length === 0) {
          return new Response(
            JSON.stringify({ orders: [] }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const storeAffiliateIds = storeAffiliates.map(sa => sa.id);
        
        // Criar mapa de store_affiliate_id -> maturity_days
        const maturityMap = new Map<string, number>();
        storeAffiliates.forEach(sa => {
          maturityMap.set(sa.id, sa.commission_maturity_days ?? 7);
        });

        // Buscar earnings por store_affiliate_id COM updated_at do pedido
        const { data: earnings, error: earningsError } = await supabase
          .from("affiliate_earnings")
          .select(`
            id,
            order_id,
            order_total,
            commission_amount,
            status,
            store_affiliate_id,
            orders!inner(
              id,
              order_number,
              customer_name,
              created_at,
              updated_at,
              store_id,
              subtotal,
              coupon_discount,
              coupon_code,
              status,
              stores!inner(name)
            )
          `)
          .in("store_affiliate_id", storeAffiliateIds)
          .order("created_at", { ascending: false });

        if (earningsError) {
          console.error("[affiliate-invite] Orders error:", earningsError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar pedidos" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Formatar resposta COM maturity data
        const orders = (earnings || []).map((e: any) => {
          const maturityDays = maturityMap.get(e.store_affiliate_id) ?? 7;
          const orderStatus = e.orders?.status;
          const isDelivered = orderStatus === 'entregue' || orderStatus === 'delivered';
          
          // Calcular commission_available_at para pedidos entregues
          let commissionAvailableAt: string | null = null;
          if (isDelivered && e.orders?.updated_at) {
            const updatedAt = new Date(e.orders.updated_at);
            const availableAt = new Date(updatedAt.getTime() + (maturityDays * 24 * 60 * 60 * 1000));
            commissionAvailableAt = availableAt.toISOString();
          }
          
          return {
            earning_id: e.id,
            order_id: e.orders?.id || e.order_id,
            order_number: e.orders?.order_number,
            customer_name: e.orders?.customer_name,
            order_date: e.orders?.created_at,
            store_id: e.orders?.store_id,
            store_name: e.orders?.stores?.name,
            store_affiliate_id: e.store_affiliate_id,
            order_total: e.order_total,
            order_subtotal: e.orders?.subtotal,
            coupon_discount: e.orders?.coupon_discount || 0,
            commission_amount: e.commission_amount,
            commission_status: e.status,
            coupon_code: e.orders?.coupon_code,
            order_status: orderStatus,
            commission_available_at: commissionAvailableAt,
            maturity_days: maturityDays,
          };
        });

        return new Response(
          JSON.stringify({ orders }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "order-details": {
        // Buscar detalhes do pedido (itens com comissão)
        const { affiliate_token, order_id, store_affiliate_id } = body;

        if (!affiliate_token || !order_id) {
          return new Response(
            JSON.stringify({ error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Verificar se afiliado tem acesso a este pedido
        let earningQuery = supabase
          .from("affiliate_earnings")
          .select("id")
          .eq("order_id", order_id);

        if (store_affiliate_id) {
          earningQuery = earningQuery.eq("store_affiliate_id", store_affiliate_id);
        }

        const { data: earning, error: earningError } = await earningQuery.single();

        if (earningError || !earning) {
          return new Response(
            JSON.stringify({ error: "Pedido não encontrado ou sem acesso" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar itens com comissão
        const { data: itemEarnings, error: itemsError } = await supabase
          .from("affiliate_item_earnings")
          .select(`
            id,
            order_item_id,
            product_id,
            product_name,
            product_category,
            item_subtotal,
            item_discount,
            item_value_with_discount,
            is_coupon_eligible,
            coupon_scope,
            commission_type,
            commission_value,
            commission_amount,
            commission_source
          `)
          .eq("earning_id", earning.id);

        if (itemsError) {
          console.error("[affiliate-invite] Order details error:", itemsError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar detalhes" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Buscar dados dos order_items para complementar
        const orderItemIds = (itemEarnings || []).map(ie => ie.order_item_id);
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("id, quantity, unit_price")
          .in("id", orderItemIds);

        const orderItemsMap = new Map((orderItems || []).map(oi => [oi.id, oi]));

        // Formatar resposta
        const items = (itemEarnings || []).map(ie => {
          const oi = orderItemsMap.get(ie.order_item_id);
          return {
            item_id: ie.order_item_id,
            product_id: ie.product_id,
            product_name: ie.product_name,
            product_category: ie.product_category || "",
            quantity: oi?.quantity || 1,
            unit_price: oi?.unit_price || 0,
            subtotal: ie.item_subtotal,
            item_discount: ie.item_discount || 0,
            item_value_with_discount: ie.item_value_with_discount,
            is_coupon_eligible: ie.is_coupon_eligible,
            coupon_scope: ie.coupon_scope || "all",
            commission_type: ie.commission_type,
            commission_source: ie.commission_source || "default",
            commission_value: ie.commission_value,
            item_commission: ie.commission_amount,
          };
        });

        return new Response(
          JSON.stringify({ items }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pending-invites": {
        // Buscar convites pendentes para o afiliado logado
        const { affiliate_token } = body;

        if (!affiliate_token) {
          return new Response(
            JSON.stringify({ error: "Token não fornecido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão do afiliado
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar convites pendentes para este afiliado
        const { data: pendingInvites, error: invitesError } = await supabase
          .from("store_affiliates")
          .select(`
            id,
            store_id,
            status,
            invite_expires,
            created_at,
            stores!inner(id, name, logo_url)
          `)
          .eq("affiliate_account_id", affiliateAccountId)
          .eq("status", "pending")
          .gt("invite_expires", new Date().toISOString());

        if (invitesError) {
          console.error("[affiliate-invite] Error fetching pending invites:", invitesError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar convites" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const invites = (pendingInvites || []).map((inv: any) => ({
          id: inv.id,
          store_id: inv.store_id,
          store_name: inv.stores.name,
          store_logo: inv.stores.logo_url,
          invited_at: inv.created_at,
          expires_at: inv.invite_expires,
        }));

        return new Response(
          JSON.stringify({ invites }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept-invite-manual": {
        // Afiliado aceita convite manualmente pelo dashboard
        const { affiliate_token, store_affiliate_id } = body;

        if (!affiliate_token || !store_affiliate_id) {
          return new Response(
            JSON.stringify({ error: "Parâmetros inválidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão do afiliado
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Buscar o convite
        const { data: storeAffiliate, error: fetchError } = await supabase
          .from("store_affiliates")
          .select("*, stores!inner(name)")
          .eq("id", store_affiliate_id)
          .eq("affiliate_account_id", affiliateAccountId)
          .single();

        if (fetchError || !storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Convite não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (storeAffiliate.status !== "pending") {
          return new Response(
            JSON.stringify({ error: "Este convite já foi processado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verificar expiração
        if (storeAffiliate.invite_expires && new Date(storeAffiliate.invite_expires) < new Date()) {
          return new Response(
            JSON.stringify({ error: "Convite expirado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Aceitar convite
        const { error: updateError } = await supabase
          .from("store_affiliates")
          .update({
            status: "active",
            is_active: true,
            accepted_at: new Date().toISOString(),
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", store_affiliate_id);

        if (updateError) {
          console.error("[affiliate-invite] Error accepting invite:", updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao aceitar convite" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Você agora é afiliado da loja ${storeAffiliate.stores.name}!` 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject-invite": {
        // Afiliado recusa convite manualmente pelo dashboard
        const { affiliate_token, store_affiliate_id } = body;

        if (!affiliate_token || !store_affiliate_id) {
          return new Response(
            JSON.stringify({ error: "Parâmetros inválidos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validar sessão do afiliado
        const { data: validation } = await supabase.rpc("validate_affiliate_session", {
          session_token: affiliate_token,
        });

        if (!validation || validation.length === 0 || !validation[0].is_valid) {
          return new Response(
            JSON.stringify({ error: "Sessão inválida" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const affiliateAccountId = validation[0].affiliate_id;

        // Verificar se o convite pertence ao afiliado
        const { data: storeAffiliate, error: fetchError } = await supabase
          .from("store_affiliates")
          .select("*, stores!inner(name)")
          .eq("id", store_affiliate_id)
          .eq("affiliate_account_id", affiliateAccountId)
          .single();

        if (fetchError || !storeAffiliate) {
          return new Response(
            JSON.stringify({ error: "Convite não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (storeAffiliate.status !== "pending") {
          return new Response(
            JSON.stringify({ error: "Este convite já foi processado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Recusar convite - atualizar status para "rejected"
        const { error: updateError } = await supabase
          .from("store_affiliates")
          .update({
            status: "rejected",
            is_active: false,
            invite_token: null,
            invite_expires: null,
          })
          .eq("id", store_affiliate_id);

        if (updateError) {
          console.error("[affiliate-invite] Error rejecting invite:", updateError);
          return new Response(
            JSON.stringify({ error: "Erro ao recusar convite" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Convite da loja ${storeAffiliate.stores.name} recusado.` 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[affiliate-invite] Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
