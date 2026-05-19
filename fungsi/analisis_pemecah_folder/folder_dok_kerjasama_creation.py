import pandas as pd
import os
import sys

# Root repo = dua level di atas folder script ini
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def buat_tabel_dokumen_kustom(data_dir=None):
    # Default: folder data/ di root repo (konsisten dengan data_handler.py)
    if data_dir is None:
        data_dir = os.path.join(_REPO_ROOT, 'data')
    # 1. Load Data
    try:
        tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
        tpk = pd.read_csv(f"{data_dir}/T_pengajuan_kerjasama.csv", dtype=str)
        mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
        tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)
    except Exception as e:
        print(f"Error loading CSV files: {e}")
        return pd.DataFrame()

    # 2. Join T_dokumen_kerjasama dengan T_pengajuan_kerjasama (Untuk mendapatkan Jenis Dokumen)
    df = pd.merge(tdk, tpk[['id', 'jenis_dokumen']], 
                  left_on='ref_pengajuan_kerjasama', right_on='id', 
                  how='left', suffixes=('', '_tpk'))

    # 3. Join T_dokumen_kerjasama ke T_kegiatan (Dua sumber: Direct link & Junction table)
    # Bersihkan data kegiatan agar ID unik
    tkeg_min = tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']].drop_duplicates(subset=['id'])
    tkeg_min = tkeg_min[tkeg_min['id'].notna()]
    
    # Sumber A: Direct link di T_dokumen_kerjasama.ref_kegiatan
    df = pd.merge(df, tkeg_min.rename(columns={'id': 'keg_id'}), 
                  left_on='ref_kegiatan', right_on='keg_id', how='left')
    
    # Sumber B: Junction Table M_kegiatan_kerjasama (M_kegiatan_kerjasama)
    df_mkk = pd.merge(mkk, tkeg_min, left_on='ref_kegiatan', right_on='id', how='left')
    df = pd.merge(df, df_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                  left_on='id', right_on='ref_dokumen_kerjasama', how='left', suffixes=('', '_mkk'))

    # Gabungkan data dari kedua sumber (Coalesce)
    df['wilayah_kerjasama'] = df['wilayah_kerjasama'].fillna(df['wilayah_kerjasama_mkk'])
    df['kategori_kegiatan'] = df['kategori_kegiatan'].fillna(df['kategori_kegiatan_mkk'])

    # 3.5 Khusus MOU: Tentukan Wilayah berdasarkan data T_mitra jika masih kosong
    try:
        mmb = pd.read_csv(f"{data_dir}/M_mitra_bekerjasama.csv", dtype=str)
        tmitra = pd.read_csv(f"{data_dir}/T_mitra.csv", dtype=str)
        
        # Ambil mitra pertama untuk setiap pengajuan (untuk menghindari duplikasi baris pengajuan)
        mmb_min = mmb.drop_duplicates(subset=['ref_pengajuan_kerjasama'])
        
        # Join dengan data lokasi mitra
        df_mitra = pd.merge(mmb_min, tmitra[['id', 'negara_mitra', 'provinsi_mitra']], 
                            left_on='ref_mitra', right_on='id', how='left')
        
        # Gabungkan ke dataframe utama
        df = pd.merge(df, df_mitra[['ref_pengajuan_kerjasama', 'negara_mitra', 'provinsi_mitra']], 
                      left_on='ref_pengajuan_kerjasama', right_on='ref_pengajuan_kerjasama', how='left')
        
        # Fungsi logika penentuan wilayah khusus MOU
        def tentukan_wilayah_mou(row):
            jenis = str(row.get('jenis_dokumen', '')).upper()
            wilayah_skrg = row.get('wilayah_kerjasama')
            
            # Hanya proses jika MOU dan Wilayah masih kosong/NaN
            if 'MOU' in jenis and (pd.isna(wilayah_skrg) or str(wilayah_skrg).strip() == "" or str(wilayah_skrg) == 'nan'):
                negara = str(row.get('negara_mitra', '')).upper().strip()
                provinsi = str(row.get('provinsi_mitra', '')).upper().strip()
                
                if negara != 'INDONESIA' and negara != '' and negara != 'NAN':
                    return 'INTERNASIONAL'
                elif negara == 'INDONESIA':
                    if 'KALIMANTAN BARAT' in provinsi:
                        return 'LOKAL'
                    else:
                        return 'NASIONAL'
            return wilayah_skrg

        df['wilayah_kerjasama'] = df.apply(tentukan_wilayah_mou, axis=1)
    except Exception as e:
        print(f"Warning: Gagal memproses logika wilayah MOU: {e}")

    # 4. Siapkan Kolom Sesuai Permintaan
    df['Link Dokumen'] = df['link_dokumen']
    df['Wilayah'] = df['wilayah_kerjasama']
    df['Kerja Sama'] = df['kategori_kegiatan']
    df['Jenis Dokumen'] = df['jenis_dokumen']
    
    # Ambil Tahun dari T_dokumen_kerjasama.tanggal_mulai
    df['Tahun'] = pd.to_datetime(df['tanggal_mulai'], errors='coerce').dt.year

    # 5. Filter: hanya tampilkan dokumen mulai tahun 2021 ke atas
    df = df[df['Tahun'] >= 2021]

    # 6. Hapus duplikasi berdasarkan Link Dokumen
    # (Juga mengabaikan baris yang link dokumennya kosong)
    df = df.dropna(subset=['Link Dokumen'])
    df = df.drop_duplicates(subset=['Link Dokumen'])

    # 7. Filter Jenis Dokumen: Exclude "Implementasi"
    df['jenis_upper'] = df['Jenis Dokumen'].astype(str).str.upper()
    df = df[~df['jenis_upper'].str.contains('IMPLEMENTASI', na=False)]

    # 8. Custom Order Jenis Dokumen (MOU -> PKS -> PSM -> KONTRAK)
    def get_jenis_order(x):
        if pd.isna(x) or not isinstance(x, str): return 5
        if 'MOU' in x: return 1
        elif 'PKS' in x: return 2
        elif 'PSM' in x: return 3
        elif 'KONTRAK' in x: return 4
        else: return 5 # Jika ada jenis lain, taruh di paling bawah

    df['jenis_order'] = df['jenis_upper'].apply(get_jenis_order)

    # 9. Sort berdasarkan Tahun (Ascending) dan Jenis Dokumen
    df = df.sort_values(by=['Tahun', 'jenis_order'], ascending=[True, True])

    # 10. Finalisasi Kolom
    kolom_final = ['Link Dokumen', 'Wilayah', 'Tahun', 'Jenis Dokumen', 'Kerja Sama']
    df_final = df[kolom_final].copy()

    # Rapikan format Tahun (hilangkan desimal .0)
    df_final['Tahun'] = df_final['Tahun'].fillna(0).astype(int).astype(str).replace('0', 'Tidak Ada Tanggal')

    return df_final

