-- =====================================================
-- MIGRAÇÃO COMPLETA E CONSOLIDADA PARA SUPABASE PRÓPRIO
-- =====================================================
-- Execute este SQL completo no seu novo projeto Supabase
-- Este script consolida TODAS as migrations necessárias
-- =====================================================

-- 1. CRIAR ENUMS
CREATE TYPE public.app_role AS ENUM ('customer', 'store_owner', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled');
CREATE TYPE public.store_status AS ENUM ('pending_approval', 'active', 'inactive', 'rejected');

-- 2. CRIAR TABELAS

-- Tabela de perfis
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  street text,
  street_number text,
  neighborhood text,
  complement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela de lojas
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  banner_url text,
  category text NOT NULL,
  address text,
  phone text,
  email text,
  status store_status NOT NULL DEFAULT 'pending_approval',
  rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  avg_delivery_time integer DEFAULT 30,
  is_open boolean DEFAULT true,
  operating_hours jsonb DEFAULT '{"monday": {"open": "08:00", "close": "18:00", "is_closed": false}, "tuesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "wednesday": {"open": "08:00", "close": "18:00", "is_closed": false}, "thursday": {"open": "08:00", "close": "18:00", "is_closed": false}, "friday": {"open": "08:00", "close": "18:00", "is_closed": false}, "saturday": {"open": "08:00", "close": "14:00", "is_closed": false}, "sunday": {"open": "08:00", "close": "12:00", "is_closed": true}}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de categorias
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Função para gerar short_id
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  uuid_bytes BYTEA;
  num BIGINT;
  i INT;
BEGIN
  uuid_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  num := (get_byte(uuid_bytes, 0)::bigint << 40) | 
         (get_byte(uuid_bytes, 1)::bigint << 32) | 
         (get_byte(uuid_bytes, 2)::bigint << 24) | 
         (get_byte(uuid_bytes, 3)::bigint << 16) | 
         (get_byte(uuid_bytes, 4)::bigint << 8) | 
         get_byte(uuid_bytes, 5)::bigint;
  
  FOR i IN 1..6 LOOP
    result := substr(chars, (num % 62) + 1, 1) || result;
    num := num / 62;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Tabela de produtos
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  category text NOT NULL,
  price numeric NOT NULL,
  promotional_price numeric,
  stock_quantity integer DEFAULT 0,
  is_available boolean DEFAULT true,
  is_pizza boolean DEFAULT false,
  max_flavors integer DEFAULT 2,
  short_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para gerar short_id
CREATE OR REPLACE FUNCTION public.set_product_short_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.short_id IS NULL THEN
    NEW.short_id := generate_short_id();
    WHILE EXISTS (SELECT 1 FROM products WHERE short_id = NEW.short_id) LOOP
      NEW.short_id := generate_short_id();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_product_short_id_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_short_id();

-- Tabela de sabores
CREATE TABLE public.product_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de adicionais
CREATE TABLE public.product_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de pedidos (COM COLUNA NOTES)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  delivery_type text NOT NULL DEFAULT 'delivery',
  delivery_street text,
  delivery_number text,
  delivery_neighborhood text,
  delivery_complement text,
  notes text,
  payment_method text NOT NULL DEFAULT 'pix',
  change_amount numeric,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de sabores dos itens
CREATE TABLE public.order_item_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  flavor_name text NOT NULL,
  flavor_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de adicionais dos itens
CREATE TABLE public.order_item_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  addon_name text NOT NULL,
  addon_price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de favoritos
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Tabela de avaliações
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. CRIAR FUNÇÕES

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Função para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para adicionar admin
CREATE OR REPLACE FUNCTION public.add_admin_role_by_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Função para criar perfil ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- 4. CRIAR TRIGGERS

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_flavors_updated_at
  BEFORE UPDATE ON public.product_flavors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_addons_updated_at
  BEFORE UPDATE ON public.product_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. HABILITAR RLS

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 6. CRIAR POLÍTICAS RLS

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register as store owner" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'store_owner');
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Stores
CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT USING (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Store owners can insert stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'store_owner'));
CREATE POLICY "Store owners can update stores" ON public.stores FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete stores" ON public.stores FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Product Categories
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Store owners manage categories" ON public.product_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = product_categories.store_id AND stores.owner_id = auth.uid()));

-- Products
CREATE POLICY "Anyone can view available products" ON public.products FOR SELECT USING (is_available = true OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Store owners manage products" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Product Flavors
CREATE POLICY "Anyone can view flavors" ON public.product_flavors FOR SELECT USING (is_available = true OR EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_flavors.product_id AND s.owner_id = auth.uid()));
CREATE POLICY "Store owners manage flavors" ON public.product_flavors FOR ALL USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_flavors.product_id AND s.owner_id = auth.uid()));

-- Product Addons
CREATE POLICY "Anyone can view addons" ON public.product_addons FOR SELECT USING (is_available = true OR EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_addons.product_id AND s.owner_id = auth.uid()));
CREATE POLICY "Store owners manage addons" ON public.product_addons FOR ALL USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_addons.product_id AND s.owner_id = auth.uid()));

-- Orders
CREATE POLICY "Customers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Store owners update orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Order Items
CREATE POLICY "Customers insert order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid()));
CREATE POLICY "Users view order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid()))));

-- Order Item Flavors
CREATE POLICY "Customers insert flavors" ON public.order_item_flavors FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_flavors.order_item_id AND o.customer_id = auth.uid()));
CREATE POLICY "Users view flavors" ON public.order_item_flavors FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_flavors.order_item_id AND (o.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = o.store_id AND stores.owner_id = auth.uid()))));

-- Order Item Addons
CREATE POLICY "Customers insert addons" ON public.order_item_addons FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_addons.order_item_id AND o.customer_id = auth.uid()));
CREATE POLICY "Users view addons" ON public.order_item_addons FOR SELECT USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.id = order_item_addons.order_item_id AND (o.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = o.store_id AND stores.owner_id = auth.uid()))));

-- Favorites
CREATE POLICY "Users manage favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);

-- 7. STORAGE BUCKETS (execute via SQL Editor)

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('store-logos', 'store-logos', true),
  ('store-banners', 'store-banners', true),
  ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public can view store logos" ON storage.objects FOR SELECT USING (bucket_id = 'store-logos');
CREATE POLICY "Store owners upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'store-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view store banners" ON storage.objects FOR SELECT USING (bucket_id = 'store-banners');
CREATE POLICY "Store owners upload banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners update banners" ON storage.objects FOR UPDATE USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners delete banners" ON storage.objects FOR DELETE USING (bucket_id = 'store-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Store owners upload products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners update products" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Store owners delete products" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- =====================================================
-- FIM DA MIGRAÇÃO COMPLETA
-- =====================================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no SQL Editor do seu Supabase
-- 2. Configure autenticação (email auto-confirm OFF)
-- 3. No Lovable: Settings > Tools > Desconectar Cloud > Conectar seu Supabase
-- 4. Teste criar um usuário e fazer um pedido
-- 
-- =====================================================
