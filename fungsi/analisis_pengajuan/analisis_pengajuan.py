"""
Analisis Pengajuan Kerjasama
============================
Menggabungkan data dari T_dokumen_kerjasama, T_pengajuan_kerjasama, dan T_mitra
kemudian menghasilkan laporan HTML interaktif.

Patokan: T_dokumen_kerjasama.nomor_dokumen sebagai LEFT TABLE.

Kolom output:
  - nomor_dokumen        (T_dokumen_kerjasama)
  - tanggal_penetapan    (T_dokumen_kerjasama)
  - link_dokumen         (T_dokumen_kerjasama)
  - tanggal_pengajuan    (T_pengajuan_kerjasama)
  - tentang              (T_pengajuan_kerjasama)
  - nama_mitra           (T_mitra.mitra)
"""

import os
import sys
import json
import webbrowser
import pandas as pd
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent          # d:\repos\kerjasama
DATA_DIR = PROJECT_ROOT / "data"
TEMPLATE_PATH = SCRIPT_DIR / "template.html"
OUTPUT_PATH = SCRIPT_DIR / "laporan_pengajuan.html"
OUTPUT_CSV = SCRIPT_DIR / "laporan_pengajuan.csv"

# CSV file names
CSV_DOKUMEN = DATA_DIR / "T_dokumen_kerjasama - T_dokumen_kerjasama.csv"
CSV_PENGAJUAN = DATA_DIR / "T_pengajuan_kerjasama - T_pengajuan_kerjasama.csv"
CSV_MITRA = DATA_DIR / "T_mitra - T_mitra.csv"
CSV_M_MITRA = DATA_DIR / "M_mitra_bekerjasama - M_mitra_bekerjasama.csv"


def load_data():
    """Load all required CSVs into DataFrames."""
    df_dokumen = pd.read_csv(CSV_DOKUMEN, dtype=str)
    df_pengajuan = pd.read_csv(CSV_PENGAJUAN, dtype=str)
    df_mitra = pd.read_csv(CSV_MITRA, dtype=str)
    df_m_mitra = pd.read_csv(CSV_M_MITRA, dtype=str)
    return df_dokumen, df_pengajuan, df_mitra, df_m_mitra


def merge_data(df_dokumen, df_pengajuan, df_mitra, df_m_mitra):
    """
    Join chain (all LEFT JOINs from T_dokumen_kerjasama):
      T_dokumen_kerjasama
        LEFT JOIN T_pengajuan_kerjasama
          ON dokumen.ref_pengajuan_kerjasama = pengajuan.id
        LEFT JOIN M_mitra_bekerjasama
          ON pengajuan.id = m_mitra.ref_pengajuan_kerjasama
        LEFT JOIN T_mitra
          ON m_mitra.ref_mitra = mitra.id
    """
    # 1. Dokumen ← Pengajuan
    df = df_dokumen.merge(
        df_pengajuan[["id", "tanggal_pengajuan", "tentang"]],
        left_on="ref_pengajuan_kerjasama",
        right_on="id",
        how="left",
        suffixes=("", "_pengajuan"),
    )

    # 2. ← M_mitra_bekerjasama (bisa many-to-one, satu pengajuan banyak mitra)
    df = df.merge(
        df_m_mitra[["ref_pengajuan_kerjasama", "ref_mitra"]],
        left_on="ref_pengajuan_kerjasama",
        right_on="ref_pengajuan_kerjasama",
        how="left",
        suffixes=("", "_m"),
    )

    # 3. ← T_mitra
    df = df.merge(
        df_mitra[["id", "mitra"]],
        left_on="ref_mitra",
        right_on="id",
        how="left",
        suffixes=("", "_mitra"),
    )

    # Select & rename final columns
    result = df[[
        "nomor_dokumen",
        "tanggal_penetapan",
        "link_dokumen",
        "tanggal_pengajuan",
        "tentang",
        "mitra",
    ]].copy()

    result.rename(columns={"mitra": "nama_mitra"}, inplace=True)

    # Clean up NaN → empty string for display
    result.fillna("", inplace=True)

    return result


def format_date(val):
    """Try to parse and reformat date strings to DD-MM-YYYY."""
    if not val or pd.isna(val):
        return ""
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(val).strip(), fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue
    return str(val)


def build_html(df):
    """Generate the HTML report from template + data."""
    # Format dates for display
    df["tanggal_penetapan"] = df["tanggal_penetapan"].apply(format_date)
    df["tanggal_pengajuan"] = df["tanggal_pengajuan"].apply(format_date)

    # Convert to list of dicts for JSON embedding
    records = df.to_dict(orient="records")

    # Read template
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    # Inject data
    html = template.replace("/* __DATA_PLACEHOLDER__ */[]", json.dumps(records, ensure_ascii=False))
    html = html.replace("__TOTAL_ROWS__", str(len(records)))
    html = html.replace("__GENERATED_AT__", datetime.now().strftime("%d-%m-%Y %H:%M:%S"))

    # Write output
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"[OK] Laporan berhasil dibuat: {OUTPUT_PATH}")
    print(f"   Total baris: {len(records)}")
    return OUTPUT_PATH


def save_csv(df):
    """Save the merged data as CSV."""
    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"[OK] CSV berhasil disimpan: {OUTPUT_CSV}")


def main():
    print("[1/4] Memuat data CSV...")
    df_dokumen, df_pengajuan, df_mitra, df_m_mitra = load_data()

    print("[2/4] Menggabungkan tabel...")
    df_result = merge_data(df_dokumen, df_pengajuan, df_mitra, df_m_mitra)

    print("[3/4] Membuat laporan HTML...")
    output = build_html(df_result)

    print("[4/4] Menyimpan CSV...")
    save_csv(df_result)

    # Auto-open in browser
    webbrowser.open(str(output))


if __name__ == "__main__":
    main()
