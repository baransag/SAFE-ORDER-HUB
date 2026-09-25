import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { TaskPriority, TaskStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as TaskStatus | 'ALL') || undefined;
  const priority = (searchParams.get('priority') as TaskPriority | 'ALL') || undefined;
  const isMgmt = isFullAccess(user.role);

  try {
    const tasks = await db.getOperationalTasks({
      assignedToId: isMgmt ? undefined : user.id,
      status,
      priority,
      isManagement: isMgmt,
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    return NextResponse.json({ error: 'Failed to fetch operational tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Management can create and assign operational tasks' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      title,
      description,
      assignedToId,
      assignedToName,
      relatedOrderId,
      relatedCustomerId,
      priority,
      dueDate,
    } = body;

    if (!title || !assignedToId || !assignedToName || !dueDate) {
      return NextResponse.json(
        { error: 'title, assignedToId, assignedToName, and dueDate are required' },
        { status: 400 }
      );
    }

    const task = await db.createOperationalTask({
      title,
      description,
      assignedToId,
      assignedToName,
      createdById: user.id,
      createdByName: user.name,
      relatedOrderId,
      relatedCustomerId,
      priority,
      dueDate,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating task:', err);
    return NextResponse.json({ error: 'Failed to create operational task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, completionNotes, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const updated = await db.updateOperationalTask(id, {
      status,
      completionNotes,
      priority,
      dueDate,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    console.error('Error updating task:', err);
    return NextResponse.json({ error: 'Failed to update operational task' }, { status: 500 });
  }
}
