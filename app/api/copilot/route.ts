import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, conversationId, language = 'roman_urdu', orderContext } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmedMsg = message.trim();
    const management = isFullAccess(user.role);

    // 1. Fetch relevant technical documents for context if query relates to products/specs
    const techDocs = await db.getTechnicalDocuments({
      isManagement: management,
    });

    // 2. Fetch user's orders for context (strict RBAC: Sales only their own)
    let userOrders: any[] = [];
    if (management) {
      const all = await db.getOrders();
      userOrders = all.slice(0, 10);
    } else {
      const myOrders = await db.getOrders({ userId: user.id, role: user.role });
      userOrders = myOrders.slice(0, 10);
    }

    // 3. Process query using Safe Copilot intelligence engine
    const responsePayload = await processCopilotQuery({
      user,
      message: trimmedMsg,
      isManagement: management,
      userOrders,
      techDocs,
      orderContext,
      preferredLanguage: language,
    });

    // 4. Save conversation and message if conversationId provided or create one
    let convId = conversationId;
    if (!convId) {
      const conv = await db.createCopilotConversation(user.id, trimmedMsg.substring(0, 40));
      convId = conv.id;
    }

    await db.saveCopilotMessage({
      conversationId: convId,
      userId: user.id,
      role: 'user',
      content: trimmedMsg,
    });

    await db.saveCopilotMessage({
      conversationId: convId,
      userId: user.id,
      role: 'assistant',
      content: responsePayload.reply,
      metadata: responsePayload.actionData || {},
    });

    return NextResponse.json({
      conversationId: convId,
      reply: responsePayload.reply,
      actionType: responsePayload.actionType || null,
      actionData: responsePayload.actionData || null,
      generatedMessage: responsePayload.generatedMessage || null,
      suggestedReplies: responsePayload.suggestedReplies || [],
    });
  } catch (err: any) {
    console.error('Safe Copilot API error:', err);
    return NextResponse.json({ error: 'Safe Copilot service encountered an error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE COPILOT CORE NATURAL INTELLIGENCE & RBAC LOGIC
// ─────────────────────────────────────────────────────────────────────────────

interface CopilotContext {
  user: any;
  message: string;
  isManagement: boolean;
  userOrders: any[];
  techDocs: any[];
  orderContext?: any;
  preferredLanguage: string;
}

async function processCopilotQuery(ctx: CopilotContext): Promise<{
  reply: string;
  actionType?: string;
  actionData?: any;
  generatedMessage?: {
    romanUrdu: string;
    urdu: string;
    english: string;
    category: string;
  };
  suggestedReplies?: string[];
}> {
  const q = ctx.message.toLowerCase();

  // ──────────────────────────────────────────────
  // CASE 1: THANK YOU MESSAGE GENERATION
  // ──────────────────────────────────────────────
  const isThankYouRequest = 
    q.includes('thank') || 
    q.includes('shukriya') || 
    q.includes('dhanyawad') || 
    q.includes('message likh') || 
    q.includes('msg likh') ||
    q.includes('whatsapp message') ||
    q.includes('template');

  if (isThankYouRequest) {
    const clientName = ctx.orderContext?.customerName || 'Mohtaram Customer';
    const orderNo = ctx.orderContext?.orderNumber || 'Aapka Order';
    const salesPerson = ctx.user.name;

    const romanUrdu = `Assalam-o-Alaikum ${clientName} Sahab,

SAFE SOLUTIONS par aitmaad karne ka bohat shukriya! Aap ka order ${orderNo} hamare system mein darj ho chuka hai. 

Insha\'Allah aap ko quality product aur behtareen delivery service milegi. Kisi bhi maloomat ya rehnumai ke liye aap mujh se (${salesPerson}) rabta kar sakte hain.

JazakAllah Khair,
${salesPerson}
SAFE SOLUTIONS — Construction Chemicals`;

    const urdu = `السلام علیکم ${clientName} صاحب،

سیف سلوشنز پر اعتماد کرنے کا بہت شکریہ! آپ کا آرڈر ${orderNo} ہمارے سسٹم میں درج ہو چکا ہے۔

ان شاء اللہ آپ کو بہترین کوالٹی اور بروقت ڈیلیوری فراہم کی جائے گی۔ کسی بھی معلومات یا رہنمائی کے لیے آپ مجھ سے رابطہ کر سکتے ہیں۔

جزاک اللہ خیر،
${salesPerson}
سیف سلوشنز`;

    const english = `Dear ${clientName},

Thank you for choosing SAFE SOLUTIONS. Your order (${orderNo}) has been successfully received and is being processed with the highest quality standards.

Should you require any assistance, please feel free to contact me directly.

Best regards,
${salesPerson}
SAFE SOLUTIONS — Construction Chemicals`;

    return {
      reply: `Ji bilkul! Maine ${clientName} ke liye aik nihayat professional aur purkhaloos thank-you message tayyar kar diya hai. Aap isay copy kar sakte hain ya direct WhatsApp par send kar sakte hain:`,
      actionType: 'MESSAGE_PREVIEW',
      generatedMessage: {
        romanUrdu,
        urdu,
        english,
        category: 'THANK_YOU',
      },
      suggestedReplies: [
        'Roman Urdu copy karein',
        'Direct WhatsApp kholiye',
        'Payment reminder message likhein',
      ],
    };
  }

  // ──────────────────────────────────────────────
  // CASE 2: PAYMENT REMINDER
  // ──────────────────────────────────────────────
  if (q.includes('payment') || q.includes('paisa') || q.includes('reminder') || q.includes('baqaya') || q.includes('balance')) {
    const clientName = ctx.orderContext?.customerName || 'Mohtaram Client';
    const amount = ctx.orderContext?.grandTotal ? `PKR ${Number(ctx.orderContext.grandTotal).toLocaleString()}` : '[Amount]';
    const salesPerson = ctx.user.name;

    const romanUrdu = `Assalam-o-Alaikum ${clientName} Sahab,

Umeed hai aap kheriyat se honge. Yeh SAFE SOLUTIONS ki taraf se order ke baqaya payment ${amount} ke hawalay se aik polite reminder hai. 

Barah-e-karam accounts verification ke liye payment update farma dein taake agla process barwaqt mukammal ho sake.

Shukriya,
${salesPerson}
SAFE SOLUTIONS`;

    const urdu = `السلام علیکم ${clientName} صاحب،

امید ہے آپ خیریت سے ہوں گے۔ سیف سلوشنز کی جانب سے آرڈر کی بقیہ رقم ${amount} کے حوالے سے یاد دہانی ہے۔

براہِ کرم اکاؤنٹس کی تصدیق کے لیے ادائیگی اپ ڈیٹ فرما دیں تاکہ عمل بروقت مکمل ہو سکے۔

شکریہ،
${salesPerson}
سیف سلوشنز`;

    const english = `Dear ${clientName},

Greetings from SAFE SOLUTIONS. This is a gentle reminder regarding the pending balance of ${amount} against your order. 

Kindly confirm the payment status at your earliest convenience to facilitate our accounts department.

Thank you,
${salesPerson}
SAFE SOLUTIONS`;

    return {
      reply: `Maine aik polite aur professional payment reminder message tayyar kiya hai:`,
      actionType: 'MESSAGE_PREVIEW',
      generatedMessage: {
        romanUrdu,
        urdu,
        english,
        category: 'PAYMENT_REMINDER',
      },
      suggestedReplies: [
        'WhatsApp par send karein',
        'Short message banayein',
        'Order status check karein',
      ],
    };
  }

  // ──────────────────────────────────────────────
  // CASE 3: TECHNICAL DATA SHEETS & SPECIFICATIONS
  // ──────────────────────────────────────────────
  const isTechQuery = 
    q.includes('tiger shell') || 
    q.includes('conbond') || 
    q.includes('confloor') || 
    q.includes('conflex') || 
    q.includes('coverage') || 
    q.includes('tds') || 
    q.includes('msds') || 
    q.includes('technical') ||
    q.includes('specification') ||
    q.includes('hardener') ||
    q.includes('sealant');

  if (isTechQuery) {
    if (q.includes('tiger shell')) {
      const doc = ctx.techDocs.find(d => d.productName?.toLowerCase().includes('tiger shell'));
      return {
        reply: `TIGER SHELL BLACK (Anti-Corrosive Protective Coating) ki verified technical maloomat yeh hain:\n\n` +
          `• Packaging: 15 Kgs Pack\n` +
          `• Manufacturer: Radiant Construction Technologies LLP\n` +
          `• Coverage: 1 ltr per 2 m² (Minimum 2 coats recommended)\n` +
          `• Drying Time: At 20°C within 6 hours\n` +
          `• Use: Steel, iron sheets, water pipelines, concrete, roofs, and gates waterproofing & anti-corrosion\n` +
          `• Application: Brush, conventional spray, airless spray, hot spray. Do not thin.\n\n` +
          `Aap is ka mukammal TDS document Technical Library se download kar sakte hain.`,
        actionType: 'DOCUMENT_LINK',
        actionData: { documentId: doc?.id || 'doc_tiger_shell_black', title: 'Tiger Shell Black TDS' },
        suggestedReplies: ['ConFloor Hardtop ki details', 'ConFlex PU 600 ki coverage', 'Document Library kholein'],
      };
    }

    if (q.includes('confloor') || q.includes('hardtop')) {
      const doc = ctx.techDocs.find(d => d.productName?.toLowerCase().includes('confloor'));
      return {
        reply: `ConFloor Hardtop (Mineral based dry shake surface hardener) ki verified maloomat:\n\n` +
          `• Packaging: 20 Kgs Bag\n` +
          `• Compressive Strength: 70 N/mm² @ 28 days (Moh Hardness: 7)\n` +
          `• Density: Approximately 1,800 Kg/m³\n` +
          `• Dosage for normal finish: 5 kg/m²\n` +
          `• Coverage: 4 m² per 20 kg bag\n` +
          `• Use: Warehouses, loading bays, workshops, parking ramps (Heavy mechanical wear)\n` +
          `• Curing: ConCure WB curing membrane is recommended.\n\n` +
          `TDS document Library mein dastiyab hai.`,
        actionType: 'DOCUMENT_LINK',
        actionData: { documentId: doc?.id || 'doc_confloor_hardtop', title: 'ConFloor Hardtop TDS' },
        suggestedReplies: ['Tiger Shell Black coverage', 'ConFlex PU 600 details', 'Document Library'],
      };
    }

    if (q.includes('conflex') || q.includes('pu 600') || q.includes('sealant')) {
      const doc = ctx.techDocs.find(d => d.productName?.toLowerCase().includes('conflex'));
      return {
        reply: `ConFlex PU 600 (Single Component Polyurethane Joint Sealant) ki verified maloomat:\n\n` +
          `• Packaging: 600 Ml Cartridge (Sag resistant paste)\n` +
          `• Standard: ASTM C920 compliant\n` +
          `• Colors: Grey or White\n` +
          `• Elongation: 600% | Tensile Strength: > 250 PSI\n` +
          `• Foot Traffic: 24 Hours\n` +
          `• Theoretical Coverage:\n` +
          `  - 20x12 mm joint: 2.50 m per cartridge\n` +
          `  - 25x12 mm joint: 1.99 m per cartridge\n` +
          `  - 12x12 mm joint: 4.15 m per cartridge\n` +
          `• Use: Expansion joints in concrete bridges, floors, roofs, clean rooms.\n\n` +
          `TDS file Library mein available hai.`,
        actionType: 'DOCUMENT_LINK',
        actionData: { documentId: doc?.id || 'doc_conflex_pu_600', title: 'ConFlex PU 600 TDS' },
        suggestedReplies: ['ConBond SBR MSDS', 'Thank you message likhein', 'New order banayein'],
      };
    }

    if (q.includes('conbond') || q.includes('sbr')) {
      const doc = ctx.techDocs.find(d => d.productName?.toLowerCase().includes('conbond'));
      return {
        reply: `ConBond SBR (Polymer Bonding Agent MSDS) verified maloomat:\n\n` +
          `• SDS Number: SDSPK027 (Revision 30.04.2021)\n` +
          `• Nature: Aqueous dispersion of styrene, butadiene, rubber polymer\n` +
          `• Solid Content: 38 – 50% | pH: 6 – 9 (25°C)\n` +
          `• Density: 1.1 - 1.3 g/cm³\n` +
          `• Safety Precaution: Wear protective gloves (H317 skin sensitization). Wash skin immediately with water and soap; do not use organic solvents.\n\n` +
          `MSDS document Library mein mojood hai.`,
        actionType: 'DOCUMENT_LINK',
        actionData: { documentId: doc?.id || 'doc_conbond_sbr', title: 'ConBond SBR MSDS' },
        suggestedReplies: ['Tiger Shell Black TDS', 'Document Library'],
      };
    }
  }

  // ──────────────────────────────────────────────
  // CASE 4: MY ORDERS & PERSONAL STATS (STRICT RBAC)
  // ──────────────────────────────────────────────
  if (q.includes('order') || q.includes('sale') || q.includes('stats') || q.includes('performance') || q.includes('status')) {
    if (ctx.isManagement) {
      const totalCount = ctx.userOrders.length;
      return {
        reply: `Executive Summary: System mein is waqt ${totalCount} orders dastiyab hain. Boss, Controller aur Finance Manager ko company-wide orders, rates review, aur delivery records ki mukammal rasai hasil hai.`,
        actionType: 'NAVIGATE',
        actionData: { path: '/orders' },
        suggestedReplies: ['Rates review dekhein', 'Delivery schedule', 'Thank you message likhein'],
      };
    } else {
      const myCount = ctx.userOrders.length;
      return {
        reply: `Assalam-o-Alaikum ${ctx.user.name} Sahab! Aap ke book kiye gaye kul ${myCount} orders recorded hain. RBAC policy ke tehat aap sirf apne orders aur apni sales performance ka data dekh sakte hain.`,
        actionType: 'NAVIGATE',
        actionData: { path: '/orders' },
        suggestedReplies: ['Naya order book karein', 'Customer ke liye thank-you message likhein', 'Voice order record karein'],
      };
    }
  }

  // ──────────────────────────────────────────────
  // CASE 5: HOW TO USE SAFE ORDER HUB (HELP)
  // ──────────────────────────────────────────────
  if (q.includes('help') || q.includes('kaise') || q.includes('guide') || q.includes('tariqa') || q.includes('karna')) {
    return {
      reply: `SAFE ORDER HUB par aap yeh ahem kaam asani se kar sakte hain:\n\n` +
        `1. ＋ New Order: Free-text product name, packing, quantity aur rate enter kar ke order book karein.\n` +
        `2. 🎙️ Voice Order: Urdu ya Roman Urdu mein voice note record karein, system transcript bana kar verify karne dega.\n` +
        `3. 📄 Technical Library: Radiant Construction Technologies ke official TDS aur MSDS documents preview aur download karein.\n` +
        `4. 💬 Customer Templates: 10 mukhtalif categories ke WhatsApp messages copy aur send karein.\n` +
        `5. 👤 Profile Settings: Apna photo, phone, theme aur password tabdeel karein.\n\n` +
        `Aap mujh se kisi bhi waqt Roman Urdu ya English mein madad le sakte hain!`,
      suggestedReplies: ['Customer message likhein', 'Technical Library kholein', 'Voice Order kaise record karein?'],
    };
  }

  // ──────────────────────────────────────────────
  // DEFAULT GRACEFUL & PROFESSIONAL PAKISTANI URDU RESPONSE
  // ──────────────────────────────────────────────
  return {
    reply: `Assalam-o-Alaikum! Main Safe Copilot hoon — SAFE SOLUTIONS ki digital assistant. 

Main aap ko customer thank-you messages, WhatsApp replies, Technical Data Sheets (Tiger Shell Black, ConBond SBR, ConFloor Hardtop, ConFlex PU 600), orders summary, aur SAFE ORDER HUB ke istemaal mein madad faraham kar sakti hoon.

Barah-e-karam batayein main aap ki kis tarah rehnumai kar sakti hoon?`,
    suggestedReplies: [
      'Customer ke liye thank-you message likh do',
      'Tiger Shell Black ki coverage batao',
      'ConFloor Hardtop ka dosage kiya hai?',
      'New order kaise book karein?'
    ],
  };
}
