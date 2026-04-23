import os
import sys
import pandas as pd

# Pastikan data_handler bisa diimport dari root repo
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
sys.path.insert(0, ROOT_DIR)

import data_handler

def analisis_prodi():
    # ─── 1. Sinkronisasi data dari Google Sheets ───────────────────────────────
    print("Memperbarui data dari Google Sheets...")
    data_handler.download_all_sheets(DATA_DIR)

    # ─── 2. Muat tabel ────────────────────────────────────────────────────────
    print("Memuat data CSV...")
    tpk = pd.read_csv(os.path.join(DATA_DIR, 'T_pengajuan_kerjasama.csv'), dtype=str)
    tdk = pd.read_csv(os.path.join(DATA_DIR, 'T_dokumen_kerjasama.csv'), dtype=str)

    # ─── 3. Ambil mapping: ref_pengajuan_kerjasama → unit_terkait (dari T_dokumen) ──
    # Satu pengajuan bisa punya banyak dokumen; ambil nilai unit_terkait pertama
    # yang tidak kosong, lalu jadikan lookup dict
    unit_terkait_map = (
        tdk[['ref_pengajuan_kerjasama', 'unit_terkait']]
        .dropna(subset=['ref_pengajuan_kerjasama'])       # buang baris tanpa ref
        .assign(unit_terkait=lambda df: df['unit_terkait'].str.strip())
        .loc[lambda df: df['unit_terkait'].notna() & (df['unit_terkait'] != '')]
        .drop_duplicates(subset='ref_pengajuan_kerjasama', keep='first')
        .set_index('ref_pengajuan_kerjasama')['unit_terkait']
        .to_dict()
    )

    print(f"  => {len(unit_terkait_map)} pengajuan memiliki unit_terkait di T_dokumen")

    # ─── 4. Isi unit_polnep hanya jika KOSONG ─────────────────────────────────
    def _clean(val):
        """Return True jika nilai dianggap kosong/NaN."""
        if pd.isna(val):
            return True
        return str(val).strip() == ''

    total_diisi = 0
    total_dilewati = 0
    total_tidak_ada = 0

    rows_updated = []
    for _, row in tpk.iterrows():
        pid = str(row.get('id', '')).strip()
        unit_polnep_sekarang = row.get('unit_polnep', '')

        if not _clean(unit_polnep_sekarang):
            # Sudah ada nilainya → lewati
            total_dilewati += 1
            rows_updated.append(row)
            continue

        # Cari nilai pengganti dari T_dokumen
        nilai_baru = unit_terkait_map.get(pid)
        if nilai_baru:
            row = row.copy()
            row['unit_polnep'] = nilai_baru
            total_diisi += 1
        else:
            total_tidak_ada += 1

        rows_updated.append(row)

    result_df = pd.DataFrame(rows_updated)

    # ─── 5. Simpan ke XLSX ────────────────────────────────────────────────────
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'T_pengajuan_kerjasama_updated.xlsx')

    result_df.to_excel(output_path, index=False, engine='openpyxl')

    # ─── 6. Laporan ───────────────────────────────────────────────────────────
    print("\n" + "="*55)
    print("  HASIL ANALISIS PRODI — Pengisian unit_polnep")
    print("="*55)
    print(f"  Total baris T_pengajuan_kerjasama  : {len(result_df)}")
    print(f"  [OK]  Diisi dari unit_terkait (T_dokumen) : {total_diisi}")
    print(f"  [>>]  Dilewati (unit_polnep sudah ada)   : {total_dilewati}")
    print(f"  [!!]  Tidak ada data unit_terkait        : {total_tidak_ada}")
    print("="*55)
    print(f"\nFile tersimpan di:\n   {output_path}\n")

    return result_df


if __name__ == '__main__':
    analisis_prodi()
