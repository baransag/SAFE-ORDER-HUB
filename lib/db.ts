import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Product, 
  Order, 
  Customer, 
  Notification, 
  SystemSettings, 
  Role, 
  OrderStatus, 
  PaymentStatus, 
  Urgency 
} from './types';

interface DatabaseSchema {
  users: User[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  notifications: Notification[];
  settings: SystemSettings;
  orderCounter: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory and file exist
function ensureDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data) as DatabaseSchema;
    } catch (e) {
      console.error('Error reading database file, resetting to initial seed:', e);
    }
  }

  const initialDb = getInitialSeedData();
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function getInitialSeedData(): DatabaseSchema {
  const defaultPasswordHash = bcrypt.hashSync('SafeSolutions@2026', 10);
  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'usr_boss',
      name: 'Asif',
      email: 'boss@safesolutions.com',
      passwordHash: defaultPasswordHash,
      phone: '0300-0000000',
      designation: 'Managing Director / Boss',
      role: 'BOSS',
      avatar: '/assest/images/asif.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_controller',
      name: 'M. Husnain Farooq',
      email: 'baransag68@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03468760963',
      designation: 'Controller (Operations & Finance)',
      role: 'CONTROLLER',
      avatar: '/assest/images/husnain.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_manager',
      name: 'Samaira Mubashar',
      email: 'sm.bajwa786fsd@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03006646124',
      designation: 'Manager Account & Finance',
      role: 'MANAGER',
      avatar: '/assest/images/samira.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_shahzaib',
      name: 'Engr. Shahzaib Ahmad',
      email: 'Zaiberana37@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03007684761',
      designation: 'Marketing Executive',
      role: 'MARKETING_EXECUTIVE',
      vehicle: 'BBE-5688',
      avatar: '/assest/images/shahzaib-ahmad.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_shahbaz',
      name: 'Shahbaz Ahmed',
      email: 'shabazbutt1132@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03237684200',
      designation: 'Application Supervisor & Sales Person',
      role: 'SALES_PERSON',
      vehicle: 'AGN-1227-21',
      avatar: '/assest/images/shahbaz-ahmad.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_adnan',
      name: 'Adnan Ali',
      email: 'mianadnanali88@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03217684400',
      designation: 'Area Sales Manager',
      role: 'AREA_SALES_MANAGER',
      vehicle: 'AHV 378',
      avatar: '/assest/images/adnan-ali.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_haseeb',
      name: 'Engr. Haseeb Ali',
      email: 'haseebalicivil11@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03058477264',
      designation: 'Area Sales Person',
      role: 'SALES_PERSON',
      avatar: '/assest/images/haseeb-ali.jpeg',
      active: true,
      createdAt: now,
    },
    {
      id: 'usr_tajammul',
      name: 'Tajammul Mushtaq',
      email: 'tajammulbajwa545@gmail.com',
      passwordHash: defaultPasswordHash,
      phone: '03217684500',
      designation: 'Area Sales Manager',
      role: 'AREA_SALES_MANAGER',
      vehicle: 'FD-17-84',
      avatar: '/assest/images/tajammul.jpeg',
      active: true,
      createdAt: now,
    },
  ];

  const products: Product[] = [];

  const customers: Customer[] = [];
  const orders: Order[] = [];
  const notifications: Notification[] = [];

  const settings: SystemSettings = {
    id: 'sys_settings',
    companyName: 'SAFE SOLUTIONS — Construction Chemicals & Waterproofing',
    officeWhatsappNumber: '923006646124',
    whatsappGroupInviteUrl: '',
    currency: 'PKR',
    rateWarningTolerancePercent: 5,
    updatedAt: now,
  };

  return {
    users,
    products,
    customers,
    orders,
    notifications,
    settings,
    orderCounter: 0,
  };
}

