import requests
import re

ids = [
    "1nSRy_Hp43nZiVfioeIg6WHNDIlcsWW7uIu82WfYIe9s",
    "1KHkVsayOWit_joPm0jJzZLYdAJ4H3z1o-JOJKdn5EUQ",
    "12O0Fsm92kb-trJgmAsHr9-g7g2MUEhmgjQt1mHXkLXQ",
    "16SMLXAmA-WIC2sTEQO8CDFyNwzgWAciXj7C-ypHr3yg",
    "1BAh1-GwCWcQ-glowtRkpsbJT88U8klXr3C36R-SKEtE",
    "1031e0QxCLfWxlV0K0oNKCX1OYANxqKWDp3DkM-A0TVs",
    "1PeUgXF0t8zqEP42t_VL4XwsRVowJUZXVY4cGXJSz8bc",
    "18EQvPd_dNOk28sT0zGgOIDKgEX_rkcWaGm3yPmo9-0I",
    "14XViASsWRowKqAVnIXijmFIYH5OYSWeKEF9vCPocfSE",
    "1NHyH2HsfbLOxE0Bw9yr1H6HdwYKjL4sV8ONE3tWmEdQ",
    "1wVc9lrH13OBFLDIHdIQ_GM46rB0YsK8dAFE7it7SGGw",
    "1atyp9Byra2O4-eqxk1AtFILKbmiTEp6vvW6df_aI4IE",
    "19OxrS96odIhzEwXRP3FggQJ_zwkT9CpHmkJZxiEazas",
]

for doc_id in ids:
    print(f"Checking ID: {doc_id}")
    for gid in [0, 1318839330, 787069233, 1, 2]:
        url = f"https://docs.google.com/spreadsheets/d/{doc_id}/export?format=csv&gid={gid}"
        try:
            res = requests.get(url, stream=True, timeout=5)
            if res.status_code == 200:
                cd = res.headers.get('Content-Disposition', '')
                first_line = ""
                try:
                    first_line = next(res.iter_lines()).decode('utf-8')
                except: pass
                
                if "DOCTYPE html" not in first_line:
                    print(f"  GID {gid}: {cd} | First line: {first_line[:50]}")
        except: pass
