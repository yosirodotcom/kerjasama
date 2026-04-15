import pandas as pd
import os
import webbrowser
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent          # d:\repos\kerjasama
DATA_DIR = str(PROJECT_ROOT / "data")
OUTPUT_HTML = str(SCRIPT_DIR / "tabel_mitra_interaktif.html")
OUTPUT_EXCEL = str(SCRIPT_DIR / "hasil_analisis_mitra_distinct.xlsx")
OUTPUT_CSV = str(SCRIPT_DIR / "hasil_analisis_mitra_distinct.csv")


def load_and_merge_data(data_dir):
    # Load semua tabel yang dibutuhkan
    df_mitra = pd.read_csv(os.path.join(data_dir, 'T_mitra - T_mitra.csv'))
    df_person = pd.read_csv(os.path.join(data_dir, 'T_person - T_person.csv'))
    df_dokumen = pd.read_csv(os.path.join(data_dir, 'T_dokumen_kerjasama - T_dokumen_kerjasama.csv'))
    df_mapping_mitra = pd.read_csv(os.path.join(data_dir, 'M_mitra_bekerjasama - M_mitra_bekerjasama.csv'))
    df_pengajuan = pd.read_csv(os.path.join(data_dir, 'T_pengajuan_kerjasama - T_pengajuan_kerjasama.csv'))

    # Bersihkan T_dokumen_kerjasama yang tidak punya referensi pengajuan
    df_dokumen = df_dokumen[df_dokumen['ref_pengajuan_kerjasama'].notna() & (df_dokumen['ref_pengajuan_kerjasama'].str.strip() != '')].copy()
    
    # Parse tanggal awal
    df_dokumen['tanggal_mulai'] = pd.to_datetime(df_dokumen['tanggal_mulai'], format='mixed', errors='coerce')
    df_dokumen['tanggal_berakhir'] = pd.to_datetime(df_dokumen['tanggal_berakhir'], format='mixed', errors='coerce')
    
    # Rename id di dokumen agar unik
    df_dokumen = df_dokumen.rename(columns={'id': 'id_dokumen'})

    # Step 1: Join Dokumen dengan M_mitra_bekerjasama
    df_merged = df_dokumen.merge(
        df_mapping_mitra,
        on='ref_pengajuan_kerjasama',
        how='left'
    )
    
    # Step 2: Join dengan tabel Mitra
    df_merged = df_merged.merge(
        df_mitra[['id', 'mitra', 'email', 'telepon', 'negara_mitra']].rename(columns={
            'id': 'id_mitra',
            'mitra': 'nama_mitra',
            'email': 'email_mitra',
            'telepon': 'telepon_mitra',
            'negara_mitra': 'negara_mitra'
        }),
        left_on='ref_mitra',
        right_on='id_mitra',
        how='left'
    )
    df_merged.drop(columns=['id_mitra'], inplace=True, errors='ignore')

    # Step 3: Join dengan T_person untuk Penandatangan Mitra
    df_merged = df_merged.merge(
        df_person[['id', 'nama', 'email', 'telepon']].rename(columns={
            'id': 'id_penandatangan',
            'nama': 'nama_penandatangan',
            'email': 'email_penandatangan',
            'telepon': 'telepon_penandatangan'
        }),
        left_on='ref_penandatangan_mitra',
        right_on='id_penandatangan',
        how='left'
    )
    df_merged.drop(columns=['id_penandatangan'], inplace=True, errors='ignore')

    # Step 4: Join dengan T_person untuk PIC Mitra
    df_merged = df_merged.merge(
        df_person[['id', 'nama', 'email', 'telepon']].rename(columns={
            'id': 'id_pic',
            'nama': 'nama_pic_mitra',
            'email': 'email_pic_mitra',
            'telepon': 'telepon_pic_mitra'
        }),
        left_on='ref_pic_mitra',
        right_on='id_pic',
        how='left'
    )
    df_merged.drop(columns=['id_pic'], inplace=True, errors='ignore')

    # Step 5: Join dengan T_pengajuan_kerjasama untuk jenis_dokumen
    df_merged = df_merged.merge(
        df_pengajuan[['id', 'jenis_dokumen']].rename(columns={'id': 'id_pengajuan'}),
        left_on='ref_pengajuan_kerjasama',
        right_on='id_pengajuan',
        how='left'
    )
    df_merged.drop(columns=['id_pengajuan'], inplace=True, errors='ignore')

    return df_merged

