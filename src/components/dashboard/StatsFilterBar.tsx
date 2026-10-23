'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays, CalendarRange, Globe2, GraduationCap, BookOpen, RotateCcw, SlidersHorizontal, FileText,
} from 'lucide-react';
import type { StatsFilter, StatsPeriodMode, StatsWilayah, ProdiGroup } from '@/types';
import {
  STATS_MIN_YEAR, getYearOptions, getPeriodLabel, getDefaultStatsFilter, todayIso, pruneProdiSelection,
} from '@/lib/statsFilter';
import SelectField from '@/components/ui/SelectField';
import SegmentedControl from '@/components/ui/SegmentedControl';
import MultiSelect from '@/components/ui/MultiSelect';

interface StatsFilterBarProps {
  filter: StatsFilter;
  onChange: (next: StatsFilter) => void;
  jurusanOptions: string[];
  /** Prodi grouped by jurusan (already narrowed to the selected jurusan). */
  prodiGroups: ProdiGroup[];
  /** Document counts per jurusan / prodi (keys upper-cased) in the active period + wilayah. */
  jurusanCounts: Record<string, number>;
  prodiCounts: Record<string, number>;
  resultCount: number;
}

const PERIOD_OPTIONS: { value: StatsPeriodMode; label: string; title: string }[] = [
  { value: 'year', label: 'Setahun', title: 'Januari – Desember' },
  { value: 'Q1', label: 'Q1', title: 'Januari – Maret' },
  { value: 'Q2', label: 'Q2', title: 'April – Juni' },
  { value: 'Q3', label: 'Q3', title: 'Juli – September' },
  { value: 'Q4', label: 'Q4', title: 'Oktober – Desember' },
  { value: 'range', label: 'Rentang', title: 'Pilih rentang tanggal manual' },
];

const WILAYAH_OPTIONS: { value: StatsWilayah; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'NASIONAL', label: 'Nasional' },
  { value: 'INTERNASIONAL', label: 'Internasional' },
];

