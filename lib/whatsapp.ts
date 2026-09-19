import { Order } from './types';

export function formatWhatsAppOrderMessage(order: Order, companyName = 'SAFE SOLUTIONS'): string {
  const itemsText = order.items.map(item => {
    return `*Product:* ${item.productName} (${item.packing})\n*Quantity:* ${item.quantity} ${item.unit}\n*Rate:* Rs. ${item.offeredRate.toLocaleString()} / ${item.unit}\n*Amount:* Rs. ${item.totalAmount.toLocaleString()}${item.isSpecialRate ? ' ⚠️ (Special Rate)' : ''}`;
  }).join('\n\n');

  const lines = [
    `🔔 *NEW ORDER — ${companyName.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Order ID:* ${order.orderNumber}`,
    `*Status:* ${order.status}`,
    `*Urgency:* ${order.urgency}`,
    ``,
    `📦 *ORDER DETAILS:*`,
    itemsText,
    ``,
    `*Grand Total:* Rs. ${order.grandTotal.toLocaleString()}`,
    `*Payment Status:* ${order.paymentStatus}${order.paymentRemarks ? ` (${order.paymentRemarks})` : ''}`,
    ``,
    `👤 *CUSTOMER DETAILS:*`,
    `*Customer / Site:* ${order.companyName}`,
    `*Contact Person:* ${order.customerName}`,
    `*Phone:* ${order.customerPhone}`,
    order.customerWhatsapp ? `*WhatsApp:* ${order.customerWhatsapp}` : null,
    `*Delivery City:* ${order.city}`,
    `*Delivery Address:* ${order.deliveryAddress}`,
    order.mapsUrl ? `📍 *Location Pin:* ${order.mapsUrl}` : null,
    ``,
    `📅 *SCHEDULE:*`,
    `*Required Date:* ${order.requiredDeliveryDate}`,
    ``,
    `👨‍💼 *SALES DETAILS:*`,
    `*Order Taken By:* ${order.orderTakenByName} (${order.orderTakenByPhone})`,
    order.remarks ? `*Remarks / Instructions:* ${order.remarks}` : null,
    `━━━━━━━━━━━━━━━━━━`,
    `_Generated automatically via SAFE ORDER HUB_`
  ].filter(Boolean);

  return lines.join('\n');
}

export function generateWhatsAppLink(order: Order, targetPhone?: string, companyName?: string): string {
  const message = formatWhatsAppOrderMessage(order, companyName);
  const encoded = encodeURIComponent(message);
  
  if (targetPhone && targetPhone.trim().length > 0) {
    let cleaned = targetPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    }
    return `https://wa.me/${cleaned}?text=${encoded}`;
  }

  return `https://api.whatsapp.com/send?text=${encoded}`;
}

export function getWhatsAppGroupPayload(order: Order, groupInviteUrl?: string, companyName?: string) {
  const message = formatWhatsAppOrderMessage(order, companyName);
  const encoded = encodeURIComponent(message);
  const shareUrl = `https://api.whatsapp.com/send?text=${encoded}`;
  const groupUrl = groupInviteUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK';

  return {
    message,
    encoded,
    shareUrl,
    groupUrl,
  };
}

export type ThankYouStyle = 'EXECUTIVE' | 'VIP_URDU' | 'DISPATCH_ALERT' | 'SHORT';

export interface ThankYouOptions {
  order: Order;
  style?: ThankYouStyle;
  controllerName?: string;
  controllerDesignation?: string;
  controllerPhone?: string;
  clientName?: string;
  companyName?: string;
}

