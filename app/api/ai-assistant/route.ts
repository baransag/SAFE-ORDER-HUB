import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { Order, OrderStatus, User } from '@/lib/types';
import { generateThankYouMessage, ThankYouStyle } from '@/lib/whatsapp';

function getSalutation(user: User): string {
  if (user.role === 'BOSS') return 'Boss sahib';
  if (user.role === 'CONTROLLER') return 'Controller sahib';
  if (user.role === 'MANAGER') return 'Manager sahiba';
  return user.name.split(' ')[0];
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fullAccess = isFullAccess(user.role);

  try {
    const body = await req.json();
    const { action, query, employeeName, orderId, clientPhone, controllerPhone, style, note, confirmedAction } = body;

    const allOrders = await db.getOrders({ role: user.role, userId: user.id });
    const allUsers = fullAccess ? await db.getUsers() : [];
    const allProducts = await db.getProducts();
    const salutation = getSalutation(user);
    const defaultSenderPhone = user.phone || '03468760963';

    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: EXECUTE HUMAN-CONFIRMED ACTION (Zero Silent Action)
    // ─────────────────────────────────────────────────────────────
    if (action === 'execute_confirmed_action') {
      if (!confirmedAction) {
        return NextResponse.json({ error: 'No confirmed action payload provided' }, { status: 400 });
      }

      if (confirmedAction.type === 'CREATE_ORDER') {
        const p = confirmedAction.payload;
        if (!p.companyName || !p.items || p.items.length === 0) {
          return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
        }

        // Re-check products in authoritative database
        const prod = allProducts.find(prodItem => prodItem.id === p.items[0].productId) || allProducts[0];
        const qty = Number(p.items[0].quantity) || 1;
        const rate = Number(p.items[0].offeredRate) || prod.standardRate;
        const total = qty * rate;

        const customer = await db.findOrCreateCustomer({
          name: p.customerName || p.companyName,
          companyName: p.companyName,
          phone: p.customerPhone || '0300-0000000',
          city: p.city || 'Lahore',
          deliveryAddress: p.deliveryAddress || p.city || 'Lahore',
          customerType: 'NEW',
        }, { id: user.id, name: user.name });

        const isBelowMin = rate < prod.minAllowedRate;

        const newOrder = await db.createOrder({
          customerId: customer.id,
          customerName: customer.name,
          companyName: customer.companyName,
          customerPhone: customer.phone,
          city: customer.city,
          deliveryAddress: customer.deliveryAddress,
          customerType: 'NEW',
          items: [{
            id: `itm_${Date.now()}`,
            productId: prod.id,
            productName: prod.name,
            packing: prod.defaultPacking,
            unit: prod.unit,
            quantity: qty,
            standardRate: prod.standardRate,
            offeredRate: rate,
            discount: Math.max(0, (prod.standardRate - rate) * qty),
            totalAmount: total,
            isSpecialRate: isBelowMin,
          }],
          subtotal: total,
          discountTotal: Math.max(0, (prod.standardRate - rate) * qty),
          grandTotal: total,
          paymentStatus: p.paymentStatus || 'PENDING',
          requiredDeliveryDate: p.requiredDeliveryDate || new Date().toISOString().split('T')[0],
          urgency: 'NORMAL',
          status: isBelowMin ? 'RATE_REVIEW' : 'NEW',
          specialRateApproved: !isBelowMin,
          orderTakenById: user.id,
          orderTakenByName: user.name,
          orderTakenByEmail: user.email,
          orderTakenByPhone: user.phone,
          remarks: `Order booked via Safe Copilot by ${user.name}`,
        });

        return NextResponse.json({
          success: true,
          actionType: 'order_created',
          order: newOrder,
          spokenText: `Ji ${salutation}, order ${newOrder.orderNumber} ${newOrder.companyName} ke liye kamyabi se book ho gaya hai!`,
          message: `Order ${newOrder.orderNumber} successfully booked for ${newOrder.companyName} (Rs. ${newOrder.grandTotal.toLocaleString()}).`,
        });
      }

      if (confirmedAction.type === 'UPDATE_STATUS') {
        if (!fullAccess) {
          return NextResponse.json({ error: 'Permission denied: Only Management can update order status' }, { status: 403 });
        }

        // Re-check current database state
        const targetOrder = await db.getOrderById(confirmedAction.orderId);
        if (!targetOrder) {
          return NextResponse.json({ error: 'Order not found in database' }, { status: 404 });
        }

        const updated = await db.updateOrderStatus(
          targetOrder.id,
          confirmedAction.targetStatus as OrderStatus,
          { id: user.id, name: user.name, role: user.role },
          `Status updated to ${confirmedAction.targetStatus} via Safe Copilot`
        );

        return NextResponse.json({
          success: true,
          actionType: 'status_updated',
          order: updated,
          spokenText: `Ji ${salutation}, order ${updated?.orderNumber || ''} ka status '${confirmedAction.targetStatus}' update kar diya gaya hai.`,
          message: `Order status changed to ${confirmedAction.targetStatus}.`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: NATURAL LANGUAGE COPILOT (PERMISSION-AWARE)
    // ─────────────────────────────────────────────────────────────
    if (action === 'voice_query' || action === 'query') {
      const q = (query || '').toLowerCase().trim();

      // A. GREETINGS
      if (q.includes('assalam') || q.includes('aslam') || q.includes('salam') || q.includes('aoa') || q.includes('hello') || q.includes('hi ') || q === 'hi') {
        const spoken = `Walaikum Assalam ${salutation}! Main Safe Copilot hoon. Aaj aap ki kya madad kar sakta hoon? Orders, rates, ya system help ke mutaliq poochiye.`;
        return NextResponse.json({
          success: true,
          actionType: 'greeting',
          spokenText: spoken,
          message: spoken,
        });
      }

      // B. RBAC ENFORCEMENT FOR SENSITIVE QUESTIONS
      if (!fullAccess && (q.includes('all employees') || q.includes('sab employees') || q.includes('sab ki sales') || q.includes('total company') || q.includes('financial report') || q.includes('audit log'))) {
        const msg = `Janab ${salutation}, aap ke paas company-wide sales metrics aur administrative reports access karne ki permission nahi hai. Aap apne zati orders aur product rates pooch sakte hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'permission_denied',
          spokenText: msg,
          message: msg,
        });
      }

      // C. HOW TO CREATE AN ORDER
      if (q.includes('order kaise') || q.includes('how to create') || q.includes('naya order') || q.includes('help')) {
        const spoken = `Naya order banane ke liye upar '+ NEW ORDER' button dabayein. Step 1 mein client ka naam aur shehr chunein, Step 2 mein product aur quantity enter karein, aur Step 5 par submit kar dein.`;
        return NextResponse.json({
          success: true,
          actionType: 'help',
          spokenText: spoken,
          message: spoken,
        });
      }

      // D. PARSE INTENT TO CREATE ORDER VIA COPILOT WITH HUMAN CONFIRMATION CARD
      if (q.includes('order bana') || q.includes('order book') || q.includes('create order')) {
        // Find product
        const matchedProd = allProducts.find(p => q.includes(p.name.toLowerCase()) || q.includes(p.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
        const prod = matchedProd || allProducts[0];

        // Extract quantity if mentioned
        const qtyMatch = q.match(/(\d+)\s*(boxes|box|bucket|can|roll|sausage|units|peice|pcs)?/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;

        // Extract rate if mentioned
        const rateMatch = q.match(/rate\s*(\d+)/i) || q.match(/rs\.?\s*(\d+)/i);
        const rate = rateMatch ? parseInt(rateMatch[1], 10) : prod.standardRate;

        // Extract city if mentioned
        const cities = ['lahore', 'faisalabad', 'islamabad', 'rawalpindi', 'multan', 'gujranwala', 'karachi'];
        const cityMatch = cities.find(c => q.includes(c)) || 'Lahore';
        const cityCap = cityMatch.charAt(0).toUpperCase() + cityMatch.slice(1);

        // Extract client name if mentioned
        let clientGuess = 'Direct Client';
        const clientMatch = q.match(/(?:for|ka|ki)\s+([a-zA-Z0-9\s]+?)(?:\s+ka|\s+order|\s+rate|\s+delivery|\s+in|$)/i);
        if (clientMatch && clientMatch[1]) {
          clientGuess = clientMatch[1].trim();
        }

        const total = qty * rate;

        return NextResponse.json({
          success: true,
          actionType: 'confirm_order_draft',
          requiresConfirmation: true,
          confirmationCard: {
            title: 'Confirm Order Booking',
            client: clientGuess,
            product: prod.name,
            quantity: `${qty} ${prod.unit}`,
            rate: `Rs. ${rate.toLocaleString()}`,
            city: cityCap,
            total: `Rs. ${total.toLocaleString()}`,
          },
          confirmedAction: {
            type: 'CREATE_ORDER',
            payload: {
              companyName: clientGuess,
              customerName: clientGuess,
              city: cityCap,
              total,
              items: [{
                id: `itm_${Date.now()}`,
                productId: prod.id,
                productName: prod.name,
                packing: prod.defaultPacking,
                unit: prod.unit,
                quantity: qty,
                standardRate: prod.standardRate,
                offeredRate: rate,
                discount: 0,
                totalAmount: total,
                isSpecialRate: rate < prod.minAllowedRate,
              }]
            }
          },
          spokenText: `${clientGuess} ke liye ${prod.name} ka order details screen par tayyar hain. Baraye meherbani Confirm karein.`,
          message: `Please confirm order booking details below.`,
        });
      }

      // E. PRODUCT RATES & CATALOG
      const matchedProduct = allProducts.find(p => q.includes(p.name.toLowerCase()));
      if (matchedProduct || q.includes('rate') || q.includes('keemat') || q.includes('price')) {
        if (matchedProduct) {
          const spoken = `${matchedProduct.name} ka standard rate Rs. ${matchedProduct.standardRate.toLocaleString()} per ${matchedProduct.unit} hai, aur minimum allowed rate Rs. ${matchedProduct.minAllowedRate.toLocaleString()} hai.`;
          return NextResponse.json({
            success: true,
            actionType: 'product_info',
            product: matchedProduct,
            spokenText: spoken,
            message: spoken,
          });
        }
      }

      // F. TODAY'S ORDERS & RECENT ORDERS
      if (q.includes('aaj ke') || q.includes('today') || q.includes('mera aaj') || q.includes('aaj ka order')) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = allOrders.filter(o => o.createdAt.startsWith(todayStr));
        const totalAmt = todayOrders.reduce((s, o) => s + o.grandTotal, 0);

        const spoken = fullAccess
          ? `Ji ${salutation}, aaj company ke total ${todayOrders.length} orders booked hue hain, jinki kul maliyat Rs. ${totalAmt.toLocaleString()} hai.`
          : `Aap ne aaj ${todayOrders.length} orders submit kiye hain, jis ki kul value Rs. ${totalAmt.toLocaleString()} hai.`;

        return NextResponse.json({
          success: true,
          actionType: 'status_count',
          spokenText: spoken,
          message: spoken,
        });
      }

      // G. PENDING DELIVERIES
      if (q.includes('pending delivery') || q.includes('pending order') || q.includes('in transit')) {
        const pending = allOrders.filter(o => ['NEW', 'RATE_REVIEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED'].includes(o.status));
        const spoken = `Is waqt ${pending.length} orders delivery aur processing stage par hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'pending_list',
          spokenText: spoken,
          message: spoken,
        });
      }

      // H. EXECUTIVE SUMMARY (Only for Boss / Controller / Manager)
      if (fullAccess && (q.includes('summary') || q.includes('month sales') || q.includes('kul raqam') || q.includes('september sales'))) {
        const totalSales = allOrders.reduce((s, o) => s + o.grandTotal, 0);
        const delivered = allOrders.filter(o => o.status === 'DELIVERED').length;
        const spoken = `Executive summary ${salutation}: Kul ${allOrders.length} orders darj hain, total volume Rs. ${totalSales.toLocaleString()} hai. ${delivered} orders kamyabi se deliver ho chuke hain.`;

        return NextResponse.json({
          success: true,
          actionType: 'exec_summary',
          spokenText: spoken,
          message: spoken,
        });
      }

      // I. FALLBACK CONTEXTUAL HELP
      const fallback = `Main Safe Solutions ka Copilot hoon. Aap mujh se orders, rates, client delivery status, ya naya order confirm karwane ke mutaliq pooch sakte hain.`;
      return NextResponse.json({
        success: true,
        actionType: 'fallback',
        spokenText: fallback,
        message: fallback,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Safe Copilot failed' }, { status: 500 });
  }
}
