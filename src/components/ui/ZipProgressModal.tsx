'use client';

import React from 'react';
import { PackageCheck, AlertCircle, Loader2, FolderDown } from 'lucide-react';
import type { ZipDownloadState } from '@/types';

interface ZipProgressModalProps {
  state: ZipDownloadState;
  onCancel: () => void;
  onClose: () => void;
}

export default function ZipProgressModal({ state, onCancel, onClose }: ZipProgressModalProps) {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 max-w-md w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-xs ${
            state.stage === 'completed'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : state.stage === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-600'
              : 'bg-orange-50 border-orange-200 text-orange-600'
          }`}>
            {state.stage === 'completed' ? (
              <PackageCheck className="w-6 h-6" />
            ) : state.stage === 'error' ? (
              <AlertCircle className="w-6 h-6" />
            ) : state.stage === 'zipping' ? (
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            ) : (
              <FolderDown className="w-6 h-6 animate-bounce" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              {state.stage === 'completed' ? 'Unduhan Selesai' : state.stage === 'error' ? 'Gagal Mengunduh' : 'Mengunduh Dokumen Kerja Sama (ZIP)'}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {state.stage === 'zipping'
                ? 'Mengompresi berkas ke format ZIP...'
                : state.stage === 'completed'
                ? `${state.successCount} dokumen berhasil dikemas`
                : state.stage === 'error'
                ? (state.errorMessage || 'Terjadi kesalahan')
                : `Memproses ${state.current} dari ${state.total} berkas`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {state.stage !== 'error' && (
          <div className="mb-4">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200 p-0.5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${state.total > 0 ? Math.min(100, Math.round((state.current / state.total) * 100)) : 0}%`
                }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 mt-2 font-mono">
              <span>{state.current} / {state.total} Dokumen</span>
              <span className="font-bold text-sky-600">
                {state.total > 0 ? Math.round((state.current / state.total) * 100) : 0}%
              </span>
            </div>
          </div>
        )}

        {/* Current Item Name */}
        {state.stage === 'downloading' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs">
            <span className="text-slate-400 block mb-0.5">Sedang mengunduh:</span>
            <span className="text-slate-800 font-semibold break-all">{state.currentName}</span>
          </div>
        )}

        {/* Badges info */}
        <div className="flex items-center gap-2 mb-5 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            Berhasil: {state.successCount}
          </span>
          {state.failedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              Gagal: {state.failedCount}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          {state.stage === 'downloading' || state.stage === 'preparing' || state.stage === 'zipping' ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
            >
              Batal
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
