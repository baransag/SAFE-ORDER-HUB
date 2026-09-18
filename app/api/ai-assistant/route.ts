import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrderStatus } from '@/lib/types';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Only Boss, Controller, or Manager can access AI Assistant' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, query, employeeName, orderId, clientPhone, controllerPhone } = body;

    const allOrders = db.getOrders({ role: 'BOSS' });
    const allUsers = db.getUsers();

    // 1. ACTION: MARK ORDERS AS DELIVERED / CONFIRMED
    if (action === 'mark_status' || action === 'mark_delivered') {
      const targetStatus: OrderStatus = (body.status as OrderStatus) || 'DELIVERED';
      const empQuery = (employeeName || '').toLowerCase().trim();

      // Find matching employee or orders
      let targetOrders = allOrders;

      if (orderId) {
        targetOrders = allOrders.filter(o => o.id === orderId || o.orderNumber.toLowerCase() === orderId.toLowerCase());
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
            spokenText: `Janab, ${employeeName || 'is bande'} ke tamam ${matchingOrders.length} orders pehle se hi '${matchingOrders[0].status}' hain. Mazeed koi pending order nahi mila.`,
            message: `All orders for ${employeeName || 'employee'} are already updated.`,
          });
        }
        return NextResponse.json({
          success: false,
          updatedCount: 0,
          spokenText: `Koi matching orders nahi milay jinko ${targetStatus} mark kiya ja sakay.`,
          message: `No eligible orders found for ${employeeName || 'specified criteria'}.`,
        });
      }

      // Update matching orders
      const updatedOrders = [];
      for (const ord of targetOrders) {
        const updated = db.updateOrderStatus(
          ord.id,
          targetStatus,
          { id: user.id, name: user.name, role: user.role },
          `Status changed to ${targetStatus} via Safe AI Voice Assistant by ${user.name}`
        );
        if (updated) updatedOrders.push(updated);
      }

      const empDisplay = targetOrders[0]?.orderTakenByName || employeeName || 'Employee';
      const spoken = `Ji Controller sahib! ${empDisplay} ke ${updatedOrders.length} orders ko ${targetStatus} mark kar diya gaya hai. Record mukammal tor par update ho chuka hai.`;

      return NextResponse.json({
        success: true,
        updatedCount: updatedOrders.length,
        updatedOrders,
        spokenText: spoken,
        message: `Successfully updated ${updatedOrders.length} order(s) to ${targetStatus}.`,
      });
    }

    // 2. ACTION: GENERATE CLIENT THANK YOU MESSAGE (NO GROUP LINK - STRICTLY DIRECT CONTACT)
    if (action === 'thank_you_message') {
      let targetOrder = allOrders[0]; // most recent order
      if (orderId) {
        targetOrder = allOrders.find(o => o.id === orderId || o.orderNumber === orderId) || allOrders[0];
      } else if (body.customerName) {
        const cQuery = body.customerName.toLowerCase();
        targetOrder = allOrders.find(o => 
          o.customerName.toLowerCase().includes(cQuery) || 
          o.companyName.toLowerCase().includes(cQuery)
        ) || allOrders[0];
      }

      if (!targetOrder) {
        return NextResponse.json({
          success: false,
          spokenText: 'Janab, abhi koi order record nahi hai jisko message bheja ja sakay.',
          message: 'No orders available.',
        });
      }

      const cPhone = controllerPhone || user.phone || '03468760963';
      const clientContact = clientPhone || targetOrder.customerWhatsapp || targetOrder.customerPhone || '';
      
      // Professional Client Thank You text - ZERO group links!
      const text = `*SAFE SOLUTIONS — Construction Chemicals & Waterproofing*\n\n` +
        `Assalam-o-Alaikum *${targetOrder.customerName}*,\n\n` +
        `Thank you for choosing *SAFE SOLUTIONS* for your project requirements!\n\n` +
        `📋 *Order Confirmation:* ${targetOrder.orderNumber}\n` +
        `🏢 *Site / Client:* ${targetOrder.companyName || 'Valued Client'}\n` +
        `📍 *Delivery City:* ${targetOrder.city}\n` +
        `💰 *Total Amount:* Rs. ${targetOrder.grandTotal.toLocaleString()}\n` +
        `📦 *Status:* Confirmed & Under Process\n\n` +
        `For tracking, delivery schedule, or any technical queries, please feel free to reach out directly to our Operations Desk:\n` +
        `👤 *${user.name}* (${user.designation})\n` +
        `📞 *Contact:* ${cPhone}\n\n` +
        `*Safe Building, Strong Future!* 🌟`;

      let cleanPhone = clientContact.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '92' + cleanPhone.slice(1);
      }

      const whatsappUrl = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      const spoken = `Client ${targetOrder.customerName} ke liye Thank You paighaam tayyar hai. Controller number ${cPhone} shaamil hai.`;

      return NextResponse.json({
        success: true,
        order: targetOrder,
        clientPhone: clientContact,
        cleanPhone,
        controllerPhone: cPhone,
        messageText: text,
        whatsappUrl,
        spokenText: spoken,
      });
    }

    // 3. ACTION: FULL TEAM DASHBOARD OVERVIEW & ACCESS
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

      const spoken = `Executive report: Total ${totalOrdersCount} orders registered hain, jis ki kul raqam Rs. ${totalRevenue.toLocaleString()} hai. ${pendingCount} orders pending hain. Tamam sales team dashboards ka full access active hai.`;

      return NextResponse.json({
        success: true,
        totalOrdersCount,
        totalRevenue,
        pendingCount,
        teamBreakdown,
        spokenText: spoken,
      });
    }

    // 4. ACTION: INTELLIGENT CONVERSATIONAL NATURAL LANGUAGE PROCESSOR
    if (action === 'voice_query') {
      const q = (query || '').toLowerCase().trim();

      // GREETINGS: "Assalam o alaikum", "Salam", "AOA", "Hello", "Hi"
      if (q.includes('assalam') || q.includes('aslam') || q.includes('salam') || q.includes('slam') || q.includes('aoa') || q.includes('hello') || q.includes('hi ')) {
        const spoken = `Walaikum Assalam Controller sahib! Main Safe Solutions ka Operations Officer hazir hoon. Aaj ka kya hukam hai? Orders update karne hain, client ko text bhejna hai, ya team report dekhni hai?`;
        return NextResponse.json({
          success: true,
          actionType: 'greeting',
          spokenText: spoken,
          message: spoken,
        });
      }

      // WELLBEING / CHIT-CHAT: "Kaise ho", "kya haal hai", "theek ho", "sunao", "how are you"
      if (q.includes('kaise') || q.includes('kese') || q.includes('kya haal') || q.includes('theek ho') || q.includes('sunao') || q.includes('how are you')) {
        const spoken = `Alhamdulillah Controller sahib, main bilkul theek aur duty par active hoon. Sabhi orders par live nazar rakhi hui hai. Aap farmayein, kis cheez ki report chahiye?`;
        return NextResponse.json({
          success: true,
          actionType: 'chit_chat',
          spokenText: spoken,
          message: spoken,
        });
      }

      // WHO ARE YOU: "Aap kaun ho", "who are you", "kya karte ho"
      if (q.includes('kaun ho') || q.includes('kon ho') || q.includes('who are you') || q.includes('kya karte ho')) {
        const spoken = `Main Safe Solutions ka Internal Operations Officer hoon. Main aapke orders ki live monitoring karta hoon, staff ke orders deliver mark karta hoon, aur clients ke liye Thank You WhatsApp texts tayyar karta hoon.`;
        return NextResponse.json({
          success: true,
          actionType: 'intro',
          spokenText: spoken,
          message: spoken,
        });
      }

      // ORDER STATUS / COUNTS: "Kitne order hain", "pending orders", "urgent orders", "aaj ke order"
      if (q.includes('kitne order') || q.includes('pending') || q.includes('urgent') || q.includes('aaj ke') || q.includes('latest order')) {
        const pending = allOrders.filter(o => ['NEW', 'RATE_REVIEW', 'CONFIRMED', 'PREPARING'].includes(o.status));
        const delivered = allOrders.filter(o => o.status === 'DELIVERED');
        const latest = allOrders[0];

        let spoken = `Janab, is waqt system mein kul ${allOrders.length} orders darj hain. ${pending.length} orders pending hain aur ${delivered.length} delivered ho chuke hain.`;
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

      // EMPLOYEE SPECIFIC QUERIES & DELIVERIES
      const salesNames = [
        { name: 'Adnan Ali', keys: ['adnan', 'adnan ali'] },
        { name: 'Engr. Shahzaib Ahmad', keys: ['shahzaib', 'zaib', 'shahzaib ahmad'] },
        { name: 'Shahbaz Ahmed', keys: ['shahbaz', 'shabaz', 'shahbaz ahmed'] },
        { name: 'Engr. Haseeb Ali', keys: ['haseeb', 'haseeb ali'] },
        { name: 'Tajammul Mushtaq', keys: ['tajammul', 'tajammul bajwa'] },
      ];

      const isDeliveredQuery = q.includes('deliver') || q.includes('delivered') || q.includes('pohnch gaya') || q.includes('bhej diye');
      const isConfirmQuery = q.includes('confirm') || q.includes('manzoor') || q.includes('approve');
      const isThankYouQuery = q.includes('thank') || q.includes('shukriya') || q.includes('shopping') || q.includes('client ko text') || q.includes('msg bhejo');
      const isSummaryQuery = q.includes('dashboard') || q.includes('access') || q.includes('sab ka') || q.includes('summary') || q.includes('report') || q.includes('total sales');

      // Check for employee matching
      let matchedEmp: string | null = null;
      for (const sn of salesNames) {
        if (sn.keys.some(k => q.includes(k))) {
          matchedEmp = sn.name;
          break;
        }
      }

      // If user asks about an employee's performance (e.g. "Adnan ke kitne order hain")
      if (matchedEmp && !isDeliveredQuery && !isConfirmQuery && (q.includes('kitne') || q.includes('status') || q.includes('record') || q.includes('kya kiya'))) {
        const empOrders = allOrders.filter(o => o.orderTakenByName.toLowerCase().includes(matchedEmp!.toLowerCase()));
        const empDelivered = empOrders.filter(o => o.status === 'DELIVERED').length;
        const empPending = empOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
        const empSales = empOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

        const spoken = `${matchedEmp} ne ab tak total ${empOrders.length} orders book kiye hain, jis ki kul value Rs. ${empSales.toLocaleString()} hai. In mein se ${empDelivered} delivered hain aur ${empPending} pending hain.`;
        return NextResponse.json({
          success: true,
          actionType: 'emp_stats',
          spokenText: spoken,
          message: spoken,
        });
      }

      // If user asks to mark delivered or confirm orders
      if ((isDeliveredQuery || isConfirmQuery) && matchedEmp) {
        const targetStatus: OrderStatus = isDeliveredQuery ? 'DELIVERED' : 'CONFIRMED';
        const targetOrders = allOrders.filter(o => 
          o.orderTakenByName.toLowerCase().includes(matchedEmp!.toLowerCase()) &&
          o.status !== targetStatus &&
          o.status !== 'CANCELLED'
        );

        if (targetOrders.length === 0) {
          return NextResponse.json({
            success: true,
            spokenText: `Janab, ${matchedEmp} ke koi naye pending orders nahi hain jo ${targetStatus} mark kiye ja sakein.`,
            message: `No pending orders for ${matchedEmp}.`,
          });
        }

        const updated = [];
        for (const ord of targetOrders) {
          const res = db.updateOrderStatus(
            ord.id,
            targetStatus,
            { id: user.id, name: user.name, role: user.role },
            `Updated via AI Assistant voice command by ${user.name}`
          );
          if (res) updated.push(res);
        }

        return NextResponse.json({
          success: true,
          updatedCount: updated.length,
          spokenText: `Ji bilkul Controller sahib! ${matchedEmp} ke ${updated.length} orders ko '${targetStatus}' mark kar diya gaya hai. Record mukammal tor par update ho chuka hai.`,
          message: `Updated ${updated.length} orders for ${matchedEmp} to ${targetStatus}`,
        });
      }

      // Client Thank You Message (NO group link)
      if (isThankYouQuery) {
        const targetOrder = allOrders[0];
        if (!targetOrder) {
          return NextResponse.json({
            success: false,
            spokenText: 'Janab, abhi koi order majood nahi hai jisko Thank You message bheja ja sakay.',
          });
        }

        const cPhone = user.phone || '03468760963';
        const text = `*SAFE SOLUTIONS — Construction Chemicals & Waterproofing*\n\n` +
          `Assalam-o-Alaikum *${targetOrder.customerName}*,\n\n` +
          `Thank you for choosing *SAFE SOLUTIONS* for your project!\n\n` +
          `📋 *Order ID:* ${targetOrder.orderNumber}\n` +
          `🏢 *Site / Client:* ${targetOrder.companyName || 'Valued Client'}\n` +
          `💰 *Total Amount:* Rs. ${targetOrder.grandTotal.toLocaleString()}\n` +
          `📦 *Status:* Confirmed & Under Process\n\n` +
          `For tracking or technical support, contact Operations Desk directly:\n` +
          `👤 *${user.name}* (${user.designation})\n` +
          `📞 *Contact:* ${cPhone}\n\n` +
          `*Safe Building, Strong Future!* 🌟`;

        let cleanPhone = (targetOrder.customerWhatsapp || targetOrder.customerPhone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.slice(1);

        const whatsappUrl = cleanPhone 
          ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

        return NextResponse.json({
          success: true,
          actionType: 'thank_you',
          order: targetOrder,
          messageText: text,
          whatsappUrl,
          spokenText: `Client ${targetOrder.customerName} ke liye Thank You text tayyar hai. Controller phone number ${cPhone} shaamil kar diya hai.`,
        });
      }

      // Summary
      if (isSummaryQuery) {
        const totalRev = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        return NextResponse.json({
          success: true,
          actionType: 'summary',
          spokenText: `Executive report: Total ${allOrders.length} orders booked hain, jinki kul raqam Rs. ${totalRev.toLocaleString()} hai. Tamam sales team dashboards ka full access active hai.`,
        });
      }

      // Respectful contextual fallback
      return NextResponse.json({
        success: true,
        spokenText: `Ji Controller sahib, main ne sun liya hai. Main Safe Solutions Operations Officer hoon. Aap mujhe orders deliver karne, client ko Thank You text bhejne, ya kisi bhi employee ka record nikalne ka hukam de sakte hain.`,
        message: 'Safe AI Officer listening...',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI Assistant operation failed' }, { status: 500 });
  }
}
