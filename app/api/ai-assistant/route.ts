import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { Order, OrderStatus, User } from '@/lib/types';
import { generateThankYouMessage, ThankYouStyle } from '@/lib/whatsapp';

function getSalutation(user: User): string {
  if (user.role === 'BOSS') return 'Boss sahib';
  if (user.role === 'CONTROLLER') return 'Controller sahib';
  if (user.role === 'MANAGER') return 'Manager sahiba';
  return 'Janab';
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can access AI Assistant' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, query, employeeName, orderId, clientPhone, controllerPhone, style, note } = body;

    const allOrders = db.getOrders({ role: 'BOSS' });
    const allUsers = db.getUsers();
    const allProducts = db.getProducts();
    const salutation = getSalutation(user);
    const defaultSenderPhone = user.phone || (user.role === 'MANAGER' ? '03006646124' : '03468760963');

    // ─────────────────────────────────────────────────────────────
    // 1. ACTION: UPDATE ORDER STATUS / DELIVER (Direct API Call)
    // ─────────────────────────────────────────────────────────────
    if (action === 'mark_status' || action === 'mark_delivered') {
      const targetStatus: OrderStatus = (body.status as OrderStatus) || 'DELIVERED';
      const empQuery = (employeeName || '').toLowerCase().trim();

      let targetOrders: Order[] = allOrders;

      if (orderId) {
        targetOrders = allOrders.filter(o => 
          o.id === orderId || 
          o.orderNumber.toLowerCase() === orderId.toLowerCase() ||
          o.orderNumber.toLowerCase().endsWith(orderId.toLowerCase())
        );
      } else if (empQuery) {
        targetOrders = allOrders.filter(o => 
          o.orderTakenByName.toLowerCase().includes(empQuery) && 
          o.status !== targetStatus && 
          o.status !== 'CANCELLED'
        );
      }

      if (targetOrders.length === 0) {
        const matchingOrders = allOrders.filter(o => o.orderTakenByName.toLowerCase().includes(empQuery));
        if (matchingOrders.length > 0) {
          return NextResponse.json({
            success: true,
            updatedCount: 0,
            spokenText: `Ji ${salutation}, ${employeeName || 'is staff member'} ke tamam ${matchingOrders.length} orders pehle se '${matchingOrders[0].status}' hain. Mazeed koi pending order nahi mila.`,
            message: `All orders for ${employeeName || 'employee'} are already updated.`,
          });
        }
        return NextResponse.json({
          success: false,
          updatedCount: 0,
          spokenText: `Koi matching order nahi mila jisko '${targetStatus}' mark kiya ja sakay.`,
          message: `No eligible orders found for ${employeeName || 'specified criteria'}.`,
        });
      }

      const updatedOrders = [];
      for (const ord of targetOrders) {
        const updated = db.updateOrderStatus(
          ord.id,
          targetStatus,
          { id: user.id, name: user.name, role: user.role },
          `Status changed to ${targetStatus} via SAFE AI Assistant by ${user.name}`
        );
        if (updated) updatedOrders.push(updated);
      }

      const empDisplay = targetOrders[0]?.orderTakenByName || employeeName || 'Orders';
      const spoken = `Ji ${salutation}! ${empDisplay} ke ${updatedOrders.length} orders ko '${targetStatus}' mark kar diya gaya hai. Record mukammal tor par update ho chuka hai.`;

      return NextResponse.json({
        success: true,
        updatedCount: updatedOrders.length,
        updatedOrders,
        spokenText: spoken,
        message: `Successfully updated ${updatedOrders.length} order(s) to ${targetStatus}.`,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ACTION: GENERATE CLIENT THANK YOU MESSAGE (Multi-template)
    // ─────────────────────────────────────────────────────────────
    if (action === 'thank_you_message') {
      let targetOrder = allOrders[0]; // most recent order default
      if (orderId) {
        targetOrder = allOrders.find(o => 
          o.id === orderId || 
          o.orderNumber.toLowerCase() === orderId.toLowerCase() ||
          o.orderNumber.toLowerCase().endsWith(orderId.toLowerCase())
        ) || allOrders[0];
      } else if (body.customerName) {
        const cQuery = body.customerName.toLowerCase().trim();
        targetOrder = allOrders.find(o => 
          o.customerName.toLowerCase().includes(cQuery) || 
          o.companyName.toLowerCase().includes(cQuery)
        ) || allOrders[0];
      }

      if (!targetOrder) {
        return NextResponse.json({
          success: false,
          spokenText: `Ji ${salutation}, abhi system mein koi order record nahi mila jisko Thank You message bheja ja sakay.`,
          message: 'No orders available.',
        });
      }

      const cPhone = controllerPhone || defaultSenderPhone;
      const clientContact = clientPhone || targetOrder.customerWhatsapp || targetOrder.customerPhone || '';
      const chosenStyle: ThankYouStyle = style || 'EXECUTIVE';

      const messageText = generateThankYouMessage({
        order: targetOrder,
        style: chosenStyle,
        controllerName: user.name,
        controllerDesignation: user.designation,
        controllerPhone: cPhone,
      });

      let cleanPhone = clientContact.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '92' + cleanPhone.slice(1);
      }

      const whatsappUrl = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

      const spoken = `Client ${targetOrder.customerName} ke liye Thank You text tayyar hai. Contact number ${cPhone} shaamil hai.`;

      return NextResponse.json({
        success: true,
        order: targetOrder,
        clientPhone: clientContact,
        cleanPhone,
        controllerPhone: cPhone,
        messageText,
        whatsappUrl,
        style: chosenStyle,
        spokenText: spoken,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ACTION: LOG THANK YOU MESSAGE DISPATCH IN AUDIT HISTORY
    // ─────────────────────────────────────────────────────────────
    if (action === 'log_thank_you') {
      const { targetOrderId, targetPhone, chosenStyle } = body;
      if (targetOrderId) {
        db.addOrderAuditNote(
          targetOrderId,
          `Client Thank You Message (${chosenStyle || 'EXECUTIVE'}) sent to ${targetPhone || 'Client'} by ${user.name}`,
          { id: user.id, name: user.name }
        );
      }
      return NextResponse.json({ success: true, message: 'Logged to audit trail.' });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. ACTION: FULL TEAM DASHBOARD OVERVIEW & ACCESS
    // ─────────────────────────────────────────────────────────────
    if (action === 'team_summary') {
      const salesUsers = allUsers.filter(u => ['AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'].includes(u.role));
      
      const teamBreakdown = salesUsers.map(emp => {
        const empOrders = allOrders.filter(o => o.orderTakenById === emp.id);
        const totalSales = empOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const delivered = empOrders.filter(o => o.status === 'DELIVERED').length;
        const pending = empOrders.filter(o => ['NEW', 'RATE_REVIEW', 'CONFIRMED', 'PREPARING', 'DISPATCHED'].includes(o.status)).length;

        return {
          id: emp.id,
          name: emp.name,
          designation: emp.designation,
          phone: emp.phone,
          vehicle: emp.vehicle,
          avatar: emp.avatar,
          totalOrders: empOrders.length,
          delivered,
          pending,
          totalSales,
        };
      });

      const totalOrdersCount = allOrders.length;
      const totalRevenue = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
      const pendingCount = allOrders.filter(o => ['NEW', 'RATE_REVIEW', 'CONFIRMED'].includes(o.status)).length;

      const spoken = `Executive report ${salutation}: Total ${totalOrdersCount} orders registered hain, jis ki kul raqam Rs. ${totalRevenue.toLocaleString()} hai. ${pendingCount} orders pending hain. Tamam sales team dashboards ka access active hai.`;

      return NextResponse.json({
        success: true,
        totalOrdersCount,
        totalRevenue,
        pendingCount,
        teamBreakdown,
        spokenText: spoken,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. ACTION: ADVANCED NATURAL LANGUAGE VOICE & TEXT COPILOT
    // ─────────────────────────────────────────────────────────────
    if (action === 'voice_query') {
      const q = (query || '').toLowerCase().trim();

      // A. GREETINGS
      if (q.includes('assalam') || q.includes('aslam') || q.includes('salam') || q.includes('slam') || q.includes('aoa') || q.includes('hello') || q.includes('hi ') || q === 'hi') {
        const spoken = `Walaikum Assalam ${salutation}! Main Safe Solutions ka AI Operations Officer hazir hoon. Aaj ka kya hukam hai? Orders update karne hain, client ko Thank You bhejna hai, ya team performance dekhni hai?`;
        return NextResponse.json({
          success: true,
          actionType: 'greeting',
          spokenText: spoken,
          message: spoken,
        });
      }

      // B. WELLBEING & CHIT-CHAT
      if (q.includes('kaise ho') || q.includes('kese ho') || q.includes('kya haal') || q.includes('theek ho') || q.includes('sunao') || q.includes('how are you')) {
        const spoken = `Alhamdulillah ${salutation}, main bilkul theek aur active hoon! Sabhi orders par live nazar rakhi hui hai. Aap farmayein, kis cheez ki report ya order update karna hai?`;
        return NextResponse.json({
          success: true,
          actionType: 'chit_chat',
          spokenText: spoken,
          message: spoken,
        });
      }

      // C. WHO ARE YOU / CAPABILITIES
      if (q.includes('kaun ho') || q.includes('kon ho') || q.includes('who are you') || q.includes('kya karte ho') || q.includes('help') || q.includes('madad')) {
        const spoken = `Main Safe Solutions ka Executive AI Operations Copilot hoon. Aap mujhe voice ya text se bol kar: orders confirm ya deliver karwa sakte hain, rate approve karwa sakte hain, kisi bhi employee ka record nikal sakte hain, aur client ko personalized Thank You WhatsApp bhej sakte hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'intro',
          spokenText: spoken,
          message: spoken,
        });
      }

      // D. DYNAMIC EMPLOYEE MATCHING
      // Matches ANY user from database dynamically
      let matchedEmp: User | null = null;
      for (const u of allUsers) {
        const nameParts = u.name.toLowerCase().split(/\s+/).filter(p => p.length > 2 && !['engr', 'mr', 'mian', 'sheikh'].includes(p));
        if (q.includes(u.name.toLowerCase()) || nameParts.some(part => q.includes(part))) {
          matchedEmp = u;
          break;
        }
      }

      // E. CHECK SPECIFIC ORDER BY NUMBER (e.g., "Order 1", "Order 00002", "Order SS-ORD-...")
      const orderNumMatch = q.match(/order\s*#?\s*([a-z0-9\-]+)/i);
      if (orderNumMatch && orderNumMatch[1]) {
        const rawTarget = orderNumMatch[1].trim();
        const foundOrder = allOrders.find(o => 
          o.orderNumber.toLowerCase() === rawTarget.toLowerCase() ||
          o.id.toLowerCase() === rawTarget.toLowerCase() ||
          o.orderNumber.toLowerCase().endsWith(rawTarget.toLowerCase()) ||
          o.orderNumber.replace(/\D/g, '').endsWith(rawTarget.replace(/\D/g, ''))
        );

        if (foundOrder && (q.includes('check') || q.includes('open') || q.includes('kholo') || q.includes('dekho') || q.includes('kya hai') || q.includes('status'))) {
          const spoken = `Order ${foundOrder.orderNumber}: ${foundOrder.customerName} (${foundOrder.city}) ke liye booked hai. Total raqam Rs. ${foundOrder.grandTotal.toLocaleString()} hai aur status '${foundOrder.status}' hai. Main details screen par open kar raha hoon.`;
          return NextResponse.json({
            success: true,
            actionType: 'open_order',
            order: foundOrder,
            spokenText: spoken,
            message: spoken,
          });
        }
      }

      // F. ACTION COMMAND: STATUS UPDATES (DELIVER, CONFIRM, PREPARING, DISPATCH, CANCEL)
      const isDeliverAction = q.includes('deliver') || q.includes('delivered') || q.includes('pohnch gaya') || q.includes('bhej diye') || q.includes('mal pohnch gaya');
      const isConfirmAction = q.includes('confirm') || q.includes('manzoor') || q.includes('approve') || q.includes('pass karo');
      const isPreparingAction = q.includes('prepare') || q.includes('preparing') || q.includes('pack kar') || q.includes('tayyar');
      const isDispatchAction = q.includes('dispatch') || q.includes('rawana') || q.includes('gari nikal');
      const isCancelAction = q.includes('cancel') || q.includes('mansookh') || q.includes('radd');
      const isRateApproveAction = q.includes('rate approve') || q.includes('special rate') || q.includes('rate pass');

      // Status update target
      let targetStatusToSet: OrderStatus | null = null;
      if (isDeliverAction) targetStatusToSet = 'DELIVERED';
      else if (isConfirmAction || isRateApproveAction) targetStatusToSet = 'CONFIRMED';
      else if (isPreparingAction) targetStatusToSet = 'PREPARING';
      else if (isDispatchAction) targetStatusToSet = 'DISPATCHED';
      else if (isCancelAction) targetStatusToSet = 'CANCELLED';

      if (targetStatusToSet && (matchedEmp || q.includes('all') || q.includes('tamam') || q.includes('sab') || q.includes('pending') || orderNumMatch)) {
        let ordersToUpdate = allOrders;

        // If specific order number
        if (orderNumMatch && orderNumMatch[1]) {
          const rawTarget = orderNumMatch[1].trim();
          ordersToUpdate = allOrders.filter(o => 
            o.orderNumber.toLowerCase() === rawTarget.toLowerCase() ||
            o.id.toLowerCase() === rawTarget.toLowerCase() ||
            o.orderNumber.replace(/\D/g, '').endsWith(rawTarget.replace(/\D/g, ''))
          );
        } else if (matchedEmp) {
          ordersToUpdate = allOrders.filter(o => 
            o.orderTakenById === matchedEmp!.id &&
            o.status !== targetStatusToSet &&
            o.status !== 'CANCELLED'
          );
        } else if (q.includes('pending') || q.includes('new') || q.includes('naye')) {
          ordersToUpdate = allOrders.filter(o => ['NEW', 'RATE_REVIEW'].includes(o.status));
        } else {
          ordersToUpdate = allOrders.filter(o => o.status !== targetStatusToSet && o.status !== 'CANCELLED');
        }

        if (ordersToUpdate.length === 0) {
          const targetName = matchedEmp ? matchedEmp.name : 'criteria';
          return NextResponse.json({
            success: true,
            spokenText: `Ji ${salutation}, ${targetName} ke mutabiq koi aisa pending order nahi mila jisko '${targetStatusToSet}' mark kiya ja sakay.`,
            message: `No matching pending orders found.`,
          });
        }

        const updated = [];
        for (const ord of ordersToUpdate) {
          const res = db.updateOrderStatus(
            ord.id,
            targetStatusToSet,
            { id: user.id, name: user.name, role: user.role },
            `Updated to ${targetStatusToSet} via SAFE AI Assistant by ${user.name}`
          );
          if (res) updated.push(res);
        }

        const targetSubject = matchedEmp ? matchedEmp.name : `${updated.length} orders`;
        const spoken = `Ji bilkul ${salutation}! ${targetSubject} ke ${updated.length} orders ko '${targetStatusToSet}' mark kar diya gaya hai. Record live update ho chuka hai.`;

        return NextResponse.json({
          success: true,
          actionType: 'status_updated',
          updatedCount: updated.length,
          updatedStatus: targetStatusToSet,
          spokenText: spoken,
          message: spoken,
        });
      }

      // G. THANK YOU MESSAGE GENERATION
      const isThankYouIntent = q.includes('thank') || q.includes('shukriya') || q.includes('client ko text') || q.includes('msg bhejo') || q.includes('message banao') || q.includes('whatsapp bhejo');
      if (isThankYouIntent) {
        let targetOrder = allOrders[0];

        if (matchedEmp) {
          targetOrder = allOrders.find(o => o.orderTakenById === matchedEmp!.id) || targetOrder;
        } else if (orderNumMatch && orderNumMatch[1]) {
          const raw = orderNumMatch[1].trim();
          targetOrder = allOrders.find(o => o.orderNumber.includes(raw) || o.id.includes(raw)) || targetOrder;
        }

        // Style selection based on keywords
        let chosenStyle: ThankYouStyle = 'EXECUTIVE';
        if (q.includes('urdu') || q.includes('vip') || q.includes('khusoosi')) {
          chosenStyle = 'VIP_URDU';
        } else if (q.includes('dispatch') || q.includes('tracking') || q.includes('gari')) {
          chosenStyle = 'DISPATCH_ALERT';
        } else if (q.includes('short') || q.includes('mukhtasir')) {
          chosenStyle = 'SHORT';
        }

        const cPhone = defaultSenderPhone;
        const msgText = generateThankYouMessage({
          order: targetOrder,
          style: chosenStyle,
          controllerName: user.name,
          controllerDesignation: user.designation,
          controllerPhone: cPhone,
        });

        let cleanPhone = (targetOrder.customerWhatsapp || targetOrder.customerPhone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.slice(1);

        const whatsappUrl = cleanPhone 
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msgText)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(msgText)}`;

        return NextResponse.json({
          success: true,
          actionType: 'thank_you',
          order: targetOrder,
          messageText: msgText,
          whatsappUrl,
          style: chosenStyle,
          spokenText: `Client ${targetOrder.customerName} ke liye '${chosenStyle}' style Thank You text tayyar hai. Contact number ${cPhone} shaamil kar diya hai.`,
        });
      }

      // H. EMPLOYEE PERFORMANCE STATS (e.g., "Adnan ke kitne order hain", "Shahzaib ki performance")
      if (matchedEmp && (q.includes('kitne') || q.includes('status') || q.includes('record') || q.includes('performance') || q.includes('sales') || q.includes('kya kiya'))) {
        const empOrders = allOrders.filter(o => o.orderTakenById === matchedEmp!.id);
        const empDelivered = empOrders.filter(o => o.status === 'DELIVERED').length;
        const empPending = empOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
        const empSales = empOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

        const spoken = `${matchedEmp.name} (${matchedEmp.designation}) ne kul ${empOrders.length} orders book kiye hain, jis ki kul value Rs. ${empSales.toLocaleString()} hai. In mein se ${empDelivered} delivered hain aur ${empPending} pending hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'emp_stats',
          employee: matchedEmp,
          spokenText: spoken,
          message: spoken,
        });
      }

      // I. CITY SPECIFIC ORDERS (e.g. "Lahore ke orders", "Faisalabad ke kitne order hain")
      const majorCities = ['lahore', 'faisalabad', 'islamabad', 'rawalpindi', 'multan', 'gujranwala', 'sialkot', 'karachi', 'peshawar', 'sargodha'];
      const matchedCity = majorCities.find(c => q.includes(c));
      if (matchedCity) {
        const cityOrders = allOrders.filter(o => (o.city || '').toLowerCase().includes(matchedCity));
        const cityRevenue = cityOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const cityPending = cityOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

        const cityNameCapital = matchedCity.charAt(0).toUpperCase() + matchedCity.slice(1);
        const spoken = `${cityNameCapital} ke total ${cityOrders.length} orders darj hain, jinki kul maliyat Rs. ${cityRevenue.toLocaleString()} hai. In mein se ${cityPending} orders pending hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'city_stats',
          city: cityNameCapital,
          spokenText: spoken,
          message: spoken,
        });
      }

      // J. URGENT & CRITICAL ORDERS
      if (q.includes('urgent') || q.includes('critical') || q.includes('zaruri') || q.includes('emergency')) {
        const urgentOrders = allOrders.filter(o => (o.urgency === 'URGENT' || o.urgency === 'CRITICAL') && o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
        if (urgentOrders.length === 0) {
          const spoken = `Janab, is waqt koi urgent ya critical delivery pending nahi hai. Tamam orders normal pace par hain.`;
          return NextResponse.json({ success: true, actionType: 'urgent_list', spokenText: spoken, message: spoken });
        }

        const spoken = `Is waqt ${urgentOrders.length} urgent orders hain jo foran tawajah chahte hain. Sub se ahem order ${urgentOrders[0].customerName} (${urgentOrders[0].city}) ka hai worth Rs. ${urgentOrders[0].grandTotal.toLocaleString()}.`;
        return NextResponse.json({
          success: true,
          actionType: 'urgent_list',
          orders: urgentOrders,
          spokenText: spoken,
          message: spoken,
        });
      }

      // K. RATE REVIEW & SPECIAL RATES
      if (q.includes('rate review') || q.includes('special rate') || q.includes('kam rate') || q.includes('approval')) {
        const rateReviewOrders = allOrders.filter(o => o.status === 'RATE_REVIEW');
        if (rateReviewOrders.length === 0) {
          const spoken = `Koi bhi order Rate Review mein nahi phansa hua. Sab rates standard approved hain.`;
          return NextResponse.json({ success: true, actionType: 'rate_review', spokenText: spoken, message: spoken });
        }

        const spoken = `${rateReviewOrders.length} orders Management ki Rate Review approval ke muntazir hain. Pehla order ${rateReviewOrders[0].orderNumber} (${rateReviewOrders[0].orderTakenByName}) ka hai.`;
        return NextResponse.json({
          success: true,
          actionType: 'rate_review',
          orders: rateReviewOrders,
          spokenText: spoken,
          message: spoken,
        });
      }

      // L. TOP SALESPERSON / LEADERBOARD
      if (q.includes('sab se zyada') || q.includes('top sales') || q.includes('best sales') || q.includes('leaderboard') || q.includes('sab se agay')) {
        const salesUsers = allUsers.filter(u => ['AREA_SALES_MANAGER', 'MARKETING_EXECUTIVE', 'SALES_PERSON'].includes(u.role));
        const leaderboard = salesUsers.map(emp => {
          const totalSales = allOrders.filter(o => o.orderTakenById === emp.id).reduce((s, o) => s + (o.grandTotal || 0), 0);
          return { name: emp.name, totalSales };
        }).sort((a, b) => b.totalSales - a.totalSales);

        if (leaderboard.length > 0) {
          const top = leaderboard[0];
          const spoken = `Is waqt sab se zyada sales ${top.name} ki hain jinhon ne Rs. ${top.totalSales.toLocaleString()} ka business kiya hai.`;
          return NextResponse.json({ success: true, actionType: 'top_sales', spokenText: spoken, message: spoken });
        }
      }

      // M. PRODUCT PRICING & STOCK CHECK
      const matchedProduct = allProducts.find(p => q.includes(p.name.toLowerCase()) || q.includes(p.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
      if (matchedProduct || q.includes('product') || q.includes('item') || q.includes('rate list')) {
        if (matchedProduct) {
          const spoken = `${matchedProduct.name} ka standard rate Rs. ${matchedProduct.standardRate.toLocaleString()} per ${matchedProduct.unit} hai, aur minimum allowed rate Rs. ${matchedProduct.minAllowedRate.toLocaleString()} hai. Stock status: ${matchedProduct.inStock ? 'Available' : 'Out of stock'}.`;
          return NextResponse.json({
            success: true,
            actionType: 'product_info',
            product: matchedProduct,
            spokenText: spoken,
            message: spoken,
          });
        }
      }

      // N. OVERALL COUNTS & TODAY'S TOTALS
      if (q.includes('kitne order') || q.includes('pending') || q.includes('aaj ke') || q.includes('summary') || q.includes('overview') || q.includes('kul raqam') || q.includes('total sales')) {
        const pending = allOrders.filter(o => ['NEW', 'RATE_REVIEW', 'CONFIRMED', 'PREPARING'].includes(o.status));
        const delivered = allOrders.filter(o => o.status === 'DELIVERED');
        const totalSales = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const latest = allOrders[0];

        let spoken = `Janab, is waqt system mein kul ${allOrders.length} orders darj hain jinki kul value Rs. ${totalSales.toLocaleString()} hai. ${pending.length} orders pending hain aur ${delivered.length} delivered ho chuke hain.`;
        if (latest) {
          spoken += ` Sab se taaza order ${latest.orderTakenByName} ne ${latest.companyName || latest.customerName} ke liye book kiya hai.`;
        }

        return NextResponse.json({
          success: true,
          actionType: 'status_count',
          spokenText: spoken,
          message: spoken,
        });
      }

      // O. CONTEXTUAL RESPECTFUL FALLBACK
      return NextResponse.json({
        success: true,
        spokenText: `Ji ${salutation}, main ne sun liya hai. Main Safe Solutions ka AI Operations Copilot hoon. Aap mujhe orders confirm ya deliver karne, kisi bhi staff member ka record dekhne, ya client ko Thank You text bhejne ka hukam de sakte hain.`,
        message: 'Safe AI Officer listening...',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI Assistant operation failed' }, { status: 500 });
  }
}
