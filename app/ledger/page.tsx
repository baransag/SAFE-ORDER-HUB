'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  CreditCard, 
  DollarSign, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Building, 
  CheckCircle2, 
  Filter, 
  Calendar, 
  RefreshCw,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { PaymentLedgerEntry, Order, User, PaymentMethod, PaymentType } from '@/lib/types';
import Link from 'next/link';

export default function PaymentLedgerPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<PaymentLedgerEntry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);

  // New Payment Form state
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentType, setPaymentType] = useState<PaymentType>('PARTIAL');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ledgerRes, ordersRes] = await Promise.all([
        fetch('/api/ledger'),
        fetch('/api/orders?limit=100'),
      ]);

      if (ledgerRes.ok) {
        const ledgerData = await ledgerRes.json();
        setEntries(ledgerData.entries || []);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.error('Error fetching ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedOrderId || !amount) {
      setErrorMsg('Please select an order and enter the payment amount.');
      return;
    }

    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) {
      setErrorMsg('Selected order was not found.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
          amount: parseFloat(amount),
          paymentMethod,
          transactionRef,
          paymentType,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }

      setSuccessMsg('Payment transaction recorded successfully.');
      setShowModal(false);
      setSelectedOrderId('');
      setAmount('');
      setTransactionRef('');
      setNotes('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
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
            The Payment Ledger is strictly restricted to Management & Finance Controllers.
          </p>
          <Link href="/" className="inline-block mt-4 px-4 py-2 bg-[#221D1D] text-white rounded-xl text-xs font-bold">
            Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Calculate authoritative financials
  const totalReceived = entries
    .filter(e => e.paymentType !== 'REFUND')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalRefunded = entries
    .filter(e => e.paymentType === 'REFUND')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalOrderValue = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
  const netCollected = totalReceived - totalRefunded;
  const estimatedOutstanding = Math.max(0, totalOrderValue - netCollected);

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (methodFilter !== 'ALL' && e.paymentMethod !== methodFilter) return false;
    if (typeFilter !== 'ALL' && e.paymentType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.recordedByName && e.recordedByName.toLowerCase().includes(q)) ||
        e.orderId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <div className="min-h-screen bg-[#F5F2E9] pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6DDDD]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white border border-[#E6DDDD] text-[#B7937A] shadow-xs">
                <Receipt className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-[#221D1D] tracking-tight">Payment Ledger</h1>
            </div>
            <p className="text-xs text-[#635858] mt-1">
              Authoritative financial record. Payments affect order status automatically and cannot be silently altered.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#221D1D] text-white rounded-xl hover:bg-black shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Record Payment</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2 bg-white border border-[#E6DDDD] rounded-xl text-[#635858] hover:text-[#221D1D] hover:bg-[#FAF8F6] transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
          <div className="korean-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#635858] uppercase">Net Collected</p>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 mt-2">
              PKR {netCollected.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#AF9292] mt-1 font-mono">{entries.length} validated payments</p>
          </div>

          <div className="korean-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#635858] uppercase">Outstanding Balance</p>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#221D1D] mt-2">
              PKR {estimatedOutstanding.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#AF9292] mt-1 font-mono">From confirmed orders</p>
          </div>

          <div className="korean-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#635858] uppercase">Total Refunds</p>
              <span className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-extrabold text-rose-700 mt-2">
              PKR {totalRefunded.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#AF9292] mt-1 font-mono">Explicitly accounted</p>
          </div>

          <div className="korean-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[#635858] uppercase">Audit & Security</p>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="text-sm font-bold text-[#221D1D] mt-2">PostgreSQL Authoritative</p>
            <p className="text-[10px] text-[#635858] mt-1">Audit log records every transaction</p>
          </div>
        </div>

        {/* Filters */}
        <div className="korean-card p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#AF9292]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by ref, notes, recorded by, or order ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-[#221D1D] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-[#221D1D] focus:outline-none"
            >
              <option value="ALL">Method: All</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-[#221D1D] focus:outline-none"
            >
              <option value="ALL">Type: All</option>
              <option value="ADVANCE">Advance</option>
              <option value="PARTIAL">Partial</option>
              <option value="FULL">Full</option>
              <option value="REFUND">Refund</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="korean-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F6] border-b border-[#E6DDDD] text-[#635858] font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Reference / Cheque</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DDDD]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-xs text-[#635858]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B7937A]" />
                      Loading payment ledger...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-[#635858]">
                      No payment records found. Use &quot;Record Payment&quot; above to log an authentic transaction.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(e => {
                    const isRefund = e.paymentType === 'REFUND';
                    return (
                      <tr key={e.id} className="hover:bg-[#FAF8F6]/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-[#635858] whitespace-nowrap">
                          {new Date(e.paymentDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#221D1D] whitespace-nowrap">
                          <Link 
                            href={`/orders?search=${e.orderId}`} 
                            className="text-[#B7937A] hover:underline"
                          >
                            #{e.orderId.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-bold font-mono whitespace-nowrap">
                          <span className={isRefund ? 'text-rose-600' : 'text-emerald-700'}>
                            {isRefund ? '-' : '+'} PKR {Number(e.amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            e.paymentType === 'FULL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : e.paymentType === 'ADVANCE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : e.paymentType === 'REFUND'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {e.paymentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-[#635858] bg-[#FAF8F6] px-2 py-0.5 rounded border border-[#E6DDDD] text-[10px]">
                            {e.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-[#635858] whitespace-nowrap">
                          {e.referenceNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#635858] max-w-xs truncate">
                          {e.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-[#221D1D] font-medium whitespace-nowrap">
                          {e.recordedByName}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Payment Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl border border-[#E6DDDD] shadow-2xl p-6 animate-in zoom-in-95 duration-150">
              <h2 className="text-lg font-bold text-[#221D1D]">Record Verified Payment</h2>
              <p className="text-xs text-[#635858] mt-1">
                Enter payment details. The authoritative outstanding balance will be automatically calculated.
              </p>

              {errorMsg && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                    Select Order *
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
                  >
                    <option value="">-- Choose an order --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        #{o.orderNumber || o.id.slice(0, 8)} - {o.customerName} (PKR {Number(o.grandTotal || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedOrder && (
                  <div className="p-2.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD] text-xs space-y-1">
                    <div className="flex justify-between text-[#635858]">
                      <span>Customer:</span>
                      <span className="font-semibold text-[#221D1D]">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between text-[#635858]">
                      <span>Order Total:</span>
                      <span className="font-bold text-[#221D1D]">PKR {Number(selectedOrder.grandTotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#635858]">
                      <span>Current Status:</span>
                      <span className="font-bold text-[#B7937A]">{selectedOrder.paymentStatus}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                      Amount (PKR) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                      Payment Type *
                    </label>
                    <select
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value as PaymentType)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
                    >
                      <option value="ADVANCE">Advance</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="FULL">Full Settlement</option>
                      <option value="REFUND">Refund</option>
                      <option value="CREDIT">Store Credit</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                      Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="ONLINE">Online Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                      Reference / Cheque #
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={e => setTransactionRef(e.target.value)}
                      placeholder="e.g. TXN-98402"
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Details about bank slip, payer, or special conditions..."
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6DDDD]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#635858] hover:bg-[#FAF8F6] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-bold bg-[#221D1D] text-white hover:bg-black rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Recording...' : 'Save & Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
