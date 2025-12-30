-- Create user_addresses table
CREATE TABLE public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT,
  cep TEXT NOT NULL,
  city TEXT NOT NULL,
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  complement TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON public.user_addresses(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own addresses
CREATE POLICY "Users can manage their own addresses"
  ON public.user_addresses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_addresses 
    SET is_default = false, updated_at = now()
    WHERE user_id = NEW.user_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to enforce single default address
CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_address();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_addresses_updated_at_trigger
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_user_addresses_updated_at();

-- Migrate existing addresses from profiles to user_addresses (mark as default)
INSERT INTO public.user_addresses (user_id, label, cep, city, street, street_number, neighborhood, complement, is_default)
SELECT 
  id as user_id,
  'Endereço Principal' as label,
  cep,
  city,
  street,
  street_number,
  neighborhood,
  complement,
  true as is_default
FROM public.profiles
WHERE cep IS NOT NULL 
  AND cep != ''
  AND city IS NOT NULL 
  AND city != ''
  AND street IS NOT NULL 
  AND street != ''
  AND street_number IS NOT NULL 
  AND street_number != ''
  AND neighborhood IS NOT NULL 
  AND neighborhood != '';