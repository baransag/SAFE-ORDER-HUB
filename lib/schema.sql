-- ====================================================================
-- SAFE ORDER HUB — PRODUCTION POSTGRESQL / NEON RELATIONAL SCHEMA
-- SAFE SOLUTIONS — Internal Sales, Operations, Delivery & BI System
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  designation VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL, -- 'BOSS', 'CONTROLLER', 'MANAGER', 'AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'
  vehicle VARCHAR(64),
  avatar VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  company_name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  whatsapp VARCHAR(32),
  city VARCHAR(64) NOT NULL,
  delivery_address TEXT NOT NULL,
  maps_url TEXT,
  customer_type VARCHAR(16) DEFAULT 'EXISTING', -- 'NEW', 'EXISTING'
  notes TEXT,
  created_by_id VARCHAR(64) REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(64) NOT NULL,
  default_packing VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  standard_rate NUMERIC(12, 2) NOT NULL,
  min_allowed_rate NUMERIC(12, 2) NOT NULL,
  description TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) UNIQUE NOT NULL, -- e.g. SS-ORD-2026-00001
  customer_id VARCHAR(64) REFERENCES customers(id),
  customer_name VARCHAR(128) NOT NULL,
  company_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  customer_whatsapp VARCHAR(32),
  city VARCHAR(64) NOT NULL,
  delivery_address TEXT NOT NULL,
  maps_url TEXT,
  customer_type VARCHAR(16) DEFAULT 'EXISTING',

  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,

  payment_status VARCHAR(32) NOT NULL, -- 'PENDING', 'ADVANCE', 'PARTIAL', 'PAID', 'CREDIT', 'REFUNDED'
  payment_remarks TEXT,
  required_delivery_date DATE NOT NULL,
  urgency VARCHAR(32) NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'URGENT', 'CRITICAL'

  status VARCHAR(32) NOT NULL DEFAULT 'NEW', 
  -- 'NEW', 'RATE_REVIEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'RETURNED', 'PARTIALLY_DELIVERED'
  
  special_rate_approved BOOLEAN DEFAULT TRUE,
  rate_review_note TEXT,

  order_taken_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
  order_taken_by_name VARCHAR(128) NOT NULL,
  order_taken_by_email VARCHAR(128) NOT NULL,
  order_taken_by_phone VARCHAR(32) NOT NULL,

  remarks TEXT,
  internal_notes TEXT,
  idempotency_key VARCHAR(128) UNIQUE,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_taken_by ON orders(order_taken_by_id);
CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) REFERENCES products(id),
  product_name VARCHAR(160) NOT NULL,
  packing VARCHAR(64) NOT NULL,
  unit VARCHAR(32) NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  standard_rate NUMERIC(12, 2) NOT NULL,
  offered_rate NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  is_special_rate BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 6. ORDER STATUS & AUDIT HISTORY
CREATE TABLE IF NOT EXISTS order_status_history (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  changed_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
  changed_by_name VARCHAR(128) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_status_history(order_id);

-- 7. DELIVERIES & PROOF OF DELIVERY
CREATE TABLE IF NOT EXISTS deliveries (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_driver VARCHAR(128),
  driver_phone VARCHAR(32),
  vehicle_number VARCHAR(64),
  delivery_status VARCHAR(32) DEFAULT 'PENDING', -- 'PENDING', 'ASSIGNED', 'READY', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'
  scheduled_date DATE,
  delivered_at TIMESTAMPTZ,
  proof_photo_url TEXT,
  signed_receipt_url TEXT,
  invoice_number VARCHAR(64),
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(delivery_status);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  order_id VARCHAR(64),
  order_number VARCHAR(64),
  type VARCHAR(32) NOT NULL, -- 'NEW_ORDER', 'RATE_REVIEW', 'STATUS_CHANGE', 'APPROVAL', 'DELIVERY'
  read BOOLEAN DEFAULT FALSE,
  recipient_roles TEXT[], -- ARRAY of role strings
  user_id VARCHAR(64) REFERENCES users(id), -- specific user if targeted
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id),
  user_name VARCHAR(128) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL, -- 'LOGIN', 'LOGOUT', 'ORDER_CREATED', 'RATE_CHANGED', 'STATUS_CHANGED', 'CUSTOMER_UPDATED', 'PRODUCT_UPDATED', 'SETTINGS_CHANGED'
  entity VARCHAR(64) NOT NULL, -- 'ORDER', 'CUSTOMER', 'PRODUCT', 'USER', 'SETTINGS', 'AUTH'
  entity_id VARCHAR(64),
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT 'sys_settings',
  company_name VARCHAR(160) NOT NULL,
  office_whatsapp_number VARCHAR(32) NOT NULL,
  whatsapp_group_invite_url TEXT,
  currency VARCHAR(16) DEFAULT 'PKR',
  rate_warning_tolerance_percent NUMERIC(5, 2) DEFAULT 5.0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. AI CONVERSATIONS & USAGE
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  user_name VARCHAR(128) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  message_count INT DEFAULT 0,
  last_query TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(16) NOT NULL, -- 'user' or 'ai'
  message_text TEXT NOT NULL,
  action_type VARCHAR(64),
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmation_action TEXT,
  confirmed_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