if __name__ == "__main__":
    # Tambahkan root repo ke sys.path agar data_handler bisa diimport
    if _REPO_ROOT not in sys.path:
        sys.path.insert(0, _REPO_ROOT)

    from data_handler import download_all_sheets

    data_dir = os.path.join(_REPO_ROOT, 'data')

    # 1. Download ulang semua tabel dari Google Sheets
    print("Mengunduh ulang semua tabel dari Google Sheets...")
    def progress(pct, filename):
        bar = int(pct * 30)
        print(f"  [{'#' * bar}{'-' * (30 - bar)}] {int(pct * 100)}% - {filename}")

    download_all_sheets(download_dir=data_dir, progress_callback=progress)
    print("\n[OK] Semua tabel berhasil diunduh.\n")

    # 2. Proses dan buat tabel output
    print("Memproses data tabel...")
    tabel_hasil = buat_tabel_dokumen_kustom(data_dir=data_dir)

    if not tabel_hasil.empty:
        # Menampilkan 5 data teratas di terminal untuk dicek
        print("\n--- Preview Data ---")
        print(tabel_hasil.head())

        # Ekspor ke CSV di folder yang sama dengan script ini
        folder_script = os.path.dirname(os.path.abspath(__file__))
        file_output = os.path.join(folder_script, "Tabel_Link_Dokumen_Terurut.csv")
        tabel_hasil.to_csv(file_output, index=False, lineterminator='\n')
        print(f"\n[OK] Berhasil! Data telah diekspor ke: {file_output}")