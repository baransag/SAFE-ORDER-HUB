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
  X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
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

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

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
                Customer & Site Database
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredCustomers.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified construction companies, contractors, architects, and job sites across Pakistan.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>＋ Add New Customer</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="korean-card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, client name, phone, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
            />
          </div>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
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
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No customers found</p>
              <p className="text-slate-400">Add a new customer or book an order to populate the client registry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {cust.companyName}
                        {cust.notes && (
                          <div className="text-[10px] text-slate-400 font-normal italic">{cust.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {cust.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-700">{cust.phone}</div>
                        {cust.whatsapp && cust.whatsapp !== cust.phone && (
                          <div className="text-[10px] text-emerald-600 font-mono">WA: {cust.whatsapp}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[220px]">
                        <div className="font-semibold text-slate-800">{cust.city}</div>
                        <div className="truncate text-[11px] text-slate-500">{cust.deliveryAddress}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                          {cust.totalOrders || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        Rs. {(cust.totalSpend || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">
                {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Construction / Prime Tower"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Engr. Kamran"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {pakCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="Street / Plot / Sector / Site details"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Maps Link</label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={mapsUrl}
                  onChange={(e) => setMapsUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Regular bulk buyer, requires testing certificate"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
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
