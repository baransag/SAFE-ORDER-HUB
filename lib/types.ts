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
  languagePreference?: string;
  themePreference?: string;
  notificationPreferences?: { orders: boolean; deliveries: boolean; approvals: boolean };
  profileVisibility?: string;
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
  type: 'NEW_ORDER' | 'RATE_REVIEW' | 'STATUS_CHANGE' | 'APPROVAL' | 'DELIVERY' | 'REMINDER' | 'ORDER_UPDATE' | 'TASK' | 'SYSTEM';
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

export type VoiceOrderStatus = 'PENDING' | 'REVIEWED' | 'CONVERTED' | 'REJECTED';

export interface VoiceOrder {
  id: string;
  userId: string;
  userName: string;
  audioUrl?: string;
  durationSeconds: number;
  transcript: string;
  extractedCustomerName?: string;
  extractedCustomerPhone?: string;
  extractedCity?: string;
  extractedDeliveryAddress?: string;
  extractedProducts?: any;
  extractedRates?: string;
  extractedNotes?: string;
  status: VoiceOrderStatus;
  assignedToId?: string;
  assignedToName?: string;
  convertedOrderId?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageTemplateCategory = 
  | 'ORDER_RECEIVED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_DISPATCHED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'REPEAT_CUSTOMER'
  | 'NEW_CUSTOMER'
  | 'FEEDBACK_REVIEW'
  | 'AFTER_SALES'
  | 'GENERAL';

export interface MessageTemplate {
  id: string;
  title: string;
  category: MessageTemplateCategory;
  language: 'en' | 'ur';
  templateText: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export type DocumentType = 'TDS' | 'MSDS' | 'CERTIFICATE' | 'CATALOG' | 'APPLICATION_GUIDE';

export interface TechnicalDocument {
  id: string;
  title: string;
  productName?: string;
  manufacturer?: string;
  documentType: DocumentType;
  category: string;
  folderPath: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  fileType: string;
  extractedText?: string;
  tags: string[];
  visibility: 'ALL_SALES' | 'MANAGEMENT_ONLY';
  isArchived: boolean;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CopilotMessage {
  id: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt: string;
}

export interface CopilotConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// SENIOR-LEVEL FEATURES TYPES
// ──────────────────────────────────────────────

export type ReminderPurpose = 
  | 'PAYMENT_COLLECTION' 
  | 'PAYMENT_DUE' 
  | 'ORDER_FEEDBACK' 
  | 'REPEAT_ORDER' 
  | 'DISPATCH_FOLLOWUP' 
  | 'DELIVERY_CHECK' 
  | 'REORDER_INQUIRY' 
  | 'TECHNICAL_SUPPORT' 
  | 'GENERAL_FOLLOWUP' 
  | 'GENERAL';

export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface CustomerReminder {
  id: string;
  customerId?: string;
  customerName?: string;
  orderId?: string;
  assignedToId: string;
  assignedToName: string;
  createdById: string;
  createdByName: string;
  dueDate: string;
  purpose: ReminderPurpose;
  notes?: string;
  status: ReminderStatus;
  outcomeNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CorrectionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OrderCorrectionRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  requestedById: string;
  requestedByName: string;
  reason: string;
  originalValues: any;
  requestedValues: any;
  status: CorrectionRequestStatus;
  decisionNote?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface OperationalTask {
  id: string;
  title: string;
  description?: string;
  assignedToId: string;
  assignedToName: string;
  createdById: string;
  createdByName: string;
  relatedOrderId?: string;
  relatedCustomerId?: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDocumentLink {
  id: string;
  productName: string;
  productId?: string;
  documentId: string;
  documentTitle: string;
  linkedById: string;
  linkedByName: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE' | 'PAY_ORDER';
export type PaymentType = 'ADVANCE' | 'PARTIAL' | 'FULL' | 'REFUND' | 'CREDIT' | 'CREDIT_SETTLEMENT';

export interface PaymentLedgerEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  paymentType: PaymentType;
  notes?: string;
  recordedById: string;
  recordedByName: string;
  createdAt: string;
}

export type InboxItemType = 'ORDER' | 'TASK' | 'REMINDER' | 'CUSTOMER_REMINDER' | 'CORRECTION' | 'ORDER_CORRECTION' | 'VOICE_ORDER' | 'NOTIFICATION';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  title: string;
  description: string;
  entityId?: string;
  relatedUrl?: string;
  url?: string;
  priority?: string;
  assignedToId?: string;
  assignedToName?: string;
  isRead: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'RESOLVED' | 'ASSIGNED' | 'CANCELLED';
  createdAt: string;
  dueDate?: string;
  meta?: any;
}

export interface BackupLog {
  id: string;
  backupType: 'SCHEDULED' | 'MANUAL' | 'EXPORT' | 'MANUAL_EXPORT' | 'RESTORE_TEST';
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  fileName?: string;
  fileSizeBytes?: number;
  sizeBytes?: number;
  storageLocation?: string;
  errorMessage?: string;
  details?: string;
  triggeredById?: string;
  triggeredByName?: string;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  type: 'ORDER' | 'CUSTOMER' | 'PRODUCT' | 'DOCUMENT' | 'TASK';
  title: string;
  subtitle: string;
  url: string;
  metadata?: any;
}

