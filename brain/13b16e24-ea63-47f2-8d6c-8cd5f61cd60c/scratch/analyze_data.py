import pandas as pd
import os

data_dir = 'd:/repos/kerjasama/data'

tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)

print(f"T_dokumen_kerjasama rows: {len(tdk)}")
print(f"M_kegiatan_kerjasama rows: {len(mkk)}")
print(f"T_kegiatan rows: {len(tkeg)}")

# Check ref_kegiatan in T_dokumen_kerjasama
tdk_with_kegiatan = tdk[tdk['ref_kegiatan'].notna()]
print(f"T_dokumen_kerjasama with ref_kegiatan: {len(tdk_with_kegiatan)}")

# Check mapping in M_kegiatan_kerjasama
mkk_unique_docs = mkk['ref_dokumen_kerjasama'].nunique()
print(f"Unique documents in M_kegiatan_kerjasama: {mkk_unique_docs}")

# Check if T_kegiatan has wilayah_kerjasama and kategori_kegiatan
print("\nSample T_kegiatan:")
print(tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']].head())

# Check empty counts in T_kegiatan
print("\nEmpty counts in T_kegiatan:")
print(tkeg[['wilayah_kerjasama', 'kategori_kegiatan']].isna().sum())

# Try the merge as done in the script
df_mkk = pd.merge(mkk, tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                  left_on='ref_kegiatan', right_on='id', how='left')

df = pd.merge(tdk, df_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']], 
              left_on='id', right_on='ref_dokumen_kerjasama', how='left')

print("\nResult of merge (first 5):")
print(df[['id', 'wilayah_kerjasama', 'kategori_kegiatan']].head())

print("\nEmpty counts in merged df:")
print(df[['wilayah_kerjasama', 'kategori_kegiatan']].isna().sum())
