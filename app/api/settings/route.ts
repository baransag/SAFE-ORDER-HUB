import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const settings = await db.getSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden: Only Controller, Manager, or Boss can update settings' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { officeWhatsappNumber, whatsappGroupInviteUrl, companyName, rateWarningTolerancePercent } = body;

    const updated = await db.updateSettings({
      officeWhatsappNumber,
      whatsappGroupInviteUrl,
      companyName,
      rateWarningTolerancePercent: Number(rateWarningTolerancePercent) || 5,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
