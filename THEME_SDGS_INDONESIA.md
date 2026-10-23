# Panduan Desain & Palet Warna: SDGs Indonesia • POLNEP

Dokumen ini mencatat seluruh token warna, palet status, dan aset visual yang diekstraksi dari screenshot **Satu Data SDGs Dashboard 4.0 (SDGs Indonesia - Data SDGs untuk Dekade Aksi 2030)** serta penerapannya pada aplikasi Data Kerjasama Politeknik Negeri Pontianak (POLNEP).

---

## 1. Palet Warna Utama (Brand Colors)

| Peran Token | Nama Warna | Kode HEX | Preview | Kegunaan |
|---|---|---|---|---|
| **Primary Header & Brand** | Cerulean / Sky 600 | `#0284C7` | ![#0284C7](https://via.placeholder.com/15/0284C7/000000?text=+) | Judul utama, ikon aktif, garis tren, tombol Sync, header Excel |
| **Primary Dark** | Sky 700 | `#0369A1` | ![#0369A1](https://via.placeholder.com/15/0369A1/000000?text=+) | Hover button, border header, teks penekanan |
| **Primary Soft Tint** | Sky 100 / Sky 50 | `#E0F2FE` / `#F0F9FF` | ![#E0F2FE](https://via.placeholder.com/15/E0F2FE/000000?text=+) | Background header tabel, ring gauge chart, zebra striping |
| **Dekade Aksi Orange** | Warm Orange 600 | `#EA580C` | ![#EA580C](https://via.placeholder.com/15/EA580C/000000?text=+) | Teks "DEKADE AKSI 2030", badge tahun, tombol ZIP |
| **Orange Accent** | Orange 500 | `#F97316` | ![#F97316](https://via.placeholder.com/15/F97316/000000?text=+) | Segmen donut chart, warning badge |
| **Status Aktif (Tercapai)** | Emerald 600 / 500 | `#059669` / `#10B981` | ![#059669](https://via.placeholder.com/15/059669/000000?text=+) | Status "Aktif", badge positif (+YoY), tombol Export Excel |
| **Status Kedaluwarsa** | Rose 600 / 500 | `#E11D48` / `#EF4444` | ![#E11D48](https://via.placeholder.com/15/E11D48/000000?text=+) | Status "Expired", alert error |
| **Sedang Berjalan / Alert** | Amber 500 | `#F59E0B` | ![#F59E0B](https://via.placeholder.com/15/F59E0B/000000?text=+) | Status "Dalam Proses", peringatan tenggat waktu |
| **Teal / Eco Kemitraan** | Teal 600 | `#0D9488` | ![#0D9488](https://via.placeholder.com/15/0D9488/000000?text=+) | Segmen PKS pada progress bar, tombol jaringan mitra |
| **Dark Pill / Contrast** | Slate / Navy 900 | `#0F172A` | ![#0F172A](https://via.placeholder.com/15/0F172A/000000?text=+) | Nav pill aktif, teks judul utama dengan kontras tinggi |

---

## 2. Palet Kanvas & Permukaan (Surfaces)

- **Canvas Background:** `#F4F9FD` (Soft Sky tint pale blue)
- **Card Surface:** `#FFFFFF` (Pure White)
- **Subtle Surface / Alternate Row:** `#F8FAFC` (Slate 50)
- **Border Default:** `#E2E8F0` (Slate 200)
- **Border Accent / Highlight:** `#BAE6FD` (Sky 200)

---

## 3. Palet 4 Pilar SDGs

| Pilar | Warna | HEX |
|---|---|---|
| **Pilar Pembangunan Sosial** | Sky Blue | `#0284C7` |
| **Pilar Pembangunan Ekonomi** | Cyan / Ocean | `#0EA5E9` |
| **Pilar Pembangunan Lingkungan** | Emerald Green | `#10B981` |
| **Pilar Pembangunan Hukum & Tata Kelola** | Warm Orange | `#F97316` |

---

## 4. 17 Warna Resmi Tujuan SDGs (United Nations Goals)

1. **Goal 1 (Tanpa Kemiskinan):** `#E5243B`
2. **Goal 2 (Tanpa Kelaparan):** `#DDA63A`
3. **Goal 3 (Kehidupan Sehat & Sejahtera):** `#4C9F38`
4. **Goal 4 (Pendidikan Berkualitas):** `#C5192D`
5. **Goal 5 (Kesetaraan Gender):** `#FF3A21`
6. **Goal 6 (Air Bersih & Sanitasi Layak):** `#26BDE2`
7. **Goal 7 (Energi Bersih & Terjangkau):** `#FCC30B`
8. **Goal 8 (Pekerjaan Layak & Pertumbuhan Ekonomi):** `#A21942`
9. **Goal 9 (Industri, Inovasi & Infrastruktur):** `#FD6925`
10. **Goal 10 (Berkurangnya Kesenjangan):** `#DD1367`
11. **Goal 11 (Kota & Permukiman Berkelanjutan):** `#FD9D24`
12. **Goal 12 (Konsumsi & Produksi Bertanggung Jawab):** `#BF8B2E`
13. **Goal 13 (Penanganan Perubahan Iklim):** `#3F7E44`
14. **Goal 14 (Ekosistem Lautan):** `#0A97D9`
15. **Goal 15 (Ekosistem Daratan):** `#56C02B`
16. **Goal 16 (Perdamaian, Keadilan & Kelembagaan Tangguh):** `#00689D`
17. **Goal 17 (Kemitraan untuk Mencapai Tujuan):** `#19486A`

---

## 5. Berkas Aset & Kode yang Disimpan

1. **Konfigurasi Token TypeScript:** [`src/lib/theme.ts`](file:///d:/repos/kerjasama/src/lib/theme.ts)
   - Berisi objek `SDGS_THEME`, pemetaan 17 tujuan, 4 pilar, dan fungsi pembantu `getStatusStyle(status)`.
2. **Variabel CSS Global (Tailwind v4 inline theme):** [`src/app/globals.css`](file:///d:/repos/kerjasama/src/app/globals.css)
   - Menyediakan utility classes seperti `bg-sdgs-primary`, `text-sdgs-orange`, `bg-sdgs-emerald`, dsb.
3. **Aset Vector & Logo:**
   - [`public/assets/sdgs-wheel.svg`](file:///d:/repos/kerjasama/public/assets/sdgs-wheel.svg): Logo roda 17 warna resmi SDGs dengan lencana POLNEP di tengahnya.
   - [`public/assets/indonesia-contour.svg`](file:///d:/repos/kerjasama/public/assets/indonesia-contour.svg): Kontur vektor peta kepulauan Indonesia dengan hotspot koordinat kantor kerjasama POLNEP Pontianak.
4. **Komponen Visual Dashboard:**
   - [`src/components/dashboard/HeaderBanner.tsx`](file:///d:/repos/kerjasama/src/components/dashboard/HeaderBanner.tsx): Navigasi atas, logo SDGs 4.0, lencana Dekade Aksi 2030, dan tombol pill filter.
   - [`src/components/dashboard/StatsOverview.tsx`](file:///d:/repos/kerjasama/src/components/dashboard/StatsOverview.tsx): Kartu metrik tren area SVG, circular gauge ring, donut chart status, dan segmented progress bar jenis dokumen.
   - [`src/components/DataTable.tsx`](file:///d:/repos/kerjasama/src/components/DataTable.tsx): Tabel data interaktif terintegrasi penuh dengan tema SDGs Indonesia, modal mitra detail putih-bersih, modal unduh ZIP, dan ekspor Excel dengan styling selaras.
