# Siaga Keluarga

Aplikasi statis kesiapsiagaan keluarga, dengan mode **Malang Selatan** dan **Indonesia (umum)**. Source publik ada di `app/`; konfigurasi Firebase Hosting memakai folder tersebut. Tidak ada build. Satu-satunya pustaka pihak ketiga adalah `app/vendor/qrcode.js` ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4, MIT, Kazuhiko Arase) untuk membuat QR code secara offline.

## Jalankan lokal

```sh
python3 -m http.server 8765 --directory app
node --test tests/readiness.cjs
```

Buka http://localhost:8765. Service worker memerlukan localhost atau HTTPS.

## Perubahan v1.3 (1 November 2026)

- **Ketahanan logistik.** Kartu di tab Keluarga menghitung berapa hari stok yang sudah ada cukup: air minum (galon + botol + air buatan sendiri bersatuan liter), makan dimasak (beras dibatasi gas, perlu kompor), dan makanan siap makan. Ketahanan = minimum air vs makanan; ada petunjuk apa yang paling membatasi. Pembelian kedaluwarsa tidak dihitung.
- **Kesiapan per bencana.** Tiap bencana punya daftar barang penting (`KITS`); skor persentase tampil di tab Keluarga dan di tiap kartu Saat Bencana. Ketuk untuk membuka Stok yang difilter ke bencana itu. Barang kebutuhan khusus dan obat rutin dihitung untuk semua bencana.
- **Tambah barang sendiri.** Nama, kategori, lokasi (rumah/tas), jumlah & satuan (kosong = cukup dicentang), prioritas, bisa kedaluwarsa, dan bencana terkait. Ikut di checklist, daftar belanja, progres, skor bencana, dan file cadangan (divalidasi). Tidak ikut QR.
- **Panduan P3K offline** (tab Saat Bencana → Pertolongan pertama): langkah pertama, perdarahan hebat, RJP, tersedak, luka bakar, patah tulang, syok, luka & luka setelah banjir, diare/dehidrasi. Tingkat awam, dengan larangan dan kapan harus ke faskes; rujukan AHA, Stop the Bleed (ACS), Palang Merah. Resep oralit buatan sendiri sengaja tidak dicantumkan (takaran antarsumber tidak konsisten) — utamakan oralit kemasan. **Perlu ditinjau tenaga kesehatan sebelum dianggap final.**
- **Tinjauan P3K:** isi diperiksa ulang terhadap AHA/American Red Cross 2024–2025, Stop the Bleed, Kemenkes, dan WHO. Ditambahkan: RJP napas buatan untuk korban tenggelam & anak, RJP bayi, AED, tersedak pada bayi, torniket darurat yang benar, tanda menghirup asap & luka bakar dalam, pendinginan anak, posisi pemulihan saat syok, cuci luka & vaksin rabies setelah gigitan hewan, zinc untuk balita diare, tanda bahaya tambahan. Rujukan yang tidak mendukung isi diganti. **Lembar tinjauan untuk tenaga kesehatan:** `riset/REVIEW-P3K.md` (dibuat dari data aplikasi, ada kolom setuju/ubah dan pengesahan).
- **Perkiraan biaya belanja:** isi harga per satuan di Daftar belanja; total utama/tambahan, jumlah barang tanpa harga, uang tunai dihitung otomatis; ikut di teks yang dibagikan dan cetakan. Harga tersimpan.
- **Kalkulator daya & BBM** (tab Jauh Hari): gas kaleng (hari memasak), powerbank (kali isi HP & hari), kendaraan (jangkauan aman vs rute terjauh pulang-pergi), panel surya (Wh/hari & kali isi HP). Gas & powerbank dari stok; asumsi bisa diubah.
- **Titik kumpul & rute evakuasi** (tab Rencana): simpan koordinat dengan GPS atau tempel dari peta, tombol buka di peta; rute dengan tujuan, jarak, jalur, perkiraan waktu jalan kaki dan BBM. Ikut di kartu darurat, QR, dan cadangan.
- **Kondisi sekitar** (online, tab Keluarga): cuaca & prakiraan 3 hari, kualitas udara (Open-Meteo), gempa terbaru (BMKG) dengan jarak; peringatan otomatis (udara tidak sehat, hujan lebat, gempa ≥ M5 dalam 300 km) menuju panduan terkait. Lokasi default Malang Selatan, GPS (dibulatkan ±1 km), atau cari kota. Data terakhir tetap tampil saat offline; dimuat ulang maksimal tiap 30 menit.
- Perbaikan: tombol "Buka tindakan darurat" sebelumnya tak terbaca (teks putih di latar putih karena urutan CSS).

## Perubahan v1.2 (31 Oktober 2026)

