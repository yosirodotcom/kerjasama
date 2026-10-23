'use client';

import React from 'react';
import { JoinedDokumen } from '@/lib/data';
import { Award, TrendingUp, CheckCircle2, FileText, Building2, MapPin, ChevronRight, Layers } from 'lucide-react';
import { parseAppDate } from '@/components/DataTable';
import { isBefore } from 'date-fns';

interface StatsOverviewProps {
  data: JoinedDokumen[];
  onFilterStatus?: (status: string) => void;
  onFilterJenis?: (jenis: string) => void;
  /** Label of the active filter period, e.g. "Tahun 2026". */
  periodLabel?: string;
  /** Label of the comparison period, e.g. "vs 2025". */
  comparisonLabel?: string;
  /** Document count in the comparison period (same attribute filters). */
  previousCount?: number;
  /** Document counts per time bucket within the active period. */
  trend?: number[];
}

function buildTrendPaths(series: number[]) {
  if (series.length < 2) return null;
  const max = Math.max(1, ...series);
  const step = 200 / (series.length - 1);
  const pts = series.map((v, i) => ({ x: +(i * step).toFixed(2), y: +(54 - (v / max) * 46).toFixed(2) }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return { line, area: `${line} L 200 60 L 0 60 Z`, pts, max };
}

export default function StatsOverview({
  data,
  onFilterStatus,
  onFilterJenis,
  periodLabel = 'Semua Periode',
  comparisonLabel = '',
  previousCount,
  trend = [],
}: StatsOverviewProps) {
  // Aggregate real-time statistics
  const total = data.length || 1;

  const statusCounts = React.useMemo(() => {
    let active = 0;
    let expired = 0;
    let unknown = 0;

    data.forEach((d) => {
      if (!d.tanggal_berakhir) {
        unknown++;
        return;
      }
      const parsed = parseAppDate(d.tanggal_berakhir);
      if (!parsed) {
        unknown++;
      } else if (isBefore(parsed, new Date())) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      active,
      expired,
      unknown,
      activePct: Math.round((active / total) * 100),
      expiredPct: Math.round((expired / total) * 100),
      unknownPct: Math.round((unknown / total) * 100),
    };
  }, [data, total]);

  const jenisCounts = React.useMemo(() => {
    let mou = 0;
    let pks = 0;
    let lainnya = 0;

    data.forEach((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      if (j.includes('MOU')) mou++;
      else if (j.includes('PKS') || j.includes('PERJANJIAN KERJASAMA') || j.includes('PERJANJIAN KERJA SAMA')) pks++;
      else lainnya++;
    });

    return {
      mou,
      pks,
      lainnya,
      mouPct: Math.round((mou / total) * 100),
      pksPct: Math.round((pks / total) * 100),
      lainnyaPct: Math.max(0, 100 - Math.round((mou / total) * 100) - Math.round((pks / total) * 100)),
    };
  }, [data, total]);

  const uniqueMitraCount = React.useMemo(() => {
    const names = new Set<string>();
    data.forEach((d) => {
      d.mitras?.forEach((m) => {
        if (m.nama?.trim()) names.add(m.nama.trim());
      });
    });
    return names.size;
  }, [data]);

  const growth = React.useMemo(() => {
    if (previousCount === undefined) return null;
    if (previousCount === 0) return data.length > 0 ? { text: 'Baru', positive: true } : null;
    const pct = ((data.length - previousCount) / previousCount) * 100;
    return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
  }, [data.length, previousCount]);

  const trendPaths = React.useMemo(() => buildTrendPaths(trend), [trend]);

  return (
    <div className="w-full space-y-5">
      {/* SECTION 1: Capaian & Perkembangan Kerja Sama */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-5 md:p-6 transition-all">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Capaian Kerja Sama POLNEP</h2>
              <p className="text-xs text-slate-500">Statistik dokumen kerja sama • {periodLabel}</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
            Data Terverifikasi
          </span>
        </div>

        {data.length === 0 && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-3 text-xs font-medium text-orange-800">
            <FileText className="h-4 w-4 shrink-0 text-orange-500" />
            Tidak ada dokumen kerja sama yang cocok dengan filter pada periode {periodLabel}.
          </div>
        )}

        {/* 3 Main Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Perkembangan Dokumen (Line Trend Area) */}
          <div className="bg-gradient-to-b from-sky-50/50 to-white p-4 sm:p-5 rounded-xl border border-sky-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Total Dokumen Kerja Sama</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">{data.length}</span>
                  <span className="text-xs text-slate-500 font-medium">berkas</span>
                </div>
              </div>
              {growth && (
                <span
                  title={`${previousCount} dokumen ${comparisonLabel}`}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    growth.positive
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-rose-700 bg-rose-50 border-rose-200'
                  }`}
                >
                  {growth.text} <span className="font-medium opacity-75">{comparisonLabel}</span>
                </span>
              )}
            </div>

            {/* Trend Line Chart (documents per bucket in the active period) */}
            <div className="w-full h-20 my-3 relative">
              {trendPaths ? (
                <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={trendPaths.area} fill="url(#areaGradient)" className="transition-all duration-500" />
                  <path
                    d={trendPaths.line}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-500"
                  />
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-[11px] text-slate-400">Tren tidak tersedia</div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>{periodLabel}</span>
              <span className="text-sky-600 font-semibold flex items-center gap-0.5">
                Berdasarkan Tgl Mulai <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 2: Circular Gauge Capaian Dokumen Aktif */}
          <div className="bg-gradient-to-b from-sky-50/50 to-white p-4 sm:p-5 rounded-xl border border-sky-100 flex flex-col items-center justify-between text-center">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider self-start">
              Capaian Rasio Aktif
            </span>
            
            {/* Donut Gauge Ring */}
            <div className="relative w-28 h-28 my-2 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#E0F2FE"
                  strokeWidth="3.5"
                />
                {/* Active Segment */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="3.5"
                  strokeDasharray={`${statusCounts.activePct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">
                  {statusCounts.activePct}%
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  Status Aktif
                </span>
              </div>
            </div>

            <div className="w-full pt-2 border-t border-slate-100 text-[11px] flex justify-between text-slate-500">
              <span>{statusCounts.active} Berkas Aktif</span>
              <span className="text-sky-600 font-semibold">{statusCounts.expired} Expired</span>
            </div>
          </div>

          {/* Card 3: Mitra Kerja Sama & Kolaborasi */}
          <div className="bg-gradient-to-b from-sky-50/50 to-white p-4 sm:p-5 rounded-xl border border-sky-100 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Mitra Kerja Sama</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">{uniqueMitraCount}</span>
                  <span className="text-xs text-slate-500 font-medium">instansi unik</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className="my-3 p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-bold text-emerald-900 block leading-tight">
                  Kemitraan Strategis Berkelanjutan
                </span>
                <span className="text-[11px] text-emerald-700">
                  Kolaborasi Industri, Pemerintah & Edukasi
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>Mitra Industri & Edukasi</span>
              <span className="text-sky-600 font-semibold">Lihat Rincian &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Status Breakdown & Jenis Dokumen Stacked Bars */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Donut Chart Status (5 cols) */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50/60 rounded-xl border border-slate-100">
            {/* Donut representation */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="16" fill="none" stroke="#E2E8F0" strokeWidth="5"/>
                {/* Active: Deep Blue */}
                <circle
                  cx="21"
                  cy="21"
                  r="16"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="5"
                  strokeDasharray={`${statusCounts.activePct} 100`}
                  strokeDashoffset="0"
                />
                {/* Expired: Warm Orange */}
                <circle
                  cx="21"
                  cy="21"
                  r="16"
                  fill="none"
                  stroke="#F97316"
                  strokeWidth="5"
                  strokeDasharray={`${statusCounts.expiredPct} 100`}
                  strokeDashoffset={`-${statusCounts.activePct}`}
                />
                {/* Unknown: Light Cyan */}
                <circle
                  cx="21"
                  cy="21"
                  r="16"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="5"
                  strokeDasharray={`${statusCounts.unknownPct} 100`}
                  strokeDashoffset={`-${statusCounts.activePct + statusCounts.expiredPct}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-900">{data.length}</span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Dokumen</span>
              </div>
            </div>

            {/* Legend & Details */}
            <div className="space-y-2 text-xs w-full">
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">Status Capaian Dokumen</h3>
              <div 
                onClick={() => onFilterStatus?.('Active')}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-sky-100/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-600 shrink-0"></span>
                  <span className="font-medium text-slate-700">Aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{statusCounts.active}</span>
                  <span className="text-[11px] text-slate-400">({statusCounts.activePct}%)</span>
                </div>
              </div>

              <div 
                onClick={() => onFilterStatus?.('Expired')}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-orange-100/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
                  <span className="font-medium text-slate-700">Expired</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{statusCounts.expired}</span>
                  <span className="text-[11px] text-slate-400">({statusCounts.expiredPct}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0"></span>
                  <span className="font-medium text-slate-700">Dalam Proses / Lainnya</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{statusCounts.unknown}</span>
                  <span className="text-[11px] text-slate-400">({statusCounts.unknownPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stacked Bar Jenis Dokumen (MoU vs PKS) (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Proporsi Berdasarkan Jenis Dokumen Kerja Sama
              </h3>
              <span className="text-xs text-slate-400">MoU • PKS • Perjanjian Kerja Sama</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden flex shadow-inner border border-slate-200/70 p-0.5">
                <div
                  style={{ width: `${jenisCounts.mouPct}%` }}
                  className="bg-sky-600 h-full rounded-l-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                  title={`MoU: ${jenisCounts.mou} (${jenisCounts.mouPct}%)`}
                >
                  {jenisCounts.mouPct > 15 ? `MoU ${jenisCounts.mouPct}%` : ''}
                </div>
                <div
                  style={{ width: `${jenisCounts.pksPct}%` }}
                  className="bg-teal-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                  title={`PKS: ${jenisCounts.pks} (${jenisCounts.pksPct}%)`}
                >
                  {jenisCounts.pksPct > 15 ? `PKS ${jenisCounts.pksPct}%` : ''}
                </div>
                <div
                  style={{ width: `${jenisCounts.lainnyaPct}%` }}
                  className="bg-orange-500 h-full rounded-r-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                  title={`Lainnya: ${jenisCounts.lainnya} (${jenisCounts.lainnyaPct}%)`}
                >
                  {jenisCounts.lainnyaPct > 10 ? `${jenisCounts.lainnyaPct}%` : ''}
                </div>
              </div>

              {/* Progress Bar Footer Labels */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <button 
                  onClick={() => onFilterJenis?.('MOU')}
                  className="flex items-center gap-1.5 hover:text-sky-700 font-medium"
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-600"></span>
                  <span>MoU ({jenisCounts.mou})</span>
                </button>
                <button 
                  onClick={() => onFilterJenis?.('PKS')}
                  className="flex items-center gap-1.5 hover:text-teal-700 font-medium"
                >
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-500"></span>
                  <span>PKS ({jenisCounts.pks})</span>
                </button>
                <div className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
                  <span>Lainnya ({jenisCounts.lainnya})</span>
                </div>
              </div>
            </div>

            {/* Quick Action Badges matching bottom of Section 2 in screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-600 text-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-sky-200" />
                  <span className="text-xs font-bold">Dokumen Kerja Sama Nasional</span>
                </div>
                <span className="text-xs font-mono font-semibold bg-white/20 px-2 py-0.5 rounded-md">
                  POLNEP Kalbar
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-600 text-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-teal-200" />
                  <span className="text-xs font-bold">Jaringan Kerja Sama</span>
                </div>
                <span className="text-xs font-mono font-semibold bg-white/20 px-2 py-0.5 rounded-md">
                  Mitra POLNEP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
