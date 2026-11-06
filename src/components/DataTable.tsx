'use client';

import React, { useState, useMemo } from 'react';
import type { JoinedDokumen, MitraInfo } from '@/types';
import { 
  Search, Eye, Download, 
  RefreshCw, FolderDown,
  BarChart3, FilterX
} from 'lucide-react';
import HeaderBanner from './dashboard/HeaderBanner';
import StatsOverview from './dashboard/StatsOverview';
import StatsFilterBar from './dashboard/StatsFilterBar';
import ZipProgressModal from './ui/ZipProgressModal';
import MitraDetailModal from './tables/MitraDetailModal';
import MainCooperationTable, { COLUMNS } from './tables/MainCooperationTable';
import { checkStatus, parseDateForSort, formatDisplayDate } from '@/lib/dateUtils';
import { getCellValue } from '@/lib/tableUtils';
import { exportToExcel } from '@/lib/exportExcel';
import { downloadDocumentsAsZip } from '@/lib/zipDownload';
import type { StatsFilter, ZipDownloadState } from '@/types';
import {
  getDefaultStatsFilter, applyStatsFilter, applyPreviousStatsFilter, getJurusanOptions, getProdiGroups,
  applyPeriodAndWilayah, countByMultiField, getPeriodLabel, getComparisonLabel, getTrendSeries,
} from '@/lib/statsFilter';

interface DataTableProps {
  data: JoinedDokumen[];
}



