'use client';

import React from 'react';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, 
  ExternalLink, Info, Search 
} from 'lucide-react';
import type { JoinedDokumen, MitraInfo } from '@/types';
import { formatDisplayDate } from '@/lib/dateUtils';
import { getCellValue } from '@/lib/tableUtils';
import { getStatusStyle } from '@/lib/theme';

export type Column = {
  key: string;
  label: string;
  defaultVisible: boolean;
  type?: 'text' | 'date' | 'category' | 'mitra' | 'status';
};

export const COLUMNS: Column[] = [
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
  { key: 'program', label: 'Kategori Kerja Sama', defaultVisible: false, type: 'category' },
  { key: 'sub_kategori', label: 'Sub Kategori', defaultVisible: false, type: 'category' },
  { key: 'iku', label: 'IKU', defaultVisible: false, type: 'category' },
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

export interface EnrichedRow extends JoinedDokumen {
  no: number;
  status: string;
}

interface MainCooperationTableProps {
  columns: Column[];
  visibleCols: Set<string>;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  colFilters: Record<string, string>;
  onColFilterChange: (key: string, value: string) => void;
  enrichedData: EnrichedRow[];
  paginatedData: EnrichedRow[];
  totalFilteredCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  onSelectMitra: (mitra: MitraInfo) => void;
  onResetFilters: () => void;
}

export default function MainCooperationTable({
  columns,
  visibleCols,
  sortConfig,
  onSort,
  colFilters,
  onColFilterChange,
  enrichedData,
  paginatedData,
  totalFilteredCount,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onSelectMitra,
  onResetFilters,
}: MainCooperationTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          {/* Table Header with clean SDGs sky styling */}
          <thead className="bg-sky-50/90 sticky top-0 z-20 border-b border-sky-200/80 shadow-xs backdrop-blur-xs">
            <tr>
              {columns.map(c => visibleCols.has(c.key) && (
                <th 
                  key={c.key} 
                  className="p-3 font-bold text-sky-950 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-sky-100/70 transition-colors select-none border-b border-sky-200/80"
                  onClick={() => onSort(c.key)}
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
              {columns.map(c => visibleCols.has(c.key) && (
                <th key={`filter-${c.key}`} className="p-2 border-r border-slate-100 last:border-r-0">
                  {c.type === 'category' || c.type === 'status' ? (
                    <select 
                      className="w-full p-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-normal"
                      value={colFilters[c.key] || ''}
                      onChange={(e) => onColFilterChange(c.key, e.target.value)}
                    >
                      <option value="">Semua</option>
                      {Array.from(new Set(enrichedData.map(d => getCellValue(d, c.key))))
                        .filter(Boolean)
                        .sort((a, b) => a.localeCompare(b, 'id'))
                        .map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder={c.type === 'date' ? 'dd/mm/yyyy...' : 'Filter...'} 
                      className="w-full p-1.5 text-xs border border-slate-200 rounded-lg text-slate-700 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-normal placeholder-slate-400"
                      value={colFilters[c.key] || ''}
                      onChange={(e) => onColFilterChange(c.key, e.target.value)}
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
                {columns.map(c => {
                  if (!visibleCols.has(c.key)) return null;

                  let content: React.ReactNode = getCellValue(row, c.key);

                  if (['tanggal_penetapan', 'tanggal_mulai', 'tanggal_berakhir'].includes(c.key)) {
                    content = formatDisplayDate(getCellValue(row, c.key));
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
                            onClick={() => onSelectMitra(m)}
                            className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-sky-50 hover:text-sky-800 hover:border-sky-300 transition-colors border border-slate-200 shadow-2xs text-left cursor-pointer"
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
                <td colSpan={columns.length} className="p-12 text-center text-slate-400 bg-white">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="w-10 h-10 text-slate-300" />
                    <p className="text-base font-semibold text-slate-600">Tidak ada dokumen yang sesuai dengan filter.</p>
                    <button
                      onClick={onResetFilters}
                      className="px-4 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold hover:bg-sky-100 transition-colors cursor-pointer"
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
          Menampilkan <span className="font-bold text-slate-800">{totalFilteredCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, totalFilteredCount)}</span> dari <span className="font-bold text-slate-800">{totalFilteredCount}</span> data
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Tampilkan</span>
            <select 
              className="border border-slate-300 bg-white rounded-lg text-xs sm:text-sm p-1.5 text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={itemsPerPage}
              onChange={e => onItemsPerPageChange(Number(e.target.value))}
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
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-3">
              Hal {currentPage} dari {totalPages}
            </span>
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
