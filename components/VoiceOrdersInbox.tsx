'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  Play, 
  Volume2, 
  Check, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Building2, 
  MapPin, 
  Phone, 
  FileText, 
  Save, 
  Trash2,
  Filter
} from 'lucide-react';
import { VoiceOrder, User } from '@/lib/types';
import { getUserAvatar, getUserInitials } from '@/lib/avatar';

interface Props {
  currentUser: User | null;
  onRefresh?: () => void;
}

export default function VoiceOrdersInbox({ currentUser, onRefresh }: Props) {
  const router = useRouter();
  const [voiceOrders, setVoiceOrders] = useState<VoiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<VoiceOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editTranscript, setEditTranscript] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editProducts, setEditProducts] = useState('');
  const [editRates, setEditRates] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<string>('PENDING');

  useEffect(() => {
    fetchVoiceOrders();
  }, [statusFilter]);

  const fetchVoiceOrders = async () => {
    try {
      const q = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/voice-orders${q}`);
      if (res.ok) {
        const data = await res.json();
        setVoiceOrders(data.voiceOrders || []);
        if (data.voiceOrders?.length > 0 && !selectedOrder) {
          selectOrder(data.voiceOrders[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const selectOrder = (vo: VoiceOrder) => {
    setSelectedOrder(vo);
    setEditTranscript(vo.transcript || '');
    setEditCustomer(vo.extractedCustomerName || '');
    setEditPhone(vo.extractedCustomerPhone || '');
    setEditCity(vo.extractedCity || '');
    setEditAddress(vo.extractedDeliveryAddress || '');
    const prodStr = vo.extractedProducts 
      ? (Array.isArray(vo.extractedProducts) ? vo.extractedProducts.map((p: any) => p.name || p).join(', ') : JSON.stringify(vo.extractedProducts)) 
      : '';
    setEditProducts(prodStr);
    setEditRates(vo.extractedRates || '');
    setEditNotes(vo.internalNotes || '');
    setEditStatus(vo.status || 'PENDING');
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/voice-orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: editTranscript,
          extractedCustomerName: editCustomer,
          extractedCustomerPhone: editPhone,
          extractedCity: editCity,
          extractedDeliveryAddress: editAddress,
          extractedProducts: editProducts ? [{ name: editProducts }] : null,
          extractedRates: editRates,
          internalNotes: editNotes,
          status: editStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.voiceOrder);
        setVoiceOrders(prev => prev.map(o => o.id === data.voiceOrder.id ? data.voiceOrder : o));
        setIsEditing(false);
        if (onRefresh) onRefresh();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToOrder = () => {
    if (!selectedOrder) return;
    const params = new URLSearchParams();
    if (selectedOrder.extractedCustomerName) params.set('name', selectedOrder.extractedCustomerName);
    if (selectedOrder.extractedCustomerPhone) params.set('phone', selectedOrder.extractedCustomerPhone);
    if (selectedOrder.extractedCity) params.set('city', selectedOrder.extractedCity);
    if (selectedOrder.extractedDeliveryAddress) params.set('address', selectedOrder.extractedDeliveryAddress);
    params.set('remarks', `[Voice Order Conversion - ID: ${selectedOrder.id}]: ${selectedOrder.transcript}`);

    router.push(`/orders/new?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
      case 'REVIEWED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Reviewed</span>;
      case 'CONVERTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Converted to Order</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="korean-card p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6DDDD]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#BCAEC4]/30 text-[#221D1D] flex items-center justify-center">
            <Mic className="w-5 h-5 text-[#B7937A]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#221D1D] tracking-tight">
              🎙️ Operations Voice Orders Inbox
            </h2>
            <p className="text-xs text-[#635858]">
              Manage phone call and audio recordings submitted by sales employees for fulfillment.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F6] p-1 rounded-xl border border-[#C8B5A9]/50 text-xs">
          {['ALL', 'PENDING', 'REVIEWED', 'CONVERTED'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === f ? 'bg-white text-[#221D1D] shadow-xs' : 'text-[#635858] hover:text-[#221D1D]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading voice submissions...</div>
      ) : voiceOrders.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Mic className="w-8 h-8 text-[#C8B5A9] mx-auto opacity-70" />
          <p className="text-sm font-semibold text-[#221D1D]">No voice orders in this category</p>
          <p className="text-xs text-[#635858]">When sales reps record audio orders, they will appear here for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* List column */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {voiceOrders.map(vo => {
              const isSelected = selectedOrder?.id === vo.id;
              const avatar = getUserAvatar({ name: vo.userName });
              const initials = getUserInitials(vo.userName);

              return (
                <div
                  key={vo.id}
                  onClick={() => selectOrder(vo)}
                  className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#FAF8F6] border-[#B7937A] shadow-xs' 
                      : 'bg-white border-[#E6DDDD] hover:border-[#C8B5A9]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {avatar ? (
                        <img src={avatar} alt={vo.userName} className="w-7 h-7 rounded-full object-cover border border-[#C8B5A9]" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#BCAEC4]/30 text-[10px] font-bold text-[#221D1D] flex items-center justify-center">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-[#221D1D]">{vo.userName}</div>
                        <div className="text-[10px] text-[#635858]">
                          {new Date(vo.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(vo.status)}
                  </div>

                  <p className="text-xs text-[#221D1D] font-medium line-clamp-2 mt-1">
                    &ldquo;{vo.transcript}&rdquo;
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E6DDDD]/60 text-[11px] text-[#635858]">
                    <span>Client: <strong className="text-[#221D1D]">{vo.extractedCustomerName || 'Unspecified'}</strong></span>
                    <span>City: <strong className="text-[#221D1D]">{vo.extractedCity || 'N/A'}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details / Review / Convert column */}
          {selectedOrder && (
            <div className="lg:col-span-7 bg-[#FAF8F6] p-4 sm:p-5 rounded-2xl border border-[#B7937A]/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E6DDDD]">
                <div>
                  <span className="text-[10px] text-[#635858] font-mono">Submission #{selectedOrder.id.substring(0, 10)}</span>
                  <h3 className="text-sm font-bold text-[#221D1D]">
                    {selectedOrder.extractedCustomerName || 'Unverified Customer'} — {selectedOrder.extractedCity || 'Site Unspecified'}
                  </h3>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Audio playback */}
              {selectedOrder.audioUrl && (
                <div className="bg-white p-3 rounded-xl border border-[#C8B5A9]/50 flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-[#B7937A]" />
                  <audio controls src={selectedOrder.audioUrl} className="w-full h-8" />
                </div>
              )}

              {/* Editable Transcript */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#635858]">Verified Transcript</label>
                <textarea
                  rows={3}
                  value={editTranscript}
                  onChange={(e) => setEditTranscript(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] focus:ring-1 focus:ring-[#B7937A]"
                />
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-[#635858]">Customer / Site</label>
                  <input
                    type="text"
                    value={editCustomer}
                    onChange={(e) => setEditCustomer(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#635858]">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#635858]">Delivery City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-[#635858]">Quoted Rate</label>
                  <input
                    type="text"
                    value={editRates}
                    onChange={(e) => setEditRates(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-[#635858]">Products & Quantities</label>
                  <input
                    type="text"
                    value={editProducts}
                    onChange={(e) => setEditProducts(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-[#635858]">Site Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-[#635858]">Processing Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D]"
                  >
                    <option value="PENDING">PENDING REVIEW</option>
                    <option value="REVIEWED">REVIEWED</option>
                    <option value="CONVERTED">CONVERTED TO ORDER</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E6DDDD]">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveChanges}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#E6DDDD] text-[#221D1D] border border-[#C8B5A9] font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Edits'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConvertToOrder}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Book as Confirmed Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
