/**
 * Shared TypeScript declarations for the Kerjasama POLNEP app.
 *
 * Core document types are generated into `src/lib/data.ts` by
 * `sync_data_to_web.py`; they are re-exported here so that components and
 * API routes can import every shared type from a single place.
 */
export type { JoinedDokumen, MitraInfo } from '@/lib/data';

/** Period granularity for the statistics filter. */
export type StatsPeriodMode = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'range';

/** Cooperation region filter. */
export type StatsWilayah = 'all' | 'NASIONAL' | 'INTERNASIONAL';

/**
 * Filter state for the statistics cards (StatsOverview).
 * Date-based filtering is evaluated against `tanggal_mulai`.
 */
export interface StatsFilter {
  /** Selected year (min 2021, max current year). Ignored when `period === 'range'`. */
  year: number;
  period: StatsPeriodMode;
  /** Manual range start, `yyyy-MM-dd` (only used when `period === 'range'`). */
  dateFrom: string;
  /** Manual range end, `yyyy-MM-dd` (only used when `period === 'range'`). */
  dateTo: string;
  wilayah: StatsWilayah;
  /** Selected jurusan (multi-select). Empty array = all jurusan. */
  jurusan: string[];
  /** Selected prodi (multi-select, limited to selected jurusan). Empty array = all prodi. */
  prodi: string[];
}

/** Prodi options grouped under their jurusan (for cascading multi-select). */
export interface ProdiGroup {
  jurusan: string;
  prodi: string[];
}

/** Resolved inclusive date range for a filter. */
export interface StatsDateRange {
  start: Date;
  end: Date;
}
