'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Building2, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import OrderDetailsDrawer from '@/components/OrderDetailsDrawer';
import { Order, OrderStatus, User } from '@/lib/types';

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [authRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/orders')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);

        // If search param points to a specific order, open drawer automatically
        const targetId = searchParams.get('search');
        if (targetId) {
          const match = (data.orders || []).find((o: Order) => o.orderNumber === targetId || o.id === targetId);
          if (match) {
            setSelectedOrder(match);
            setIsDrawerOpen(true);
          }
        }
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  // Unique cities in orders
  const cities = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => set.add(o.city));
    return Array.from(set);
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          order.orderNumber.toLowerCase().includes(q) ||
          order.companyName.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q) ||
          order.city.toLowerCase().includes(q) ||
          order.orderTakenByName.toLowerCase().includes(q) ||
          order.items.some(i => i.productName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // City
      if (cityFilter !== 'ALL' && order.city !== cityFilter) {
        return false;
      }

      // Date
      if (dateFilter !== 'ALL') {
        const created = new Date(order.createdAt);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (created.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'THIS_WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (created < weekAgo) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, dateFilter, cityFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Order Number,Date,Company,Customer,City,Products,Total Amount,Payment,Taken By,Status'];
    const rows = filteredOrders.map(o => {
      const prods = o.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join('; ');
      return `"${o.orderNumber}","${o.createdAt.split('T')[0]}","${o.companyName}","${o.customerName}","${o.city}","${prods}","${o.grandTotal}","${o.paymentStatus}","${o.orderTakenByName}","${o.status}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFE_ORDERS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} onSearchChange={setSearchQuery} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Orders Management
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredOrders.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFullAccess ? 'Showing company-wide order bookings & fulfillment' : `Showing orders booked by ${currentUser?.name}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 transition-all"
              title="Export filtered orders to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchData}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs shadow-xs hover:bg-slate-50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/orders/new"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>＋ New Order</span>
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="korean-card p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, company, person, city, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New Orders</option>
              <option value="RATE_REVIEW">⚠️ Rate Review Required</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
            </select>

            {/* City Filter */}
            {cities.length > 0 && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Cities</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {(searchQuery || statusFilter !== 'ALL' || dateFilter !== 'ALL' || cityFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateFilter('ALL');
                  setCityFilter('ALL');
                }}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Orders Table (Desktop) & Card List (Mobile) */}
        {loading ? (
          <div className="korean-card p-12 text-center">
            <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading orders database...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="korean-card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No orders matched your current filter criteria. Try resetting filters or submit a new order.
            </p>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Order</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block korean-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer / Site</th>
                    <th className="py-3.5 px-4">City</th>
                    <th className="py-3.5 px-4">Products</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Booked By</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {filteredOrders.map(order => {
                    const primaryProduct = order.items[0];
                    const extraItemsCount = order.items.length - 1;

                    return (
                      <tr 
                        key={order.id} 
                        onClick={() => handleOrderClick(order)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                            {order.orderNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {order.companyName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {order.customerName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {order.city}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                            {primaryProduct?.productName} ({primaryProduct?.quantity} {primaryProduct?.unit})
                          </div>
                          {extraItemsCount > 0 && (
                            <span className="text-[10px] text-teal-600 font-medium">
                              +{extraItemsCount} more item{extraItemsCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900">
                            Rs. {order.grandTotal.toLocaleString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {order.paymentStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 truncate max-w-[140px]">
                            {order.orderTakenByName}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <OrderStatusBadge status={order.status} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => handleOrderClick(order)}
                  className="korean-card p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </div>

                  <div>
                    <div className="font-bold text-sm text-slate-800">{order.companyName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{order.city}</span>
                      <span>•</span>
                      <span>{order.customerName}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Products:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total:</span>
                      <span className="font-bold text-slate-900">Rs. {order.grandTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taken By:</span>
                      <span className="font-medium text-slate-700">{order.orderTakenByName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                    <span className="text-teal-600 font-semibold">Tap to view details →</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
          fetchData();
          setIsDrawerOpen(false);
        }}
      />

      <MobileNav />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

