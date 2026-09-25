'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  FileText, 
  Edit3, 
  User as UserIcon, 
  Truck, 
  Building,
  Calendar,
  CreditCard,
  ExternalLink,
  Share2,
  FileEdit,
  Check,
  Ban,
  Receipt,
  FileCheck
} from 'lucide-react';
import { Order, OrderStatus, Role, User, OrderCorrectionRequest, ProductDocumentLink } from '@/lib/types';
import OrderStatusBadge from './OrderStatusBadge';
import ThankYouModal from './ThankYouModal';
import OrderCorrectionModal from './OrderCorrectionModal';
import Link from 'next/link';

interface Props {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  currentUserRole?: Role;
  onOrderUpdated: () => void;
}

export default function OrderDetailsDrawer({
  order,
  isOpen,
  onClose,
  currentUser,
  currentUserRole,
  onOrderUpdated,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [showRateEdit, setShowRateEdit] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [editRates, setEditRates] = useState<{ [id: string]: number }>({});
  const [reviewNote, setReviewNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Senior Features: Corrections & Linked Technical Documents
  const [corrections, setCorrections] = useState<OrderCorrectionRequest[]>([]);
  const [productLinks, setProductLinks] = useState<{ [name: string]: ProductDocumentLink }>({});
  const [reviewingCorrectionId, setReviewingCorrectionId] = useState<string | null>(null);
  const [correctionReviewNote, setCorrectionReviewNote] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      // Fetch corrections for this order
      fetch(`/api/orders/corrections?orderId=${order.id}`)
        .then(r => r.ok ? r.json() : { requests: [] })
        .then(d => setCorrections(d.requests || []))
        .catch(() => {});

      // Fetch technical document links
      fetch('/api/documents/links')
        .then(r => r.ok ? r.json() : { links: [] })
        .then(d => {
          const mapping: { [name: string]: ProductDocumentLink } = {};
          (d.links || []).forEach((l: ProductDocumentLink) => {
            mapping[l.productName.trim().toLowerCase()] = l;
          });
          setProductLinks(mapping);
        })
        .catch(() => {});
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const effectiveRole = currentUser?.role || currentUserRole;
  const isFullAccess = effectiveRole && ['BOSS', 'CONTROLLER', 'MANAGER', 'MANAGEMENT', 'ADMIN'].includes(effectiveRole);

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          status: newStatus,
          note: statusNote || undefined,
        }),
      });
      if (res.ok) {
        setStatusNote('');
        onOrderUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveRates = async () => {
    setUpdating(true);
    try {
      const updatedItems = order.items.map(item => ({
        id: item.id,
        offeredRate: editRates[item.id] !== undefined ? editRates[item.id] : item.offeredRate,
        quantity: item.quantity,
      }));

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_RATES',
          updatedItems,
          reviewNote: reviewNote || 'Approved by Controller / Manager',
        }),
      });

      if (res.ok) {
        setShowRateEdit(false);
        onOrderUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleReviewCorrection = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdating(true);
    try {
      const res = await fetch('/api/orders/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status,
          reviewNotes: correctionReviewNote || (status === 'APPROVED' ? 'Correction approved' : 'Correction rejected'),
        }),
      });

      if (res.ok) {
        setReviewingCorrectionId(null);
        setCorrectionReviewNote('');
        onOrderUpdated();
        // Refresh corrections
        fetch(`/api/orders/corrections?orderId=${order.id}`)
          .then(r => r.json())
          .then(d => setCorrections(d.requests || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handlePostToGroup = () => {
    fetch(`/api/orders/${order.id}`)
      .then(r => r.json())
      .then(d => {
        const msg = d.formattedMessage || `🔔 ORDER: ${order.orderNumber}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 3500);
        const shareUrl = d.whatsappShareUrl || `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(shareUrl, '_blank');
      });
  };

  const handleOpenWhatsApp = () => {
    fetch(`/api/orders/${order.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.whatsappShareUrl || d.whatsappLink) {
          window.open(d.whatsappShareUrl || d.whatsappLink, '_blank');
        }
      });
  };

  const pendingCorrections = corrections.filter(c => c.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-over Content */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col z-10 animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-base text-slate-900">{order.orderNumber}</span>
              <OrderStatusBadge status={order.status} size="sm" />
              {order.urgency === 'URGENT' && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  ⚡ URGENT
                </span>
              )}
              {order.urgency === 'CRITICAL' && (
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                  🔥 CRITICAL
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Booked on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Request Correction CTA for Sales / Any Staff */}
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-xs"
              title="Request formal correction to this order"
            >
              <FileEdit className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Request Correction</span>
            </button>

            {isFullAccess && (
              <button
                onClick={() => setShowThankYouModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F6] hover:bg-[#E6DDDD] text-[#221D1D] border border-[#E6DDDD] text-xs font-bold transition-all shadow-xs"
                title="Generate & Send Client Thank You WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#B7937A]" />
                <span className="hidden sm:inline">Thank You</span>
              </button>
            )}
            <button
              onClick={handlePostToGroup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              title="Copy formatted order & open SAFE SOLUTIONS WhatsApp Group"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{copied ? '✓ Copied & Opening Group!' : 'Post to Group'}</span>
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs transition-all"
              title="Direct WhatsApp Share"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Pending Correction Banner (Module 3) */}
          {pendingCorrections.length > 0 && (
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <FileEdit className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                      Order Correction Request Pending Review
                    </h4>
                    <p className="text-xs text-purple-800 mt-1">
                      Requested by <strong>{pendingCorrections[0].requestedByName}</strong>: &quot;{pendingCorrections[0].reason}&quot;
                    </p>
                  </div>
                </div>

                {isFullAccess && !reviewingCorrectionId && (
                  <button
                    onClick={() => setReviewingCorrectionId(pendingCorrections[0].id)}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
                  >
                    Review Request
                  </button>
                )}
              </div>

              {/* Management Review Modal inline */}
              {isFullAccess && reviewingCorrectionId === pendingCorrections[0].id && (
                <div className="p-3 bg-white rounded-xl border border-purple-200 mt-2 space-y-3 text-xs">
                  <div className="font-semibold text-slate-800">
                    Requested Changes:
                  </div>
                  <pre className="p-2 bg-slate-50 rounded-lg text-[11px] font-mono overflow-x-auto text-slate-700">
                    {JSON.stringify(pendingCorrections[0].requestedValues, null, 2)}
                  </pre>
                  
                  <input
                    type="text"
                    placeholder="Decision notes (e.g. Approved price match with client)"
                    value={correctionReviewNote}
                    onChange={e => setCorrectionReviewNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#FAF8F6] border border-[#C8B5A9] rounded-lg text-xs"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleReviewCorrection(pendingCorrections[0].id, 'REJECTED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleReviewCorrection(pendingCorrections[0].id, 'APPROVED')}
                      disabled={updating}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
                    >
                      Approve & Update Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rate Warning Banner if in review */}
          {order.status === 'RATE_REVIEW' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Rate Approval Required</h4>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    This order was submitted with a rate below standard approved pricing.
                    {isFullAccess ? ' As Management, you can approve or edit the rate below.' : ' Awaiting Controller or Manager review.'}
                  </p>
                  {isFullAccess && !showRateEdit && (
                    <button
                      onClick={() => {
                        const initial: { [id: string]: number } = {};
                        order.items.forEach(i => initial[i.id] = i.offeredRate);
                        setEditRates(initial);
                        setShowRateEdit(true);
                      }}
                      className="mt-3 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Rates & Approve Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rate Edit Panel for Controller / Manager */}
          {showRateEdit && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Modify Rates</span>
                <button 
                  onClick={() => setShowRateEdit(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                  <div>
                    <span className="font-semibold text-slate-800">{item.productName}</span>
                    <span className="text-slate-400 ml-1">({item.quantity} {item.unit})</span>
                    <div className="text-[10px] text-slate-400">Std Rate: Rs. {item.standardRate}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-xs">Rs.</span>
                    <input
                      type="number"
                      value={editRates[item.id] !== undefined ? editRates[item.id] : item.offeredRate}
                      onChange={(e) => setEditRates({ ...editRates, [item.id]: Number(e.target.value) })}
                      className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-right"
                    />
                  </div>
                </div>
              ))}

              <div>
                <input
                  type="text"
                  placeholder="Review note (e.g. Special bulk discount approved)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleSaveRates}
                  disabled={updating}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {updating ? 'Saving...' : 'Confirm Rates & Approve Order'}
                </button>
              </div>
            </div>
          )}

          {/* Customer & Delivery Card */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer & Site</span>
              <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                {order.customerType} CLIENT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Company / Site</span>
                </div>
                <div className="text-sm font-bold text-slate-800">{order.companyName}</div>
                <div className="text-xs text-slate-600 mt-0.5">Contact: {order.customerName}</div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone & WhatsApp</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">{order.customerPhone}</div>
                {order.customerWhatsapp && (
                  <div className="text-[11px] text-emerald-600 font-medium">
                    WhatsApp: {order.customerWhatsapp}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Delivery Address ({order.city})</span>
                </div>
                <div className="text-xs text-slate-700 font-medium leading-relaxed">
                  {order.deliveryAddress}
                </div>
                {order.mapsUrl && (
                  <a
                    href={order.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline mt-1"
                  >
                    <span>📍 View Google Maps Location</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Product Items Table with Module 7: Verified Technical Documents */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Products & Technical Specs</span>
            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product & Technical Doc</th>
                    <th className="px-3 py-2 font-medium text-center">Qty</th>
                    <th className="px-3 py-2 font-medium text-right">Rate</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map(item => {
                    const normalizedName = item.productName.trim().toLowerCase();
                    const linkedDoc = productLinks[normalizedName];

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{item.productName}</div>
                          <div className="text-[10px] text-slate-400">{item.packing}</div>
                          {item.isSpecialRate && (
                            <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                              Special Rate
                            </span>
                          )}

                          {/* Technical Document Linking indicator (Module 7) */}
                          <div className="mt-1.5">
                            {linkedDoc ? (
                              <a
                                href={`/documents?search=${encodeURIComponent(linkedDoc.documentTitle)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <FileCheck className="w-3 h-3 text-emerald-600" />
                                <span>Verified: {linkedDoc.documentTitle}</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-medium">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>No verified document available</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-slate-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                          Rs. {item.offeredRate.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                          Rs. {item.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal:</span>
                <span>Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>Special Discount:</span>
                  <span>- Rs. {order.discountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-700/60">
                <span>Grand Total:</span>
                <span className="text-emerald-300">Rs. {order.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>Payment Terms:</span>
                <span className="font-semibold text-slate-200">
                  {order.paymentStatus} {order.paymentRemarks && `(${order.paymentRemarks})`}
                </span>
              </div>

              {/* Payment Ledger CTA for Management (Module 8) */}
              {isFullAccess && (
                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">Auditable Payment Ledger</span>
                  <Link
                    href={`/ledger?orderId=${order.id}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs transition-all"
                  >
                    <Receipt className="w-3 h-3" />
                    <span>Manage / Record Payments →</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sales & Logistics Card */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                Order Taken By
              </span>
              <div className="font-bold text-slate-800">{order.orderTakenByName}</div>
              <div className="text-[11px] text-slate-500">{order.orderTakenByPhone}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-1">
                Required Delivery
              </span>
              <div className="font-bold text-slate-800">{order.requiredDeliveryDate}</div>
              <div className="text-[11px] text-slate-500">Urgency: {order.urgency}</div>
            </div>
          </div>

          {order.remarks && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">
                Special Instructions / Remarks
              </span>
              <p className="text-slate-700 italic">{order.remarks}</p>
            </div>
          )}

          {/* Management Status Controls */}
          {isFullAccess && (
            <div className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#B7937A]/25 space-y-4">
              <div>
                <div className="text-xs font-bold text-[#221D1D] uppercase tracking-wider mb-2">
                  Order Workflow Status
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.status !== 'CONFIRMED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('CONFIRMED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-[#B7937A] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      ✓ Confirm Order
                    </button>
                  )}
                  {order.status !== 'PREPARING' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('PREPARING')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-[#BCAEC4] hover:opacity-90 text-[#221D1D] rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      📦 Preparing
                    </button>
                  )}
                  {order.status !== 'READY_FOR_DISPATCH' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('READY_FOR_DISPATCH')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      🏷️ Ready for Dispatch
                    </button>
                  )}
                  {order.status !== 'DISPATCHED' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('DISPATCHED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      🚚 Dispatched
                    </button>
                  )}
                  {order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      📍 Out for Delivery
                    </button>
                  )}
                  {order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('DELIVERED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      🎉 Mark Delivered
                    </button>
                  )}
                  {order.status === 'DELIVERED' && (
                    <button
                      onClick={() => handleUpdateStatus('COMPLETED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      🏁 Mark Completed
                    </button>
                  )}
                  {order.status !== 'PARTIALLY_DELIVERED' && order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('PARTIALLY_DELIVERED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      🌗 Partially Delivered
                    </button>
                  )}
                  {order.status !== 'ON_HOLD' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('ON_HOLD')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-[#E6DDDD] hover:bg-[#C8B5A9] text-[#221D1D] rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      ⏸️ On Hold
                    </button>
                  )}
                  {order.status !== 'RETURNED' && order.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus('RETURNED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all"
                    >
                      ↩️ Mark Returned
                    </button>
                  )}
                  {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleUpdateStatus('CANCELLED')}
                      disabled={updating}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity / Audit History Timeline */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit & History Log</span>
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {order.history.map((h, i) => (
                <div key={h.id || i} className="relative flex items-start gap-3 pl-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white shrink-0 mt-1" />
                  <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-800">{h.changedByName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-600">{h.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Client Thank You Modal */}
      <ThankYouModal
        isOpen={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
        order={order}
        currentUser={currentUser || null}
        onMessageSent={() => {
          onOrderUpdated();
        }}
      />

      {/* Order Correction Request Modal (Module 3) */}
      <OrderCorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        order={order}
        onCorrectionRequested={() => {
          onOrderUpdated();
          fetch(`/api/orders/corrections?orderId=${order.id}`)
            .then(r => r.json())
            .then(d => setCorrections(d.requests || []));
        }}
      />
    </div>
  );
}
