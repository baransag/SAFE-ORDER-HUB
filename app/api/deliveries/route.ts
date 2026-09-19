import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const city = searchParams.get('city') || undefined;
  const date = searchParams.get('date') || undefined;

  const deliveries = await db.getDeliveries({ 
    status, 
    city, 
    date,
    role: user.role,
    userId: user.id,
  });
  return NextResponse.json({ deliveries });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden: Access restricted to Management' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { orderId, assignedDriver, driverPhone, vehicleNumber, deliveryStatus, proofPhotoUrl, signedReceiptUrl, invoiceNumber, notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const updated = await db.updateDeliveryProof(orderId, {
      assignedDriver,
      driverPhone,
      vehicleNumber,
      deliveryStatus,
      proofPhotoUrl,
      signedReceiptUrl,
      invoiceNumber,
      notes,
    }, {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({ success: true, delivery: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update delivery' }, { status: 500 });
  }
}
