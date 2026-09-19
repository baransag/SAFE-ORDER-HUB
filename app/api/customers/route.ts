import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const city = searchParams.get('city') || undefined;

  const customers = await db.getCustomers(search, city);
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, companyName, phone, whatsapp, city, deliveryAddress, mapsUrl, notes } = body;

    if (!name || !companyName || !phone || !city) {
      return NextResponse.json({ error: 'Name, company, phone, and city are required' }, { status: 400 });
    }

    const customer = await db.findOrCreateCustomer({
      name,
      companyName,
      phone,
      whatsapp: whatsapp || phone,
      city,
      deliveryAddress: deliveryAddress || '',
      mapsUrl: mapsUrl || '',
      customerType: 'NEW',
      notes,
      createdById: user.id,
    }, { id: user.id, name: user.name });

    return NextResponse.json({ success: true, customer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create customer' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const updated = await db.updateCustomer(id, updates, {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update customer' }, { status: 500 });
  }
}
