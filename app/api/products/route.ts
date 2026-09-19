import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const products = await db.getProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can add products' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, category, defaultPacking, unit, standardRate, minAllowedRate, description } = body;

    if (!name || !unit || standardRate === undefined) {
      return NextResponse.json({ error: 'Name, unit, and standard rate are required' }, { status: 400 });
    }

    const product = await db.createProduct({
      name,
      category: category || 'General Chemicals',
      defaultPacking: defaultPacking || 'Standard',
      unit,
      standardRate: Number(standardRate),
      minAllowedRate: Number(minAllowedRate || standardRate * 0.9),
      description: description || '',
      inStock: true,
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can edit products' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    if (updates.standardRate) updates.standardRate = Number(updates.standardRate);
    if (updates.minAllowedRate) updates.minAllowedRate = Number(updates.minAllowedRate);

    const product = await db.updateProduct(id, updates);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can delete products' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }

  const ok = await db.deleteProduct(id);
  return NextResponse.json({ success: ok });
}
