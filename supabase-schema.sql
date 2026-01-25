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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_correlation_id ON orders(correlation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_product_plans_product_id ON product_plans(product_id);

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
ALTER TABLE checkout_settings ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (para desenvolvimento sem auth)
-- IMPORTANTE: Em produção, configure políticas mais restritivas
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_plans" ON product_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_deliverables" ON product_deliverables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for order_bumps" ON order_bumps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for product_order_bumps" ON product_order_bumps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for facebook_pixels" ON facebook_pixels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for checkout_settings" ON checkout_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Storage Buckets
-- Execute em Storage -> New Bucket
-- ============================================
-- Bucket: products (public)
-- Bucket: deliverables (public)  
-- Bucket: logos (public)

-- Para criar buckets via SQL:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('deliverables', 'deliverables', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Allow public read for products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Allow public insert for products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products');
CREATE POLICY "Allow public read for deliverables" ON storage.objects FOR SELECT USING (bucket_id = 'deliverables');
CREATE POLICY "Allow public insert for deliverables" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deliverables');
CREATE POLICY "Allow public read for logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Allow public insert for logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
