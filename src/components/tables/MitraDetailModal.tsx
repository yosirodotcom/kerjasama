'use client';

import React from 'react';
import { XCircle, Info, ExternalLink } from 'lucide-react';
import type { MitraInfo } from '@/types';

interface MitraDetailModalProps {
  mitra: MitraInfo | null;
  onClose: () => void;
}

export default function MitraDetailModal({ mitra, onClose }: MitraDetailModalProps) {
  if (!mitra) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-sky-100 flex justify-between items-start bg-gradient-to-r from-sky-50/80 to-white">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{mitra.nama}</h3>
            <p className="text-sky-700 font-semibold text-xs mt-1 bg-sky-100/60 inline-block px-2 py-0.5 rounded-md">
              {mitra.kategori || 'Kategori Umum'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {mitra.logo && (
            <div className="flex flex-col items-center justify-center mb-4">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner p-2">
                <img 
                  src={`/${mitra.logo}`} 
                  alt={`Logo ${mitra.nama}`} 
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
              <p className="font-bold text-slate-900 text-sm mb-1">{mitra.penandatangan_mitra || '-'}</p>
              {(mitra.penandatangan_mitra_telepon || mitra.penandatangan_mitra_email) && (
                <div className="mt-1.5 pt-1.5 border-t border-sky-200/60 text-xs text-sky-900 space-y-1">
                  {mitra.penandatangan_mitra_telepon && <p className="flex items-center gap-1.5">📞 {mitra.penandatangan_mitra_telepon}</p>}
                  {mitra.penandatangan_mitra_email && <p className="flex items-center gap-1.5 break-all">✉️ {mitra.penandatangan_mitra_email}</p>}
                </div>
              )}
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
              <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-600"/> PIC Mitra
              </p>
              <p className="font-bold text-slate-900 text-sm mb-1">{mitra.pic_mitra || '-'}</p>
              {(mitra.pic_mitra_telepon || mitra.pic_mitra_email) && (
                <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 text-xs text-emerald-900 space-y-1">
                  {mitra.pic_mitra_telepon && <p className="flex items-center gap-1.5">📞 {mitra.pic_mitra_telepon}</p>}
                  {mitra.pic_mitra_email && <p className="flex items-center gap-1.5 break-all">✉️ {mitra.pic_mitra_email}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">
              Informasi Kontak & Alamat
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              {mitra.email_mitra && (
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Mitra</p>
                  <p className="text-slate-800 font-medium break-all">{mitra.email_mitra}</p>
                </div>
              )}
              {mitra.telepon_mitra && (
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telepon Mitra</p>
                  <p className="text-slate-800 font-medium">{mitra.telepon_mitra}</p>
                </div>
              )}
              {mitra.website_mitra && (
                <div className="md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Website Resmi</p>
                  <a 
                    href={mitra.website_mitra.startsWith('http') ? mitra.website_mitra : `https://${mitra.website_mitra}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sky-600 font-semibold hover:underline break-all flex items-center gap-1 mt-0.5"
                  >
                    {mitra.website_mitra}
                    <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </div>
              )}
              {mitra.alamat && (
                <div className="md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alamat</p>
                  <p className="text-slate-700 leading-relaxed mt-0.5">{mitra.alamat}</p>
                </div>
              )}
            </div>
          </div>

          {mitra.profil && (
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Profil Singkat</p>
              <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {mitra.profil}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
