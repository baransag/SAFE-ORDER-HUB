'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Copy, 
  ExternalLink, 
  Check, 
  Send, 
  Phone, 
  Building2, 
  Sparkles,
  Share2,
  FileCheck
} from 'lucide-react';
import { Order, User, MessageTemplate } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  currentUser: User | null;
  onMessageSent?: () => void;
}

export default function ThankYouModal({
  isOpen,
  onClose,
  order,
  currentUser,
  onMessageSent,
}: Props) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [logged, setLogged] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Fetch templates from database
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        const tmpls: MessageTemplate[] = data.templates || [];
        setTemplates(tmpls);
        if (tmpls.length > 0) {
          const defaultTmpl = tmpls.find(t => t.isDefault) || tmpls[0];
          setSelectedTemplateId(defaultTmpl.id);
          if (order) {
            setMessageText(interpolate(defaultTmpl.templateText, order, currentUser));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  // When selected template or order changes, regenerate text
  useEffect(() => {
    if (!order || templates.length === 0) return;
    const currentTmpl = templates.find(t => t.id === selectedTemplateId) || templates[0];
    if (currentTmpl) {
      setMessageText(interpolate(currentTmpl.templateText, order, currentUser));
      setCopied(false);
      setLogged(false);
    }
  }, [selectedTemplateId, order]);

  function interpolate(tmpl: string, o: Order, u: User | null): string {
    const productsStr = (o.items || []).map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ');
    return tmpl
      .replace(/\{\{customer_name\}\}/g, o.customerName || 'Valued Client')
      .replace(/\{\{company_name\}\}/g, o.companyName || 'Valued Firm')
      .replace(/\{\{order_id\}\}/g, o.orderNumber || o.id)
      .replace(/\{\{products\}\}/g, productsStr || 'Construction Chemicals')
      .replace(/\{\{delivery_date\}\}/g, o.requiredDeliveryDate || 'Promptly')
      .replace(/\{\{salesperson_name\}\}/g, o.orderTakenByName || u?.name || 'Operations Desk')
      .replace(/\{\{payment_status\}\}/g, o.paymentStatus || 'PENDING');
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const phone = (order?.customerWhatsapp || order?.customerPhone || '').replace(/[^0-9]/g, '');
    let formattedPhone = phone;
    if (formattedPhone.startsWith('03')) {
      formattedPhone = '92' + formattedPhone.substring(1);
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    if (onMessageSent) onMessageSent();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#241F1F]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-[#B7937A]/25 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#BCAEC4]/25 flex items-center justify-center text-[#B7937A]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#221D1D] tracking-tight">
                Customer Message & WhatsApp Handoff
              </h2>
              <p className="text-xs text-[#635858]">
                Select an approved thank-you template or edit before dispatching to client.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F6] hover:bg-[#E6DDDD] text-[#635858] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Details Header Pill */}
        <div className="bg-[#FAF8F6] p-3 rounded-2xl border border-[#B7937A]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[#635858]">Client: </span>
            <strong className="text-[#221D1D]">{order.customerName} ({order.companyName})</strong>
          </div>
          <div>
            <span className="text-[#635858]">Order ID: </span>
            <span className="font-mono font-bold text-[#B7937A]">{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[#635858]">Phone: </span>
            <span className="font-semibold text-[#221D1D]">{order.customerWhatsapp || order.customerPhone}</span>
          </div>
        </div>

        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#221D1D]">Select Approved Template</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] focus:ring-1 focus:ring-[#B7937A]"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>
                [{t.language.toUpperCase()}] {t.title} ({t.category})
              </option>
            ))}
          </select>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#221D1D]">Message Content (Editable)</label>
            <span className="text-[11px] text-[#635858] font-mono">{messageText.length} characters</span>
          </div>
          <textarea
            rows={7}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full text-xs p-3.5 rounded-2xl border border-[#C8B5A9] bg-[#FAF8F6] text-[#221D1D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B7937A] font-sans leading-relaxed"
          />
        </div>

        {/* Actions Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E6DDDD]">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F6] text-[#221D1D] border border-[#C8B5A9] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#635858]" />
                <span>Copy Message</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
}
