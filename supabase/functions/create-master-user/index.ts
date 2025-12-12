import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with user's token for auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user token and get user info
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid token or user not found");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("[CREATE-MASTER-USER] User is not admin:", user.id);
      throw new Error("Unauthorized: Admin access required");
    }

    const { store_id } = await req.json();
    
    if (!store_id) {
      throw new Error("store_id is required");
    }

    console.log("[CREATE-MASTER-USER] Processing store:", store_id);

    // Fetch store info
    const { data: store, error: storeError } = await supabaseClient
      .from("stores")
      .select("id, name, master_user_email")
      .eq("id", store_id)
      .single();

    if (storeError || !store) {
      console.error("[CREATE-MASTER-USER] Store not found:", storeError);
      throw new Error("Store not found");
    }

    // Check if master user already exists
    if (store.master_user_email) {
      console.log("[CREATE-MASTER-USER] Master user already exists:", store.master_user_email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          email: store.master_user_email,
          message: "Master user already exists" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email from first 8 characters of store UUID
    const storeIdPrefix = store_id.substring(0, 8);
    const masterEmail = `${storeIdPrefix}@ofertas.app`;
    const masterPassword = "Master@2026";

    console.log("[CREATE-MASTER-USER] Creating master user with email:", masterEmail);

    // Create the user in Supabase Auth
    const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (createUserError) {
      console.error("[CREATE-MASTER-USER] Error creating user:", createUserError);
      throw new Error(`Failed to create user: ${createUserError.message}`);
    }

    if (!newUser.user) {
      throw new Error("User creation returned no user");
    }

    console.log("[CREATE-MASTER-USER] User created:", newUser.user.id);

    // Create profile for the master user
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: newUser.user.id,
        full_name: `Usuário Master - ${store.name}`,
        phone: null,
      });

    if (profileError) {
      console.error("[CREATE-MASTER-USER] Error creating profile:", profileError);
      // Continue anyway, profile is optional
    }

    // Define full permissions for master user
    const fullPermissions = {
      orders: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true, 
        change_status: true, 
        print: true, 
        notify_whatsapp: true, 
        manage_statuses: true 
      },
      products: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true, 
        manage_addons: true, 
        manage_variants: true, 
        manage_images: true 
      },
      categories: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true, 
        reorder: true 
      },
      delivery: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true 
      },
      coupons: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true, 
        toggle_status: true 
      },
      reports: { 
        enabled: true, 
        view: true, 
        export: true 
      },
      settings: { 
        enabled: true, 
        view: true, 
        update_store_info: true, 
        update_delivery_settings: true, 
        update_operating_hours: true 
      },
      whatsapp: { 
        enabled: true, 
        edit: true 
      },
      affiliates: { 
        enabled: true, 
        view: true, 
        create: true, 
        update: true, 
        delete: true, 
        toggle_status: true, 
        view_commissions: true, 
        manage_commission_rules: true, 
        create_payments: true, 
        generate_invite_link: true, 
        view_reports: true 
      }
    };

    // Create store_employee record with full permissions
    const { error: employeeError } = await supabaseClient
      .from("store_employees")
      .insert({
        store_id: store_id,
        user_id: newUser.user.id,
        position: "Master",
        permissions: fullPermissions,
        is_active: true,
      });

    if (employeeError) {
      console.error("[CREATE-MASTER-USER] Error creating employee:", employeeError);
      throw new Error(`Failed to create employee record: ${employeeError.message}`);
    }

    console.log("[CREATE-MASTER-USER] Employee record created");

    // Update store with master_user_email
    const { error: updateStoreError } = await supabaseClient
      .from("stores")
      .update({ master_user_email: masterEmail })
      .eq("id", store_id);

    if (updateStoreError) {
      console.error("[CREATE-MASTER-USER] Error updating store:", updateStoreError);
      throw new Error(`Failed to update store: ${updateStoreError.message}`);
    }

    console.log("[CREATE-MASTER-USER] Store updated with master_user_email:", masterEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: masterEmail,
        password: masterPassword,
        message: "Master user created successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[CREATE-MASTER-USER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});