-- Corrigir imagem da Batata Frita Grande
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1630384060421-cb20aed71a07?w=600&h=600&fit=crop',
    updated_at = now()
WHERE store_id = (SELECT id FROM stores WHERE slug = 'brasa-burguer')
AND name = 'Batata Frita Grande';

-- Corrigir imagem do Onion Rings
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=600&fit=crop',
    updated_at = now()
WHERE store_id = (SELECT id FROM stores WHERE slug = 'brasa-burguer')
AND name = 'Onion Rings';