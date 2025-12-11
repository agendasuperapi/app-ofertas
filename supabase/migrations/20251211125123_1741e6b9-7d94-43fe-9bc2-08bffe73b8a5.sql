-- Add emoji column to product_categories table
ALTER TABLE public.product_categories 
ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📁';

-- Update existing categories with contextual emojis based on name
UPDATE public.product_categories SET emoji = '🍔' WHERE LOWER(name) LIKE '%hambur%' OR LOWER(name) LIKE '%burger%';
UPDATE public.product_categories SET emoji = '🍟' WHERE LOWER(name) LIKE '%porç%' OR LOWER(name) LIKE '%porco%' OR LOWER(name) LIKE '%batata%';
UPDATE public.product_categories SET emoji = '🥤' WHERE LOWER(name) LIKE '%bebida%' OR LOWER(name) LIKE '%drink%';
UPDATE public.product_categories SET emoji = '🍰' WHERE LOWER(name) LIKE '%sobremesa%' OR LOWER(name) LIKE '%doce%' OR LOWER(name) LIKE '%dessert%';
UPDATE public.product_categories SET emoji = '🍕' WHERE LOWER(name) LIKE '%pizza%';
UPDATE public.product_categories SET emoji = '🥩' WHERE LOWER(name) LIKE '%churrasco%' OR LOWER(name) LIKE '%carne%';
UPDATE public.product_categories SET emoji = '🥗' WHERE LOWER(name) LIKE '%salada%' OR LOWER(name) LIKE '%vegeta%';
UPDATE public.product_categories SET emoji = '🍜' WHERE LOWER(name) LIKE '%massa%' OR LOWER(name) LIKE '%macarr%';
UPDATE public.product_categories SET emoji = '🍣' WHERE LOWER(name) LIKE '%sushi%' OR LOWER(name) LIKE '%japon%';
UPDATE public.product_categories SET emoji = '☕' WHERE LOWER(name) LIKE '%café%' OR LOWER(name) LIKE '%coffee%';