export default function StatsFilterBar({
  filter,
  onChange,
  jurusanOptions,
  prodiGroups,
  jurusanCounts,
  prodiCounts,
  resultCount,
}: StatsFilterBarProps) {
  const years = React.useMemo(() => getYearOptions(), []);
  const defaults = React.useMemo(() => getDefaultStatsFilter(), []);
  const today = todayIso();
  const minDate = `${STATS_MIN_YEAR}-01-01`;

  const update = (patch: Partial<StatsFilter>) => onChange({ ...filter, ...patch });

  const handlePeriod = (period: StatsPeriodMode) => {
    if (period === 'range' && filter.period !== 'range') {
      // Seed the manual range from the currently selected year.
      const yearEnd = `${filter.year}-12-31`;
      update({ period, dateFrom: `${filter.year}-01-01`, dateTo: yearEnd < today ? yearEnd : today });
      return;
    }
    update({ period });
  };

  const isDefault =
    filter.year === defaults.year &&
    filter.period === defaults.period &&
    filter.wilayah === defaults.wilayah &&
    filter.jurusan.length === 0 &&
    filter.prodi.length === 0;

  const setJurusan = (jurusan: string[]) =>
    update({ jurusan, prodi: pruneProdiSelection(filter.prodi, jurusan) });

  const activeChips: { key: string; label: string; tone: 'teal' | 'sky'; clear: () => void }[] = [];
  if (filter.wilayah !== 'all') {
    activeChips.push({
      key: 'wilayah',
      label: filter.wilayah === 'NASIONAL' ? 'Nasional' : 'Internasional',
      tone: 'teal',
      clear: () => update({ wilayah: 'all' }),
    });
  }
  filter.jurusan.forEach((j) =>
    activeChips.push({ key: `j-${j}`, label: j, tone: 'teal', clear: () => setJurusan(filter.jurusan.filter((x) => x !== j)) })
  );
  filter.prodi.forEach((p) =>
    activeChips.push({ key: `p-${p}`, label: p, tone: 'sky', clear: () => update({ prodi: filter.prodi.filter((x) => x !== p) }) })
  );

  return (
    <section
      id="stats-filter-bar"
      aria-label="Filter statistik kerja sama"
      className="relative z-30 rounded-2xl border border-sky-100 bg-white/90 p-4 shadow-xs backdrop-blur-sm sm:p-5"
    >
      {/* Decorative gradient accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-sky-500 via-teal-400 to-orange-400" />

      {/* Header row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-600">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Filter Data &amp; Statistik</h2>
            <p className="text-[11px] text-slate-500">Menyaring data statistik dan tabel berdasarkan tanggal mulai kerja sama</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <motion.span
            key={getPeriodLabel(filter)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {getPeriodLabel(filter)}
          </motion.span>
          <motion.span
            key={`count-${resultCount}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700"
          >
            <FileText className="h-3.5 w-3.5" />
            {resultCount} dokumen
          </motion.span>
          <button
            id="stats-filter-reset"
            type="button"
            disabled={isDefault}
            onClick={() => onChange(getDefaultStatsFilter())}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <SelectField
          id="stats-filter-year"
          label="Tahun"
          className="lg:col-span-2"
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          value={String(filter.year)}
          disabled={filter.period === 'range'}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          onChange={(v) => update({ year: Number(v) })}
        />
        <SegmentedControl
          id="stats-filter-period"
          label="Periode"
          className="lg:col-span-5"
          value={filter.period}
          options={PERIOD_OPTIONS}
          onChange={handlePeriod}
        />
        <SegmentedControl
          id="stats-filter-wilayah"
          label="Wilayah"
          className="sm:col-span-2 lg:col-span-5"
          value={filter.wilayah}
          options={WILAYAH_OPTIONS}
          onChange={(wilayah) => update({ wilayah })}
        />

        <MultiSelect
          id="stats-filter-jurusan"
          label="Jurusan"
          unitLabel="jurusan"
          placeholder="Semua Jurusan"
          className="lg:col-span-6"
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          selected={filter.jurusan}
          groups={[
            {
              options: jurusanOptions.map((j) => ({
                value: j,
                label: j,
                count: jurusanCounts[j.toUpperCase()] ?? 0,
              })),
            },
          ]}
          hint="Angka = jumlah dokumen pada periode & wilayah terpilih"
          onChange={setJurusan}
        />
        <MultiSelect
          id="stats-filter-prodi"
          label={filter.jurusan.length ? `Program Studi (${filter.jurusan.length} jurusan)` : 'Program Studi'}
          unitLabel="prodi"
          placeholder={filter.jurusan.length ? 'Semua Prodi di jurusan terpilih' : 'Semua Program Studi'}
          className="lg:col-span-6"
          icon={<BookOpen className="h-3.5 w-3.5" />}
          selected={filter.prodi}
          disabled={prodiGroups.length === 0}
          groups={prodiGroups.map((g) => ({
            label: g.jurusan,
            options: g.prodi.map((p) => ({ value: p, label: p, count: prodiCounts[p.toUpperCase()] ?? 0 })),
          }))}
          hint={
            filter.jurusan.length
              ? 'Hanya menampilkan prodi dari jurusan yang dipilih'
              : 'Pilih jurusan terlebih dahulu untuk mempersempit daftar prodi'
          }
          onChange={(prodi) => update({ prodi })}
        />
      </div>

      {/* Manual date range */}
      <AnimatePresence initial={false}>
        {filter.period === 'range' && (
          <motion.div
            key="range"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/50 p-3 sm:flex-row sm:items-end">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-800 sm:pb-2">
                <CalendarRange className="h-4 w-4 text-sky-600" />
                Rentang Tanggal Mulai
              </div>
              <DateInput
                id="stats-filter-date-from"
                label="Dari"
                value={filter.dateFrom}
                min={minDate}
                max={filter.dateTo || today}
                onChange={(dateFrom) => update({ dateFrom })}
              />
              <DateInput
                id="stats-filter-date-to"
                label="Sampai"
                value={filter.dateTo}
                min={filter.dateFrom || minDate}
                max={today}
                onChange={(dateTo) => update({ dateTo })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active attribute chips */}
      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap items-center gap-1.5 overflow-hidden"
          >
            <Globe2 className="h-3.5 w-3.5 text-slate-400" />
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                title="Hapus filter ini"
                className={`group inline-flex max-w-xs items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 ${
                  c.tone === 'teal' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-sky-200 bg-sky-50 text-sky-800'
                }`}
              >
                <span className="truncate">{c.label}</span>
                <span className="opacity-60 group-hover:text-rose-500 group-hover:opacity-100">✕</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function DateInput({
  id, label, value, min, max, onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
      />
    </div>
  );
}
