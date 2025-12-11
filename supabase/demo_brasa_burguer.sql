-- ============================================================================
-- LOJA DEMONSTRATIVA: Brasa & Burguer
-- ============================================================================
-- PASSO 1: Criar usuário no Supabase Dashboard (Authentication > Users > Add user)
--   Email: demo.brasaeburguer@ofertas.app
--   Senha: Demo@2024!
-- PASSO 2: Executar este SQL substituindo o USER_ID pelo ID do usuário criado
-- ============================================================================

-- Substitua este ID pelo ID real do usuário criado no dashboard
DO $$
DECLARE
  v_user_id UUID;
  v_store_id UUID;
  v_cat_hamburgueres UUID;
  v_cat_porcoes UUID;
  v_cat_churrascos UUID;
BEGIN
  -- Buscar o usuário pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo.brasaeburguer@ofertas.app';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado. Crie primeiro o usuário com email demo.brasaeburguer@ofertas.app no dashboard de autenticação.';
  END IF;
  
  -- Verificar se já existe role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'store_owner');
  END IF;
  
  -- Verificar se já existe profile
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, full_name, phone) 
    VALUES (v_user_id, 'Brasa & Burguer Demo', '5511999999999');
  END IF;
  
  -- Criar a loja
  INSERT INTO public.stores (
    owner_id, name, slug, description, category, 
    logo_url, banner_url, phone, email,
    accepts_pix, accepts_card, accepts_cash, 
    delivery_enabled, pickup_enabled, is_open
  ) VALUES (
    v_user_id,
    'Brasa & Burguer',
    'brasa-burguer',
    'O melhor do churrasco e hambúrgueres artesanais! Carnes selecionadas, temperos especiais e muito sabor. Delivery e retirada disponíveis.',
    'Restaurante',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=400&fit=crop',
    '5511999888777',
    'demo.brasaeburguer@ofertas.app',
    true, true, true, true, true, true
  )
  RETURNING id INTO v_store_id;
  
  RAISE NOTICE 'Loja criada com ID: %', v_store_id;
  
  -- ============================================================================
  -- CATEGORIAS
  -- ============================================================================
  
  INSERT INTO public.product_categories (store_id, name, display_order, is_active)
  VALUES (v_store_id, '🍔 Hambúrgueres', 1, true)
  RETURNING id INTO v_cat_hamburgueres;
  
  INSERT INTO public.product_categories (store_id, name, display_order, is_active)
  VALUES (v_store_id, '🍟 Porções', 2, true)
  RETURNING id INTO v_cat_porcoes;
  
  INSERT INTO public.product_categories (store_id, name, display_order, is_active)
  VALUES (v_store_id, '🥩 Churrascos', 3, true)
  RETURNING id INTO v_cat_churrascos;
  
  RAISE NOTICE 'Categorias criadas';
  
  -- ============================================================================
  -- PRODUTOS - HAMBÚRGUERES (7 produtos)
  -- ============================================================================
  
  INSERT INTO public.products (store_id, name, description, price, category, image_url, is_available, display_order)
  VALUES 
    (v_store_id, 'X-Brasa Clássico', 'Hambúrguer artesanal 180g, queijo cheddar, bacon crocante, alface, tomate e molho especial da casa', 32.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop', true, 1),
    (v_store_id, 'X-Bacon Duplo', 'Dois hambúrgueres 120g, dobro de bacon crocante, cheddar derretido e pão brioche', 38.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=600&fit=crop', true, 2),
    (v_store_id, 'X-Costela Especial', 'Carne de costela desfiada, onion rings crocantes, molho barbecue artesanal', 42.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=600&fit=crop', true, 3),
    (v_store_id, 'Smash Burger', 'Hambúrguer smash 150g prensado na chapa, queijo americano, cebola caramelizada', 29.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&h=600&fit=crop', true, 4),
    (v_store_id, 'X-Picanha Premium', 'Hambúrguer de picanha 200g, queijo brie, rúcula fresca, geleia de pimenta', 45.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=600&fit=crop', true, 5),
    (v_store_id, 'Veggie Burger', 'Hambúrguer de grão-de-bico temperado, queijo muçarela, molho verde caseiro', 34.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1520072959219-c595dc8e6cce?w=600&h=600&fit=crop', true, 6),
    (v_store_id, 'Kids Burger', 'Mini hambúrguer 100g, queijo, ketchup e batata palha. Ideal para crianças', 22.90, '🍔 Hambúrgueres', 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600&h=600&fit=crop', true, 7);
  
  -- ============================================================================
  -- PRODUTOS - PORÇÕES (6 produtos)
  -- ============================================================================
  
  INSERT INTO public.products (store_id, name, description, price, category, image_url, is_available, display_order)
  VALUES 
    (v_store_id, 'Batata Frita Grande', 'Porção generosa de batatas fritas crocantes com sal e orégano. Serve 2 pessoas', 24.90, '🍟 Porções', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop', true, 1),
    (v_store_id, 'Onion Rings', 'Anéis de cebola empanados crocantes, acompanha molho barbecue', 19.90, '🍟 Porções', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=600&fit=crop', true, 2),
    (v_store_id, 'Polenta Frita', 'Palitos de polenta crocantes com queijo parmesão ralado', 16.90, '🍟 Porções', 'https://images.unsplash.com/photo-1623855244183-52fd8d3ce2f7?w=600&h=600&fit=crop', true, 3),
    (v_store_id, 'Mandioca Frita', 'Mandioca cozida e frita na hora, servida com molho verde', 18.90, '🍟 Porções', 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?w=600&h=600&fit=crop', true, 4),
    (v_store_id, 'Fritas com Cheddar e Bacon', 'Batatas fritas cobertas com cheddar cremoso e bacon crocante', 32.90, '🍟 Porções', 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&h=600&fit=crop', true, 5),
    (v_store_id, 'Mix de Porções', 'Combinado de batata, polenta, mandioca e onion rings. Serve 4 pessoas', 45.90, '🍟 Porções', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&h=600&fit=crop', true, 6);
  
  -- ============================================================================
  -- PRODUTOS - CHURRASCOS (7 produtos)
  -- ============================================================================
  
  INSERT INTO public.products (store_id, name, description, price, category, image_url, is_available, display_order)
  VALUES 
    (v_store_id, 'Picanha na Brasa 400g', 'Picanha premium grelhada no ponto, acompanha farofa, vinagrete e arroz', 79.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=600&fit=crop', true, 1),
    (v_store_id, 'Costela BBQ 500g', 'Costela bovina defumada por 12 horas, molho barbecue da casa', 69.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop', true, 2),
    (v_store_id, 'Espeto de Fraldinha', 'Dois espetos de fraldinha temperada na brasa com farofa', 42.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop', true, 3),
    (v_store_id, 'Linguiça Artesanal', '400g de linguiça toscana artesanal grelhada, acompanha vinagrete', 28.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&h=600&fit=crop', true, 4),
    (v_store_id, 'Combo Churrasco Família', 'Picanha 400g, fraldinha, linguiça, pão de alho, farofa e vinagrete. Serve 4 pessoas', 159.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1558030137-a56c1b004bbb?w=600&h=600&fit=crop', true, 5),
    (v_store_id, 'Espetinho de Cupim', 'Dois espetos de cupim macio e suculento com chimichurri', 35.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&h=600&fit=crop', true, 6),
    (v_store_id, 'Alcatra Grelhada 350g', 'Alcatra premium grelhada, batatas rústicas e molho chimichurri', 62.90, '🥩 Churrascos', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=600&fit=crop', true, 7);
  
  RAISE NOTICE '20 produtos criados com sucesso!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'LOJA DEMONSTRATIVA CRIADA COM SUCESSO!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Nome: Brasa & Burguer';
  RAISE NOTICE 'URL: /brasa-burguer';
  RAISE NOTICE 'Email: demo.brasaeburguer@ofertas.app';
  RAISE NOTICE 'Senha: Demo@2024!';
  RAISE NOTICE '============================================';
  
END $$;
