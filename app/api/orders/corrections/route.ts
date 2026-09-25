import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { CorrectionRequestStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId') || undefined;
  const status = (searchParams.get('status') as CorrectionRequestStatus | 'ALL') || undefined;
  const isMgmt = isFullAccess(user.role);

  try {
    const corrections = await db.getOrderCorrectionRequests({
      orderId,
      requestedById: isMgmt ? undefined : user.id,
      status,
      isManagement: isMgmt,
    });

    return NextResponse.json({ corrections });
  } catch (err: any) {
    console.error('Error fetching correction requests:', err);
    return NextResponse.json({ error: 'Failed to fetch correction requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId, orderNumber, reason, originalValues, requestedValues } = body;

    if (!orderId || !orderNumber || !reason || !requestedValues) {
      return NextResponse.json(
        { error: 'orderId, orderNumber, reason, and requestedValues are required' },
        { status: 400 }
      );
    }

    const correction = await db.createOrderCorrectionRequest({
      orderId,
      orderNumber,
      requestedById: user.id,
      requestedByName: user.name,
      reason: reason.trim(),
      originalValues: originalValues || {},
      requestedValues,
    });

    await db.createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'REQUEST_ORDER_CORRECTION',
      entity: 'ORDER',
      entityId: orderId,
      newValue: `Requested correction for ${orderNumber}: ${reason}`,
    });

    return NextResponse.json({ correction }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating correction request:', err);
    return NextResponse.json({ error: 'Failed to create correction request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Management can approve or reject correction requests' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, decision, decisionNote } = body;

    if (!id || !decision || !['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'id and valid decision (APPROVED/REJECTED) are required' }, { status: 400 });
    }

    const reviewed = await db.reviewOrderCorrectionRequest(
      id,
      { id: user.id, name: user.name, role: user.role },
      decision,
      decisionNote
    );

    if (!reviewed) {
      return NextResponse.json({ error: 'Correction request not found' }, { status: 404 });
    }

    return NextResponse.json({ correction: reviewed });
  } catch (err: any) {
    console.error('Error reviewing correction request:', err);
    return NextResponse.json({ error: 'Failed to review correction request' }, { status: 500 });
  }
}
