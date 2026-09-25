'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Bell, 
  Globe, 
  Palette, 
  Camera, 
  Check, 
  Save, 
  Clock, 
  Package, 
  DollarSign, 
  Truck,
  ArrowRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { User, Order } from '@/lib/types';
import { getUserAvatar, getUserInitials } from '@/lib/avatar';

const PRESET_AVATARS = [
  { label: 'Asif (Boss)', url: '/assets/images/Asif.jpeg' },
  { label: 'Husnain Farooq', url: '/assets/images/Husnain.jpeg' },
  { label: 'Samaira Mubashar', url: '/assets/images/Samira.jpeg' },
  { label: 'Shahzaib Ahmad', url: '/assets/images/shahzaib-ahmad.jpeg' },
  { label: 'Shahbaz Ahmed', url: '/assets/images/shahbaz-ahmad.jpeg' },
  { label: 'Adnan Ali', url: '/assets/images/adnan-ali.jpeg' },
  { label: 'Haseeb Ali', url: '/assets/images/haseeb-ali.jpeg' },
  { label: 'Tajammul Mushtaq', url: '/assets/images/tajammul.jpeg' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [avatar, setAvatar] = useState('');
  const [languagePreference, setLanguagePreference] = useState('en');
  const [themePreference, setThemePreference] = useState('light');
  const [notificationPreferences, setNotificationPreferences] = useState({
    orders: true,
    deliveries: true,
    approvals: true,
  });
  const [profileVisibility, setProfileVisibility] = useState('TEAM');

  // Password Change Fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      const u = data.user;
      setCurrentUser(u);
      setStats(data.stats);
      setRecentOrders(data.recentOrders || []);

      setName(u.name || '');
      setPhone(u.phone || '');
      setDesignation(u.designation || '');
      setAvatar(u.avatar || getUserAvatar(u));
      setLanguagePreference(u.languagePreference || 'en');
      setThemePreference(u.themePreference || 'light');
      setNotificationPreferences(u.notificationPreferences || { orders: true, deliveries: true, approvals: true });
      setProfileVisibility(u.profileVisibility || 'TEAM');
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit. Please choose a smaller compressed image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaveSuccess(false);

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to authorize password update.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          designation,
          avatar,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
          languagePreference,
          themePreference,
          notificationPreferences,
          profileVisibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setCurrentUser(data.user);
      setSaveSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const isSales = currentUser && !['BOSS', 'CONTROLLER', 'MANAGER'].includes(currentUser.role);
  const initials = getUserInitials(currentUser?.name);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F4] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-[#B7937A] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F4] pb-24 md:pb-12 text-[#221D1D]">
      <Navbar currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-7 space-y-7">
        
        {/* Profile Hero Header */}
        <div className="korean-card p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full grad-hero-banner blur-2xl opacity-70 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
            <div className="relative group">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={currentUser?.name} 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#BCAEC4]/30 border-2 border-white shadow-md flex items-center justify-center text-3xl font-black text-[#221D1D]">
                  {initials}
                </div>
              )}
              <label 
                htmlFor="avatar-upload"
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#B7937A] text-white flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-all"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFile} 
                  className="hidden" 
                />
              </label>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#221D1D] tracking-tight">
                  {currentUser?.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#BCAEC4]/25 text-[#221D1D] border border-[#C8B5A9]">
                  {currentUser?.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#635858] font-medium">
                {currentUser?.designation} • SAFE SOLUTIONS
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-[#635858]">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#B7937A]" />
                  <span>{currentUser?.email}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#B7937A]" />
                  <span>{currentUser?.phone}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Personal Order Activity Stats (Strictly Personal) */}
        {isSales && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="korean-card p-4">
              <div className="text-[11px] text-[#635858] font-semibold flex items-center justify-between">
                <span>My Booked Orders</span>
                <Package className="w-4 h-4 text-[#B7937A]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#221D1D] mt-1">
                {stats?.totalOrders ?? 0}
              </div>
              <div className="text-[10px] text-[#635858] mt-0.5">Lifetime logged</div>
            </div>

            <div className="korean-card p-4">
              <div className="text-[11px] text-[#635858] font-semibold flex items-center justify-between">
                <span>Today&apos;s Bookings</span>
                <Clock className="w-4 h-4 text-[#AF9292]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#AF9292] mt-1">
                {stats?.todayOrders ?? 0}
              </div>
              <div className="text-[10px] text-[#635858] mt-0.5">Recorded today</div>
            </div>

            <div className="korean-card p-4">
              <div className="text-[11px] text-[#635858] font-semibold flex items-center justify-between">
                <span>Pending Delivery</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-700 mt-1">
                {stats?.pendingDeliveries ?? 0}
              </div>
              <div className="text-[10px] text-amber-800 mt-0.5">In fulfillment</div>
            </div>

            <div className="korean-card p-4">
              <div className="text-[11px] text-[#635858] font-semibold flex items-center justify-between">
                <span>Delivered</span>
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {stats?.deliveredCount ?? 0}
              </div>
              <div className="text-[10px] text-emerald-800 mt-0.5">Completed</div>
            </div>
          </div>
        )}

        {/* Profile Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="korean-card p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#221D1D] tracking-tight pb-2 border-b border-[#E6DDDD]">
              Employee Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Full Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] focus:ring-1 focus:ring-[#B7937A]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] focus:ring-1 focus:ring-[#B7937A]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Designation Display</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D] focus:ring-1 focus:ring-[#B7937A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Assigned Role (Non-Editable)</label>
                <input
                  type="text"
                  value={currentUser?.role || ''}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-[#E6DDDD] bg-[#FAF8F6] text-[#635858] font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-[#635858] mt-1 block">
                  Role assignments and permissions are strictly managed by Controller/Boss.
                </span>
              </div>
            </div>

            {/* Quick Avatar Selector from Authenticated Employee Photos */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-[#635858] mb-2 block">Choose Approved Photo Preset</label>
              <div className="flex flex-wrap gap-2.5">
                {PRESET_AVATARS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(p.url)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                      avatar === p.url 
                        ? 'bg-[#FAF8F6] border-[#B7937A] text-[#221D1D] font-bold shadow-xs' 
                        : 'bg-white border-[#E6DDDD] text-[#635858] hover:border-[#C8B5A9]'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="w-5 h-5 rounded-full object-cover" />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="korean-card p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#221D1D] tracking-tight pb-2 border-b border-[#E6DDDD]">
              System Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Preferred Language</label>
                <select
                  value={languagePreference}
                  onChange={(e) => setLanguagePreference(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                >
                  <option value="en">English (Official)</option>
                  <option value="ur">Roman Urdu / اردو</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Theme Appearance</label>
                <select
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                >
                  <option value="light">Soft Pastel (Default)</option>
                  <option value="system">Follow System</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Profile Visibility</label>
                <select
                  value={profileVisibility}
                  onChange={(e) => setProfileVisibility(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                >
                  <option value="TEAM">Visible to Team</option>
                  <option value="PRIVATE">Management Only</option>
                </select>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="pt-2 border-t border-[#E6DDDD] space-y-2">
              <label className="text-[11px] font-semibold text-[#635858] block">Notification Channels</label>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.orders}
                    onChange={(e) => setNotificationPreferences(p => ({ ...p, orders: e.target.checked }))}
                    className="rounded accent-[#B7937A]"
                  />
                  <span>Order Status Changes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.deliveries}
                    onChange={(e) => setNotificationPreferences(p => ({ ...p, deliveries: e.target.checked }))}
                    className="rounded accent-[#B7937A]"
                  />
                  <span>Delivery Dispatches</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.approvals}
                    onChange={(e) => setNotificationPreferences(p => ({ ...p, approvals: e.target.checked }))}
                    className="rounded accent-[#B7937A]"
                  />
                  <span>Management Approvals</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Password & Security */}
          <div className="korean-card p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#221D1D] tracking-tight pb-2 border-b border-[#E6DDDD] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#B7937A]" />
              <span>Change Password</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#635858] mb-1 block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full p-2.5 rounded-xl border border-[#C8B5A9] bg-white text-[#221D1D]"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#AF9292] to-[#B7937A] hover:opacity-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>

      </main>

      <MobileNav />
    </div>
  );
}
