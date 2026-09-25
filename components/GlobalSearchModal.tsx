'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Package, 
  Users, 
  FileText, 
  CheckSquare, 
  ArrowRight,
  Loader2,
  Clock,
  Phone,
  FileCheck
} from 'lucide-react';
import { SearchResult } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via custom event or props if controlled
        }
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    onClose();
    if (item.url) {
      router.push(item.url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white border border-[#E6DDDD] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#E6DDDD] bg-[#FAF8F6]">
          <Search className="w-5 h-5 text-[#AF9292] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search orders, customers, manual products, tasks, technical docs..."
            className="w-full bg-transparent text-sm font-medium text-[#221D1D] placeholder-[#AF9292] focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#B7937A] animate-spin mr-2 shrink-0" />}
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 hover:bg-[#E6DDDD] rounded-lg text-[#635858] mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-[#E6DDDD] text-[#635858] rounded-md">
            ESC to close
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-[#F0EBE8]">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-[#635858] text-xs">
              <p className="font-semibold text-sm text-[#221D1D] mb-1">Global Unified Search</p>
              <p>Type an order ID, customer phone/name, product name, or task keyword.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px]">
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F6] border border-[#E6DDDD]">Orders</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F6] border border-[#E6DDDD]">Customers</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F6] border border-[#E6DDDD]">Manual Products</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F6] border border-[#E6DDDD]">Technical Docs</span>
                <span className="px-2.5 py-1 rounded-full bg-[#FAF8F6] border border-[#E6DDDD]">Operational Tasks</span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-[#635858] text-xs">
              <p className="font-semibold text-sm text-[#221D1D] mb-1">No matching authorized records found</p>
              <p>Try searching with another keyword, phone number, or product title.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-[#FAF8F6] border-l-4 border-l-[#B7937A]' : 'hover:bg-[#FAF8F6]/60'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white border border-[#E6DDDD] shrink-0 mt-0.5">
                    {item.type === 'ORDER' && <Package className="w-4 h-4 text-[#B7937A]" />}
                    {item.type === 'CUSTOMER' && <Users className="w-4 h-4 text-emerald-600" />}
                    {item.type === 'TASK' && <CheckSquare className="w-4 h-4 text-blue-600" />}
                    {item.type === 'DOCUMENT' && <FileText className="w-4 h-4 text-purple-600" />}
                    {item.type === 'PRODUCT' && <FileCheck className="w-4 h-4 text-amber-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#221D1D] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E6DDDD]/60 text-[#635858]">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#635858] truncate mt-0.5">
                      {item.subtitle}
                    </p>
                    {item.metadata && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#AF9292]">
                        {item.metadata.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3" /> {item.metadata.phone}
                          </span>
                        )}
                        {item.metadata.status && (
                          <span className="px-1.5 py-0.2 rounded bg-white border border-[#E6DDDD] font-semibold">
                            {item.metadata.status}
                          </span>
                        )}
                        {item.metadata.amount && (
                          <span className="font-semibold text-[#221D1D]">
                            PKR {Number(item.metadata.amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowRight className={`w-4 h-4 text-[#AF9292] shrink-0 transition-transform ${
                    isSelected ? 'translate-x-1 text-[#221D1D]' : ''
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#FAF8F6] border-t border-[#E6DDDD] flex items-center justify-between text-[10px] text-[#635858]">
          <span>Server-side permission filtered</span>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
