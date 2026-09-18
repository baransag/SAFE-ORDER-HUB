'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Layers, 
  Search, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  X,
  DollarSign
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { Product, User } from '@/lib/types';

export default function ProductsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Waterproofing');
  const [defaultPacking, setDefaultPacking] = useState('20 Kg Box');
  const [unit, setUnit] = useState('Box');
  const [standardRate, setStandardRate] = useState<number>(0);
  const [minAllowedRate, setMinAllowedRate] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, prodRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/products')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Waterproofing');
    setDefaultPacking('');
    setUnit('Box');
    setStandardRate(0);
    setMinAllowedRate(0);
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setDefaultPacking(p.defaultPacking);
    setUnit(p.unit);
    setStandardRate(p.standardRate);
    setMinAllowedRate(p.minAllowedRate);
    setDescription(p.description || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProduct) {
        // PUT
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            name,
            category,
            defaultPacking,
            unit,
            standardRate,
            minAllowedRate,
            description,
          })
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        }
      } else {
        // POST
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            category,
            defaultPacking,
            unit,
            standardRate,
            minAllowedRate,
            description,
          })
        });
        if (res.ok) {
          setShowModal(false);
          fetchData();
        }
      }
    } catch {
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product?')) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch {
      alert('Error deleting product');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Product & Rate Database
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Standard list prices, approved minimum selling rates, and packaging specifications.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFullAccess && (
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="korean-card p-3 flex items-center gap-2 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products, chemicals, membranes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800"
          />
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="korean-card p-5 space-y-4 relative overflow-hidden group">
              
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {product.category}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-1.5">{product.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Packing: <span className="font-semibold text-slate-700">{product.defaultPacking}</span>
                  </p>
                </div>

                {isFullAccess && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Product & Rates"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {product.description && (
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Rate Badges */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Standard Rate</span>
                  <div className="font-black text-slate-900 font-mono text-sm">
                    Rs. {product.standardRate.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">per {product.unit}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">Min Approved</span>
                  <div className="font-black text-emerald-900 font-mono text-sm">
                    Rs. {product.minAllowedRate.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-700">floor limit</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Unit: {product.unit}</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active Catalog
                </span>
              </div>

            </div>
          ))}
        </div>

      </main>

      {/* Product Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="korean-card max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingProduct ? 'Edit Product & Rate Limits' : 'Add New Product'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ultra Seal"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Waterproofing"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Packing</label>
                  <input
                    type="text"
                    value={defaultPacking}
                    onChange={(e) => setDefaultPacking(e.target.value)}
                    placeholder="e.g. 20 Kg Box / Can"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Unit *</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. Box / Can / Roll"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Selling Rate (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={standardRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStandardRate(val);
                      if (!editingProduct) setMinAllowedRate(Math.round(val * 0.9));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Approved Selling Rate (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  value={minAllowedRate}
                  onChange={(e) => setMinAllowedRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Rates below this entered by sales reps will trigger mandatory Controller / Manager review.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Application specifications and technical details..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {saving ? 'Saving...' : 'Save Product'}
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
