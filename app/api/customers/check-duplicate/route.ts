import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { phone, companyName, excludeId } = body;

    if (!phone && !companyName) {
      return NextResponse.json({ duplicates: [] });
    }

    const duplicates = await db.checkDuplicateCustomer(phone || '', companyName || '', excludeId);
    return NextResponse.json({ duplicates });
  } catch (err: any) {
    console.error('Error checking duplicate customers:', err);
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
  }
}
