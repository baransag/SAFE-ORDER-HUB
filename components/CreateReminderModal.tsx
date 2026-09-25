'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, AlertCircle, Phone, UserCheck } from 'lucide-react';
import { User, Order, Customer, ReminderPurpose } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onReminderCreated: () => void;
  initialCustomerId?: string;
  initialOrderId?: string;
}

export default function CreateReminderModal({
  isOpen,
  onClose,
  onReminderCreated,
  initialCustomerId,
  initialOrderId,
}: Props) {
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [purpose, setPurpose] = useState<ReminderPurpose>('PAYMENT_COLLECTION');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [notes, setNotes] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
    if (initialOrderId) setOrderId(initialOrderId);
  }, [initialCustomerId, initialOrderId]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch('/api/team').then(r => r.ok ? r.json() : { team: [] }),
        fetch('/api/orders?limit=50').then(r => r.ok ? r.json() : { orders: [] }),
        fetch('/api/customers').then(r => r.ok ? r.json() : { customers: [] }),
      ]).then(([teamData, ordersData, custData]) => {
        setUsers(teamData.team || []);
        setOrders(ordersData.orders || []);
        setCustomers(custData.customers || []);
      }).catch(err => console.error('Error fetching references:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerId || !dueDate || !assignedToId || !purpose) {
      setErrorMsg('Please select Customer, Follow-up Date/Time, Purpose, and Assigned Employee.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          orderId: orderId || undefined,
          purpose,
          dueDate: new Date(dueDate).toISOString(),
          assignedToId,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create follow-up reminder');
      }

      onReminderCreated();
      onClose();
      // Reset
      setDueDate('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E6DDDD] shadow-2xl p-6 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#221D1D]">Schedule Customer Follow-up Reminder</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#635858] hover:bg-[#FAF8F6]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.companyName} - {c.city}) - {c.phone}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Reminder Purpose *
              </label>
              <select
                value={purpose}
                onChange={e => setPurpose(e.target.value as ReminderPurpose)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none font-semibold"
              >
                <option value="PAYMENT_COLLECTION">Payment Collection</option>
                <option value="DELIVERY_CHECK">Delivery Check</option>
                <option value="REORDER_INQUIRY">Reorder Inquiry</option>
                <option value="TECHNICAL_SUPPORT">Technical Support</option>
                <option value="GENERAL_FOLLOWUP">General Follow-up</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Linked Order (Optional)
              </label>
              <select
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="">None / General</option>
                {orders
                  .filter(o => !customerId || o.customerId === customerId)
                  .map(o => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber || o.id.slice(0, 8)} (PKR {Number(o.grandTotal || 0).toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Follow-up Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Assigned Employee *
              </label>
              <select
                value={assignedToId}
                onChange={e => setAssignedToId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="">-- Choose Employee --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
              Notes / Context
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Call client about payment cheque confirmation or project site delivery reception..."
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6DDDD]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#635858] hover:bg-[#FAF8F6] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-[#221D1D] text-white hover:bg-black rounded-xl shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Set Reminder'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
