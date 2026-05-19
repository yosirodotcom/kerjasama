import requests
import re

doc_id = "1PeUgXF0t8zqEP42t_VL4XwsRVowJUZXVY4cGXJSz8bc"
for gid in range(0, 21):
    url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv&gid={gid}"
    try:
        res = requests.head(url, allow_redirects=True)
        cd = res.headers.get('Content-Disposition', '')
        if 'filename' in cd:
            print(f"GID {gid}: {cd}")
        else:
            # Try to get the first line if it's a valid CSV but no filename in header
            res_content = requests.get(url, stream=True)
            first_line = next(res_content.iter_lines()).decode('utf-8')
            print(f"GID {gid}: First line: {first_line[:100]}")
    except Exception as e:
        print(f"GID {gid}: ERROR: {e}")
