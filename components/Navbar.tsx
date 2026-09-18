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
  ShieldCheck,
  Building2
} from 'lucide-react';
import { User, Notification, Role } from '@/lib/types';
import Logo from '@/components/Logo';

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
    const interval = setInterval(fetchNotifications, 15000); // 15s poll
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
    } catch {
      // ignore
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
      setUnreadCount(0);
    } catch {
      // ignore
    }
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

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'BOSS':
        return <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold border border-amber-300">👑 Boss</span>;
      case 'CONTROLLER':
        return <span className="bg-emerald-100 text-emerald-900 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-300">🛡️ Controller</span>;
      case 'MANAGER':
        return <span className="bg-purple-100 text-purple-900 text-xs px-2 py-0.5 rounded-full font-bold border border-purple-300">👔 Manager</span>;
      case 'AREA_SALES_MANAGER':
        return <span className="bg-blue-100 text-blue-900 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-200">📈 Area Manager</span>;
      case 'MARKETING_EXECUTIVE':
        return <span className="bg-teal-100 text-teal-900 text-xs px-2 py-0.5 rounded-full font-medium border border-teal-200">📣 Marketing</span>;
      case 'SALES_PERSON':
        return <span className="bg-sky-100 text-sky-900 text-xs px-2 py-0.5 rounded-full font-medium border border-sky-200">👨‍💼 Sales</span>;
      default:
        return null;
    }
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  return (
    <nav className="glass-nav sticky top-0 z-40 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group">
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5 text-sm font-medium">
            <Link 
              href="/" 
              className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                pathname === '/' ? 'bg-slate-900 text-white font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/orders" 
              className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'bg-slate-900 text-white font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Orders
            </Link>
            <Link 
              href="/products" 
              className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                pathname.startsWith('/products') ? 'bg-slate-900 text-white font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Products & Rates
            </Link>
            {isFullAccess && (
              <>
                <Link 
                  href="/team" 
                  className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                    pathname.startsWith('/team') ? 'bg-slate-900 text-white font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Sales Team
                </Link>
                <Link 
                  href="/settings" 
                  className={`px-3.5 py-1.5 rounded-xl transition-colors ${
                    pathname.startsWith('/settings') ? 'bg-slate-900 text-white font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Settings
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Section: Search, CTA, Notifs, Profile */}
        <div className="flex items-center gap-3">
          
          {/* Quick Search */}
          <div className="relative hidden xl:block w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, clients, items..."
              value={searchVal}
              onChange={handleSearch}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400 text-slate-700"
            />
          </div>

          {/* New Order CTA */}
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </Link>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 korean-card p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400">No notifications yet</p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          !n.read ? 'bg-teal-50/60 border-teal-200/80' : 'bg-slate-50/80 border-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="font-semibold text-slate-800 mb-0.5">{n.title}</div>
                        <p className="text-slate-600 leading-relaxed mb-1.5">{n.message}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {n.orderNumber && (
                            <Link 
                              href={`/orders?search=${n.orderNumber}`}
                              className="text-teal-600 hover:underline font-semibold"
                              onClick={() => setShowNotifs(false)}
                            >
                              View Order →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Role Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-xs transition-all"
            >
              {activeUser?.avatar ? (
                <img 
                  src={activeUser.avatar} 
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src.includes('assest')) {
                      target.src = target.src.replace('assest', 'images');
                    }
                  }}
                  alt={activeUser.name} 
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-600 text-white font-bold text-xs flex items-center justify-center">
                  {activeUser ? activeUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight">
                  {activeUser?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {getRoleBadge(activeUser?.role)}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 korean-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 border-b border-slate-100 mb-2">
                  <div className="flex items-center gap-2.5 mb-2">
                    {activeUser?.avatar ? (
                      <img 
                        src={activeUser.avatar} 
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target.src.includes('assest')) {
                            target.src = target.src.replace('assest', 'images');
                          }
                        }}
                        alt={activeUser.name} 
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                        {activeUser?.name?.charAt(0)}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-bold text-sm text-slate-900 truncate">{activeUser?.name}</div>
                      <div className="text-xs text-slate-500 truncate">{activeUser?.email}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">{activeUser?.designation}</div>
                  {activeUser?.vehicle && (
                    <div className="mt-1 text-[10px] text-slate-500 bg-slate-100 inline-block px-1.5 py-0.5 rounded font-mono">
                      🏍️ {activeUser.vehicle}
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-xs font-medium">
                  <Link 
                    href="/orders" 
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                    onClick={() => setShowProfile(false)}
                  >
                    <Package className="w-4 h-4 text-slate-400" />
                    My Orders
                  </Link>

                  {isFullAccess && (
                    <Link 
                      href="/settings" 
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
                      onClick={() => setShowProfile(false)}
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Office WhatsApp Settings
                    </Link>
                  )}

                  <div className="border-t border-slate-100 my-1 pt-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
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
