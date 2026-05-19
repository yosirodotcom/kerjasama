import pandas as pd
import os

data_dir = 'd:/repos/kerjasama/data'

tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)

# Pre-clean tkeg
tkeg_min = tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']].copy()
tkeg_min = tkeg_min.rename(columns={'id': 'keg_id'})
tkeg_min = tkeg_min.drop_duplicates(subset=['keg_id'])
tkeg_min = tkeg_min[tkeg_min['keg_id'].notna()]

# 1. Join direct from TDK
df = pd.merge(tdk, tkeg_min, left_on='ref_kegiatan', right_on='keg_id', how='left')

# 2. Join from MKK
df_mkk = pd.merge(mkk, tkeg_min, left_on='ref_kegiatan', right_on='keg_id', how='left')
df_mkk = df_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']]

# Merge with MKK data
df = pd.merge(df, df_mkk, left_on='id', right_on='ref_dokumen_kerjasama', how='left', suffixes=('', '_mkk'))

# Coalesce
df['Wilayah'] = df['wilayah_kerjasama'].fillna(df['wilayah_kerjasama_mkk'])
df['Kerja Sama'] = df['kategori_kegiatan'].fillna(df['kategori_kegiatan_mkk'])

print(f"Total rows: {len(df)}")
print(f"Empty Wilayah: {df['Wilayah'].isna().sum()}")
print(f"Empty Kerja Sama: {df['Kerja Sama'].isna().sum()}")

# Compare with original logic
df_orig_mkk = pd.merge(mkk, tkeg_min, left_on='ref_kegiatan', right_on='keg_id', how='left')
df_orig = pd.merge(tdk, df_orig_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                   left_on='id', right_on='ref_dokumen_kerjasama', how='left')

print("\nOriginal logic:")
print(f"Empty Wilayah: {df_orig['wilayah_kerjasama'].isna().sum()}")
print(f"Empty Kerja Sama: {df_orig['kategori_kegiatan'].isna().sum()}")
