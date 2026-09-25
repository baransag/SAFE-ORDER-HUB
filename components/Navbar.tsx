'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, 
  Plus, 
  Search, 
  LogOut, 
  User as UserIcon, 
  Package, 
  Layers, 
  Users, 
  Settings, 
  CheckCheck,
  ChevronDown,
  Building2,
  Truck,
  FileSpreadsheet,
  ShieldCheck,
  MessageSquare,
  Mic,
  ArrowRight
} from 'lucide-react';
import { User, Notification, Role } from '@/lib/types';
import Logo from '@/components/Logo';
import { getUserAvatar, getUserInitials } from '@/lib/avatar';

interface Props {
  currentUser?: User | null;
  onSearchChange?: (q: string) => void;
}

export default function Navbar({ currentUser, onSearchChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeUser, setActiveUser] = useState<User | null>(currentUser || null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    } else {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) setActiveUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const isFullAccess = activeUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(activeUser.role);
  const avatar = getUserAvatar(activeUser);
  const initials = getUserInitials(activeUser?.name);

  return (
    <nav className="glass-nav sticky top-0 z-40 px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-6 xl:gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-semibold">
            <Link 
              href="/" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname === '/' 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              Dashboard
            </Link>

            <Link 
              href="/orders" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith('/orders') && pathname !== '/orders/new' 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              Orders
            </Link>

            <Link 
              href="/customers" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith('/customers') 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              Customers
            </Link>

            <Link 
              href="/products" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith('/products') 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              Products & Rates
            </Link>

            <Link 
              href="/templates" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith('/templates') 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              Templates
            </Link>

            <Link 
              href="/documents" 
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith('/documents') 
                  ? 'bg-[#221D1D] text-white shadow-xs' 
                  : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
              }`}
            >
              📄 Technical Library
            </Link>

            {isFullAccess && (
              <>
                <Link 
                  href="/deliveries" 
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/deliveries') 
                      ? 'bg-[#221D1D] text-white shadow-xs' 
                      : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
                  }`}
                >
                  Deliveries
                </Link>

                <Link 
                  href="/reports" 
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/reports') 
                      ? 'bg-[#221D1D] text-white shadow-xs' 
                      : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
                  }`}
                >
                  Reports
                </Link>

                <Link 
                  href="/team" 
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/team') 
                      ? 'bg-[#221D1D] text-white shadow-xs' 
                      : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
                  }`}
                >
                  Team
                </Link>

                <Link 
                  href="/audit" 
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/audit') 
                      ? 'bg-[#221D1D] text-white shadow-xs' 
                      : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
                  }`}
                >
                  Audit
                </Link>

                <Link 
                  href="/settings" 
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    pathname.startsWith('/settings') 
                      ? 'bg-[#221D1D] text-white shadow-xs' 
                      : 'text-[#635858] hover:text-[#221D1D] hover:bg-white'
                  }`}
                >
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          
          {/* Quick Search */}
          <div className="relative hidden xl:block w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#AF9292]" />
            <input
              type="text"
              placeholder="Search orders, clients..."
              value={searchVal}
              onChange={handleSearch}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#C8B5A9] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#B7937A] text-[#221D1D]"
            />
          </div>

          {/* New Order CTA */}
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Order</span>
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-[#635858] hover:text-[#221D1D] hover:bg-white border border-transparent hover:border-[#E6DDDD] transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#AF9292] animate-soft-pulse" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 korean-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6DDDD]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#221D1D]">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#AF9292] text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-[#B7937A] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifs(false)}
                      className="text-[11px] font-bold text-[#221D1D] hover:underline"
                    >
                      View All
                    </Link>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#635858]">No notifications</div>
                  ) : (
                    notifications.slice(0, 6).map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifs(false);
                          if (n.orderId) router.push(`/orders?search=${n.orderNumber || n.orderId}`);
                        }}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          !n.read ? 'bg-[#FAF8F6] border-[#B7937A]/50 font-medium' : 'bg-white border-[#E6DDDD] text-[#635858]'
                        }`}
                      >
                        <div className="font-bold text-[#221D1D] truncate">{n.title}</div>
                        <div className="text-[11px] line-clamp-2 mt-0.5">{n.message}</div>
                        <div className="text-[9px] text-[#AF9292] font-mono mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 pl-2 rounded-2xl hover:bg-white border border-transparent hover:border-[#E6DDDD] transition-all"
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={activeUser?.name} 
                  className="w-7 h-7 rounded-xl object-cover border border-[#C8B5A9]"
                />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-[#BCAEC4]/30 text-[10px] font-bold text-[#221D1D] flex items-center justify-center">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left pr-1">
                <div className="text-xs font-bold text-[#221D1D] leading-tight">
                  {activeUser?.name?.split(' ')[0] || 'User'}
                </div>
                <div className="text-[9px] font-semibold text-[#AF9292] uppercase">
                  {activeUser?.role}
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-[#635858] hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-60 korean-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-[#E6DDDD] mb-2">
                  <div className="font-bold text-xs text-[#221D1D]">{activeUser?.name}</div>
                  <div className="text-[10px] text-[#635858] truncate">{activeUser?.email}</div>
                  <div className="text-[10px] text-[#AF9292] font-semibold mt-0.5">{activeUser?.designation}</div>
                </div>

                <div className="space-y-1 text-xs font-semibold">
                  <Link 
                    href="/profile" 
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#221D1D] hover:bg-[#FAF8F6]"
                    onClick={() => setShowProfile(false)}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#B7937A]" />
                    <span>My Profile</span>
                  </Link>

                  <Link 
                    href="/orders" 
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#221D1D] hover:bg-[#FAF8F6]"
                    onClick={() => setShowProfile(false)}
                  >
                    <Package className="w-3.5 h-3.5 text-[#B7937A]" />
                    <span>My Orders</span>
                  </Link>

                  <Link 
                    href="/templates" 
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#221D1D] hover:bg-[#FAF8F6]"
                    onClick={() => setShowProfile(false)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#B7937A]" />
                    <span>Message Templates</span>
                  </Link>

                  {isFullAccess && (
                    <Link 
                      href="/settings" 
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#221D1D] hover:bg-[#FAF8F6]"
                      onClick={() => setShowProfile(false)}
                    >
                      <Settings className="w-3.5 h-3.5 text-[#B7937A]" />
                      <span>System Settings</span>
                    </Link>
                  )}

                  <div className="border-t border-[#E6DDDD] my-1 pt-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </nav>
  );
}
