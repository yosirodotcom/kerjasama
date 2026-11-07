'use client';

import React from 'react';
import type { JoinedDokumen } from '@/types';
import { TrendingUp, FileText, MapPin, ChevronRight, ChevronLeft, Layers } from 'lucide-react';
import { parseAppDate } from '@/lib/dateUtils';
import { isBefore } from 'date-fns';

interface StatsOverviewProps {
  data: JoinedDokumen[];
  onFilterStatus?: (status: string) => void;
  onFilterJenis?: (jenis: string) => void;
  onFilterProgram?: (program: string) => void;
  onFilterIku?: (iku: string) => void;
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
  onFilterProgram,
  onFilterIku,
  periodLabel = 'Semua Periode',
  comparisonLabel = '',
  previousCount,
  trend = [],
}: StatsOverviewProps) {
  // Aggregate real-time statistics
  const total = data.length || 1;

  // Proporsi dan jumlah kerja sama yang mendukung IKU (mengacu pada T_kegiatan.iku)
  const ikuStats = React.useMemo(() => {
    const ksList = data.filter((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      return (
        j.includes('PKS') ||
        j.includes('PERJANJIAN KERJA') ||
        j.includes('PSM') ||
        j.includes('KONTRAK')
      );
    });

    const targetList = ksList.length > 0 ? ksList : data;
    const totalKS = targetList.length || 1;

    const countMap: Record<string, number> = {};
    let totalWithIku = 0;
    let nonIkuCount = 0;

    targetList.forEach((d) => {
      const rawIku = (d.iku || '').trim();
      if (!rawIku || rawIku === '-' || rawIku.toLowerCase() === 'non-iku' || rawIku.toLowerCase() === 'nan') {
        nonIkuCount++;
      } else {
        const items = rawIku.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length === 0) {
          nonIkuCount++;
        } else {
          items.forEach((item) => {
            countMap[item] = (countMap[item] || 0) + 1;
          });
          totalWithIku++;
        }
      }
    });

    const colorConfig: Record<string, { stroke: string; dotClass: string }> = {
      'IKU 5': { stroke: '#0284C7', dotClass: 'bg-sky-600' },
      'IKU 9': { stroke: '#7C3AED', dotClass: 'bg-violet-600' },
      'IKU 2': { stroke: '#0D9488', dotClass: 'bg-teal-600' },
      'IKU 1': { stroke: '#EA580C', dotClass: 'bg-orange-600' },
      'IKU 3': { stroke: '#2563EB', dotClass: 'bg-blue-600' },
      'IKU 4': { stroke: '#D97706', dotClass: 'bg-amber-600' },
      'IKU 6': { stroke: '#E11D48', dotClass: 'bg-rose-600' },
      'IKU 7': { stroke: '#4F46E5', dotClass: 'bg-indigo-600' },
      'IKU 8': { stroke: '#059669', dotClass: 'bg-emerald-600' },
    };

    const ikuItems = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => {
        const pctNumber = (count / totalKS) * 100;
        const cfg = colorConfig[name] || { stroke: '#64748B', dotClass: 'bg-slate-500' };
        return {
          name,
          count,
          pct: pctNumber,
          pctFormatted: pctNumber >= 10 ? pctNumber.toFixed(0) : pctNumber.toFixed(1),
          stroke: cfg.stroke,
          dotClass: cfg.dotClass,
        };
      });

    const nonIkuPct = (nonIkuCount / totalKS) * 100;
    const allSlices: {
      name: string;
      count: number;
      pct: number;
      stroke: string;
      dotClass: string;
      offset: number;
    }[] = [];

    let currentOffset = 0;
    ikuItems.forEach((item) => {
      allSlices.push({
        name: item.name,
        count: item.count,
        pct: item.pct,
        stroke: item.stroke,
        dotClass: item.dotClass,
        offset: currentOffset,
      });
      currentOffset += item.pct;
    });

    if (nonIkuCount > 0) {
      allSlices.push({
        name: 'Belum Terpetakan',
        count: nonIkuCount,
        pct: nonIkuPct,
        stroke: '#CBD5E1',
        dotClass: 'bg-slate-300',
        offset: currentOffset,
      });
    }

    const totalIkuPct = Math.round((totalWithIku / totalKS) * 100);

    return {
      totalKS,
      totalWithIku,
      totalIkuPct,
      ikuItems,
      nonIkuCount,
      nonIkuPct: nonIkuPct >= 10 ? nonIkuPct.toFixed(0) : nonIkuPct.toFixed(1),
      allSlices,
    };
  }, [data]);

  // Rasio kerja sama aktif mengacu pada T_kegiatan.tgl_selesai
  const kerjaSamaStatusCounts = React.useMemo(() => {
    const ksList = data.filter((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      return j.includes('PKS') || j.includes('PERJANJIAN KERJA') || j.includes('PSM') || j.includes('KONTRAK');
    });

    const targetList = ksList.length > 0 ? ksList : data;
    const totalKS = targetList.length || 1;

    let active = 0;
    let expired = 0;
    let unknown = 0;

    targetList.forEach((d) => {
      const effectiveEnd = d.tgl_selesai_kegiatan || d.tanggal_berakhir;
      if (!effectiveEnd) {
        unknown++;
        return;
      }
      const parsed = parseAppDate(effectiveEnd);
      if (!parsed) {
        unknown++;
      } else if (isBefore(parsed, new Date())) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: totalKS,
      active,
      expired,
      unknown,
      activePct: Math.round((active / totalKS) * 100),
      expiredPct: Math.round((expired / totalKS) * 100),
    };
  }, [data]);

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

  const detailedDocCounts = React.useMemo(() => {
    let pks = 0;
    let mou = 0;
    let psm = 0;
    let kontrak = 0;
    let lainnya = 0;

    data.forEach((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      if (j.includes('PKS') || j.includes('PERJANJIAN KERJASAMA') || j.includes('PERJANJIAN KERJA SAMA')) pks++;
      else if (j.includes('MOU')) mou++;
      else if (j.includes('PSM')) psm++;
      else if (j.includes('KONTRAK')) kontrak++;
      else lainnya++;
    });

    return { pks, mou, psm, kontrak, lainnya };
  }, [data]);

  const pksFollowUpCount = React.useMemo(() => {
    return data.filter((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      const isPks = j.includes('PKS') || j.includes('PERJANJIAN KERJASAMA') || j.includes('PERJANJIAN KERJA SAMA');
      return isPks && Boolean(d.ref_mou && d.ref_mou.trim());
    }).length;
  }, [data]);

  // Kerja sama implementatif/operasional (PKS, PSM, Kontrak)
  const totalKerjaSama = React.useMemo(() => {
    return detailedDocCounts.pks + detailedDocCounts.psm + detailedDocCounts.kontrak;
  }, [detailedDocCounts]);

  const growth = React.useMemo(() => {
    if (previousCount === undefined) return null;
    if (previousCount === 0) return data.length > 0 ? { text: 'Baru', positive: true } : null;
    const pct = ((data.length - previousCount) / previousCount) * 100;
    return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
  }, [data.length, previousCount]);

  const trendPaths = React.useMemo(() => buildTrendPaths(trend), [trend]);

  // Ranking Kategori Kerja Sama (Top 5 per halaman)
  const [categoryPage, setCategoryPage] = React.useState(0);

  const rankedCategories = React.useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => {
      const j = (d.jenis_dokumen || '').toUpperCase();
      const isKs = j.includes('PKS') || j.includes('PERJANJIAN KERJA') || j.includes('PSM') || j.includes('KONTRAK');
      if (!isKs) return;
      const cat = d.program?.trim() || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
      data.forEach((d) => {
        const cat = d.program?.trim() || 'Lainnya';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const pageSize = 5;
  const totalCategoryPages = Math.ceil(rankedCategories.length / pageSize) || 1;
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages - 1);
  const currentCategories = rankedCategories.slice(
    safeCategoryPage * pageSize,
    (safeCategoryPage + 1) * pageSize
  );
  const maxCategoryCount = rankedCategories[0]?.count || 1;

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
          {/* Card 1: Perkembangan Kerja Sama & Dokumen */}
          <div className="bg-gradient-to-b from-sky-50/50 to-white p-4 sm:p-5 rounded-xl border border-sky-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Total Kerja Sama</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">{totalKerjaSama}</span>
                  <span className="text-xs text-slate-500 font-semibold">kerja sama</span>
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

            {/* Sub-info: Tindak Lanjut MoU & Rincian Dokumen per Jenis */}
            <div className="my-2.5 space-y-2">
              {/* Keterangan Tindak Lanjut MoU */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-50/80 border border-sky-200/60 text-xs">
                <span className="text-slate-600 font-medium">Tindak Lanjut MoU Sebelumnya:</span>
                <span className="font-bold text-sky-800">
                  {pksFollowUpCount} PKS
                </span>
              </div>

              {/* Keterangan Dokumen per Jenis */}
              <div className="pt-1.5 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Total {data.length} Dokumen:</span>
                  <span className="text-[10px] text-slate-400">({totalKerjaSama} Kerja Sama + {detailedDocCounts.mou} MoU{detailedDocCounts.lainnya > 0 ? ` + ${detailedDocCounts.lainnya} Lainnya` : ''})</span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-600">
                  <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold" title="Perjanjian Kerja Sama">PKS: {detailedDocCounts.pks}</span>
                  {detailedDocCounts.psm > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold" title="Perjanjian Swakelola Mitra">PSM: {detailedDocCounts.psm}</span>
                  )}
                  {detailedDocCounts.kontrak > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold" title="Kontrak">Kontrak: {detailedDocCounts.kontrak}</span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-600" title="Nota Kesepahaman (Payung)">MoU: {detailedDocCounts.mou}</span>
                  {detailedDocCounts.lainnya > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-600" title="Rencana Implementasi / Lainnya">Lainnya: {detailedDocCounts.lainnya}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Trend Line Chart (documents per bucket in the active period) */}
            <div className="w-full h-12 my-1 relative">
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

          {/* Card 2: Circular Gauge Capaian Kerja Sama Aktif */}
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
                  strokeDasharray={`${kerjaSamaStatusCounts.activePct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Inner Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">
                  {kerjaSamaStatusCounts.activePct}%
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  Status Aktif
                </span>
              </div>
            </div>

            <div className="w-full pt-2 border-t border-slate-100 text-[11px] flex justify-between text-slate-500">
              <span
                onClick={() => onFilterStatus?.('Active')}
                className="font-medium text-slate-700 cursor-pointer hover:text-sky-700 transition-colors"
                title="Klik untuk filter kerja sama aktif"
              >
                <span className="font-bold text-sky-700">{kerjaSamaStatusCounts.active}</span> Kerja Sama Aktif
              </span>
              <span
                onClick={() => onFilterStatus?.('Expired')}
                className="text-slate-500 font-medium cursor-pointer hover:text-rose-700 transition-colors"
                title="Klik untuk filter kerja sama selesai"
              >
                <span className="font-semibold text-rose-600">{kerjaSamaStatusCounts.expired}</span> Selesai
              </span>
            </div>
          </div>

          {/* Card 3: Top Kategori Kerja Sama Horizontal Bar */}
          <div className="bg-gradient-to-b from-sky-50/50 to-white p-4 sm:p-5 rounded-xl border border-sky-100 flex flex-col justify-between">
            {/* Header: Title and Pagination Next/Prev */}
            <div className="flex items-start justify-between pb-1">
              <div>
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
                  Top Kategori Kerja Sama
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {rankedCategories.length === 0
                    ? '0 Kategori'
                    : `Rank ${safeCategoryPage * pageSize + 1}–${Math.min(
                        (safeCategoryPage + 1) * pageSize,
                        rankedCategories.length
                      )} dari ${rankedCategories.length} Kategori`}
                </span>
              </div>

              {/* Prev / Next Pagination Buttons */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                  disabled={safeCategoryPage === 0}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="5 Kategori Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-slate-600 px-1 select-none">
                  {safeCategoryPage + 1}/{totalCategoryPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCategoryPage((p) =>
                      Math.min(totalCategoryPages - 1, p + 1)
                    )
                  }
                  disabled={safeCategoryPage >= totalCategoryPages - 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="5 Kategori Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Horizontal Bar Chart List */}
            <div className="my-2 space-y-1.5 flex-1 flex flex-col justify-center">
              {currentCategories.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Tidak ada data kategori
                </div>
              ) : (
                currentCategories.map((item, idx) => {
                  const rank = safeCategoryPage * pageSize + idx + 1;
                  const pct = Math.max(
                    8,
                    Math.round((item.count / maxCategoryCount) * 100)
                  );
                  return (
                    <div
                      key={item.name}
                      onClick={() => onFilterProgram?.(item.name)}
                      className="group relative w-full h-7 rounded-lg bg-slate-100/80 overflow-hidden border border-slate-200/60 hover:border-sky-300 transition-all cursor-pointer"
                      title={`Klik untuk filter tabel: ${item.name} (${item.count} kerja sama)`}
                    >
                      {/* Horizontal Bar Fill */}
                      <div
                        className="h-full bg-gradient-to-r from-sky-200 via-sky-100 to-sky-50 border-r-2 border-sky-500 group-hover:from-sky-300 group-hover:via-sky-200 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />

                      {/* Text content inside the bar */}
                      <div className="absolute inset-0 px-2.5 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="text-[10px] font-extrabold text-sky-900 shrink-0">
                            #{rank}
                          </span>
                          <span
                            className="truncate font-semibold text-slate-800 text-[11px]"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 shrink-0">
                          {item.count}{' '}
                          <span className="font-normal text-[10px] text-slate-500">
                            KS
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-sky-600 font-medium">
                Klik bar untuk filter tabel
              </span>
              <span className="font-semibold text-slate-600">
                {rankedCategories.reduce((acc, c) => acc + c.count, 0)} Kerja Sama
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Status Breakdown & Jenis Dokumen Stacked Bars */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Donut Chart IKU (5 cols) */}
          <div className="lg:col-span-5 flex flex-col p-4 bg-slate-50/60 rounded-xl border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Dukungan IKU Kerja Sama
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Indikator Kinerja Utama
                </p>
              </div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {ikuStats.totalWithIku} / {ikuStats.totalKS} KS ({ikuStats.totalIkuPct}%)
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* Donut representation */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="16" fill="none" stroke="#F1F5F9" strokeWidth="5" />
                  {ikuStats.allSlices.map((slice) => (
                    <circle
                      key={slice.name}
                      cx="21"
                      cy="21"
                      r="16"
                      pathLength={100}
                      fill="none"
                      stroke={slice.stroke}
                      strokeWidth="5"
                      strokeDasharray={`${slice.pct} 100`}
                      strokeDashoffset={-slice.offset}
                      className="transition-all duration-500"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900 leading-none">
                    {ikuStats.totalWithIku}
                  </span>
                  <span className="text-[9px] text-sky-700 font-bold uppercase tracking-tight mt-0.5">
                    Mendukung IKU
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {ikuStats.totalIkuPct}% KS
                  </span>
                </div>
              </div>

              {/* Legend & Details: Proporsi diikuti jumlah kerja sama */}
              <div className="space-y-1.5 text-xs w-full">
                {ikuStats.ikuItems.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => onFilterIku?.(item.name)}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-sky-50/80 transition-colors cursor-pointer group"
                    title={`Klik untuk filter tabel: ${item.name} (${item.count} kerja sama)`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.dotClass} shrink-0`} />
                      <span className="font-semibold text-slate-700 group-hover:text-sky-700 transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-slate-900">
                        {item.pctFormatted}%
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({item.count} Kerja Sama)
                      </span>
                    </div>
                  </div>
                ))}

                {/* Non-IKU / Belum Terpetakan */}
                <div
                  onClick={() => onFilterIku?.('')}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100/80 transition-colors cursor-pointer group"
                  title={`Klik untuk reset filter IKU: Belum Terpetakan (${ikuStats.nonIkuCount} kerja sama)`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
                      Belum Terpetakan
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-slate-700">
                      {ikuStats.nonIkuPct}%
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({ikuStats.nonIkuCount} Kerja Sama)
                    </span>
                  </div>
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
