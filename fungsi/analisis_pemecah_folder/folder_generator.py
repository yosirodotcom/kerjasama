import pandas as pd
import os
import re

def sanitize_folder_name(name):
    if pd.isna(name) or str(name).strip() == "":
        return None
    # Hapus karakter yang tidak diperbolehkan di Windows
    return re.sub(r'[\\/*?:"<>|]', "", str(name)).strip()

def buat_struktur_folder(csv_path, output_root):
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} tidak ditemukan.")
        return

    df = pd.read_csv(csv_path)
    
    # Counter untuk statistik
    folder_count = 0

    for index, row in df.iterrows():
        # Ambil data dan sanitize
        wilayah = sanitize_folder_name(row.get('Wilayah')) or "Tanpa Wilayah"
        tahun = sanitize_folder_name(row.get('Tahun')) or "Tanpa Tahun"
        jenis = sanitize_folder_name(row.get('Jenis Dokumen')) or "Tanpa Jenis"
        kerja_sama = sanitize_folder_name(row.get('Kerja Sama')) or "Tanpa Kerja Sama"

        # Susun path: Wilayah -> Tahun -> Jenis Dokumen
        path = os.path.join(output_root, wilayah, tahun, jenis)

        # Jika BUKAN MOU, tambahkan level Kerja Sama
        if jenis.upper() != 'MOU':
            kerja_sama = sanitize_folder_name(row.get('Kerja Sama')) or "Tanpa Kerja Sama"
            path = os.path.join(path, kerja_sama)

        # Buat folder jika belum ada
        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)
            folder_count += 1

    print(f"Selesai! Total folder baru yang dibuat (hirarki terdalam): {folder_count}")
    print(f"Lokasi: {output_root}")

if __name__ == "__main__":
    # Lokasi script ini
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(current_dir, "Tabel_Link_Dokumen_Terurut.csv")
    
    # Target folder (di dalam folder yang sama dengan script)
    output_base = os.path.join(current_dir, "Output_Folder_Kerjasama")
    
    print("Memulai pembuatan struktur folder...")
    buat_struktur_folder(csv_file, output_base)
