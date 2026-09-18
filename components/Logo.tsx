import React from 'react';
import Image from 'next/image';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function Logo({ size = 'md', showSubtitle = true }: Props) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const markDimensions = isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12' : 'w-10 h-10';
  const titleSize = isSm ? 'text-base' : isLg ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-3 select-none">
      {/* High-res Vector / Image Emblem */}
      <div className={`${markDimensions} relative shrink-0 transition-transform group-hover:scale-105 drop-shadow-sm`}>
        <img
          src="/assest/images/logo.jpeg"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (target.src.includes('assest')) {
              target.src = '/images/logo.jpeg';
            } else if (target.src.includes('images')) {
              target.src = '/logo.jpeg';
            } else {
              target.src = '/logo-mark.svg';
            }
          }}
          alt="SAFE SOLUTIONS"
          className="w-full h-full object-contain rounded-xl"
        />
      </div>

      {/* Brand Text */}
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-slate-900 ${titleSize}`}>
            SAFE <span className="text-[#1EAE98]">SOLUTIONS</span>
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            HUB
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1 leading-none">
            Construction Chemicals &amp; Waterproofing
          </p>
        )}
      </div>
    </div>
  );
}
