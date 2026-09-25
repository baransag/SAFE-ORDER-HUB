import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { DocumentType } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const folderPath = searchParams.get('folderPath') || undefined;
  const search = searchParams.get('search') || undefined;
  const productName = searchParams.get('productName') || undefined;

  const management = isFullAccess(user.role);

  try {
    const documents = await db.getTechnicalDocuments({
      category,
      folderPath,
      search,
      productName,
      isManagement: management,
    });

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error('Error fetching technical documents:', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFullAccess(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Only Boss, Controller, or Manager can upload technical documents' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      title,
      productName,
      manufacturer,
      documentType,
      category,
      folderPath,
      version,
      fileName,
      filePath,
      fileSizeBytes,
      fileType,
      extractedText,
      tags,
      visibility,
    } = body;

    if (!title || !fileName || !filePath) {
      return NextResponse.json(
        { error: 'Title, fileName, and filePath are required' },
        { status: 400 }
      );
    }

    const document = await db.createTechnicalDocument({
      title: title.trim(),
      productName: productName?.trim() || undefined,
      manufacturer: manufacturer?.trim() || 'Radiant Construction Technologies LLP',
      documentType: (documentType as DocumentType) || 'TDS',
      category: category?.trim() || 'General',
      folderPath: folderPath?.trim() || '/',
      version: version?.trim() || '1.0',
      fileName: fileName.trim(),
      filePath: filePath.trim(),
      fileSizeBytes: Number(fileSizeBytes || 0),
      fileType: fileType?.trim() || 'application/pdf',
      extractedText: extractedText?.trim() || undefined,
      tags: Array.isArray(tags) ? tags : [],
      visibility: visibility === 'MANAGEMENT_ONLY' ? 'MANAGEMENT_ONLY' : 'ALL_SALES',
      uploadedBy: user.id,
      uploadedByName: user.name,
    });

    await db.createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPLOAD_DOCUMENT',
      entity: 'TECHNICAL_DOCUMENT',
      entityId: document.id,
      newValue: `Uploaded document: ${document.title}`,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating technical document:', err);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
