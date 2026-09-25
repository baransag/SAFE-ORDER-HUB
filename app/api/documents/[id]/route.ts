import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const doc = await db.getTechnicalDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  if (doc.visibility === 'MANAGEMENT_ONLY' && !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ document: doc });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only management can modify technical documents' },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await db.updateTechnicalDocument(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await db.createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_DOCUMENT',
      entity: 'TECHNICAL_DOCUMENT',
      entityId: id,
      newValue: JSON.stringify(body),
    });

    return NextResponse.json({ document: updated });
  } catch (err: any) {
    console.error('Error updating technical document:', err);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only management can delete technical documents' },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const success = await db.deleteTechnicalDocument(id);
    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await db.createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'DELETE_DOCUMENT',
      entity: 'TECHNICAL_DOCUMENT',
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting technical document:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