def process_distinct_dokumen(df_merged):
    # Pilih kolom yang dibutuhkan
    kolom_hasil = [
        'id_dokumen',
        'nama_mitra',
        'telepon_mitra',
        'email_mitra',
        'nama_penandatangan',
        'nama_pic_mitra',
        'telepon_pic_mitra',
        'email_pic_mitra',
        'tanggal_mulai',
        'tanggal_berakhir',
        'nomor_dokumen',
        'link_dokumen',
        'deskripsi',
        'negara_mitra',
        'status_laporkerma',
        'ruang_lingkup',
        'alokasi_anggaran',
        'unit_terkait',
        'program',
        'jenis_dokumen'
    ]

    df_hasil = df_merged[kolom_hasil].copy()

    # Distinct berdasarkan id_dokumen
    df_distinct = df_hasil.sort_values('tanggal_mulai', ascending=False).drop_duplicates(subset=['id_dokumen'], keep='first')
    df_distinct = df_distinct.sort_values('tanggal_mulai', ascending=False).reset_index(drop=True)

    # Tambahkan kolom Cakupan Mitra (International/Nasional)
    df_distinct['cakupan_mitra'] = df_distinct['negara_mitra'].apply(lambda x: 'Nasional' if pd.isna(x) or str(x).strip().upper() == 'INDONESIA' else 'International')

    # Tambahkan kolom Dokumen Aktif
    today = pd.Timestamp.today().normalize()
    df_distinct['dokumen_aktif'] = df_distinct['tanggal_berakhir'].apply(lambda tgl: True if pd.notna(tgl) and tgl >= today else False)

    # Tambahkan kolom semester berdasarkan tanggal_mulai
    def tentukan_semester(tgl):
        if pd.isna(tgl):
            return None
        tahun = tgl.year if tgl.month >= 7 else tgl.year - 1
        return f'Semester {tahun}/{tahun+1}'

    df_distinct['semester'] = df_distinct['tanggal_mulai'].apply(tentukan_semester)

    # Hapus data yang tidak termasuk dalam semester manapun
    df_distinct = df_distinct.dropna(subset=['semester'])

    # Urutkan berdasarkan semester lalu nomor dokumen
    df_distinct = df_distinct.sort_values(['semester', 'nomor_dokumen']).reset_index(drop=True)
    df_distinct.index = df_distinct.index + 1  # Mulai index dari 1
    df_distinct.index.name = 'No'

    # Format tanggal
    df_distinct['tanggal_mulai'] = df_distinct['tanggal_mulai'].dt.strftime('%Y-%m-%d')
    df_distinct['tanggal_berakhir'] = df_distinct['tanggal_berakhir'].dt.strftime('%Y-%m-%d')

    return df_distinct

def print_summary_statistics(df_distinct):
    print('\n=== RINGKASAN STATISTIK ===')
    print('=' * 50)
    print(f'Total dokumen kerjasama unik           : {len(df_distinct)}')
    print(f'Dokumen dengan Mitra tercatat          : {df_distinct["nama_mitra"].notna().sum()}')
    print(f'Dokumen dengan Penandatangan Mitra     : {df_distinct["nama_penandatangan"].notna().sum()}')
    print(f'Dokumen dengan PIC Mitra               : {df_distinct["nama_pic_mitra"].notna().sum()}')
    
    print('\nJumlah per Semester:')
    print(df_distinct['semester'].value_counts().to_string())

