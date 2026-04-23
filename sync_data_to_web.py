import os, json, pandas as pd
from datetime import datetime

def safe(val):
    if val is None: return ''
    try:
        if pd.isna(val): return ''
    except: pass
    s = str(val).strip()
    return '' if s.lower() in ('nan','none','nat','<na>') else s

def generate_ts_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data')
    output_path = os.path.join(base_dir, 'fungsi', 'main_table', 'src', 'lib', 'data.ts')
    
    print(f"Reading data from {data_dir}...")
    
    tDok = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
    tPeng = pd.read_csv(f"{data_dir}/T_pengajuan_kerjasama.csv", dtype=str)
    mMitra = pd.read_csv(f"{data_dir}/M_mitra_bekerjasama.csv", dtype=str)
    tMitra = pd.read_csv(f"{data_dir}/T_mitra.csv", dtype=str)
    tPerson = pd.read_csv(f"{data_dir}/T_person.csv", dtype=str)

    pengajuan = {safe(r.get('id')): r.to_dict() for _,r in tPeng.iterrows() if safe(r.get('id'))}
    mitra_map = {safe(r.get('id')): r.to_dict() for _,r in tMitra.iterrows() if safe(r.get('id'))}
    person_map = {safe(r.get('id')): r.to_dict() for _,r in tPerson.iterrows() if safe(r.get('id'))}

    peng_mitras = {}
    for _,m in mMitra.iterrows():
        pid = safe(m.get('ref_pengajuan_kerjasama'))
        if not pid: continue
        mi = mitra_map.get(safe(m.get('ref_mitra')))
        if not mi: continue
        pic = person_map.get(safe(m.get('ref_pic_mitra')), {})
        pndt = person_map.get(safe(m.get('ref_penandatangan_mitra')), {})
        
        info = {
            'nama': safe(mi.get('mitra')),
            'kategori': safe(mi.get('kategori_mitra')),
            'logo': safe(mi.get('logo')),
            'penandatangan_mitra': safe(pndt.get('nama')),
            'penandatangan_mitra_telepon': safe(pndt.get('telepon')),
            'penandatangan_mitra_email': safe(pndt.get('email')),
            'pic_mitra': safe(pic.get('nama')),
            'pic_mitra_telepon': safe(pic.get('telepon')),
            'pic_mitra_email': safe(pic.get('email')),
            'email_mitra': safe(mi.get('email')),
            'telepon_mitra': safe(mi.get('telepon')),
            'website_mitra': safe(mi.get('website')),
            'alamat': safe(mi.get('alamat')),
            'profil': safe(mi.get('profil')),
        }
        peng_mitras.setdefault(pid, [])
        if info['nama'] not in [x['nama'] for x in peng_mitras[pid]]:
            peng_mitras[pid].append(info)

    seen = set()
    records = []
    for _,dok in tDok.iterrows():
        did = safe(dok.get('id'))
        if not did or did in seen: continue
        seen.add(did)
        ref_p = safe(dok.get('ref_pengajuan_kerjasama'))
        p = pengajuan.get(ref_p, {})
        pndt_polnep = person_map.get(safe(dok.get('ref_penandatangan')), {})
        inisiator = person_map.get(safe(p.get('inisiator')), {})
        mitras = peng_mitras.get(ref_p, [])

        records.append({
            'id': did,
            'jenis_dokumen': safe(p.get('jenis_dokumen')),
            'nomor_dokumen': safe(dok.get('nomor_dokumen')),
            'link_dokumen': safe(dok.get('link_dokumen')),
            'tentang': safe(p.get('tentang')),
            'tanggal_penetapan': safe(dok.get('tanggal_penetapan')),
            'tanggal_mulai': safe(dok.get('tanggal_mulai')),
            'tanggal_berakhir': safe(dok.get('tanggal_berakhir')),
            'deskripsi': safe(dok.get('deskripsi')),
            'ref_mou': safe(dok.get('ref_mou')),
            'nama_penandatangan': safe(pndt_polnep.get('nama')),
            'jabatan_penandatangan': safe(dok.get('jabatan_penandatangan')),
            'program': safe(dok.get('program')),
            'wilayah_kerjasama': safe(p.get('wilayah_kerjasama')),
            'judul_dokumen': safe(p.get('judul_dokumen')),
            'nama_inisiator': safe(inisiator.get('nama')),
            'inisiasi': safe(p.get('inisiasi')),
            'unit_polnep': safe(p.get('unit_polnep')),
            'mitras': mitras
        })

    print(f"Syncing {len(records)} records...")
    
    ts_content = f"""export interface MitraInfo {{
  nama: string;
  kategori: string;
  logo?: string;
  penandatangan_mitra?: string;
  penandatangan_mitra_telepon?: string;
  penandatangan_mitra_email?: string;
  pic_mitra?: string;
  pic_mitra_telepon?: string;
  pic_mitra_email?: string;
  email_mitra?: string;
  telepon_mitra?: string;
  website_mitra?: string;
  alamat?: string;
  profil?: string;
}}

export interface JoinedDokumen {{
  id: string;
  jenis_dokumen: string;
  nomor_dokumen: string;
  link_dokumen?: string;
  tentang: string;
  tanggal_penetapan: string;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  deskripsi?: string;
  ref_mou?: string;
  nama_penandatangan?: string;
  jabatan_penandatangan?: string;
  program?: string;
  wilayah_kerjasama?: string;
  judul_dokumen?: string;
  nama_inisiator?: string;
  inisiasi?: string;
  unit_polnep?: string;
  mitras: MitraInfo[];
}}

const DATA: JoinedDokumen[] = {json.dumps(records, indent=2)};

export function loadData(): JoinedDokumen[] {{
  return DATA;
}}
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print(f"Success! Web data updated at: {output_path}")

if __name__ == '__main__':
    generate_ts_data()
