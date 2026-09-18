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