def print_semua_semester(df_distinct):
    print('\n=== DATA SEMUA SEMESTER ===')
    print('=' * 50)
    df_export = df_distinct.copy()

    kolom_tampil = [
        'nama_mitra',           
        'cakupan_mitra',        
        'dokumen_aktif',        
        'nomor_dokumen',        
        'jenis_dokumen',        
        'tanggal_mulai',        
        'tanggal_berakhir',     
        'semester',             
        'status_laporkerma',    
        'ruang_lingkup',        
        'program'
    ]

    print(f'Total seluruh dokumen: {len(df_export)}')
    
    # Pengaturan untuk print tabel panjang agar tidak terpotong (opsional)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 1000)
    
    print(df_export[kolom_tampil])

def export_to_excel(df_distinct, output_file=None):
    if output_file is None:
        output_file = OUTPUT_EXCEL
    df_distinct.to_excel(output_file, index=True)
    print(f'\n[OK] Data berhasil diekspor ke: {output_file}')

def export_to_csv(df_distinct, output_file=None):
    if output_file is None:
        output_file = OUTPUT_CSV
    df_distinct.to_csv(output_file, index=True, encoding='utf-8-sig')
    print(f'[OK] CSV berhasil disimpan: {output_file}')

def export_to_interactive_html(df_distinct, output_file=None):
    if output_file is None:
        output_file = OUTPUT_HTML
    
    df_export = df_distinct.copy()
    
    def make_clickable(row):
        link = row['link_dokumen']
        nomor = row['nomor_dokumen']
        if pd.notna(link) and str(link).strip() != '':
            return f'<a href="{link}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">{nomor}</a>'
        return nomor
        
    df_export['nomor_dokumen'] = df_export.apply(make_clickable, axis=1)
    
    kolom_tampil = [
        'nama_mitra',           # 0
        'cakupan_mitra',        # 1
        'dokumen_aktif',        # 2
        'nomor_dokumen',        # 3
        'jenis_dokumen',        # 4
        
        # --- HIDDEN COLUMNS ---
        'tanggal_mulai',        # 5
        'tanggal_berakhir',     # 6
        'semester',             # 7
        'status_laporkerma',    # 8
        'ruang_lingkup',        # 9
        'program',              # 10
        'deskripsi',            # 11
        'alokasi_anggaran',     # 12
        'unit_terkait',         # 13
        'negara_mitra',         # 14
        'nama_penandatangan',   # 15
        'nama_pic_mitra',       # 16
        'telepon_mitra',        # 17
        'email_mitra',          # 18
        'telepon_pic_mitra',    # 19
        'email_pic_mitra'       # 20
    ]
    
    df_subset = df_export[kolom_tampil].copy()
    df_subset.rename(columns=lambda x: str(x).replace('_', ' ').upper(), inplace=True)
    
    df_html = df_subset.to_html(classes=['table', 'table-striped', 'table-bordered', 'table-hover', 'w-full', 'text-sm', 'text-left', 'cell-border'], index=False, justify='center', escape=False)
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tabel Mitra Seluruh Semester</title>
        <!-- Tailwind CSS -->
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- DataTables CSS -->
        <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
        <link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.4.1/css/buttons.dataTables.min.css">
        <!-- Google Fonts -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body {{ font-family: 'Inter', sans-serif; background-color: #f8fafc; }}
            table.dataTable thead th {{ background-color: #2563eb; color: white; border-bottom: none; padding: 12px; }}
            table.dataTable tbody td {{ border-bottom: 1px solid #e2e8f0; padding: 12px; }}
            .dataTables_wrapper .dataTables_length select, .dataTables_wrapper .dataTables_filter input {{ padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; margin-left: 8px; }}
            .dataTables_wrapper .dataTables_filter input:focus {{ border-color: #2563eb; ring: 2px; }}
            .dt-button.buttons-colvis {{ background: #2563eb !important; border: none !important; color: white !important; font-weight: 500 !important; border-radius: 6px !important; padding: 8px 16px !important; }}
            .dt-button.buttons-colvis:hover {{ background: #1d4ed8 !important; }}
            .filters input {{ width: 100%; border: 1px solid #ccc; border-radius: 4px; padding: 4px; color: #333; }}
        </style>
    </head>
    <body class="p-8">
        <div class="max-w-[95%] mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-100">
            <h1 class="text-3xl font-bold text-slate-800 mb-2">Data Mitra Kerjasama</h1>
            <p class="text-slate-500 mb-6">Menampilkan seluruh data mitra dari semua semester. Data dapat di-sortir, kolom bisa ditampilkan/disembunyikan khusus dengan 'Pilih Kolom Tampil', dan filter bisa diisi pada setiap kolom.</p>
            
            <div class="overflow-x-auto">
                {df_html}
            </div>
            
            <div class="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-400">
                Dibuat otomatis menggunakan Python, Pandas &amp; DataTables
            </div>
        </div>

        <!-- jQuery & DataTables JS -->
        <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
        <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
        <script src="https://cdn.datatables.net/buttons/2.4.1/js/dataTables.buttons.min.js"></script>
        <script src="https://cdn.datatables.net/buttons/2.4.1/js/buttons.colVis.min.js"></script>
        
        <script>
            $.fn.dataTable.ext.search.push(
                function( settings, data, dataIndex ) {{
                    var min_5 = $('#min_date_5').val();
                    var max_5 = $('#max_date_5').val();
                    var date_5 = data[5] || "";

                    var min_6 = $('#min_date_6').val();
                    var max_6 = $('#max_date_6').val();
                    var date_6 = data[6] || "";

                    var isValid_5 = true;
                    if(min_5 && date_5 < min_5) isValid_5 = false;
                    if(max_5 && date_5 > max_5) isValid_5 = false;

                    var isValid_6 = true;
                    if(min_6 && date_6 < min_6) isValid_6 = false;
                    if(max_6 && date_6 > max_6) isValid_6 = false;

                    return isValid_5 && isValid_6;
                }}
            );

            $(document).ready(function() {{
                // Setup clone header for individual column search
                $('table thead tr').clone(true).addClass('filters').appendTo('table thead');

                var table = $('table').DataTable({{
                    "pageLength": 10,
                    "dom": 'Bfrtip',
                    "orderCellsTop": true,
                    "fixedHeader": true,
                    "buttons": [
                        {{
                            extend: 'colvis',
                            text: 'Pilih Kolom Tampil (Sembunyikan/Tampilkan)'
                        }}
                    ],
                    "columnDefs": [
                        {{
                            "targets": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                            "visible": false
                        }}
                    ],
                    "language": {{
                        "search": "Cari Cepat (Semua Baris):",
                        "lengthMenu": "Tampilkan _MENU_ baris",
                        "info": "Menampilkan _START_ sampai _END_ dari _TOTAL_ data",
                        "paginate": {{
                            "first": "Pertama",
                            "last": "Terakhir",
                            "next": "Selanjutnya",
                            "previous": "Sebelumnya"
                        }},
                        "zeroRecords": "Tidak ada data yang ditemukan",
                        "infoEmpty": "Menampilkan 0 sampai 0 dari 0 data"
                    }},
                    "order": [[ 5, "desc" ]],
                    "initComplete": function () {{
                        var api = this.api();

                        // For each column
                        api
                            .columns()
                            .eq(0)
                            .each(function (colIdx) {{
                                var cell = $('.filters th').eq(colIdx);
                                var title = $(cell).text();
                                
                                var isCategorical = [1, 2, 4, 7, 8].includes(colIdx);
                                var isDate = [5, 6].includes(colIdx);

                                if (isCategorical) {{
                                    var select = $('<select class="text-sm font-normal w-full border border-slate-300 rounded p-1 text-slate-800"><option value="">Semua</option></select>')
                                        .appendTo($(cell).empty())
                                        .on('change', function () {{
                                            var val = $.fn.dataTable.util.escapeRegex($(this).val());
                                            api.column(colIdx).search(val ? '^' + val + '$' : '', true, false).draw();
                                        }});

                                    api.column(colIdx).data().unique().sort().each(function (d, j) {{
                                        if (d) {{
                                            // Handle potential boolean values converted to string
                                            var text = d;
                                            if (d === true || d === "True") text = "Ya / Aktif";
                                            else if (d === false || d === "False") text = "Tidak Aktif";
                                            select.append('<option value="' + d + '">' + text + '</option>');
                                        }}
                                    }});
                                }} 
                                else if (isDate) {{
                                    var htmlDate = '<div style="display:flex; flex-direction:column; gap:4px; font-weight:normal;">' +
                                      '<div style="display:flex; align-items:center; gap:2px;"><span style="font-size:10px; width:25px;" class="text-slate-600">Dari:</span> <input type="date" id="min_date_' + colIdx + '" class="text-sm border border-slate-300 rounded w-full date-range-filter text-slate-800" style="padding:2px; height: 26px;"></div>' +
                                      '<div style="display:flex; align-items:center; gap:2px;"><span style="font-size:10px; width:25px;" class="text-slate-600">Ke:</span> <input type="date" id="max_date_' + colIdx + '" class="text-sm border border-slate-300 rounded w-full date-range-filter text-slate-800" style="padding:2px; height: 26px;"></div>' +
                                      '</div>';
                                    $(cell).html(htmlDate);

                                    $('.date-range-filter', cell).on('change', function () {{
                                        api.draw();
                                    }});
                                }} 
                                else {{
                                    $(cell).html('<input type="text" placeholder="Filter..." class="text-sm font-normal w-full border border-slate-300 rounded p-1 text-slate-800" />');

                                    $('input[type="text"]', $('.filters th').eq($(api.column(colIdx).header()).index()))
                                        .off('keyup change')
                                        .on('change', function (e) {{
                                            $(this).attr('title', $(this).val());
                                            var regexr = '({{search}})';
                                            var cursorPosition = this.selectionStart;
                                            api
                                                .column(colIdx)
                                                .search(
                                                    this.value != ''
                                                        ? regexr.replace('{{search}}', '(((' + this.value + ')))')
                                                        : '',
                                                    this.value != '',
                                                    this.value == ''
                                                )
                                                .draw();
                                        }})
                                        .on('keyup', function (e) {{
                                            e.stopPropagation();
                                            $(this).trigger('change');
                                            $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                                        }});
                                }}
                            }});
                    }}
                }});
            }});
        </script>
    </body>
    </html>
    """
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    print(f'\n[OK] Tabel HTML Interaktif berhasil dibuat: {output_file}')
    
    absolute_path = 'file://' + os.path.realpath(output_file).replace('\\', '/')
    webbrowser.open(absolute_path)

if __name__ == '__main__':
    print("Memproses data, mohon tunggu...")
    
    # 1. Load dan Merge data
    df_merged = load_and_merge_data(data_dir=DATA_DIR)
    
    # 2. Proses kolom distinct (Cakupan, Aktif/Tidak, dsb)
    df_distinct = process_distinct_dokumen(df_merged)
    
    # === PENGATURAN TAMPILAN ===
    TAMPILKAN_SEMUA_SEMESTER = False
    TAMPILKAN_STATISTIK = True
    EXPORT_KE_EXCEL = False
    EXPORT_KE_CSV = True
    TAMPILKAN_HTML_INTERAKTIF = True
    
    if TAMPILKAN_SEMUA_SEMESTER:
        print_semua_semester(df_distinct)
        
    if TAMPILKAN_STATISTIK:
        print_summary_statistics(df_distinct)
        
    if EXPORT_KE_EXCEL:
        export_to_excel(df_distinct)

    if EXPORT_KE_CSV:
        export_to_csv(df_distinct)
        
    if TAMPILKAN_HTML_INTERAKTIF:
        export_to_interactive_html(df_distinct)
