import requests
import re
import urllib.parse

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

for url in urls:
    doc_id_match = re.search(r'/d/([^/]+)', url)
    gid_match = re.search(r'[#&?]gid=(\d+)', url)
    if not doc_id_match:
        continue
        
    doc_id = doc_id_match.group(1)
    gid = gid_match.group(1) if gid_match else "0"
    
    export_url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv&gid={gid}"
    
    try:
        res = requests.head(export_url, allow_redirects=True)
        cd = res.headers.get('Content-Disposition', '')
        print(f"URL: {url}")
        print(f"  Export URL: {export_url}")
        print(f"  Content-Disposition: {cd}")
    except Exception as e:
        print(f"URL: {url} ERROR: {e}")
