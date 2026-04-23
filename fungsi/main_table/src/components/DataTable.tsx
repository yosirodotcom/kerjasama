'use client';

import React, { useState, useMemo } from 'react';
import { JoinedDokumen, MitraInfo } from '@/lib/data';
import { Search, ChevronDown, ChevronUp, Eye, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { isBefore, parse, isValid } from 'date-fns';

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
  { key: 'unit_polnep', label: 'Unit Polnep', defaultVisible: false, type: 'text' },
];

const checkStatus = (tgl_berakhir: string) => {
  if (!tgl_berakhir) return 'Unknown';
  try {
    let parsed = parse(tgl_berakhir, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed)) parsed = parse(tgl_berakhir, 'M/d/yyyy', new Date());
    if (!isValid(parsed)) parsed = parse(tgl_berakhir, 'dd-MM-yyyy', new Date());
    if (!isValid(parsed)) parsed = parse(tgl_berakhir, 'd/M/yyyy', new Date());
    if (!isValid(parsed)) parsed = parse(tgl_berakhir, 'd-M-yyyy', new Date());
    
    if (!isValid(parsed)) return 'Unknown';

    const isExpired = isBefore(parsed, new Date());
    return isExpired ? 'Expired' : 'Active';
  } catch {
    return 'Unknown';
  }
};

