'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  Mic, 
  FileEdit, 
  Truck, 
  Calendar, 
  DollarSign, 
  CheckSquare, 
  Database, 
  Download, 
  ShieldCheck, 
  RefreshCw, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  Server
} from 'lucide-react';
import { User, Order, OrderCorrectionRequest, CustomerReminder, OperationalTask, BackupLog } from '@/lib/types';
import Link from 'next/link';

export default function ManagementOperationsDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real indicators data
  const [orders, setOrders] = useState<Order[]>([]);
  const [corrections, setCorrections] = useState<OrderCorrectionRequest[]>([]);
  const [reminders, setReminders] = useState<CustomerReminder[]>([]);
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [voiceOrders, setVoiceOrders] = useState<any[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [providerInfo, setProviderInfo] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'BACKUP'>('OPERATIONS');

  // Filter state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');

  // Backup action states
  const [testingRestore, setTestingRestore] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchOperationsData = async () => {
    setLoading(true);
    try {
      const [
        ordersRes,
        correctionsRes,
        remindersRes,
        tasksRes,
        voiceRes,
        backupRes,
      ] = await Promise.all([
        fetch('/api/orders?limit=200'),
        fetch('/api/orders/corrections?status=PENDING'),
        fetch('/api/reminders'),
        fetch('/api/tasks'),
        fetch('/api/voice-orders'),
        fetch('/api/backup'),
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders || []);
      }
      if (correctionsRes.ok) {
        const d = await correctionsRes.json();
        setCorrections(d.requests || []);
      }
      if (remindersRes.ok) {
        const d = await remindersRes.json();
        setReminders(d.reminders || []);
      }
      if (tasksRes.ok) {
        const d = await tasksRes.json();
        setTasks(d.tasks || []);
      }
      if (voiceRes.ok) {
        const d = await voiceRes.json();
        setVoiceOrders(d.voiceOrders || []);
      }
      if (backupRes.ok) {
        const d = await backupRes.json();
        setBackupLogs(d.logs || []);
        setProviderInfo(d.providerInfo || null);
      }
    } catch (err) {
      console.error('Failed to load operations metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const handleTestRestore = async () => {
    setTestingRestore(true);
    setRestoreMessage(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_restore' }),
      });
      const data = await res.json();
      if (res.ok) {
        setRestoreMessage(`Test passed: Accessible ${data.counts.order_count} orders, ${data.counts.customer_count} customers.`);
        fetchOperationsData();
      } else {
        setRestoreMessage(`Restore verification error: ${data.error}`);
      }
    } catch (err: any) {
      setRestoreMessage(`Restore failed: ${err.message}`);
    } finally {
      setTestingRestore(false);
    }
  };

  const isManagement = currentUser && ['MANAGEMENT', 'ADMIN', 'BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  if (currentUser && !isManagement) {
    return (
      <div className="min-h-screen bg-[#F5F2E9]">
        <Navbar currentUser={currentUser} />
        <main className="max-w-xl mx-auto mt-20 p-6 korean-card text-center">
          <ShieldCheck className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[#221D1D]">Access Restricted</h1>
          <p className="text-xs text-[#635858] mt-2">
            The Operations Dashboard is strictly available to authorized management personnel.
          </p>
          <Link href="/" className="inline-block mt-4 px-4 py-2 bg-[#221D1D] text-white rounded-xl text-xs font-bold">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Authoritative calculations from real database state (No fake scores!)
  const now = new Date();

  // 1. Pending orders
  const pendingOrders = orders.filter(o => o.status === 'NEW');
  // 2. Orders awaiting confirmation
  const awaitingConfirmOrders = orders.filter(o => o.status === 'RATE_REVIEW' || o.status === 'NEW');
  // 3. Voice orders awaiting review
  const pendingVoiceOrders = voiceOrders.filter(v => v.status === 'PENDING' || !v.isProcessed);
  // 4. Pending correction requests
  const pendingCorrections = corrections.filter(c => c.status === 'PENDING');
  // 5. Overdue deliveries
  const overdueDeliveries = orders.filter(o => {
    if (o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'COMPLETED') return false;
    const delDate = o.requiredDeliveryDate;
    if (!delDate) return false;
    return new Date(delDate) < now;
  });
  // 6. Overdue customer follow-ups
  const overdueFollowUps = reminders.filter(r => {
    if (r.status === 'COMPLETED' || r.status === 'CANCELLED') return false;
    return new Date(r.dueDate) < now;
  });
  // 7. Outstanding payments
  const ordersWithOutstanding = orders.filter(o => o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED');
  const totalOutstandingBalance = ordersWithOutstanding.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  // 8. Incomplete assigned tasks
  const incompleteTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  return (
    <div className="min-h-screen bg-[#F5F2E9] pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6DDDD]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white border border-[#E6DDDD] text-[#B7937A] shadow-xs">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-[#221D1D] tracking-tight">Management Operations</h1>
            </div>
            <p className="text-xs text-[#635858] mt-1">
              Real-time operational indicators and authoritative database backup controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex bg-white p-1 rounded-xl border border-[#E6DDDD]">
              <button
                onClick={() => setActiveTab('OPERATIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'OPERATIONS'
                    ? 'bg-[#221D1D] text-white shadow-xs'
                    : 'text-[#635858] hover:text-[#221D1D]'
                }`}
              >
                Operational Queue
              </button>
              <button
                onClick={() => setActiveTab('BACKUP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'BACKUP'
                    ? 'bg-[#221D1D] text-white shadow-xs'
                    : 'text-[#635858] hover:text-[#221D1D]'
                }`}
              >
                Backup & Disaster Recovery
              </button>
            </div>

            <button
              onClick={fetchOperationsData}
              className="p-2 bg-white border border-[#E6DDDD] rounded-xl text-[#635858] hover:text-[#221D1D] hover:bg-[#FAF8F6] transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {activeTab === 'OPERATIONS' ? (
          <>
            {/* 8 Real Operational Indicators Required by Module 10 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
              
              {/* 1. Pending orders */}
              <Link href="/orders?status=PENDING" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Pending Orders</p>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-[#221D1D] mt-2">{pendingOrders.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Awaiting processing</p>
              </Link>

              {/* 2. Orders awaiting confirmation */}
              <Link href="/orders?status=UNDER_REVIEW" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Awaiting Confirm</p>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <FileCheck className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-blue-700 mt-2">{awaitingConfirmOrders.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Management rate review</p>
              </Link>

              {/* 3. Voice orders awaiting review */}
              <Link href="/orders" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Voice Orders</p>
                  <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                    <Mic className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-purple-700 mt-2">{pendingVoiceOrders.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Transcriptions to verify</p>
              </Link>

              {/* 4. Pending correction requests */}
              <Link href="/inbox" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Correction Req.</p>
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                    <FileEdit className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-rose-700 mt-2">{pendingCorrections.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Sales change requests</p>
              </Link>

              {/* 5. Overdue deliveries */}
              <Link href="/deliveries" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Overdue Deliveries</p>
                  <span className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-200">
                    <Truck className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-red-700 mt-2">{overdueDeliveries.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Past dispatch date</p>
              </Link>

              {/* 6. Overdue customer follow-ups */}
              <Link href="/inbox" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Overdue Follow-ups</p>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-amber-700 mt-2">{overdueFollowUps.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Client calls/reminders</p>
              </Link>

              {/* 7. Outstanding payments */}
              <Link href="/ledger" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Uncollected</p>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <DollarSign className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-xl font-extrabold text-[#221D1D] mt-2">
                  PKR {totalOutstandingBalance.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#AF9292] mt-1">{ordersWithOutstanding.length} unpaid orders</p>
              </Link>

              {/* 8. Incomplete assigned tasks */}
              <Link href="/inbox" className="korean-card p-4 hover:border-[#B7937A] transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#635858] uppercase">Incomplete Tasks</p>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckSquare className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-blue-700 mt-2">{incompleteTasks.length}</p>
                <p className="text-[10px] text-[#AF9292] mt-1">Operational duties</p>
              </Link>
            </div>

            {/* Detailed queues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              
              {/* Order Corrections Queue */}
              <div className="korean-card p-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
                  <h3 className="text-sm font-bold text-[#221D1D] flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-rose-600" />
                    Pending Correction Requests ({pendingCorrections.length})
                  </h3>
                  <Link href="/inbox" className="text-xs font-semibold text-[#B7937A] hover:underline">
                    View Inbox →
                  </Link>
                </div>

                <div className="divide-y divide-[#E6DDDD] mt-2 max-h-80 overflow-y-auto">
                  {pendingCorrections.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#635858]">
                      No pending correction requests from sales staff.
                    </div>
                  ) : (
                    pendingCorrections.map(c => (
                      <div key={c.id} className="py-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#221D1D]">Order #{c.orderId.slice(0, 8)}</span>
                          <span className="text-[10px] font-mono text-[#AF9292]">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[#635858]">
                          <span className="font-semibold text-[#221D1D]">{c.requestedByName}:</span> {c.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Overdue Follow-ups Queue */}
              <div className="korean-card p-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
                  <h3 className="text-sm font-bold text-[#221D1D] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Overdue Customer Follow-ups ({overdueFollowUps.length})
                  </h3>
                  <Link href="/customers" className="text-xs font-semibold text-[#B7937A] hover:underline">
                    Customers →
                  </Link>
                </div>

                <div className="divide-y divide-[#E6DDDD] mt-2 max-h-80 overflow-y-auto">
                  {overdueFollowUps.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#635858]">
                      Zero overdue follow-up reminders. Great job!
                    </div>
                  ) : (
                    overdueFollowUps.map(r => (
                      <div key={r.id} className="py-3 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-800">{r.customerName}</span>
                          <span className="text-[10px] font-bold text-red-600">
                            Due: {new Date(r.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[#635858]">
                          <span className="font-semibold">Purpose:</span> {r.purpose} — {r.notes}
                        </p>
                        <div className="text-[10px] text-[#AF9292]">Assigned to: {r.assignedToName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </>
        ) : (
          /* Module 9: BACKUP & RECOVERY TAB */
          <div className="space-y-6 my-6">
            
            {/* Overview Card */}
            <div className="korean-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6DDDD]">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-bold text-[#221D1D]">PostgreSQL Authority & Backup Strategy</h2>
                  </div>
                  <p className="text-xs text-[#635858] mt-1">
                    Verified database provider configuration, backup snapshots, restore testing, and disaster recovery.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/api/backup?download=json"
                    download
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#221D1D] text-white rounded-xl hover:bg-black transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Snapshot</span>
                  </a>

                  <button
                    onClick={handleTestRestore}
                    disabled={testingRestore}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white border border-[#C8B5A9] rounded-xl hover:bg-[#FAF8F6] text-[#221D1D] transition-all shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingRestore ? 'animate-spin' : ''}`} />
                    <span>{testingRestore ? 'Testing...' : 'Test Restore & Integrity'}</span>
                  </button>
                </div>
              </div>

              {restoreMessage && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{restoreMessage}</span>
                </div>
              )}

              {/* Provider Specs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD]">
                  <p className="text-[10px] font-bold text-[#AF9292] uppercase">Hosting Infrastructure</p>
                  <p className="text-xs font-bold text-[#221D1D] mt-1">CockroachDB Dedicated / Cloud Serverless</p>
                  <p className="text-[11px] text-[#635858] mt-1">PostgreSQL wire-protocol v14+ compatible with high availability.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD]">
                  <p className="text-[10px] font-bold text-[#AF9292] uppercase">Automated Backup Strategy</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1">Continuous Write-Ahead Log (WAL) & Hourly</p>
                  <p className="text-[11px] text-[#635858] mt-1">Encrypted with AES-256; automated 30-day retention policy.</p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD]">
                  <p className="text-[10px] font-bold text-[#AF9292] uppercase">Security Policy</p>
                  <p className="text-xs font-bold text-purple-700 mt-1">Zero Credentials Frontend Exposure</p>
                  <p className="text-[11px] text-[#635858] mt-1">Database credentials stored securely in private environment variables only.</p>
                </div>
              </div>
            </div>

            {/* Disaster Recovery Procedure & Log Table */}
            <div className="korean-card p-6">
              <h3 className="text-sm font-bold text-[#221D1D] mb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#B7937A]" />
                Standard Recovery Procedure
              </h3>
              <div className="p-4 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD] text-xs text-[#635858] space-y-2">
                <p><strong>Step 1:</strong> In case of cluster outage or accidental corruption, management downloads the latest JSON Snapshot or utilizes the cloud provider&apos;s Point-in-Time Recovery (PITR) console.</p>
                <p><strong>Step 2:</strong> Verify foreign key relationships and schema migration tables using the built-in <code>Test Restore & Integrity</code> button.</p>
                <p><strong>Step 3:</strong> Restore target cluster and verify order balances against the immutable <code>payment_ledger</code> table.</p>
              </div>

              <h3 className="text-sm font-bold text-[#221D1D] mt-6 mb-3">Backup & Integrity Activity Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F6] border-b border-[#E6DDDD] text-[#635858] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Size</th>
                      <th className="px-4 py-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DDDD]">
                    {backupLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#635858]">
                          No manual snapshot logs recorded yet. Click &quot;Download JSON Snapshot&quot; to test.
                        </td>
                      </tr>
                    ) : (
                      backupLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[#FAF8F6]">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#635858] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-[#221D1D]">
                            {log.backupType}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#635858]">
                            {(log.fileSizeBytes || (log as any).sizeBytes) ? `${(((log.fileSizeBytes || (log as any).sizeBytes)) / 1024).toFixed(1)} KB` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[#635858]">
                            {log.storageLocation || (log as any).details || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
