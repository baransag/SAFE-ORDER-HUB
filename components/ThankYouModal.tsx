'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Send, 
  Phone, 
  UserCheck, 
  Building2, 
  Share2,
  FileCheck
} from 'lucide-react';
import { Order, User } from '@/lib/types';
import { generateThankYouMessage, ThankYouStyle } from '@/lib/whatsapp';

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
  const [selectedStyle, setSelectedStyle] = useState<ThankYouStyle>('EXECUTIVE');
  const [senderName, setSenderName] = useState<string>('');
  const [senderDesignation, setSenderDesignation] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [logged, setLogged] = useState<boolean>(false);

  // Initialize data whenever modal opens or order changes
  useEffect(() => {
    if (!order) return;

    const initialSenderName = currentUser?.name || 'M. Husnain Farooq';
    const initialSenderDesig = currentUser?.designation || 'Operations Desk';
    const initialSenderPhone = currentUser?.phone || (currentUser?.role === 'MANAGER' ? '03006646124' : '03468760963');
    const initialClientPhone = order.customerWhatsapp || order.customerPhone || '';

    setSenderName(initialSenderName);
    setSenderDesignation(initialSenderDesig);
    setSenderPhone(initialSenderPhone);
    setClientPhone(initialClientPhone);

    const generated = generateThankYouMessage({
      order,
      style: selectedStyle,
      controllerName: initialSenderName,
      controllerDesignation: initialSenderDesig,
      controllerPhone: initialSenderPhone,
    });
    setMessageText(generated);
    setCopied(false);
    setLogged(false);
  }, [isOpen, order, currentUser]);

  // Re-generate text if style, sender name, designation, or phone changes
  const handleStyleChange = (style: ThankYouStyle) => {
    if (!order) return;
    setSelectedStyle(style);
    const updated = generateThankYouMessage({
      order,
      style,
      controllerName: senderName,
      controllerDesignation: senderDesignation,
      controllerPhone: senderPhone,
    });
    setMessageText(updated);
  };

  const handleSenderChange = (name: string, desig: string, phone: string) => {
    if (!order) return;
    setSenderName(name);
    setSenderDesignation(desig);
    setSenderPhone(phone);
    const updated = generateThankYouMessage({
      order,
      style: selectedStyle,
      controllerName: name,
      controllerDesignation: desig,
      controllerPhone: phone,
    });
    setMessageText(updated);
  };

  if (!isOpen || !order) return null;

  // Clean phone number for WhatsApp
  let cleanPhone = clientPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '92' + cleanPhone.slice(1);
  }
  const whatsappUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    logDispatch('Copied to Clipboard');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppClick = () => {
    logDispatch('Sent via WhatsApp');
    if (onMessageSent) onMessageSent();
  };

  const logDispatch = async (notePrefix: string) => {
    if (logged) return;
    try {
      await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_thank_you',
          targetOrderId: order.id,
          targetPhone: clientPhone,
          chosenStyle: selectedStyle,
          note: `${notePrefix} (${selectedStyle}) by ${currentUser?.name || 'Operations'}`,
        }),
      });
      setLogged(true);
    } catch {
      // silent
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Client Thank You Message Hub
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AI Smart
                </span>
              </div>
              <p className="text-xs text-slate-500">
                For <strong className="text-slate-700">{order.customerName}</strong> ({order.companyName}) • Ref: <span className="font-mono text-teal-700 font-bold">{order.orderNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Template Style Switcher Tabs */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Message Tone &amp; Style:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleStyleChange('EXECUTIVE')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col gap-0.5 border ${
                selectedStyle === 'EXECUTIVE'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🏢 Executive</span>
              <span className={`text-[10px] font-normal ${selectedStyle === 'EXECUTIVE' ? 'text-teal-100' : 'text-slate-400'}`}>
                Corporate &amp; Formal
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStyleChange('VIP_URDU')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col gap-0.5 border ${
                selectedStyle === 'VIP_URDU'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🌟 VIP Urdu</span>
              <span className={`text-[10px] font-normal ${selectedStyle === 'VIP_URDU' ? 'text-purple-100' : 'text-slate-400'}`}>
                اردو دلی شکریہ
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStyleChange('DISPATCH_ALERT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col gap-0.5 border ${
                selectedStyle === 'DISPATCH_ALERT'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>🚚 Dispatch Alert</span>
              <span className={`text-[10px] font-normal ${selectedStyle === 'DISPATCH_ALERT' ? 'text-amber-100' : 'text-slate-400'}`}>
                Logistics &amp; Tracking
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStyleChange('SHORT')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col gap-0.5 border ${
                selectedStyle === 'SHORT'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>⚡ Quick SMS</span>
              <span className={`text-[10px] font-normal ${selectedStyle === 'SHORT' ? 'text-slate-300' : 'text-slate-400'}`}>
                Concise Summary
              </span>
            </button>
          </div>
        </div>

        {/* 2. Sender Quick Select & Client WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
          {/* Operations Contact */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Operations Contact In Text:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSenderChange('M. Husnain Farooq', 'Controller (Operations)', '03468760963')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-teal-50 text-teal-700 font-semibold border border-slate-200"
                >
                  Husnain
                </button>
                <button
                  type="button"
                  onClick={() => handleSenderChange('Samaira Mubashar', 'Manager Finance', '03006646124')}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-teal-50 text-teal-700 font-semibold border border-slate-200"
                >
                  Samaira
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={senderName}
                onChange={(e) => {
                  setSenderName(e.target.value);
                  handleSenderChange(e.target.value, senderDesignation, senderPhone);
                }}
                placeholder="Sender Name"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              />
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => {
                  setSenderPhone(e.target.value);
                  handleSenderChange(senderName, senderDesignation, e.target.value);
                }}
                placeholder="03468760963"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium"
              />
            </div>
          </div>

          {/* Client WhatsApp Number */}
          <div>
            <span className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Client WhatsApp Number:</span>
            </span>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="e.g. 03001234567 or 923001234567"
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800"
            />
          </div>
        </div>

        {/* 3. Live Formatted Preview (Editable) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Message Live Preview (Editable):
            </label>
            <span className="text-[10px] text-slate-400">
              Auto-formatted for WhatsApp Bold/Italics
            </span>
          </div>
          <textarea
            rows={8}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-y"
          />
        </div>

        {/* 4. Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 self-start sm:self-center">
            {logged && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Recorded in Audit Log</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">✓ Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            {/* Send WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-105 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp 🚀</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
