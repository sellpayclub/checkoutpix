-- ============================================
-- SellPay Checkout PIX - Database Schema
-- Execute no Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Products
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  cover_image_url TEXT, -- Missing column added
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Product Plans (múltiplos planos por produto)
-- ============================================
CREATE TABLE IF NOT EXISTS product_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL, -- em centavos
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval VARCHAR(20), -- 'monthly', 'yearly'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Product Deliverables (entregáveis)
-- ============================================
CREATE TABLE IF NOT EXISTS product_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  file_url TEXT,
  redirect_url TEXT,
  type VARCHAR(20) NOT NULL -- 'file' ou 'redirect'
);

-- ============================================
-- Order Bumps
-- ============================================
CREATE TABLE IF NOT EXISTS order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- em centavos
  image_url TEXT,
  box_color VARCHAR(20) DEFAULT '#22c55e',
  text_color VARCHAR(20) DEFAULT '#ffffff',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Product <-> Order Bump Association
-- ============================================
CREATE TABLE IF NOT EXISTS product_order_bumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  order_bump_id UUID REFERENCES order_bumps(id) ON DELETE CASCADE,
  UNIQUE(product_id, order_bump_id)
);

-- ============================================
-- Orders (pedidos)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id VARCHAR(255) UNIQUE NOT NULL,
  product_id UUID REFERENCES products(id),
  plan_id UUID REFERENCES product_plans(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL, -- valor total em centavos
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, EXPIRED, REFUNDED
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_charge_id VARCHAR(255),
  order_bump_id UUID REFERENCES order_bumps(id),
  tracking_params JSONB, -- UTM parameters for attribution
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Facebook Pixels
-- ============================================
CREATE TABLE IF NOT EXISTS facebook_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  events JSONB DEFAULT '["PageView", "InitiateCheckout", "Purchase"]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Google Pixels
-- ============================================
CREATE TABLE IF NOT EXISTS google_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id VARCHAR(50) NOT NULL,
  conversion_label VARCHAR(100),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  events JSONB DEFAULT '["PageView", "Purchase"]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Checkout Settings
-- ============================================
CREATE TABLE IF NOT EXISTS checkout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_enabled BOOLEAN DEFAULT TRUE,
  timer_text VARCHAR(255) DEFAULT 'Oferta por tempo limitado',
  timer_duration INTEGER DEFAULT 600, -- segundos
  primary_color VARCHAR(20) DEFAULT '#1a7f64',
  button_text VARCHAR(50) DEFAULT 'FINALIZAR COMPRA',
  logo_url TEXT,
  footer_text VARCHAR(255) DEFAULT '© 2026 SellPay. Todos os direitos reservados.',
  cover_image_url TEXT, -- Missing column added
  cpf_enabled BOOLEAN DEFAULT FALSE, -- Missing column added
  order_bump_title VARCHAR(255) DEFAULT 'Aproveite essa oferta especial!', -- Missing column added
  order_bump_button_text VARCHAR(255) DEFAULT 'Adicionar oferta', -- Missing column added
  webhook_url TEXT,
  webhook_events JSONB DEFAULT '["sale_generated", "sale_approved"]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Short Links
-- ============================================
CREATE TABLE IF NOT EXISTS short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Checkout Visits (Analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS checkout_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_correlation_id ON orders(correlation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_product_plans_product_id ON product_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_short_links_slug ON short_links(slug);
CREATE INDEX IF NOT EXISTS idx_checkout_visits_created_at ON checkout_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_checkout_visits_product_id ON checkout_visits(product_id);

-- ============================================
-- Row Level Security (RLS)
-- Por enquanto, desabilitamos RLS para facilitar o desenvolvimento
-- Em produção, você pode habilitar depois
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_visits ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para desenvolvimento sem auth)
-- IMPORTANTE: Em produção, configure políticas mais restritivas
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_plans" ON product_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_deliverables" ON product_deliverables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for order_bumps" ON order_bumps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_order_bumps" ON product_order_bumps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for facebook_pixels" ON facebook_pixels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for google_pixels" ON google_pixels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for checkout_settings" ON checkout_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for short_links" ON short_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for checkout_visits" ON checkout_visits FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ATUALIZAÇÃO DE TABELAS EXISTENTES (SE JÁ CRIADAS)
-- Execute isso se você já rodou o script anterior
-- ============================================

DO $$
BEGIN
    -- Add cover_image_url to products if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cover_image_url') THEN
        ALTER TABLE products ADD COLUMN cover_image_url TEXT;
    END IF;

    -- Add missing columns to checkout_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'cover_image_url') THEN
        ALTER TABLE checkout_settings ADD COLUMN cover_image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'cpf_enabled') THEN
        ALTER TABLE checkout_settings ADD COLUMN cpf_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'order_bump_title') THEN
        ALTER TABLE checkout_settings ADD COLUMN order_bump_title VARCHAR(255) DEFAULT 'Aproveite essa oferta especial!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'order_bump_button_text') THEN
        ALTER TABLE checkout_settings ADD COLUMN order_bump_button_text VARCHAR(255) DEFAULT 'Adicionar oferta';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'webhook_url') THEN
        ALTER TABLE checkout_settings ADD COLUMN webhook_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_settings' AND column_name = 'webhook_events') THEN
        ALTER TABLE checkout_settings ADD COLUMN webhook_events JSONB DEFAULT '["sale_generated", "sale_approved"]';
    END IF;

    -- Add conversion_label to google_pixels if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'google_pixels' AND column_name = 'conversion_label') THEN
        ALTER TABLE google_pixels ADD COLUMN conversion_label VARCHAR(100);
    END IF;
END $$;

-- ============================================
-- Storage Buckets - Atualizado
-- ============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('deliverables', 'deliverables', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for covers
CREATE POLICY "Allow public read for covers" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Allow public insert for covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers');
