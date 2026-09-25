import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { VoiceOrderStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as VoiceOrderStatus) || undefined;

  const voiceOrders = await db.getVoiceOrders({
    role: user.role,
    userId: user.id,
    status,
  });

  return NextResponse.json({ voiceOrders });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      audioUrl,
      durationSeconds,
      transcript,
      extractedCustomerName,
      extractedCustomerPhone,
      extractedCity,
      extractedDeliveryAddress,
      extractedProducts,
      extractedRates,
      extractedNotes,
      assignedToId,
      assignedToName,
    } = body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript or spoken voice note is required' }, { status: 400 });
    }

    const voiceOrder = await db.createVoiceOrder({
      userId: user.id,
      userName: user.name,
      audioUrl: audioUrl || undefined,
      durationSeconds: Number(durationSeconds || 0),
      transcript: transcript.trim(),
      extractedCustomerName: extractedCustomerName?.trim() || undefined,
      extractedCustomerPhone: extractedCustomerPhone?.trim() || undefined,
      extractedCity: extractedCity?.trim() || undefined,
      extractedDeliveryAddress: extractedDeliveryAddress?.trim() || undefined,
      extractedProducts: extractedProducts || null,
      extractedRates: extractedRates?.trim() || undefined,
      extractedNotes: extractedNotes?.trim() || undefined,
      assignedToId: assignedToId || undefined,
      assignedToName: assignedToName || undefined,
    });

    await db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'VOICE_ORDER_RECORDED',
      entity: 'ORDER',
      entityId: voiceOrder.id,
      newValue: `Customer: ${voiceOrder.extractedCustomerName || 'Unspecified'} - City: ${voiceOrder.extractedCity || 'Unspecified'} - Duration: ${voiceOrder.durationSeconds}s`,
    });

    return NextResponse.json({
      success: true,
      voiceOrder,
      message: 'Voice order recorded and submitted to operations inbox successfully.',
    });
  } catch (error: any) {
    console.error('Error recording voice order:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit voice order' }, { status: 500 });
  }
}
