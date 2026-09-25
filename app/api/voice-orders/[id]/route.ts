import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { VoiceOrderStatus } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const voiceOrder = await db.getVoiceOrderById(id);
  if (!voiceOrder) {
    return NextResponse.json({ error: 'Voice order not found' }, { status: 404 });
  }

  // Access check: Sales users can only access their own submissions or those assigned to them
  if (!isFullAccess(user.role) && voiceOrder.userId !== user.id && voiceOrder.assignedToId !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json({ voiceOrder });
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
  const existing = await db.getVoiceOrderById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Voice order not found' }, { status: 404 });
  }

  const fullAccess = isFullAccess(user.role);
  // Only management or the original recorder can update
  if (!fullAccess && existing.userId !== user.id) {
    return NextResponse.json({ error: 'Permission denied to edit this voice order' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      transcript,
      extractedCustomerName,
      extractedCustomerPhone,
      extractedCity,
      extractedDeliveryAddress,
      extractedProducts,
      extractedRates,
      extractedNotes,
      status,
      assignedToId,
      assignedToName,
      convertedOrderId,
      internalNotes,
    } = body;

    const updates: any = {};
    if (transcript !== undefined) updates.transcript = transcript;
    if (extractedCustomerName !== undefined) updates.extractedCustomerName = extractedCustomerName;
    if (extractedCustomerPhone !== undefined) updates.extractedCustomerPhone = extractedCustomerPhone;
    if (extractedCity !== undefined) updates.extractedCity = extractedCity;
    if (extractedDeliveryAddress !== undefined) updates.extractedDeliveryAddress = extractedDeliveryAddress;
    if (extractedProducts !== undefined) updates.extractedProducts = extractedProducts;
    if (extractedRates !== undefined) updates.extractedRates = extractedRates;
    if (extractedNotes !== undefined) updates.extractedNotes = extractedNotes;
    if (status !== undefined) updates.status = status as VoiceOrderStatus;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId;
    if (assignedToName !== undefined) updates.assignedToName = assignedToName;
    if (convertedOrderId !== undefined) updates.convertedOrderId = convertedOrderId;
    if (internalNotes !== undefined) updates.internalNotes = internalNotes;

    const updated = await db.updateVoiceOrder(id, updates);

    await db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'VOICE_ORDER_UPDATED',
      entity: 'ORDER',
      entityId: id,
      newValue: `Status: ${updates.status || existing.status} - Updated by ${user.name}`,
    });

    return NextResponse.json({ success: true, voiceOrder: updated });
  } catch (error: any) {
    console.error('Error updating voice order:', error);
    return NextResponse.json({ error: error.message || 'Failed to update voice order' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Management (Boss, Controller, Manager) can delete voice orders' }, { status: 403 });
  }

  const { id } = await params;
  const ok = await db.deleteVoiceOrder(id);
  if (!ok) {
    return NextResponse.json({ error: 'Voice order not found or could not be deleted' }, { status: 404 });
  }

  await db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'VOICE_ORDER_DELETED',
    entity: 'ORDER',
    entityId: id,
  });

  return NextResponse.json({ success: true, message: 'Voice order deleted successfully' });
}
