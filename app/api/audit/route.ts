import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden: Access restricted to Management' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const limit = Number(searchParams.get('limit') || '100');

  const logs = await db.getAuditLogs({ entity, userId, limit });
  return NextResponse.json({ logs });
}
