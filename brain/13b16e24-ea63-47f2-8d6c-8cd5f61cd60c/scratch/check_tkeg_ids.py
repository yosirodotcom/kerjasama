import pandas as pd
data_dir = 'd:/repos/kerjasama/data'
tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)
print(f"T_kegiatan rows: {len(tkeg)}")
print(f"T_kegiatan ID nulls: {tkeg['id'].isna().sum()}")
print(f"T_kegiatan ID duplicates: {tkeg['id'].duplicated().sum()}")
