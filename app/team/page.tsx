'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Phone, 
  Mail, 
  Package, 
  DollarSign, 
  Clock, 
  Bike, 
  ExternalLink,
  ShieldCheck,
  Building2,
  TrendingUp
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { User, Role } from '@/lib/types';

export default function TeamPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, statsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/stats')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (!['BOSS', 'CONTROLLER', 'MANAGER'].includes(authData.user.role)) {
        router.push('/');
        return;
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setTeamStats(statsData.stats?.employeePerformance || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Sales & Marketing Personnel
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Field marketing executives, area sales managers, and individual order booking track records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {teamStats.length} Sales Accounts Active
            </span>
          </div>
        </div>

        {/* Team Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teamStats.map((emp, index) => {
            const gradientBlob = [
              'grad-mint-blush',
              'grad-lavender-emerald',
              'grad-lime-sky',
              'grad-champagne-coral',
              'grad-pink-cyan',
            ][index % 5];

            return (
              <div key={emp.id} className="korean-card p-6 space-y-5 relative overflow-hidden group">
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${gradientBlob} rounded-full blur-2xl opacity-40 pointer-events-none`} />

                {/* Profile top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {emp.avatar ? (
                      <img 
                        src={emp.avatar} 
                        alt={emp.name} 
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-md shrink-0" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                        {emp.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{emp.name}</h3>
                      <div className="text-[11px] font-semibold text-teal-700 mt-0.5">
                        {emp.designation}
                      </div>
                    </div>
                  </div>

                  {isFullAccess && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newUrl = prompt(`Enter image/photo URL for ${emp.name}:`, emp.avatar || '');
                        if (newUrl !== null) {
                          await fetch('/api/employees', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: emp.id, avatar: newUrl.trim() }),
                          });
                          fetchData();
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-slate-100 text-[10px] font-semibold transition-colors"
                      title="Set/Update Profile Picture"
                    >
                      📷 Photo
                    </button>
                  )}
                </div>

                {/* Contact & Vehicle */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.vehicle && (
                    <div className="flex items-center gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                      <Bike className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-mono text-[11px] font-bold text-slate-700">
                        {emp.vehicle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sales Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Orders</span>
                    <span className="text-base font-black text-slate-900 font-mono">{emp.ordersCount}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Total Sales Volume</span>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      Rs. {emp.totalSales.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Link to this employee's orders */}
                <Link
                  href={`/orders?search=${encodeURIComponent(emp.name)}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View {emp.name.split(' ')[0]}&apos;s Orders</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

              </div>
            );
          })}
        </div>

      </main>

      <MobileNav />
    </div>
  );
}
