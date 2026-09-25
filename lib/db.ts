import { queryPostgres, withTransaction, assertPostgresConfigured } from './postgres';
import { 
  User, 
  Product, 
  Order, 
  OrderItem,
  OrderStatusHistory,
  Customer, 
  Notification, 
  SystemSettings, 
  Role, 
  OrderStatus, 
  PaymentStatus, 
  DeliveryStatus,
  Urgency,
  AuditLog,
  DeliveryProof,
  VoiceOrder,
  VoiceOrderStatus,
  MessageTemplate,
  MessageTemplateCategory,
  PushSubscriptionRecord,
  TechnicalDocument,
  DocumentType,
  CopilotMessage,
  CopilotConversation
} from './types';
import { validateOrderStatusTransition } from './order-state-machine';

// ─────────────────────────────────────────────────────────────────────────────
// DATA MAPPERS (PostgreSQL snake_case -> TypeScript camelCase)
// ─────────────────────────────────────────────────────────────────────────────

function mapUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    passwordHash: r.password_hash,
    phone: r.phone,
    designation: r.designation,
    role: r.role as Role,
    vehicle: r.vehicle || undefined,
    avatar: r.avatar || undefined,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at).toISOString(),
    languagePreference: r.language_preference || 'en',
    themePreference: r.theme_preference || 'light',
    notificationPreferences: typeof r.notification_preferences === 'string'
      ? JSON.parse(r.notification_preferences)
      : (r.notification_preferences || { orders: true, deliveries: true, approvals: true }),
    profileVisibility: r.profile_visibility || 'TEAM',
  };
}

