'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  Package, 
  Truck, 
  AlertTriangle, 
  ChevronRight, 
  Filter,
  ArrowRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { Notification, User } from '@/lib/types';

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, notifRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/notifications'),
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, read: true }) : n));
    } catch {}
  };

  const filtered = filter === 'UNREAD' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return <Package className="w-4 h-4 text-[#B7937A]" />;
      case 'RATE_REVIEW':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'DELIVERY':
        return <Truck className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#BCAEC4]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12 text-[#221D1D]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-7 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#221D1D] tracking-tight flex items-center gap-2.5">
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#AF9292] text-white">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-xs text-[#635858] mt-0.5">
              Real-time operational alerts, rate reviews, order updates, and dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#FAF8F6] p-1 rounded-xl border border-[#C8B5A9]/50 text-xs font-semibold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === 'ALL' ? 'bg-white text-[#221D1D] shadow-xs' : 'text-[#635858]'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filter === 'UNREAD' ? 'bg-white text-[#221D1D] shadow-xs' : 'text-[#635858]'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F6] text-[#221D1D] border border-[#C8B5A9] font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div className="korean-card py-16 text-center space-y-2">
            <Bell className="w-8 h-8 text-[#C8B5A9] mx-auto opacity-70" />
            <p className="text-sm font-bold text-[#221D1D]">All caught up!</p>
            <p className="text-xs text-[#635858]">No pending notifications in this view.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(notif => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) handleMarkRead(notif.id);
                  if (notif.orderId) {
                    router.push(`/orders?search=${notif.orderNumber || notif.orderId}`);
                  }
                }}
                className={`korean-card p-4 flex items-start justify-between gap-4 cursor-pointer transition-all ${
                  !notif.read ? 'bg-white border-[#B7937A] shadow-xs' : 'bg-[#FAF8F6]/70 border-[#E6DDDD] hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !notif.read ? 'bg-[#BCAEC4]/30' : 'bg-white border border-[#E6DDDD]'
                  }`}>
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs ${!notif.read ? 'font-black text-[#221D1D]' : 'font-semibold text-[#635858]'}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#AF9292]" />
                      )}
                    </div>
                    <p className="text-xs text-[#221D1D] leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="text-[10px] text-[#635858] font-medium pt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.orderId && (
                    <span className="text-[11px] font-bold text-[#B7937A] flex items-center gap-1 hover:underline">
                      <span>View Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <MobileNav />
    </div>
  );
}
