'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Optional badge number (e.g. document count). */
  count?: number;
}

export interface MultiSelectGroup {
  /** Group header; omit for a flat list. */
  label?: string;
  options: MultiSelectOption[];
}

interface MultiSelectProps {
  id: string;
  label: string;
  placeholder: string;
  /** Noun used in the summary, e.g. "jurusan" → "3 jurusan dipilih". */
  unitLabel: string;
  selected: string[];
  groups: MultiSelectGroup[];
  onChange: (next: string[]) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  hint?: string;
  className?: string;
}

const norm = (s: string) => s.trim().toUpperCase();

/** Searchable, groupable multi-select dropdown with checkboxes. */
export default function MultiSelect({
  id,
  label,
  placeholder,
  unitLabel,
  selected,
  groups,
  onChange,
  icon,
  disabled,
  hint,
  className = '',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selectedSet = React.useMemo(() => new Set(selected.map(norm)), [selected]);

  // Close on outside click / Escape
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open]);

  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) => o.label.toLowerCase().includes(q) || (g.label ?? '').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);

  const toggle = (value: string) => {
    if (selectedSet.has(norm(value))) onChange(selected.filter((v) => norm(v) !== norm(value)));
    else onChange([...selected, value]);
  };

  const toggleGroup = (options: MultiSelectOption[]) => {
    const allOn = options.every((o) => selectedSet.has(norm(o.value)));
    const groupKeys = new Set(options.map((o) => norm(o.value)));
    if (allOn) onChange(selected.filter((v) => !groupKeys.has(norm(v))));
    else onChange([...selected, ...options.filter((o) => !selectedSet.has(norm(o.value))).map((o) => o.value)]);
  };

  const summary =
    selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} ${unitLabel} dipilih`;

  return (
    <div ref={rootRef} className={`relative flex flex-col gap-1 min-w-0 ${className}`}>
      <span id={`${id}-label`} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label`}
        onClick={() => setOpen((o) => !o)}
        title={selected.join(', ') || placeholder}
        className={`group relative flex w-full items-center gap-2 rounded-xl border bg-white py-2 pl-3 pr-8 text-left text-xs font-semibold shadow-xs transition-all
          ${disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
            : open
              ? 'border-sky-500 ring-2 ring-sky-500/20 text-slate-800'
              : 'border-sky-100 text-slate-700 hover:border-sky-300'}`}
      >
        {icon && <span className="shrink-0 text-sky-600">{icon}</span>}
        <span className={`truncate ${selected.length ? 'text-slate-800' : 'text-slate-500'}`}>{summary}</span>
        {selected.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180 text-sky-600' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xl shadow-sky-900/10"
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                id={`${id}-search`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Cari ${unitLabel}...`}
                className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {hint && <div className="border-b border-slate-100 bg-sky-50/60 px-3 py-1.5 text-[10px] text-sky-700">{hint}</div>}

            {/* Options */}
            <div className="max-h-64 overflow-y-auto py-1">
              {filteredGroups.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-slate-400">Tidak ada {unitLabel} yang cocok</div>
              )}
              {filteredGroups.map((g, gi) => {
                const allOn = g.options.length > 0 && g.options.every((o) => selectedSet.has(norm(o.value)));
                const someOn = g.options.some((o) => selectedSet.has(norm(o.value)));
                return (
                  <div key={g.label ?? gi} className={gi > 0 && g.label ? 'mt-1 border-t border-slate-100 pt-1' : ''}>
                    {g.label && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.options)}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-800 hover:bg-sky-50"
                        title="Pilih / batalkan semua di grup ini"
                      >
                        <span className="truncate">{g.label}</span>
                        <span className={`text-[10px] font-semibold normal-case ${someOn ? 'text-sky-600' : 'text-slate-400'}`}>
                          {allOn ? 'Batalkan semua' : 'Pilih semua'}
                        </span>
                      </button>
                    )}
                    {g.options.map((o) => {
                      const on = selectedSet.has(norm(o.value));
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="option"
                          aria-selected={on}
                          onClick={() => toggle(o.value)}
                          className={`flex w-full items-center gap-2.5 py-1.5 pr-3 text-left text-xs transition-colors ${g.label ? 'pl-5' : 'pl-3'} ${
                            on ? 'bg-sky-50 text-sky-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                              on ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {on && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 truncate">{o.label}</span>
                          {o.count !== undefined && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                                o.count > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-300'
                              }`}
                            >
                              {o.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2">
              <button
                type="button"
                disabled={!selected.length}
                onClick={() => onChange([])}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-slate-500"
              >
                Kosongkan
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-sky-600 px-3 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-sky-700"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
