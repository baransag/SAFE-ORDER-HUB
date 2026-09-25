const { Client } = require('pg');

async function setup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to CockroachDB / PostgreSQL.');

  // 1. Create tables for Technical Documents and Safe Copilot
  console.log('Creating technical_documents and copilot tables...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS technical_documents (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      product_name VARCHAR(255),
      manufacturer VARCHAR(255) DEFAULT 'Radiant Construction Technologies LLP',
      document_type VARCHAR(100) NOT NULL DEFAULT 'TDS',
      category VARCHAR(100) DEFAULT 'General',
      folder_path VARCHAR(255) DEFAULT '/',
      version VARCHAR(50) DEFAULT '1.0',
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size_bytes BIGINT DEFAULT 0,
      file_type VARCHAR(50) DEFAULT 'application/pdf',
      extracted_text TEXT,
      tags TEXT[] DEFAULT '{}',
      visibility VARCHAR(50) DEFAULT 'ALL_SALES',
      is_archived BOOLEAN DEFAULT FALSE,
      uploaded_by VARCHAR(64) NOT NULL,
      uploaded_by_name VARCHAR(128),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tech_docs_title ON technical_documents(title);
    CREATE INDEX IF NOT EXISTS idx_tech_docs_category ON technical_documents(category);
    CREATE INDEX IF NOT EXISTS idx_tech_docs_visibility ON technical_documents(visibility);
    CREATE INDEX IF NOT EXISTS idx_tech_docs_product ON technical_documents(product_name);

    CREATE TABLE IF NOT EXISTS copilot_conversations (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      title VARCHAR(255) DEFAULT 'New Conversation',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS copilot_messages (
      id VARCHAR(64) PRIMARY KEY,
      conversation_id VARCHAR(64) NOT NULL REFERENCES copilot_conversations(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id),
      role VARCHAR(32) NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. PURGE all sample/preloaded products, customers, orders, and deliveries
  console.log('Purging fake/preloaded products, customers, orders, order_items, deliveries...');
  await client.query(`
    DELETE FROM order_status_history;
    DELETE FROM order_items;
    DELETE FROM deliveries;
    DELETE FROM orders;
    DELETE FROM customers;
    DELETE FROM products;
  `);

  // 3. Insert VERIFIED Technical Documents provided by the user
  console.log('Inserting verified technical documents from supplied PDFs...');
  
  const verifiedDocs = [
    {
      id: 'doc_tiger_shell_black',
      title: 'TIGER SHELL BLACK — Anti-Corrosive Protective Coating',
      product_name: 'Tiger Shell Black',
      manufacturer: 'Radiant Construction Technologies LLP',
      document_type: 'TDS',
      category: 'Coatings & Waterproofing',
      folder_path: '/Protective Coatings',
      version: '1.0',
      file_name: 'Tiger_Shell_Black_TDS.pdf',
      file_path: '/documents/Tiger_Shell_Black_TDS.pdf',
      file_size_bytes: 245000,
      file_type: 'application/pdf',
      tags: ['Bitumen', 'Anti-Corrosive', 'Waterproofing', 'Protective Coating', 'Metal Coating'],
      visibility: 'ALL_SALES',
      uploaded_by: 'usr_boss',
      uploaded_by_name: 'Asif',
      extracted_text: `TECHNICAL DATA
TIGER SHELL BLACK
Anti-Corrosive Protective Coating

DESCRIPTION:
Tiger Shell Black is based on special grades of resin, bitumen, antioxidant, anti corrosion and organic solvents. It has excellent weather resistant and water proofing properties. After drying on the surface, the product is odorless and taints free bitumen film which well suitable for protection of all type of metals, steel and corrugated iron sheets against environmental actions. Tiger Shell Black imparts an economical coating and excellent adhesion to metal surface. All metal surfaces coated with Tiger Shell Black will be protected from moisture, humidity, air and rusting.

PRODUCT APPLICATION:
• Tiger Shell Black is ideal for use in areas where an effective waterproofing, weather resistant coating is required.
• Tiger Shell Black equally effective on both external & internal surfaces.
• It create an ideal coating on water pipelines, steel structure, iron sheets, down pipes, gates and fences etc.
• It is resistant to low concentration of alkalis and acids and can withstand prolonged oxidation.

ADVANTAGES:
• For application to a wide variety of surfaces including steel, iron, zinc aluminum, concrete surface, asbestos and G.I Sheets.
• Highly protective Tiger Shell Black for all type of metals.
• Anti corrosive and highly water resistant.
• Initially dries glossy, weathers to matt black finish.

PACKAGING:
Tiger Shell Black is available in 15 Kgs Pack.

TECHNICAL SPECIFICATIONS:
Appearance: Black
Drying Time: At 20°C within 6 Hour
Type: Single Pack
Flexibility: Good
Weather Resistant: Excellent
UV Resistant: Good
Adhesion to Concrete & Steel: Excellent
Coverage: 1 ltr Per 2 m2
Number of Coats: Minimum two coats recommended
Composition: Special grades of resin, bitumen and solvents

APPLICATION INSTRUCTIONS:
Surface Preparations: All surfaces should be clean, dry and free from grease, rust, loose or blasted paint. All metal surfaces should be wire brushed to removed rust or cleaned by mechanical means.
Application: Apply by conventional spray, airless spray, hot spray or brush. Ready for use and should not be thinned. Minimum of two coats. First coat allowed to dry (normally 4-6 hours) before second coat.
Handling & Storage: Shelf life of 12 months in dry cool place in original packing.`
    },
    {
      id: 'doc_conbond_sbr',
      title: 'ConBond SBR — Material Safety Data Sheet (MSDS)',
      product_name: 'ConBond SBR',
      manufacturer: 'Radiant Construction Technologies LLP',
      document_type: 'MSDS',
      category: 'Polymers & Bonding Agents',
      folder_path: '/Bonding Agents',
      version: '1.0 (Rev 30.04.2021)',
      file_name: 'ConBond_SBR_MSDS.pdf',
      file_path: '/documents/ConBond_SBR_MSDS.pdf',
      file_size_bytes: 380000,
      file_type: 'application/pdf',
      tags: ['MSDS', 'SBR', 'Bonding Agent', 'Polymer', 'Styrene Butadiene Rubber', 'Safety'],
      visibility: 'ALL_SALES',
      uploaded_by: 'usr_controller',
      uploaded_by_name: 'M. Husnain Farooq',
      extracted_text: `MATERIAL SAFETY DATA SHEET
Version 1.0 | Revision Date: 30.04.2021 | SDS Number: SDSPK027

PRODUCT AND COMPANY IDENTIFICATION:
Product name: ConBond SBR
Manufacturer: Radiant Construction Technologies LLP
Address: 104-A Muhafiz Town Multan Road, Lahore Pakistan. Tel: 0092 42 354 5788
Recommended use: Product for construction chemicals

HAZARDS IDENTIFICATION:
GHS Classification: Skin Sensitization: 1. Warning: H317 May cause an allergic skin reaction.

COMPOSITION / INFORMATION ON INGREDIENTS:
Chemical nature: Aqueous dispersion of a polymer based on: styrene, butadiene, rubber.
Mixture of 5-chloro-2-methyl-2H-isothiazol-3-one and 2-methyl-2H-isothiazol-3-one (3:1) CAS 55965-84-9: >= 0% - < 0.05%

FIRST AID MEASURES:
Skin: Wash immediately with plenty of water and soap. Do not use organic solvents.
Eyes: Wash for at least 15 minutes under running water with eyelids held open.
Ingestion: Rinse mouth immediately and drink plenty of water.

PHYSICAL AND CHEMICAL PROPERTIES:
Appearance: Liquid, Milky White
Odor: Characteristic
Solid Content: 38 - 50%
pH: 6 - 9 (25°C)
Flash point: > 100°C
Density: 1.1 - 1.3 g/cm3 (25°C)
Storage temperature: 5 - 40°C. Protect from direct sunlight.`
    },
    {
      id: 'doc_confloor_hardtop',
      title: 'ConFloor Hardtop — Mineral Based Dry Shake Surface Hardener',
      product_name: 'ConFloor Hardtop',
      manufacturer: 'Radiant Construction Technologies LLP',
      document_type: 'TDS',
      category: 'Flooring & Hardeners',
      folder_path: '/Flooring',
      version: '1.0',
      file_name: 'ConFloor_Hardtop_TDS.pdf',
      file_path: '/documents/ConFloor_Hardtop_TDS.pdf',
      file_size_bytes: 260000,
      file_type: 'application/pdf',
      tags: ['Floor Hardener', 'Dry Shake', 'Concrete Floor', 'Quartz Silica', 'Heavy Traffic'],
      visibility: 'ALL_SALES',
      uploaded_by: 'usr_manager',
      uploaded_by_name: 'Samaira Mubashar',
      extracted_text: `TECHNICAL DATA SHEET
ConFloor Hardtop
Mineral based, dry shake surface hardener for fresh concrete floor

DESCRIPTION:
ConFloor Hardtop is a ready to use, dry shake floor hardener, based on cement, high quality quartz silica, non-metallic aggregates and plasticizers. The high cement content and the low water cement ratio in the resulting topping provide a more durable finish to concrete floors. It is ideally suitable for all industrial indoor & outdoor areas subjected to heavy traffic.

USES:
Commercial & Industrial facilities, Warehouses, Loading Bays, Power Stations, Laboratories, Work Shops, Parking Garages & Ramps.

ADVANTAGES:
• Ready to use.
• Hardens fresh concrete in a single operation.
• Forms monolithic bond with fresh concrete base.
• Excellent abrasion resistance. Durable. Non-metallic aggregates (will not rust when wet).
• Hard surface resistant to oils & grease.

TECHNICAL SPECS & PROPERTIES:
Appearance: Cementitious Powder
Packing: 20 Kgs. Bag
Density: Approximately 1,800 Kg/m3
Compressive Strength: 70 N/mm2 @ 28 days
Moh Hardness: 7 (Steel score)
Colors: Grey, Other colors available on request.
Applicable Standards: BS 1881 Part 116, ASTM C 779-89

ESTIMATING DATA:
Dosage for normal finish: 5 kg/m2
Coverage: 4 m2 per 20 kg bag

APPLICATION INSTRUCTIONS:
Apply dry ConFloor Hardtop to freshly poured concrete surface by broadcasting evenly by hand or spreader. Applied as soon as surface water has disappeared. Allowed to soak up water from base concrete before being floated into the surface. Curing membrane such as ConCure WB is necessary.`
    },
    {
      id: 'doc_conflex_pu_600',
      title: 'ConFlex PU 600 — Single Component Polyurethane Joint Sealant',
      product_name: 'ConFlex PU 600',
      manufacturer: 'Radiant Construction Technologies LLP',
      document_type: 'TDS',
      category: 'Joint Sealants',
      folder_path: '/Sealants',
      version: '1.0',
      file_name: 'ConFlex_PU_600_TDS.pdf',
      file_path: '/documents/ConFlex_PU_600_TDS.pdf',
      file_size_bytes: 275000,
      file_type: 'application/pdf',
      tags: ['PU Sealant', 'Joint Sealant', 'Polyurethane', 'ASTM C920', 'Expansion Joints'],
      visibility: 'ALL_SALES',
      uploaded_by: 'usr_boss',
      uploaded_by_name: 'Asif',
      extracted_text: `TECHNICAL DATA SHEET
ConFlex PU 600
Single Component Elastomeric, Modified Polyurethane Joint Sealant

DESCRIPTION:
ConFlex PU 600 is a single part gun graded moisture curing low modules polyurethane joint sealant which cures by reaction with moisture to a soft elastic product. ConFlex PU 600 has excellent primer less adhesion to a wide range of common building joints. Highly resistant to weather conditions, UV exposure and pollution.

USES:
• Filling construction and expansion joints in concrete structures, like bridges, floors & roofs.
• Used in all types of residential, commercial & industrial building joints.
• Joints of windows, doors, ducting system, especially for clean rooms.
• Connection of building materials, such as concrete preformed units.

TECHNICAL DATA:
Form: Sag Resistant Paste
Color: Grey or White
Packaging: 600 Ml. Cartridge
Specific Gravity: 1.35
Skin Forming Time: 50% RH: 90-120 minutes
Tensile Strength: > 250 PSI
Elongation: 600 %
Elasticity Modulus: 48 PSI
Hardness Shore A: 30 to 50
Foot Traffic: 24 Hours
Application Temperature: 5°C to +35°C
Applicable Standard: Complies with ASTM C920

THEORETICAL COVERAGE (Mtr per 600 Ml cartridge):
• 40x20 mm: 0.75 m
• 25x12 mm: 1.99 m
• 20x12 mm: 2.50 m
• 12x12 mm: 4.15 m
• 6x6 mm: 16.66 m

HANDLING & STORAGE:
Shelf life of 12 months in dry cool place in original packing.`
    }
  ];

  for (const doc of verifiedDocs) {
    await client.query(`
      INSERT INTO technical_documents (
        id, title, product_name, manufacturer, document_type, category, folder_path,
        version, file_name, file_path, file_size_bytes, file_type, tags, visibility,
        uploaded_by, uploaded_by_name, extracted_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        extracted_text = EXCLUDED.extracted_text,
        tags = EXCLUDED.tags,
        product_name = EXCLUDED.product_name,
        category = EXCLUDED.category;
    `, [
      doc.id, doc.title, doc.product_name, doc.manufacturer, doc.document_type, doc.category,
      doc.folder_path, doc.version, doc.file_name, doc.file_path, doc.file_size_bytes, doc.file_type,
      doc.tags, doc.visibility, doc.uploaded_by, doc.uploaded_by_name, doc.extracted_text
    ]);
  }

  console.log(`Seeded ${verifiedDocs.length} real technical documents from Radiant Construction Technologies.`);

  // Verify counts
  const prodCount = await client.query('SELECT COUNT(*) FROM products');
  const custCount = await client.query('SELECT COUNT(*) FROM customers');
  const ordCount = await client.query('SELECT COUNT(*) FROM orders');
  const docCount = await client.query('SELECT COUNT(*) FROM technical_documents');
  const userCount = await client.query('SELECT COUNT(*) FROM users');
  const tmplCount = await client.query('SELECT COUNT(*) FROM message_templates');

  console.log('--- DATABASE STATUS ---');
  console.log('Products:', prodCount.rows[0].count, '(should be 0)');
  console.log('Customers:', custCount.rows[0].count, '(should be 0)');
  console.log('Orders:', ordCount.rows[0].count, '(should be 0)');
  console.log('Users:', userCount.rows[0].count, '(should be 8)');
  console.log('Templates:', tmplCount.rows[0].count, '(should be 10+)');
  console.log('Technical Documents:', docCount.rows[0].count, '(should be 4)');

  await client.end();
  console.log('Cleanup & Setup v2 Completed Successfully.');
}

setup().catch((e) => {
  console.error(e);
  process.exit(1);
});
