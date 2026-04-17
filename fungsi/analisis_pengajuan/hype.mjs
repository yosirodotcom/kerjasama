import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

puppeteer.use(StealthPlugin());

// ================= PENGATURAN =================
const FILE_INPUT = 'laporan_pengajuan.csv';
const FILE_OUTPUT = 'laporan_pengajuan_terupdate.csv';
const TARGET_SUCCESS = 100; // Default parameter jumlah sukses
const KOORDINAT_X = 1255;
const KOORDINAT_Y = 545;
const PROMPT = 'sebutkan nomor polnep yang ada kata "/PL16/" dan ada 4 digit terakhir yang menandakan tahun';
// ==============================================

// Fungsi untuk membaca CSV menjadi Array of Objects
async function bacaCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File ${filePath} tidak ditemukan!`);
            resolve([]);
            return;
        }
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

// Fungsi untuk menulis kembali ke CSV
async function simpanCSV(filePath, data) {
    if (data.length === 0) return;

    // Mengambil header dinamis dari object pertama
    const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));

    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers
    });

    await csvWriter.writeRecords(data);
}

// Fungsi utama untuk mengekstrak nomor dari 1 URL
async function ekstrakSatuDokumen(page, url) {
    return new Promise(async (resolve) => {
        let isResolved = false;

        // 1. TIMEOUT SYSTEM: Jika dalam 45 detik tidak ada jawaban dari Gemini, anggap gagal
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                console.log("   ⏳ Waktu habis (Timeout). Gemini tidak merespons dengan format yang benar.");
                page.off('response', interceptor); // Matikan penyadap
                resolve("gagal");
            }
        }, 45000);

        // 2. NETWORK INTERCEPTOR: Menyadap jawaban Gemini
        const interceptor = async (response) => {
            if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
                try {
                    const text = await response.text();
                    if (text.includes('/PL16/')) {
                        const regexNomor = /[A-Za-z0-9.\/-]+\/PL16\/[A-Za-z0-9.\/-]+/;
                        const match = text.match(regexNomor);

                        if (match && !isResolved) {
                            isResolved = true;
                            clearTimeout(timeoutId); // Matikan bom waktu
                            page.off('response', interceptor); // Matikan penyadap

                            const nomorBersih = match[0].replace(/^[.,*"]+|[.,*"]+$/g, '');
                            resolve(nomorBersih);
                        }
                    }
                } catch (err) { }
            }
        };

        // Pasang penyadap ke browser
        page.on('response', interceptor);

        // 3. PROSES OTOMASI UI
        try {
            console.log(`   🌐 Membuka: ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Klik tombol Ask Gemini
            const xpathTombol = '::-p-xpath(//*[contains(text(), "Ask Gemini")])';
            const tombolGemini = await page.waitForSelector(xpathTombol, { timeout: 15000 });
            await page.evaluate(el => el.click(), tombolGemini);

            await new Promise(r => setTimeout(r, 4000)); // Tunggu panel buka

            // Klik koordinat dan ketik
            await page.mouse.move(KOORDINAT_X, KOORDINAT_Y);
            await page.mouse.click(KOORDINAT_X, KOORDINAT_Y);
            await new Promise(r => setTimeout(r, 1000));

            await page.keyboard.type(PROMPT, { delay: 50 });
            await page.keyboard.press('Enter');

            console.log("   🤖 Menunggu Gemini berpikir...");
            // Script akan menahan di sini sampai interceptor memanggil resolve() atau timeout terjadi

        } catch (error) {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                page.off('response', interceptor);
                console.log(`   ❌ Gagal memproses halaman: ${error.message}`);
                resolve("gagal");
            }
        }
    });
}

// ==============================================
// ALUR KERJA UTAMA (BATCH PROCESSING)
// ==============================================
async function mulaiBatchProses() {
    console.log("=== MEMULAI SISTEM RPA GOOGLE DRIVE ===");

    // 1. Baca Data Laporan
    const dataLaporan = await bacaCSV(FILE_INPUT);
    if (dataLaporan.length === 0) return;

    console.log(`📂 Total baris data ditemukan: ${dataLaporan.length}`);

    // 2. Siapkan Browser
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: 'C:\\OtomasiChrome',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--start-maximized'],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    let jumlahSukses = 0;

    // 3. Iterasi (Looping) Data
    for (let i = 0; i < dataLaporan.length; i++) {
        let row = dataLaporan[i];

        // Pastikan kolom NODOK ada. Jika tidak ada, kita buatkan propertinya
        if (row['NODOK'] === undefined) {
            row['NODOK'] = "";
        }

        // Cek apakah NODOK kosong
        if (row['NODOK'].trim() === "") {
            let link = row['link_dokumen'];

            if (!link || link.trim() === "") {
                console.log(`\n⏭️ [Baris ${i + 1}] Dilewati: Link dokumen kosong.`);
                row['NODOK'] = "gagal";
                continue;
            }

            console.log(`\n▶️ [Baris ${i + 1}] Memproses Dokumen...`);

            // Panggil fungsi ekstrak
            let hasil = await ekstrakSatuDokumen(page, link);

            // Update CSV Row
            row['NODOK'] = hasil;

            if (hasil !== "gagal") {
                console.log(`   ✅ DITEMUKAN: ${hasil}`);
                jumlahSukses++;
            } else {
                console.log(`   ⚠️ GAGAL menemukan nomor.`);
            }

            // Simpan progres ke file baru setiap kali selesai 1 baris (Autosave)
            await simpanCSV(FILE_OUTPUT, dataLaporan);

            // Cek apakah sudah mencapai target keberhasilan
            if (jumlahSukses >= TARGET_SUCCESS) {
                console.log(`\n🎯 Target ${TARGET_SUCCESS} dokumen sukses telah tercapai. Menghentikan proses.`);
                break;
            }

            // Jeda antar dokumen agar mesin Google tidak curiga
            console.log("   Mendinginkan mesin 3 detik sebelum lanjut...");
            await new Promise(r => setTimeout(r, 3000));

        } else {
            console.log(`\n⏭️ [Baris ${i + 1}] Dilewati: NODOK sudah terisi (${row['NODOK']})`);
        }
    }

    console.log("\n===========================================");
    console.log(`🏁 OTOMASI SELESAI.`);
    console.log(`Total Dokumen Berhasil Diekstrak: ${jumlahSukses}`);
    console.log(`Silakan cek file: ${FILE_OUTPUT}`);
    console.log("===========================================\n");

    await browser.close();
}

mulaiBatchProses();