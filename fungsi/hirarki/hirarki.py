import pandas as pd
import os
import webbrowser
import warnings
import sys
from pathlib import Path

warnings.filterwarnings('ignore')

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent          # d:\repos\kerjasama
DATA_DIR = str(PROJECT_ROOT / "data")
OUTPUT_HTML = str(SCRIPT_DIR / "debug_hirarki_2025.html")

# Add project root to sys.path and import data_handler
sys.path.append(str(PROJECT_ROOT))
import data_handler


def get_df_by_pattern(folder, pattern):
    """Mencari file di folder /data secara dinamis."""
    if not os.path.exists(folder): return None
    for file in os.listdir(folder):
        if pattern.lower() in file.lower() and file.endswith('.csv'):
            return pd.read_csv(os.path.join(folder, file))
    return None

def debug_hirarki_2025_interaktif():
    print("Sedang menyiapkan tabel interaktif...")

    # 1. Muat Tabel
    df_dokumen = get_df_by_pattern(DATA_DIR, 'T_dokumen_kerjasama')
    df_pengajuan = get_df_by_pattern(DATA_DIR, 'T_pengajuan_kerjasama')
    df_m_mitra = get_df_by_pattern(DATA_DIR, 'M_mitra_bekerjasama')
    df_mitra = get_df_by_pattern(DATA_DIR, 'T_mitra')

    if any(df is None for df in [df_dokumen, df_pengajuan, df_m_mitra, df_mitra]):
        print("[Error] File CSV tidak lengkap di folder /data.")
        return

    # 2. Preprocessing & Filter Tahun 2025
    df_dokumen['dt_penetapan'] = pd.to_datetime(
        df_dokumen['tanggal_penetapan'].astype(str).str.strip(), 
        format='mixed', dayfirst=True, errors='coerce'
    )
    df_dokumen['tahun'] = df_dokumen['dt_penetapan'].dt.year
    parent_ids = set(df_dokumen['ref_mou'].dropna().unique())
    df_2025 = df_dokumen[df_dokumen['tahun'] == 2025].copy()

    # 3. Logika Hirarki dengan Badge
    def beri_label(id_dok):
        if id_dok not in parent_ids:
            return '<span class="badge bg-success">DIHITUNG (Leaf)</span>'
        else:
            return '<span class="badge bg-danger">DIABAIKAN (Induk)</span>'

    df_2025['status_hitung'] = df_2025['id'].apply(beri_label)

    # 4. Gabungkan Data
    df_m_mitra.rename(columns={'id_pengajuan_kerjasama': 'ref_pengajuan_kerjasama', 'id_mitra': 'ref_mitra'}, inplace=True, errors='ignore')
    df_debug = pd.merge(df_2025, df_pengajuan[['id', 'jenis_dokumen']], left_on='ref_pengajuan_kerjasama', right_on='id', how='left')
    df_debug = pd.merge(df_debug, df_m_mitra[['ref_pengajuan_kerjasama', 'ref_mitra']], on='ref_pengajuan_kerjasama', how='left')
    df_debug = pd.merge(df_debug, df_mitra[['id', 'mitra']], left_on='ref_mitra', right_on='id', how='left')

    # 5. Siapkan Data untuk HTML
    kolom_tampil = ['id_x', 'nomor_dokumen', 'jenis_dokumen', 'mitra', 'ref_mou', 'status_hitung']
    df_final = df_debug[kolom_tampil].fillna('-')
    
    # PERBAIKAN: Menggunakan table_id bukan id
    table_html = df_final.to_html(classes='display table table-hover', table_id='tabelDebug', escape=False, index=False)

    # 6. Susun Full HTML
    full_html = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Debug Hirarki Dokumen 2025</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
        <style>
            body {{ padding: 40px; background-color: #f8f9fa; }}
            .container-fluid {{ background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }}
            h2 {{ color: #0d6efd; border-left: 5px solid #0d6efd; padding-left: 15px; }}
        </style>
    </head>
    <body>
        <div class="container-fluid">
            <h2>Analisis Hirarki Dokumen Kerja Sama (Filter: 2025)</h2>
            <hr>
            {table_html}
        </div>

        <script src="https://code.jquery.com/jquery-3.7.0.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
        <script>
            $(document).ready(function() {{
                $('#tabelDebug').DataTable({{
                    "pageLength": 25,
                    "language": {{ "search": "Cari Data:" }}
                }});
            }});
        </script>
    </body>
    </html>
    """

    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)
    
    file_path = "file://" + os.path.abspath(OUTPUT_HTML)
    print(f"Berhasil! Membuka browser: {OUTPUT_HTML}")
    webbrowser.open(file_path)

if __name__ == "__main__":
    print("Memperbarui data dari Google Sheets, mohon tunggu...")
    data_handler.download_all_sheets(DATA_DIR)
    debug_hirarki_2025_interaktif()
