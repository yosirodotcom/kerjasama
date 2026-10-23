'use client';

import React, { useState, useMemo } from 'react';
import { JoinedDokumen, MitraInfo } from '@/lib/data';
import { 
  Search, ChevronDown, ChevronUp, Eye, CheckCircle, XCircle, Info, 
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, 
  RefreshCw, FolderDown, FileArchive, Loader2, AlertCircle, PackageCheck,
  BarChart3, FilterX, ExternalLink, Sparkles
} from 'lucide-react';
import { isBefore, parse, isValid, format } from 'date-fns';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import HeaderBanner from './dashboard/HeaderBanner';
import StatsOverview from './dashboard/StatsOverview';
import StatsFilterBar from './dashboard/StatsFilterBar';
import { SDGS_THEME, getStatusStyle } from '@/lib/theme';
import type { StatsFilter } from '@/types';
import {
  getDefaultStatsFilter, applyStatsFilter, applyPreviousStatsFilter, getJurusanOptions, getProdiGroups,
  applyPeriodAndWilayah, countByMultiField, getPeriodLabel, getComparisonLabel, getTrendSeries,
} from '@/lib/statsFilter';

interface DataTableProps {
  data: JoinedDokumen[];
}

type Column = {
  key: string;
  label: string;
  defaultVisible: boolean;
  type?: 'text' | 'date' | 'category' | 'mitra' | 'status';
};

const COLUMNS: Column[] = [
  { key: 'no', label: 'No.', defaultVisible: true, type: 'text' },
  { key: 'id', label: 'ID Dokumen', defaultVisible: false, type: 'text' },
  { key: 'jenis_dokumen', label: 'Jenis Dokumen', defaultVisible: true, type: 'category' },
  { key: 'nomor_dokumen', label: 'Nomor Dokumen', defaultVisible: true, type: 'text' },
  { key: 'tentang', label: 'Tentang', defaultVisible: true, type: 'text' },
  { key: 'tanggal_penetapan', label: 'Tgl Penetapan', defaultVisible: false, type: 'date' },
  { key: 'tanggal_mulai', label: 'Tgl Mulai', defaultVisible: true, type: 'date' },
  { key: 'tanggal_berakhir', label: 'Tgl Berakhir', defaultVisible: true, type: 'date' },
  { key: 'deskripsi', label: 'Deskripsi', defaultVisible: false, type: 'text' },
  { key: 'mitra', label: 'Mitra', defaultVisible: true, type: 'mitra' },
  { key: 'status', label: 'Status', defaultVisible: true, type: 'status' },
  
  // Hidden default
  { key: 'ref_mou', label: 'Ref MoU', defaultVisible: false, type: 'text' },
  { key: 'nama_penandatangan', label: 'Penandatangan', defaultVisible: false, type: 'text' },
  { key: 'jabatan_penandatangan', label: 'Jabatan Penandatangan', defaultVisible: false, type: 'text' },
  { key: 'program', label: 'Program', defaultVisible: false, type: 'text' },
  { key: 'wilayah_kerjasama', label: 'Wilayah', defaultVisible: true, type: 'category' },
  { key: 'judul_dokumen', label: 'Judul Dokumen', defaultVisible: false, type: 'text' },
  { key: 'nama_inisiator', label: 'Inisiator', defaultVisible: false, type: 'text' },
  { key: 'inisiasi', label: 'Inisiasi', defaultVisible: false, type: 'category' },
  { key: 'unit_pengaju', label: 'Unit Pengaju', defaultVisible: false, type: 'text' },
  { key: 'pic_unit_pengaju', label: 'PIC Unit Pengaju', defaultVisible: false, type: 'text' },
  { key: 'kampus', label: 'Kampus', defaultVisible: false, type: 'text' },
  { key: 'jurusan', label: 'Jurusan', defaultVisible: false, type: 'text' },
  { key: 'prodi', label: 'Prodi', defaultVisible: false, type: 'text' },
  { key: 'rektorat', label: 'Rektorat', defaultVisible: false, type: 'text' },
];

