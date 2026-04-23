import pandas as pd
import requests
import csv
import io
import time
import datetime
import re
import urllib.parse
import os
import glob
import requests
import urllib.parse
import requests

def download_all_sheets(download_dir="data", progress_callback=None):
    urls = [
        "https://docs.google.com/spreadsheets/d/1nSRy_Hp43nZiVfioeIg6WHNDIlcsWW7uIu82WfYIe9s/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1KHkVsayOWit_joPm0jJzZLYdAJ4H3z1o-JOJKdn5EUQ/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/12O0Fsm92kb-trJgmAsHr9-g7g2MUEhmgjQt1mHXkLXQ/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/16SMLXAmA-WIC2sTEQO8CDFyNwzgWAciXj7C-ypHr3yg/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1BAh1-GwCWcQ-glowtRkpsbJT88U8klXr3C36R-SKEtE/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1031e0QxCLfWxlV0K0oNKCX1OYANxqKWDp3DkM-A0TVs/edit?gid=787069233#gid=787069233",
        "https://docs.google.com/spreadsheets/d/1PeUgXF0t8zqEP42t_VL4XwsRVowJUZXVY4cGXJSz8bc/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/18EQvPd_dNOk28sT0zGgOIDKgEX_rkcWaGm3yPmo9-0I/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/14XViASsWRowKqAVnIXijmFIYH5OYSWeKEF9vCPocfSE/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1NHyH2HsfbLOxE0Bw9yr1H6HdwYKjL4sV8ONE3tWmEdQ/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1wVc9lrH13OBFLDIHdIQ_GM46rB0YsK8dAFE7it7SGGw/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/1atyp9Byra2O4-eqxk1AtFILKbmiTEp6vvW6df_aI4IE/edit?gid=0#gid=0",
        "https://docs.google.com/spreadsheets/d/19OxrS96odIhzEwXRP3FggQJ_zwkT9CpHmkJZxiEazas/edit?gid=0#gid=0",
    ]
    urls = list(dict.fromkeys(urls))
    os.makedirs(download_dir, exist_ok=True)
    
    total = len(urls)
    for i, original_url in enumerate(urls):
        doc_id_match = re.search(r'/d/([^/]+)', original_url)
        gid_match = re.search(r'[#&?]gid=(\d+)', original_url)
        if not doc_id_match:
            continue
            
        doc_id = doc_id_match.group(1)
        gid = gid_match.group(1) if gid_match else "0"
        
        export_url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv&gid={gid}"
        
        try:
            res = requests.get(export_url)
            res.raise_for_status()
            
            cd = res.headers.get('Content-Disposition', '')
            matches = re.findall(r'filename\*?=UTF-8\'\'(.+?)$', cd)
            if not matches:
                matches = re.findall(r'filename=\"?([^\"]+)\"?', cd)
                
            filename = f"table_{gid}.csv"
            if matches:
                filename = urllib.parse.unquote(matches[0])
                filename = filename.strip('"\'')
                if " - " in filename:
                    filename = filename.split(" - ")[-1]

            if not filename.endswith('.csv'):
                filename += '.csv'

            filepath = os.path.join(download_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(res.content)
                
            if progress_callback:
                # pass progress percentage (0.0 to 1.0) and the name of file downloaded
                progress_callback((i + 1) / total, filename)
                
        except Exception as e:
            if progress_callback:
                progress_callback((i + 1) / total, f"Error: {e}")

def load_joined_data(data_dir="data"):
    # Load all required tables
    try:
        tdk = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
        tpk = pd.read_csv(f"{data_dir}/T_pengajuan_kerjasama.csv", dtype=str)
        person = pd.read_csv(f"{data_dir}/T_person.csv", dtype=str)
        mmb = pd.read_csv(f"{data_dir}/M_mitra_bekerjasama.csv", dtype=str)
        tmitra = pd.read_csv(f"{data_dir}/T_mitra.csv", dtype=str)
        mkk = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str)
        tkeg = pd.read_csv(f"{data_dir}/T_kegiatan.csv", dtype=str)
    except Exception as e:
        print(f"Error loading CSV files: {e}")
        return pd.DataFrame()

    tdk['tanggal_penetapan_dt'] = pd.to_datetime(tdk['tanggal_penetapan'], errors='coerce')
    tdk['tanggal_berakhir_dt'] = pd.to_datetime(tdk['tanggal_berakhir'], errors='coerce')
    
    tdk['status_laporkerma'] = tdk['status_laporkerma'].fillna('BELUM').astype(str).str.upper()
    
    tdk_filtered = tdk[
        (tdk['tanggal_penetapan_dt'] > pd.Timestamp('2025-01-01')) &
        ((tdk['status_laporkerma'] == 'FALSE') | (tdk['status_laporkerma'] == '0') | (tdk['status_laporkerma'] == 'BELUM') | (tdk['status_laporkerma'] == 'NAN'))
    ].copy()

    # 1. Self Join for MOU
    mou_dok = tdk[['id', 'nomor_dokumen']].rename(columns={'nomor_dokumen': 'MOU'})
    df = pd.merge(tdk_filtered, mou_dok, left_on='ref_mou', right_on='id', how='left', suffixes=('', '_mou'))

    # 2. INNER JOIN tpk
    df = pd.merge(df, tpk, left_on='ref_pengajuan_kerjasama', right_on='id', how='inner', suffixes=('', '_tpk'))

    # 3. LEFT JOIN person_polnep
    person_polnep = person[['id', 'nama']].rename(columns={'nama': 'Nama_Penandatangan_Polnep'})
    df = pd.merge(df, person_polnep, left_on='ref_penandatangan', right_on='id', how='left', suffixes=('', '_ppolnep'))

    # 4. LEFT JOIN person_pic_polnep
    person_pic_polnep = person[['id', 'nama']].rename(columns={'nama': 'PIC_Polnep'})
    df = pd.merge(df, person_pic_polnep, left_on='inisiator', right_on='id', how='left', suffixes=('', '_picpolnep'))

    # 5. LEFT JOIN mmb
    df = pd.merge(df, mmb, left_on='ref_pengajuan_kerjasama', right_on='ref_pengajuan_kerjasama', how='left', suffixes=('', '_mmb'))

    # 6. LEFT JOIN tmitra
    tmitra_subset = tmitra[['id', 'mitra', 'kategori_mitra', 'alamat', 'negara_mitra', 'telepon', 'email', 'website']].rename(columns={
        'kategori_mitra': 'Klasifikasi_Mitra',
        'alamat': 'Alamat_Mitra',
        'negara_mitra': 'Negara_Mitra',
        'telepon': 'Telepon_Mitra',
        'email': 'Email_Mitra',
        'website': 'Website_Mitra',
        'mitra': 'Mitra'
    })
    df = pd.merge(df, tmitra_subset, left_on='ref_mitra', right_on='id', how='left', suffixes=('', '_tmitra'))

    # 7. LEFT JOIN person_mitra_sign
    person_mitra_sign = person[['id', 'nama', 'email', 'telepon']].rename(columns={
        'nama': 'Nama_Penandatangan_Mitra',
        'email': 'Email_Penandatangan_Mitra',
        'telepon': 'Telepon_Penandatangan_Mitra'
    })
    df = pd.merge(df, person_mitra_sign, left_on='ref_penandatangan_mitra', right_on='id', how='left', suffixes=('', '_pmsign'))

    # 8. LEFT JOIN person_mitra_pic
    person_mitra_pic = person[['id', 'nama', 'email', 'telepon']].rename(columns={
        'nama': 'PIC_Mitra',
        'email': 'Email_PIC_Mitra',
        'telepon': 'Telepon_PIC_Mitra'
    })
    df = pd.merge(df, person_mitra_pic, left_on='ref_pic_mitra', right_on='id', how='left', suffixes=('', '_pmpic'))

    # 9. LEFT JOIN mkk
    df = pd.merge(df, mkk, left_on='id', right_on='ref_dokumen_kerjasama', how='left', suffixes=('', '_mkk'))

    # 10. LEFT JOIN tkeg
    tkeg_subset = tkeg[['id', 'kategori_kegiatan', 'nilai_kontrak', 'output', 'outcome', 'sasaran_kegiatan', 'indikator_kinerja']].rename(columns={
        'kategori_kegiatan': 'Kegiatan',
        'nilai_kontrak': 'Nilai_Kontrak',
        'output': 'Luaran',
        'outcome': 'Outcome',
        'sasaran_kegiatan': 'Sasaran',
        'indikator_kinerja': 'Indikator_Kinerja'
    })
    # Since earlier merge with `mkk` is named 'ref_kegiatan', let's make sure it's accessible.
    df = pd.merge(df, tkeg_subset, left_on='ref_kegiatan', right_on='id', how='left', suffixes=('', '_tkeg'))

    def make_judul(row):
        words = str(row.get('judul_dokumen', '')).split(' ')
        title_cased = ' '.join([w.capitalize() for w in words if w])
        mitra = row.get('Mitra', '')
        tentang = row.get('tentang', '')
        return f"{title_cased} antara POLNEP dan {mitra} tentang {tentang}"
        
    df['Judul_Kerja_Sama'] = df.apply(make_judul, axis=1)

    now_tz = pd.Timestamp.now(tz='Asia/Pontianak').tz_localize(None)
    df['Status'] = df['tanggal_berakhir_dt'].apply(lambda x: 'Active' if pd.notnull(x) and x >= now_tz else 'Expired')

    df['Tanggal_Penetapan'] = df['tanggal_penetapan_dt'].dt.strftime('%d-%m-%Y')
    df['Tanggal_Berakhir'] = df['tanggal_berakhir_dt'].dt.strftime('%d-%m-%Y')

    final_cols = {
        'status_laporkerma': 'LaporKerma',
        'Status': 'Status',
        'Tanggal_Penetapan': 'Tanggal_Penetapan',
        'Tanggal_Berakhir': 'Tanggal_Berakhir',
        'jenis_dokumen': 'Jenis_Dokumen_Kerja_Sama',
        'nomor_dokumen': 'Nomor_Dokumen',
        'MOU': 'MOU',
        'Judul_Kerja_Sama': 'Judul_Kerja_Sama',
        'deskripsi': 'Deskripsi',
        'unit_terkait': 'unit',
        'Nama_Penandatangan_Polnep': 'Nama_Penandatangan_Polnep',
        'jabatan_penandatangan': 'Jabatan_Penandatangan_Polnep',
        'PIC_Polnep': 'PIC_Polnep',
        'alokasi_anggaran': 'alokasi_anggaran',
        'income_generate': 'income_generate',
        'Mitra': 'Mitra',
        'Nama_Penandatangan_Mitra': 'Nama_Penandatangan_Mitra',
        'jabatan_penandatangan_mitra': 'Jabatan_Penandatangan_Mitra',
        'PIC_Mitra': 'PIC_Mitra',
        'jabatan_pic_mitra': 'Jabatan_PIC_Mitra',
        'Klasifikasi_Mitra': 'Klasifikasi_Mitra',
        'Alamat_Mitra': 'Alamat_Mitra',
        'Negara_Mitra': 'Negara_Mitra',
        'Telepon_Mitra': 'Telepon_Mitra',
        'Website_Mitra': 'Website_Mitra',
        'Kegiatan': 'Kegiatan',
        'Nilai_Kontrak': 'Nilai_Kontrak',
        'Luaran': 'Luaran',
        'Outcome': 'Outcome',
        'Sasaran': 'Sasaran',
        'Indikator_Kinerja': 'Indikator_Kinerja'
    }

    # Deduplicate by tdk.id to ensure document-centric view
    df = df.drop_duplicates(subset=['id_x']) if 'id_x' in df.columns else df.drop_duplicates(subset=['id'])

    # Sorting Logic: Tanggal Penetapan ASC, then Dokumen (MOU -> PKS -> Others)
    df['jenis_dokumen_order'] = df['jenis_dokumen'].apply(lambda x: 1 if str(x).upper() == 'MOU' else (2 if str(x).upper() == 'PKS' else 3))
    df = df.sort_values(by=['tanggal_penetapan_dt', 'jenis_dokumen_order'], ascending=[True, True])

    final_df = df[list(final_cols.keys())].rename(columns=final_cols)
    
    # Fill NAs to render cleanly in UI
    final_df = final_df.fillna("")
    
    return final_df

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

