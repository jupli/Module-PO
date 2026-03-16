const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Fungsi untuk membaca Excel dan mengekstrak data permintaan
function extractProcurementData(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File tidak ditemukan: ${filePath}`);
        return null;
    }

    console.log(`Membaca file: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama
    const sheet = workbook.Sheets[sheetName];
    
    // Ubah ke JSON array (2D array) agar mudah diproses per baris
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let processedData = [];
    let currentDay = null;
    let currentDate = null;
    let currentMenu = null;
    
    // Loop mulai dari baris ke-4 (index 3) karena baris 1-3 adalah header/judul
    // Struktur Excel:
    // Baris 1: Kosong/Judul
    // Baris 2: Header Kolom (HARI KE, MENU, BAHAN MAKANAN...)
    // Baris 3: Tanggal (SENIN, 12 JANUARI 2026)
    // Baris 4+: Data
    
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Lewati baris kosong
        if (!row || row.length === 0) continue;

        // Deteksi Baris Tanggal (Biasanya kolom pertama ada isinya tapi bukan angka, dan panjang)
        // Contoh: "SENIN, 12 JANUARI 2026"
        const firstCell = row[0];
        if (typeof firstCell === 'string' && (firstCell.includes('SENIN') || firstCell.includes('SELASA') || firstCell.includes('RABU') || firstCell.includes('KAMIS') || firstCell.includes('JUMAT') || firstCell.includes('SABTU') || firstCell.includes('MINGGU'))) {
            currentDate = firstCell.trim();
            console.log(`📅 Menemukan Tanggal Baru: ${currentDate}`);
            continue; // Lanjut ke baris berikutnya
        }

        // Deteksi Baris Header (HARI KE, MENU...) -> Skip
        if (row[1] === 'MENU' || row[2] === 'BAHAN MAKANAN') continue;

        // Ambil Data Utama
        // Kolom 0: HARI KE
        // Kolom 1: MENU
        // Kolom 2: BAHAN MAKANAN
        // Kolom 12: TOTAL KEBUTUHAN Kg (Kolom M, index 12)
        // Kolom 13: SATUAN (Kolom N, index 13)
        // Kolom 14: CATATAN (Kolom O, index 14)

        const hariKe = row[0];
        const menu = row[1];
        const bahanMakanan = row[2];
        const totalKebutuhan = row[12];
        const satuan = row[13];
        const catatan = row[14];

        // Validasi: Harus ada Nama Bahan Makanan
        if (!bahanMakanan) continue;

        // Logika Fill Down (Jika Hari/Menu kosong, pakai yang sebelumnya)
        if (hariKe) currentDay = hariKe;
        if (menu) currentMenu = menu;

        // Bersihkan angka Total Kebutuhan (kadang ada koma/titik string)
        let qty = 0;
        if (typeof totalKebutuhan === 'number') {
            qty = totalKebutuhan;
        } else if (typeof totalKebutuhan === 'string') {
            qty = parseFloat(totalKebutuhan.replace(',', '.')); // Handle koma desimal
        }

        // Masukkan ke hasil olahan
        processedData.push({
            tanggal: currentDate || 'TANGGAL BELUM DISET',
            hari_ke: currentDay,
            kategori_menu: currentMenu || 'UMUM',
            nama_bahan: bahanMakanan,
            jumlah_kebutuhan: parseFloat(qty.toFixed(3)), // Ambil 3 desimal
            satuan: satuan || 'Unit',
            catatan: catatan || '-'
        });
    }

    return processedData;
}

// Eksekusi
const inputFile = 'D:\\testcase.xlsx'; // Sesuaikan path jika perlu
const outputData = extractProcurementData(inputFile);

if (outputData && outputData.length > 0) {
    console.log('\n✅ BERHASIL MENGEKSTRAK DATA PERMINTAAN:');
    console.log('==========================================');
    // Tampilkan tabel rapi
    console.table(outputData.map(item => ({
        Tanggal: item.tanggal,
        Menu: item.kategori_menu,
        Bahan: item.nama_bahan,
        Qty: `${item.jumlah_kebutuhan} ${item.satuan}`,
        Catatan: item.catatan ? item.catatan.substring(0, 20) + '...' : '-'
    })));

    // Simpan hasil ke JSON file (simulasi masuk database)
    const outputJsonPath = path.join('D:\\', 'hasil_import_permintaan.json');
    fs.writeFileSync(outputJsonPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Data tersimpan di: ${outputJsonPath}`);
} else {
    console.log('⚠️ Tidak ada data valid yang ditemukan.');
}
