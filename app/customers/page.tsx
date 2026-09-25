'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Calendar, 
  DollarSign, 
  Package, 
  Edit3, 
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  GitMerge,
  Clock,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import CreateReminderModal from '@/components/CreateReminderModal';
import { Customer, User } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('Lahore');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Duplicate detection state (Module 6)
  const [duplicates, setDuplicates] = useState<Customer[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Controlled Merge Modal state (Module 6)
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [primaryCustomerId, setPrimaryCustomerId] = useState('');
  const [secondaryCustomerId, setSecondaryCustomerId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  // Reminder Modal state (Module 2)
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedCustomerIdForReminder, setSelectedCustomerIdForReminder] = useState<string | null>(null);

  const pakCities = ['Lahore', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Multan', 'Gujranwala', 'Sialkot', 'Karachi', 'Peshawar', 'Sahiwal', 'Sheikhupura'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, custRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/customers')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(data.customers || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER', 'MANAGEMENT', 'ADMIN'].includes(currentUser.role);

  // Live duplicate checking on phone / name change (Module 6)
  useEffect(() => {
    if (!showModal || editingCustomer) {
      setDuplicates([]);
      return;
    }

    if (phone.trim().length >= 8 || companyName.trim().length >= 3) {
      const timer = setTimeout(async () => {
        setCheckingDuplicates(true);
        try {
          const res = await fetch('/api/customers/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, name, companyName }),
          });
          if (res.ok) {
            const d = await res.json();
            setDuplicates(d.matches || []);
          }
        } catch {}
        finally {
          setCheckingDuplicates(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setDuplicates([]);
    }
  }, [phone, name, companyName, showModal, editingCustomer]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setCompanyName('');
    setPhone('');
    setWhatsapp('');
    setCity('Lahore');
    setDeliveryAddress('');
    setMapsUrl('');
    setNotes('');
    setDuplicates([]);
    setShowModal(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setCompanyName(c.companyName);
    setPhone(c.phone);
    setWhatsapp(c.whatsapp || '');
    setCity(c.city);
    setDeliveryAddress(c.deliveryAddress || '');
    setMapsUrl(c.mapsUrl || '');
    setNotes(c.notes || '');
    setDuplicates([]);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer) {
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCustomer.id,
            name,
            companyName,
            phone,
            whatsapp,
            city,
            deliveryAddress,
            mapsUrl,
            notes,
          }),
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Failed to update customer');
        }
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            companyName,
            phone,
            whatsapp,
            city,
            deliveryAddress,
            mapsUrl,
            notes,
          }),
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Failed to create customer');
        }
      }
    } catch {
      alert('Network error saving customer');
    } finally {
      setSaving(false);
    }
  };

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    setMergeError('');
    if (!primaryCustomerId || !secondaryCustomerId) {
      setMergeError('Please choose both primary and duplicate customers.');
      return;
    }
    if (primaryCustomerId === secondaryCustomerId) {
      setMergeError('Cannot merge a customer into itself.');
      return;
    }

    setMerging(true);
    try {
      const res = await fetch('/api/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryCustomerId,
          secondaryCustomerId,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to merge customers');
      }

      setShowMergeModal(false);
      setPrimaryCustomerId('');
      setSecondaryCustomerId('');
      fetchData();
    } catch (err: any) {
      setMergeError(err.message);
    } finally {
      setMerging(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (cityFilter !== 'ALL' && c.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.companyName.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, search, cityFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F2E9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-[#B7937A] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2E9] pb-24 md:pb-12 text-[#221D1D]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-[#221D1D]">
                Customer & Site Database
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F6] text-[#635858] border border-[#E6DDDD]">
                {filteredCustomers.length}
              </span>
            </div>
            <p className="text-xs text-[#635858] mt-0.5">
              Verified construction companies, contractors, architects, and job sites across Pakistan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isFullAccess && (
              <button
                onClick={() => setShowMergeModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#C8B5A9] text-[#221D1D] hover:bg-[#FAF8F6] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                title="Controlled merge of duplicate customer accounts"
              >
                <GitMerge className="w-3.5 h-3.5 text-[#B7937A]" />
                <span>Merge Duplicates</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="korean-card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#AF9292]" />
            <input
              type="text"
              placeholder="Search by company, client name, phone, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-xs focus:bg-white focus:outline-none transition-all"
            />
          </div>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-xs font-semibold text-[#221D1D] focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Cities</option>
            {pakCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Customers Table */}
        <div className="korean-card overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#635858] space-y-2">
              <Building2 className="w-8 h-8 text-[#AF9292] mx-auto" />
              <p className="font-semibold text-[#221D1D]">No customers found</p>
              <p className="text-[#635858]">Add a new customer or book an order to populate the client registry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F6] text-[#635858] border-b border-[#E6DDDD] font-semibold">
                  <tr>
                    <th className="px-4 py-3">Company / Site</th>
                    <th className="px-4 py-3">Contact Person</th>
                    <th className="px-4 py-3">Phone & WhatsApp</th>
                    <th className="px-4 py-3">City & Address</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-right">Total Business</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DDDD]">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-[#FAF8F6]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#221D1D]">{c.companyName}</div>
                        {c.notes && (
                          <div className="text-[10px] text-[#AF9292] italic truncate max-w-xs">{c.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#221D1D]">
                        {c.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[#221D1D]">{c.phone}</div>
                        {c.whatsapp && (
                          <div className="text-[10px] text-emerald-600 font-mono">WA: {c.whatsapp}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#221D1D]">{c.city}</div>
                        <div className="text-[10px] text-[#635858] truncate max-w-xs">{c.deliveryAddress || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF8F6] border border-[#E6DDDD] font-bold text-[10px]">
                          {c.totalOrders || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#221D1D]">
                        PKR {Number(c.totalSpend || (c as any).totalSpent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Follow-up Reminder Button (Module 2) */}
                          <button
                            onClick={() => {
                              setSelectedCustomerIdForReminder(c.id);
                              setShowReminderModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#E6DDDD] hover:bg-[#FAF8F6] text-amber-700"
                            title="Set Follow-up Reminder"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg border border-[#E6DDDD] hover:bg-[#FAF8F6] text-[#635858]"
                            title="Edit Customer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E6DDDD] shadow-2xl p-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
              <h2 className="text-base font-bold text-[#221D1D]">
                {editingCustomer ? 'Edit Customer Record' : 'Add New Customer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-[#635858]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duplicate Detection Alert Banner (Module 6) */}
            {duplicates.length > 0 && !editingCustomer && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Possible Duplicate Customer Detected!</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  We found {duplicates.length} existing customer(s) with matching phone or company details:
                </p>
                <div className="space-y-1 pt-1">
                  {duplicates.map(d => (
                    <div key={d.id} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] flex justify-between items-center">
                      <div>
                        <strong>{d.companyName}</strong> ({d.name}) — {d.city}
                        <div className="font-mono text-[#635858]">{d.phone}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 rounded text-[10px] font-bold">
                        {d.totalOrders || 0} orders
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#221D1D] mb-1">Company / Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Construction / Prime Tower"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221D1D] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Engr. Kamran"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221D1D] mb-1">City *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                  >
                    {pakCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#221D1D] mb-1 flex items-center justify-between">
                    <span>Phone Number *</span>
                    {checkingDuplicates && <Loader2 className="w-3 h-3 animate-spin text-[#B7937A]" />}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#221D1D] mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#221D1D] mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="Street / Plot / Sector / Site details"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221D1D] mb-1">Google Maps Link</label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#221D1D] mb-1">Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Regular bulk buyer, requires testing certificate"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#E6DDDD] rounded-xl font-semibold text-[#635858] hover:bg-[#FAF8F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#221D1D] hover:bg-black text-white rounded-xl font-bold transition-all shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Customer Merge Modal (Module 6) */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E6DDDD] shadow-2xl p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
              <div className="flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-[#B7937A]" />
                <h2 className="text-base font-bold text-[#221D1D]">Controlled Customer Merge</h2>
              </div>
              <button onClick={() => setShowMergeModal(false)} className="p-1 rounded-lg text-[#635858]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 my-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <strong>Audit Safety:</strong> All orders, follow-ups, tasks, and ledger transactions from the Duplicate record will be securely transferred to the Primary record. The duplicate is marked merged with full audit trace.
            </div>

            {mergeError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {mergeError}
              </div>
            )}

            <form onSubmit={handleMerge} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#635858] uppercase mb-1">
                  Primary Customer (To Keep & Retain) *
                </label>
                <select
                  required
                  value={primaryCustomerId}
                  onChange={e => setPrimaryCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
                >
                  <option value="">-- Choose Primary Record --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.name} - {c.city}) - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#635858] uppercase mb-1">
                  Duplicate Customer (To Merge From & Archive) *
                </label>
                <select
                  required
                  value={secondaryCustomerId}
                  onChange={e => setSecondaryCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F6] border border-[#C8B5A9] rounded-xl text-[#221D1D] focus:outline-none"
                >
                  <option value="">-- Choose Duplicate Record --</option>
                  {customers
                    .filter(c => c.id !== primaryCustomerId)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.name} - {c.city}) - {c.phone}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6DDDD]">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 border border-[#E6DDDD] rounded-xl font-semibold text-[#635858] hover:bg-[#FAF8F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={merging}
                  className="px-5 py-2 bg-[#221D1D] hover:bg-black text-white rounded-xl font-bold transition-all shadow-xs"
                >
                  {merging ? 'Merging...' : 'Execute Controlled Merge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Reminder Modal (Module 2) */}
      <CreateReminderModal
        isOpen={showReminderModal}
        onClose={() => {
          setShowReminderModal(false);
          setSelectedCustomerIdForReminder(null);
        }}
        initialCustomerId={selectedCustomerIdForReminder || undefined}
        onReminderCreated={() => {
          fetchData();
        }}
      />

      <MobileNav />
    </div>
  );
}
