import { NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allUsers = db.getUsers();
  // Filter out passwords
  const sanitized = allUsers.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    designation: u.designation,
    role: u.role,
    vehicle: u.vehicle,
    avatar: u.avatar,
    active: u.active,
  }));

  return NextResponse.json({ employees: sanitized });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, avatar } = await req.json();
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const updated = db.updateUser(id, { avatar });
    return NextResponse.json({ success: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update user' }, { status: 500 });
  }
}
