'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Copy,
  WifiOff,
  Wifi,
  Search,
  Check
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { Product, User, Customer, PaymentStatus, Urgency } from '@/lib/types';

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
  remarks?: string;
}

const DRAFT_KEY = 'safe_order_draft_v1';

export default function NewOrderPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Network & Draft Status
  const [isOnline, setIsOnline] = useState(true);
  const [draftSaved, setDraftSaved] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Customer Autocomplete States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

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
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PENDING');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [remarks, setRemarks] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Success State
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK');
  const [formattedMessage, setFormattedMessage] = useState('');
  const [whatsappShareUrl, setWhatsappShareUrl] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);

  const pakCities = ['Lahore', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Multan', 'Gujranwala', 'Sialkot', 'Karachi', 'Peshawar', 'Sahiwal', 'Sheikhupura', 'Kasur', 'Okara'];

  // Online / Offline Listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (loading || createdOrder) return;

    const draft = {
      customerName,
      companyName,
      customerPhone,
      customerWhatsapp,
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
      internalNotes,
      idempotencyKey,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      const timer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    } catch {
      // ignore
    }
  }, [
    customerName, companyName, customerPhone, customerWhatsapp, city, 
    deliveryAddress, mapsUrl, customerType, items, paymentStatus, 
    paymentRemarks, requiredDeliveryDate, urgency, remarks, internalNotes, 
    idempotencyKey, loading, createdOrder
  ]);

  const fetchInitialData = async () => {
    try {
      const [authRes, prodRes, custRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/products'),
        fetch('/api/customers')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      let loadedProducts: Product[] = [];
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        loadedProducts = prodData.products || [];
        setProducts(loadedProducts);
      }

      if (custRes.ok) {
        const custData = await custRes.json();
        setAllCustomers(custData.customers || []);
      }

      // Check if saved draft exists
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          // Only restore if recent (within 7 days)
          if (Date.now() - (draft.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
            if (draft.customerName) setCustomerName(draft.customerName);
            if (draft.companyName) setCompanyName(draft.companyName);
            if (draft.customerPhone) setCustomerPhone(draft.customerPhone);
            if (draft.customerWhatsapp) setCustomerWhatsapp(draft.customerWhatsapp);
            if (draft.city) setCity(draft.city);
            if (draft.deliveryAddress) setDeliveryAddress(draft.deliveryAddress);
            if (draft.mapsUrl) setMapsUrl(draft.mapsUrl);
            if (draft.customerType) setCustomerType(draft.customerType);
            if (draft.items && draft.items.length > 0) setItems(draft.items);
            if (draft.paymentStatus) setPaymentStatus(draft.paymentStatus);
            if (draft.paymentRemarks) setPaymentRemarks(draft.paymentRemarks);
            if (draft.requiredDeliveryDate) setRequiredDeliveryDate(draft.requiredDeliveryDate);
            if (draft.urgency) setUrgency(draft.urgency);
            if (draft.remarks) setRemarks(draft.remarks);
            if (draft.internalNotes) setInternalNotes(draft.internalNotes);
            if (draft.idempotencyKey) setIdempotencyKey(draft.idempotencyKey);
            setLoading(false);
            return;
          }
        } catch {
          // ignore error
        }
      }

      // Default initial product if no draft
      if (loadedProducts.length > 0) {
        const first = loadedProducts[0];
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
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Customer search handler
  const handleCustomerSearch = (val: string) => {
    setCustomerSearchQuery(val);
    setCompanyName(val);
    if (!val.trim()) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    const q = val.toLowerCase().trim();
    const matches = allCustomers.filter(c => 
      c.companyName.toLowerCase().includes(q) || 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    );
    setFilteredCustomers(matches);
    setShowCustomerDropdown(matches.length > 0);
  };

  const selectExistingCustomer = (c: Customer) => {
    setCompanyName(c.companyName);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerWhatsapp(c.whatsapp || c.phone);
    setCity(c.city);
    setDeliveryAddress(c.deliveryAddress);
    if (c.mapsUrl) setMapsUrl(c.mapsUrl);
    setCustomerType('EXISTING');
    setShowCustomerDropdown(false);
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
    const first = products[0];
    if (first) {
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
          productId: `custom_${Date.now()}`,
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

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.offeredRate), 0);
  };

  const calculateDiscountTotal = () => {
    return items.reduce((sum, item) => {
      const diff = item.standardRate > item.offeredRate ? (item.standardRate - item.offeredRate) * item.quantity : 0;
      return sum + diff;
    }, 0);
  };

  const hasAnySpecialRate = items.some(item => item.isSpecialRate);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      alert('You are currently offline. Your draft has been safely preserved locally. Please retry when internet reconnects.');
      return;
    }

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
        internalNotes,
        idempotencyKey,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        // Clear saved draft
        localStorage.removeItem(DRAFT_KEY);

        setCreatedOrder(data.order);
        setWhatsappLink(data.whatsappLink);
        setWhatsappGroupUrl(data.whatsappGroupUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK');
        setFormattedMessage(data.formattedMessage || '');
        setWhatsappShareUrl(data.whatsappShareUrl || data.whatsappLink);

        // Confetti celebration
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
      alert('Connection dropped. Your draft is preserved. Press "Submit Order" again once connected.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
        <Navbar currentUser={currentUser} />
        
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="korean-card p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-3xl grad-lavender-emerald mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Order Booked Successfully 🎉
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 font-mono">
                {createdOrder.orderNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Registered for <span className="font-semibold text-slate-800">{createdOrder.companyName}</span> ({createdOrder.city})
              </p>
            </div>

            {/* Special rate notice if flagged */}
            {createdOrder.status === 'RATE_REVIEW' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">⚠️ Rate Review Required</span>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    This order was entered with rates below standard threshold. Controller / Manager will review and confirm before dispatch.
                  </p>
                </div>
              </div>
            )}

            {/* Order summary card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Products:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                  {createdOrder.items.map((i: any) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Grand Total:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  Rs. {createdOrder.grandTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Sales Rep:</span>
                <span className="font-medium text-slate-700">{createdOrder.orderTakenByName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Delivery Address:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]">{createdOrder.deliveryAddress}</span>
              </div>
            </div>

            {/* Step 4: Tracking Sharing Statuses */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2.5">
              <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Order & Sharing Verification Status
              </div>
              
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>1. Order Saved in Database</span>
                </span>
                <span className="font-mono font-bold text-emerald-700">#{createdOrder.orderNumber}</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>2. WhatsApp Message Prepared</span>
                </span>
                <span className="font-semibold text-emerald-700">Verified ({createdOrder.items.length} items)</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  {whatsappOpened ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span>3. WhatsApp Handoff</span>
                </span>
                <span className={`font-semibold ${whatsappOpened ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {whatsappOpened ? 'Opened in WhatsApp' : 'Ready to Share'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>4. Group Delivery</span>
                </span>
                <span className="text-[10px] text-slate-500 italic">
                  Press &apos;Send&apos; in WhatsApp after selecting group
                </span>
              </div>
            </div>

            {/* Step 3: Reliable WhatsApp Sharing Actions */}
            <div className="space-y-2.5 pt-2">
              
              {/* Primary Action: Share Order on WhatsApp (Opens WhatsApp with prefilled message) */}
              <button
                type="button"
                onClick={() => {
                  const msg = formattedMessage || `🔔 NEW ORDER: ${createdOrder.orderNumber} - ${createdOrder.companyName}`;
                  // Copy as fallback safeguard
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(msg).catch(() => {});
                  }
                  setWhatsappOpened(true);
                  // Open WhatsApp universal share link with full encoded message prefilled
                  const shareUrl = whatsappShareUrl || `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                  const win = window.open(shareUrl, '_blank');
                  if (!win || win.closed || typeof win.closed === 'undefined') {
                    window.location.href = shareUrl;
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-600/30 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 stroke-[3]" />
                <span>Share Order on WhatsApp</span>
              </button>

              {copiedToClipboard && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Complete order text copied to clipboard!</span>
                </div>
              )}

              {/* Secondary Options: Copy Message Fallback & Direct Group Link */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = formattedMessage || `🔔 NEW ORDER: ${createdOrder.orderNumber}`;
                    navigator.clipboard.writeText(msg).then(() => {
                      setCopiedToClipboard(true);
                      setTimeout(() => setCopiedToClipboard(false), 3500);
                    });
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Order Text</span>
                </button>

                <a
                  href={whatsappGroupUrl || 'https://chat.whatsapp.com/DEbbiG4JnLkCRaNVrSIieK'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  title="Open SAFE SOLUTIONS Group directly"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Open Group Link</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
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
                    setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
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

  // ─────────────────────────────────────────────────────────────
  // ORDER WIZARD FORM (With Autocomplete & Offline Draft Resilience)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F6F8FC] pb-24 md:pb-12 text-[#172033]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Offline / Online Banner */}
        {!isOnline && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500 text-white text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              <span>Offline Mode: Weak or no connection. Your draft is safely saved in local storage.</span>
            </div>
            <span className="bg-amber-600 px-2 py-0.5 rounded-lg text-[10px]">Saved</span>
          </div>
        )}

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
          <div className="text-right flex items-center gap-2">
            {draftSaved && (
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Draft Saved ✓
              </span>
            )}
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

        {/* Wizard Form */}
        <form onSubmit={handleSubmitOrder} className="korean-card p-6 sm:p-8 space-y-6">
          
          {/* STEP 1: CUSTOMER DETAILS WITH REAL AUTOCOMPLETE */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Step 01 — Customer & Job Site
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Search existing clients to auto-populate or create a new client</p>
              </div>

              {/* Search Existing Customer Bar */}
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Site Name * (Search existing or type new)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Search by company, client name, or phone..."
                    value={companyName}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => {
                      if (filteredCustomers.length > 0) setShowCustomerDropdown(true);
                    }}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all font-medium"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* Autocomplete Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50">
                      Existing Clients Found ({filteredCustomers.length}) — Click to Autofill
                    </div>
                    {filteredCustomers.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => selectExistingCustomer(cust)}
                        className="p-2.5 hover:bg-teal-50/70 cursor-pointer transition-colors text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{cust.companyName}</div>
                          <div className="text-[11px] text-slate-500">
                            {cust.name} • {cust.phone} • {cust.city}
                          </div>
                        </div>
                        <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Contact Number (Phone) *
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Address / Job Site *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Detailed site address, road name, plot number..."
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
                    placeholder="https://maps.app.goo.gl/..."
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!companyName || !customerName || !customerPhone || !deliveryAddress) {
                      alert('Please complete all required customer fields.');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Next: Select Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: MULTI-PRODUCT SELECTION & RATE VALIDATION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    Step 02 — Products & Quantities
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select multiple products in a single order</p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1 hover:bg-teal-100 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isSpecialRate 
                        ? 'bg-amber-50/40 border-amber-300' 
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase">
                        Product Item #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Product Name — Free-text with optional catalog selector */}
                      <div className="sm:col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Product Name *
                          </label>
                          {products.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleProductSelect(idx, e.target.value);
                              }}
                              value=""
                              className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md px-1.5 py-0.5"
                            >
                              <option value="">Catalog Autofill</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tiger Shell Black, PU Sealant"
                          value={item.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], productName: val };
                              return copy;
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#AF9292]/30 focus:border-[#AF9292]"
                        />
                      </div>

                      {/* Packing / Unit — Free-text */}
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Packing / Unit
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 15 Kgs, 600 ml, Bag"
                          value={item.packing}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], packing: val, unit: val || 'Unit' };
                              return copy;
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#AF9292]/30 focus:border-[#AF9292]"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#AF9292]/30 focus:border-[#AF9292]"
                        />
                      </div>

                      {/* Offered Rate */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Rate (Rs.) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.offeredRate || ''}
                          onChange={(e) => handleRateChange(idx, Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#AF9292]/30 focus:border-[#AF9292]"
                          placeholder="0"
                        />
                      </div>

                      {/* Item Remarks */}
                      <div className="sm:col-span-12">
                        <input
                          type="text"
                          placeholder="Product / delivery remarks for this item (optional, e.g. white shade, urgent delivery)..."
                          value={item.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], remarks: val };
                              return copy;
                            });
                          }}
                          className="w-full px-3 py-1.5 bg-white/70 border border-slate-200 rounded-xl text-[11px] text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Rate Warning Flag */}
                    {item.isSpecialRate && (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>⚠️ Special Rate: Entered rate (Rs. {item.offeredRate}) is below standard minimum (Rs. {item.minAllowedRate}). This order will require Controller/Manager approval.</span>
                      </div>
                    )}

                    {/* Row Total */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Item Total:</span>
                      <span className="text-slate-900 font-mono">
                        Rs. {(item.quantity * item.offeredRate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Running Calculation Box */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rs. {calculateSubtotal().toLocaleString()}</span>
                </div>
                {calculateDiscountTotal() > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Discount vs. Standard Price:</span>
                    <span className="font-mono">- Rs. {calculateDiscountTotal().toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-300 font-mono">Rs. {calculateSubtotal().toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (items.some(i => !i.productName || !i.quantity || !i.offeredRate)) {
                      alert('Please complete all product quantities and rates.');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Next: Payment Terms</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT TERMS */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Step 03 — Payment Terms & Conditions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Specify payment arrangements</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Status / Terms *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(['PENDING', 'ADVANCE', 'PARTIAL', 'PAID', 'CREDIT', 'REFUNDED'] as PaymentStatus[]).map(ps => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => setPaymentStatus(ps)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        paymentStatus === ps 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {ps === 'PENDING' && '⏳ Payment Pending'}
                      {ps === 'ADVANCE' && '🏦 Advance Payment'}
                      {ps === 'PARTIAL' && '🌓 Partial Payment'}
                      {ps === 'PAID' && '✅ Paid / Cleared'}
                      {ps === 'CREDIT' && '📑 Credit Terms'}
                      {ps === 'REFUNDED' && '↩️ Refunded'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Remarks / Cheque No / Terms (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% advance received, balance on site delivery"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Next: Delivery Logistics</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: DELIVERY LOGISTICS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Step 04 — Delivery Scheduling
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Required date and shipment urgency</p>
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Urgency *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['NORMAL', 'URGENT', 'CRITICAL'] as Urgency[]).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all text-center ${
                          urgency === u 
                            ? u === 'CRITICAL' ? 'bg-rose-600 border-rose-600 text-white' : u === 'URGENT' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-teal-600 border-teal-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {u === 'NORMAL' && 'Normal'}
                        {u === 'URGENT' && '⚡ Urgent'}
                        {u === 'CRITICAL' && '🔥 Critical'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Instructions / Remarks (Client-Facing)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Client needs delivery before 2 PM. Call site foreman 30 mins before arrival."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Office Note (Not shown to client)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special price sanctioned for annual contract."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <span>Review Final Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & FINAL SUBMIT */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Step 05 — Order Verification & Submission
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Carefully verify details before saving to central database</p>
              </div>

              {hasAnySpecialRate && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">⚠️ Special Rate Order Notice</span>
                    <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                      One or more items contain rates below standard price. The order will be registered with &quot;RATE_REVIEW&quot; status for Controller / Manager approval.
                    </p>
                  </div>
                </div>
              )}

              {/* Order Summary Review Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Company / Job Site:</span>
                    <span className="font-bold text-slate-900 text-sm">{companyName}</span>
                    <div className="text-slate-600">{customerName} • {customerPhone}</div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Delivery Destination:</span>
                    <span className="font-semibold text-slate-800">{city}</span>
                    <div className="text-slate-600 truncate">{deliveryAddress}</div>
                  </div>
                </div>

                {/* Items Summary Table */}
                <div>
                  <span className="text-slate-400 block mb-1">Products Ordered ({items.length}):</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {items.map((i, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-semibold text-slate-800">
                              {i.productName}
                              {i.isSpecialRate && (
                                <span className="ml-1 text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-bold">
                                  Special
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center font-medium text-slate-600">
                              {i.quantity} {i.unit}
                            </td>
                            <td className="p-2 text-right font-medium text-slate-600">
                              Rs. {i.offeredRate.toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900 font-mono">
                              Rs. {(i.quantity * i.offeredRate).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-sm font-black border-t border-slate-200">
                  <span className="text-slate-700">Grand Total:</span>
                  <span className="text-emerald-700 font-mono text-base">
                    Rs. {calculateSubtotal().toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Order...' : 'CONFIRM & SUBMIT ORDER 🚀'}</span>
                </button>
              </div>
            </div>
          )}

        </form>
      </main>

      <MobileNav />
    </div>
  );
}
