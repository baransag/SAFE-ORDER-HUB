'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  User as UserIcon, 
  Filter, 
  FileText, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { User, AuditLog } from '@/lib/types';

export default function AuditPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
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

      const params = new URLSearchParams();
      if (entityFilter !== 'ALL') params.set('entity', entityFilter);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                System Audit & Activity Trail
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {logs.length} Entries
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographic and chronological record of all orders, status updates, rate approvals, and administrative actions.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="korean-card p-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Entity:</span>
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Events</option>
            <option value="ORDER">Orders</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PRODUCT">Products</option>
            <option value="DELIVERY">Deliveries</option>
            <option value="SETTINGS">System Settings</option>
          </select>
        </div>

        {/* Logs Timeline / Table */}
        <div className="korean-card overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No audit records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor / User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details / Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{log.userName}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{log.userRole}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-semibold">
                        {log.entity}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                        {log.newValue && (
                          <div className="font-medium truncate">{log.newValue}</div>
                        )}
                        {log.oldValue && (
                          <div className="text-[10px] text-slate-400 truncate">Previous: {log.oldValue}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
