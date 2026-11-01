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
