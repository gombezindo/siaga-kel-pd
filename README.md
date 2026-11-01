# Siaga Keluarga

Aplikasi statis kesiapsiagaan keluarga, dengan mode **Malang Selatan** dan **Indonesia (umum)**. Source publik ada di `app/`; konfigurasi Firebase Hosting memakai folder tersebut. Tidak ada build. Satu-satunya pustaka pihak ketiga adalah `app/vendor/qrcode.js` ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4, MIT, Kazuhiko Arase) untuk membuat QR code secara offline.

## Firebase

- Hosting: folder `app/` (`firebase deploy --only hosting`).
- Firestore (lokasi dan chat): `firestore.rules`, `firestore.indexes.json` (`firebase deploy --only firestore`). Database `(default)` di `asia-southeast2`.

## Jalankan lokal

```sh
python3 -m http.server 8765 --directory app
node --test tests/readiness.cjs
```

Buka http://localhost:8765. Service worker memerlukan localhost atau HTTPS.

## Perubahan v1.7 (1 November 2026)

- Navigasi diringkas dari enam menjadi lima kategori utama: **Beranda, Persiapan, Darurat, Komunitas, Rencana**. Stok/belanja dan rencana berkala menjadi subtab Persiapan; Pustaka menjadi subtab Darurat.
- **Chat keluarga online** memakai kode grup keluarga yang sama dengan lokasi live. Pesan maksimal 280 karakter dan hanya ditampilkan selama 48 jam.
- **Ruang saling bantu warga** bersifat undangan untuk RT, desa, posko, atau komunitas. Tidak ada daftar ruang global. Pesan dapat ditandai sebagai Obrolan, Butuh bantuan, Bisa membantu, atau Info warga.
- Kode acak ruang berfungsi sebagai kunci akses. UI memperingatkan pengguna agar tidak membagikan data sensitif, memverifikasi kabar melalui sumber resmi, dan memakai 112/119 untuk ancaman jiwa. Ini bukan sistem identitas atau moderasi penuh; untuk forum publik skala besar perlu Firebase Authentication, App Check, moderasi, pelaporan, dan admin tepercaya.
- Aturan Firestore membatasi bentuk, panjang, kategori, dan masa berlaku pesan; pembaruan pesan ditolak dan penghapusan oleh klien hanya diizinkan setelah kedaluwarsa.
- Empat pilihan tampilan tersimpan per perangkat: **Light**, **Dark**, **Night** yang lebih redup, dan **Hemat baterai** dengan latar hitam OLED serta animasi/transisi dimatikan. Hemat baterai tidak mematikan internet atau pemantauan keselamatan; pengaturan itu tetap dikendalikan oleh Mode aplikasi. Service worker v8.

## Perubahan v1.6 (1 November 2026)

- **🆘 Mode Darurat** (tombol merah di atas tab Keluarga, shortcut layar utama "Mode darurat", dan tombol di banner gempa): layar penuh kontras tinggi, layar dijaga menyala. Pilih situasi — gempa, tsunami, banjir, longsor, erupsi & abu, angin kencang, listrik padam, terjebak reruntuhan — lalu ikuti **langkah satu per satu** (✓ Sudah, lanjut). Setiap situasi menampilkan **tujuan aman** (mis. banjir → tempat tinggi/bukit/posko; gempa → lapangan terbuka jauh dari bangunan, tiang listrik, pohon, papan reklame), **titik kumpul & rute keluarga** dengan tautan peta, dan **daftar bawa** yang menyesuaikan keluarga (bayi, ibu hamil, obat rutin, alat bantu, hewan). Gempa di pesisir mengarah ke Mode Tsunami. Bar cepat: kedip/bunyi SOS, saya aman, butuh bantuan, telepon 112. Jalan tanpa internet.
- **🛠️ Keterampilan bertahan hidup** (Pustaka): lampu darurat dari minyak goreng bekas, filter air berlapis (pasir & arang — hanya menjernihkan, wajib direbus; biosand asli butuh 2–4 minggu pematangan), kompor kaleng (hobo stove), menampung air hujan, atap terpal bentuk A. Tiap topik berisi bahan, langkah, larangan keselamatan, dan rujukan. Video: CAWST (resmi) untuk filter; untuk lampu & kompor hanya tautan pencarian YouTube berlabel "bukan rekomendasi resmi" (tidak ditemukan video dari sumber kredibel).
- Service worker v6.

## Perubahan v1.5 (1 November 2026)