const parseDateForSort = (dStr: string) => {
  if (!dStr) return 0;
  let parsed = parse(dStr, 'yyyy-MM-dd', new Date());
  if (!isValid(parsed)) parsed = parse(dStr, 'M/d/yyyy', new Date());
  if (!isValid(parsed)) parsed = parse(dStr, 'dd-MM-yyyy', new Date());
  if (!isValid(parsed)) parsed = parse(dStr, 'd/M/yyyy', new Date());
  if (!isValid(parsed)) parsed = parse(dStr, 'd-M-yyyy', new Date());
  return isValid(parsed) ? parsed.getTime() : 0;
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

  const enrichedData = useMemo(() => {
    return data.map((row, idx) => ({
      ...row,
      no: idx + 1,
      status: checkStatus(row.tanggal_berakhir)
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    return enrichedData.filter(d => {
      const matchGlobal = !globalSearch || 
        Object.values(d).some(val => String(val).toLowerCase().includes(globalSearch.toLowerCase())) || 
        d.mitras.some(m => m.nama.toLowerCase().includes(globalSearch.toLowerCase()));
      
      if (!matchGlobal) return false;

      for (const [key, value] of Object.entries(colFilters)) {
        if (!value) continue;
        if (key === 'mitra') {
          const matchMitra = d.mitras.some(m => m.nama.toLowerCase().includes(value.toLowerCase()));
          if (!matchMitra) return false;
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
  }, [enrichedData, globalSearch, colFilters, sortConfig]);

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

  // DARK THEME applied throughout
  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="px-8 py-6 bg-slate-900 border-b border-slate-800 shadow-md relative z-40 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">Data Mitra Kerjasama</h1>
            <p className="text-sm text-slate-400 mt-1">Data interaktif dapat di-sortir, disaring, dan diatur visibilitas kolomnya secara dinamis.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari Cepat (Semua Baris)..." 
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-slate-800 text-slate-100 placeholder-slate-500"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <button 
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/20"
                onClick={() => setShowColMenu(!showColMenu)}
              >
                <Eye className="w-4 h-4" /> Pilih Kolom
              </button>

              {showColMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 grid grid-cols-1 gap-1 max-h-96 overflow-y-auto">
                  {COLUMNS.map(c => (
                    <label key={c.key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800"
                        checked={visibleCols.has(c.key)}
                        onChange={() => toggleCol(c.key)}
                      />
                      <span className="text-sm font-medium text-slate-300">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 overflow-hidden flex flex-col min-h-0">
        <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0">
          
          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-slate-800 sticky top-0 z-20 shadow-md">
                <tr>
                  {COLUMNS.map(c => visibleCols.has(c.key) && (
                    <th 
                      key={c.key} 
                      className="p-3 font-semibold text-slate-200 text-sm whitespace-nowrap cursor-pointer hover:bg-slate-700 transition-colors select-none border-b border-slate-700"
                      onClick={() => handleSort(c.key)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {c.label}
                        <div className="flex flex-col">
                          {sortConfig.key === c.key ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-50" />
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-900/80 backdrop-blur-sm border-b-2 border-slate-700 sticky top-[45px] z-10 shadow-sm">
                  {COLUMNS.map(c => visibleCols.has(c.key) && (
                    <th key={`filter-${c.key}`} className="p-2 border-r border-slate-800/50 last:border-r-0">
                      {c.type === 'category' || c.type === 'status' ? (
                        <select 
                          className="w-full p-1.5 text-xs border border-slate-700 rounded text-slate-300 bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-normal"
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
                          placeholder={`Filter...`} 
                          className="w-full p-1.5 text-xs border border-slate-700 rounded text-slate-300 bg-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-normal font-sans placeholder-slate-500"
                          value={colFilters[c.key] || ''}
                          onChange={(e) => setColFilters(prev => ({...prev, [c.key]: e.target.value}))}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {paginatedData.map((row, idx) => (
                  <tr key={row.id} className="even:bg-slate-900/50 odd:bg-slate-900 hover:bg-slate-800 transition-colors group">
                    {COLUMNS.map(c => {
                      if (!visibleCols.has(c.key)) return null;

                      let content: React.ReactNode = (row as any)[c.key];

                      if (c.key === 'nomor_dokumen') {
                        content = row.link_dokumen ? (
                          <a href={row.link_dokumen} target="_blank" rel="noreferrer" className="text-indigo-400 font-medium hover:text-indigo-300 underline flex items-center gap-1 w-max">
                            {row.nomor_dokumen || 'Tidak ada nomor'}
                          </a>
                        ) : (row.nomor_dokumen || '-');
                      }
                      if (c.key === 'ref_mou') {
                        content = row.ref_mou ? (
                          <a href={row.link_dokumen || '#'} target="_blank" rel="noreferrer" className="text-indigo-400 font-medium hover:text-indigo-300 underline">
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
                                className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-700 hover:text-indigo-300 transition-colors border border-slate-700 shadow-sm whitespace-normal text-left"
                              >
                                {m.nama} <Info className="w-3.5 h-3.5 ml-0.5 text-indigo-400" />
                              </button>
                            ))}
                          </div>
                        );
                      }
                      if (c.key === 'status') {
                        content = row.status === 'Active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-950/50 text-emerald-400 uppercase tracking-wider border border-emerald-800/50">
                            Aktif
                          </span>
                        ) : row.status === 'Expired' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950/50 text-rose-400 uppercase tracking-wider border border-rose-800/50">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider border border-slate-700">
                            Unknown
                          </span>
                        );
                      }

                      const isTextHeavy = ['tentang', 'deskripsi', 'judul_dokumen'].includes(c.key);
                      
                      return (
                        <td key={c.key} className={`p-3 text-sm text-slate-300 ${isTextHeavy ? 'min-w-[250px] max-w-[400px] whitespace-normal break-words leading-relaxed' : 'whitespace-nowrap'}`}>
                          {content || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-12 text-center text-slate-500 bg-slate-900/50">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-10 h-10 text-slate-700" />
                        <p className="text-lg">Tidak ada data yang ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              Menampilkan <span className="font-semibold text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-semibold text-slate-200">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-semibold text-slate-200">{filteredData.length}</span> data
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Tampilkan</span>
                <select 
                  className="border border-slate-700 bg-slate-800 rounded-md text-sm p-1.5 text-slate-200 outline-none focus:border-indigo-500"
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
                <span className="text-sm text-slate-400">baris</span>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-300 px-3">
                  Hal {currentPage} dari {totalPages}
                </span>
                <button 
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mitra Modal (Dark Theme) */}
      {selectedMitra && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 max-w-lg w-full overflow-hidden transform transition-all border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
              <div>
                <h3 className="text-2xl font-bold text-slate-100">{selectedMitra.nama}</h3>
                <p className="text-indigo-400 font-medium text-sm mt-1">{selectedMitra.kategori || 'Kategori tidak diketahui'}</p>
              </div>
              <button 
                onClick={() => setSelectedMitra(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 hover:bg-rose-900/30 hover:text-rose-400 hover:border-rose-800 transition-colors text-slate-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {selectedMitra.logo && (
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-700 overflow-hidden shadow-inner p-2">
                    <img src={`/${selectedMitra.logo}`} alt={`Logo ${selectedMitra.nama}`} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-slate-500 text-center font-medium">No Image</span>'; }} />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-900/50 shadow-sm">
                  <p className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> Penandatangan Mitra</p>
                  <p className="font-bold text-slate-100 text-[15px] mb-2">{selectedMitra.penandatangan_mitra || '-'}</p>
                  {(selectedMitra.penandatangan_mitra_telepon || selectedMitra.penandatangan_mitra_email) && (
                    <div className="mt-1.5 pt-2 border-t border-indigo-900/50 text-sm text-indigo-200 space-y-1.5">
                      {selectedMitra.penandatangan_mitra_telepon && <p className="flex items-center gap-2"><span className="text-base opacity-70">📞</span> {selectedMitra.penandatangan_mitra_telepon}</p>}
                      {selectedMitra.penandatangan_mitra_email && <p className="flex items-center gap-2 break-all"><span className="text-base opacity-70">✉️</span> {selectedMitra.penandatangan_mitra_email}</p>}
                    </div>
                  )}
                </div>

                <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50 shadow-sm">
                  <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> PIC Mitra</p>
                  <p className="font-bold text-slate-100 text-[15px] mb-2">{selectedMitra.pic_mitra || '-'}</p>
                  {(selectedMitra.pic_mitra_telepon || selectedMitra.pic_mitra_email) && (
                    <div className="mt-1.5 pt-2 border-t border-emerald-900/50 text-sm text-emerald-200 space-y-1.5">
                      {selectedMitra.pic_mitra_telepon && <p className="flex items-center gap-2"><span className="text-base opacity-70">📞</span> {selectedMitra.pic_mitra_telepon}</p>}
                      {selectedMitra.pic_mitra_email && <p className="flex items-center gap-2 break-all"><span className="text-base opacity-70">✉️</span> {selectedMitra.pic_mitra_email}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mt-2">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Informasi Instansi / Mitra</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                    {selectedMitra.email_mitra && (
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Email Mitra</p>
                        <p className="text-sm text-slate-300 font-medium break-all">{selectedMitra.email_mitra}</p>
                      </div>
                    )}
                    {selectedMitra.telepon_mitra && (
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Telepon Mitra</p>
                        <p className="text-sm text-slate-300 font-medium">{selectedMitra.telepon_mitra}</p>
                      </div>
                    )}
                    {selectedMitra.website_mitra && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Website</p>
                        <a href={selectedMitra.website_mitra.startsWith('http') ? selectedMitra.website_mitra : `https://${selectedMitra.website_mitra}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 font-medium hover:text-indigo-300 hover:underline break-all">
                          {selectedMitra.website_mitra}
                        </a>
                      </div>
                    )}
                    {selectedMitra.alamat && (
                      <div className="md:col-span-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Alamat</p>
                        <p className="text-sm text-slate-400 leading-relaxed">{selectedMitra.alamat}</p>
                      </div>
                    )}
                  </div>
                </div>
                {selectedMitra.profil && (
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1.5">Profil Singkat</p>
                    <p className="text-slate-400 text-sm leading-relaxed bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">{selectedMitra.profil}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-800/80 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedMitra(null)}
                className="px-6 py-2 bg-slate-700 text-slate-200 rounded-lg font-medium hover:bg-slate-600 transition-colors shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