export const parseAppDate = (dStr: string | null | undefined): Date | null => {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (!s) return null;

  // 1. ISO standard yyyy-MM-dd
  let parsed = parse(s, 'yyyy-MM-dd', new Date());
  if (isValid(parsed)) return parsed;

  // 2. Indonesian formats (Day first)
  parsed = parse(s, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  parsed = parse(s, 'd/M/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  parsed = parse(s, 'dd-MM-yyyy', new Date());
  if (isValid(parsed)) return parsed;

  parsed = parse(s, 'd-M-yyyy', new Date());
  if (isValid(parsed)) return parsed;

  // 3. Fallback US formats (Month first)
  parsed = parse(s, 'MM/dd/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  parsed = parse(s, 'M/d/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  const native = new Date(s);
  if (isValid(native)) return native;

  return null;
};

export const formatDisplayDate = (dStr: string | null | undefined): string => {
  if (!dStr) return '-';
  const parsed = parseAppDate(dStr);
  if (!parsed) return dStr;
  return format(parsed, 'dd/MM/yyyy');
};

const checkStatus = (tgl_berakhir: string) => {
  if (!tgl_berakhir) return 'Unknown';
  try {
    const parsed = parseAppDate(tgl_berakhir);
    if (!parsed) return 'Unknown';

    const isExpired = isBefore(parsed, new Date());
    return isExpired ? 'Expired' : 'Active';
  } catch {
    return 'Unknown';
  }
};

const parseDateForSort = (dStr: string) => {
  if (!dStr) return 0;
  const parsed = parseAppDate(dStr);
  return parsed ? parsed.getTime() : 0;
};

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
  interface ZipDownloadState {
    isOpen: boolean;
    total: number;
    current: number;
    currentName: string;
    stage: 'preparing' | 'downloading' | 'zipping' | 'completed' | 'error';
    errorMessage?: string;
    successCount: number;
    failedCount: number;
  }

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

    const zip = new JSZip();
    const usedFileNames = new Set<string>();
    const sanitize = (str: string) => str.replace(/[/\\?%*:|"<>]/g, '_').trim();

    let successCount = 0;
    let failedCount = 0;
    const concurrency = 3;
    let index = 0;

    const downloadWorker = async () => {
      while (index < itemsToDownload.length) {
        if (controller.signal.aborted) break;
        const currentIndex = index++;
        const item = itemsToDownload[currentIndex];

        setZipState(prev => ({
          ...prev,
          current: currentIndex + 1,
          currentName: item.nomor_dokumen || item.mitras[0]?.nama || `Dokumen ${currentIndex + 1}`,
          stage: 'downloading',
        }));

        try {
          const res = await fetch(`/api/download-proxy?url=${encodeURIComponent(item.link_dokumen || '')}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          let fileName = '';
          const headerName = res.headers.get('X-File-Name');
          if (headerName) {
            fileName = decodeURIComponent(headerName);
          }

          if (!fileName) {
            const rawNo = item.nomor_dokumen ? sanitize(item.nomor_dokumen) : `doc_${currentIndex + 1}`;
            const mitraName = item.mitras[0]?.nama ? `_${sanitize(item.mitras[0].nama).slice(0, 30)}` : '';
            fileName = `${rawNo}${mitraName}.pdf`;
          }

          let finalName = fileName;
          let counter = 1;
          const extIndex = fileName.lastIndexOf('.');
          const base = extIndex > 0 ? fileName.slice(0, extIndex) : fileName;
          const ext = extIndex > 0 ? fileName.slice(extIndex) : '.pdf';

          while (usedFileNames.has(finalName.toLowerCase())) {
            counter++;
            finalName = `${base} (${counter})${ext}`;
          }
          usedFileNames.add(finalName.toLowerCase());

          const arrayBuf = await res.arrayBuffer();
          zip.file(finalName, arrayBuf);
          successCount++;
        } catch (err: any) {
          if (controller.signal.aborted) return;
          console.error(`Gagal mengunduh dokumen ${item.nomor_dokumen}:`, err);
          failedCount++;
          const fallbackName = `CATATAN_GAGAL_${sanitize(item.nomor_dokumen || `doc_${currentIndex + 1}`)}.txt`;
          zip.file(fallbackName, `Dokumen tidak dapat diunduh otomatis:\nNomor Dokumen: ${item.nomor_dokumen || '-'}\nTautan: ${item.link_dokumen}\nError: ${err.message || 'Unknown'}`);
        }

        setZipState(prev => ({
          ...prev,
          successCount,
          failedCount,
        }));
      }
    };

    try {
      const workers = Array.from({ length: Math.min(concurrency, itemsToDownload.length) }, () => downloadWorker());
      await Promise.all(workers);

      if (controller.signal.aborted) return;

      if (successCount === 0 && failedCount > 0) {
        throw new Error('Semua dokumen gagal diunduh dari tautan Google Drive.');
      }

      setZipState(prev => ({ ...prev, stage: 'zipping', currentName: 'Mengompresi ke berkas ZIP...' }));

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }
      );

      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      saveAs(zipBlob, `dokumen_kerja_sama_${timestamp}.zip`);

      setZipState(prev => ({
        ...prev,
        stage: 'completed',
        currentName: `Selesai! Berhasil mengemas ${successCount} dokumen.`,
      }));
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setZipState(prev => ({
        ...prev,
        stage: 'error',
        errorMessage: err.message || 'Terjadi kesalahan saat mengunduh dokumen.',
      }));
    }
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
    } catch (err: any) {
      setSyncMessage({ text: err.message || 'Terjadi kesalahan saat sinkronisasi', type: 'error' });
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

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Kerja Sama POLNEP');

    // Filter columns based on visibility
    const columnsToExport = COLUMNS.filter(col => visibleCols.has(col.key) && col.key !== 'id');

    // Define columns for ExcelJS
    worksheet.columns = columnsToExport.map(col => ({
      header: col.label,
      key: col.key,
      width: col.key === 'tentang' || col.key === 'deskripsi' || col.key === 'judul_dokumen' ? 50 : 20
    }));

    // Style the header matching SDGs Indonesia Cerulean Primary Theme
    const headerRow = worksheet.getRow(1);
    columnsToExport.forEach((_, colIndex) => {
      const cell = headerRow.getCell(colIndex + 1);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' } // Sky-600 (SDGs Primary Blue)
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0369A1' } },
        left: { style: 'thin', color: { argb: 'FF0369A1' } },
        bottom: { style: 'thin', color: { argb: 'FF0369A1' } },
        right: { style: 'thin', color: { argb: 'FF0369A1' } }
      };
    });

    // Add data rows
    filteredData.forEach((row, index) => {
      const rowValues: any = {};
      columnsToExport.forEach(col => {
        if (col.key === 'no') {
          rowValues[col.key] = index + 1;
        } else if (col.key === 'mitra') {
          rowValues[col.key] = row.mitras.map(m => m.nama).join(', ');
        } else if (col.key === 'status') {
          rowValues[col.key] = row.status;
        } else if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(col.key)) {
          const dStr = (row as any)[col.key];
          if (dStr) {
            const parsed = parseAppDate(dStr);
            if (parsed) {
              const tzOffset = parsed.getTimezoneOffset() * 60000;
              rowValues[col.key] = new Date(parsed.getTime() - tzOffset);
            } else {
              rowValues[col.key] = dStr;
            }
          } else {
            rowValues[col.key] = '';
          }
        } else {
          rowValues[col.key] = (row as any)[col.key] || '';
        }
      });
      const addedRow = worksheet.addRow(rowValues);
      
      // Soft sky-50 zebra striping
      if (index % 2 === 1) {
        addedRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F9FF' } // Sky-50
        };
      }

      // Border, alignment and Hyperlinks
      addedRow.eachCell((cell, colNumber) => {
        const colKey = columnsToExport[colNumber - 1].key;
        
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        cell.alignment = { vertical: 'middle', wrapText: true };

        // Apply Hyperlink to Nomor Dokumen
        if (colKey === 'nomor_dokumen' && row.link_dokumen) {
          cell.value = {
            text: row.nomor_dokumen || 'Link',
            hyperlink: row.link_dokumen,
            tooltip: 'Klik untuk membuka dokumen'
          };
          cell.font = { color: { argb: 'FF0284C7' }, underline: true };
        }

        // Apply Date Format
        if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(colKey)) {
          cell.numFmt = 'dd/mm/yyyy';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    // Write and save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `data_kerja_sama_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          const cellValue = String((d as any)[key] || '');
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
          const cellValue = String((d as any)[key] || '').toLowerCase();
          if (!cellValue.includes(value.toLowerCase())) return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      let valA: any = (a as any)[key];
      let valB: any = (b as any)[key];

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

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [filteredData.length, currentPage, totalPages]);

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
        <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              {/* Table Header with clean SDGs sky styling */}
              <thead className="bg-sky-50/90 sticky top-0 z-20 border-b border-sky-200/80 shadow-xs backdrop-blur-xs">
                <tr>
                  {COLUMNS.map(c => visibleCols.has(c.key) && (
                    <th 
                      key={c.key} 
                      className="p-3 font-bold text-sky-950 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-sky-100/70 transition-colors select-none border-b border-sky-200/80"
                      onClick={() => handleSort(c.key)}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <span>{c.label}</span>
                        <div className="flex flex-col">
                          {sortConfig.key === c.key ? (
                            sortConfig.direction === 'asc' 
                              ? <ArrowUp className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" /> 
                              : <ArrowDown className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Secondary row for per-column filtering */}
                <tr className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-[41px] z-10">
                  {COLUMNS.map(c => visibleCols.has(c.key) && (
                    <th key={`filter-${c.key}`} className="p-2 border-r border-slate-100 last:border-r-0">
                      {c.type === 'category' || c.type === 'status' ? (
                        <select 
                          className="w-full p-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-normal"
                          value={colFilters[c.key] || ''}
                          onChange={(e) => setColFilters(prev => ({...prev, [c.key]: e.target.value}))}
                        >
                          <option value="">Semua</option>
                          {Array.from(new Set(enrichedData.map(d => String((d as any)[c.key] || '')))).filter(Boolean).map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          placeholder={c.type === 'date' ? 'dd/mm/yyyy...' : 'Filter...'} 
                          className="w-full p-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-normal placeholder-slate-400"
                          value={colFilters[c.key] || ''}
                          onChange={(e) => setColFilters(prev => ({...prev, [c.key]: e.target.value}))}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body with clean zebra styling */}
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedData.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-sky-50/50 transition-colors group">
                    {COLUMNS.map(c => {
                      if (!visibleCols.has(c.key)) return null;

                      let content: React.ReactNode = (row as any)[c.key];

                      if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(c.key)) {
                        content = formatDisplayDate((row as any)[c.key]);
                      }

                      if (c.key === 'nomor_dokumen') {
                        content = row.link_dokumen ? (
                          <a 
                            href={row.link_dokumen} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sky-600 font-semibold hover:text-sky-800 underline flex items-center gap-1 w-max"
                          >
                            {row.nomor_dokumen || 'Buka Dokumen'}
                            <ExternalLink className="w-3 h-3 text-sky-400 inline" />
                          </a>
                        ) : (row.nomor_dokumen || '-');
                      }

                      if (c.key === 'ref_mou') {
                        content = row.ref_mou ? (
                          <a 
                            href={row.link_dokumen || '#'} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-sky-600 font-semibold hover:text-sky-800 underline"
                          >
                            {row.ref_mou}
                          </a>
                        ) : '-';
                      }

                      if (c.key === 'mitra') {
                        content = (
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {row.mitras.map((m, i) => (
                              <button 
                                key={i} 
                                onClick={() => setSelectedMitra(m)}
                                className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-sky-50 hover:text-sky-800 hover:border-sky-300 transition-colors border border-slate-200 shadow-2xs text-left"
                              >
                                <span>{m.nama}</span>
                                <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              </button>
                            ))}
                          </div>
                        );
                      }

                      if (c.key === 'status') {
                        const style = getStatusStyle(row.status);
                        content = (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                        );
                      }

                      const isTextHeavy = ['tentang', 'deskripsi', 'judul_dokumen'].includes(c.key);
                      
                      return (
                        <td key={c.key} className={`p-3 text-xs sm:text-sm text-slate-700 ${isTextHeavy ? 'min-w-[250px] max-w-[400px] whitespace-normal break-words leading-relaxed' : 'whitespace-nowrap'}`}>
                          {content || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-12 text-center text-slate-400 bg-white">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-10 h-10 text-slate-300" />
                        <p className="text-base font-semibold text-slate-600">Tidak ada dokumen yang sesuai dengan filter.</p>
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold hover:bg-sky-100 transition-colors"
                        >
                          Reset Pencarian
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
            <div>
              Menampilkan <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-bold text-slate-800">{filteredData.length}</span> data
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select 
                  className="border border-slate-300 bg-white rounded-lg text-xs sm:text-sm p-1.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris</span>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 px-3">
                  Hal {currentPage} dari {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: Mitra Detail Modal (SDGs Theme Clean White & Sky) */}
      {selectedMitra && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-sky-100 flex justify-between items-start bg-gradient-to-r from-sky-50/80 to-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedMitra.nama}</h3>
                <p className="text-sky-700 font-semibold text-xs mt-1 bg-sky-100/60 inline-block px-2 py-0.5 rounded-md">
                  {selectedMitra.kategori || 'Kategori Umum'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMitra(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {selectedMitra.logo && (
                <div className="flex flex-col items-center justify-center mb-4">
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner p-2">
                    <img 
                      src={`/${selectedMitra.logo}`} 
                      alt={`Logo ${selectedMitra.nama}`} 
                      className="w-full h-full object-contain" 
                      onError={(e) => { 
                        e.currentTarget.style.display = 'none'; 
                        e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-slate-400 text-center font-medium">No Image</span>'; 
                      }} 
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200/80 shadow-2xs">
                  <p className="text-[10px] text-sky-800 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-600"/> Penandatangan Mitra
                  </p>
                  <p className="font-bold text-slate-900 text-sm mb-1">{selectedMitra.penandatangan_mitra || '-'}</p>
                  {(selectedMitra.penandatangan_mitra_telepon || selectedMitra.penandatangan_mitra_email) && (
                    <div className="mt-1.5 pt-1.5 border-t border-sky-200/60 text-xs text-sky-900 space-y-1">
                      {selectedMitra.penandatangan_mitra_telepon && <p className="flex items-center gap-1.5">📞 {selectedMitra.penandatangan_mitra_telepon}</p>}
                      {selectedMitra.penandatangan_mitra_email && <p className="flex items-center gap-1.5 break-all">✉️ {selectedMitra.penandatangan_mitra_email}</p>}
                    </div>
                  )}
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Info className="w-3 h-3 text-emerald-600"/> PIC Mitra
                  </p>
                  <p className="font-bold text-slate-900 text-sm mb-1">{selectedMitra.pic_mitra || '-'}</p>
                  {(selectedMitra.pic_mitra_telepon || selectedMitra.pic_mitra_email) && (
                    <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 text-xs text-emerald-900 space-y-1">
                      {selectedMitra.pic_mitra_telepon && <p className="flex items-center gap-1.5">📞 {selectedMitra.pic_mitra_telepon}</p>}
                      {selectedMitra.pic_mitra_email && <p className="flex items-center gap-1.5 break-all">✉️ {selectedMitra.pic_mitra_email}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Informasi Kontak & Alamat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  {selectedMitra.email_mitra && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Mitra</p>
                      <p className="text-slate-800 font-medium break-all">{selectedMitra.email_mitra}</p>
                    </div>
                  )}
                  {selectedMitra.telepon_mitra && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telepon Mitra</p>
                      <p className="text-slate-800 font-medium">{selectedMitra.telepon_mitra}</p>
                    </div>
                  )}
                  {selectedMitra.website_mitra && (
                    <div className="md:col-span-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Website Resmi</p>
                      <a 
                        href={selectedMitra.website_mitra.startsWith('http') ? selectedMitra.website_mitra : `https://${selectedMitra.website_mitra}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sky-600 font-semibold hover:underline break-all flex items-center gap-1 mt-0.5"
                      >
                        {selectedMitra.website_mitra}
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </div>
                  )}
                  {selectedMitra.alamat && (
                    <div className="md:col-span-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alamat</p>
                      <p className="text-slate-700 leading-relaxed mt-0.5">{selectedMitra.alamat}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedMitra.profil && (
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Profil Singkat</p>
                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedMitra.profil}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setSelectedMitra(null)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ZIP Download Progress Modal (SDGs Theme) */}
      {zipState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-md w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
                zipState.stage === 'completed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : zipState.stage === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-orange-50 border-orange-200 text-orange-600'
              }`}>
                {zipState.stage === 'completed' ? (
                  <PackageCheck className="w-6 h-6" />
                ) : zipState.stage === 'error' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : zipState.stage === 'zipping' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                ) : (
                  <FolderDown className="w-6 h-6 animate-bounce" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {zipState.stage === 'completed' ? 'Unduhan Selesai' : zipState.stage === 'error' ? 'Gagal Mengunduh' : 'Mengunduh Dokumen Kerja Sama (ZIP)'}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {zipState.stage === 'zipping'
                    ? 'Mengompresi berkas ke format ZIP...'
                    : zipState.stage === 'completed'
                    ? `${zipState.successCount} dokumen berhasil dikemas`
                    : zipState.stage === 'error'
                    ? (zipState.errorMessage || 'Terjadi kesalahan')
                    : `Memproses ${zipState.current} dari ${zipState.total} berkas`}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {zipState.stage !== 'error' && (
              <div className="mb-4">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${zipState.total > 0 ? Math.min(100, Math.round((zipState.current / zipState.total) * 100)) : 0}%`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 mt-2 font-mono">
                  <span>{zipState.current} / {zipState.total} Dokumen</span>
                  <span className="font-bold text-sky-600">
                    {zipState.total > 0 ? Math.round((zipState.current / zipState.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}

            {/* Current Item Name */}
            {zipState.stage === 'downloading' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
                <span className="text-slate-400 block mb-0.5">Sedang mengunduh:</span>
                <span className="text-slate-800 font-semibold break-all">{zipState.currentName}</span>
              </div>
            )}

            {/* Badges info */}
            <div className="flex items-center gap-2 mb-5 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Berhasil: {zipState.successCount}
              </span>
              {zipState.failedCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  Gagal: {zipState.failedCount}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              {zipState.stage === 'downloading' || zipState.stage === 'preparing' || zipState.stage === 'zipping' ? (
                <button
                  onClick={handleCancelZip}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors border border-slate-200"
                >
                  Batal
                </button>
              ) : (
                <button
                  onClick={() => setZipState(prev => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
