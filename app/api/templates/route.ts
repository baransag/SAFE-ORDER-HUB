import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { MessageTemplateCategory } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const language = searchParams.get('language') || undefined;
  const showAll = searchParams.get('all') === 'true';

  const fullAccess = isFullAccess(user.role);
  const activeOnly = fullAccess ? !showAll : true;

  const templates = await db.getMessageTemplates({
    category,
    language,
    activeOnly,
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can create message templates' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, category, language, templateText, isDefault } = body;

    if (!title || !category || !templateText) {
      return NextResponse.json({ error: 'Title, category, and template text are required' }, { status: 400 });
    }

    const template = await db.createMessageTemplate({
      title: title.trim(),
      category: category as MessageTemplateCategory,
      language: language === 'ur' ? 'ur' : 'en',
      templateText: templateText.trim(),
      isDefault: Boolean(isDefault),
    });

    await db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'TEMPLATE_CREATED',
      entity: 'SETTINGS',
      entityId: template.id,
      newValue: `Created template "${template.title}" (${template.category})`,
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can edit message templates' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, category, language, templateText, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const updated = await db.updateMessageTemplate(id, {
      title,
      category,
      language,
      templateText,
      isDefault,
      isActive,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'TEMPLATE_UPDATED',
      entity: 'SETTINGS',
      entityId: id,
      newValue: `Updated template "${updated.title}"`,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can delete message templates' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  const ok = await db.deleteMessageTemplate(id);
  if (!ok) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'TEMPLATE_DELETED',
    entity: 'SETTINGS',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