// Public Database helper methods
export const db = {
  // USERS
  getUsers: (): User[] => {
    return ensureDatabase().users;
  },

  getUserByEmail: (email: string): User | undefined => {
    const users = ensureDatabase().users;
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  getUserById: (id: string): User | undefined => {
    return ensureDatabase().users.find(u => u.id === id);
  },

  createUser: (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const data = ensureDatabase();
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    data.users.push(newUser);
    saveDatabase(data);
    return newUser;
  },

  updateUser: (id: string, updates: Partial<User>): User | null => {
    const data = ensureDatabase();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    data.users[idx] = { ...data.users[idx], ...updates };
    saveDatabase(data);
    return data.users[idx];
  },

  // PRODUCTS
  getProducts: (): Product[] => {
    return ensureDatabase().products;
  },

  getProductById: (id: string): Product | undefined => {
    return ensureDatabase().products.find(p => p.id === id);
  },

  createProduct: (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const data = ensureDatabase();
    const newProduct: Product = {
      ...productData,
      id: `prd_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    data.products.push(newProduct);
    saveDatabase(data);
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>): Product | null => {
    const data = ensureDatabase();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data.products[idx] = { ...data.products[idx], ...updates };
    saveDatabase(data);
    return data.products[idx];
  },

  deleteProduct: (id: string): boolean => {
    const data = ensureDatabase();
    const idx = data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    data.products.splice(idx, 1);
    saveDatabase(data);
    return true;
  },

  // CUSTOMERS
  getCustomers: (): Customer[] => {
    return ensureDatabase().customers;
  },

  findOrCreateCustomer: (cust: Omit<Customer, 'id'>): Customer => {
    const data = ensureDatabase();
    const existing = data.customers.find(
      c => c.phone === cust.phone || (c.companyName.toLowerCase() === cust.companyName.toLowerCase() && c.city.toLowerCase() === cust.city.toLowerCase())
    );
    if (existing) {
      return existing;
    }
    const newCust: Customer = {
      ...cust,
      id: `cust_${Date.now()}`,
    };
    data.customers.push(newCust);
    saveDatabase(data);
    return newCust;
  },

  // ORDERS
  getOrders: (params?: { role?: Role; userId?: string; search?: string; status?: OrderStatus; dateRange?: string }): Order[] => {
    const data = ensureDatabase();
    let orders = [...data.orders];

    // Filter by role access:
    // BOSS, CONTROLLER, MANAGER see ALL orders
    // AREA_SALES_MANAGER, MARKETING_EXECUTIVE, SALES_PERSON see only their own orders
    if (params?.role && !['BOSS', 'CONTROLLER', 'MANAGER'].includes(params.role)) {
      if (params.userId) {
        orders = orders.filter(o => o.orderTakenById === params.userId);
      }
    }

    if (params?.status) {
      orders = orders.filter(o => o.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      orders = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.orderTakenByName.toLowerCase().includes(q) ||
        o.items.some(i => i.productName.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getOrderById: (id: string): Order | undefined => {
    return ensureDatabase().orders.find(o => o.id === id || o.orderNumber === id);
  },

  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'history'>): Order => {
    const data = ensureDatabase();
    data.orderCounter += 1;
    const year = new Date().getFullYear();
    const orderNumber = `SS-ORD-${year}-${String(data.orderCounter).padStart(5, '0')}`;
    const now = new Date().toISOString();
    const newId = `ord_${Date.now()}`;

    const newOrder: Order = {
      ...orderData,
      id: newId,
      orderNumber,
      createdAt: now,
      updatedAt: now,
      history: [
        {
          id: `hist_${Date.now()}`,
          orderId: newId,
          newStatus: orderData.status,
          changedById: orderData.orderTakenById,
          changedByName: orderData.orderTakenByName,
          timestamp: now,
          note: `Order booked by ${orderData.orderTakenByName}`,
        }
      ],
    };

    data.orders.push(newOrder);

    // Create In-App Notification
    const hasSpecialRate = newOrder.items.some(i => i.isSpecialRate);
    data.notifications.unshift({
      id: `notif_${Date.now()}`,
      title: hasSpecialRate ? '⚠️ Special Rate Order Submitted' : '🔔 New Order Booked',
      message: `${newOrder.orderTakenByName} booked ${newOrder.orderNumber} for ${newOrder.companyName} (${newOrder.city}) — Rs. ${newOrder.grandTotal.toLocaleString()}${hasSpecialRate ? ' [Requires Rate Review]' : ''}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      type: hasSpecialRate ? 'RATE_REVIEW' : 'NEW_ORDER',
      read: false,
      createdAt: now,
      recipientRoles: ['BOSS', 'CONTROLLER', 'MANAGER'],
    });

    saveDatabase(data);
    return newOrder;
  },

  updateOrderStatus: (
    orderId: string, 
    newStatus: OrderStatus, 
    actor: { id: string; name: string; role: Role }, 
    note?: string
  ): Order | null => {
    const data = ensureDatabase();
    const order = data.orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;

    const previousStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    if (newStatus === 'CONFIRMED' || newStatus === 'PREPARING' || newStatus === 'DISPATCHED' || newStatus === 'DELIVERED') {
      order.specialRateApproved = true;
    }

    order.history.push({
      id: `hist_${Date.now()}`,
      orderId: order.id,
      previousStatus,
      newStatus,
      changedById: actor.id,
      changedByName: actor.name,
      timestamp: new Date().toISOString(),
      note: note || `Status updated from ${previousStatus} to ${newStatus} by ${actor.name}`,
    });

    // Notify sales employee about status change
    data.notifications.unshift({
      id: `notif_${Date.now()}`,
      title: `Status Update: ${order.orderNumber}`,
      message: `Your order for ${order.companyName} is now ${newStatus}. Updated by ${actor.name}.`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'STATUS_CHANGE',
      read: false,
      createdAt: new Date().toISOString(),
      recipientRoles: ['BOSS', 'CONTROLLER', 'MANAGER', 'AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'],
    });

    saveDatabase(data);
    return order;
  },

  updateOrderRates: (
    orderId: string, 
    updatedItems: { id: string; offeredRate: number; quantity: number }[], 
    actor: { id: string; name: string; role: Role }, 
    reviewNote?: string
  ): Order | null => {
    const data = ensureDatabase();
    const order = data.orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return null;

    let subtotal = 0;
    let discountTotal = 0;

    order.items = order.items.map(item => {
      const match = updatedItems.find(u => u.id === item.id);
      if (match) {
        const product = data.products.find(p => p.id === item.productId);
        const stdRate = product ? product.standardRate : item.standardRate;
        const newRate = match.offeredRate;
        const newQty = match.quantity;
        const itemTotal = newRate * newQty;
        const itemDiscount = Math.max(0, (stdRate - newRate) * newQty);
        const isSpecialRate = product ? newRate < product.minAllowedRate : false;

        subtotal += itemTotal;
        discountTotal += itemDiscount;

        return {
          ...item,
          quantity: newQty,
          offeredRate: newRate,
          standardRate: stdRate,
          totalAmount: itemTotal,
          discount: itemDiscount,
          isSpecialRate,
        };
      }
      subtotal += item.totalAmount;
      discountTotal += item.discount;
      return item;
    });

    order.subtotal = subtotal;
    order.discountTotal = discountTotal;
    order.grandTotal = subtotal;
    order.rateReviewNote = reviewNote || 'Rate reviewed and updated by management.';
    order.specialRateApproved = true;
    order.status = 'CONFIRMED';
    order.updatedAt = new Date().toISOString();

    order.history.push({
      id: `hist_${Date.now()}`,
      orderId: order.id,
      previousStatus: 'RATE_REVIEW',
      newStatus: 'CONFIRMED',
      changedById: actor.id,
      changedByName: actor.name,
      timestamp: new Date().toISOString(),
      note: `Rates modified & approved by ${actor.name}: ${reviewNote || 'Approved'}`,
    });

    saveDatabase(data);
    return order;
  },

  addOrderAuditNote: (
    orderId: string,
    note: string,
    actor: { id: string; name: string }
  ): boolean => {
    const data = ensureDatabase();
    const order = data.orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!order) return false;

    order.history.push({
      id: `hist_${Date.now()}`,
      orderId: order.id,
      newStatus: order.status,
      previousStatus: order.status,
      changedById: actor.id,
      changedByName: actor.name,
      timestamp: new Date().toISOString(),
      note,
    });
    order.updatedAt = new Date().toISOString();
    saveDatabase(data);
    return true;
  },

  // NOTIFICATIONS
  getNotifications: (role?: Role): Notification[] => {
    const data = ensureDatabase();
    if (!role) return data.notifications;
    return data.notifications.filter(n => !n.recipientRoles || n.recipientRoles.includes(role));
  },

  markNotificationRead: (id: string): boolean => {
    const data = ensureDatabase();
    const notif = data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      saveDatabase(data);
      return true;
    }
    return false;
  },

  markAllNotificationsRead: (role?: Role): boolean => {
    const data = ensureDatabase();
    data.notifications.forEach(n => {
      if (!role || !n.recipientRoles || n.recipientRoles.includes(role)) {
        n.read = true;
      }
    });
    saveDatabase(data);
    return true;
  },

  // SETTINGS
  getSettings: (): SystemSettings => {
    return ensureDatabase().settings;
  },

  updateSettings: (updates: Partial<SystemSettings>): SystemSettings => {
    const data = ensureDatabase();
    data.settings = {
      ...data.settings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDatabase(data);
    return data.settings;
  },

  // STATS
  getStats: (role: Role, userId: string) => {
    const data = ensureDatabase();
    let orders = [...data.orders];
    const isFullAccess = ['BOSS', 'CONTROLLER', 'MANAGER'].includes(role);

    if (!isFullAccess) {
      orders = orders.filter(o => o.orderTakenById === userId);
    }

    const totalOrders = orders.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr));
    const todaySales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);

    const pendingReviewOrders = orders.filter(o => o.status === 'RATE_REVIEW' || o.status === 'NEW').length;
    const processingOrders = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'DISPATCHED').length;
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

    // Product breakdown
    const productStats: Record<string, { name: string; quantity: number; amount: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productStats[item.productName]) {
          productStats[item.productName] = { name: item.productName, quantity: 0, amount: 0 };
        }
        productStats[item.productName].quantity += item.quantity;
        productStats[item.productName].amount += item.totalAmount;
      });
    });

    const productRanking = Object.values(productStats).sort((a, b) => b.amount - a.amount);

    // Team stats (for Boss, Controller, Manager)
    const salesTeam = data.users.filter(u => ['MARKETING_EXECUTIVE', 'SALES_PERSON', 'AREA_SALES_MANAGER'].includes(u.role));
    const employeePerformance = salesTeam.map(emp => {
      const empOrders = data.orders.filter(o => o.orderTakenById === emp.id);
      const empTotalSales = empOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const empPending = empOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        role: emp.role,
        vehicle: emp.vehicle,
        ordersCount: empOrders.length,
        totalSales: empTotalSales,
        pendingCount: empPending,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    return {
      totalOrders,
      todayOrdersCount: todayOrders.length,
      todaySales,
      totalSales,
      pendingReviewOrders,
      processingOrders,
      deliveredOrders,
      productRanking,
      employeePerformance,
    };
  }
};
