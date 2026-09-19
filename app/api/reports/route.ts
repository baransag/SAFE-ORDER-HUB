import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isFullAccess } from '@/lib/auth';
import { db } from '@/lib/db';
import { OrderStatus, PaymentStatus, DeliveryStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isFullAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden: Access restricted to Management (Boss, Controller, Manager)' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const dateRange = searchParams.get('dateRange') || 'ALL';
  const employeeId = searchParams.get('employeeId') || 'ALL';
  const city = searchParams.get('city') || 'ALL';
  const status = searchParams.get('status') || 'ALL';
  const paymentStatus = searchParams.get('paymentStatus') || 'ALL';
  const deliveryStatus = searchParams.get('deliveryStatus') || 'ALL';
  const productId = searchParams.get('productId') || 'ALL';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const orders = await db.getOrders({
    role: user.role,
    employeeId: employeeId !== 'ALL' ? employeeId : undefined,
    city: city !== 'ALL' ? city : undefined,
    status: status !== 'ALL' ? (status as OrderStatus) : undefined,
    paymentStatus: paymentStatus !== 'ALL' ? (paymentStatus as PaymentStatus) : undefined,
    deliveryStatus: deliveryStatus !== 'ALL' ? (deliveryStatus as DeliveryStatus) : undefined,
    productId: productId !== 'ALL' ? productId : undefined,
    dateRange: dateRange !== 'ALL' ? dateRange : undefined,
    startDate,
    endDate,
  });

  // Precise Revenue Calculations
  let grossBookedRevenue = 0;
  let netRealizedRevenue = 0;
  let cancelledRevenue = 0;
  let refundedRevenue = 0;
  let partiallyDeliveredRevenue = 0;

  const statusBreakdown: Record<string, number> = {};
  const paymentBreakdown: Record<string, number> = {};
  const productMix: Record<string, { name: string; quantity: number; revenue: number; ordersCount: number }> = {};
  const employeeBreakdown: Record<string, { name: string; ordersCount: number; revenue: number }> = {};
  const cityBreakdown: Record<string, { city: string; ordersCount: number; revenue: number }> = {};

  const formattedOrders = orders.map(o => {
    const isCancelledOrReturned = o.status === 'CANCELLED' || o.status === 'RETURNED';
    const isRefunded = o.paymentStatus === 'REFUNDED';
    const isPartial = o.status === 'PARTIALLY_DELIVERED';

    grossBookedRevenue += o.grandTotal;

    if (isCancelledOrReturned) {
      cancelledRevenue += o.grandTotal;
    } else if (isRefunded) {
      refundedRevenue += o.grandTotal;
    } else {
      netRealizedRevenue += o.grandTotal;
    }

    if (isPartial) {
      partiallyDeliveredRevenue += o.grandTotal;
    }

    // Breakdown aggregations
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    paymentBreakdown[o.paymentStatus] = (paymentBreakdown[o.paymentStatus] || 0) + 1;

    // Items
    o.items.forEach(item => {
      if (!productMix[item.productName]) {
        productMix[item.productName] = { name: item.productName, quantity: 0, revenue: 0, ordersCount: 0 };
      }
      productMix[item.productName].quantity += item.quantity;
      productMix[item.productName].revenue += item.totalAmount;
      productMix[item.productName].ordersCount += 1;
    });

    // Employee
    const empName = o.orderTakenByName;
    if (!employeeBreakdown[empName]) {
      employeeBreakdown[empName] = { name: empName, ordersCount: 0, revenue: 0 };
    }
    employeeBreakdown[empName].ordersCount += 1;
    if (!isCancelledOrReturned && !isRefunded) {
      employeeBreakdown[empName].revenue += o.grandTotal;
    }

    // City
    const c = o.city || 'Other';
    if (!cityBreakdown[c]) {
      cityBreakdown[c] = { city: c, ordersCount: 0, revenue: 0 };
    }
    cityBreakdown[c].ordersCount += 1;
    if (!isCancelledOrReturned && !isRefunded) {
      cityBreakdown[c].revenue += o.grandTotal;
    }

    // Asia/Karachi display timestamp (UTC stored consistently)
    const karachiDate = new Date(o.createdAt).toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return {
      ...o,
      karachiDate,
    };
  });

  const totalOrders = orders.length;
  const netActiveOrders = orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'RETURNED').length;
  const avgOrderValue = netActiveOrders > 0 ? Math.round(netRealizedRevenue / netActiveOrders) : 0;

  return NextResponse.json({
    summary: {
      grossBookedRevenue: Math.round(grossBookedRevenue * 100) / 100,
      netRealizedRevenue: Math.round(netRealizedRevenue * 100) / 100,
      cancelledRevenue: Math.round(cancelledRevenue * 100) / 100,
      refundedRevenue: Math.round(refundedRevenue * 100) / 100,
      partiallyDeliveredRevenue: Math.round(partiallyDeliveredRevenue * 100) / 100,
      totalOrders,
      netActiveOrders,
      avgOrderValue,
      timezone: 'Asia/Karachi (PKT, UTC+5)',
    },
    statusBreakdown,
    paymentBreakdown,
    productRanking: Object.values(productMix).sort((a, b) => b.revenue - a.revenue),
    employeePerformance: Object.values(employeeBreakdown).sort((a, b) => b.revenue - a.revenue),
    cityDistribution: Object.values(cityBreakdown).sort((a, b) => b.revenue - a.revenue),
    filteredOrders: formattedOrders,
  });
}
