'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Phone, 
  Building2, 
  Camera, 
  ExternalLink,
  Edit3,
  X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import { User, Order, DeliveryProof, DeliveryStatus } from '@/lib/types';

interface DeliveryItem {
  order: Order;
  delivery: DeliveryProof;
}

export default function DeliveriesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [search, setSearch] = useState('');

  // Proof Modal
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | null>(null);
  const [assignedDriver, setAssignedDriver] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('DELIVERED');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [signedReceiptUrl, setSignedReceiptUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, delRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/deliveries')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (delRes.ok) {
        const data = await delRes.json();
        setDeliveries(data.deliveries || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const openProofModal = (item: DeliveryItem) => {
    setSelectedItem(item);
    setAssignedDriver(item.delivery?.assignedDriver || '');
    setDriverPhone(item.delivery?.driverPhone || '');
    setVehicleNumber(item.delivery?.vehicleNumber || '');
    setDeliveryStatus(item.delivery?.deliveryStatus || 'DELIVERED');
    setProofPhotoUrl(item.delivery?.proofPhotoUrl || '');
    setSignedReceiptUrl(item.delivery?.signedReceiptUrl || '');
    setInvoiceNumber(item.delivery?.invoiceNumber || '');
    setNotes(item.delivery?.notes || '');
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);

    try {
      const res = await fetch('/api/deliveries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedItem.order.id,
          assignedDriver,
          driverPhone,
          vehicleNumber,
          deliveryStatus,
          proofPhotoUrl,
          signedReceiptUrl,
          invoiceNumber,
          notes,
        }),
      });

      if (res.ok) {
        setSelectedItem(null);
        fetchData();
      } else {
        alert('Failed to update delivery');
      }
    } catch {
      alert('Error updating delivery record');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return deliveries.filter(({ order, delivery }) => {
      if (activeTab !== 'ALL' && delivery.deliveryStatus !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          order.orderNumber.toLowerCase().includes(q) ||
          order.companyName.toLowerCase().includes(q) ||
          order.city.toLowerCase().includes(q) ||
          (delivery.assignedDriver && delivery.assignedDriver.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [deliveries, activeTab, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Delivery Management & Proofs
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filtered.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Site shipments, vehicle assignments, driver coordination, and verified proof of delivery.
            </p>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="korean-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' && 'All Deliveries'}
                {tab === 'PENDING' && 'Pending Dispatch'}
                {tab === 'IN_TRANSIT' && 'In Transit'}
                {tab === 'DELIVERED' && 'Delivered ✓'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, company, city, driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Deliveries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full korean-card p-12 text-center text-xs text-slate-400 space-y-2">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No deliveries matching filter</p>
            </div>
          ) : (
            filtered.map(({ order, delivery }) => (
              <div key={order.id} className="korean-card p-5 space-y-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-mono font-bold text-xs text-slate-900">{order.orderNumber}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    delivery.deliveryStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    delivery.deliveryStatus === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {delivery.deliveryStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.companyName}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.city} • {order.deliveryAddress}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Required: {order.requiredDeliveryDate}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver / Vehicle:</span>
                    <span className="font-semibold text-slate-700">
                      {delivery.assignedDriver || 'Unassigned'} {delivery.vehicleNumber && `(${delivery.vehicleNumber})`}
                    </span>
                  </div>
                  {delivery.driverPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Driver Contact:</span>
                      <span className="font-mono text-slate-700">{delivery.driverPhone}</span>
                    </div>
                  )}
                  {delivery.proofPhotoUrl && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Proof Attached:</span>
                      <a 
                        href={delivery.proofPhotoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-teal-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Camera className="w-3 h-3" />
                        <span>View Proof</span>
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openProofModal({ order, delivery })}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Logistics & Attach Proof</span>
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Update Logistics & Proof Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Update Logistics & Attach Proof</h3>
                <span className="text-xs font-mono text-slate-500">{selectedItem.order.orderNumber} — {selectedItem.order.companyName}</span>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shipment Status *</label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                >
                  <option value="PENDING">Pending Logistics</option>
                  <option value="ASSIGNED">Assigned to Driver</option>
                  <option value="READY">Ready for Dispatch</option>
                  <option value="IN_TRANSIT">In Transit (Out for Delivery)</option>
                  <option value="DELIVERED">Delivered (Proof Attached) ✓</option>
                  <option value="FAILED">Delivery Attempt Failed</option>
                  <option value="RETURNED">Returned to Warehouse</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aslam Khan"
                    value={assignedDriver}
                    onChange={(e) => setAssignedDriver(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Driver Phone</label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle / Truck No.</label>
                  <input
                    type="text"
                    placeholder="e.g. LES-1984"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invoice / Bilty No.</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9081"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Photo URL / Proof Link
                </label>
                <input
                  type="url"
                  placeholder="https://... photo link of site unloading"
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Signed Receipt URL</label>
                <input
                  type="url"
                  placeholder="https://... scanned or photographed signed receipt"
                  value={signedReceiptUrl}
                  onChange={(e) => setSignedReceiptUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Received by site supervisor Engineer Tariq"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-xs"
                >
                  {saving ? 'Saving...' : 'Confirm Delivery Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}
