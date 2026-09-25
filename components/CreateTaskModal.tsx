'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Calendar, UserCheck, AlertCircle, Clock } from 'lucide-react';
import { User, Order, Customer } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [relatedCustomerId, setRelatedCustomerId] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch users, orders, customers for selection dropdowns
      Promise.all([
        fetch('/api/team').then(r => r.ok ? r.json() : { team: [] }),
        fetch('/api/orders?limit=50').then(r => r.ok ? r.json() : { orders: [] }),
        fetch('/api/customers').then(r => r.ok ? r.json() : { customers: [] }),
      ]).then(([teamData, ordersData, custData]) => {
        setUsers(teamData.team || []);
        setOrders(ordersData.orders || []);
        setCustomers(custData.customers || []);
      }).catch(err => console.error('Error fetching task references:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !assignedToId || !dueDate) {
      setErrorMsg('Please fill in Title, Assigned Employee, and Due Date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assignedToId,
          priority,
          dueDate: new Date(dueDate).toISOString(),
          relatedOrderId: relatedOrderId || undefined,
          relatedCustomerId: relatedCustomerId || undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create task');
      }

      onTaskCreated();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setAssignedToId('');
      setDueDate('');
      setRelatedOrderId('');
      setRelatedCustomerId('');
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
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <CheckSquare className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-[#221D1D]">Create & Assign Operational Task</h2>
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
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Inspect warehouse packaging for Order #1042"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide exact operational steps, customer contact notes, or delivery checks..."
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Assign To Employee *
              </label>
              <select
                value={assignedToId}
                onChange={e => setAssignedToId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="">-- Select Employee --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Priority *
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Immediate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
              Due Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Related Order (Optional)
              </label>
              <select
                value={relatedOrderId}
                onChange={e => setRelatedOrderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="">None</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{o.orderNumber || o.id.slice(0, 8)} ({o.customerName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Related Customer (Optional)
              </label>
              <select
                value={relatedCustomerId}
                onChange={e => setRelatedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              >
                <option value="">None</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
