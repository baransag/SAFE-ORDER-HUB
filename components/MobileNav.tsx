'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Plus, Inbox, MessageSquare, User as UserIcon } from 'lucide-react';
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

  if (pathname === '/login') return null;

  return (
    <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-3 flex justify-center pointer-events-none">
      <div className="glass-bottom-bar pointer-events-auto px-4 py-2 flex items-center justify-between gap-2 max-w-md w-full shadow-lg border border-[#B7937A]/25">
        
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname === '/' ? 'text-[#B7937A] font-bold' : 'text-[#635858] hover:text-[#221D1D]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px]">Home</span>
        </Link>

        {/* Smart Work Inbox */}
        <Link 
          href="/inbox" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/inbox') ? 'text-[#B7937A] font-bold' : 'text-[#635858] hover:text-[#221D1D]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span className="text-[9px]">Inbox</span>
        </Link>

        {/* Center Prominent Primary Action */}
        <Link 
          href="/orders/new" 
          className="relative -top-3 w-11 h-11 rounded-full bg-gradient-to-r from-[#AF9292] to-[#B7937A] flex items-center justify-center text-white shadow-lg shadow-[#B7937A]/30 hover:scale-105 active:scale-95 transition-all"
          title="Create New Order"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </Link>

        <Link 
          href="/orders" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/orders') && pathname !== '/orders/new' ? 'text-[#B7937A] font-bold' : 'text-[#635858] hover:text-[#221D1D]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[9px]">Orders</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-0.5 transition-colors ${
            pathname.startsWith('/profile') ? 'text-[#B7937A] font-bold' : 'text-[#635858] hover:text-[#221D1D]'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span className="text-[9px]">Profile</span>
        </Link>

      </div>
    </div>
  );
}
