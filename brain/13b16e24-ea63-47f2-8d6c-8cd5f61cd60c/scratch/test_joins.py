import pandas as pd
import os

data_dir = 'd:/repos/kerjasama/data'

tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)

# Method 1: Current logic (via M_kegiatan_kerjasama)
df_mkk = pd.merge(mkk, tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                  left_on='ref_kegiatan', right_on='id', how='left')
df_current = pd.merge(tdk, df_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                      left_on='id', right_on='ref_dokumen_kerjasama', how='left')

# Method 2: Direct link via T_dokumen_kerjasama.ref_kegiatan
df_direct = pd.merge(tdk, tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                     left_on='ref_kegiatan', right_on='id', how='left')

print("Method 1 (Current) - Empty counts:")
print(df_current[['wilayah_kerjasama', 'kategori_kegiatan']].isna().sum())

print("\nMethod 2 (Direct) - Empty counts:")
print(df_direct[['wilayah_kerjasama', 'kategori_kegiatan']].isna().sum())

# Combine both: Use direct link, then fill missing with MKK link
df_combined = df_direct.copy()
# Merge with MKK to get backup values
df_mkk_backup = pd.merge(tdk[['id']], df_mkk[['ref_dokumen_kerjasama', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                         left_on='id', right_on='ref_dokumen_kerjasama', how='left')

df_combined['wilayah_kerjasama'] = df_combined['wilayah_kerjasama'].fillna(df_mkk_backup['wilayah_kerjasama'])
df_combined['kategori_kegiatan'] = df_combined['kategori_kegiatan'].fillna(df_mkk_backup['kategori_kegiatan'])

print("\nMethod 3 (Combined) - Empty counts:")
print(df_combined[['wilayah_kerjasama', 'kategori_kegiatan']].isna().sum())
