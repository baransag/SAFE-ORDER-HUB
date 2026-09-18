'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings as SettingsIcon, 
  Send, 
  Building2, 
  Check, 
  ShieldCheck, 
  Percent, 
  Users, 
  Lock,
  Save
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { SystemSettings, User } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form
  const [companyName, setCompanyName] = useState('');
  const [officeWhatsappNumber, setOfficeWhatsappNumber] = useState('');
  const [whatsappGroupInviteUrl, setWhatsappGroupInviteUrl] = useState('');
  const [rateWarningTolerancePercent, setRateWarningTolerancePercent] = useState(5);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [authRes, settingsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/settings')
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (!['BOSS', 'CONTROLLER', 'MANAGER'].includes(authData.user.role)) {
        router.push('/');
        return;
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const s = data.settings;
        setSettings(s);
        setCompanyName(s.companyName || '');
        setOfficeWhatsappNumber(s.officeWhatsappNumber || '');
        setWhatsappGroupInviteUrl(s.whatsappGroupInviteUrl || '');
        setRateWarningTolerancePercent(s.rateWarningTolerancePercent || 5);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          officeWhatsappNumber,
          whatsappGroupInviteUrl,
          rateWarningTolerancePercent,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Failed to save settings');
      }
    } catch {
      alert('Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-3 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] pb-24 md:pb-12">
      <Navbar currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            System & WhatsApp Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure office notification targets, WhatsApp destinations, and pricing thresholds.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings updated and saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="korean-card p-6 sm:p-8 space-y-6">
          
          {/* Company identity */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Company Branding
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Header in WhatsApp Messages & Invoices
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* WhatsApp Destination */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                WhatsApp Order Dispatch Target
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Office WhatsApp Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 03006646124 or 923006646124"
                  value={officeWhatsappNumber}
                  onChange={(e) => setOfficeWhatsappNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  When a sales person clicks &quot;Send to WhatsApp&quot;, this recipient chat will open directly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Group Invite Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappGroupInviteUrl}
                  onChange={(e) => setWhatsappGroupInviteUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Optional office order dispatch group link.
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Controls */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-600" />
                Rate Review Thresholds
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate Tolerance Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={rateWarningTolerancePercent}
                onChange={(e) => setRateWarningTolerancePercent(Number(e.target.value))}
                className="w-32 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Any selling rate below the minimum catalog price will automatically require Controller or Manager review.
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving changes...' : 'Save System Settings'}</span>
            </button>
          </div>

        </form>

      </main>

      <MobileNav />
    </div>
  );
}
