'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  DollarSign, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Building2,
  MapPin,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import OrderDetailsDrawer from '@/components/OrderDetailsDrawer';
import { Order, User } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [authRes, statsRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/stats'),
        fetch('/api/orders')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders((ordersData.orders || []).slice(0, 8));
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading SAFE ORDER HUB...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. SALES USER DASHBOARD (Low-Data, Mobile-First, Action-Focused)
  // ─────────────────────────────────────────────────────────────
  if (!isFullAccess) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
        <Navbar currentUser={currentUser} />

        <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
          {/* Greeting Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {getGreeting()}, {currentUser?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {currentUser?.designation} • SAFE SOLUTIONS
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active Session
            </span>
          </div>

          {/* Quick High-Impact Counters: Today's Orders & Pending */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 grad-mint-blush rounded-full blur-xl opacity-60 pointer-events-none" />
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Today&apos;s Orders</span>
                <Package className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {stats?.todayOrdersCount ?? 0}
              </div>
              <span className="text-[10px] text-teal-700 font-semibold mt-1 inline-block">
                Logged today
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute -right-3 -bottom-3 w-16 h-16 grad-champagne-coral rounded-full blur-xl opacity-60 pointer-events-none" />
              <div className="text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                <span>Pending Delivery</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-600 font-mono">
                {stats?.pendingReviewOrders ?? 0}
              </div>
              <span className="text-[10px] text-amber-700 font-medium mt-1 inline-block">
                In process / fulfillment
              </span>
            </div>
          </div>

          {/* Giant Primary Action: ＋ NEW ORDER */}
          <Link
            href="/orders/new"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
            <span>＋ NEW ORDER</span>
          </Link>

          {/* Recent Orders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">
                Recent Orders Booked By You
              </h3>
              <Link href="/orders" className="text-xs text-teal-700 font-bold hover:underline flex items-center gap-0.5">
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No orders logged yet</p>
                <p className="text-[11px] text-slate-400">Press the green button above to book your first order.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDrawerOpen(true);
                    }}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-md cursor-pointer transition-all active:scale-[0.99] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{order.orderNumber}</span>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 font-mono">
                        Rs. {order.grandTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate max-w-[200px]">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.companyName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3" />
                        <span>{order.city}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate border-t border-slate-100 pt-1.5 flex justify-between">
                      <span className="truncate max-w-[220px]">
                        {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                      </span>
                      <span className="text-teal-700 font-bold shrink-0">Details →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <OrderDetailsDrawer
          order={selectedOrder}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          currentUser={currentUser}
          onOrderUpdated={fetchDashboardData}
        />

        <MobileNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MANAGEMENT DASHBOARD (Full Executive Control View)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {getGreeting()}, {currentUser?.name} 👋
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Executive overview & order fulfillment controls for <span className="font-semibold text-slate-700">SAFE SOLUTIONS</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/orders/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>＋ CREATE NEW ORDER</span>
            </Link>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          
          {/* Card 1: Today's Orders */}
          <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-mint-blush rounded-full blur-xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Today&apos;s Orders</span>
              <Package className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {stats?.todayOrdersCount ?? 0}
            </div>
            <div className="text-[11px] text-teal-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Active booking</span>
            </div>
          </div>

          {/* Card 2: Today's Sales Volume */}
          <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-lime-sky rounded-full blur-xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Today&apos;s Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              Rs. {(stats?.todaySales ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Total: Rs. {(stats?.totalSales ?? 0).toLocaleString()}
            </div>
          </div>

          {/* Card 3: Pending / Rate Review */}
          <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-champagne-coral rounded-full blur-xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Pending Review</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
              {String(stats?.pendingReviewOrders ?? 0).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              Requires attention
            </div>
          </div>

          {/* Card 4: Processing / In Transit */}
          <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-pink-cyan rounded-full blur-xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Processing</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {String(stats?.processingOrders ?? 0).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-indigo-600 font-semibold mt-1">
              In preparation / transit
            </div>
          </div>

          {/* Card 5: Delivered */}
          <div className="korean-card p-4 relative overflow-hidden group korean-card-hover col-span-2 lg:col-span-1">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-lavender-emerald rounded-full blur-xl opacity-60 pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold">Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              {String(stats?.deliveredOrders ?? 0).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Fulfillment complete
            </div>
          </div>

        </div>

        {/* Analytics & Product Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Product Performance Bar Chart */}
          <div className="korean-card p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Product Sales Volume Breakdown</h3>
                <p className="text-xs text-slate-500">Real revenue by construction chemicals & waterproofing materials</p>
              </div>
              <Link href="/products" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
                <span>Manage rates</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5 pt-2">
              {(!stats?.productRanking || stats.productRanking.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Package className="w-8 h-8 text-slate-200 mx-auto mb-1.5" />
                  <span>No products sold yet. Create orders to see live volume analytics.</span>
                </div>
              ) : (
                stats.productRanking.slice(0, 5).map((prod: any, idx: number) => {
                  const maxAmt = stats.productRanking[0]?.amount || 1;
                  const pct = Math.round((prod.amount / maxAmt) * 100);
                  const gradientClass = [
                    'grad-lavender-emerald',
                    'grad-lime-sky',
                    'grad-mint-blush',
                    'grad-champagne-coral',
                    'grad-pink-cyan',
                  ][idx % 5];

                  return (
                    <div key={prod.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            0{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{prod.name}</span>
                          <span className="text-[10px] text-slate-400">({prod.quantity} units)</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">
                          Rs. {prod.amount.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${gradientClass} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Management Navigation Card */}
          <div className="korean-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Privilege</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {currentUser?.role}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>{currentUser?.designation}</span>
                </div>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Full administrative & operational authority over company orders, customer accounts, rate approvals, logistics, and audit trails.
                </p>
              </div>

              {/* Quick links */}
              <div className="mt-4 space-y-2 text-xs">
                <Link 
                  href="/customers"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    Customer Database
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link 
                  href="/deliveries"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    Delivery Logistics & Proofs
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link 
                  href="/reports"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Business Reports & Exports
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Recent Orders Table */}
        <div className="korean-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Latest Company Orders</h3>
              <p className="text-xs text-slate-500">Live feed of orders booked across all territories</p>
            </div>
            <Link href="/orders" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
              <span>View all orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span>No orders registered yet. Click &quot;CREATE NEW ORDER&quot; to begin.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Order ID</th>
                    <th className="px-3.5 py-2.5 font-semibold">Client / Site</th>
                    <th className="px-3.5 py-2.5 font-semibold">City</th>
                    <th className="px-3.5 py-2.5 font-semibold">Sales Rep</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Amount</th>
                    <th className="px-3.5 py-2.5 font-semibold text-center">Status</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map(order => (
                    <tr 
                      key={order.id} 
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDrawerOpen(true);
                      }}
                      className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-800">{order.companyName}</div>
                        <div className="text-[11px] text-slate-400">{order.customerName}</div>
                      </td>
                      <td className="px-3.5 py-3 text-slate-600">
                        {order.city}
                      </td>
                      <td className="px-3.5 py-3 text-slate-600">
                        {order.orderTakenByName}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">
                        Rs. {order.grandTotal.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <span className="text-teal-600 font-bold hover:underline">Manage →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <OrderDetailsDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        onOrderUpdated={fetchDashboardData}
      />

      <MobileNav />
    </div>
  );
}
