'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mic, 
  FileEdit, 
  Package, 
  CheckSquare, 
  Bell, 
  Filter, 
  Search,
  ExternalLink,
  Eye,
  Check,
  RefreshCw,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { InboxItem, User } from '@/lib/types';
import Link from 'next/link';

export default function SmartInboxPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [readFilter, setReadFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.append('filter', categoryFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (readFilter !== 'ALL') params.append('read', readFilter);

      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load inbox items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [categoryFilter, statusFilter, readFilter]);

  const handleUpdateState = async (item: InboxItem, updates: { isRead?: boolean; status?: string }) => {
    setUpdatingId(item.id);
    try {
      const res = await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: item.type,
          itemId: item.id,
          ...updates,
        }),
      });

      if (res.ok) {
        setItems(prev =>
          prev.map(i => {
            if (i.id === item.id && i.type === item.type) {
              return {
                ...i,
                isRead: updates.isRead !== undefined ? updates.isRead : i.isRead,
                status: updates.status ? (updates.status as any) : i.status,
              };
            }
            return i;
          })
        );
      }
    } catch (err) {
      console.error('Update state failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.assignedToName && item.assignedToName.toLowerCase().includes(q))
    );
  });

  const unreadCount = items.filter(i => !i.isRead).length;
  const inProgressCount = items.filter(i => i.status === 'IN_PROGRESS' || i.status === 'PENDING').length;
  const completedCount = items.filter(i => i.status === 'COMPLETED').length;

  const isManagement = currentUser && ['MANAGEMENT', 'ADMIN', 'BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);

  return (
    <div className="min-h-screen bg-[#F5F2E9] pb-16">
      <Navbar currentUser={currentUser} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6DDDD]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-white border border-[#E6DDDD] text-[#B7937A] shadow-xs">
                <Inbox className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-[#221D1D] tracking-tight">Smart Work Inbox</h1>
            </div>
            <p className="text-xs text-[#635858] mt-1">
              Unified operational queue for tasks, follow-up reminders, order corrections, voice orders, and system updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-[#C8B5A9] rounded-xl hover:bg-[#FAF8F6] text-[#221D1D] shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-[#AF9292]" />
              <span>Search (Ctrl+K)</span>
            </button>
            <button
              onClick={fetchInbox}
              className="p-2 bg-white border border-[#E6DDDD] rounded-xl text-[#635858] hover:text-[#221D1D] hover:bg-[#FAF8F6] transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
          <div className="korean-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#635858] uppercase">Total Active</p>
              <p className="text-2xl font-extrabold text-[#221D1D] mt-0.5">{items.length}</p>
            </div>
            <span className="p-2.5 rounded-xl bg-[#FAF8F6] text-[#221D1D] border border-[#E6DDDD]">
              <Inbox className="w-4 h-4" />
            </span>
          </div>

          <div className="korean-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#635858] uppercase">Unread Items</p>
              <p className="text-2xl font-extrabold text-[#AF9292] mt-0.5">{unreadCount}</p>
            </div>
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>

          <div className="korean-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#635858] uppercase">In Progress</p>
              <p className="text-2xl font-extrabold text-blue-700 mt-0.5">{inProgressCount}</p>
            </div>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Clock className="w-4 h-4" />
            </span>
          </div>

          <div className="korean-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#635858] uppercase">Completed</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">{completedCount}</p>
            </div>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="korean-card p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'TASKS', label: 'Assigned Tasks' },
              { id: 'REMINDERS', label: 'Follow-ups' },
              { id: 'CORRECTIONS', label: 'Corrections' },
              { id: 'VOICE_ORDERS', label: 'Voice Orders' },
              { id: 'NOTIFICATIONS', label: 'Notifications' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-[#221D1D] text-white shadow-xs'
                    : 'text-[#635858] hover:bg-[#FAF8F6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status & Read Controls */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-[#221D1D] focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value="IN_PROGRESS">Status: In Progress</option>
              <option value="COMPLETED">Status: Completed</option>
            </select>

            <select
              value={readFilter}
              onChange={e => setReadFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-[#FAF8F6] border border-[#E6DDDD] rounded-xl text-[#221D1D] focus:outline-none"
            >
              <option value="ALL">Read: All</option>
              <option value="UNREAD">Unread Only</option>
              <option value="READ">Read Only</option>
            </select>
          </div>
        </div>

        {/* Inbox Items List */}
        <div className="space-y-3">
          {loading ? (
            <div className="korean-card p-12 text-center text-xs text-[#635858]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B7937A]" />
              Loading your work inbox...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="korean-card p-12 text-center text-[#635858]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-sm text-[#221D1D]">Inbox Zero</p>
              <p className="text-xs mt-1">No pending tasks or unread notifications in this view.</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isUnread = !item.isRead;
              const isDone = item.status === 'COMPLETED';

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`korean-card p-4 transition-all border-l-4 ${
                    isUnread
                      ? 'border-l-[#B7937A] bg-white'
                      : isDone
                      ? 'border-l-emerald-500 bg-[#FAF8F6]/70 opacity-90'
                      : 'border-l-blue-400 bg-white'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Main content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDDD] shrink-0 mt-0.5">
                        {item.type === 'TASK' && <CheckSquare className="w-4 h-4 text-blue-600" />}
                        {(item.type === 'REMINDER' || (item.type as string) === 'CUSTOMER_REMINDER') && <Clock className="w-4 h-4 text-amber-600" />}
                        {(item.type === 'CORRECTION' || (item.type as string) === 'ORDER_CORRECTION') && <FileEdit className="w-4 h-4 text-purple-600" />}
                        {item.type === 'VOICE_ORDER' && <Mic className="w-4 h-4 text-rose-600" />}
                        {item.type === 'NOTIFICATION' && <Bell className="w-4 h-4 text-[#AF9292]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm ${isUnread ? 'font-bold text-[#221D1D]' : 'font-semibold text-[#635858]'}`}>
                            {item.title}
                          </h3>

                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F6] text-[#B7937A] border border-[#C8B5A9]">
                              Unread
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isDone 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.status}
                          </span>

                          {item.priority && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.priority === 'HIGH' || item.priority === 'URGENT'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-[#FAF8F6] text-[#635858] border border-[#E6DDDD]'
                            }`}>
                              {item.priority}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#635858] mt-1 leading-relaxed">
                          {item.description}
                        </p>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#AF9292]">
                          <span>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          
                          {item.assignedToName && (
                            <span className="flex items-center gap-1 font-medium text-[#635858]">
                              <UserCheck className="w-3.5 h-3.5 text-[#B7937A]" />
                              Assigned to: {item.assignedToName}
                            </span>
                          )}

                          {isManagement && (
                            <span className="text-[10px] bg-[#FAF8F6] px-2 py-0.5 rounded border border-[#E6DDDD] font-semibold text-[#635858]">
                              {item.isRead ? 'Seen by user' : 'Unopened by user'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {isUnread && (
                        <button
                          onClick={() => handleUpdateState(item, { isRead: true })}
                          disabled={updatingId === item.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E6DDDD] bg-white hover:bg-[#FAF8F6] text-xs font-semibold text-[#635858]"
                          title="Mark as Read"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      {!isDone ? (
                        <button
                          onClick={() => handleUpdateState(item, { isRead: true, status: 'COMPLETED' })}
                          disabled={updatingId === item.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Complete</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateState(item, { status: 'IN_PROGRESS' })}
                          disabled={updatingId === item.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E6DDDD] bg-white hover:bg-[#FAF8F6] text-xs font-medium text-[#635858]"
                        >
                          <span>Reopen</span>
                        </button>
                      )}

                      {(item.url || item.relatedUrl) && (
                        <Link
                          href={item.url || item.relatedUrl || '/'}
                          className="p-2 rounded-xl bg-[#FAF8F6] hover:bg-[#E6DDDD] text-[#221D1D] transition-all"
                          title="Open target view"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
