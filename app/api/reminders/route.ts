import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { ReminderPurpose, ReminderStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId') || undefined;
  const orderId = searchParams.get('orderId') || undefined;
  const status = (searchParams.get('status') as ReminderStatus | 'ALL') || undefined;
  const isOverdue = searchParams.get('isOverdue') === 'true';
  const assignedToId = searchParams.get('assignedToId') || undefined;

  const isMgmt = isFullAccess(user.role);

  try {
    const reminders = await db.getCustomerReminders({
      assignedToId: isMgmt ? assignedToId : user.id,
      customerId,
      orderId,
      status,
      isOverdue,
      isManagement: isMgmt,
    });

    return NextResponse.json({ reminders });
  } catch (err: any) {
    console.error('Error fetching reminders:', err);
    return NextResponse.json({ error: 'Failed to fetch customer reminders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      orderId,
      assignedToId,
      assignedToName,
      dueDate,
      purpose,
      notes,
    } = body;

    if (!dueDate || !purpose) {
      return NextResponse.json({ error: 'dueDate and purpose are required' }, { status: 400 });
    }

    const reminder = await db.createCustomerReminder({
      customerId,
      customerName,
      orderId,
      assignedToId: assignedToId || user.id,
      assignedToName: assignedToName || user.name,
      createdById: user.id,
      createdByName: user.name,
      dueDate,
      purpose: purpose as ReminderPurpose,
      notes,
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating reminder:', err);
    return NextResponse.json({ error: 'Failed to create customer reminder' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, outcomeNotes, notes, dueDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const updated = await db.updateCustomerReminder(id, {
      status,
      outcomeNotes,
      notes,
      dueDate,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ reminder: updated });
  } catch (err: any) {
    console.error('Error updating reminder:', err);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}
