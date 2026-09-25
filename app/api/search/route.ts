import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || undefined;
  const limit = Math.min(50, Number(searchParams.get('limit') || '20'));

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await db.globalSearch(q.trim(), user, type, limit);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Global search error:', err);
    return NextResponse.json({ error: 'Failed to execute search' }, { status: 500 });
  }
}
