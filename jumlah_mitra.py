import pandas as pd
import os
import warnings

warnings.filterwarnings('ignore')

def get_df_by_pattern(folder, pattern):
    """Mencari file di folder secara dinamis (mendukung subfolder /data atau folder saat ini)."""
    search_paths = [folder, '.']
    for path in search_paths:
        if os.path.exists(path):
            for file in os.listdir(path):
                if pattern.lower() in file.lower() and file.endswith('.csv'):
                    return pd.read_csv(os.path.join(path, file))
    return None

def analisis_hirarki_otomatis():
    print("Menganalisis hirarki otomatis berdasarkan relasi ref_mou...")
    
    # 1. Muat Tabel Utama
    df_dokumen = get_df_by_pattern('data', 'T_dokumen_kerjasama')
    df_m_mitra = get_df_by_pattern('data', 'M_mitra_bekerjasama')

    if df_dokumen is None or df_m_mitra is None:
        print("[Error] Gagal menemukan tabel utama. Pastikan file CSV ada di folder /data.")
        return

    # =======================================================
    # 2. PENYESUAIAN SKEMA & MAPPING
    # =======================================================
    # Standardisasi T_dokumen_kerjasama
    if 'id_pengajuan_kerjasama' in df_dokumen.columns:
        df_dokumen.rename(columns={'id_pengajuan_kerjasama': 'ref_pengajuan_kerjasama'}, inplace=True)
    
    # Standardisasi M_mitra_bekerjasama
    if 'id_pengajuan_kerjasama' in df_m_mitra.columns:
        df_m_mitra.rename(columns={'id_pengajuan_kerjasama': 'ref_pengajuan_kerjasama'}, inplace=True)
    if 'id_mitra' in df_m_mitra.columns:
        df_m_mitra.rename(columns={'id_mitra': 'ref_mitra'}, inplace=True)

    # Proses Tanggal & Tahun
    df_dokumen['dt_penetapan'] = pd.to_datetime(
        df_dokumen['tanggal_penetapan'].astype(str).str.strip(), 
        format='mixed', dayfirst=True, errors='coerce'
    )
    df_dokumen = df_dokumen.dropna(subset=['dt_penetapan'])
    df_dokumen['tahun'] = df_dokumen['dt_penetapan'].dt.year.astype(int)

    # =======================================================
    # 3. LOGIKA HIRARKI OTOMATIS (Ancestor vs Leaf)
    # =======================================================
    # Identifikasi semua ID yang menjadi 'Induk' (Ancestor)
    # Dokumen adalah induk jika ID-nya muncul di kolom ref_mou dokumen lain.
    parent_ids = set(df_dokumen['ref_mou'].dropna().unique())
    
    # Filter: Hanya simpan dokumen yang BUKAN merupakan induk (Leaf Node).
    # Ini otomatis mencakup:
    # - MoU yang tidak punya turunan (Dihitung 1)
    # - PKS yang tidak punya Rencana Implementasi (Dihitung)
    # - Semua Rencana Implementasi (Dihitung)
    # - Dokumen jenis 'KONTRAK' (Dihitung selama tidak ada turunannya)
    df_leaves = df_dokumen[~df_dokumen['id'].isin(parent_ids)].copy()

    # =======================================================
    # 4. GABUNGKAN DENGAN DATA MITRA
    # =======================================================
    df_final = pd.merge(
        df_leaves[['id', 'ref_pengajuan_kerjasama', 'tahun']], 
        df_m_mitra[['ref_pengajuan_kerjasama', 'ref_mitra']], 
        on='ref_pengajuan_kerjasama', 
        how='inner'
    )

    # =======================================================
    # 5. AGREGASI & OUTPUT
    # =======================================================
    # Menghitung jumlah 'Aktivitas Kerja Sama Aktif' per Tahun
    hasil = df_final.groupby('tahun').size().reset_index(name='jumlah_dokumen_aktif')
    hasil = hasil.sort_values(by='tahun').reset_index(drop=True)
    
    return hasil

if __name__ == "__main__":
    hasil_akhir = analisis_hirarki_otomatis()
    if hasil_akhir is not None:
        print("\n" + "="*50)
        print(" HASIL ANALISIS KERJA SAMA (LEAF NODE LOGIC)")
        print("="*50)
        print(hasil_akhir)
        print("-" * 50)
        print("Logika: Hanya menghitung dokumen yang tidak memiliki ")
        print("        turunan (anak) di kolom ref_mou.")
        print("="*50)