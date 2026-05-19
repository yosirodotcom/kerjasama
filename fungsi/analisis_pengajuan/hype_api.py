import os
import pandas as pd
import requests
import io
import time
import json
import pdfplumber
from pathlib import Path
from ai_handler import ai_service
from analisis_brutal import download_pdf_from_gdrive, extract_gdrive_file_id

# ================= CONFIGURATION =================
FILE_MENTAH = 'laporan_pengajuan.csv'
FILE_TERUPDATE = 'laporan_pengajuan_terupdate.csv'
TARGET_LIMIT = 100 # Sesuai target di hype.mjs

SYS_INSTRUCTION = """Anda adalah ahli ekstraksi dokumen kerjasama. 
Tugas: Ambil informasi spesifik dari teks PDF.
1. NOMOR: Harus mengandung '/PL16/'. Contoh: 123/PL16/KL/2023.
2. TENTANG: Inti kerjasama (setelah kata 'tentang').
3. TANGGAL: Tanggal penetapan/tanda tangan (Format: DD-MM-YYYY).

Jawab dalam format JSON:
{"no_dok": "...", "tentang": "...", "tanggal": "..."}"""
# =================================================

def extract_metadata_ai(text):
    # Optimasi Token: Hanya ambil 3000 karakter pertama (biasanya metadata ada di halaman 1)
    short_text = text[:3000]
    prompt = f"Ekstrak data dari dokumen ini:\n\n{short_text}"
    
    res = ai_service.ask(prompt, system_instruction=SYS_INSTRUCTION)
    try:
        clean_res = res.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_res)
    except:
        return None

def main():
    script_dir = Path(__file__).parent
    input_path = script_dir / FILE_MENTAH
    output_path = script_dir / FILE_TERUPDATE

    # Load Data
    if output_path.exists():
        df = pd.read_csv(output_path, dtype=str)
    else:
        df = pd.read_csv(input_path, dtype=str)

    df.fillna("", inplace=True)
    
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})

    success_count = 0
    
    print(f"🚀 Memulai Proses Optimasi AI (Target: {TARGET_LIMIT} baris)...")

    for idx, row in df.iterrows():
        if success_count >= TARGET_LIMIT: break
        
        # Cek apakah sudah diproses
        if row.get('NODOK') and row['NODOK'] not in ["", "gagal", "skip: link kosong"]:
            continue

        link = row.get('link_dokumen', '')
        file_id = extract_gdrive_file_id(link)
        
        if not file_id:
            df.at[idx, 'NODOK'] = "skip: link kosong"
            continue

        print(f"[{idx+1}] Menganalisis PDF: {file_id[:15]}...")
        
        # 1. Download
        pdf_bytes = download_pdf_from_gdrive(file_id, session)
        if not pdf_bytes:
            print(f"   ❌ Gagal download")
            continue

        # 2. Extract Text
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                # Hanya ambil halaman 1 untuk hemat token & peforma
                text = pdf.pages[0].extract_text() or ""
        except:
            text = ""

        if not text:
            print(f"   ❌ Gagal extract teks")
            continue

        # 3. AI Extraction with Caching
        data = extract_metadata_ai(text)
        
        if data and data.get('no_dok'):
            df.at[idx, 'NODOK'] = data['no_dok']
            df.at[idx, 'tentang_2'] = data['tentang']
            df.at[idx, 'tanggal_penetapan_2'] = data['tanggal']
            print(f"   ✅ Berhasil: {data['no_dok']}")
            success_count += 1
        else:
            df.at[idx, 'NODOK'] = "gagal"
            print(f"   ⚠️ AI tidak menemukan data valid")

        # Simpan setiap kali berhasil (agar tidak hilang jika crash)
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        time.sleep(1) # Jeda agar tidak terkena rate limit

    print(f"\n✨ Selesai! {success_count} baris berhasil diperbarui.")

if __name__ == "__main__":
    main()
