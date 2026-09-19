'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Plus, Building2, Layers, Truck, FileSpreadsheet } from 'lucide-react';
import { User } from '@/lib/types';

export default function MobileNav() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Hide on login page
  if (pathname === '/login') return null;

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  return (
    <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-3 flex justify-center pointer-events-none">
      <div className="glass-bottom-bar pointer-events-auto px-4 py-2 flex items-center justify-between gap-4 max-w-sm w-full shadow-xl">
        
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname === '/' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>

        <Link 
          href="/orders" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </Link>

        {/* Center Prominent Primary Action */}
        <Link 
          href="/orders/new" 
          className="relative -top-4 w-12 h-12 rounded-full grad-lavender-emerald flex items-center justify-center text-white shadow-lg shadow-emerald-500/35 hover:scale-105 active:scale-95 transition-all"
          title="Create New Order"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Link>

        <Link 
          href="/customers" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/customers') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px]">Clients</span>
        </Link>

        {isFullAccess ? (
          <Link 
            href="/deliveries" 
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              pathname.startsWith('/deliveries') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px]">Delivery</span>
          </Link>
        ) : (
          <Link 
            href="/products" 
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              pathname.startsWith('/products') ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Rates</span>
          </Link>
        )}

      </div>
    </div>
  );
}
