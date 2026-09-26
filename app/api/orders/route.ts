import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrderStatus, PaymentStatus, Urgency } from '@/lib/types';
import { generateWhatsAppLink, formatWhatsAppOrderMessage } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const status = (searchParams.get('status') as OrderStatus) || undefined;

  const orders = await db.getOrders({
    role: user.role,
    userId: user.id,
    search,
    status,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      companyName,
      customerPhone,
      customerWhatsapp,
      city,
      deliveryAddress,
      mapsUrl,
      customerType,
      items,
      paymentStatus,
      paymentRemarks,
      requiredDeliveryDate,
      urgency,
      remarks,
    } = body;

    if (!customerName || !companyName || !customerPhone || !city || !deliveryAddress) {
      return NextResponse.json({ error: 'Customer name, company, phone, city, and address are required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one order item is required' }, { status: 400 });
    }

    // Process customer
    const customer = await db.findOrCreateCustomer({
      name: customerName,
      companyName,
      phone: customerPhone,
      whatsapp: customerWhatsapp || customerPhone,
      city,
      deliveryAddress,
      mapsUrl: mapsUrl || '',
      customerType: customerType || 'NEW',
    }, { id: user.id, name: user.name });

    // Validate products and rates
    const products = await db.getProducts();
    let hasSpecialRate = false;
    let subtotal = 0;
    let discountTotal = 0;

    const processedItems = items.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const standardRate = product ? product.standardRate : Number(item.standardRate || item.offeredRate);
      const minAllowedRate = product ? product.minAllowedRate : standardRate * 0.9;
      const offeredRate = Number(item.offeredRate);
      const quantity = Number(item.quantity);
      const itemTotal = offeredRate * quantity;

      const isBelowMin = offeredRate < minAllowedRate;
      if (isBelowMin) {
        hasSpecialRate = true;
      }

      const itemDiscount = Math.max(0, (standardRate - offeredRate) * quantity);
      subtotal += itemTotal;
      discountTotal += itemDiscount;

      return {
        id: `itm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product ? product.id : (item.productId && typeof item.productId === 'string' && item.productId.trim() !== '' ? item.productId : null),
        productName: item.productName || (product ? product.name : 'Custom Item'),
        packing: item.packing || (product ? product.defaultPacking : 'Standard'),
        unit: item.unit || (product ? product.unit : 'Unit'),
        quantity,
        standardRate,
        offeredRate,
        discount: itemDiscount,
        totalAmount: itemTotal,
        isSpecialRate: isBelowMin,
      };
    });

    const initialStatus: OrderStatus = hasSpecialRate ? 'RATE_REVIEW' : 'NEW';

    const order = await db.createOrder({
      customerId: customer.id,
      customerName,
      companyName,
      customerPhone,
      customerWhatsapp: customerWhatsapp || customerPhone,
      city,
      deliveryAddress,
      mapsUrl: mapsUrl || '',
      customerType: customerType || 'NEW',

      items: processedItems,
      subtotal,
      discountTotal,
      grandTotal: subtotal,

      paymentStatus: (paymentStatus as PaymentStatus) || 'PENDING',
      paymentRemarks: paymentRemarks || '',
      requiredDeliveryDate: requiredDeliveryDate || new Date().toISOString().split('T')[0],
      urgency: (urgency as Urgency) || 'NORMAL',

      status: initialStatus,
      specialRateApproved: !hasSpecialRate,
      rateReviewNote: hasSpecialRate 
        ? 'One or more items entered with rate below standard minimum. Marked for Manager/Controller review.' 
        : undefined,

      orderTakenById: user.id,
      orderTakenByName: user.name,
      orderTakenByEmail: user.email,
      orderTakenByPhone: user.phone,

      remarks: remarks || '',
      internalNotes: body.internalNotes || '',
      idempotencyKey: body.idempotencyKey || undefined,
    });

    const settings = await db.getSettings();
    const formattedMessage = formatWhatsAppOrderMessage(order, settings.companyName);
    const whatsappLink = generateWhatsAppLink(order, settings.officeWhatsappNumber, settings.companyName);
    const whatsappGroupUrl = settings.whatsappGroupInviteUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK';
    const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMessage)}`;

    return NextResponse.json({
      success: true,
      order,
      whatsappLink,
      whatsappShareUrl,
      whatsappGroupUrl,
      formattedMessage,
      hasSpecialRate,
      message: hasSpecialRate 
        ? 'Order booked successfully! Note: Rate is below standard and has been flagged for Controller/Manager review.'
        : 'Order booked successfully!'
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}
