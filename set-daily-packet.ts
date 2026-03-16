
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateDailyMenuToPaketBasah() {
    console.log('Mengupdate item Menu Harian menjadi PAKET BASAH...')

    // Daftar item Menu Harian dari Excel yang diberikan
    const dailyMenuItems = [
        'Beras',
        'ayam dadu',
        'Tahu',
        'kembang kol frozen',
        'wortel',
        'minyak',
        'daun bawang',
        'tomat',
        'cabe merah',
        'gula pasir',
        'gula jawa',
        'bawang merah kupas',
        'bawang putih kupas',
        'garam',
        'chicken powder',
        'seledri',
        'bawang bombay',
        'ladaku',
        'Bawang Goreng',
        'Anggur',
        // 'Telur' -> Pengecualian: Telur ada di Paket Bumil & Keringan, tapi juga ada di "Tambahan protein" (hanya untuk bumil/busui)
        // Kita biarkan Telur tetap di Paket Keringan/Bumil karena itu prioritasnya, atau user ingin Telur di Menu Harian juga?
        // Dalam konteks "Tambahan protein", Telur di menu harian ini khusus Bumil/Busui.
        // Untuk amannya, kita set 'Telur' tetap di PAKET KERINGAN (sesuai diskusi sebelumnya) atau PAKET BASAH?
        // User minta "MANA PAKET BASAH NYA?".
        // Berdasarkan struktur, semua di atas header "PAKET BUMIL..." adalah Menu Harian (Paket Basah).
        // Jadi item-item ini harusnya masuk PAKET BASAH.
        // Tapi Gula, Garam, dll juga ada di Paket Bumil (bubur kacang hijau).
        // Strategi: Kita update item-item ini menjadi PAKET BASAH jika belum punya paket,
        // ATAU kita force update menjadi PAKET BASAH karena ini menu harian utama.
        // NAMUN, item seperti Gula Pasir, Gula Jawa, Daun Pandan, Jahe ada di Bubur Kacang Hijau (Paket Bumil).
        // Jika item sama digunakan di berbagai paket, idealnya field 'packet' bisa multiple atau kita pilih salah satu.
        // Karena user bertanya "MANA PAKET BASAH NYA?", asumsinya adalah item-item di list atas.
    ]

    // Note: Telur, Gula Pasir, Gula Jawa ada di multiple tempat.
    // Gula Pasir/Jawa di list atas masuk Menu Harian (Bumbu). Di bawah masuk Paket Bumil (Bubur).
    // Jika kita set jadi PAKET BASAH, nanti query Paket Bumil tidak nemu?
    // Tapi secara logistik, Gula Pasir ya Gula Pasir.
    // Mari kita set item-item unik di list atas menjadi PAKET BASAH.
    // Jika item ada di list Bumil, mungkin biarkan di Bumil atau set Basah?
    // Biasanya pengadaan Paket Basah (harian) lebih rutin.
    
    // Mari kita update yang PASTI Paket Basah dulu (Sayuran, Lauk, Bumbu Harian)
    const distinctDailyItems = [
        'Beras', 'ayam dadu', 'Tahu', 'kembang kol frozen', 'wortel',
        'minyak', 'daun bawang', 'tomat', 'cabe merah',
        'bawang merah kupas', 'bawang putih kupas', 'garam', 'chicken powder',
        'seledri', 'bawang bombay', 'ladaku', 'Bawang Goreng', 'Anggur'
    ]

    // Update item-item ini menjadi PAKET BASAH
    const result = await prisma.product.updateMany({
        where: {
            name: { in: distinctDailyItems }
        },
        data: {
            packet: 'PAKET BASAH'
        }
    })

    console.log(`✅ Updated ${result.count} items to PAKET BASAH.`)

    // Cek item Gula Pasir & Gula Jawa
    // Di Excel:
    // Menu Harian: Gula Pasir 4kg, Gula Jawa 1kg
    // Paket Bumil: Gula Pasir 2kg, Gula Jawa 6kg
    // Ini item yang sama. Kita perlu memutuskan labelnya.
    // Jika tujuannya untuk grouping di PO, biasanya item Sembako (Gula, Minyak, Beras) digabung.
    // Jika User ingin memisahkan "Ini Gula untuk Paket Basah" dan "Ini Gula untuk Paket Bumil",
    // maka harusnya ada 2 item berbeda di database (e.g. "Gula Pasir (Basah)", "Gula Pasir (Bumil)").
    // TAPI, karena namanya sama "gula pasir", sistem menganggapnya satu item.
    // Untuk saat ini, saya akan set Gula & Garam ke PAKET BASAH karena volume penggunaannya di menu harian juga besar/signifikan.
    
    const ambiguousItems = ['gula pasir', 'gula jawa']
    await prisma.product.updateMany({
        where: { name: { in: ambiguousItems } },
        data: { packet: 'PAKET BASAH' } // Default ke Basah/Harian
    })
    console.log(`✅ Updated ambiguous items (Gula) to PAKET BASAH.`)
}

updateDailyMenuToPaketBasah()
