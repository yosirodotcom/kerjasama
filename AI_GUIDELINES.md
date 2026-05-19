# Panduan Integrasi AI & Optimasi Token (SOP)

Dokumen ini berisi standar prosedur untuk menambahkan fitur AI ke dalam proyek `kerjasama` guna memastikan efisiensi token (Prompt Caching) dan performa maksimal.

## 1. Arsitektur Utama
Semua interaksi dengan LLM (Gemini) **WAJIB** melalui modul pusat:
- **File:** `ai_handler.py`
- **Instance:** `ai_service`

**Dilarang** melakukan inisialisasi `google.generativeai` atau `GenerativeModel` di luar modul ini.

## 2. Prosedur Pembuatan Fungsi AI Baru

Setiap kali membuat fungsi analisis baru, ikuti langkah-langkah berikut:

### A. Gunakan Prompt Caching
Jika fungsi menggunakan instruksi sistem yang sama atau data referensi yang besar (>32k token), pastikan menggunakan parameter `system_instruction` dan `context_text` pada `ai_service.ask()`.
```python
from ai_handler import ai_service

sys_inst = "Instruksi tetap Anda di sini..."
prompt = "Pertanyaan spesifik untuk baris data ini..."
hasil = ai_service.ask(prompt, system_instruction=sys_inst)
```

### B. Optimasi Input (Input Truncation)
Jangan mengirim seluruh isi dokumen jika tidak perlu. 
- Untuk PDF: Ambil hanya halaman 1-2 atau halaman yang relevan saja.
- Untuk Teks: Batasi jumlah karakter (misal: `text[:5000]`).

### C. Optimasi Output (Max Tokens)
Selalu batasi output AI agar tidak memberikan jawaban yang terlalu panjang (verbose). Konfigurasi default di `ai_handler.py` sudah diset ke `max_output_tokens=500`.

### D. Format Jawaban (JSON Mode)
Gunakan format JSON untuk mempermudah parsing dan mengurangi token basa-basi (seperti "Berikut adalah hasilnya...").

## 3. Checklist Sebelum Commit
Sebelum fungsi baru dianggap selesai, pastikan:
1. [ ] Sudah mengimport `ai_service`.
2. [ ] Instruksi sistem sudah dipisahkan dari prompt dinamis (agar cache bekerja).
3. [ ] Input teks sudah dipotong (truncated) sesuai kebutuhan.
4. [ ] Error handling sudah menangani kasus API gagal atau JSON rusak.

---
*Catatan: Pedoman ini dibuat untuk menekan biaya penggunaan token Gemini API hingga 90% melalui fitur Prompt Caching.*
