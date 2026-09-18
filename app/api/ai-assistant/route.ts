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
        // Maybe all orders are already delivered or none found
        const matchingOrders = allOrders.filter(o => o.orderTakenByName.toLowerCase().includes(empQuery));
        if (matchingOrders.length > 0) {
          return NextResponse.json({
            success: true,
            updatedCount: 0,
            spokenText: `${employeeName || 'Bande'} ke tamam ${matchingOrders.length} orders pehle se hi '${matchingOrders[0].status}' hain. Mazeed koi pending order nahi mila.`,
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
      const spoken = `Ji! ${empDisplay} ke ${updatedOrders.length} order(s) ko ${targetStatus} mark kar diya gaya hai. System updated!`;

      return NextResponse.json({
        success: true,
        updatedCount: updatedOrders.length,
        updatedOrders,
        spokenText: spoken,
        message: `Successfully updated ${updatedOrders.length} order(s) to ${targetStatus}.`,
      });
    }

    // 2. ACTION: GENERATE THANK YOU MESSAGE FOR CLIENT
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
          spokenText: 'Abhi tak koi order record nahi hai jisko message bheja ja sakay.',
          message: 'No orders available.',
        });
      }

      const cPhone = controllerPhone || user.phone || '03468760963';
      const clientContact = clientPhone || targetOrder.customerWhatsapp || targetOrder.customerPhone || '';
      
      const text = `*SAFE SOLUTIONS — Construction Chemicals & Waterproofing*\n\n` +
        `Assalam-o-Alaikum *${targetOrder.customerName}* (${targetOrder.companyName || 'Valued Client'}),\n\n` +
        `Thank you for choosing *SAFE SOLUTIONS* for your project requirements!\n\n` +
        `📋 *Order ID:* ${targetOrder.orderNumber}\n` +
        `📦 *Status:* Confirmed & Processed\n` +
        `📍 *Delivery City:* ${targetOrder.city}\n` +
        `💰 *Order Amount:* Rs. ${targetOrder.grandTotal.toLocaleString()}\n\n` +
        `For any support, tracking, or future chemical requirements, feel free to reach out directly to our Operations Desk:\n` +
        `👤 *${user.name}* (${user.designation}): ${cPhone}\n` +
        `🌐 *Official WhatsApp Community:* https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK\n\n` +
        `*Safe Building, Strong Future!* 🚀`;

      // Clean phone number for WhatsApp URL
      let cleanPhone = clientContact.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '92' + cleanPhone.slice(1);
      }

      const whatsappUrl = cleanPhone 
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      const spoken = `Client ${targetOrder.customerName} ke liye Thank You message ready kar diya gaya hai. Manager number ${cPhone} shaamil hai.`;

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

      const spoken = `Executive report: Total ${totalOrdersCount} orders registered hain, jis ki kul value Rs. ${totalRevenue.toLocaleString()} hai. ${pendingCount} orders pending hain. Tamam team dashboards ka access aapke pass active hai.`;

      return NextResponse.json({
        success: true,
        totalOrdersCount,
        totalRevenue,
        pendingCount,
        teamBreakdown,
        spokenText: spoken,
      });
    }

    // 4. ACTION: NATURAL LANGUAGE QUERY PARSER
    if (action === 'voice_query') {
      const q = (query || '').toLowerCase().trim();

      // Check if user is asking to deliver orders for someone
      // e.g. "adnan ke order deliver ho gaye" / "adnan ke orders confirm kardo" / "shahzaib ke deliver"
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
      const isSummaryQuery = q.includes('dashboard') || q.includes('access') || q.includes('sab ka') || q.includes('summary') || q.includes('report') || q.includes('total');

      // Check for employee matching
      let matchedEmp: string | null = null;
      for (const sn of salesNames) {
        if (sn.keys.some(k => q.includes(k))) {
          matchedEmp = sn.name;
          break;
        }
      }

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
            spokenText: `${matchedEmp} ke koi naye pending orders nahi hain jo ${targetStatus} mark kiye ja sakein.`,
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
          spokenText: `Ji bilkul! ${matchedEmp} ke ${updated.length} order(s) ko '${targetStatus}' mark kar diya gaya hai. Record updated!`,
          message: `Updated ${updated.length} orders for ${matchedEmp} to ${targetStatus}`,
        });
      }

      if (isThankYouQuery) {
        const targetOrder = allOrders[0];
        if (!targetOrder) {
          return NextResponse.json({
            success: false,
            spokenText: 'Abhi koi order majood nahi hai jisko Thank You message bheja ja sakay.',
          });
        }

        const cPhone = user.phone || '03468760963';
        const text = `*SAFE SOLUTIONS — Construction Chemicals & Waterproofing*\n\n` +
          `Assalam-o-Alaikum *${targetOrder.customerName}*,\n\n` +
          `Thank you for trusting *SAFE SOLUTIONS*! Your order *${targetOrder.orderNumber}* for *${targetOrder.companyName || 'your site'}* is confirmed and active.\n\n` +
          `Operations Contact: ${user.name} (${cPhone})\n` +
          `Group: https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK\n\n` +
          `Safe Building, Strong Future! 🌟`;

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
          spokenText: `Client ${targetOrder.customerName} ke liye Thank You text ready hai. Controller phone number ${cPhone} shamil kar diya hai.`,
        });
      }

      if (isSummaryQuery) {
        const totalRev = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        return NextResponse.json({
          success: true,
          actionType: 'summary',
          spokenText: `Operations Summary: Total ${allOrders.length} orders booked hain, jinki kul raqam Rs. ${totalRev.toLocaleString()} hai. Tamam sales team dashboards ka full access active hai.`,
        });
      }

      // Default fallback conversational response
      return NextResponse.json({
        success: true,
        spokenText: `Main Safe Operations AI hoon. Aap mujh se kisi bhi employee ke orders deliver karne, client ko Thank You message bhejne, ya team status lene ka keh sakte hain.`,
        message: 'Safe AI listening...',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'AI Assistant operation failed' }, { status: 500 });
  }
}
