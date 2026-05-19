import pandas as pd
import os
from pathlib import Path

# Setup paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = PROJECT_ROOT / "data"

def ekspor_dokumen_ke_excel(output_path=None):
    if output_path is None:
        output_path = SCRIPT_DIR / "informasi_dokumen_kerjasama.xlsx"
    
    # 1. Load data
    try:
        tdk = pd.read_csv(DATA_DIR / "T_dokumen_kerjasama.csv", dtype=str)
        tpk = pd.read_csv(DATA_DIR / "T_pengajuan_kerjasama.csv", dtype=str)
        mmb = pd.read_csv(DATA_DIR / "M_mitra_bekerjasama.csv", dtype=str)
        tm = pd.read_csv(DATA_DIR / "T_mitra.csv", dtype=str)
    except Exception as e:
        print(f"Error loading CSV files from {DATA_DIR}: {e}")
        return

    # 2. Joins
    # Join Dokumen -> Pengajuan
    df = pd.merge(tdk, tpk, left_on='ref_pengajuan_kerjasama', right_on='id', how='left', suffixes=('_dok', '_peng'))
    
    # Join Pengajuan -> Mitra Bekerjasama (Mapping)
    df = pd.merge(df, mmb, left_on='id_peng', right_on='ref_pengajuan_kerjasama', how='left', suffixes=('', '_mmb'))
    
    # Join Mapping -> Mitra (Entity)
    df = pd.merge(df, tm, left_on='ref_mitra', right_on='id', how='left', suffixes=('', '_mitra'))

    # 3. Data Processing
    # Extract Year and Format Dates to Indonesian text
    df['tanggal_mulai_dt'] = pd.to_datetime(df['tanggal_mulai'], errors='coerce')
    df['tanggal_berakhir_dt'] = pd.to_datetime(df['tanggal_berakhir'], errors='coerce')
    
    df['Tahun'] = df['tanggal_mulai_dt'].dt.year.fillna('').astype(str).replace(r'\.0', '', regex=True)

    def format_tgl_indo(dt):
        if pd.isna(dt):
            return '-'
        bulan_indo = {
            1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
            7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
        }
        return f"{dt.day} {bulan_indo[dt.month]} {dt.year}"

    df['tanggal_mulai_indo'] = df['tanggal_mulai_dt'].apply(format_tgl_indo)
    df['tanggal_berakhir_indo'] = df['tanggal_berakhir_dt'].apply(format_tgl_indo)
    
    # Select requested columns
    final_df = df[[
        'Tahun',
        'nomor_dokumen',
        'tanggal_mulai_indo',
        'tanggal_berakhir_indo',
        'negara_mitra',
        'mitra',
        'link_dokumen'
    ]].copy()

    # Rename columns to user-friendly names
    final_df.columns = [
        'Tahun',
        'Nomor Dokumen',
        'Tanggal Mulai',
        'Tanggal Berakhir',
        'Negara',
        'Nama Mitra',
        'Link Dokumen'
    ]

    # Fill empty values with '-' for better readability in Excel
    final_df = final_df.fillna('-')

    # 4. Export to Excel
    try:
        final_df.to_excel(output_path, index=False)
        print(f"Berhasil mengekspor data ke: {output_path}")
    except Exception as e:
        print(f"Gagal mengekspor ke Excel: {e}")
        print("Mencoba mengekspor ke CSV sebagai cadangan...")
        csv_path = str(output_path).replace('.xlsx', '.csv')
        final_df.to_csv(csv_path, index=False)
        print(f"Data diekspor ke CSV: {csv_path}")

if __name__ == "__main__":
    ekspor_dokumen_ke_excel()
