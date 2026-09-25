'use client';

import React, { useState } from 'react';
import { X, FileEdit, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Order } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onCorrectionRequested: () => void;
}

export default function OrderCorrectionModal({
  isOpen,
  onClose,
  order,
  onCorrectionRequested,
}: Props) {
  const [reason, setReason] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(order.requiredDeliveryDate || '');
  const [requestedRemarks, setRequestedRemarks] = useState(order.remarks || '');
  const [itemChanges, setItemChanges] = useState<{ [id: string]: { quantity: number; offeredRate: number } }>(() => {
    const initial: any = {};
    order.items.forEach(i => {
      initial[i.id] = { quantity: i.quantity, offeredRate: i.offeredRate };
    });
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!reason.trim()) {
      setErrorMsg('Please specify the exact reason for the correction request.');
      return;
    }

    setSubmitting(true);
    try {
      const originalValues = {
        deliveryDate: order.requiredDeliveryDate,
        remarks: order.remarks,
        items: order.items.map(i => ({
          id: i.id,
          productName: i.productName,
          quantity: i.quantity,
          offeredRate: i.offeredRate,
          totalAmount: i.totalAmount,
        })),
        grandTotal: order.grandTotal,
      };

      const requestedItems = order.items.map(i => {
        const changed = itemChanges[i.id] || { quantity: i.quantity, offeredRate: i.offeredRate };
        return {
          id: i.id,
          productName: i.productName,
          quantity: Number(changed.quantity),
          offeredRate: Number(changed.offeredRate),
          totalAmount: Number(changed.quantity) * Number(changed.offeredRate),
        };
      });

      const newGrandTotal = requestedItems.reduce((sum, i) => sum + i.totalAmount, 0);

      const requestedValues = {
        deliveryDate: requestedDeliveryDate,
        remarks: requestedRemarks,
        items: requestedItems,
        grandTotal: newGrandTotal,
      };

      const res = await fetch('/api/orders/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason: reason.trim(),
          originalValues,
          requestedValues,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to submit correction request');
      }

      onCorrectionRequested();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-[#E6DDDD] shadow-2xl p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <FileEdit className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#221D1D]">Request Order Correction</h2>
              <p className="text-[11px] text-[#635858]">Order #{order.orderNumber || order.id.slice(0, 8)} - {order.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#635858] hover:bg-[#FAF8F6]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 my-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <strong>Audit Protected:</strong> Changes will be formally reviewed by Management before being applied. The original order snapshot is permanently preserved in the audit log.
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
              Reason for Correction *
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client requested 5 additional bags of Tiger Shell Black or modified delivery date..."
              className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#635858] uppercase mb-2">
              Item Adjustments (Quantities & Rates)
            </label>
            <div className="space-y-2 border border-[#E6DDDD] rounded-xl p-3 bg-[#FAF8F6]">
              {order.items.map(item => {
                const current = itemChanges[item.id] || { quantity: item.quantity, offeredRate: item.offeredRate };
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-[#E6DDDD] text-xs">
                    <div>
                      <span className="font-bold text-[#221D1D]">{item.productName}</span>
                      <span className="text-[10px] text-[#AF9292] ml-1">({item.packing || 'Std'})</span>
                      <div className="text-[10px] text-[#635858]">
                        Original: {item.quantity} {item.unit} @ Rs. {item.offeredRate}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-[9px] text-[#AF9292] uppercase block">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={current.quantity}
                          onChange={e => setItemChanges({
                            ...itemChanges,
                            [item.id]: { ...current, quantity: Number(e.target.value) },
                          })}
                          className="w-16 px-2 py-1 bg-[#FAF8F6] border border-[#C8B5A9] rounded-lg text-xs font-semibold text-center"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-[#AF9292] uppercase block">Rate (Rs)</span>
                        <input
                          type="number"
                          min="0"
                          value={current.offeredRate}
                          onChange={e => setItemChanges({
                            ...itemChanges,
                            [item.id]: { ...current, offeredRate: Number(e.target.value) },
                          })}
                          className="w-20 px-2 py-1 bg-[#FAF8F6] border border-[#C8B5A9] rounded-lg text-xs font-semibold text-right"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Requested Delivery Date
              </label>
              <input
                type="date"
                value={requestedDeliveryDate}
                onChange={e => setRequestedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#635858] uppercase mb-1">
                Requested Remarks
              </label>
              <input
                type="text"
                value={requestedRemarks}
                onChange={e => setRequestedRemarks(e.target.value)}
                placeholder="Updated instructions"
                className="w-full px-3 py-2 text-xs bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
              />
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
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
