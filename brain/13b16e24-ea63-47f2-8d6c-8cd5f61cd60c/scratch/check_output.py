import pandas as pd
df = pd.read_csv('d:/repos/kerjasama/fungsi/analisis_pemecah_folder/Tabel_Link_Dokumen_Terurut.csv')
print(f"Total rows: {len(df)}")
print(f"Empty Wilayah: {df['Wilayah'].isna().sum()}")
print(f"Empty Kerja Sama: {df['Kerja Sama'].isna().sum()}")
print("\nSample populated rows:")
print(df[df['Wilayah'].notna()].head())
