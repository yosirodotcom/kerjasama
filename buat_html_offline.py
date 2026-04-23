import os, json, pandas as pd
from datetime import datetime

def safe(val):
    if val is None: return ''
    try:
        if pd.isna(val): return ''
    except: pass
    s = str(val).strip()
    return '' if s.lower() in ('nan','none','nat','<na>') else s

def generate():
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    
    tDok = pd.read_csv(f"{data_dir}/T_dokumen_kerjasama.csv", dtype=str)
    tPeng = pd.read_csv(f"{data_dir}/T_pengajuan_kerjasama.csv", dtype=str)
    mMitra = pd.read_csv(f"{data_dir}/M_mitra_bekerjasama.csv", dtype=str)
    tMitra = pd.read_csv(f"{data_dir}/T_mitra.csv", dtype=str)
    tPerson = pd.read_csv(f"{data_dir}/T_person.csv", dtype=str)

    pengajuan = {}
    for _,r in tPeng.iterrows():
        k = safe(r.get('id'))
        if k: pengajuan[k] = r.to_dict()
    mitra_map = {}
    for _,r in tMitra.iterrows():
        k = safe(r.get('id'))
        if k: mitra_map[k] = r.to_dict()
    person_map = {}
    for _,r in tPerson.iterrows():
        k = safe(r.get('id'))
        if k: person_map[k] = r.to_dict()

    # Build mitras per pengajuan
    peng_mitras = {}
    for _,m in mMitra.iterrows():
        pid = safe(m.get('ref_pengajuan_kerjasama'))
        if not pid: continue
        mi = mitra_map.get(safe(m.get('ref_mitra')))
        if not mi: continue
        pic = person_map.get(safe(m.get('ref_pic_mitra')), {})
        pndt = person_map.get(safe(m.get('ref_penandatangan_mitra')), {})
        info = {
            'Mitra': safe(mi.get('mitra')),
            'Klasifikasi_Mitra': safe(mi.get('kategori_mitra')),
            'Nama_Penandatangan_Mitra': safe(pndt.get('nama')),
            'Telepon_Penandatangan_Mitra': safe(pndt.get('telepon')),
            'Email_Penandatangan_Mitra': safe(pndt.get('email')),
            'PIC_Mitra': safe(pic.get('nama')),
            'Telepon_PIC_Mitra': safe(pic.get('telepon')),
            'Email_PIC_Mitra': safe(pic.get('email')),
            'Email_Mitra': safe(mi.get('email')),
            'Telepon_Mitra': safe(mi.get('telepon')),
            'Website_Mitra': safe(mi.get('website')),
            'Alamat_Mitra': safe(mi.get('alamat')),
        }
        peng_mitras.setdefault(pid, [])
        if info['Mitra'] not in [x['Mitra'] for x in peng_mitras[pid]]:
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

        tgl = safe(dok.get('tanggal_berakhir'))
        status = 'Unknown'
        if tgl:
            for fmt in ('%Y-%m-%d','%m/%d/%Y','%d-%m-%Y','%d/%m/%Y'):
                try:
                    dt = datetime.strptime(tgl.split(' ')[0], fmt)
                    status = 'Expired' if dt < datetime.now() else 'Active'
                    break
                except: pass

        records.append({
            'id': did,
            'jenis_dokumen': safe(p.get('jenis_dokumen')),
            'nomor_dokumen': safe(dok.get('nomor_dokumen')),
            'link_dokumen': safe(dok.get('link_dokumen')),
            'tentang': safe(p.get('tentang')),
            'tanggal_penetapan': safe(dok.get('tanggal_penetapan')),
            'tanggal_mulai': safe(dok.get('tanggal_mulai')),
            'tanggal_berakhir': tgl,
            'deskripsi': safe(dok.get('deskripsi')),
            'Status': status,
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

    print(f"Total dokumen unik: {len(records)}")
    json_data = json.dumps(records, ensure_ascii=False)

    # Read inlined vendor assets for true offline support
    vendor_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(vendor_dir, 'vendor_tailwind.css'), 'r', encoding='utf-8') as f:
        tailwind_css = f.read()
    with open(os.path.join(vendor_dir, 'vendor_vue.js'), 'r', encoding='utf-8') as f:
        vue_js = f.read()

    html = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tabel Dokumen Kerja Sama</title>
<style>__TAILWIND_CSS__</style>
<script>__VUE_JS__</script>
<style>
body{background-color:#020617;color:#f1f5f9;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.cs::-webkit-scrollbar{width:8px;height:8px}.cs::-webkit-scrollbar-track{background:#0f172a}
.cs::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}[v-cloak]{display:none}
</style></head><body>
<div id="app" v-cloak class="w-full h-screen overflow-hidden flex flex-col selection:bg-indigo-500/30">
<div class="px-8 py-6 bg-slate-900 border-b border-slate-800 shadow-md relative z-40 shrink-0">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
<div><h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">Data Mitra Kerjasama</h1>
<p class="text-sm text-slate-400 mt-1">Versi portabel offline. Bisa dibuka langsung tanpa server.</p></div>
<div class="flex items-center gap-3">
<div class="relative w-72"><svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input type="text" v-model="globalSearch" placeholder="Cari Cepat..." class="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800 text-slate-100 placeholder-slate-500"></div>
<div class="relative"><button @click="showColMenu=!showColMenu" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg">&#128065; Pilih Kolom</button>
<div v-if="showColMenu" class="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 max-h-96 overflow-y-auto">
<label v-for="c in columns" :key="c.key" class="flex items-center gap-3 px-3 py-2 hover:bg-slate-700/50 rounded-lg cursor-pointer">
<input type="checkbox" v-model="c.visible" class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500">
<span class="text-sm font-medium text-slate-300">{{c.label}}</span></label></div></div></div></div></div>

<div class="flex-1 px-8 py-6 overflow-hidden flex flex-col min-h-0">
<div class="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex-1 flex flex-col min-h-0">
<div class="overflow-x-auto overflow-y-auto flex-1 cs">
<table class="w-full text-left border-collapse min-w-max">
<thead class="bg-slate-800 sticky top-0 z-20 shadow-md"><tr>
<template v-for="c in columns" :key="c.key"><th v-if="c.visible" @click="sortBy(c.key)" class="p-3 font-semibold text-slate-200 text-sm whitespace-nowrap cursor-pointer hover:bg-slate-700 transition-colors select-none border-b border-slate-700">
<div class="flex items-center justify-between gap-3">{{c.label}}
<span v-if="sortConfig.key===c.key" class="text-indigo-400 text-xs">{{sortConfig.direction==='asc'?'▲':'▼'}}</span>
<span v-else class="text-slate-600 text-xs">⇅</span></div></th></template></tr></thead>
<tbody class="divide-y divide-slate-800 bg-slate-900">
<tr v-for="(row,idx) in paginatedData" :key="idx" class="even:bg-slate-900/50 odd:bg-slate-900 hover:bg-slate-800 transition-colors">
<template v-for="c in columns" :key="c.key">
<td v-if="c.visible" class="p-3 text-sm text-slate-300 leading-relaxed" :class="isTextHeavy(c.key)?'whitespace-normal break-words min-w-[250px] max-w-[400px]':'whitespace-nowrap'">
<span v-if="c.key==='no'">{{(currentPage-1)*itemsPerPage+idx+1}}</span>
<span v-else-if="c.key==='nomor_dokumen'"><a v-if="row.link_dokumen" :href="row.link_dokumen" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline">{{row.nomor_dokumen||'-'}}</a><span v-else>{{row.nomor_dokumen||'-'}}</span></span>
<span v-else-if="c.key==='mitra'"><div class="flex flex-wrap gap-1.5 max-w-sm">
<button v-for="(m,i) in row.mitras" :key="i" @click="selectedMitra=m" class="inline-flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-slate-700 hover:text-indigo-300 transition-colors border border-slate-700 shadow-sm whitespace-normal text-left">{{m.Mitra||'-'}} <span class="text-indigo-400">ⓘ</span></button>
<span v-if="!row.mitras||row.mitras.length===0">-</span></div></span>
<span v-else-if="c.key==='Status'">
<span v-if="row.Status==='Active'" class="inline-flex px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-950/50 text-emerald-400 uppercase tracking-wider border border-emerald-800/50">Aktif</span>
<span v-else-if="row.Status==='Expired'" class="inline-flex px-2.5 py-1 rounded text-[11px] font-bold bg-rose-950/50 text-rose-400 uppercase tracking-wider border border-rose-800/50">Expired</span>
<span v-else class="inline-flex px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider border border-slate-700">Unknown</span></span>
<span v-else>{{row[c.key]||'-'}}</span></td></template></tr>
<tr v-if="paginatedData.length===0"><td :colspan="columns.filter(c=>c.visible).length" class="p-12 text-center text-slate-500">Tidak ada data ditemukan.</td></tr>
</tbody></table></div>

<div class="p-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
<div class="text-sm text-slate-400">Menampilkan <b class="text-slate-200">{{(currentPage-1)*itemsPerPage+1}}</b> - <b class="text-slate-200">{{Math.min(currentPage*itemsPerPage,filteredData.length)}}</b> dari <b class="text-slate-200">{{filteredData.length}}</b></div>
<div class="flex items-center gap-4">
<div class="flex items-center gap-2"><span class="text-sm text-slate-400">Tampilkan</span>
<select v-model.number="itemsPerPage" @change="currentPage=1" class="border border-slate-700 bg-slate-800 rounded-md text-sm p-1.5 text-slate-200">
<option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></div>
<div class="flex items-center gap-1">
<button :disabled="currentPage===1" @click="currentPage--" class="p-1.5 rounded-md border border-slate-700 text-slate-400 hover:text-indigo-400 disabled:opacity-30 transition-colors">◀</button>
<span class="text-sm font-medium text-slate-300 px-3">Hal {{currentPage}} / {{totalPages}}</span>
<button :disabled="currentPage>=totalPages" @click="currentPage++" class="p-1.5 rounded-md border border-slate-700 text-slate-400 hover:text-indigo-400 disabled:opacity-30 transition-colors">▶</button>
</div></div></div></div></div>

<!-- MODAL MITRA -->
<div v-if="selectedMitra" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" @click.self="selectedMitra=null">
<div class="bg-slate-900 rounded-2xl shadow-2xl shadow-black/50 max-w-lg w-full overflow-hidden border border-slate-800">
<div class="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-800/50">
<div><h3 class="text-2xl font-bold text-slate-100">{{selectedMitra.Mitra||'-'}}</h3>
<p class="text-indigo-400 font-medium text-sm mt-1">{{selectedMitra.Klasifikasi_Mitra||'Kategori tidak diketahui'}}</p></div>
<button @click="selectedMitra=null" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 hover:bg-rose-900/30 hover:text-rose-400 transition-colors text-slate-400 text-lg">✕</button></div>
<div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto cs">
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="bg-indigo-950/30 p-4 rounded-xl border border-indigo-900/50">
<p class="text-[11px] text-indigo-400 font-bold uppercase tracking-widest mb-1.5">Penandatangan Mitra</p>
<p class="font-bold text-slate-100 text-[15px] mb-2">{{selectedMitra.Nama_Penandatangan_Mitra||'-'}}</p>
<div v-if="selectedMitra.Telepon_Penandatangan_Mitra||selectedMitra.Email_Penandatangan_Mitra" class="mt-1.5 pt-2 border-t border-indigo-900/50 text-sm text-indigo-200 space-y-1.5">
<p v-if="selectedMitra.Telepon_Penandatangan_Mitra">📞 {{selectedMitra.Telepon_Penandatangan_Mitra}}</p>
<p v-if="selectedMitra.Email_Penandatangan_Mitra" class="break-all">✉️ {{selectedMitra.Email_Penandatangan_Mitra}}</p></div></div>
<div class="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50">
<p class="text-[11px] text-emerald-500 font-bold uppercase tracking-widest mb-1.5">PIC Mitra</p>
<p class="font-bold text-slate-100 text-[15px] mb-2">{{selectedMitra.PIC_Mitra||'-'}}</p>
<div v-if="selectedMitra.Telepon_PIC_Mitra||selectedMitra.Email_PIC_Mitra" class="mt-1.5 pt-2 border-t border-emerald-900/50 text-sm text-emerald-200 space-y-1.5">
<p v-if="selectedMitra.Telepon_PIC_Mitra">📞 {{selectedMitra.Telepon_PIC_Mitra}}</p>
<p v-if="selectedMitra.Email_PIC_Mitra" class="break-all">✉️ {{selectedMitra.Email_PIC_Mitra}}</p></div></div></div>
<div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
<h4 class="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">Informasi Instansi / Mitra</h4>
<div class="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
<div v-if="selectedMitra.Email_Mitra"><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Email</p><p class="text-sm text-slate-300 font-medium break-all">{{selectedMitra.Email_Mitra}}</p></div>
<div v-if="selectedMitra.Telepon_Mitra"><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Telepon</p><p class="text-sm text-slate-300 font-medium">{{selectedMitra.Telepon_Mitra}}</p></div>
<div v-if="selectedMitra.Website_Mitra" class="md:col-span-2"><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Website</p><a :href="selectedMitra.Website_Mitra.startsWith('http')?selectedMitra.Website_Mitra:'https://'+selectedMitra.Website_Mitra" target="_blank" class="text-sm text-indigo-400 hover:underline break-all">{{selectedMitra.Website_Mitra}}</a></div>
<div v-if="selectedMitra.Alamat_Mitra" class="md:col-span-2"><p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Alamat</p><p class="text-sm text-slate-400 leading-relaxed">{{selectedMitra.Alamat_Mitra}}</p></div>
</div></div></div>
<div class="p-4 bg-slate-800/80 border-t border-slate-800 flex justify-end">
<button @click="selectedMitra=null" class="px-6 py-2 bg-slate-700 text-slate-200 rounded-lg font-medium hover:bg-slate-600 transition-colors">Tutup</button></div></div></div>
</div>
<script>
const DATA=__JSON_DATA__;
const{createApp}=Vue;
createApp({
data(){return{data:DATA,globalSearch:'',showColMenu:false,currentPage:1,itemsPerPage:10,
sortConfig:{key:'tanggal_penetapan',direction:'desc'},selectedMitra:null,
columns:[
{key:'no',label:'No.',visible:true},
{key:'id',label:'ID Dokumen',visible:false},
{key:'jenis_dokumen',label:'Jenis Dokumen',visible:true},
{key:'nomor_dokumen',label:'Nomor Dokumen',visible:true},
{key:'tentang',label:'Tentang',visible:true},
{key:'tanggal_penetapan',label:'Tgl Penetapan',visible:false},
{key:'tanggal_mulai',label:'Tgl Mulai',visible:true},
{key:'tanggal_berakhir',label:'Tgl Berakhir',visible:true},
{key:'deskripsi',label:'Deskripsi',visible:false},
{key:'mitra',label:'Mitra',visible:true},
{key:'Status',label:'Status',visible:true},
{key:'ref_mou',label:'Ref MoU',visible:false},
{key:'nama_penandatangan',label:'Penandatangan',visible:false},
{key:'jabatan_penandatangan',label:'Jabatan Penandatangan',visible:false},
{key:'program',label:'Program',visible:false},
{key:'wilayah_kerjasama',label:'Wilayah',visible:true},
{key:'judul_dokumen',label:'Judul Dokumen',visible:false},
{key:'nama_inisiator',label:'Inisiator',visible:false},
{key:'inisiasi',label:'Inisiasi',visible:false},
{key:'unit_polnep',label:'Unit Polnep',visible:false},
]}},
computed:{
filteredData(){let f=this.data;if(this.globalSearch){const s=this.globalSearch.toLowerCase();
f=f.filter(r=>{const vals=Object.entries(r).filter(([k])=>k!=='mitras').map(([,v])=>String(v).toLowerCase());
const mNames=(r.mitras||[]).map(m=>m.Mitra.toLowerCase());
return vals.some(v=>v.includes(s))||mNames.some(n=>n.includes(s))});}
const k=this.sortConfig.key,d=this.sortConfig.direction;
return[...f].sort((a,b)=>{let va=a[k]||'',vb=b[k]||'';return d==='asc'?(va>vb?1:-1):(va<vb?1:-1)})},
totalPages(){return Math.ceil(this.filteredData.length/this.itemsPerPage)||1},
paginatedData(){const s=(this.currentPage-1)*this.itemsPerPage;return this.filteredData.slice(s,s+this.itemsPerPage)}},
watch:{filteredData(){if(this.currentPage>this.totalPages)this.currentPage=1}},
methods:{
isTextHeavy(k){return['tentang','deskripsi','judul_dokumen'].includes(k)},
sortBy(k){if(this.sortConfig.key===k)this.sortConfig.direction=this.sortConfig.direction==='asc'?'desc':'asc';
else{this.sortConfig.key=k;this.sortConfig.direction='asc'}}}
}).mount('#app')
</script></body></html>"""

    html = html.replace('__TAILWIND_CSS__', tailwind_css)
    html = html.replace('__VUE_JS__', vue_js)
    html = html.replace('__JSON_DATA__', json_data)

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Tabel_Offline_Share.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Berhasil: {out_path}")

if __name__ == '__main__':
    generate()
