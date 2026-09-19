const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const INITIAL_PRODUCTS = [
  {
    id: 'prd_ultra_seal',
    name: 'Ultra Seal',
    category: 'Waterproofing',
    default_packing: '20 Kg Bucket',
    unit: 'Bucket',
    standard_rate: 5000,
    min_allowed_rate: 4500,
    description: 'High-performance elastomeric waterproofing barrier coating for slabs, basements and retaining walls.',
    in_stock: true,
  },
  {
    id: 'prd_pu_sealant',
    name: 'PU Sealant',
    category: 'Joint Sealants',
    default_packing: '600 ml Sausage',
    unit: 'Sausage',
    standard_rate: 1450,
    min_allowed_rate: 1250,
    description: 'Polyurethane expansion joint sealant for precast, control joints, and heavy civil structures.',
    in_stock: true,
  },
  {
    id: 'prd_conad',
    name: 'ConAD',
    category: 'Concrete Admixtures',
    default_packing: '20 Ltr Can',
    unit: 'Can',
    standard_rate: 3800,
    min_allowed_rate: 3400,
    description: 'Integral waterproofing admixture and water-reducing plasticizer for structural concrete.',
    in_stock: true,
  },
  {
    id: 'prd_dpc_9',
    name: 'DPC Roll 9"',
    category: 'Membranes',
    default_packing: '20 Meter Roll',
    unit: 'Roll',
    standard_rate: 2200,
    min_allowed_rate: 1950,
    description: '9-inch Damp Proof Course bituminous membrane roll for plinth beams and brick masonry.',
    in_stock: true,
  },
  {
    id: 'prd_con_repair',
    name: 'ConRepair Structural Mortar',
    category: 'Concrete Repair',
    default_packing: '25 Kg Bag',
    unit: 'Bag',
    standard_rate: 4200,
    min_allowed_rate: 3800,
    description: 'Polymer-modified fiber-reinforced structural repair mortar for honeycombs and spalled concrete.',
    in_stock: true,
  },
  {
    id: 'prd_water_stop',
    name: 'Water Stop Bar',
    category: 'Waterproofing',
    default_packing: '15 Meter Roll',
    unit: 'Roll',
    standard_rate: 850,
    min_allowed_rate: 750,
    description: 'Hydrophilic swelling waterstop strip for concrete construction joints.',
    in_stock: true,
  }
];

async function seedDatabase(dbUrl) {
  const connectionString = dbUrl || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/safe_order_hub';
  const client = new Client({ connectionString });
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
  console.log('✓ Seeded system settings (idempotent).');

  // Verify counts
  const userCount = await client.query('SELECT COUNT(*) FROM users');
  const productCount = await client.query('SELECT COUNT(*) FROM products');
  console.log(`Total users in DB: ${userCount.rows[0].count}`);
  console.log(`Total products in DB: ${productCount.rows[0].count}`);

  await client.end();
}

if (require.main === module) {
  seedDatabase().catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  });
}

module.exports = { seedDatabase, INITIAL_PRODUCTS };