export default function DataTable({ data }: DataTableProps) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'tanggal_penetapan', direction: 'desc' });
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [selectedMitra, setSelectedMitra] = useState<MitraInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Dashboard & Filter states
  const [showStats, setShowStats] = useState(true);
  const [activePillFilter, setActivePillFilter] = useState('Semua');
  // Stats-card-only filter (independent from table filters)
  const [statsFilter, setStatsFilter] = useState<StatsFilter>(getDefaultStatsFilter);

  // ZIP Download State

  const [zipState, setZipState] = useState<ZipDownloadState>({
    isOpen: false,
    total: 0,
    current: 0,
    currentName: '',
    stage: 'preparing',
    successCount: 0,
    failedCount: 0,
  });

  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelZip = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setZipState(prev => ({ ...prev, isOpen: false, stage: 'error', errorMessage: 'Pengunduhan dibatalkan.' }));
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Sinkronisasi gagal');
      }
      setSyncMessage({ text: 'Data berhasil disinkronkan dari Google Sheets! Memuat ulang...', type: 'success' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setSyncMessage({ text: (err instanceof Error && err.message) || 'Terjadi kesalahan saat sinkronisasi', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleCol = (key: string) => {
    const next = new Set(visibleCols);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setVisibleCols(next);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pill filter handler from Header
  const handlePillFilter = (pill: string) => {
    setActivePillFilter(pill);
    if (pill === 'Semua') {
      setColFilters(prev => {
        const next = { ...prev };
        delete next.wilayah_kerjasama;
        delete next.jenis_dokumen;
        delete next.status;
        return next;
      });
    } else if (pill === 'Nasional' || pill === 'Internasional') {
      setColFilters(prev => ({ ...prev, wilayah_kerjasama: pill }));
    } else if (pill === 'MOU' || pill === 'PKS') {
      setColFilters(prev => ({ ...prev, jenis_dokumen: pill }));
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setGlobalSearch('');
    setColFilters({});
    setActivePillFilter('Semua');
    setCurrentPage(1);
  };

  const enrichedData = useMemo(() => {
    return data.map((row, idx) => ({
      ...row,
      no: idx + 1,
      status: checkStatus(row.tanggal_berakhir)
    }));
  }, [data]);

  // Statistics filter derived data (does not affect the table below)
  const jurusanOptions = useMemo(() => getJurusanOptions(data), [data]);
  const prodiGroups = useMemo(() => getProdiGroups(data, statsFilter.jurusan), [data, statsFilter.jurusan]);
  const statsOptionBase = useMemo(() => applyPeriodAndWilayah(enrichedData, statsFilter), [enrichedData, statsFilter]);
  const jurusanCounts = useMemo(() => countByMultiField(statsOptionBase, 'jurusan'), [statsOptionBase]);
  const prodiCounts = useMemo(() => countByMultiField(statsOptionBase, 'prodi'), [statsOptionBase]);
  const statsData = useMemo(() => applyStatsFilter(enrichedData, statsFilter), [enrichedData, statsFilter]);
  const statsPreviousCount = useMemo(
    () => applyPreviousStatsFilter(enrichedData, statsFilter).length,
    [enrichedData, statsFilter]
  );
  const statsTrend = useMemo(() => getTrendSeries(statsData, statsFilter), [statsData, statsFilter]);

  const filteredData = useMemo(() => {
    const result = statsData.filter(d => {
      const matchGlobal = !globalSearch || 
        Object.values(d).some(val => String(val).toLowerCase().includes(globalSearch.toLowerCase())) || 
        d.mitras.some(m => m.nama.toLowerCase().includes(globalSearch.toLowerCase()));
      
      if (!matchGlobal) return false;

      for (const [key, value] of Object.entries(colFilters)) {
        if (!value) continue;
        if (key === 'mitra') {
          const matchMitra = d.mitras.some(m => m.nama.toLowerCase().includes(value.toLowerCase()));
          if (!matchMitra) return false;
        } else if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(key)) {
          const cellValue = getCellValue(d, key);
          const filterValue = value.trim();
          const cellDate = parseDateForSort(cellValue);
          const filterDate = parseDateForSort(filterValue);

          if (filterValue.length === 10 && filterDate > 0) {
            if (key === 'tanggal_mulai') {
              if (cellDate < filterDate) return false;
            } else if (key === 'tanggal_berakhir') {
              const effectiveCellDate = cellDate === 0 ? new Date().getTime() : cellDate;
              if (effectiveCellDate > filterDate) return false;
            } else {
              const displayDate = formatDisplayDate(cellValue);
              if (!cellValue.toLowerCase().includes(filterValue.toLowerCase()) &&
                  !displayDate.toLowerCase().includes(filterValue.toLowerCase())) return false;
            }
          } else {
            const displayDate = formatDisplayDate(cellValue);
            if (!cellValue.toLowerCase().includes(filterValue.toLowerCase()) &&
                !displayDate.toLowerCase().includes(filterValue.toLowerCase())) return false;
          }
        } else {
          const cellValue = getCellValue(d, key).toLowerCase();
          if (!cellValue.includes(value.toLowerCase())) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: string | number = getCellValue(a, key);
      let valB: string | number = getCellValue(b, key);

      if (key === 'mitra') {
        valA = a.mitras.map(m => m.nama).join(', ');
        valB = b.mitras.map(m => m.nama).join(', ');
      }

      if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(key)) {
        valA = parseDateForSort(valA);
        valB = parseDateForSort(valB);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [statsData, globalSearch, colFilters, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when the current page no longer exists (adjust state during render).
  if (currentPage > totalPages) {
    setCurrentPage(1);
  }

  const handleDownloadAllZip = async () => {
    const itemsToDownload = filteredData.filter(d => Boolean(d.link_dokumen && d.link_dokumen.trim()));
    if (itemsToDownload.length === 0) {
      alert('Tidak ada dokumen dengan tautan file pada hasil filter saat ini.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setZipState({
      isOpen: true,
      total: itemsToDownload.length,
      current: 0,
      currentName: 'Menyiapkan berkas...',
      stage: 'preparing',
      successCount: 0,
      failedCount: 0,
    });

    await downloadDocumentsAsZip(itemsToDownload, controller.signal, patch =>
      setZipState(prev => ({ ...prev, ...patch }))
    );
  };

  const handleExport = () =>
    exportToExcel(filteredData, COLUMNS.filter(col => visibleCols.has(col.key) && col.key !== 'id'));

  const hasActiveFilters = Boolean(globalSearch || Object.values(colFilters).some(Boolean) || activePillFilter !== 'Semua');

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#F4F9FD] text-slate-800 font-sans selection:bg-sky-500/20">
      {/* Top Header Banner matching SDGs screenshot */}
      <HeaderBanner 
        activePillFilter={activePillFilter}
        onSelectPillFilter={handlePillFilter}
      />

      {/* Main Page Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 flex flex-col">
        {/* Sync message alert banner */}
        {syncMessage && (
          <div className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-xs transition-all ${
            syncMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span>{syncMessage.text}</span>
            <button onClick={() => setSyncMessage(null)} className="ml-3 hover:opacity-75 font-bold text-sm">✕</button>
          </div>
        )}

        {/* SECTION: SDGs Analytics & Progress Charts (matching screenshot) */}
        {showStats && (
          <>
          <StatsFilterBar
            filter={statsFilter}
            onChange={(nextFilter) => {
              setStatsFilter(nextFilter);
              setColFilters({});
              setCurrentPage(1);
            }}
            jurusanOptions={jurusanOptions}
            prodiGroups={prodiGroups}
            jurusanCounts={jurusanCounts}
            prodiCounts={prodiCounts}
            resultCount={statsData.length}
          />
          <StatsOverview
            data={statsData}
            periodLabel={getPeriodLabel(statsFilter)}
            comparisonLabel={getComparisonLabel(statsFilter)}
            previousCount={statsPreviousCount}
            trend={statsTrend}
            onFilterStatus={(status) => {
              setColFilters(prev => ({ ...prev, status }));
              setCurrentPage(1);
            }}
            onFilterJenis={(jenis) => {
              setColFilters(prev => ({ ...prev, jenis_dokumen: jenis }));
              setCurrentPage(1);
            }}
          />
          </>
        )}

        {/* SECTION: Toolbar Controls Card */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Filter Badges info */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  Tabel Data Dokumen Kerja Sama
                </h2>
                <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                  {filteredData.length} Dokumen
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Data interaktif dokumen kerja sama dapat disortir, disaring, dan diatur visibilitas kolomnya secara dinamis.
              </p>
            </div>

            {/* Quick Actions & Search Toolbar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Cari Cepat (Semua Baris)..." 
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-slate-50/60 text-slate-800 placeholder-slate-400 font-medium"
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                />
              </div>

              {/* Toggle Stats Overview Button */}
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3.5 py-2 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                title={showStats ? 'Sembunyikan grafik statistik' : 'Tampilkan grafik statistik'}
              >
                <BarChart3 className="w-4 h-4 text-sky-600" />
                <span>{showStats ? 'Sembunyikan Statistik' : 'Lihat Statistik Kerja Sama'}</span>
              </button>

              {/* Sync Google Sheets Button */}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs shadow-sky-600/20"
                title="Tarik data terbaru dari Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sync Data'}</span>
              </button>

              {/* Export Excel Button */}
              <button 
                onClick={handleExport}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" /> 
                <span>Excel</span>
              </button>

              {/* Download ZIP Button */}
              <button 
                onClick={handleDownloadAllZip}
                disabled={zipState.isOpen && zipState.stage !== 'completed' && zipState.stage !== 'error'}
                className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs shadow-orange-500/20"
                title="Unduh seluruh file dokumen hasil filter saat ini dalam format ZIP"
              >
                <FolderDown className="w-4 h-4" /> 
                <span>ZIP Dokumen</span>
              </button>

              {/* Column Selection Dropdown */}
              <div className="relative">
                <button 
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  onClick={() => setShowColMenu(!showColMenu)}
                >
                  <Eye className="w-4 h-4 text-sky-600" /> 
                  <span>Pilih Kolom</span>
                </button>

                {showColMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5 grid grid-cols-1 gap-1 max-h-96 overflow-y-auto custom-scrollbar">
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      Visibilitas Kolom
                    </div>
                    {COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-sky-50/70 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          checked={visibleCols.has(c.key)}
                          onChange={() => toggleCol(c.key)}
                        />
                        <span className="text-xs font-medium text-slate-700">{c.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Chips / Reset */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-semibold">Filter Aktif:</span>
                {globalSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                    Pencarian: &quot;{globalSearch}&quot;
                    <button onClick={() => setGlobalSearch('')} className="hover:text-sky-900 font-bold ml-1">✕</button>
                  </span>
                )}
                {Object.entries(colFilters).map(([k, v]) => v ? (
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                    {k}: &quot;{v}&quot;
                    <button onClick={() => setColFilters(prev => { const n = {...prev}; delete n[k]; return n; })} className="hover:text-sky-900 font-bold ml-1">✕</button>
                  </span>
                ) : null)}
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
              >
                <FilterX className="w-3.5 h-3.5" />
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>

        {/* SECTION: Data Table Card */}
        <MainCooperationTable
          columns={COLUMNS}
          visibleCols={visibleCols}
          sortConfig={sortConfig}
          onSort={handleSort}
          colFilters={colFilters}
          onColFilterChange={(key, value) => setColFilters(prev => ({ ...prev, [key]: value }))}
          enrichedData={statsData}
          paginatedData={paginatedData}
          totalFilteredCount={filteredData.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          onSelectMitra={setSelectedMitra}
          onResetFilters={handleResetFilters}
        />
      </main>

      {/* MODAL 1: Mitra Detail Modal (SDGs Theme Clean White & Sky) */}
      <MitraDetailModal
        mitra={selectedMitra}
        onClose={() => setSelectedMitra(null)}
      />

      {/* MODAL 2: ZIP Download Progress Modal (SDGs Theme) */}
      <ZipProgressModal
        state={zipState}
        onCancel={handleCancelZip}
        onClose={() => setZipState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
