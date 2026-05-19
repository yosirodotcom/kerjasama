import pandas as pd
import os
import re
import io
import sys
from googleapiclient.http import MediaIoBaseDownload

# Tambahkan root repo ke sys.path agar data_handler bisa diimport
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from data_handler import get_drive_service

def extract_file_id(url):
    if pd.isna(url) or not isinstance(url, str):
        return None
    # Pola untuk https://drive.google.com/file/d/FILE_ID/...
    match = re.search(r'/d/([^/]+)', url)
    if match:
        return match.group(1)
    return None

def sanitize_folder_name(name):
    if pd.isna(name) or str(name).strip() == "":
        return None
    return re.sub(r'[\\/*?:"<>|]', "", str(name)).strip()

def download_files_filtered(csv_path, output_root, filter_wilayah=None, filter_tahun=None):
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} tidak ditemukan.")
        return

    df = pd.read_csv(csv_path)
    
    # Filter jika diminta
    if filter_wilayah:
        df = df[df['Wilayah'] == filter_wilayah]
    if filter_tahun:
        # Tahun di CSV bisa jadi string atau int, kita paksa ke string untuk comparison aman
        df = df[df['Tahun'].astype(str) == str(filter_tahun)]

    print(f"Ditemukan {len(df)} dokumen untuk diunduh.")

    service = get_drive_service()
    if not service:
        print("Gagal menginisialisasi Google Drive service.")
        return

    total_files = len(df)
    for i, (index, row) in enumerate(df.iterrows(), 1):
        link = row.get('Link Dokumen')
        file_id = extract_file_id(link)
        
        print(f"\n[{i}/{total_files}] Memproses baris {index}...")

        if not file_id:
            print(f"  [SKIP] Link tidak valid: {link}")
            continue

        # Tentukan path folder
        wilayah = sanitize_folder_name(row.get('Wilayah')) or "Tanpa Wilayah"
        tahun = sanitize_folder_name(row.get('Tahun')) or "Tanpa Tahun"
        jenis = sanitize_folder_name(row.get('Jenis Dokumen')) or "Tanpa Jenis"
        
        folder_path = os.path.join(output_root, wilayah, tahun, jenis)
        
        # Jika BUKAN MOU, tambahkan level Kerja Sama
        if jenis.upper() != 'MOU':
            kerja_sama = sanitize_folder_name(row.get('Kerja Sama')) or "Tanpa Kerja Sama"
            folder_path = os.path.join(folder_path, kerja_sama)
        
        os.makedirs(folder_path, exist_ok=True)

        try:
            # Ambil metadata file untuk mendapatkan nama asli
            file_metadata = service.files().get(fileId=file_id, fields='name').execute()
            original_filename = file_metadata.get('name', f"dokumen_{file_id}.pdf")
            
            if not original_filename.lower().endswith('.pdf'):
                original_filename += ".pdf"

            dest_path = os.path.join(folder_path, original_filename)
            
            if os.path.exists(dest_path):
                print(f"  [EXIST] File sudah ada: {original_filename}")
                continue

            print(f"  Mengunduh: {original_filename}")
            
            request = service.files().get_media(fileId=file_id)
            fh = io.FileIO(dest_path, 'wb')
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
                if status:
                    percent = int(status.progress() * 100)
                    # Progress bar sederhana
                    bar = '#' * (percent // 5) + '-' * (20 - (percent // 5))
                    sys.stdout.write(f"\r    Progress: [{bar}] {percent}%")
                    sys.stdout.flush()
            
            print(f"\n    [OK] Selesai!")

        except Exception as e:
            print(f"\n    [ERROR] Gagal mengunduh: {e}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_file = os.path.join(current_dir, "Tabel_Link_Dokumen_Terurut.csv")
    output_base = os.path.join(current_dir, "Output_Folder_Kerjasama")

    # Jalankan untuk semua data tanpa filter
    print("Memulai proses download SEMUA dokumen...")
    # Kita panggil fungsi dengan filter None agar semua data diproses
    download_files_filtered(csv_file, output_base, filter_wilayah=None, filter_tahun=None)
