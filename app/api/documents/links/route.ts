import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productName = searchParams.get('productName') || undefined;

  try {
    const links = await db.getProductDocumentLinks(productName);
    return NextResponse.json({ links });
  } catch (err: any) {
    console.error('Error fetching document links:', err);
    return NextResponse.json({ error: 'Failed to fetch document links' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Management can link technical documents to products' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { productName, productId, documentId, documentTitle } = body;

    if (!productName || !documentId || !documentTitle) {
      return NextResponse.json(
        { error: 'productName, documentId, and documentTitle are required' },
        { status: 400 }
      );
    }

    const link = await db.linkProductDocument({
      productName,
      productId,
      documentId,
      documentTitle,
      linkedById: user.id,
      linkedByName: user.name,
    });

    await db.createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LINK_DOCUMENT',
      entity: 'PRODUCT_DOCUMENT_LINK',
      entityId: link.id,
      newValue: `Linked ${documentTitle} to product ${productName}`,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (err: any) {
    console.error('Error linking document:', err);
    return NextResponse.json({ error: 'Failed to link document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
  }

  try {
    await db.unlinkProductDocument(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error unlinking document:', err);
    return NextResponse.json({ error: 'Failed to unlink document' }, { status: 500 });
  }
}
