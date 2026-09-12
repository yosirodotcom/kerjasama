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
    output_path = os.path.join(base_dir, 'src', 'lib', 'data.ts')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"Reading data from {data_dir}...")
    
    tDok = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
    tPeng = pd.read_csv(f"{data_dir}/T_pengajuan_kerjasama.csv", dtype=str)
    mMitra = pd.read_csv(f"{data_dir}/M_mitra_bekerjasama.csv", dtype=str)
    tMitra = pd.read_csv(f"{data_dir}/T_mitra.csv", dtype=str)
    tPerson = pd.read_csv(f"{data_dir}/T_person.csv", dtype=str)
    mKeg = pd.read_csv(f"{data_dir}/M_kegiatan_kerjasama.csv", dtype=str) if os.path.exists(f"{data_dir}/M_kegiatan_kerjasama.csv") else pd.DataFrame()
    mUnit = pd.read_csv(f"{data_dir}/M_unit_pelaksana_kerjasama.csv", dtype=str) if os.path.exists(f"{data_dir}/M_unit_pelaksana_kerjasama.csv") else pd.DataFrame()
    tUnit = pd.read_csv(f"{data_dir}/T_unit_pelaksana_kegiatan.csv", dtype=str) if os.path.exists(f"{data_dir}/T_unit_pelaksana_kegiatan.csv") else pd.DataFrame()

    pengajuan = {safe(r.get('id')): r.to_dict() for _,r in tPeng.iterrows() if safe(r.get('id'))}
    mitra_map = {safe(r.get('id')): r.to_dict() for _,r in tMitra.iterrows() if safe(r.get('id'))}
    person_map = {safe(r.get('id')): r.to_dict() for _,r in tPerson.iterrows() if safe(r.get('id'))}
    unit_map = {safe(r.get('id')): r.to_dict() for _,r in tUnit.iterrows() if safe(r.get('id'))}

    # Map activity ID (ref_kegiatan) -> list of unit records
    keg_units = {}
    if not mUnit.empty:
        for _, mu in mUnit.iterrows():
            kid = safe(mu.get('ref_kegiatan'))
            uid = safe(mu.get('ref_unit_pelaksana_kegiatan'))
            if not kid or not uid: continue
            uinfo = unit_map.get(uid)
            if uinfo:
                keg_units.setdefault(kid, []).append(uinfo)

    # Map document ID -> list of activity IDs (from M_kegiatan_kerjasama and T_dokumen_kerjasama.ref_kegiatan)
    doc_kegs = {}
    if not mKeg.empty:
        for _, mk in mKeg.iterrows():
            did = safe(mk.get('ref_dokumen_kerjasama'))
            kid = safe(mk.get('ref_kegiatan'))
            if did and kid:
                doc_kegs.setdefault(did, []).append(kid)

    for _, dok in tDok.iterrows():
        did = safe(dok.get('id'))
        kid = safe(dok.get('ref_kegiatan'))
        if did and kid:
            doc_kegs.setdefault(did, [])
            if kid not in doc_kegs[did]:
                doc_kegs[did].append(kid)

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
            'negara_mitra': safe(mi.get('negara_mitra')),
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

        # Determine wilayah_kerjasama based on mitras
        negara_list = [m.get('negara_mitra', '').upper() for m in (peng_mitras.get(ref_p, []))]
        negara_list = [n for n in negara_list if n] # filter empty
        
        wilayah = ''
        if negara_list:
            if all(n == 'INDONESIA' for n in negara_list):
                wilayah = 'NASIONAL'
            else:
                wilayah = 'INTERNASIONAL'

        # Collect unit pelaksana details (kampus, jurusan, prodi, rektorat)
        kids = doc_kegs.get(did, [])
        kampus_list = []
        jurusan_list = []
        prodi_list = []
        rektorat_list = []
        
        for kid in kids:
            units = keg_units.get(kid, [])
            for u in units:
                k = safe(u.get('kampus'))
                j = safe(u.get('jurusan'))
                p_item = safe(u.get('prodi'))
                r = safe(u.get('rektorat'))
                
                if k and k not in kampus_list: kampus_list.append(k)
                if j and j not in jurusan_list: jurusan_list.append(j)
                if p_item and p_item not in prodi_list: prodi_list.append(p_item)
                if r and r not in rektorat_list: rektorat_list.append(r)

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
            'wilayah_kerjasama': wilayah,
            'judul_dokumen': safe(p.get('judul_dokumen')),
            'nama_inisiator': safe(inisiator.get('nama')),
            'inisiasi': safe(p.get('inisiasi')),
            'unit_pengaju': safe(p.get('unit_polnep')),
            'pic_unit_pengaju': safe(inisiator.get('nama')),
            'kampus': ', '.join(kampus_list),
            'jurusan': ', '.join(jurusan_list),
            'prodi': ', '.join(prodi_list),
            'rektorat': ', '.join(rektorat_list),
            'mitras': mitras
        })

    print(f"Syncing {len(records)} records...")
    
    ts_content = f"""export interface MitraInfo {{
  nama: string;
  kategori: string;
  negara_mitra?: string;
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
  unit_pengaju?: string;
  pic_unit_pengaju?: string;
  kampus?: string;
  jurusan?: string;
  prodi?: string;
  rektorat?: string;
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
