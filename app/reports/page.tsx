'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  Package, 
  Users, 
  MapPin, 
  DollarSign, 
  Filter, 
  RefreshCw,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileNav from '@/components/MobileNav';
import { User } from '@/lib/types';

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [city, setCity] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const pakCities = ['Lahore', 'Faisalabad', 'Rawalpindi', 'Islamabad', 'Multan', 'Gujranwala', 'Sialkot', 'Karachi', 'Peshawar', 'Sahiwal', 'Sheikhupura'];

  useEffect(() => {
    fetchReport();
  }, [dateRange, city, status]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
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

      const params = new URLSearchParams({
        dateRange,
        city,
        status,
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData?.filteredOrders) return;
    const headers = ['Order ID,Date,Company,Customer,City,Products,Subtotal,Discount,Grand Total,Payment,Sales Rep,Status'];
    const rows = reportData.filteredOrders.map((o: any) => {
      const prods = o.items.map((i: any) => `${i.productName} (${i.quantity} ${i.unit})`).join('; ');
      return `"${o.orderNumber}","${o.createdAt.split('T')[0]}","${o.companyName}","${o.customerName}","${o.city}","${prods}","${o.subtotal}","${o.discountTotal}","${o.grandTotal}","${o.paymentStatus}","${o.orderTakenByName}","${o.status}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFE_SOLUTIONS_REPORT_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  if (loading && !reportData) {
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
                Business Intelligence & Sales Reports
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated financial figures, product velocity, sales performance, and exportable audit reports.
            </p>
          </div>

          <div className="flex items-center gap-2.5 print:hidden">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-slate-50 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="korean-card p-4 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>Filter Period:</span>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="TODAY">Today Only</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="ALL">All Time</option>
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Cities</option>
            {pakCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="korean-card p-5 space-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-lime-sky rounded-full blur-xl opacity-50 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-500">Total Net Revenue</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              Rs. {(reportData?.summary?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Verified sales volume</span>
            </div>
          </div>

          <div className="korean-card p-5 space-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-mint-blush rounded-full blur-xl opacity-50 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-500">Total Orders Fulfilled</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {reportData?.summary?.totalOrders || 0}
            </div>
            <div className="text-[11px] text-teal-600 font-semibold">
              Across selected filter criteria
            </div>
          </div>

          <div className="korean-card p-5 space-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 grad-lavender-emerald rounded-full blur-xl opacity-50 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-500">Average Order Value (AOV)</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              Rs. {(reportData?.summary?.avgOrderValue || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-600 font-semibold">
              Per booking transaction
            </div>
          </div>
        </div>

        {/* Product Sales Ranking & City Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Product Performance Table */}
          <div className="korean-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Product Revenue Ranking</h3>
                <p className="text-xs text-slate-500">Sales volume and order frequency</p>
              </div>
              <Package className="w-4 h-4 text-teal-600" />
            </div>

            {(!reportData?.productRanking || reportData.productRanking.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">No product data for selected period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <tr>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5 text-center">Units Sold</th>
                      <th className="py-2 px-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.productRanking.map((prod: any, idx: number) => (
                      <tr key={prod.name}>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                          <span className="mr-1.5 text-slate-400 font-normal">#{idx + 1}</span>
                          {prod.name}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-medium text-slate-600">
                          {prod.quantity}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          Rs. {prod.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Employee Performance Breakdown */}
          <div className="korean-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Sales Representatives</h3>
                <p className="text-xs text-slate-500">Order count and individual revenue share</p>
              </div>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>

            {(!reportData?.employeePerformance || reportData.employeePerformance.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">No employee records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
                    <tr>
                      <th className="py-2 px-2.5">Sales Person</th>
                      <th className="py-2 px-2.5 text-center">Orders</th>
                      <th className="py-2 px-2.5 text-right">Total Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.employeePerformance.map((emp: any) => (
                      <tr key={emp.name}>
                        <td className="py-2.5 px-2.5 font-semibold text-slate-800">
                          {emp.name}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-medium text-slate-600">
                          {emp.ordersCount}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          Rs. {emp.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Territory / City Distribution */}
        <div className="korean-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Territory & City Distribution</h3>
              <p className="text-xs text-slate-500">Orders and revenue breakdown by region</p>
            </div>
            <MapPin className="w-4 h-4 text-rose-500" />
          </div>

          {(!reportData?.cityDistribution || reportData.cityDistribution.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center">No city data available</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {reportData.cityDistribution.map((c: any) => (
                <div key={c.city} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-bold text-slate-800">{c.city}</div>
                  <div className="text-[11px] text-slate-400">{c.ordersCount} orders</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                    Rs. {c.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <MobileNav />
    </div>
  );
}
