'use client';

import React from 'react';
import { Globe, Sparkles } from 'lucide-react';
import { SDGS_THEME } from '@/lib/theme';

interface HeaderBannerProps {
  activePillFilter?: string;
  onSelectPillFilter?: (filter: string) => void;
}

export default function HeaderBanner({ activePillFilter = 'Semua', onSelectPillFilter }: HeaderBannerProps) {
  const pillOptions = ['Semua', 'Nasional', 'MOU', 'PKS', 'Internasional'];

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs sticky top-0 z-40">
      {/* Top Navbar Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/80">
        {/* Left Branding & Official POLNEP Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <img 
              src="/assets/logo-polnep.png" 
              alt="Logo Politeknik Negeri Pontianak" 
              className="w-10 h-10 object-contain hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-sky-900">
                Satu Data Kerja Sama
              </span>
              <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.5 rounded-full">
                POLNEP
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Politeknik Negeri Pontianak
            </span>
          </div>
        </div>

        {/* Right Badges & Quick Nav Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Orange Year / Data Terkini Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-200" />
            {SDGS_THEME.assets.yearPill}
          </span>

          {/* Nav Pills in dark slate */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-full border border-slate-200 text-xs">
            {pillOptions.map((pill) => {
              const isActive = activePillFilter.toLowerCase() === pill.toLowerCase();
              return (
                <button
                  key={pill}
                  onClick={() => onSelectPillFilter?.(pill)}
                  className={`px-3 py-1 rounded-full font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-default">
            <Globe className="w-3.5 h-3.5 text-sky-600" />
            <span>ID</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">EN</span>
          </div>
        </div>
      </div>

      {/* Main Title Banner Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-sky-600">
          PORTAL DATA KERJA SAMA
        </h1>
        <p className="mt-1 text-xs sm:text-sm md:text-base font-bold tracking-wide uppercase">
          <span className="text-sky-800">{SDGS_THEME.assets.headerSubtitlePrefix} </span>
          <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/80">
            {SDGS_THEME.assets.headerSubtitleHighlight}
          </span>
        </p>
      </div>
    </header>
  );
}
