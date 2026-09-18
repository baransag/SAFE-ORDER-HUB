'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Plus, Layers, User as UserIcon } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on login page
  if (pathname === '/login') return null;

  return (
    <div className="md:hidden fixed bottom-4 inset-x-0 z-40 px-4 flex justify-center pointer-events-none">
      <div className="glass-bottom-bar pointer-events-auto px-4 py-2 flex items-center justify-between gap-6 max-w-sm w-full">
        
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname === '/' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>

        <Link 
          href="/orders" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </Link>

        {/* Center Prominent CTA */}
        <Link 
          href="/orders/new" 
          className="relative -top-4 w-12 h-12 rounded-full grad-lavender-emerald flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
          title="New Order"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </Link>

        <Link 
          href="/products" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/products') ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Products</span>
        </Link>

        <Link 
          href="/team" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/team') || pathname.startsWith('/settings') ? 'text-teal-600 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px]">Team</span>
        </Link>

      </div>
    </div>
  );
}
