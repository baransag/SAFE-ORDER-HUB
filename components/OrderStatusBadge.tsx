import React from 'react';
import { OrderStatus } from '@/lib/types';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function OrderStatusBadge({ status, size = 'md' }: Props) {
  const getStatusConfig = (s: OrderStatus) => {
    switch (s) {
      case 'NEW':
        return {
          label: 'New Order',
          bg: 'bg-blue-50 text-blue-700 border-blue-200/60',
          dot: 'bg-blue-500',
        };
      case 'RATE_REVIEW':
        return {
          label: 'Rate Review',
          bg: 'bg-amber-50 text-amber-800 border-amber-300/80',
          dot: 'bg-amber-500 animate-soft-pulse',
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmed',
          bg: 'bg-purple-50 text-purple-700 border-purple-200/60',
          dot: 'bg-purple-500',
        };
      case 'PREPARING':
        return {
          label: 'Preparing',
          bg: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
          dot: 'bg-cyan-500',
        };
      case 'READY_FOR_DISPATCH':
        return {
          label: 'Ready for Dispatch',
          bg: 'bg-teal-50 text-teal-800 border-teal-300/60',
          dot: 'bg-teal-600',
        };
      case 'DISPATCHED':
        return {
          label: 'Dispatched',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
          dot: 'bg-indigo-500',
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Out for Delivery',
          bg: 'bg-amber-50 text-amber-900 border-amber-300/80',
          dot: 'bg-amber-600',
        };
      case 'DELIVERED':
        return {
          label: 'Delivered',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          dot: 'bg-emerald-500',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'ON_HOLD':
        return {
          label: 'On Hold',
          bg: 'bg-orange-50 text-orange-700 border-orange-200/60',
          dot: 'bg-orange-500',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
          dot: 'bg-rose-500',
        };
      case 'RETURNED':
        return {
          label: 'Returned',
          bg: 'bg-red-50 text-red-800 border-red-300',
          dot: 'bg-red-600',
        };
      case 'PARTIALLY_DELIVERED':
        return {
          label: 'Partially Delivered',
          bg: 'bg-yellow-50 text-yellow-800 border-yellow-300',
          dot: 'bg-yellow-600',
        };
      default:
        return {
          label: s,
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 font-medium',
    md: 'text-xs px-3 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} transition-all`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
