"""
Analisis Brutal – Verifikasi Nomor Dokumen via PDF
====================================================
Workflow:
  1. Baca setiap baris dari laporan_pengajuan.csv
  2. Download PDF dari link_dokumen (Google Drive)
  3. Extract teks dari PDF, cari nomor dengan pola ".../PL16/..."
  4. Tambah kolom "no_dok" (nomor dari PDF) dan "sesuai" (TRUE/FALSE)
  5. Simpan hasil ke CSV baru dan buat laporan HTML interaktif
"""

import os
import re
import io
import sys
import json
import time
import webbrowser
import tempfile
import requests
import pdfplumber
import pandas as pd
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# Import AI Handler
sys.path.append(str(PROJECT_ROOT))
from ai_handler import ai_service

# Fix Windows console encoding
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_CSV = SCRIPT_DIR / "laporan_pengajuan.csv"
OUTPUT_CSV = SCRIPT_DIR / "hasil_analisis_brutal.csv"
OUTPUT_HTML = SCRIPT_DIR / "laporan_brutal.html"
TEMPLATE_PATH = SCRIPT_DIR / "template_brutal.html"

# Temporary directory for downloaded PDFs (inside project to comply with rules)
TEMP_DIR = SCRIPT_DIR / "_temp_pdfs"
TEMP_DIR.mkdir(exist_ok=True)

# Google Drive download settings
GDRIVE_DOWNLOAD_URL = "https://drive.google.com/uc?export=download&id={file_id}"
CHUNK_SIZE = 32768
REQUEST_TIMEOUT = 60  # seconds
RETRY_COUNT = 2
DELAY_BETWEEN_REQUESTS = 0.5  # seconds, be polite to Google

# Regex: nomor dokumen containing /PL16/
# Examples: 2438/PL16/KL/2012, 927/PL16/KB/2014, 1376/PL16/KB/2016
PATTERN_PL16 = re.compile(r'[\d]+\s*/\s*PL\s*\.?\s*16\s*/\s*[A-Za-z]+(?:\.\d+)?\s*/\s*\d{4}', re.IGNORECASE)


