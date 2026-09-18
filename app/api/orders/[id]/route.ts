import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrderStatus } from '@/lib/types';
import { generateWhatsAppLink, formatWhatsAppOrderMessage } from '@/lib/whatsapp';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const order = db.getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Access check: Sales users can only see their own order
  if (!isFullAccess(user.role) && order.orderTakenById !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const settings = db.getSettings();
  const formattedMessage = formatWhatsAppOrderMessage(order, settings.companyName);
  const whatsappLink = generateWhatsAppLink(order, settings.officeWhatsappNumber, settings.companyName);
  const whatsappGroupUrl = settings.whatsappGroupInviteUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK';
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedMessage)}`;

  return NextResponse.json({ 
    order, 
    whatsappLink,
    whatsappGroupUrl,
    whatsappShareUrl,
    formattedMessage 
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const order = db.getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { action, status, note, updatedItems, reviewNote } = body;

    // Boss, Controller, Manager have full access to approve, edit rates, change status
    const fullAccess = isFullAccess(user.role);

    if (action === 'UPDATE_RATES') {
      if (!fullAccess) {
        return NextResponse.json({ error: 'Only Boss, Controller, or Manager can modify and approve rates' }, { status: 403 });
      }

      if (!updatedItems || !Array.isArray(updatedItems)) {
        return NextResponse.json({ error: 'Updated items required' }, { status: 400 });
      }

      const updated = db.updateOrderRates(order.id, updatedItems, {
        id: user.id,
        name: user.name,
        role: user.role,
      }, reviewNote);

      return NextResponse.json({ success: true, order: updated });
    }

    if (action === 'UPDATE_STATUS') {
      // Sales person can only cancel their own order if still NEW or RATE_REVIEW
      if (!fullAccess) {
        if (order.orderTakenById !== user.id || status !== 'CANCELLED') {
          return NextResponse.json({ error: 'You do not have permission to change order to this status' }, { status: 403 });
        }
      }

      const updated = db.updateOrderStatus(order.id, status as OrderStatus, {
        id: user.id,
        name: user.name,
        role: user.role,
      }, note);

      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message || 'Failed to update order' }, { status: 500 });
  }
}
