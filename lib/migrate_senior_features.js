const { Client } = require('pg');

async function migrateSeniorFeatures() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('🌱 Connected to CockroachDB / PostgreSQL for Senior Features Migration...');

  // 1. CUSTOMER REMINDERS TABLE
  console.log('Creating customer_reminders table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_reminders (
      id VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
      customer_name VARCHAR(128),
      order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
      assigned_to_id VARCHAR(64) NOT NULL REFERENCES users(id),
      assigned_to_name VARCHAR(128) NOT NULL,
      created_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
      created_by_name VARCHAR(128) NOT NULL,
      due_date TIMESTAMPTZ NOT NULL,
      purpose VARCHAR(64) NOT NULL,
      notes TEXT,
      status VARCHAR(32) DEFAULT 'PENDING',
      outcome_notes TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_assigned ON customer_reminders(assigned_to_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_status ON customer_reminders(status);
    CREATE INDEX IF NOT EXISTS idx_reminders_due ON customer_reminders(due_date);
    CREATE INDEX IF NOT EXISTS idx_reminders_customer ON customer_reminders(customer_id);
  `);

  // 2. ORDER CORRECTION REQUESTS TABLE
  console.log('Creating order_correction_requests table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS order_correction_requests (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      order_number VARCHAR(64) NOT NULL,
      requested_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
      requested_by_name VARCHAR(128) NOT NULL,
      reason TEXT NOT NULL,
      original_values JSONB NOT NULL,
      requested_values JSONB NOT NULL,
      status VARCHAR(32) DEFAULT 'PENDING',
      decision_note TEXT,
      reviewed_by_id VARCHAR(64) REFERENCES users(id),
      reviewed_by_name VARCHAR(128),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_order_corrections_order ON order_correction_requests(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_corrections_status ON order_correction_requests(status);
    CREATE INDEX IF NOT EXISTS idx_order_corrections_user ON order_correction_requests(requested_by_id);
  `);

  // 3. OPERATIONAL TASKS TABLE
  console.log('Creating operational_tasks table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS operational_tasks (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_to_id VARCHAR(64) NOT NULL REFERENCES users(id),
      assigned_to_name VARCHAR(128) NOT NULL,
      created_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
      created_by_name VARCHAR(128) NOT NULL,
      related_order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
      related_customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
      priority VARCHAR(32) DEFAULT 'MEDIUM',
      due_date TIMESTAMPTZ NOT NULL,
      status VARCHAR(32) DEFAULT 'ASSIGNED',
      completion_notes TEXT,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON operational_tasks(assigned_to_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON operational_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON operational_tasks(due_date);
  `);

  // 4. PRODUCT DOCUMENT LINKS TABLE
  console.log('Creating product_document_links table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS product_document_links (
      id VARCHAR(64) PRIMARY KEY,
      product_name VARCHAR(255) NOT NULL,
      product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
      document_id VARCHAR(64) NOT NULL REFERENCES technical_documents(id) ON DELETE CASCADE,
      document_title VARCHAR(255) NOT NULL,
      linked_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
      linked_by_name VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_pdl_prod_name ON product_document_links(product_name);
    CREATE INDEX IF NOT EXISTS idx_pdl_doc_id ON product_document_links(document_id);
  `);

  // Auto-link existing verified technical documents to their respective product names
  console.log('Linking verified technical documents to product names...');
  await client.query(`
    INSERT INTO product_document_links (id, product_name, document_id, document_title, linked_by_id, linked_by_name)
    VALUES 
      ('pdl_tiger_shell', 'Tiger Shell Black', 'doc_tiger_shell_black', 'TIGER SHELL BLACK — Anti-Corrosive Protective Coating', 'usr_boss', 'Asif'),
      ('pdl_conbond_sbr', 'ConBond SBR', 'doc_conbond_sbr', 'ConBond SBR — Material Safety Data Sheet (MSDS)', 'usr_controller', 'M. Husnain Farooq'),
      ('pdl_confloor', 'ConFloor Hardtop', 'doc_confloor_hardtop', 'ConFloor Hardtop — Mineral Based Dry Shake Surface Hardener', 'usr_manager', 'Samaira Mubashar'),
      ('pdl_conflex_pu', 'ConFlex PU 600', 'doc_conflex_pu_600', 'ConFlex PU 600 — Single Component Polyurethane Joint Sealant', 'usr_boss', 'Asif')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 5. PAYMENT LEDGER TABLE
  console.log('Creating payment_ledger table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_ledger (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      order_number VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
      customer_name VARCHAR(128) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_method VARCHAR(64) NOT NULL,
      reference_number VARCHAR(128),
      payment_type VARCHAR(64) NOT NULL,
      notes TEXT,
      recorded_by_id VARCHAR(64) NOT NULL REFERENCES users(id),
      recorded_by_name VARCHAR(128) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payment_ledger_order ON payment_ledger(order_id);
    CREATE INDEX IF NOT EXISTS idx_payment_ledger_customer ON payment_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payment_ledger_date ON payment_ledger(payment_date);
  `);

  // 6. INBOX ITEM STATES TABLE
  console.log('Creating inbox_item_states table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS inbox_item_states (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(64) NOT NULL,
      item_id VARCHAR(64) NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      status VARCHAR(32) DEFAULT 'PENDING',
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unq_user_item UNIQUE (user_id, item_type, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inbox_user ON inbox_item_states(user_id);
    CREATE INDEX IF NOT EXISTS idx_inbox_read ON inbox_item_states(is_read);
    CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_item_states(status);
  `);

  // 7. BACKUP LOGS TABLE
  console.log('Creating backup_logs table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id VARCHAR(64) PRIMARY KEY,
      backup_type VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL,
      file_name VARCHAR(255),
      file_size_bytes BIGINT DEFAULT 0,
      storage_location TEXT,
      error_message TEXT,
      triggered_by_id VARCHAR(64) REFERENCES users(id),
      triggered_by_name VARCHAR(128),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_backup_logs_created ON backup_logs(created_at);
  `);

  console.log('✓ All senior feature tables created and indexed successfully.');
  await client.end();
}

migrateSeniorFeatures().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
