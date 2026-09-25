const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const INITIAL_PRODUCTS = [
  // Products start empty as per instructions: no fake or invented products.
  // Management can add products manually via the catalog or employees can enter free-text items.
];

async function seedDatabase(dbUrl) {
  const connectionString = dbUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/safe_order_hub';
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({ 
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('🌱 Connected to PostgreSQL for Seeding:', connectionString.split('@')[1]);

  const defaultPasswordHash = bcrypt.hashSync('SafeSolutions@2026', 10);
  const now = new Date().toISOString();

  // ONLY 8 APPROVED USERS
  const users = [
    {
      id: 'usr_boss',
      name: 'Asif',
      email: 'boss@safesolutions.com',
      password_hash: defaultPasswordHash,
      phone: '0300-0000000',
      designation: 'Managing Director / Boss',
      role: 'BOSS',
      vehicle: null,
      avatar: '/assest/images/asif.jpeg',
      active: true,
    },
    {
      id: 'usr_controller',
      name: 'M. Husnain Farooq',
      email: 'baransag68@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03468760963',
      designation: 'Controller (Operations & Finance)',
      role: 'CONTROLLER',
      vehicle: null,
      avatar: '/assest/images/husnain.jpeg',
      active: true,
    },
    {
      id: 'usr_manager',
      name: 'Samaira Mubashar',
      email: 'sm.bajwa786fsd@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03006646124',
      designation: 'Manager Account & Finance',
      role: 'MANAGER',
      vehicle: null,
      avatar: '/assest/images/samira.jpeg',
      active: true,
    },
    {
      id: 'usr_shahzaib',
      name: 'Engr. Shahzaib Ahmad',
      email: 'Zaiberana37@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03007684761',
      designation: 'Marketing Executive',
      role: 'MARKETING_EXECUTIVE',
      vehicle: 'BBE-5688',
      avatar: '/assest/images/shahzaib-ahmad.jpeg',
      active: true,
    },
    {
      id: 'usr_shahbaz',
      name: 'Shahbaz Ahmed',
      email: 'shabazbutt1132@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03237684200',
      designation: 'Application Supervisor & Sales Person',
      role: 'SALES_PERSON',
      vehicle: 'AGN-1227-21',
      avatar: '/assest/images/shahbaz-ahmad.jpeg',
      active: true,
    },
    {
      id: 'usr_adnan',
      name: 'Adnan Ali',
      email: 'mianadnanali88@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03217684400',
      designation: 'Area Sales Manager',
      role: 'AREA_SALES_MANAGER',
      vehicle: 'AHV 378',
      avatar: '/assest/images/adnan-ali.jpeg',
      active: true,
    },
    {
      id: 'usr_haseeb',
      name: 'Engr. Haseeb Ali',
      email: 'haseebalicivil11@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03058477264',
      designation: 'Area Sales Person',
      role: 'SALES_PERSON',
      vehicle: null,
      avatar: '/assest/images/haseeb-ali.jpeg',
      active: true,
    },
    {
      id: 'usr_tajammul',
      name: 'Tajammul Mushtaq',
      email: 'tajammulbajwa545@gmail.com',
      password_hash: defaultPasswordHash,
      phone: '03217684500',
      designation: 'Area Sales Manager',
      role: 'AREA_SALES_MANAGER',
      vehicle: 'FD-17-84',
      avatar: '/assest/images/tajammul.jpeg',
      active: true,
    },
  ];

  // 1. Seed Users Idempotently (INSERT ... ON CONFLICT (email) DO UPDATE)
  for (const u of users) {
    await client.query(`
      INSERT INTO users (id, name, email, password_hash, phone, designation, role, vehicle, avatar, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        designation = EXCLUDED.designation,
        role = EXCLUDED.role,
        vehicle = EXCLUDED.vehicle,
        avatar = EXCLUDED.avatar,
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `, [u.id, u.name, u.email, u.password_hash, u.phone, u.designation, u.role, u.vehicle, u.avatar, u.active, now, now]);
  }
  console.log(`✓ Seeded ${users.length} authorized users (idempotent).`);

  // 2. Seed Products Idempotently
  for (const p of INITIAL_PRODUCTS) {
    await client.query(`
      INSERT INTO products (id, name, category, default_packing, unit, standard_rate, min_allowed_rate, description, in_stock, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        default_packing = EXCLUDED.default_packing,
        unit = EXCLUDED.unit,
        standard_rate = EXCLUDED.standard_rate,
        min_allowed_rate = EXCLUDED.min_allowed_rate,
        description = EXCLUDED.description,
        in_stock = EXCLUDED.in_stock,
        updated_at = EXCLUDED.updated_at
    `, [p.id, p.name, p.category, p.default_packing, p.unit, p.standard_rate, p.min_allowed_rate, p.description, p.in_stock, now, now]);
  }
  console.log(`✓ Seeded ${INITIAL_PRODUCTS.length} authentic products (idempotent).`);

  // 3. Seed System Settings Idempotently
  await client.query(`
    INSERT INTO system_settings (id, company_name, office_whatsapp_number, whatsapp_group_invite_url, currency, rate_warning_tolerance_percent, updated_at)
    VALUES ('sys_settings', 'SAFE SOLUTIONS — Construction Chemicals & Waterproofing', '923006646124', 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK', 'PKR', 5.0, $1)
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      office_whatsapp_number = EXCLUDED.office_whatsapp_number,
      whatsapp_group_invite_url = EXCLUDED.whatsapp_group_invite_url,
      currency = EXCLUDED.currency,
      rate_warning_tolerance_percent = EXCLUDED.rate_warning_tolerance_percent,
      updated_at = EXCLUDED.updated_at
  `, [now]);
  // 4. Seed Message Templates Idempotently (10 Professional Categories in EN & Roman Urdu)
  const DEFAULT_TEMPLATES = [
    {
      id: 'tmpl_order_received',
      title: 'Order Received Confirmation',
      category: 'ORDER_RECEIVED',
      language: 'en',
      template_text: 'Dear {{customer_name}}, thank you for choosing SAFE SOLUTIONS. Your order #{{order_id}} for {{products}} has been successfully recorded and is under review. Our operations desk will keep you updated. For queries, contact your sales representative {{salesperson_name}}.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_order_confirmed',
      title: 'Order Confirmed & Scheduled',
      category: 'ORDER_CONFIRMED',
      language: 'en',
      template_text: 'Assalam-o-Alaikum {{customer_name}}, your order #{{order_id}} with SAFE SOLUTIONS has been officially CONFIRMED. Expected delivery date: {{delivery_date}}. Payment status: {{payment_status}}. Thank you for your valued partnership!',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_order_dispatched',
      title: 'Order Dispatched / In Transit',
      category: 'ORDER_DISPATCHED',
      language: 'en',
      template_text: 'Hello {{customer_name}}, exciting news! Your order #{{order_id}} ({{products}}) has been dispatched from SAFE SOLUTIONS warehouse and is on its way. Expected arrival: {{delivery_date}}. Driver contact details will be shared upon arrival.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_order_delivered',
      title: 'Delivery Completed Confirmation',
      category: 'ORDER_DELIVERED',
      language: 'en',
      template_text: 'Dear {{customer_name}}, order #{{order_id}} has been successfully DELIVERED to your site. Please inspect the materials and verify the batch/packing. We appreciate your continued trust in SAFE SOLUTIONS waterproofing & construction chemicals.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_payment_received',
      title: 'Payment Acknowledgment',
      category: 'PAYMENT_RECEIVED',
      language: 'en',
      template_text: 'Assalam-o-Alaikum {{customer_name}}, we acknowledge with thanks the receipt of your payment for order #{{order_id}}. Your payment status is now updated to {{payment_status}}. Thank you for your prompt settlement and business cooperation.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_repeat_customer',
      title: 'Valued Repeat Client Appreciation',
      category: 'REPEAT_CUSTOMER',
      language: 'en',
      template_text: 'Dear {{customer_name}}, we truly appreciate your ongoing partnership with SAFE SOLUTIONS. Serving {{company_name}} is always our privilege. Your dedicated account representative {{salesperson_name}} remains at your service for any site requirements.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_new_customer',
      title: 'New Client Welcome',
      category: 'NEW_CUSTOMER',
      language: 'en',
      template_text: 'Welcome to the SAFE SOLUTIONS family, {{customer_name}}! We are thrilled to partner with {{company_name}} for your construction & waterproofing needs. Order #{{order_id}} is booked. We guarantee premium material quality and dedicated technical support.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_feedback_review',
      title: 'Client Satisfaction & Feedback Request',
      category: 'FEEDBACK_REVIEW',
      language: 'en',
      template_text: 'Dear {{customer_name}}, regarding your recent delivery of order #{{order_id}}, we would love to hear your feedback on product performance and delivery timeliness. Your satisfaction is our top priority. Please let us know if anything needs improvement.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_after_sales',
      title: 'Technical Support & Application Guidance',
      category: 'AFTER_SALES',
      language: 'en',
      template_text: 'Hello {{customer_name}}, our technical application team at SAFE SOLUTIONS is available if your site supervisors require application guidelines or TDS (Technical Data Sheets) for order #{{order_id}}. Reach out to {{salesperson_name}} anytime.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_general',
      title: 'General Executive Goodwill & Greetings',
      category: 'GENERAL',
      language: 'en',
      template_text: 'Warm greetings from SAFE SOLUTIONS, {{customer_name}}! We wish you and {{company_name}} continued success and prosperity. Thank you for being a valued client. We remain committed to exceeding your expectations on every project.',
      is_default: true,
      is_active: true,
    },
    {
      id: 'tmpl_order_confirmed_ur',
      title: 'Order Confirmed (Roman Urdu)',
      category: 'ORDER_CONFIRMED',
      language: 'ur',
      template_text: 'Assalam-o-Alaikum {{customer_name}} Sahab, SAFE SOLUTIONS se aap ka order #{{order_id}} officially CONFIRM ho chuka hai. Mutawaqo delivery tareekh: {{delivery_date}}. Payment status: {{payment_status}}. Aap k taawun ka dili shukriya!',
      is_default: false,
      is_active: true,
    },
    {
      id: 'tmpl_order_delivered_ur',
      title: 'Delivery Completed (Roman Urdu)',
      category: 'ORDER_DELIVERED',
      language: 'ur',
      template_text: 'Muhtaram {{customer_name}} Sahab, aap ka order #{{order_id}} site par kamyabi se DELIVER kar diya gaya hai. Baraye meherbani material aur packing check kar lein. SAFE SOLUTIONS par aitaymad karne ka bohot shukriya.',
      is_default: false,
      is_active: true,
    }
  ];

  for (const t of DEFAULT_TEMPLATES) {
    await client.query(`
      INSERT INTO message_templates (id, title, category, language, template_text, is_default, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        language = EXCLUDED.language,
        template_text = EXCLUDED.template_text,
        is_default = EXCLUDED.is_default,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at
    `, [t.id, t.title, t.category, t.language, t.template_text, t.is_default, t.is_active, now, now]);
  }
  console.log(`✓ Seeded ${DEFAULT_TEMPLATES.length} message templates (idempotent).`);

  // Verify counts
  const userCount = await client.query('SELECT COUNT(*) FROM users');
  const productCount = await client.query('SELECT COUNT(*) FROM products');
  const templateCount = await client.query('SELECT COUNT(*) FROM message_templates');
  console.log(`Total users in DB: ${userCount.rows[0].count}`);
  console.log(`Total products in DB: ${productCount.rows[0].count}`);
  console.log(`Total message templates in DB: ${templateCount.rows[0].count}`);

  await client.end();
}

if (require.main === module) {
  seedDatabase().catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  });
}

module.exports = { seedDatabase, INITIAL_PRODUCTS };
