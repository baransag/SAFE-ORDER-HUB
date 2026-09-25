import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Management can merge duplicate customer records' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { primaryId, secondaryId } = body;

    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json(
        { error: 'Valid distinct primaryId and secondaryId are required' },
        { status: 400 }
      );
    }

    const result = await db.mergeCustomers(primaryId, secondaryId, {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error merging customers:', err);
    return NextResponse.json({ error: err.message || 'Failed to merge customers' }, { status: 500 });
  }
}