function mapVoiceOrder(r: any): VoiceOrder {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    audioUrl: r.audio_url || undefined,
    durationSeconds: Number(r.duration_seconds || 0),
    transcript: r.transcript || '',
    extractedCustomerName: r.extracted_customer_name || undefined,
    extractedCustomerPhone: r.extracted_customer_phone || undefined,
    extractedCity: r.extracted_city || undefined,
    extractedDeliveryAddress: r.extracted_delivery_address || undefined,
    extractedProducts: typeof r.extracted_products === 'string' ? JSON.parse(r.extracted_products) : (r.extracted_products || null),
    extractedRates: r.extracted_rates || undefined,
    extractedNotes: r.extracted_notes || undefined,
    status: r.status as VoiceOrderStatus,
    assignedToId: r.assigned_to_id || undefined,
    assignedToName: r.assigned_to_name || undefined,
    convertedOrderId: r.converted_order_id || undefined,
    internalNotes: r.internal_notes || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapTemplate(r: any): MessageTemplate {
  return {
    id: r.id,
    title: r.title,
    category: r.category as MessageTemplateCategory,
    language: r.language || 'en',
    templateText: r.template_text,
    isDefault: Boolean(r.is_default),
    isActive: Boolean(r.is_active),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapPushSub(r: any): PushSubscriptionRecord {
  return {
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapTechnicalDocument(r: any): TechnicalDocument {
  return {
    id: r.id,
    title: r.title,
    productName: r.product_name || undefined,
    manufacturer: r.manufacturer || undefined,
    documentType: (r.document_type || 'TDS') as DocumentType,
    category: r.category || 'General',
    folderPath: r.folder_path || '/',
    version: r.version || '1.0',
    fileName: r.file_name,
    filePath: r.file_path,
    fileSizeBytes: Number(r.file_size_bytes || 0),
    fileType: r.file_type || 'application/pdf',
    extractedText: r.extracted_text || undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    visibility: (r.visibility || 'ALL_SALES') as 'ALL_SALES' | 'MANAGEMENT_ONLY',
    isArchived: Boolean(r.is_archived),
    uploadedBy: r.uploaded_by,
    uploadedByName: r.uploaded_by_name || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapCopilotMessage(r: any): CopilotMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    userId: r.user_id,
    role: r.role as 'user' | 'assistant' | 'system',
    content: r.content,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapCopilotConversation(r: any): CopilotConversation {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    defaultPacking: r.default_packing,
    unit: r.unit,
    standardRate: Number(r.standard_rate),
    minAllowedRate: Number(r.min_allowed_rate),
    description: r.description || undefined,
    inStock: Boolean(r.in_stock),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

function mapCustomer(r: any, totalOrders = 0, totalSpend = 0, lastOrderDate?: string): Customer {
  return {
    id: r.id,
    name: r.name,
    companyName: r.company_name,
    phone: r.phone,
    whatsapp: r.whatsapp || undefined,
    city: r.city,
    deliveryAddress: r.delivery_address,
    mapsUrl: r.maps_url || undefined,
    customerType: r.customer_type || 'EXISTING',
    notes: r.notes || undefined,
    createdById: r.created_by_id || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    totalOrders: Number(r.total_orders ?? totalOrders),
    totalSpend: Number(r.total_spend ?? totalSpend),
    lastOrderDate: r.last_order_date || lastOrderDate || undefined,
  };
}

function mapOrderItem(r: any): OrderItem {
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    packing: r.packing,
    unit: r.unit,
    quantity: Number(r.quantity),
    standardRate: Number(r.standard_rate),
    offeredRate: Number(r.offered_rate),
    discount: Number(r.discount || 0),
    totalAmount: Number(r.total_amount),
    isSpecialRate: Boolean(r.is_special_rate),
  };
}

function mapHistory(r: any): OrderStatusHistory {
  return {
    id: r.id,
    orderId: r.order_id,
    previousStatus: r.previous_status as OrderStatus || undefined,
    newStatus: r.new_status as OrderStatus,
    changedById: r.changed_by_id,
    changedByName: r.changed_by_name,
    timestamp: new Date(r.timestamp).toISOString(),
    note: r.note || undefined,
  };
}

function mapDelivery(r: any): DeliveryProof {
  return {
    id: r.id,
    orderId: r.order_id,
    assignedDriver: r.assigned_driver || undefined,
    driverPhone: r.driver_phone || undefined,
    vehicleNumber: r.vehicle_number || undefined,
    deliveryStatus: (r.delivery_status || 'PENDING') as DeliveryStatus,
    scheduledDate: r.scheduled_date ? new Date(r.scheduled_date).toISOString().split('T')[0] : undefined,
    deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : undefined,
    proofPhotoUrl: r.proof_photo_url || undefined,
    signedReceiptUrl: r.signed_receipt_url || undefined,
    invoiceNumber: r.invoice_number || undefined,
    notes: r.delivery_notes || undefined,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function mapAuditLog(r: any): AuditLog {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    userRole: r.user_role as Role,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id || undefined,
    oldValue: r.old_value || undefined,
    newValue: r.new_value || undefined,
    ipAddress: r.ip_address || undefined,
    timestamp: new Date(r.timestamp).toISOString(),
  };
}

function mapNotification(r: any): Notification {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    orderId: r.order_id || undefined,
    orderNumber: r.order_number || undefined,
    type: r.type,
    read: Boolean(r.read),
    recipientRoles: r.recipient_roles || undefined,
    userId: r.user_id || undefined,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapSettings(r: any): SystemSettings {
  return {
    id: r.id || 'sys_settings',
    companyName: r.company_name || 'SAFE SOLUTIONS',
    officeWhatsappNumber: r.office_whatsapp_number || '923006646124',
    whatsappGroupInviteUrl: r.whatsapp_group_invite_url || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK',
    currency: r.currency || 'PKR',
    rateWarningTolerancePercent: Number(r.rate_warning_tolerance_percent || 5),
    updatedAt: new Date(r.updated_at || Date.now()).toISOString(),
  };
}

function mapOrder(r: any, items: OrderItem[] = [], history: OrderStatusHistory[] = [], delivery?: DeliveryProof): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customerId: r.customer_id,
    customerName: r.customer_name,
    companyName: r.company_name,
    customerPhone: r.customer_phone,
    customerWhatsapp: r.customer_whatsapp || undefined,
    city: r.city,
    deliveryAddress: r.delivery_address,
    mapsUrl: r.maps_url || undefined,
    customerType: r.customer_type || 'EXISTING',

    items,
    subtotal: Number(r.subtotal),
    discountTotal: Number(r.discount_total || 0),
    grandTotal: Number(r.grand_total),

    paymentStatus: r.payment_status as PaymentStatus,
    paymentRemarks: r.payment_remarks || undefined,
    requiredDeliveryDate: r.required_delivery_date ? new Date(r.required_delivery_date).toISOString().split('T')[0] : '',
    urgency: (r.urgency || 'NORMAL') as Urgency,

    status: r.status as OrderStatus,
    specialRateApproved: Boolean(r.special_rate_approved),
    rateReviewNote: r.rate_review_note || undefined,

    orderTakenById: r.order_taken_by_id,
    orderTakenByName: r.order_taken_by_name,
    orderTakenByEmail: r.order_taken_by_email,
    orderTakenByPhone: r.order_taken_by_phone,

    remarks: r.remarks || undefined,
    internalNotes: r.internal_notes || undefined,
    idempotencyKey: r.idempotency_key || undefined,

    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),

    history,
    delivery,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITATIVE POSTGRESQL DATA LAYER
// ─────────────────────────────────────────────────────────────────────────────

export const db = {
  // ──────────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────────
  getUsers: async (): Promise<User[]> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM users ORDER BY created_at ASC');
    return rows.map(mapUser);
  },

  getUserById: async (id: string): Promise<User | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM users WHERE id = $1', [id]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  },

  updateUser: async (
    id: string, 
    updates: Partial<User>, 
    actor: { id: string; name: string; role: Role }
  ): Promise<User | null> => {
    assertPostgresConfigured();
    const existing = await db.getUserById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
    if (updates.designation !== undefined) { fields.push(`designation = $${idx++}`); values.push(updates.designation); }
    if (updates.role !== undefined) { fields.push(`role = $${idx++}`); values.push(updates.role); }
    if (updates.vehicle !== undefined) { fields.push(`vehicle = $${idx++}`); values.push(updates.vehicle); }
    if (updates.avatar !== undefined) { fields.push(`avatar = $${idx++}`); values.push(updates.avatar); }
    if (updates.active !== undefined) { fields.push(`active = $${idx++}`); values.push(updates.active); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    if (rows.length === 0) return null;

    await db.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'USER_UPDATED',
      entity: 'USER',
      entityId: id,
      newValue: JSON.stringify(updates),
    });

    return mapUser(rows[0]);
  },

  // ──────────────────────────────────────────────
  // PRODUCTS
  // ──────────────────────────────────────────────
  getProducts: async (): Promise<Product[]> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM products ORDER BY name ASC');
    return rows.map(mapProduct);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM products WHERE id = $1', [id]);
    return rows.length > 0 ? mapProduct(rows[0]) : null;
  },

  createProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    assertPostgresConfigured();
    const id = `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const q = `
      INSERT INTO products (id, name, category, default_packing, unit, standard_rate, min_allowed_rate, description, in_stock, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const rows = await queryPostgres(q, [
      id,
      product.name,
      product.category,
      product.defaultPacking,
      product.unit,
      product.standardRate,
      product.minAllowedRate,
      product.description || '',
      product.inStock !== false,
      now,
      now,
    ]);

    return mapProduct(rows[0]);
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.category !== undefined) { fields.push(`category = $${idx++}`); values.push(updates.category); }
    if (updates.defaultPacking !== undefined) { fields.push(`default_packing = $${idx++}`); values.push(updates.defaultPacking); }
    if (updates.unit !== undefined) { fields.push(`unit = $${idx++}`); values.push(updates.unit); }
    if (updates.standardRate !== undefined) { fields.push(`standard_rate = $${idx++}`); values.push(updates.standardRate); }
    if (updates.minAllowedRate !== undefined) { fields.push(`min_allowed_rate = $${idx++}`); values.push(updates.minAllowedRate); }
    if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.inStock !== undefined) { fields.push(`in_stock = $${idx++}`); values.push(updates.inStock); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    return rows.length > 0 ? mapProduct(rows[0]) : null;
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // ──────────────────────────────────────────────
  // CUSTOMERS
  // ──────────────────────────────────────────────
  getCustomers: async (search?: string, city?: string): Promise<Customer[]> => {
    assertPostgresConfigured();
    let q = `
      SELECT c.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status NOT IN ('CANCELLED', 'RETURNED') THEN o.grand_total ELSE 0 END), 0) as total_spend,
        MAX(o.created_at) as last_order_date
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (city && city !== 'ALL') {
      q += ` AND LOWER(c.city) = LOWER($${idx++})`;
      params.push(city);
    }

    if (search && search.trim()) {
      q += ` AND (LOWER(c.name) LIKE $${idx} OR LOWER(c.company_name) LIKE $${idx} OR c.phone LIKE $${idx} OR LOWER(c.city) LIKE $${idx})`;
      params.push(`%${search.toLowerCase().trim()}%`);
      idx++;
    }

    q += ` GROUP BY c.id ORDER BY c.created_at DESC`;
    const rows = await queryPostgres(q, params);
    return rows.map(r => mapCustomer(r));
  },

  getCustomerById: async (id: string): Promise<Customer | null> => {
    assertPostgresConfigured();
    const q = `
      SELECT c.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status NOT IN ('CANCELLED', 'RETURNED') THEN o.grand_total ELSE 0 END), 0) as total_spend,
        MAX(o.created_at) as last_order_date
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const rows = await queryPostgres(q, [id]);
    return rows.length > 0 ? mapCustomer(rows[0]) : null;
  },

  findOrCreateCustomer: async (
    cust: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
    actor?: { id: string; name: string }
  ): Promise<Customer> => {
    assertPostgresConfigured();
    const cleanPhone = cust.phone.replace(/\D/g, '');

    // Check existing by normalized phone or exact company name
    const existing = await queryPostgres(`
      SELECT * FROM customers 
      WHERE phone = $1 
         OR regexp_replace(phone, '\\D', '', 'g') = $2
         OR (LOWER(company_name) = LOWER($3) AND LOWER(city) = LOWER($4))
      LIMIT 1
    `, [cust.phone, cleanPhone, cust.companyName.trim(), cust.city.trim()]);

    if (existing.length > 0) {
      return mapCustomer(existing[0]);
    }

    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO customers (id, name, company_name, phone, whatsapp, city, delivery_address, maps_url, customer_type, notes, created_by_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const rows = await queryPostgres(insertQuery, [
      id,
      cust.name.trim(),
      cust.companyName.trim(),
      cust.phone.trim(),
      (cust.whatsapp || cust.phone).trim(),
      cust.city.trim(),
      cust.deliveryAddress.trim(),
      cust.mapsUrl || '',
      cust.customerType || 'NEW',
      cust.notes || '',
      cust.createdById || actor?.id || null,
      now,
      now,
    ]);

    if (actor) {
      await db.addAuditLog({
        userId: actor.id,
        userName: actor.name,
        userRole: 'SALES_PERSON',
        action: 'CUSTOMER_CREATED',
        entity: 'CUSTOMER',
        entityId: id,
        newValue: `${cust.name} (${cust.companyName}, ${cust.city})`,
      });
    }

    return mapCustomer(rows[0]);
  },

  updateCustomer: async (
    id: string, 
    updates: Partial<Customer>, 
    actor: { id: string; name: string; role: Role }
  ): Promise<Customer | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.companyName !== undefined) { fields.push(`company_name = $${idx++}`); values.push(updates.companyName); }
    if (updates.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
    if (updates.whatsapp !== undefined) { fields.push(`whatsapp = $${idx++}`); values.push(updates.whatsapp); }
    if (updates.city !== undefined) { fields.push(`city = $${idx++}`); values.push(updates.city); }
    if (updates.deliveryAddress !== undefined) { fields.push(`delivery_address = $${idx++}`); values.push(updates.deliveryAddress); }
    if (updates.mapsUrl !== undefined) { fields.push(`maps_url = $${idx++}`); values.push(updates.mapsUrl); }
    if (updates.customerType !== undefined) { fields.push(`customer_type = $${idx++}`); values.push(updates.customerType); }
    if (updates.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(updates.notes); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    if (rows.length === 0) return null;

    await db.addAuditLog({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: 'CUSTOMER_UPDATED',
      entity: 'CUSTOMER',
      entityId: id,
      newValue: JSON.stringify(updates),
    });

    return mapCustomer(rows[0]);
  },

  // ──────────────────────────────────────────────
  // ORDERS
  // ──────────────────────────────────────────────
  getOrders: async (params?: { 
    role?: Role; 
    userId?: string; 
    search?: string; 
    status?: OrderStatus | 'ALL';
    paymentStatus?: PaymentStatus | 'ALL';
    deliveryStatus?: DeliveryStatus | 'ALL';
    city?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    productId?: string;
  }): Promise<Order[]> => {
    assertPostgresConfigured();

    let q = `
      SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', oi.product_name,
              'packing', oi.packing,
              'unit', oi.unit,
              'quantity', oi.quantity,
              'standardRate', oi.standard_rate,
              'offeredRate', oi.offered_rate,
              'discount', oi.discount,
              'totalAmount', oi.total_amount,
              'isSpecialRate', oi.is_special_rate
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items_json,
        d.id as del_id,
        d.assigned_driver,
        d.driver_phone,
        d.vehicle_number,
        d.delivery_status,
        d.scheduled_date as del_sched_date,
        d.delivered_at,
        d.proof_photo_url,
        d.signed_receipt_url,
        d.invoice_number,
        d.delivery_notes,
        d.created_at as del_created_at,
        d.updated_at as del_updated_at
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN deliveries d ON o.id = d.order_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let idx = 1;

    // RBAC: Boss, Controller, Manager see all. Sales users see ONLY their own orders.
    if (params?.role && !['BOSS', 'CONTROLLER', 'MANAGER'].includes(params.role)) {
      if (params.userId) {
        q += ` AND o.order_taken_by_id = $${idx++}`;
        queryParams.push(params.userId);
      }
    } else if (params?.employeeId && params.employeeId !== 'ALL') {
      q += ` AND o.order_taken_by_id = $${idx++}`;
      queryParams.push(params.employeeId);
    }

    if (params?.status && params.status !== 'ALL') {
      q += ` AND o.status = $${idx++}`;
      queryParams.push(params.status);
    }

    if (params?.paymentStatus && params.paymentStatus !== 'ALL') {
      q += ` AND o.payment_status = $${idx++}`;
      queryParams.push(params.paymentStatus);
    }

    if (params?.deliveryStatus && params.deliveryStatus !== 'ALL') {
      q += ` AND d.delivery_status = $${idx++}`;
      queryParams.push(params.deliveryStatus);
    }

    if (params?.city && params.city !== 'ALL') {
      q += ` AND LOWER(o.city) = LOWER($${idx++})`;
      queryParams.push(params.city);
    }

    if (params?.dateRange) {
      if (params.dateRange === 'TODAY') {
        q += ` AND o.created_at >= CURRENT_DATE`;
      } else if (params.dateRange === 'THIS_WEEK') {
        q += ` AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
      } else if (params.dateRange === 'THIS_MONTH') {
        q += ` AND o.created_at >= date_trunc('month', CURRENT_DATE)`;
      } else if (params.dateRange === 'THIS_YEAR') {
        q += ` AND o.created_at >= date_trunc('year', CURRENT_DATE)`;
      }
    }

    if (params?.startDate) {
      q += ` AND o.created_at >= $${idx++}`;
      queryParams.push(params.startDate);
    }

    if (params?.endDate) {
      q += ` AND o.created_at <= $${idx++}`;
      queryParams.push(params.endDate);
    }

    if (params?.search && params.search.trim()) {
      const term = `%${params.search.toLowerCase().trim()}%`;
      q += ` AND (
        LOWER(o.order_number) LIKE $${idx} OR
        LOWER(o.customer_name) LIKE $${idx} OR
        LOWER(o.company_name) LIKE $${idx} OR
        LOWER(o.city) LIKE $${idx} OR
        LOWER(o.order_taken_by_name) LIKE $${idx}
      )`;
      queryParams.push(term);
      idx++;
    }

    q += ` GROUP BY o.id, d.id ORDER BY o.created_at DESC`;

    const rows = await queryPostgres(q, queryParams);

    return rows.map(r => {
      const items: OrderItem[] = (r.items_json || []).map((it: any) => ({
        id: it.id,
        productId: it.productId,
        productName: it.productName,
        packing: it.packing,
        unit: it.unit,
        quantity: Number(it.quantity),
        standardRate: Number(it.standardRate),
        offeredRate: Number(it.offeredRate),
        discount: Number(it.discount || 0),
        totalAmount: Number(it.totalAmount),
        isSpecialRate: Boolean(it.isSpecialRate),
      }));

      // Filter by product if requested
      if (params?.productId && params.productId !== 'ALL') {
        if (!items.some(it => it.productId === params.productId)) {
          return null as any;
        }
      }

      let delivery: DeliveryProof | undefined = undefined;
      if (r.del_id) {
        delivery = {
          id: r.del_id,
          orderId: r.id,
          assignedDriver: r.assigned_driver || undefined,
          driverPhone: r.driver_phone || undefined,
          vehicleNumber: r.vehicle_number || undefined,
          deliveryStatus: (r.delivery_status || 'PENDING') as DeliveryStatus,
          scheduledDate: r.del_sched_date ? new Date(r.del_sched_date).toISOString().split('T')[0] : undefined,
          deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : undefined,
          proofPhotoUrl: r.proof_photo_url || undefined,
          signedReceiptUrl: r.signed_receipt_url || undefined,
          invoiceNumber: r.invoice_number || undefined,
          notes: r.delivery_notes || undefined,
          createdAt: new Date(r.del_created_at).toISOString(),
          updatedAt: new Date(r.del_updated_at).toISOString(),
        };
      }

      return mapOrder(r, items, [], delivery);
    }).filter(Boolean);
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres(`
      SELECT o.*,
        d.id as del_id,
        d.assigned_driver,
        d.driver_phone,
        d.vehicle_number,
        d.delivery_status,
        d.scheduled_date as del_sched_date,
        d.delivered_at,
        d.proof_photo_url,
        d.signed_receipt_url,
        d.invoice_number,
        d.delivery_notes,
        d.created_at as del_created_at,
        d.updated_at as del_updated_at
      FROM orders o
      LEFT JOIN deliveries d ON o.id = d.order_id
      WHERE o.id = $1 OR o.order_number = $1
      LIMIT 1
    `, [id]);

    if (rows.length === 0) return null;
    const r = rows[0];

    // Fetch items
    const itemRows = await queryPostgres('SELECT * FROM order_items WHERE order_id = $1', [r.id]);
    const items = itemRows.map(mapOrderItem);

    // Fetch history
    const historyRows = await queryPostgres('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY timestamp ASC', [r.id]);
    const history = historyRows.map(mapHistory);

    let delivery: DeliveryProof | undefined = undefined;
    if (r.del_id) {
      delivery = {
        id: r.del_id,
        orderId: r.id,
        assignedDriver: r.assigned_driver || undefined,
        driverPhone: r.driver_phone || undefined,
        vehicleNumber: r.vehicle_number || undefined,
        deliveryStatus: (r.delivery_status || 'PENDING') as DeliveryStatus,
        scheduledDate: r.del_sched_date ? new Date(r.del_sched_date).toISOString().split('T')[0] : undefined,
        deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : undefined,
        proofPhotoUrl: r.proof_photo_url || undefined,
        signedReceiptUrl: r.signed_receipt_url || undefined,
        invoiceNumber: r.invoice_number || undefined,
        notes: r.delivery_notes || undefined,
        createdAt: new Date(r.del_created_at).toISOString(),
        updatedAt: new Date(r.del_updated_at).toISOString(),
      };
    }

    return mapOrder(r, items, history, delivery);
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'history'> & { idempotencyKey?: string }): Promise<Order> => {
    assertPostgresConfigured();

    return await withTransaction(async (client) => {
      // 1. Server-side Idempotency Check
      if (orderData.idempotencyKey) {
        const existing = await client.query('SELECT id FROM orders WHERE idempotency_key = $1', [orderData.idempotencyKey]);
        if (existing.rows.length > 0) {
          const existingOrder = await db.getOrderById(existing.rows[0].id);
          if (existingOrder) return existingOrder;
        }
      }

      // 2. Generate Sequential Order Number atomically
      const countRes = await client.query('SELECT COUNT(*) as cnt FROM orders');
      const nextNum = parseInt(countRes.rows[0].cnt, 10) + 1;
      const year = new Date().getFullYear();
      const orderNumber = `SS-ORD-${year}-${String(nextNum).padStart(5, '0')}`;
      const newId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      // 3. Insert into orders table (preserving historical snapshot of customer)
      const orderInsertQuery = `
        INSERT INTO orders (
          id, order_number, customer_id, customer_name, company_name, customer_phone, customer_whatsapp,
          city, delivery_address, maps_url, customer_type, subtotal, discount_total, grand_total,
          payment_status, payment_remarks, required_delivery_date, urgency, status,
          special_rate_approved, rate_review_note, order_taken_by_id, order_taken_by_name,
          order_taken_by_email, order_taken_by_phone, remarks, internal_notes, idempotency_key,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        ) RETURNING *
      `;

      const orderRows = await client.query(orderInsertQuery, [
        newId,
        orderNumber,
        orderData.customerId,
        orderData.customerName,
        orderData.companyName,
        orderData.customerPhone,
        orderData.customerWhatsapp || null,
        orderData.city,
        orderData.deliveryAddress,
        orderData.mapsUrl || null,
        orderData.customerType || 'EXISTING',
        orderData.subtotal,
        orderData.discountTotal || 0,
        orderData.grandTotal,
        orderData.paymentStatus || 'PENDING',
        orderData.paymentRemarks || null,
        orderData.requiredDeliveryDate || now.split('T')[0],
        orderData.urgency || 'NORMAL',
        orderData.status || 'NEW',
        orderData.specialRateApproved !== false,
        orderData.rateReviewNote || null,
        orderData.orderTakenById,
        orderData.orderTakenByName,
        orderData.orderTakenByEmail,
        orderData.orderTakenByPhone,
        orderData.remarks || null,
        orderData.internalNotes || null,
        orderData.idempotencyKey || null,
        now,
        now,
      ]);

      // 4. Insert Order Items (preserving historical snapshot of product)
      const insertedItems: OrderItem[] = [];
      for (const item of orderData.items) {
        const itemId = item.id || `itm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const itemInsert = `
          INSERT INTO order_items (
            id, order_id, product_id, product_name, packing, unit, quantity,
            standard_rate, offered_rate, discount, total_amount, is_special_rate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;
        const ir = await client.query(itemInsert, [
          itemId,
          newId,
          item.productId || null,
          item.productName,
          item.packing || 'Standard',
          item.unit || 'Unit',
          item.quantity,
          item.standardRate,
          item.offeredRate,
          item.discount || 0,
          item.totalAmount,
          item.isSpecialRate || false,
        ]);
        insertedItems.push(mapOrderItem(ir.rows[0]));
      }

      // 5. Insert initial status history
      const histId = `hist_${Date.now()}`;
      await client.query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_id, changed_by_name, timestamp, note)
        VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)
      `, [
        histId,
        newId,
        orderData.status,
        orderData.orderTakenById,
        orderData.orderTakenByName,
        now,
        `Order booked by ${orderData.orderTakenByName}`,
      ]);

      // 6. Initialize Deliveries entry
      const delId = `del_${Date.now()}`;
      await client.query(`
        INSERT INTO deliveries (id, order_id, delivery_status, scheduled_date, created_at, updated_at)
        VALUES ($1, $2, 'PENDING', $3, $4, $5)
      `, [delId, newId, orderData.requiredDeliveryDate || now.split('T')[0], now, now]);

      // 7. Insert Notifications
      if (orderData.status === 'RATE_REVIEW') {
        await client.query(`
          INSERT INTO notifications (id, title, message, order_id, order_number, type, recipient_roles, created_at)
          VALUES ($1, $2, $3, $4, $5, 'RATE_REVIEW', ARRAY['BOSS', 'CONTROLLER', 'MANAGER'], $6)
        `, [
          `notif_${Date.now()}`,
          `⚠️ Rate Review Needed: ${orderNumber}`,
          `${orderData.orderTakenByName} entered special rates below standard for ${orderData.companyName}.`,
          newId,
          orderNumber,
          now,
        ]);
      } else {
        await client.query(`
          INSERT INTO notifications (id, title, message, order_id, order_number, type, recipient_roles, created_at)
          VALUES ($1, $2, $3, $4, $5, 'NEW_ORDER', ARRAY['BOSS', 'CONTROLLER', 'MANAGER'], $6)
        `, [
          `notif_${Date.now()}`,
          `New Order: ${orderNumber}`,
          `Booked by ${orderData.orderTakenByName} for ${orderData.companyName} (${orderData.city}). Total: Rs. ${orderData.grandTotal.toLocaleString()}`,
          newId,
          orderNumber,
          now,
        ]);
      }

      // 8. Append-only Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, new_value, timestamp)
        VALUES ($1, $2, $3, 'SALES_PERSON', 'ORDER_CREATED', 'ORDER', $4, $5, $6)
      `, [
        `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderData.orderTakenById,
        orderData.orderTakenByName,
        newId,
        `${orderNumber} for ${orderData.companyName} - Rs. ${orderData.grandTotal}`,
        now,
      ]);

      const initialHistory: OrderStatusHistory = {
        id: histId,
        orderId: newId,
        newStatus: orderData.status,
        changedById: orderData.orderTakenById,
        changedByName: orderData.orderTakenByName,
        timestamp: now,
        note: `Order booked by ${orderData.orderTakenByName}`,
      };

      const initialDelivery: DeliveryProof = {
        id: delId,
        orderId: newId,
        deliveryStatus: 'PENDING',
        scheduledDate: orderData.requiredDeliveryDate,
        createdAt: now,
        updatedAt: now,
      };

      return mapOrder(orderRows.rows[0], insertedItems, [initialHistory], initialDelivery);
    });
  },

  updateOrderStatus: async (
    orderId: string, 
    newStatus: OrderStatus, 
    actor: { id: string; name: string; role: Role }, 
    note?: string,
    deliveryProofData?: Partial<DeliveryProof>
  ): Promise<Order | null> => {
    assertPostgresConfigured();

    return await withTransaction(async (client) => {
      // 1. Fetch current order state
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 FOR UPDATE', [orderId]);
      if (orderRes.rows.length === 0) return null;
      const curOrder = orderRes.rows[0];
      const previousStatus = curOrder.status as OrderStatus;

      // 2. Check if delivery proof is attached
      const delRes = await client.query('SELECT * FROM deliveries WHERE order_id = $1', [curOrder.id]);
      const existingDel = delRes.rows[0];
      const hasProof = Boolean(
        deliveryProofData?.proofPhotoUrl || 
        deliveryProofData?.signedReceiptUrl || 
        existingDel?.proof_photo_url || 
        existingDel?.signed_receipt_url
      );

      // 3. STRICT STATE MACHINE VALIDATION
      const validation = validateOrderStatusTransition(
        previousStatus,
        newStatus,
        actor.role,
        curOrder.order_taken_by_id,
        actor.id,
        hasProof
      );

      if (!validation.valid) {
        throw new Error(validation.error || `Invalid status transition from ${previousStatus} to ${newStatus}`);
      }

      const now = new Date().toISOString();

      // 4. Update order status
      const specialApproved = ['CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(newStatus);

      await client.query(`
        UPDATE orders 
        SET status = $1, special_rate_approved = $2, updated_at = $3 
        WHERE id = $4
      `, [newStatus, specialApproved, now, curOrder.id]);

      // 5. Append to order status history
      await client.query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_id, changed_by_name, timestamp, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        `hist_${Date.now()}`,
        curOrder.id,
        previousStatus,
        newStatus,
        actor.id,
        actor.name,
        now,
        note || `Status updated from ${previousStatus} to ${newStatus} by ${actor.name}`,
      ]);

      // 6. Update Delivery record
      let delStatus: DeliveryStatus = 'PENDING';
      if (newStatus === 'DISPATCHED' || newStatus === 'OUT_FOR_DELIVERY') {
        delStatus = 'IN_TRANSIT';
      } else if (newStatus === 'DELIVERED' || newStatus === 'COMPLETED') {
        delStatus = 'DELIVERED';
      } else if (newStatus === 'RETURNED') {
        delStatus = 'RETURNED';
      }

      await client.query(`
        INSERT INTO deliveries (id, order_id, delivery_status, delivered_at, proof_photo_url, signed_receipt_url, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (order_id) DO UPDATE SET
          delivery_status = EXCLUDED.delivery_status,
          delivered_at = CASE WHEN EXCLUDED.delivery_status = 'DELIVERED' THEN COALESCE(deliveries.delivered_at, EXCLUDED.delivered_at) ELSE deliveries.delivered_at END,
          proof_photo_url = COALESCE(EXCLUDED.proof_photo_url, deliveries.proof_photo_url),
          signed_receipt_url = COALESCE(EXCLUDED.signed_receipt_url, deliveries.signed_receipt_url),
          updated_at = EXCLUDED.updated_at
      `, [
        `del_${Date.now()}`,
        curOrder.id,
        delStatus,
        newStatus === 'DELIVERED' ? now : null,
        deliveryProofData?.proofPhotoUrl || null,
        deliveryProofData?.signedReceiptUrl || null,
        now,
      ]);

      // 7. Insert Notification
      await client.query(`
        INSERT INTO notifications (id, title, message, order_id, order_number, type, recipient_roles, created_at)
        VALUES ($1, $2, $3, $4, $5, 'STATUS_CHANGE', ARRAY['BOSS', 'CONTROLLER', 'MANAGER', 'AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'], $6)
      `, [
        `notif_${Date.now()}`,
        `Status: ${curOrder.order_number} → ${newStatus}`,
        `Order for ${curOrder.company_name} updated to ${newStatus} by ${actor.name}.`,
        curOrder.id,
        curOrder.order_number,
        now,
      ]);

      // 8. Append-only Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, old_value, new_value, timestamp)
        VALUES ($1, $2, $3, $4, 'STATUS_CHANGED', 'ORDER', $5, $6, $7, $8)
      `, [
        `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actor.id,
        actor.name,
        actor.role,
        curOrder.id,
        previousStatus,
        newStatus,
        now,
      ]);

      return await db.getOrderById(curOrder.id);
    });
  },

  updateOrderRates: async (
    orderId: string, 
    updatedItems: { id: string; offeredRate: number; quantity: number }[], 
    actor: { id: string; name: string; role: Role }, 
    reviewNote?: string
  ): Promise<Order | null> => {
    assertPostgresConfigured();

    return await withTransaction(async (client) => {
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 FOR UPDATE', [orderId]);
      if (orderRes.rows.length === 0) return null;
      const order = orderRes.rows[0];

      let subtotal = 0;
      let discountTotal = 0;
      const now = new Date().toISOString();

      const oldItemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      const oldRatesSummary = oldItemsRes.rows.map(i => `${i.product_name}: Rs. ${i.offered_rate}`).join(', ');

      for (const item of oldItemsRes.rows) {
        const match = updatedItems.find(u => u.id === item.id);
        if (match) {
          const newRate = Number(match.offeredRate);
          const newQty = Number(match.quantity);
          const itemTotal = newRate * newQty;
          const stdRate = Number(item.standard_rate);
          const itemDiscount = Math.max(0, (stdRate - newRate) * newQty);

          subtotal += itemTotal;
          discountTotal += itemDiscount;

          await client.query(`
            UPDATE order_items 
            SET quantity = $1, offered_rate = $2, discount = $3, total_amount = $4, is_special_rate = FALSE
            WHERE id = $5
          `, [newQty, newRate, itemDiscount, itemTotal, item.id]);
        } else {
          subtotal += Number(item.total_amount);
          discountTotal += Number(item.discount || 0);
        }
      }

      // Update order to CONFIRMED
      await client.query(`
        UPDATE orders 
        SET subtotal = $1, discount_total = $2, grand_total = $3,
            status = 'CONFIRMED', special_rate_approved = TRUE,
            rate_review_note = $4, updated_at = $5
        WHERE id = $6
      `, [
        subtotal,
        discountTotal,
        subtotal,
        reviewNote || 'Rate reviewed and approved by management.',
        now,
        order.id,
      ]);

      const newItemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      const newRatesSummary = newItemsRes.rows.map(i => `${i.product_name}: Rs. ${i.offered_rate}`).join(', ');

      // Add to status history
      await client.query(`
        INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_id, changed_by_name, timestamp, note)
        VALUES ($1, $2, 'RATE_REVIEW', 'CONFIRMED', $3, $4, $5, $6)
      `, [
        `hist_${Date.now()}`,
        order.id,
        actor.id,
        actor.name,
        now,
        `Rates approved & confirmed by ${actor.name}: ${reviewNote || 'Approved'}`,
      ]);

      // Append Audit Log
      await client.query(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, old_value, new_value, timestamp)
        VALUES ($1, $2, $3, $4, 'RATE_CHANGED', 'ORDER', $5, $6, $7, $8)
      `, [
        `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actor.id,
        actor.name,
        actor.role,
        order.id,
        oldRatesSummary,
        newRatesSummary,
        now,
      ]);

      return await db.getOrderById(order.id);
    });
  },

  updateOrderPaymentStatus: async (
    orderId: string,
    newPaymentStatus: PaymentStatus,
    actor: { id: string; name: string; role: Role },
    paymentRemarks?: string
  ): Promise<Order | null> => {
    assertPostgresConfigured();
    return await withTransaction(async (client) => {
      const now = new Date().toISOString();
      const rows = await client.query(`
        UPDATE orders 
        SET payment_status = $1, payment_remarks = COALESCE($2, payment_remarks), updated_at = $3
        WHERE id = $4 OR order_number = $4
        RETURNING *
      `, [newPaymentStatus, paymentRemarks || null, now, orderId]);

      if (rows.rows.length === 0) return null;
      const updated = rows.rows[0];

      await client.query(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, new_value, timestamp)
        VALUES ($1, $2, $3, $4, 'PAYMENT_STATUS_CHANGED', 'ORDER', $5, $6, $7)
      `, [
        `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actor.id,
        actor.name,
        actor.role,
        updated.id,
        `Payment status updated to ${newPaymentStatus} by ${actor.name}`,
        now,
      ]);

      return await db.getOrderById(updated.id);
    });
  },

  // ──────────────────────────────────────────────
  // DELIVERIES & PROOFS
  // ──────────────────────────────────────────────
  getDeliveries: async (params?: { 
    status?: string; 
    city?: string; 
    date?: string;
    role?: Role;
    userId?: string;
  }): Promise<{ order: Order; delivery: DeliveryProof }[]> => {
    assertPostgresConfigured();

    let q = `
      SELECT o.*,
        d.id as del_id,
        d.assigned_driver,
        d.driver_phone,
        d.vehicle_number,
        d.delivery_status,
        d.scheduled_date as del_sched_date,
        d.delivered_at,
        d.proof_photo_url,
        d.signed_receipt_url,
        d.invoice_number,
        d.delivery_notes,
        d.created_at as del_created_at,
        d.updated_at as del_updated_at
      FROM orders o
      LEFT JOIN deliveries d ON o.id = d.order_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let idx = 1;

    // RBAC check on deliveries: sales users only view deliveries of their own orders
    if (params?.role && !['BOSS', 'CONTROLLER', 'MANAGER'].includes(params.role)) {
      if (params.userId) {
        q += ` AND o.order_taken_by_id = $${idx++}`;
        queryParams.push(params.userId);
      }
    }

    if (params?.status && params.status !== 'ALL') {
      q += ` AND d.delivery_status = $${idx++}`;
      queryParams.push(params.status);
    }

    if (params?.city && params.city !== 'ALL') {
      q += ` AND LOWER(o.city) = LOWER($${idx++})`;
      queryParams.push(params.city);
    }

    if (params?.date) {
      q += ` AND (d.scheduled_date = $${idx} OR o.required_delivery_date = $${idx})`;
      queryParams.push(params.date);
      idx++;
    }

    q += ` ORDER BY o.created_at DESC`;

    const rows = await queryPostgres(q, queryParams);

    return rows.map(r => {
      const order = mapOrder(r, [], []);
      const delivery: DeliveryProof = {
        id: r.del_id || `del_${r.id}`,
        orderId: r.id,
        assignedDriver: r.assigned_driver || undefined,
        driverPhone: r.driver_phone || undefined,
        vehicleNumber: r.vehicle_number || undefined,
        deliveryStatus: (r.delivery_status || (r.status === 'DELIVERED' ? 'DELIVERED' : 'PENDING')) as DeliveryStatus,
        scheduledDate: r.del_sched_date ? new Date(r.del_sched_date).toISOString().split('T')[0] : r.required_delivery_date,
        deliveredAt: r.delivered_at ? new Date(r.delivered_at).toISOString() : undefined,
        proofPhotoUrl: r.proof_photo_url || undefined,
        signedReceiptUrl: r.signed_receipt_url || undefined,
        invoiceNumber: r.invoice_number || undefined,
        notes: r.delivery_notes || undefined,
        createdAt: new Date(r.del_created_at || r.created_at).toISOString(),
        updatedAt: new Date(r.del_updated_at || r.updated_at).toISOString(),
      };
      return { order, delivery };
    });
  },

  updateDeliveryProof: async (
    orderId: string, 
    proofData: Partial<DeliveryProof>, 
    actor: { id: string; name: string; role: Role }
  ): Promise<DeliveryProof | null> => {
    assertPostgresConfigured();

    return await withTransaction(async (client) => {
      const now = new Date().toISOString();

      const q = `
        INSERT INTO deliveries (
          id, order_id, assigned_driver, driver_phone, vehicle_number, delivery_status,
          scheduled_date, delivered_at, proof_photo_url, signed_receipt_url, invoice_number,
          delivery_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (order_id) DO UPDATE SET
          assigned_driver = COALESCE(EXCLUDED.assigned_driver, deliveries.assigned_driver),
          driver_phone = COALESCE(EXCLUDED.driver_phone, deliveries.driver_phone),
          vehicle_number = COALESCE(EXCLUDED.vehicle_number, deliveries.vehicle_number),
          delivery_status = COALESCE(EXCLUDED.delivery_status, deliveries.delivery_status),
          scheduled_date = COALESCE(EXCLUDED.scheduled_date, deliveries.scheduled_date),
          delivered_at = CASE WHEN EXCLUDED.delivery_status = 'DELIVERED' THEN COALESCE(deliveries.delivered_at, EXCLUDED.delivered_at) ELSE deliveries.delivered_at END,
          proof_photo_url = COALESCE(EXCLUDED.proof_photo_url, deliveries.proof_photo_url),
          signed_receipt_url = COALESCE(EXCLUDED.signed_receipt_url, deliveries.signed_receipt_url),
          invoice_number = COALESCE(EXCLUDED.invoice_number, deliveries.invoice_number),
          delivery_notes = COALESCE(EXCLUDED.delivery_notes, deliveries.delivery_notes),
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const rows = await client.query(q, [
        `del_${Date.now()}`,
        orderId,
        proofData.assignedDriver || null,
        proofData.driverPhone || null,
        proofData.vehicleNumber || null,
        proofData.deliveryStatus || 'DELIVERED',
        proofData.scheduledDate || null,
        proofData.deliveryStatus === 'DELIVERED' ? now : null,
        proofData.proofPhotoUrl || null,
        proofData.signedReceiptUrl || null,
        proofData.invoiceNumber || null,
        proofData.notes || null,
        now,
        now,
      ]);

      // If marked DELIVERED and proof attached, update order status to DELIVERED
      if (proofData.deliveryStatus === 'DELIVERED') {
        await client.query(`
          UPDATE orders 
          SET status = 'DELIVERED', updated_at = $1 
          WHERE id = $2
        `, [now, orderId]);

        await client.query(`
          INSERT INTO order_status_history (id, order_id, previous_status, new_status, changed_by_id, changed_by_name, timestamp, note)
          VALUES ($1, $2, 'OUT_FOR_DELIVERY', 'DELIVERED', $3, $4, $5, $6)
        `, [
          `hist_${Date.now()}`,
          orderId,
          actor.id,
          actor.name,
          now,
          `Delivery completed with proof verified by ${actor.name}`,
        ]);
      }

      await client.query(`
        INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, new_value, timestamp)
        VALUES ($1, $2, $3, $4, 'DELIVERY_PROOF_ATTACHED', 'DELIVERY', $5, $6, $7)
      `, [
        `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actor.id,
        actor.name,
        actor.role,
        orderId,
        `Status: ${proofData.deliveryStatus || 'DELIVERED'} - Driver: ${proofData.assignedDriver || 'N/A'}`,
        now,
      ]);

      return mapDelivery(rows.rows[0]);
    });
  },

  // ──────────────────────────────────────────────
  // AUDIT LOGS (APPEND-ONLY)
  // ──────────────────────────────────────────────
  addAuditLog: async (entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
    assertPostgresConfigured();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const q = `
      INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity, entity_id, old_value, new_value, ip_address, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const rows = await queryPostgres(q, [
      id,
      entry.userId,
      entry.userName,
      entry.userRole,
      entry.action,
      entry.entity,
      entry.entityId || null,
      entry.oldValue || null,
      entry.newValue || null,
      entry.ipAddress || null,
      now,
    ]);

    return mapAuditLog(rows[0]);
  },

  createAuditLog: async (entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
    return db.addAuditLog(entry);
  },

  getAuditLogs: async (params?: { entity?: string; userId?: string; limit?: number }): Promise<AuditLog[]> => {
    assertPostgresConfigured();
    let q = `SELECT * FROM audit_logs WHERE 1=1`;
    const queryParams: any[] = [];
    let idx = 1;

    if (params?.entity && params.entity !== 'ALL') {
      q += ` AND entity = $${idx++}`;
      queryParams.push(params.entity);
    }

    if (params?.userId && params.userId !== 'ALL') {
      q += ` AND user_id = $${idx++}`;
      queryParams.push(params.userId);
    }

    const limit = params?.limit || 100;
    q += ` ORDER BY timestamp DESC LIMIT $${idx}`;
    queryParams.push(limit);

    const rows = await queryPostgres(q, queryParams);
    return rows.map(mapAuditLog);
  },

  // ──────────────────────────────────────────────
  // SYSTEM SETTINGS
  // ──────────────────────────────────────────────
  getSettings: async (): Promise<SystemSettings> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM system_settings WHERE id = $1', ['sys_settings']);
    if (rows.length > 0) return mapSettings(rows[0]);

    return {
      id: 'sys_settings',
      companyName: 'SAFE SOLUTIONS — Construction Chemicals & Waterproofing',
      officeWhatsappNumber: '923006646124',
      whatsappGroupInviteUrl: 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK',
      currency: 'PKR',
      rateWarningTolerancePercent: 5.0,
      updatedAt: new Date().toISOString(),
    };
  },

  updateSettings: async (updates: Partial<SystemSettings>): Promise<SystemSettings> => {
    assertPostgresConfigured();
    const now = new Date().toISOString();

    const q = `
      INSERT INTO system_settings (id, company_name, office_whatsapp_number, whatsapp_group_invite_url, currency, rate_warning_tolerance_percent, updated_at)
      VALUES ('sys_settings', $1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        company_name = COALESCE(EXCLUDED.company_name, system_settings.company_name),
        office_whatsapp_number = COALESCE(EXCLUDED.office_whatsapp_number, system_settings.office_whatsapp_number),
        whatsapp_group_invite_url = COALESCE(EXCLUDED.whatsapp_group_invite_url, system_settings.whatsapp_group_invite_url),
        currency = COALESCE(EXCLUDED.currency, system_settings.currency),
        rate_warning_tolerance_percent = COALESCE(EXCLUDED.rate_warning_tolerance_percent, system_settings.rate_warning_tolerance_percent),
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const rows = await queryPostgres(q, [
      updates.companyName || 'SAFE SOLUTIONS',
      updates.officeWhatsappNumber || '923006646124',
      updates.whatsappGroupInviteUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK',
      updates.currency || 'PKR',
      updates.rateWarningTolerancePercent || 5.0,
      now,
    ]);

    return mapSettings(rows[0]);
  },

  // ──────────────────────────────────────────────
  // STATS & METRICS
  // ──────────────────────────────────────────────
  getStats: async (role: Role, userId?: string) => {
    assertPostgresConfigured();
    const isSales = !['BOSS', 'CONTROLLER', 'MANAGER'].includes(role);

    let baseFilter = '1=1';
    const params: any[] = [];
    if (isSales && userId) {
      baseFilter = 'order_taken_by_id = $1';
      params.push(userId);
    }

    const [countRows, todayRows, revenueRows, rateReviewRows, pendingDeliveryRows, deliveredRows] = await Promise.all([
      queryPostgres(`SELECT COUNT(*) as count FROM orders WHERE ${baseFilter}`, params),
      queryPostgres(`SELECT COUNT(*) as count FROM orders WHERE ${baseFilter} AND created_at >= CURRENT_DATE`, params),
      queryPostgres(`SELECT COALESCE(SUM(grand_total), 0) as sum FROM orders WHERE ${baseFilter} AND status NOT IN ('CANCELLED', 'RETURNED')`, params),
      queryPostgres(`SELECT COUNT(*) as count FROM orders WHERE ${baseFilter} AND status = 'RATE_REVIEW'`, params),
      queryPostgres(`SELECT COUNT(*) as count FROM orders WHERE ${baseFilter} AND status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'OUT_FOR_DELIVERY')`, params),
      queryPostgres(`SELECT COUNT(*) as count FROM orders WHERE ${baseFilter} AND status IN ('DELIVERED', 'COMPLETED')`, params),
    ]);

    return {
      totalOrders: parseInt(countRows[0]?.count || '0', 10),
      todayOrders: parseInt(todayRows[0]?.count || '0', 10),
      totalRevenue: Number(revenueRows[0]?.sum || 0),
      pendingRateReviews: parseInt(rateReviewRows[0]?.count || '0', 10),
      pendingDeliveries: parseInt(pendingDeliveryRows[0]?.count || '0', 10),
      deliveredCount: parseInt(deliveredRows[0]?.count || '0', 10),
    };
  },

  // ──────────────────────────────────────────────
  // NOTIFICATIONS
  // ──────────────────────────────────────────────
  getNotifications: async (role?: Role, userId?: string): Promise<Notification[]> => {
    assertPostgresConfigured();
    let q = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (role) {
      q += ` AND ($${idx++}::text = ANY(recipient_roles) OR user_id = $${idx++}::text)`;
      params.push(role, userId || '');
    }

    q += ' ORDER BY created_at DESC LIMIT 50';
    const rows = await queryPostgres(q, params);
    return rows.map(mapNotification);
  },

  markNotificationRead: async (id: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  markAllNotificationsRead: async (role?: Role, userId?: string): Promise<boolean> => {
    assertPostgresConfigured();
    let q = 'UPDATE notifications SET read = TRUE WHERE read = FALSE';
    const params: any[] = [];
    if (role) {
      q += ` AND ($1::text = ANY(recipient_roles) OR user_id = $2::text)`;
      params.push(role, userId || '');
    }
    await queryPostgres(q, params);
    return true;
  },

  createNotification: async (entry: {
    title: string;
    message: string;
    orderId?: string;
    orderNumber?: string;
    type: 'NEW_ORDER' | 'RATE_REVIEW' | 'STATUS_CHANGE' | 'APPROVAL' | 'DELIVERY';
    recipientRoles?: Role[];
    userId?: string;
  }): Promise<Notification> => {
    assertPostgresConfigured();
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const q = `
      INSERT INTO notifications (id, title, message, order_id, order_number, type, read, recipient_roles, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9)
      RETURNING *
    `;
    const rows = await queryPostgres(q, [
      id,
      entry.title,
      entry.message,
      entry.orderId || null,
      entry.orderNumber || null,
      entry.type,
      entry.recipientRoles || null,
      entry.userId || null,
      now,
    ]);
    return mapNotification(rows[0]);
  },

  // ──────────────────────────────────────────────
  // USER PROFILE
  // ──────────────────────────────────────────────
  updateUserProfile: async (
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      avatar?: string;
      designation?: string;
      passwordHash?: string;
      languagePreference?: string;
      themePreference?: string;
      notificationPreferences?: any;
      profileVisibility?: string;
    }
  ): Promise<User | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
    if (updates.avatar !== undefined) { fields.push(`avatar = $${idx++}`); values.push(updates.avatar); }
    if (updates.designation !== undefined) { fields.push(`designation = $${idx++}`); values.push(updates.designation); }
    if (updates.passwordHash !== undefined) { fields.push(`password_hash = $${idx++}`); values.push(updates.passwordHash); }
    if (updates.languagePreference !== undefined) { fields.push(`language_preference = $${idx++}`); values.push(updates.languagePreference); }
    if (updates.themePreference !== undefined) { fields.push(`theme_preference = $${idx++}`); values.push(updates.themePreference); }
    if (updates.notificationPreferences !== undefined) { fields.push(`notification_preferences = $${idx++}`); values.push(JSON.stringify(updates.notificationPreferences)); }
    if (updates.profileVisibility !== undefined) { fields.push(`profile_visibility = $${idx++}`); values.push(updates.profileVisibility); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(userId);
    const q = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    return rows.length > 0 ? mapUser(rows[0]) : null;
  },

  // ──────────────────────────────────────────────
  // VOICE ORDERS
  // ──────────────────────────────────────────────
  getVoiceOrders: async (params?: { role?: Role; userId?: string; status?: VoiceOrderStatus }): Promise<VoiceOrder[]> => {
    assertPostgresConfigured();
    let q = 'SELECT * FROM voice_orders WHERE 1=1';
    const queryParams: any[] = [];
    let idx = 1;

    const isSales = params?.role && !['BOSS', 'CONTROLLER', 'MANAGER'].includes(params.role);
    if (isSales && params?.userId) {
      q += ` AND (user_id = $${idx++} OR assigned_to_id = $${idx++})`;
      queryParams.push(params.userId, params.userId);
    }

    if (params?.status) {
      q += ` AND status = $${idx++}`;
      queryParams.push(params.status);
    }

    q += ' ORDER BY created_at DESC LIMIT 100';
    const rows = await queryPostgres(q, queryParams);
    return rows.map(mapVoiceOrder);
  },

  getVoiceOrderById: async (id: string): Promise<VoiceOrder | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM voice_orders WHERE id = $1', [id]);
    return rows.length > 0 ? mapVoiceOrder(rows[0]) : null;
  },

  createVoiceOrder: async (data: {
    userId: string;
    userName: string;
    audioUrl?: string;
    durationSeconds?: number;
    transcript: string;
    extractedCustomerName?: string;
    extractedCustomerPhone?: string;
    extractedCity?: string;
    extractedDeliveryAddress?: string;
    extractedProducts?: any;
    extractedRates?: string;
    extractedNotes?: string;
    assignedToId?: string;
    assignedToName?: string;
  }): Promise<VoiceOrder> => {
    assertPostgresConfigured();
    const id = `vo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const q = `
      INSERT INTO voice_orders (
        id, user_id, user_name, audio_url, duration_seconds, transcript,
        extracted_customer_name, extracted_customer_phone, extracted_city, extracted_delivery_address,
        extracted_products, extracted_rates, extracted_notes, status,
        assigned_to_id, assigned_to_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING', $14, $15, $16, $17)
      RETURNING *
    `;

    const rows = await queryPostgres(q, [
      id,
      data.userId,
      data.userName,
      data.audioUrl || null,
      data.durationSeconds || 0,
      data.transcript,
      data.extractedCustomerName || null,
      data.extractedCustomerPhone || null,
      data.extractedCity || null,
      data.extractedDeliveryAddress || null,
      data.extractedProducts ? JSON.stringify(data.extractedProducts) : null,
      data.extractedRates || null,
      data.extractedNotes || null,
      data.assignedToId || null,
      data.assignedToName || null,
      now,
      now,
    ]);

    await db.createNotification({
      title: '🎙️ New Voice Order Submitted',
      message: `${data.userName} recorded a voice order for ${data.extractedCustomerName || 'unnamed client'} (${data.extractedCity || 'site'}).`,
      type: 'NEW_ORDER',
      recipientRoles: ['BOSS', 'CONTROLLER', 'MANAGER'],
    });

    return mapVoiceOrder(rows[0]);
  },

  updateVoiceOrder: async (
    id: string,
    updates: Partial<VoiceOrder>
  ): Promise<VoiceOrder | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.transcript !== undefined) { fields.push(`transcript = $${idx++}`); values.push(updates.transcript); }
    if (updates.extractedCustomerName !== undefined) { fields.push(`extracted_customer_name = $${idx++}`); values.push(updates.extractedCustomerName); }
    if (updates.extractedCustomerPhone !== undefined) { fields.push(`extracted_customer_phone = $${idx++}`); values.push(updates.extractedCustomerPhone); }
    if (updates.extractedCity !== undefined) { fields.push(`extracted_city = $${idx++}`); values.push(updates.extractedCity); }
    if (updates.extractedDeliveryAddress !== undefined) { fields.push(`extracted_delivery_address = $${idx++}`); values.push(updates.extractedDeliveryAddress); }
    if (updates.extractedProducts !== undefined) { fields.push(`extracted_products = $${idx++}`); values.push(JSON.stringify(updates.extractedProducts)); }
    if (updates.extractedRates !== undefined) { fields.push(`extracted_rates = $${idx++}`); values.push(updates.extractedRates); }
    if (updates.extractedNotes !== undefined) { fields.push(`extracted_notes = $${idx++}`); values.push(updates.extractedNotes); }
    if (updates.status !== undefined) { fields.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.assignedToId !== undefined) { fields.push(`assigned_to_id = $${idx++}`); values.push(updates.assignedToId); }
    if (updates.assignedToName !== undefined) { fields.push(`assigned_to_name = $${idx++}`); values.push(updates.assignedToName); }
    if (updates.convertedOrderId !== undefined) { fields.push(`converted_order_id = $${idx++}`); values.push(updates.convertedOrderId); }
    if (updates.internalNotes !== undefined) { fields.push(`internal_notes = $${idx++}`); values.push(updates.internalNotes); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE voice_orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    return rows.length > 0 ? mapVoiceOrder(rows[0]) : null;
  },

  deleteVoiceOrder: async (id: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('DELETE FROM voice_orders WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // ──────────────────────────────────────────────
  // MESSAGE TEMPLATES
  // ──────────────────────────────────────────────
  getMessageTemplates: async (params?: { category?: string; language?: string; activeOnly?: boolean }): Promise<MessageTemplate[]> => {
    assertPostgresConfigured();
    let q = 'SELECT * FROM message_templates WHERE 1=1';
    const queryParams: any[] = [];
    let idx = 1;

    if (params?.activeOnly !== false) {
      q += ` AND is_active = TRUE`;
    }
    if (params?.category && params.category !== 'ALL') {
      q += ` AND category = $${idx++}`;
      queryParams.push(params.category);
    }
    if (params?.language && params.language !== 'ALL') {
      q += ` AND language = $${idx++}`;
      queryParams.push(params.language);
    }

    q += ' ORDER BY is_default DESC, category ASC, title ASC';
    const rows = await queryPostgres(q, queryParams);
    return rows.map(mapTemplate);
  },

  getMessageTemplateById: async (id: string): Promise<MessageTemplate | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM message_templates WHERE id = $1', [id]);
    return rows.length > 0 ? mapTemplate(rows[0]) : null;
  },

  createMessageTemplate: async (data: {
    title: string;
    category: MessageTemplateCategory;
    language?: 'en' | 'ur';
    templateText: string;
    isDefault?: boolean;
  }): Promise<MessageTemplate> => {
    assertPostgresConfigured();
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const q = `
      INSERT INTO message_templates (id, title, category, language, template_text, is_default, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING *
    `;
    const rows = await queryPostgres(q, [
      id,
      data.title,
      data.category,
      data.language || 'en',
      data.templateText,
      Boolean(data.isDefault),
      now,
      now,
    ]);
    return mapTemplate(rows[0]);
  },

  updateMessageTemplate: async (
    id: string,
    updates: Partial<MessageTemplate>
  ): Promise<MessageTemplate | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.category !== undefined) { fields.push(`category = $${idx++}`); values.push(updates.category); }
    if (updates.language !== undefined) { fields.push(`language = $${idx++}`); values.push(updates.language); }
    if (updates.templateText !== undefined) { fields.push(`template_text = $${idx++}`); values.push(updates.templateText); }
    if (updates.isDefault !== undefined) { fields.push(`is_default = $${idx++}`); values.push(updates.isDefault); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(updates.isActive); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE message_templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    return rows.length > 0 ? mapTemplate(rows[0]) : null;
  },

  deleteMessageTemplate: async (id: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('DELETE FROM message_templates WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // ──────────────────────────────────────────────
  // PUSH SUBSCRIPTIONS
  // ──────────────────────────────────────────────
  savePushSubscription: async (userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
    assertPostgresConfigured();
    const id = `push_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const q = `
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
      RETURNING *
    `;
    const rows = await queryPostgres(q, [id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]);
    return rows.length > 0 ? mapPushSub(rows[0]) : null;
  },

  getPushSubscriptions: async (userIds?: string[]): Promise<PushSubscriptionRecord[]> => {
    assertPostgresConfigured();
    if (userIds && userIds.length > 0) {
      const rows = await queryPostgres('SELECT * FROM push_subscriptions WHERE user_id = ANY($1)', [userIds]);
      return rows.map(mapPushSub);
    }
    const rows = await queryPostgres('SELECT * FROM push_subscriptions');
    return rows.map(mapPushSub);
  },

  deletePushSubscription: async (endpoint: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('DELETE FROM push_subscriptions WHERE endpoint = $1 RETURNING id', [endpoint]);
    return rows.length > 0;
  },

  // ──────────────────────────────────────────────
  // TECHNICAL DOCUMENTS & LIBRARY
  // ──────────────────────────────────────────────
  getTechnicalDocuments: async (options?: {
    category?: string;
    folderPath?: string;
    search?: string;
    productName?: string;
    visibility?: string;
    isManagement?: boolean;
    includeArchived?: boolean;
  }): Promise<TechnicalDocument[]> => {
    assertPostgresConfigured();
    let q = 'SELECT * FROM technical_documents WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (!options?.includeArchived) {
      q += ' AND is_archived = FALSE';
    }

    if (!options?.isManagement) {
      q += " AND visibility = 'ALL_SALES'";
    }

    if (options?.category && options.category !== 'ALL') {
      q += ` AND category = $${idx++}`;
      params.push(options.category);
    }

    if (options?.folderPath && options.folderPath !== 'ALL') {
      q += ` AND folder_path = $${idx++}`;
      params.push(options.folderPath);
    }

    if (options?.productName) {
      q += ` AND LOWER(product_name) = LOWER($${idx++})`;
      params.push(options.productName);
    }

    if (options?.search && options.search.trim()) {
      const term = `%${options.search.trim().toLowerCase()}%`;
      q += ` AND (LOWER(title) LIKE $${idx} OR LOWER(product_name) LIKE $${idx} OR LOWER(COALESCE(extracted_text, '')) LIKE $${idx} OR $${idx + 1} = ANY(tags))`;
      params.push(term, options.search.trim());
      idx += 2;
    }

    q += ' ORDER BY created_at DESC';
    const rows = await queryPostgres(q, params);
    return rows.map(mapTechnicalDocument);
  },

  getTechnicalDocumentById: async (id: string): Promise<TechnicalDocument | null> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('SELECT * FROM technical_documents WHERE id = $1', [id]);
    return rows.length > 0 ? mapTechnicalDocument(rows[0]) : null;
  },

  createTechnicalDocument: async (data: {
    title: string;
    productName?: string;
    manufacturer?: string;
    documentType?: DocumentType;
    category?: string;
    folderPath?: string;
    version?: string;
    fileName: string;
    filePath: string;
    fileSizeBytes?: number;
    fileType?: string;
    extractedText?: string;
    tags?: string[];
    visibility?: 'ALL_SALES' | 'MANAGEMENT_ONLY';
    uploadedBy: string;
    uploadedByName?: string;
  }): Promise<TechnicalDocument> => {
    assertPostgresConfigured();
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const q = `
      INSERT INTO technical_documents (
        id, title, product_name, manufacturer, document_type, category,
        folder_path, version, file_name, file_path, file_size_bytes,
        file_type, extracted_text, tags, visibility, is_archived,
        uploaded_by, uploaded_by_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE, $16, $17, $18, $19)
      RETURNING *
    `;

    const rows = await queryPostgres(q, [
      id,
      data.title,
      data.productName || null,
      data.manufacturer || 'Radiant Construction Technologies LLP',
      data.documentType || 'TDS',
      data.category || 'General',
      data.folderPath || '/',
      data.version || '1.0',
      data.fileName,
      data.filePath,
      data.fileSizeBytes || 0,
      data.fileType || 'application/pdf',
      data.extractedText || null,
      data.tags || [],
      data.visibility || 'ALL_SALES',
      data.uploadedBy,
      data.uploadedByName || null,
      now,
      now,
    ]);

    return mapTechnicalDocument(rows[0]);
  },

  updateTechnicalDocument: async (
    id: string,
    updates: Partial<TechnicalDocument>
  ): Promise<TechnicalDocument | null> => {
    assertPostgresConfigured();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title !== undefined) { fields.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.productName !== undefined) { fields.push(`product_name = $${idx++}`); values.push(updates.productName); }
    if (updates.manufacturer !== undefined) { fields.push(`manufacturer = $${idx++}`); values.push(updates.manufacturer); }
    if (updates.documentType !== undefined) { fields.push(`document_type = $${idx++}`); values.push(updates.documentType); }
    if (updates.category !== undefined) { fields.push(`category = $${idx++}`); values.push(updates.category); }
    if (updates.folderPath !== undefined) { fields.push(`folder_path = $${idx++}`); values.push(updates.folderPath); }
    if (updates.version !== undefined) { fields.push(`version = $${idx++}`); values.push(updates.version); }
    if (updates.extractedText !== undefined) { fields.push(`extracted_text = $${idx++}`); values.push(updates.extractedText); }
    if (updates.tags !== undefined) { fields.push(`tags = $${idx++}`); values.push(updates.tags); }
    if (updates.visibility !== undefined) { fields.push(`visibility = $${idx++}`); values.push(updates.visibility); }
    if (updates.isArchived !== undefined) { fields.push(`is_archived = $${idx++}`); values.push(updates.isArchived); }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());

    values.push(id);
    const q = `UPDATE technical_documents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await queryPostgres(q, values);
    return rows.length > 0 ? mapTechnicalDocument(rows[0]) : null;
  },

  deleteTechnicalDocument: async (id: string): Promise<boolean> => {
    assertPostgresConfigured();
    const rows = await queryPostgres('DELETE FROM technical_documents WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },

  // ──────────────────────────────────────────────
  // COPILOT CONVERSATIONS & MESSAGES
  // ──────────────────────────────────────────────
  getCopilotMessages: async (conversationId: string): Promise<CopilotMessage[]> => {
    assertPostgresConfigured();
    const rows = await queryPostgres(
      'SELECT * FROM copilot_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    return rows.map(mapCopilotMessage);
  },

  saveCopilotMessage: async (data: {
    conversationId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
  }): Promise<CopilotMessage> => {
    assertPostgresConfigured();
    const id = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const q = `
      INSERT INTO copilot_messages (id, conversation_id, user_id, role, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const rows = await queryPostgres(q, [
      id,
      data.conversationId,
      data.userId,
      data.role,
      data.content,
      data.metadata ? JSON.stringify(data.metadata) : '{}'
    ]);
    return mapCopilotMessage(rows[0]);
  },

  createCopilotConversation: async (userId: string, title = 'New Chat'): Promise<CopilotConversation> => {
    assertPostgresConfigured();
    const id = `cconv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const q = `
      INSERT INTO copilot_conversations (id, user_id, title, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const rows = await queryPostgres(q, [id, userId, title]);
    return mapCopilotConversation(rows[0]);
  },

  getUserCopilotConversations: async (userId: string): Promise<CopilotConversation[]> => {
    assertPostgresConfigured();
    const rows = await queryPostgres(
      'SELECT * FROM copilot_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20',
      [userId]
    );
    return rows.map(mapCopilotConversation);
  },
};

