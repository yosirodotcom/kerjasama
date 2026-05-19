---
name: data-sync
description: Skill untuk mengunduh dan menyinkronkan data proyek dari Google Sheets ke format CSV lokal menggunakan Google Sheets Export API.
---

# data-sync

Skill untuk mengunduh dan menyinkronkan data proyek dari Google Sheets ke format CSV lokal menggunakan Google Sheets Export API.

## Penggunaan

Anda dapat memicu sinkronisasi data dengan perintah seperti:
- "Download ulang semua data"
- "Sync data dari Google Sheets"
- "Perbarui tabel CSV dari API"

## Komponen Utama

- **Konfigurasi (`assets/sheets_config.json`)**: Berisi daftar URL Google Sheets yang akan diunduh.
- **Skrip Sinkronisasi (`scripts/sync.py`)**: Skrip Python yang melakukan request ke API Google Sheets dan menyimpan hasilnya ke folder `data/`.

## Workflow Internal

1. Membaca daftar URL dari `sheets_config.json`.
2. Melakukan iterasi pada setiap URL.
3. Mengonversi URL Google Sheets biasa menjadi Export URL CSV.
4. Mengunduh data dan menentukan nama file dari header `Content-Disposition`.
5. Menyimpan file CSV ke direktori `data/`.

## Catatan Keamanan
Skill ini menggunakan akses publik (link sharing) atau token yang tersedia di lingkungan eksekusi. Jangan menyimpan kredensial sensitif langsung di dalam repositori ini.
