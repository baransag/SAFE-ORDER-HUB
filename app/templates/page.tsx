'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  Copy, 
  Share2, 
  Sparkles, 
  Filter, 
  Save, 
  X,
  Globe
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { MessageTemplate, User, MessageTemplateCategory } from '@/lib/types';

const CATEGORIES: MessageTemplateCategory[] = [
  'ORDER_RECEIVED',
  'ORDER_CONFIRMED',
  'ORDER_DISPATCHED',
  'ORDER_DELIVERED',
  'PAYMENT_RECEIVED',
  'REPEAT_CUSTOMER',
  'NEW_CUSTOMER',
  'FEEDBACK_REVIEW',
  'AFTER_SALES',
  'GENERAL',
];

export default function TemplatesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  
  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MessageTemplateCategory>('ORDER_CONFIRMED');
  const [formLanguage, setFormLanguage] = useState<'en' | 'ur'>('en');
  const [formText, setFormText] = useState('');
  const [formDefault, setFormDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, languageFilter]);

  const fetchData = async () => {
    try {
      const [authRes, tmplRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/templates?all=true&category=${categoryFilter}&language=${languageFilter}`),
      ]);

      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setCurrentUser(authData.user);

      if (tmplRes.ok) {
        const tmplData = await tmplRes.json();
        setTemplates(tmplData.templates || []);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const isFullAccess = currentUser && ['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  const openNewModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory('ORDER_CONFIRMED');
    setFormLanguage('en');
    setFormText('Dear {{customer_name}}, thank you for your order #{{order_id}} for {{products}}. Expected delivery: {{delivery_date}}. Best regards, {{salesperson_name}}.');
    setFormDefault(false);
    setIsModalOpen(true);
  };

  const openEditModal = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setFormTitle(t.title);
    setFormCategory(t.category);
    setFormLanguage(t.language);
    setFormText(t.templateText);
    setFormDefault(t.isDefault);
    setIsModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formText) return;

    setSaving(true);
    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const payload: any = {
        title: formTitle,
        category: formCategory,
        language: formLanguage,
        templateText: formText,
        isDefault: formDefault,
      };
      if (editingTemplate) {
        payload.id = editingTemplate.id;
      }

      const res = await fetch('/api/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save template');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch {
      alert('Failed to delete template');
    }
  };

  const handleCopyPreview = (id: string, text: string) => {
    const sample = text
      .replace(/\{\{customer_name\}\}/g, 'Chaudhry Akram')
      .replace(/\{\{company_name\}\}/g, 'Prime Builders')
      .replace(/\{\{order_id\}\}/g, 'SS-ORD-2026-0012')
      .replace(/\{\{products\}\}/g, 'Ultra Seal (10 Buckets)')
      .replace(/\{\{delivery_date\}\}/g, 'Tomorrow, 2:00 PM')
      .replace(/\{\{salesperson_name\}\}/g, currentUser?.name || 'M. Husnain Farooq')
      .replace(/\{\{payment_status\}\}/g, 'CONFIRMED');

    navigator.clipboard.writeText(sample);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12 text-[#221D1D]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-7 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#221D1D] tracking-tight flex items-center gap-2">
              <span>Customer Message Templates</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#BCAEC4]/30 text-[#221D1D] font-mono">
                {templates.length} Active
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#635858] mt-1">
              Professionally written thank-you, dispatch, confirmation, and support messages with live placeholders.
            </p>
          </div>

          {isFullAccess && (
            <button
              onClick={openNewModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE NEW TEMPLATE</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="korean-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#635858] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#B7937A]" />
              <span>Category:</span>
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D] text-xs"
            >
              <option value="ALL">All Categories (10 Types)</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <span className="font-bold text-[#635858] ml-2">Language:</span>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-[#C8B5A9] bg-white text-[#221D1D] text-xs"
            >
              <option value="ALL">All Languages</option>
              <option value="en">English</option>
              <option value="ur">Roman Urdu</option>
            </select>
          </div>

          <div className="text-[11px] text-[#635858]">
            Supported variables: <code className="text-[#B7937A] font-mono">&#123;&#123;customer_name&#125;&#125;</code>, <code className="text-[#B7937A] font-mono">&#123;&#123;order_id&#125;&#125;</code>, <code className="text-[#B7937A] font-mono">&#123;&#123;products&#125;&#125;</code>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="korean-card py-16 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-[#C8B5A9] mx-auto opacity-70" />
            <p className="text-sm font-bold text-[#221D1D]">No templates found</p>
            <p className="text-xs text-[#635858]">Adjust your filters or create a new template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tmpl => {
              const isCopied = copiedId === tmpl.id;

              return (
                <div key={tmpl.id} className="korean-card p-5 space-y-3 flex flex-col justify-between korean-card-hover">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#221D1D]">{tmpl.title}</h3>
                          {tmpl.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#BCAEC4]/30 text-[#221D1D] border border-[#C8B5A9]">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#635858]">
                          <span className="font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FAF8F6] border border-[#E6DDDD]">
                            {tmpl.category}
                          </span>
                          <span>•</span>
                          <span className="font-mono uppercase font-bold text-[#B7937A]">
                            {tmpl.language === 'ur' ? 'Roman Urdu' : 'English'}
                          </span>
                        </div>
                      </div>

                      {isFullAccess && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(tmpl)}
                            className="p-1.5 rounded-lg hover:bg-[#FAF8F6] text-[#635858] hover:text-[#221D1D] transition-colors"
                            title="Edit Template"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#FAF8F6] p-3 rounded-xl border border-[#E6DDDD] text-xs text-[#221D1D] leading-relaxed font-sans whitespace-pre-wrap">
                      {tmpl.templateText}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6DDDD]/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#635858]">
                      Click to copy sample with simulated data
                    </span>

                    <button
                      onClick={() => handleCopyPreview(tmpl.id, tmpl.templateText)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F6] text-[#221D1D] border border-[#C8B5A9] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#635858]" />
                          <span>Copy Sample</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Template Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#241F1F]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#B7937A]/25 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DDDD]">
              <h2 className="text-base sm:text-lg font-black text-[#221D1D]">
                {editingTemplate ? 'Edit Message Template' : 'Create Message Template'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#FAF8F6] text-[#635858] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#635858] mb-1 block">Template Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Order Confirmed - Client Notice"
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#635858] mb-1 block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MessageTemplateCategory)}
                    className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#635858] mb-1 block">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as 'en' | 'ur')}
                    className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                  >
                    <option value="en">English</option>
                    <option value="ur">Roman Urdu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#635858] mb-1 block">Message Template Text</label>
                <textarea
                  rows={5}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] leading-relaxed"
                  required
                />
                <span className="text-[10px] text-[#635858] block mt-1">
                  Placeholders: &#123;&#123;customer_name&#125;&#125;, &#123;&#123;company_name&#125;&#125;, &#123;&#123;order_id&#125;&#125;, &#123;&#123;products&#125;&#125;, &#123;&#123;delivery_date&#125;&#125;, &#123;&#123;salesperson_name&#125;&#125;, &#123;&#123;payment_status&#125;&#125;
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={formDefault}
                  onChange={(e) => setFormDefault(e.target.checked)}
                  className="rounded accent-[#B7937A]"
                />
                <label htmlFor="defaultCheck" className="text-xs text-[#221D1D] font-medium cursor-pointer">
                  Set as default template for this category
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#E6DDDD]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F6] text-[#635858] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Template'}
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