- **Mode Online / Offline** (tab Keluarga). Offline: aplikasi tidak mengambil atau mengirim data apa pun ke internet; semua panduan tetap jalan. Online: cuaca, peringatan gempa, video, dan lokasi keluarga.
- **Peringatan gempa BMKG** (mode online, selama aplikasi terbuka): memantau `autogempa`, `gempaterkini`, dan `gempadirasakan` tiap menit. Banner merah + getar + bunyi (dan notifikasi sistem bila diizinkan) untuk gempa ≤60 menit terakhir dalam radius pilihan (100–1.000 km) dari lokasi/titik kumpul; **berpotensi tsunami** selalu diperingatkan dalam 1.000 km. Tidak dobel untuk gempa yang sama. Tombol uji & cek sekarang. Ditegaskan di UI: bukan peringatan dini, dan untuk notifikasi saat aplikasi tertutup pakai InfoBMKG (push server tidak dibuat — perlu paket Blaze).
- **Kabar & lokasi keluarga** (tab Rencana):
  - **Check-in "Saya aman / Butuh bantuan"** dengan koordinat GPS → SMS ke pusat kabar, WhatsApp, atau bagikan — jalan tanpa internet.
  - **Lokasi live keluarga** via **Cloud Firestore (asia-southeast2, Jakarta)** di project `siagakel-pd`, lewat REST tanpa SDK. Grup dengan kode acak 128-bit (ikut di QR); tiap HP harus setuju sendiri untuk membagikan lokasi; hanya lokasi terakhir (tanpa riwayat), diperbarui tiap 5 menit selama aplikasi terbuka; lokasi >24 jam disembunyikan; bisa hapus lokasi & keluar grup kapan saja. TTL otomatis Firestore butuh paket berbayar — tidak dipakai.
  - Aturan keamanan `firestore.rules`: hanya path `fam/{gid}/m/{mid}` (gid 20–40 karakter, tidak bisa di-list), validasi bentuk data, status, koordinat, dan timestamp ±1 jam dari waktu server. Diuji: field asing, timestamp palsu, kode pendek, daftar grup, dan koleksi lain ditolak.
- **Video tutorial** (tab Pustaka, butuh internet): 10 video resmi Info BMKG (diverifikasi via oEmbed) per kelompok sebelum/peringatan dini/saat & setelah; dimuat hanya saat diputar (youtube-nocookie); bisa menambah video YouTube sendiri.
- **Aktivitas tanpa internet** (tab Pustaka): olahraga tanpa alat dengan pengatur waktu & bunyi (ringan untuk lansia/anak, kebugaran), **Kuis Siaga** 16 soal dari isi aplikasi (skor terbaik tersimpan), **Tebak Morse**, dan ide kegiatan keluarga/belajar/tenang.
- Service worker v5 (+ klik notifikasi membuka panduan bencana).

## Perubahan v1.4 (1 November 2026)

- **Tab baru 📚 Pustaka** (semua offline):
  - **Alat sinyal darurat:** layar berkedip pola SOS (Morse, satuan 250 ms), bunyi SOS 2 kHz, atau keduanya; layar dijaga tetap menyala (Wake Lock bila didukung); ketuk layar atau Esc untuk berhenti.
  - **Pesan darurat (SMS):** menyusun SMS siapa–di mana–kejadian–kondisi–kebutuhan–jam, dengan koordinat GPS (tanpa internet) dan tautan peta; nomor tujuan diambil dari "pusat kabar". Dikirim lewat aplikasi SMS HP.
  - **Bertahan hidup (9 topik):** air minum aman, toilet & kebersihan darurat, makanan tanpa listrik, tempat berlindung, penerangan & api, arah tanpa internet, menenangkan diri & orang lain (P3K psikologis WHO), kembali ke rumah, di pengungsian.
  - **Komunikasi & radio (6 topik):** HP saat jaringan padat (SMS), radio FM/RRI, **HT PMR 409 MHz tanpa ISR** (409,74375–409,99375 MHz, 20 kanal, maks. 500 mW, perangkat bersertifikat — Permenkominfo 2/2023, diubah Permen Komdigi 2/2025), ORARI & RAPI (wajib izin), cara bicara di radio, isyarat minta tolong.
  - **Kode Morse** (teks → kode, kirim lewat kedip/bunyi) dan **alfabet fonetik**.
  - **Ensiklopedia & peta offline:** panduan Kiwix (Wikipedia bahasa Indonesia, WikiMed, Wikivoyage), Organic Maps, PDF BNPB.
  - **Pencarian** lintas Pustaka, P3K, dan Saat Bencana.
- Kolom rencana baru **Radio** (kanal HT keluarga, frekuensi RRI/radio lokal) — ikut di kartu darurat dan QR.
- Sengaja **tidak** dicantumkan: takaran tetes kaporit/pemutih (kadar produk berbeda-beda), daftar frekuensi ORARI/RAPI (wajib izin, berbeda per daerah), dan waktu SODIS (belum terverifikasi).

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
- **Pasang di HP (PWA).** Kartu "Pasang Siaga Keluarga di HP" di tab Keluarga dan tombol 📲 di tab Rencana. Di Chrome/Edge memakai dialog pasang bawaan (`beforeinstallprompt`); bila tidak tersedia, tampil langkah manual sesuai perangkat: Android Chrome, iPhone Safari, desktop, atau browser di dalam aplikasi (WhatsApp/Instagram/Facebook) yang harus dibuka dulu di Chrome/Safari. "Nanti" menyembunyikan kartu 14 hari; tersembunyi otomatis saat sudah terpasang/berjalan sebagai aplikasi.
- **Manifest lebih lengkap:** `id`, deskripsi umum, kategori, 4 screenshot (`app/screenshots/`, untuk dialog pasang yang lebih kaya di Android), dan 4 shortcut tekan-lama ikon: Tindakan darurat, P3K, Daftar belanja, Rencana (`?tab=…&act=…&view=…`). Cache service worker naik ke v4 agar manifest baru sampai ke HP yang sudah memasang.
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

Branch rilis terbaru disiapkan per versi (`v1.6`, `v1.7`, dan seterusnya). Untuk publikasi gunakan proyek Firebase `siagakel-pd` yang sudah dikonfigurasi, setelah memastikan target akun/proyek benar. Fitur chat v1.7 memerlukan deploy Hosting **dan** Firestore rules.
