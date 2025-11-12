import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Validation schema for request body
const emailCheckSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting per user ID
    const userId = user.id;
    const now = Date.now();
    const userRateLimit = rateLimitMap.get(userId);

    if (userRateLimit) {
      if (now < userRateLimit.resetTime) {
        if (userRateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userRateLimit.count++;
      } else {
        // Reset window
        rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      }
    } else {
      rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

    // Cleanup old entries periodically
    if (rateLimitMap.size > 1000) {
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      }
    }

    const rawData = await req.json()
    
    // Validate email input
    const { email } = emailCheckSchema.parse(rawData);

    // Use service role to check email existence
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // List users and check if email exists
    const { data: { users }, error } = await serviceClient.auth.admin.listUsers();

    if (error) {
      console.error('Error listing users:', error);
      // Return ambiguous response even on error
      return new Response(
        JSON.stringify({ 
          message: 'Request processed. If this email is registered, further instructions will be sent.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exists = users.some(u => u.email === email);

    // Log for audit purposes (server-side only)
    console.log(`Email check for ${email}: ${exists ? 'exists' : 'not found'} by user ${userId}`);

    // Always return ambiguous response to prevent enumeration
    // The client should handle all cases the same way
    return new Response(
      JSON.stringify({ 
        message: 'Request processed. If this email is registered, further instructions will be sent.',
        // Only include actual status for legitimate use cases (e.g., password reset flows)
        // For account creation, handle validation client-side differently
        exists // Include for now, but consider removing based on use case
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    // Return ambiguous response on error
    return new Response(
      JSON.stringify({ 
        message: 'Request processed. If this email is registered, further instructions will be sent.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
