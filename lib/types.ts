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
  updatedAt?: string;
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
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
  // Computed helpers
  totalOrders?: number;
  totalSpend?: number;
  lastOrderDate?: string;
}

export type OrderStatus = 
  | 'NEW'
  | 'RATE_REVIEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED'
  | 'RETURNED'
  | 'PARTIALLY_DELIVERED';

export type PaymentStatus = 
  | 'PENDING'
  | 'ADVANCE'
  | 'PARTIAL'
  | 'PAID'
  | 'CREDIT'
  | 'REFUNDED';

export type DeliveryStatus = 
  | 'PENDING'
  | 'ASSIGNED'
  | 'READY'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED';

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

export interface DeliveryProof {
  id: string;
  orderId: string;
  assignedDriver?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  deliveryStatus: DeliveryStatus;
  scheduledDate?: string;
  deliveredAt?: string;
  proofPhotoUrl?: string;
  signedReceiptUrl?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  internalNotes?: string;
  idempotencyKey?: string;

  createdAt: string;
  updatedAt: string;

  history: OrderStatusHistory[];
  delivery?: DeliveryProof;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  orderId?: string;
  orderNumber?: string;
  type: 'NEW_ORDER' | 'RATE_REVIEW' | 'STATUS_CHANGE' | 'APPROVAL' | 'DELIVERY';
  read: boolean;
  createdAt: string;
  recipientRoles?: Role[];
  userId?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: string;
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

export interface AICallbackAction {
  actionType: 'CREATE_ORDER' | 'UPDATE_STATUS' | 'APPROVE_RATE' | 'CANCEL_ORDER';
  targetOrderNumber?: string;
  targetOrderId?: string;
  targetStatus?: OrderStatus;
  orderPayload?: any;
  summary: string;
}
