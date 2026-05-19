import pandas as pd
import os

data_dir = 'd:/repos/kerjasama/data'

tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)

print(f"Original TDK rows: {len(tdk)}")

df_direct = pd.merge(tdk, tkeg[['id', 'wilayah_kerjasama', 'kategori_kegiatan']], 
                     left_on='ref_kegiatan', right_on='id', how='left')
print(f"Direct Merge rows: {len(df_direct)}")

# Check for empty ref_kegiatan
print(f"TDK ref_kegiatan nulls: {tdk['ref_kegiatan'].isna().sum()}")
print(f"TDK ref_kegiatan unique non-nulls: {tdk['ref_kegiatan'].dropna().nunique()}")

# Look at some values in ref_kegiatan
print("Sample ref_kegiatan in TDK:")
print(tdk['ref_kegiatan'].head(10))