def extract_gdrive_file_id(url: str) -> str | None:
    """Extract file ID from various Google Drive URL formats."""
    if not url or not isinstance(url, str):
        return None

    url = url.strip()

    # Format: /file/d/{ID}/...
    m = re.search(r'/file/d/([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)

    # Format: ?id={ID}
    m = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)

    # Format: open?id={ID}
    m = re.search(r'open\?id=([a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)

    return None


def download_pdf_from_gdrive(file_id: str, session: requests.Session) -> bytes | None:
    """
    Download a PDF from Google Drive.
    Handles the virus-scan confirmation page for larger files.
    Returns raw bytes of the PDF or None on failure.
    """
    url = GDRIVE_DOWNLOAD_URL.format(file_id=file_id)

    for attempt in range(RETRY_COUNT):
        try:
            resp = session.get(url, stream=True, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()

            # Check if Google returned a virus-scan warning page
            # If so, we need to extract the confirmation token and retry
            content_type = resp.headers.get('Content-Type', '')
            if 'text/html' in content_type:
                # Look for confirmation token in cookies or page
                confirm_token = None
                for key, value in resp.cookies.items():
                    if key.startswith('download_warning'):
                        confirm_token = value
                        break

                if not confirm_token:
                    # Try to find it in the HTML body
                    text = resp.text
                    m = re.search(r'confirm=([0-9A-Za-z_-]+)', text)
                    if m:
                        confirm_token = m.group(1)

                if confirm_token:
                    # Retry with confirmation
                    confirmed_url = f"{url}&confirm={confirm_token}"
                    resp = session.get(confirmed_url, stream=True, timeout=REQUEST_TIMEOUT)
                    resp.raise_for_status()
                else:
                    # Might still be HTML (access denied, etc.)
                    if 'application/pdf' not in resp.headers.get('Content-Type', ''):
                        return None

            # Read the content
            data = b''
            for chunk in resp.iter_content(CHUNK_SIZE):
                data += chunk

            # Validate it's actually a PDF
            if data[:5] == b'%PDF-':
                return data

            # Sometimes the PDF doesn't start exactly at byte 0
            if b'%PDF-' in data[:100]:
                return data

            return None

        except (requests.RequestException, Exception) as e:
            if attempt < RETRY_COUNT - 1:
                time.sleep(2)
                continue
            return None

    return None


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF using pdfplumber."""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            texts = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    texts.append(text)
            return "\n".join(texts)
    except Exception:
        return ""


def find_pl16_number(text: str) -> str:
    """
    Search for document number containing /PL16/ in the extracted text.
    Returns the first match found, or empty string.
    """
    if not text:
        return ""

    matches = PATTERN_PL16.findall(text)
    if matches:
        # Clean up whitespace in the match
        result = matches[0].strip()
        # Normalize: remove extra spaces around slashes
        result = re.sub(r'\s*/\s*', '/', result)
        # Normalize PL 16 → PL16, PL.16 → PL16
        result = re.sub(r'PL\s*\.?\s*16', 'PL16', result, flags=re.IGNORECASE)
        return result

    return ""


def normalize_nomor(nomor: str) -> str:
    """Normalize a document number for comparison."""
    if not nomor or not isinstance(nomor, str):
        return ""
    # Remove all whitespace, convert to uppercase
    n = nomor.strip().upper()
    n = re.sub(r'\s+', '', n)
    # Normalize PL.16 or PL 16 etc to PL16
    n = re.sub(r'PL\s*\.?\s*16', 'PL16', n)
    return n


def process_row(idx: int, row: pd.Series, session: requests.Session, total: int) -> dict:
    """
    Process a single row:
      1. Download PDF from link_dokumen
      2. Extract text
      3. Find PL16 number
      4. Compare with nomor_dokumen
    Returns dict with no_dok and sesuai.
    """
    link = str(row.get('link_dokumen', '')).strip()
    nomor_dokumen = str(row.get('nomor_dokumen', '')).strip()

    prefix = f"  [{idx+1}/{total}]"

    if not link:
        print(f"{prefix} [!] Tidak ada link_dokumen -> no_dok kosong")
        return {"no_dok": "", "sesuai": "FALSE"}

    # Extract file ID
    file_id = extract_gdrive_file_id(link)
    if not file_id:
        print(f"{prefix} [!] Gagal extract file ID dari: {link[:60]}...")
        return {"no_dok": "", "sesuai": "FALSE"}

    # Download PDF
    pdf_bytes = download_pdf_from_gdrive(file_id, session)
    if not pdf_bytes:
        print(f"{prefix} [X] Gagal download PDF (id: {file_id[:20]}...)")
        return {"no_dok": "", "sesuai": "FALSE"}

    # Extract text
    text = extract_text_from_pdf(pdf_bytes)
    if not text:
        print(f"{prefix} [X] Gagal extract teks dari PDF")
        return {"no_dok": "", "sesuai": "FALSE"}

    # --- PROMPT CACHING INTEGRATION ---
    sys_instruction = """Anda adalah asisten ekstraksi data dokumen hukum. 
    Tugas Anda adalah mengekstrak 3 informasi dari teks PDF yang diberikan:
    1. Nomor Dokumen: Cari yang mengandung '/PL16/'. Formatnya biasanya XXXX/PL16/XX/XXXX.
    2. Tentang: Apa inti dari kerjasama ini (misal: Tridarma Perguruan Tinggi, Praktek Kerja Lapangan).
    3. Tanggal Penetapan: Cari tanggal dokumen ditandatangani. WAJIB ubah ke format DD-MM-YYYY.

    Jawab HANYA dengan format JSON:
    {"no_dok": "...", "tentang": "...", "tanggal": "..."}"""

    prompt = f"Ekstrak data dari teks PDF berikut:\n\n{text[:5000]}" # Ambil 5000 karakter pertama agar tidak terlalu panjang

    ai_res = ai_service.ask(prompt, system_instruction=sys_instruction)
    
    try:
        # Bersihkan jika ada markdown
        clean_res = ai_res.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_res)
        no_dok = data.get("no_dok", "")
        # Anda bisa menyimpan 'tentang' dan 'tanggal' juga jika kolomnya tersedia
    except:
        # Fallback ke regex lama jika AI gagal
        no_dok = find_pl16_number(text)

    # Compare
    is_match = normalize_nomor(nomor_dokumen) == normalize_nomor(no_dok)
    status = "TRUE" if is_match else "FALSE"
    icon = "[OK]" if is_match else "[X]"

    print(f"{prefix} {icon} nomor_dokumen='{nomor_dokumen}' | AI_no_dok='{no_dok}' -> {status}")
    return {"no_dok": no_dok, "sesuai": status}


def run_analysis():
    """Main analysis workflow."""
    print("=" * 70)
    print("  ANALISIS BRUTAL - Verifikasi Nomor Dokumen via PDF")
    print("=" * 70)
    print()

    # 1. Load CSV
    print("[1/4] Memuat data dari laporan_pengajuan.csv...")
    df = pd.read_csv(INPUT_CSV, dtype=str)
    df.fillna("", inplace=True)
    total = len(df)
    print(f"      Total baris: {total}")
    print()

    # 2. Process each row
    print("[2/4] Memproses setiap baris (download + extract + cari nomor)...")
    print("-" * 70)

    results = []
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    start_time = time.time()
    count_true = 0
    count_false = 0
    count_no_link = 0
    count_download_fail = 0

    for idx, row in df.iterrows():
        result = process_row(idx, row, session, total)
        results.append(result)

        if result["sesuai"] == "TRUE":
            count_true += 1
        else:
            count_false += 1
        if not str(row.get('link_dokumen', '')).strip():
            count_no_link += 1

        # Polite delay
        time.sleep(DELAY_BETWEEN_REQUESTS)

    elapsed = time.time() - start_time
    print("-" * 70)
    print(f"  Selesai dalam {elapsed:.1f} detik")
    print()

    # 3. Add columns to DataFrame
    print("[3/4] Menyimpan hasil ke CSV...")
    df["no_dok"] = [r["no_dok"] for r in results]
    df["sesuai"] = [r["sesuai"] for r in results]

    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"      CSV tersimpan: {OUTPUT_CSV}")
    print()

    # 4. Build HTML report
    print("[4/4] Membuat laporan HTML...")
    build_html_report(df, count_true, count_false, elapsed)
    print(f"      HTML tersimpan: {OUTPUT_HTML}")
    print()

    # Summary
    print("=" * 70)
    print("  RINGKASAN ANALISIS BRUTAL")
    print("=" * 70)
    print(f"  Total data       : {total}")
    print(f"  Sesuai (TRUE)    : {count_true}")
    print(f"  Tidak sesuai     : {count_false}")
    print(f"  Tanpa link       : {count_no_link}")
    print(f"  Waktu proses     : {elapsed:.1f} detik")
    print("=" * 70)

    # Auto-open
    webbrowser.open(str(OUTPUT_HTML))


def build_html_report(df: pd.DataFrame, count_true: int, count_false: int, elapsed: float):
    """Generate HTML report from template + data."""
    records = df.to_dict(orient="records")

    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    html = template.replace("/* __DATA_PLACEHOLDER__ */[]", json.dumps(records, ensure_ascii=False))
    html = html.replace("__TOTAL_ROWS__", str(len(records)))
    html = html.replace("__COUNT_TRUE__", str(count_true))
    html = html.replace("__COUNT_FALSE__", str(count_false))
    html = html.replace("__ELAPSED__", f"{elapsed:.1f}")
    html = html.replace("__GENERATED_AT__", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

    OUTPUT_HTML.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    run_analysis()
