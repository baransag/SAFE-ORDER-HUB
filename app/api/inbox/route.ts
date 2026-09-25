import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inboxData = await db.getUnifiedInbox(user);
    return NextResponse.json(inboxData);
  } catch (err: any) {
    console.error('Error fetching unified inbox:', err);
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { itemType, itemId, isRead, status } = body;

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 });
    }

    await db.setInboxItemState(user.id, itemType, itemId, isRead, status);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating inbox item state:', err);
    return NextResponse.json({ error: 'Failed to update inbox item' }, { status: 500 });
  }
}