export function generateThankYouMessage(options: ThankYouOptions): string {
  const {
    order,
    style = 'EXECUTIVE',
    controllerName = 'M. Husnain Farooq',
    controllerDesignation = 'Operations Desk',
    controllerPhone = '03468760963',
    clientName = order.customerName,
    companyName = 'SAFE SOLUTIONS — Construction Chemicals & Waterproofing',
  } = options;

  const orderNum = order.orderNumber;
  const site = order.companyName || 'Valued Client';
  const city = order.city || 'Pakistan';
  const total = `Rs. ${order.grandTotal.toLocaleString()}`;
  const itemsSummary = order.items.map(i => `• ${i.productName} (${i.quantity} ${i.unit})`).join('\n');

  if (style === 'VIP_URDU') {
    return `*${companyName}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `محترم جناب *${clientName}* صاحب،\n\n` +
      `السلام علیکم!\n` +
      `*SAFE SOLUTIONS* پر آپ کے اعتماد اور شراکت داری کا دلی شکریہ۔ آپ کے پراجیکٹ کے لیے اعلیٰ معیار کی کنسٹرکشن کیمیکلز فراہم کرنا ہمارا اعزاز ہے۔\n\n` +
      `📋 *آرڈر نمبر:* ${orderNum}\n` +
      `🏢 *سائٹ / ادارہ:* ${site}\n` +
      `📍 *شہر:* ${city}\n` +
      `💰 *کل رقم:* ${total}\n` +
      `📦 *سٹیٹس:* ${order.status === 'DELIVERED' ? 'کامیابی سے ڈیلیور شدہ' : 'پراسیس میں ہے'}\n\n` +
      `📦 *آرڈر کی تفصیل:*\n${itemsSummary}\n\n` +
      `ڈیلیوری کا شیڈول، ڈرائیور کوآرڈینیشن یا کسی بھی ٹیکنیکل رہنمائی کے لیے ہمارے ہیڈ آفس ڈیسک سے بلا جھجھک رابطہ فرمائیں:\n` +
      `👤 *${controllerName}* (${controllerDesignation})\n` +
      `📞 *رابطہ نمبر:* ${controllerPhone}\n\n` +
      `_Safe Building, Strong Future!_ 🌟`;
  }

  if (style === 'DISPATCH_ALERT') {
    return `🚀 *DISPATCH & TRACKING ADVISORY — ${companyName.toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Assalam-o-Alaikum *${clientName}*,\n\n` +
      `We are pleased to inform you that your order is confirmed and scheduled for site dispatch!\n\n` +
      `📋 *Order Ref:* ${orderNum}\n` +
      `🏢 *Site Delivery:* ${site} (${city})\n` +
      `📅 *Required Date:* ${order.requiredDeliveryDate}\n` +
      `💰 *Invoice Amount:* ${total}\n` +
      `📦 *Urgency:* ${order.urgency}\n\n` +
      `📦 *Items In Shipment:*\n${itemsSummary}\n\n` +
      `Our logistics team is coordinating directly with the site team. For unloading assistance or vehicle status, reach out immediately:\n` +
      `👤 *${controllerName}* (${controllerDesignation})\n` +
      `📞 *Direct Line:* ${controllerPhone}\n\n` +
      `*SAFE SOLUTIONS Logistics Desk* 🚚`;
  }

  if (style === 'SHORT') {
    return `*SAFE SOLUTIONS* 🌟\n` +
      `Assalam-o-Alaikum *${clientName}*,\n` +
      `Thank you for your order *${orderNum}* (${site}, ${city}) worth *${total}*.\n` +
      `Status: *${order.status}*.\n\n` +
      `For quick tracking or support, contact Operations:\n` +
      `👤 *${controllerName}* (${controllerPhone})\n` +
      `Safe Building, Strong Future!`;
  }

  // DEFAULT: EXECUTIVE CORPORATE
  return `*${companyName}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `Assalam-o-Alaikum *${clientName}*,\n\n` +
    `Thank you for choosing *SAFE SOLUTIONS* for your construction chemical and waterproofing project needs!\n\n` +
    `📋 *Order Confirmation:* ${orderNum}\n` +
    `🏢 *Site / Client:* ${site}\n` +
    `📍 *Delivery City:* ${city}\n` +
    `💰 *Grand Total:* ${total}\n` +
    `📦 *Current Status:* ${order.status}\n` +
    `💳 *Payment Terms:* ${order.paymentStatus}${order.paymentRemarks ? ` (${order.paymentRemarks})` : ''}\n\n` +
    `📦 *Order Items Breakdown:*\n${itemsSummary}\n\n` +
    `For delivery schedule, driver tracking, or technical documentation, please contact our Operations Desk directly:\n` +
    `👤 *${controllerName}* (${controllerDesignation})\n` +
    `📞 *Direct Contact:* ${controllerPhone}\n\n` +
    `*Safe Building, Strong Future!* 🌟`;
}

