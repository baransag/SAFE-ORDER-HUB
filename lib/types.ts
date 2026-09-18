export type Role = 
  | 'BOSS'
  | 'CONTROLLER'
  | 'MANAGER'
  | 'AREA_SALES_MANAGER'
  | 'MARKETING_EXECUTIVE'
  | 'SALES_PERSON';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  designation: string;
  role: Role;
  vehicle?: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  defaultPacking: string;
  unit: string;
  standardRate: number;
  minAllowedRate: number;
  description?: string;
  inStock: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  whatsapp?: string;
  city: string;
  deliveryAddress: string;
  mapsUrl?: string;
  customerType: 'NEW' | 'EXISTING';
}

export type OrderStatus = 
  | 'NEW'
  | 'RATE_REVIEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type PaymentStatus = 
  | 'ADVANCE'
  | 'CASH'
  | 'CREDIT'
  | 'PENDING';

export type Urgency = 
  | 'NORMAL'
  | 'URGENT'
  | 'CRITICAL';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  packing: string;
  unit: string;
  quantity: number;
  standardRate: number;
  offeredRate: number;
  discount: number;
  totalAmount: number;
  isSpecialRate: boolean;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus?: OrderStatus;
  newStatus: OrderStatus;
  changedById: string;
  changedByName: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. SS-ORD-2026-00001
  customerId: string;
  customerName: string;
  companyName: string;
  customerPhone: string;
  customerWhatsapp?: string;
  city: string;
  deliveryAddress: string;
  mapsUrl?: string;
  customerType: 'NEW' | 'EXISTING';

  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;

  paymentStatus: PaymentStatus;
  paymentRemarks?: string;
  requiredDeliveryDate: string;
  urgency: Urgency;

  status: OrderStatus;
  specialRateApproved: boolean;
  rateReviewNote?: string;

  orderTakenById: string;
  orderTakenByName: string;
  orderTakenByEmail: string;
  orderTakenByPhone: string;

  remarks?: string;
  createdAt: string;
  updatedAt: string;

  history: OrderStatusHistory[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  type: 'NEW_ORDER' | 'RATE_REVIEW' | 'STATUS_CHANGE' | 'APPROVAL';
  read: boolean;
  createdAt: string;
  recipientRoles?: Role[];
}

export interface SystemSettings {
  id: string;
  companyName: string;
  officeWhatsappNumber: string;
  whatsappGroupInviteUrl?: string;
  currency: string;
  rateWarningTolerancePercent: number;
  updatedAt: string;
}
