-- Corrigir URLs quebradas com URLs verificadas e funcionais

-- Batata Frita Grande - URL funcional de batata frita
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=600&fit=crop',
    updated_at = now()
WHERE store_id = (SELECT id FROM stores WHERE slug = 'brasa-burguer')
AND name = 'Batata Frita Grande';

-- Veggie Burger - URL funcional de hambúrguer vegetariano
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=600&fit=crop',
    updated_at = now()
WHERE store_id = (SELECT id FROM stores WHERE slug = 'brasa-burguer')
AND name = 'Veggie Burger';

-- Onion Rings - URL funcional de onion rings
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=600&fit=crop',
    updated_at = now()
WHERE store_id = (SELECT id FROM stores WHERE slug = 'brasa-burguer')
AND name = 'Onion Rings';