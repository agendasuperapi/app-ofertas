-- Fix: Remove overly permissive public SELECT policy on affiliate_accounts
-- This policy was exposing sensitive PII data (emails, phones, CPF, PIX keys, password hashes)

-- Drop the problematic policy
DROP POLICY IF EXISTS "Public can check affiliate accounts for login" ON public.affiliate_accounts;

-- The service role policy already exists and handles all operations via edge functions
-- No need for public SELECT access since auth is handled by affiliate-auth edge function