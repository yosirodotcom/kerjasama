import pandas as pd
import requests
import re
import urllib.parse
import os
import sys

def download_data_via_api(config_path=".agents/skills/data-sync/assets/sheets_config.json", output_dir="data"):
    """
    Downloads Google Sheets data as CSV based on a JSON configuration.
    This replaces the hardcoded URLs in data_handler.py for better maintainability.
    """
    import json
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file not found at {config_path}")
        return False

    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return False

    os.makedirs(output_dir, exist_ok=True)
    urls = config.get("urls", [])
    total = len(urls)
    success_count = 0

    print(f"Starting download of {total} tables...")

    for i, item in enumerate(urls):
        # Allow both string URL or object with 'url' and optional 'filename'
        if isinstance(item, str):
            url = item
            custom_filename = None
        else:
            url = item.get("url")
            custom_filename = item.get("filename")

        if not url:
            continue

        doc_id_match = re.search(r'/d/([^/]+)', url)
        gid_match = re.search(r'[#&?]gid=(\d+)', url)
        
        if not doc_id_match:
            print(f"Skipping invalid URL: {url}")
            continue
            
        doc_id = doc_id_match.group(1)
        gid = gid_match.group(1) if gid_match else "0"
        export_url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv&gid={gid}"
        
        try:
            res = requests.get(export_url, timeout=30)
            res.raise_for_status()
            
            filename = custom_filename
            if not filename:
                cd = res.headers.get('Content-Disposition', '')
                matches = re.findall(r'filename\*?=UTF-8\'\'(.+?)$', cd)
                if not matches:
                    matches = re.findall(r'filename=\"?([^\"]+)\"?', cd)
                
                if matches:
                    filename = urllib.parse.unquote(matches[0]).strip('"\'')
                    if " - " in filename:
                        filename = filename.split(" - ")[-1]
                else:
                    filename = f"table_{gid}.csv"

            if not filename.endswith('.csv'):
                filename += '.csv'

            filepath = os.path.join(output_dir, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(res.text)
            
            success_count += 1
            print(f"[{i+1}/{total}] Success: {filename}")
                
        except Exception as e:
            print(f"[{i+1}/{total}] Failed: {url} | Error: {e}")

    print(f"\nDownload finished. {success_count}/{total} files updated.")
    return success_count == total

if __name__ == "__main__":
    download_data_via_api()
