import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

puppeteer.use(StealthPlugin());

// ================= PENGATURAN UTAMA =================
const FILE_MENTAH = 'laporan_pengajuan.csv';
const FILE_TERUPDATE = 'laporan_pengajuan_terupdate.csv';
const TARGET_SUCCESS = 500; // Jumlah row sukses yang diinginkan
const MAKSIMAL_COBA = 3;   // Retry 3x jika gagal
const KOORDINAT_X = 1255;
const KOORDINAT_Y = 545;

const PROMPT = `sebutkan nomor polnep yang ada kata "/PL16/" dan ada 4 digit terakhir yang menandakan tahun. pada dokumen ini di halaman pertama biasanya disebutkan kerja sama tentang apa, misalkan Perjanjian Kerja Sama antara Politeknik Negeri Pontianak dan nama mitra tentang tridarma perguruan tinggi, nah ambil kalimat yang tentang ini., kemudian ambil juga tanggal penetapannya (WAJIB UBAH format tanggalnya menjadi DD-MM-YYYY, contoh: 23-11-2021). 

TOLONG JAWAB DENGAN FORMAT PERSIS SEPERTI INI (Tanpa basa-basi):
NOMOR: [isi nomor]
TENTANG: [isi tentang]
TANGGAL: [isi tanggal dalam format DD-MM-YYYY]`;
// ====================================================

async function bacaCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            resolve(null);
            return;
        }
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

async function simpanCSV(filePath, data) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
    const csvWriter = createObjectCsvWriter({ path: filePath, header: headers });
    await csvWriter.writeRecords(data);
}

async function ekstrakSatuDokumen(page, url) {
    return new Promise(async (resolve) => {
        let isResolved = false;
        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                page.off('response', interceptor);
                resolve({ nodok: "gagal", tentang: "", tanggal: "" });
            }
        }, 50000);

        const interceptor = async (response) => {
            if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
                try {
                    const text = await response.text();
                    if (text.includes('NOMOR:') && text.includes('TANGGAL:')) {
                        const cleanText = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '');
                        const lastIndex = cleanText.lastIndexOf('NOMOR:');

                        if (lastIndex !== -1 && !isResolved) {
                            const finalChunk = cleanText.substring(lastIndex);
                            const mNomor = finalChunk.match(/NOMOR:\s*(.*?)(?=\n|"|$)/i);
                            const mTentang = finalChunk.match(/TENTANG:\s*(.*?)(?=\n|"|$)/i);
                            const mTanggal = finalChunk.match(/TANGGAL:\s*(.*?)(?=\n|"|$)/i);

                            let tentangFinal = "";
                            if (mTentang) {
                                let tentangRaw = mTentang[1].trim();
                                let pecahTentang = tentangRaw.split(/tentang\s+/i);
                                tentangFinal = pecahTentang.length > 1 ? pecahTentang.pop().trim() : tentangRaw;
                                tentangFinal = tentangFinal.replace(/^[:;.,\s]+/, '');
                            }

                            isResolved = true;
                            clearTimeout(timeoutId);
                            page.off('response', interceptor);
                            resolve({
                                nodok: mNomor ? mNomor[1].trim() : "gagal",
                                tentang: tentangFinal,
                                tanggal: mTanggal ? mTanggal[1].trim() : ""
                            });
                        }
                    }
                } catch (err) { }
            }
        };

        page.on('response', interceptor);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const xpathTombol = '::-p-xpath(//*[contains(text(), "Ask Gemini")])';
            const tombolGemini = await page.waitForSelector(xpathTombol, { timeout: 15000 });
            await page.evaluate(el => el.click(), tombolGemini);

            await new Promise(r => setTimeout(r, 6000));
            await page.mouse.click(KOORDINAT_X, KOORDINAT_Y);
            await new Promise(r => setTimeout(r, 500));

            await page.evaluate((teks) => {
                const el = document.querySelector('div[jsname="ZeIRi"]');
                if (el) {
                    el.innerText = teks;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }, PROMPT);

            await new Promise(r => setTimeout(r, 500));
            await page.keyboard.press('Enter');
        } catch (error) {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                page.off('response', interceptor);
                resolve({ nodok: "gagal", tentang: "", tanggal: "" });
            }
        }
    });
}

// ================= ALUR KERJA UTAMA =================
async function mulaiBatchProses() {
    console.log("=== SISTEM OTOMASI KEMITRAAN STRATEGIS (MODE RETRY GAGAL) ===");

    let dataLaporan = await bacaCSV(FILE_TERUPDATE);
    let sumber = FILE_TERUPDATE;

    if (!dataLaporan) {
        console.log(`ℹ️ File update belum ada, membaca dari file mentah...`);
        dataLaporan = await bacaCSV(FILE_MENTAH);
        sumber = FILE_MENTAH;
    }

    if (!dataLaporan || dataLaporan.length === 0) {
        console.log("❌ Tidak ada data untuk diproses.");
        return;
    }

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        userDataDir: 'C:\\OtomasiChrome',
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--start-maximized'],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null
    });

    const page = (await browser.pages())[0];
    let jumlahSukses = 0;

    for (let i = 0; i < dataLaporan.length; i++) {
        let row = dataLaporan[i];

        const isiNodok = (row['NODOK'] || "").trim().toLowerCase();

        // =========================================================
        // LOGIKA FILTER BARU: Proses jika kosong ATAU tertulis "gagal"
        // =========================================================
        const perluDiproses = isiNodok === "" || isiNodok === "gagal";

        if (!perluDiproses) {
            console.log(`⏭️ [Baris ${i + 1}] Lewati: Sudah terisi sukses (${row['NODOK']})`);
            continue;
        }

        let link = row['link_dokumen'];
        if (!link || link.trim() === "") {
            row['NODOK'] = "skip: link kosong";
            continue;
        }

        let hasilEkstraksi;
        for (let percobaan = 1; percobaan <= MAKSIMAL_COBA; percobaan++) {
            console.log(`\n▶️ [Baris ${i + 1}] Memproses... (Percobaan ${percobaan}/${MAKSIMAL_COBA})`);

            hasilEkstraksi = await ekstrakSatuDokumen(page, link);

            if (hasilEkstraksi.nodok !== "gagal") break;

            if (percobaan < MAKSIMAL_COBA) {
                console.log(`   🔄 Gagal, mencoba kembali dalam 3 detik...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        row['NODOK'] = hasilEkstraksi.nodok;
        row['tentang_2'] = hasilEkstraksi.tentang;
        row['tanggal_penetapan_2'] = hasilEkstraksi.tanggal;

        if (hasilEkstraksi.nodok !== "gagal") {
            console.log(`   ✅ SUKSES: ${hasilEkstraksi.nodok}`);
            jumlahSukses++;
        } else {
            console.log(`   ❌ TETAP GAGAL setelah ${MAKSIMAL_COBA}x percobaan.`);
        }

        await simpanCSV(FILE_TERUPDATE, dataLaporan);

        if (jumlahSukses >= TARGET_SUCCESS) {
            console.log(`\n🎯 Target ${TARGET_SUCCESS} baris sukses tercapai.`);
            break;
        }
    }

    console.log(`\n🏁 Selesai. Hasil akhir di ${FILE_TERUPDATE}`);
    await browser.close();
}

mulaiBatchProses();