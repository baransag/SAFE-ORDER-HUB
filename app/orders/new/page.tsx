'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Package, 
  DollarSign, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Trash2,
  Share2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Copy
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { Product, User, PaymentStatus, Urgency } from '@/lib/types';

interface OrderItemForm {
  productId: string;
  productName: string;
  packing: string;
  unit: string;
  quantity: number;
  standardRate: number;
  minAllowedRate: number;
  offeredRate: number;
  isSpecialRate: boolean;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [city, setCity] = useState('Lahore');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [customerType, setCustomerType] = useState<'NEW' | 'EXISTING'>('EXISTING');

  // Items
  const [items, setItems] = useState<OrderItemForm[]>([
    {
      productId: '',
      productName: '',
      packing: '',
      unit: '',
      quantity: 1,
      standardRate: 0,
      minAllowedRate: 0,
      offeredRate: 0,
      isSpecialRate: false,
    }
  ]);

  // Payment & Terms
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('CASH');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [remarks, setRemarks] = useState('');

  // Success State
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK');
  const [formattedMessage, setFormattedMessage] = useState('');
  const [whatsappShareUrl, setWhatsappShareUrl] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const pakCities = ['Lahore', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Multan', 'Gujranwala', 'Sialkot', 'Karachi', 'Peshawar', 'Sahiwal', 'Sheikhupura'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
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
        const prodData = await prodRes.json();
        const prodList = prodData.products || [];
        setProducts(prodList);
        if (prodList.length > 0) {
          const first = prodList[0];
          setItems([{
            productId: first.id,
            productName: first.name,
            packing: first.defaultPacking,
            unit: first.unit,
            quantity: 1,
            standardRate: first.standardRate,
            minAllowedRate: first.minAllowedRate,
            offeredRate: first.standardRate,
            isSpecialRate: false,
          }]);
        } else {
          setItems([{
            productId: 'custom_1',
            productName: '',
            packing: 'Standard Packing',
            unit: 'Box',
            quantity: 1,
            standardRate: 0,
            minAllowedRate: 0,
            offeredRate: 0,
            isSpecialRate: false,
          }]);
        }
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        productId: prod.id,
        productName: prod.name,
        packing: prod.defaultPacking,
        unit: prod.unit,
        quantity: copy[index]?.quantity || 1,
        standardRate: prod.standardRate,
        minAllowedRate: prod.minAllowedRate,
        offeredRate: prod.standardRate,
        isSpecialRate: false,
      };
      return copy;
    });
  };

  const handleItemFieldChange = (index: number, field: keyof OrderItemForm, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === 'offeredRate' && copy[index].minAllowedRate > 0) {
        copy[index].isSpecialRate = Number(value) < copy[index].minAllowedRate;
      }
      return copy;
    });
  };

  const handleRateChange = (index: number, rate: number) => {
    setItems(prev => {
      const copy = [...prev];
      const item = copy[index];
      const isBelowMin = item.minAllowedRate > 0 ? rate < item.minAllowedRate : false;
      copy[index] = {
        ...item,
        offeredRate: rate,
        isSpecialRate: isBelowMin,
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: Math.max(1, qty),
      };
      return copy;
    });
  };

  const addItemRow = () => {
    if (products.length > 0) {
      const first = products[0];
      setItems(prev => [
        ...prev,
        {
          productId: first.id,
          productName: first.name,
          packing: first.defaultPacking,
          unit: first.unit,
          quantity: 1,
          standardRate: first.standardRate,
          minAllowedRate: first.minAllowedRate,
          offeredRate: first.standardRate,
          isSpecialRate: false,
        }
      ]);
    } else {
      setItems(prev => [
        ...prev,
        {
          productId: `custom_${Date.now()}_${prev.length + 1}`,
          productName: '',
          packing: 'Standard Packing',
          unit: 'Box',
          quantity: 1,
          standardRate: 0,
          minAllowedRate: 0,
          offeredRate: 0,
          isSpecialRate: false,
        }
      ]);
    }
  };

  const saveProductToCatalog = async (item: OrderItemForm) => {
    if (!item.productName.trim() || !item.offeredRate) {
      alert("Please enter product name and rate first.");
      return;
    }
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.productName,
          category: 'Construction Chemicals',
          defaultPacking: item.packing || 'Standard Packing',
          unit: item.unit || 'Box',
          standardRate: Number(item.offeredRate),
          minAllowedRate: Math.round(Number(item.offeredRate) * 0.9),
          description: 'Added via Order Booking Wizard',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(prev => [...prev, data.product]);
        alert(`✓ "${item.productName}" added to official catalog!`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save product to catalog');
      }
    } catch {
      alert('Error saving to catalog');
    }
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.offeredRate), 0);
  };

  const hasAnySpecialRate = items.some(item => item.isSpecialRate);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        customerName,
        companyName,
        customerPhone,
        customerWhatsapp: customerWhatsapp || customerPhone,
        city,
        deliveryAddress,
        mapsUrl,
        customerType,
        items,
        paymentStatus,
        paymentRemarks,
        requiredDeliveryDate,
        urgency,
        remarks,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedOrder(data.order);
        setWhatsappLink(data.whatsappLink);
        setWhatsappGroupUrl(data.whatsappGroupUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK');
        setFormattedMessage(data.formattedMessage || '');
        setWhatsappShareUrl(data.whatsappShareUrl || data.whatsappLink);

        // Trigger confetti celebration
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      } else {
        alert(data.error || 'Failed to submit order');
      }
    } catch {
      alert('Error submitting order. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // SUCCESS SCREEN
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <Navbar currentUser={currentUser} />
        
        <div className="max-w-xl mx-auto px-4 py-10">
          <div className="korean-card p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-3xl grad-lavender-emerald mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Order Submitted Successfully 🎉
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 font-mono">
                {createdOrder.orderNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Order logged for <span className="font-semibold text-slate-800">{createdOrder.companyName}</span> ({createdOrder.city})
              </p>
            </div>

            {/* Special rate notice if flagged */}
            {createdOrder.status === 'RATE_REVIEW' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Notice: Special Rate Order</span>
                  <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                    This order contains rates below standard selling price. The Controller / Manager will review and confirm before dispatch.
                  </p>
                </div>
              </div>
            )}

            {/* Order summary card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Items:</span>
                <span className="font-semibold text-slate-800">
                  {createdOrder.items.map((i: any) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-bold text-slate-900 text-sm">
                  Rs. {createdOrder.grandTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Order Taken By:</span>
                <span className="font-medium text-slate-700">{createdOrder.orderTakenByName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Delivery Address:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{createdOrder.deliveryAddress}</span>
              </div>
            </div>

            {/* Action Buttons: WhatsApp Integration */}
            <div className="space-y-2.5 pt-2">
              
              {/* Primary: Post to SAFE SOLUTIONS WhatsApp Group */}
              <button
                type="button"
                onClick={() => {
                  const msg = formattedMessage || `🔔 NEW ORDER: ${createdOrder.orderNumber} - ${createdOrder.companyName} - Total: Rs. ${createdOrder.grandTotal}`;
                  navigator.clipboard.writeText(msg).then(() => {
                    setCopiedToClipboard(true);
                    setTimeout(() => setCopiedToClipboard(false), 4000);
                  });
                  window.open(whatsappGroupUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Post to SAFE SOLUTIONS WhatsApp Group 🚀</span>
              </button>

              {copiedToClipboard && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Formatted order copied! Just press Paste (Ctrl+V) in the group chat.</span>
                </div>
              )}

              {/* Secondary Options: Direct Share & Copy Text */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappShareUrl || whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Direct Share Link</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const msg = formattedMessage || `🔔 NEW ORDER: ${createdOrder.orderNumber}`;
                    navigator.clipboard.writeText(msg);
                    setCopiedToClipboard(true);
                    setTimeout(() => setCopiedToClipboard(false), 3000);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copiedToClipboard ? '✓ Copied!' : 'Copy Order Text'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => router.push(`/orders`)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all"
                >
                  View All Orders
                </button>
                <button
                  onClick={() => {
                    setCreatedOrder(null);
                    setCurrentStep(1);
                    setCustomerName('');
                    setCompanyName('');
                    setCustomerPhone('');
                    setCustomerWhatsapp('');
                    setDeliveryAddress('');
                    setMapsUrl('');
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all"
                >
                  ＋ Book Another Order
                </button>
              </div>
            </div>

          </div>
        </div>

        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Header Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Create New Order
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sales rep: <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.designation})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Step {currentStep} of 5
            </span>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="mb-6 grid grid-cols-5 gap-2">
          {['Customer', 'Products', 'Payment', 'Logistics', 'Review'].map((stepName, i) => (
            <div 
              key={stepName}
              onClick={() => setCurrentStep(i + 1)}
              className="cursor-pointer"
            >
              <div className={`h-1.5 rounded-full transition-all ${
                currentStep >= i + 1 ? 'grad-lavender-emerald' : 'bg-slate-200'
              }`} />
              <div className="text-[10px] font-semibold text-slate-500 mt-1 truncate text-center">
                {stepName}
              </div>
            </div>
          ))}
        </div>

        {/* Wizard Card Form */}
        <form onSubmit={handleSubmitOrder} className="korean-card p-6 sm:p-8 space-y-6">
          
          {/* STEP 1: CUSTOMER DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Step 01 — Customer & Site Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter client and job site information</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Site Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Construction / Prime Tower Site"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Malik Tariq / Engr. Kamran"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0300-1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Number (optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="0300-1234567"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  >
                    {pakCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomerType('EXISTING')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        customerType === 'EXISTING' ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs' : 'border-slate-200 text-slate-600 bg-slate-50'
                      }`}
                    >
                      Existing Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('NEW')}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        customerType === 'NEW' ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs' : 'border-slate-200 text-slate-600 bg-slate-50'
                      }`}
                    >
                      New Client
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complete Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Plot #, Street, Commercial Area, Landmark..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Maps Pin URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/... or https://maps.google.com/?q=..."
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRODUCTS & RATES */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    Step 02 — Product & Rate Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select products, packing, and offered rates</p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isSpecialRate 
                        ? 'bg-amber-50/40 border-amber-300' 
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700">Item #{index + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      
                      {/* Top Row: Product Name & Catalog Picker */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              Product Name *
                            </label>
                            {products.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value !== 'custom') {
                                    handleProductSelect(index, e.target.value);
                                  }
                                }}
                                className="text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5"
                              >
                                <option value="">Select from catalog...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                <option value="custom">Manual entry</option>
                              </select>
                            )}
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Enter chemical / product name (e.g. Ultra Seal, Epoxy, WP-5000...)"
                            value={item.productName}
                            onChange={(e) => handleItemFieldChange(index, 'productName', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                        {/* Packing & Unit */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Packing / Size
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 20 Kg Box / 20L Can"
                            value={item.packing}
                            onChange={(e) => handleItemFieldChange(index, 'packing', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                      </div>

                      {/* Bottom Row: Unit, Quantity, Rate, Total */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemFieldChange(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                          >
                            <option value="Box">Box</option>
                            <option value="Can">Can</option>
                            <option value="Drum">Drum</option>
                            <option value="Kg">Kg</option>
                            <option value="Litre">Litre</option>
                            <option value="Pouch">Pouch</option>
                            <option value="Roll">Roll</option>
                            <option value="Sausage">Sausage</option>
                            <option value="Strip">Strip</option>
                            <option value="Standard">Standard</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Rate Offered (Rs.) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={item.offeredRate || ''}
                            onChange={(e) => handleRateChange(index, Number(e.target.value))}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-right ${
                              item.isSpecialRate ? 'border-amber-400 text-amber-900 bg-amber-50/50' : 'border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="bg-slate-100/80 p-2 rounded-xl text-right">
                          <div className="text-[10px] text-slate-500 font-medium">Item Subtotal</div>
                          <div className="text-xs font-black text-slate-900 font-mono">
                            Rs. {(item.quantity * (item.offeredRate || 0)).toLocaleString()}
                          </div>
                        </div>

                      </div>

                      {/* Optional Save to Catalog button for Controller/Manager */}
                      {currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role) && item.productName.trim() && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => saveProductToCatalog(item)}
                            className="text-[10px] text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 hover:underline"
                          >
                            <span>💾 Save &quot;{item.productName}&quot; to System Catalog</span>
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Rate Warning Badge */}
                    {item.isSpecialRate && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 flex items-start gap-2 text-xs text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">⚠️ Special Rate Entered</span>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Standard rate is Rs. {item.standardRate}, minimum approved selling rate is Rs. {item.minAllowedRate}.
                            You can submit, and Controller / Manager will review and approve.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>

              {/* Total Calculation Display */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">Total Estimated Amount</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    Rs. {calculateTotal().toLocaleString()}
                  </div>
                </div>
                {hasAnySpecialRate && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full">
                    Rate Review Required
                  </span>
                )}
              </div>

            </div>
          )}

          {/* STEP 3: PAYMENT & TERMS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Step 03 — Payment Status & Terms
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Specify payment agreement with the customer</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'ADVANCE', label: '100% Advance', desc: 'Online / Cheque received' },
                  { value: 'CASH', label: 'Cash on Delivery', desc: 'COD at site' },
                  { value: 'CREDIT', label: 'Credit Terms', desc: 'Agreed credit period' },
                  { value: 'PENDING', label: 'Payment Pending', desc: 'To be settled' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentStatus(opt.value as PaymentStatus)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentStatus === opt.value
                        ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Remarks / Credit Days (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15 days credit approved / Cheque on site handover"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* STEP 4: LOGISTICS & URGENCY */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Step 04 — Schedule & Urgency
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Required dispatch date and delivery priority</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={requiredDeliveryDate}
                    onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Urgency *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'NORMAL', label: 'Normal', color: 'border-slate-300' },
                      { val: 'URGENT', label: '⚡ Urgent', color: 'border-amber-400 text-amber-900' },
                      { val: 'CRITICAL', label: '🔥 Critical', color: 'border-rose-400 text-rose-900' },
                    ].map(u => (
                      <button
                        key={u.val}
                        type="button"
                        onClick={() => setUrgency(u.val as Urgency)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          urgency === u.val
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMATION & SUBMIT */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Step 05 — Order Confirmation & Submit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Review summary before submitting</p>
              </div>

              {/* Summary overview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2.5">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-800">{companyName} ({customerName})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">City & Address:</span>
                  <span className="font-medium text-slate-800 text-right">{city} — {deliveryAddress}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Contact:</span>
                  <span className="font-medium text-slate-800">{customerPhone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Items:</span>
                  <span className="font-semibold text-slate-800">
                    {items.map(i => `${i.productName} × ${i.quantity} @ Rs. ${i.offeredRate}`).join('; ')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Grand Total:</span>
                  <span className="font-black text-slate-900 text-sm">
                    Rs. {calculateTotal().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Taken By:</span>
                  <span className="font-bold text-teal-800">
                    {currentUser?.name} ({currentUser?.phone})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Instructions / Remarks for Office
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Call client 1 hour before delivery / Unload at gate 2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                />
              </div>

              {hasAnySpecialRate && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Special rates detected. Order will be automatically flagged for Controller / Manager approval.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && (!companyName || !customerName || !customerPhone || !deliveryAddress)) {
                    alert('Please complete all required customer fields.');
                    return;
                  }
                  if (currentStep === 2) {
                    const invalidItem = items.find(i => !i.productName.trim() || !i.offeredRate || i.offeredRate <= 0);
                    if (invalidItem) {
                      alert('Please enter a product name and rate offered for all items.');
                      return;
                    }
                  }
                  setCurrentStep(prev => prev + 1);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {submitting ? (
                  <span>Submitting Order...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>SUBMIT ORDER →</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>

      </main>

      <MobileNav />
    </div>
  );
}
