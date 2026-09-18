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
  ArrowUpRight, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Users,
  Layers
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import OrderDetailsDrawer from '@/components/OrderDetailsDrawer';
import SafeAIAssistant from '@/components/SafeAIAssistant';
import { Order, User, Role } from '@/lib/types';

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
        setRecentOrders((ordersData.orders || []).slice(0, 5));
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
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading SAFE ORDER HUB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        
        {/* Top Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {getGreeting()}, {currentUser?.name} 👋
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Here&apos;s what&apos;s happening with <span className="font-semibold text-slate-700">SAFE SOLUTIONS</span> orders today.
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

        {/* Safe AI Voice & Operations Assistant for Boss, Controller, Manager */}
        {isFullAccess && (
          <SafeAIAssistant 
            currentUser={currentUser}
            onRefreshOrders={fetchDashboardData}
            onOpenOrder={(order) => {
              setSelectedOrder(order);
              setIsDrawerOpen(true);
            }}
          />
        )}

        {/* Floating Gradient Glow Stat Cards */}
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
              <span className="font-semibold">Pending / Review</span>
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
              In warehouse / Transit
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
              Successfully fulfilled
            </div>
          </div>

        </div>

        {/* Mid Section: Analytics & Product Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Product Performance Bar Chart (Chinese fintech density) */}
          <div className="korean-card p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Product Sales Breakdown</h3>
                <p className="text-xs text-slate-500">Highest volume chemicals & waterproofing materials</p>
              </div>
              <Link href="/products" className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
                <span>View catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5 pt-2">
              {(!stats?.productRanking || stats.productRanking.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center">No product data recorded yet</p>
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

          {/* Quick Info & Permissions Badge */}
          <div className="korean-card p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access & Role</span>
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
                  {isFullAccess 
                    ? 'Full executive privilege: order management, rate approvals, product catalog, and financial controls.' 
                    : 'Sales order desk: create orders, monitor delivery status, and trigger WhatsApp notifications.'}
                </p>
              </div>

              {/* Quick links */}
              <div className="mt-4 space-y-2 text-xs">
                <Link 
                  href="/orders/new"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-600" />
                    Book New Order
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link 
                  href="/orders"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    All Booked Orders
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                {isFullAccess && (
                  <Link 
                    href="/team"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      Sales Team Performance
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              SAFE ORDER HUB v2.0 • Real-time DB
            </div>
          </div>

        </div>

        {/* Recent Orders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Order Bookings</h3>
              <p className="text-xs text-slate-500">Click any row to open the full order details & WhatsApp trigger</p>
            </div>
            <Link 
              href="/orders" 
              className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View all orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="korean-card p-8 text-center text-xs text-slate-400">
              No orders found. Book your first order!
            </div>
          ) : (
            <div className="korean-card overflow-hidden">
              <div className="divide-y divide-slate-100">
                {recentOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsDrawerOpen(true);
                    }}
                    className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold text-xs shrink-0">
                        {order.orderNumber.split('-').pop()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{order.companyName}</span>
                          <OrderStatusBadge status={order.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.city} • {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          Rs. {order.grandTotal.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Taken by {order.orderTakenByName}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
        }}
        currentUserRole={currentUser?.role}
        onOrderUpdated={() => {
          fetchDashboardData();
          setIsDrawerOpen(false);
        }}
      />

      <MobileNav />
    </div>
  );
}
