import os
import pandas as pd
import re

def sanitize_folder_name(name):
    """Menghapus karakter ilegal untuk penamaan folder di OS."""
    if pd.isna(name):
        return "Tidak_Diketahui"
    name = str(name).strip()
    # Hapus karakter yang tidak bisa jadi nama folder
    return re.sub(r'[\\/*?:"<>|]', "", name)

def buat_struktur_folder_kerjasama(base_dir="Uji_Coba_Folder_Dokumen"):
    # 1. Baca Data CSV (Pastikan path mengarah ke folder 'data/' yang ada di sistem)
    try:
        df_dokumen = pd.read_csv('data/T_dokumen_kerjasama.csv')
        df_pengajuan = pd.read_csv('data/T_pengajuan_kerjasama.csv')
        df_m_mitra = pd.read_csv('data/M_mitra_bekerjasama.csv')
        df_mitra = pd.read_csv('data/T_mitra.csv')
    except FileNotFoundError as e:
        print(f"Gagal membaca CSV: {e}. Pastikan script dijalankan di root folder.")
        return

    # 2. Join Tabel sesuai Relasi Schema
    # Ambil jenis_dokumen
    df = pd.merge(df_dokumen, df_pengajuan, 
                  left_on='ref_pengajuan_kerjasama', 
                  right_on='id', 
                  how='left', 
                  suffixes=('_dok', '_peng'))

    # Ambil mapping mitra
    df = pd.merge(df, df_m_mitra, 
                  on='ref_pengajuan_kerjasama', 
                  how='left')

    # Ambil negara_mitra dan kategori_mitra
    df = pd.merge(df, df_mitra, 
                  left_on='ref_mitra', 
                  right_on='id', 
                  how='left', 
                  suffixes=('', '_mitra'))

    # 3. Iterasi dan Buat Folder
    folder_count = 0
    for _, row in df.iterrows():
        # -- A. Tentukan Nasional atau Internasional --
        negara = str(row['negara_mitra']).strip().lower()
        if pd.isna(row['negara_mitra']) or negara == 'nan':
            wilayah = "Dokumen Kerja Sama Tidak Diketahui"
        elif negara == 'indonesia':
            wilayah = "Dokumen Kerja Sama Nasional"
        else:
            wilayah = "Dokumen Kerja Sama Internasional"

        # -- B. Jenis Dokumen --
        jenis_dok = sanitize_folder_name(row['jenis_dokumen'])

        # -- C. Tahun dari tanggal_mulai --
        tgl_mulai = str(row['tanggal_mulai'])
        if pd.isna(row['tanggal_mulai']) or tgl_mulai == 'nan':
            tahun = "Tahun_Tidak_Diketahui"
        else:
            # Mengambil YYYY dari format YYYY-MM-DD
            tahun = sanitize_folder_name(tgl_mulai.split('-')[0]) 

        # -- D. Sub-folder Spesifik (Kategori Mitra / Program) --
        jenis_dok_lower = jenis_dok.lower()
        
        # Kondisi jika MoU -> Kategori Mitra
        if 'mou' in jenis_dok_lower or 'nota kesepahaman' in jenis_dok_lower:
            sub_folder = sanitize_folder_name(row['kategori_mitra'])
            
        # Kondisi jika PKS -> Program
        elif 'pks' in jenis_dok_lower or 'perjanjian' in jenis_dok_lower:
            sub_folder = sanitize_folder_name(row['program'])
            
        # Fallback untuk IA atau jenis lainnya
        else:
            sub_folder = sanitize_folder_name(row['program']) 

        # -- E. Eksekusi Pembuatan Folder --
        folder_path = os.path.join(base_dir, wilayah, jenis_dok, tahun, sub_folder)
        
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)
            folder_count += 1

    print(f"Selesai! Berhasil membuat struktur untuk {folder_count} folder unik di direktori '{base_dir}'.")

# Menjalankan fungsi
if __name__ == "__main__":
    buat_struktur_folder_kerjasama()