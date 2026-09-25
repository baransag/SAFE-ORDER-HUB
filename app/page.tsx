'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Mic, 
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
  ArrowRight,
  Calendar,
  MessageSquare,
  Users,
  Search,
  Sparkles
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import OrderDetailsDrawer from '@/components/OrderDetailsDrawer';
import VoiceOrderModal from '@/components/VoiceOrderModal';
import VoiceOrdersInbox from '@/components/VoiceOrdersInbox';
import SafeCopilot from '@/components/SafeCopilot';
import { Order, User } from '@/lib/types';
import { getUserAvatar, getUserInitials } from '@/lib/avatar';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'VOICE_INBOX'>('OVERVIEW');

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

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);
  const avatar = getUserAvatar(currentUser);
  const initials = getUserInitials(currentUser?.name);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F4] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#B7937A] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-[#635858] font-medium tracking-wide">Connecting to SAFE ORDER HUB...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. SALES USER DASHBOARD (Mobile-First, Low-Data, Personal Orders Only)
  // ─────────────────────────────────────────────────────────────
  if (!isFullAccess) {
    return (
      <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12 text-[#221D1D]">
        <Navbar currentUser={currentUser} />

        <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* Main Hero Banner for Sales Employee */}
          <div className="korean-card p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full grad-hero-banner blur-2xl opacity-70 pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-[#BCAEC4]/20 blur-xl pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={currentUser?.name} 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#BCAEC4]/30 border-2 border-white shadow-sm flex items-center justify-center text-lg font-black text-[#221D1D]">
                  {initials}
                </div>
              )}

              <div className="flex-1">
                <div className="text-[11px] font-semibold text-[#AF9292] tracking-wide uppercase">
                  {formattedDate}
                </div>
                <h1 className="text-lg sm:text-xl font-black text-[#221D1D] tracking-tight">
                  {getGreeting()}, {currentUser?.name?.split(' ')[0]} 👋
                </h1>
                <p className="text-xs text-[#635858]">
                  {currentUser?.designation} • SAFE SOLUTIONS
                </p>
              </div>

              <Link
                href="/profile"
                className="text-[11px] font-semibold text-[#B7937A] hover:underline"
              >
                Profile
              </Link>
            </div>

            {/* Quick stats ribbon */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#E6DDDD]/60">
              <div className="bg-white/80 p-3 rounded-xl border border-[#E6DDDD]">
                <span className="text-[11px] text-[#635858] font-semibold block">Today&apos;s Bookings</span>
                <span className="text-2xl font-black font-mono text-[#221D1D]">{stats?.todayOrders ?? 0}</span>
                <span className="text-[10px] text-[#AF9292] block mt-0.5 font-medium">Recorded by you</span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-[#E6DDDD]">
                <span className="text-[11px] text-[#635858] font-semibold block">Pending Delivery</span>
                <span className="text-2xl font-black font-mono text-amber-700">{stats?.pendingDeliveries ?? 0}</span>
                <span className="text-[10px] text-amber-800 block mt-0.5 font-medium">In transit / prep</span>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons: ＋ NEW ORDER & 🎙️ VOICE ORDER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/orders/new"
              className="p-4 rounded-2xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold flex items-center justify-between shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <div className="text-sm tracking-tight font-black">＋ CREATE NEW ORDER</div>
                  <div className="text-[11px] text-white/80 font-normal">Standard order booking form</div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-80" />
            </Link>

            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-4 rounded-2xl bg-white border border-[#C8B5A9] hover:border-[#B7937A] text-[#221D1D] font-bold flex items-center justify-between shadow-xs transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#BCAEC4]/30 text-[#AF9292] flex items-center justify-center">
                  <Mic className="w-5 h-5 text-[#B7937A]" />
                </div>
                <div className="text-left">
                  <div className="text-sm tracking-tight font-black">🎙️ RECORD VOICE ORDER</div>
                  <div className="text-[11px] text-[#635858] font-normal">Record call or client voice note</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#C8B5A9]" />
            </button>
          </div>

          {/* Approved Thank You Templates Shortcut */}
          <div className="korean-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF8F6] text-[#B7937A] flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#221D1D]">Customer Thank-You Messages</div>
                <div className="text-[11px] text-[#635858]">Approved Urdu & English communication templates</div>
              </div>
            </div>
            <Link
              href="/templates"
              className="text-xs font-bold text-[#B7937A] hover:underline flex items-center gap-1"
            >
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Recent Orders Section (Sales Employee's Own Orders Only) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-tight text-[#221D1D] uppercase">
                My Recent Orders
              </h2>
              <Link href="/orders" className="text-xs text-[#B7937A] hover:underline font-semibold">
                View All Orders
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="korean-card p-8 text-center space-y-2">
                <Package className="w-8 h-8 text-[#C8B5A9] mx-auto opacity-70" />
                <p className="text-xs font-bold text-[#221D1D]">No orders logged yet</p>
                <p className="text-[11px] text-[#635858]">Tap &quot;Create New Order&quot; or &quot;Voice Order&quot; to book your first client sale.</p>
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
                    className="korean-card p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-[#B7937A] transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#221D1D]">
                          {order.orderNumber}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="text-xs font-semibold text-[#221D1D]">
                        {order.customerName} • <span className="text-[#635858] font-normal">{order.city}</span>
                      </div>
                      <div className="text-[10px] text-[#635858]">
                        Rs. {order.grandTotal.toLocaleString()} • {order.items.length} item(s)
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C8B5A9]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <MobileNav />

        {/* Voice Order Recording Modal */}
        <VoiceOrderModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          currentUser={currentUser}
          onOrderCreated={fetchDashboardData}
        />

        {/* Order Details Drawer */}
        <OrderDetailsDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          order={selectedOrder}
          currentUser={currentUser}
          onOrderUpdated={fetchDashboardData}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MANAGEMENT EXECUTIVE DASHBOARD (Boss, Controller, Manager)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12 text-[#221D1D]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-7">
        
        {/* Management Hero Banner */}
        <div className="korean-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full grad-hero-banner blur-3xl opacity-80 pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#BCAEC4]/25 blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4 sm:gap-5">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={currentUser?.name} 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#BCAEC4]/30 border-2 border-white shadow-md flex items-center justify-center text-2xl font-black text-[#221D1D]">
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#AF9292] uppercase tracking-wider">
                    {formattedDate}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#BCAEC4]/30 text-[#221D1D] border border-[#C8B5A9]">
                    {currentUser?.role === 'BOSS' ? '👑 EXECUTIVE DESK' : currentUser?.role === 'CONTROLLER' ? '🛡️ OPERATIONS CONTROLLER' : '👔 FINANCE & ACCOUNTS'}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#221D1D] tracking-tight">
                  {getGreeting()}, {currentUser?.name} 👋
                </h1>
                <p className="text-xs sm:text-sm text-[#635858]">
                  Central executive overview, order fulfillment, deliveries, and operations for <strong className="text-[#221D1D]">SAFE SOLUTIONS</strong>.
                </p>
              </div>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F6] text-[#221D1D] border border-[#C8B5A9] font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                <Mic className="w-4 h-4 text-[#B7937A]" />
                <span>🎙️ Voice Order</span>
              </button>

              <Link
                href="/orders/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>＋ CREATE NEW ORDER</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E6DDDD] pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'OVERVIEW' 
                ? 'bg-[#221D1D] text-white shadow-xs' 
                : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
            }`}
          >
            Executive Overview & KPIs
          </button>
          <button
            onClick={() => setActiveTab('VOICE_INBOX')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'VOICE_INBOX' 
                ? 'bg-[#221D1D] text-white shadow-xs' 
                : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
            }`}
          >
            <span>🎙️ Voice Orders Inbox</span>
          </button>
        </div>

        {activeTab === 'VOICE_INBOX' ? (
          <VoiceOrdersInbox 
            currentUser={currentUser} 
            onRefresh={fetchDashboardData} 
          />
        ) : (
          <>
            {/* Executive KPI Cards (Real PostgreSQL Metrics Only) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {/* Card 1: Today's Orders */}
              <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
                <div className="flex items-center justify-between text-xs text-[#635858] mb-2">
                  <span className="font-semibold">Today&apos;s Orders</span>
                  <Package className="w-4 h-4 text-[#B7937A]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#221D1D] font-mono">
                  {stats?.todayOrders ?? 0}
                </div>
                <div className="text-[11px] text-[#AF9292] font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Booked today</span>
                </div>
              </div>

              {/* Card 2: Total Revenue */}
              <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
                <div className="flex items-center justify-between text-xs text-[#635858] mb-2">
                  <span className="font-semibold">Total Sales</span>
                  <DollarSign className="w-4 h-4 text-[#AF9292]" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#221D1D] font-mono truncate">
                  Rs. {(stats?.totalRevenue ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-[#635858] mt-1">
                  Total Booked: {stats?.totalOrders ?? 0}
                </div>
              </div>

              {/* Card 3: Pending Delivery */}
              <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
                <div className="flex items-center justify-between text-xs text-[#635858] mb-2">
                  <span className="font-semibold">Pending Delivery</span>
                  <Truck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
                  {stats?.pendingDeliveries ?? 0}
                </div>
                <div className="text-[11px] text-amber-800 font-semibold mt-1">
                  Dispatched / In-Transit
                </div>
              </div>

              {/* Card 4: Rate Reviews Required */}
              <div className="korean-card p-4 relative overflow-hidden group korean-card-hover">
                <div className="flex items-center justify-between text-xs text-[#635858] mb-2">
                  <span className="font-semibold">Rate Reviews</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
                  {stats?.pendingRateReviews ?? 0}
                </div>
                <div className="text-[11px] text-rose-700 font-semibold mt-1">
                  Special rate approval
                </div>
              </div>

              {/* Card 5: Delivered Orders */}
              <div className="korean-card p-4 relative overflow-hidden group korean-card-hover col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between text-xs text-[#635858] mb-2">
                  <span className="font-semibold">Delivered</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
                  {stats?.deliveredCount ?? 0}
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                  Completed site fulfillment
                </div>
              </div>
            </div>

            {/* Operational Management Shortcuts Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link 
                href="/deliveries"
                className="korean-card p-3.5 flex items-center gap-3 hover:border-[#B7937A] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#221D1D]">Delivery Desk</div>
                  <div className="text-[10px] text-[#635858]">Dispatch & Proofs</div>
                </div>
              </Link>

              <Link 
                href="/templates"
                className="korean-card p-3.5 flex items-center gap-3 hover:border-[#B7937A] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#221D1D]">Message Templates</div>
                  <div className="text-[10px] text-[#635858]">10 Thank-You Presets</div>
                </div>
              </Link>

              <Link 
                href="/reports"
                className="korean-card p-3.5 flex items-center gap-3 hover:border-[#B7937A] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#221D1D]">Reports & BI</div>
                  <div className="text-[10px] text-[#635858]">Excel & Sales Exports</div>
                </div>
              </Link>

              <Link 
                href="/team"
                className="korean-card p-3.5 flex items-center gap-3 hover:border-[#B7937A] transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#221D1D]">Authorized Team</div>
                  <div className="text-[10px] text-[#635858]">8 Approved Accounts</div>
                </div>
              </Link>
            </div>

            {/* Recent Orders Table */}
            <div className="korean-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#221D1D] tracking-tight">
                    Recent Orders & Live Fulfillment
                  </h2>
                  <p className="text-xs text-[#635858]">
                    Click any order to inspect multi-product details, payment status, delivery proof, or status timeline.
                  </p>
                </div>
                <Link
                  href="/orders"
                  className="text-xs font-bold text-[#B7937A] hover:underline flex items-center gap-1"
                >
                  <span>View All Orders</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#635858]">
                  No orders found. Use &quot;Create New Order&quot; to book an order.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E6DDDD] text-[#635858] font-semibold">
                        <th className="pb-3 pl-2">Order #</th>
                        <th className="pb-3">Customer & Site</th>
                        <th className="pb-3">City</th>
                        <th className="pb-3">Salesperson</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Payment</th>
                        <th className="pb-3 text-right pr-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DDDD]/60">
                      {recentOrders.map(o => (
                        <tr
                          key={o.id}
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDrawerOpen(true);
                          }}
                          className="hover:bg-[#FAF8F6] cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 pl-2 font-mono font-bold text-[#221D1D]">
                            {o.orderNumber}
                          </td>
                          <td className="py-3.5">
                            <div className="font-bold text-[#221D1D]">{o.customerName}</div>
                            <div className="text-[11px] text-[#635858] truncate max-w-xs">{o.companyName}</div>
                          </td>
                          <td className="py-3.5 text-[#635858] font-medium">{o.city}</td>
                          <td className="py-3.5 text-[#635858] font-medium">{o.orderTakenByName}</td>
                          <td className="py-3.5">
                            <OrderStatusBadge status={o.status} />
                          </td>
                          <td className="py-3.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF8F6] text-[#635858] border border-[#E6DDDD]">
                              {o.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 pr-2 text-right font-mono font-bold text-[#221D1D]">
                            Rs. {o.grandTotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </main>

      <MobileNav />

      {/* Voice Order Recording Modal */}
      <VoiceOrderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        currentUser={currentUser}
        onOrderCreated={fetchDashboardData}
      />

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={selectedOrder}
        currentUser={currentUser}
        onOrderUpdated={fetchDashboardData}
      />

      {/* Floating Safe Copilot Assistant */}
      <SafeCopilot currentUser={currentUser} />
    </div>
  );
}