- **Stok aktual & daftar belanja.** Barang yang dapat dihitung punya jumlah *tersedia*; aplikasi menghitung kekurangan dari jumlah anggota keluarga dan durasi. Tab Stok punya tampilan **Daftar belanja** yang memisahkan kebutuhan **utama** dan **tambahan**, bisa dibagikan sebagai teks atau dicetak (±3 halaman A4 untuk 6 orang/7 hari).
- **Beberapa tanggal kedaluwarsa per barang.** Barang yang bisa kedaluwarsa dicatat per pembelian (jumlah + tanggal). Pembelian kedaluwarsa tidak dihitung tersedia dan muncul di "Perlu rotasi".
- **Stok rumah vs tas evakuasi.** Filter Semua / Stok rumah / Tas evakuasi; kategori tas evakuasi dirinci per barang.
- **Kebutuhan khusus.** Pilihan ibu hamil, obat rutin, disabilitas/alat bantu, dan hewan peliharaan menambahkan daftar persiapan non-medis. Kebutuhan medis tidak ditebak; pengguna mengisi kebutuhan & tugas per anggota.
- **Kartu darurat keluarga.** Satu halaman A4 berisi alamat, titik kumpul, pusat kabar, nomor penting, tabel anggota (gol. darah, obat/alergi, kebutuhan, tugas), dan 3 tindakan per bencana.
- **Jadwal pemeriksaan berkala** (stok, daya, latihan evakuasi, kartu, cadangan) dengan ekspor pengingat ke kalender (`.ics`, berulang). Aplikasi tidak mengirim notifikasi sendiri.
- **Bagikan lewat QR code.** Rencana, kontak, dan data anggota (bukan stok) dikompresi ke tautan `#import=…`. HP penerima yang pernah membuka aplikasi bisa mengimpor tanpa internet; selalu ada konfirmasi sebelum data diganti.
- **Mode Indonesia (umum).** Teks tidak lagi khusus Malang; profil risiko lokasi (pantai, gunung api, lereng, sungai, asap) mengurutkan bencana yang relevan; tautan InaRISK; tambahan kartu **cuaca ekstrem** (semua mode) dan **kabut asap karhutla** (mode umum).
- **Penyimpanan lebih andal.** Status tersimpan/gagal simpan, tanggal cadangan terakhir + pengingat, validasi file cadangan dan QR (bidang tak dikenal dibuang, data asing ditolak, ringkasan isi sebelum mengganti), `navigator.storage.persist()`.
- **Perbaikan dari review v1.1:** blok mati `status`/`it` di daftar persiapan dihapus; label tombol bencana kini bagian dari data `HAZ`.
- Cache service worker naik ke v3 (ikut menyimpan `vendor/qrcode.js`).

### Data & migrasi

Kunci localStorage tetap `siaga-keluarga-v1`; skema kini `v: 2`. Data v1/v1.1 dimigrasi otomatis: tanggal kedaluwarsa tunggal menjadi satu catatan pembelian (jumlah 0), dan barang yang dulu dicentang tampil "perlu diisi jumlahnya". Field `confirmed` tidak dipakai lagi. File cadangan lama tetap bisa dipulihkan.

Progres bukan verifikasi jumlah fisik, kelayakan barang, atau kelengkapan rencana kontak.

## Rujukan yang ditinjau

Tanggal peninjauan: 31 Oktober 2026, bukan tanggal terbit sumber.

- [BMKG: Antisipasi Gempa Bumi](https://www.bmkg.go.id/gempabumi/mitigasi/antisipasi-gempabumi): tindakan saat/setelah gempa.
- [BNPB: Buku Saku Tanggap Tangkas Tangguh](https://bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf): ringkasan tsunami, banjir, longsor, erupsi, tas siaga.
- [BMKG: cuaca ekstrem puting beliung](https://www.bmkg.go.id/siaran-pers/bmkg-fenomena-cuaca-ekstrem-puting-beliung-terjadi-di-wilayah-jawa-barat-apa-dan-bagaimana-potensi-ke-depannya): tanda & potensi puting beliung.
- [Kemenkes: masker & kualitas udara saat asap karhutla](https://kemkes.go.id/id/menkes-pakai-masker-dan-pantau-kualitas-udara-untuk-cegah-dampak-asap-karhutla).
- [InaRISK BNPB](https://inarisk.bnpb.go.id/): cek risiko lokasi. [MAGMA Indonesia](https://magma.esdm.go.id/): status gunung api.
- [CDC: keselamatan saat listrik padam](https://www.cdc.gov/natural-disasters/response/what-to-do-protect-yourself-during-a-power-outage.html): pangan, genset, karbon monoksida.
- [BPBD Kabupaten Malang](https://bpbd.malangkab.go.id/): rujukan informasi daerah. Tidak dilakukan uji sambung nomor telepon atau verifikasi lapangan jalur evakuasi.

Catatan riset lengkap (termasuk celah: pedoman resmi ibu hamil dan panduan disabilitas versi Indonesia tidak ditemukan online) ada di `riset/RISET.md`. Angka kalkulator masih estimasi aplikasi. Penelaahan panduan oleh BPBD/tenaga kompeten tetap diperlukan sebelum menyatakan konten tervalidasi menyeluruh.

## Publikasi

Branch `v1.2`. Untuk publikasi gunakan proyek Firebase `siagakel-pd` yang sudah dikonfigurasi, setelah memastikan target akun/proyek benar.