def fetch_google_sheet_via_browser(url, download_dir="data"):
    """
    Automates downloading a Google Sheet as CSV using the browser.
    This ensures that Connected Sheets or complex queries trigger correctly.
    """
    print(f"Setting up browser for downloading into {download_dir}...")
    
    download_dir = os.path.abspath(download_dir)
    os.makedirs(download_dir, exist_ok=True)
    
    # Optional: Clear existing CSVs if this is a fresh pull
    for f in glob.glob(os.path.join(download_dir, "*.csv")):
        try: os.remove(f)
        except: pass

    options = webdriver.ChromeOptions()
    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "directory_upgrade": True,
        "safebrowsing.enabled": True
    }
    options.add_experimental_option("prefs", prefs)
    
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        if "/edit" in url:
            base_url = url.split("/edit")[0]
            gid = "0"
            if "gid=" in url:
                gid_part = url.split("gid=")[1]
                gid = gid_part.split("&")[0].split("#")[0]
            export_url = f"{base_url}/export?format=csv&gid={gid}"
        else:
            export_url = url

        print(f"Opening export URL via browser: {export_url}")
        driver.get(export_url)
        
        print("Waiting for file to finish downloading...")
        downloaded_file = None
        for _ in range(30):
            time.sleep(1)
            files = glob.glob(os.path.join(download_dir, "*.csv"))
            valid_files = [f for f in files if not f.endswith('.crdownload')]
            if valid_files:
                # Get the most recently created file in case there are multiple
                valid_files.sort(key=os.path.getmtime, reverse=True)
                downloaded_file = valid_files[0]
                break
                
        if downloaded_file:
            print(f"Downloaded successfully: {downloaded_file}")
            
            # Wait for file size to stabilize
            last_size = -1
            for _ in range(5):
                size = os.path.getsize(downloaded_file)
                if size == last_size and size > 0:
                    break
                last_size = size
                time.sleep(0.5)

            df = load_local_csv(downloaded_file)
            return df
        else:
            print("Download timed out.")
            return None
            
    except Exception as e:
        print(f"Browser download error: {e}")
        return None
    finally:
        time.sleep(1)
        driver.quit()

def fetch_google_sheet_data(url):
    """Fallback background download method (not used natively if browser is selected)"""
    try:
        if "/edit" in url:
            export_url = url.replace("/edit", "/export?format=csv&gid=0")
            base_url = url.split("/edit")[0]
            if "gid=" in url:
                gid = url.split("gid=")[1].split("&")[0].split("#")[0]
                export_url = f"{base_url}/export?format=csv&gid={gid}"
            else:
                export_url = f"{base_url}/export?format=csv&gid=1318839330"
        else:
            export_url = url

        print(f"Fetching data from: {export_url}")
        response = requests.get(export_url, timeout=60)
        response.raise_for_status()
        
        csv_data = response.content.decode('utf-8')
        df = pd.read_csv(io.StringIO(csv_data))
        df = df.fillna("")
        
        print(f"Successfully loaded {len(df)} rows.")
        return df
    
    except Exception as e:
        print(f"Error fetching Google Sheet: {e}")
        return None

def load_local_csv(filepath):
    """Loads data from a local CSV file."""
    try:
        df = pd.read_csv(filepath)
        df = df.fillna("")
        return df
    except Exception as e:
        print(f"Error loading local CSV: {e}")
        return None
