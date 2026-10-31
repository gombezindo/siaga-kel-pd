# Siaga Keluarga

Aplikasi statis kesiapsiagaan keluarga untuk Malang Selatan. Source publik ada di `app/`; konfigurasi Firebase Hosting memakai folder tersebut. Tidak ada build atau dependensi aplikasi.

## Jalankan lokal

```sh
python3 -m http.server 8765 --directory app
node --test tests/readiness.cjs
```

Buka http://localhost:8765. Service worker memerlukan localhost atau HTTPS.

## Perubahan 31 Oktober 2026

- Header menampilkan **checklist selesai**, bukan klaim persentase keselamatan.
- Progres memisahkan stok dikonfirmasi dan persiapan. Barang tercentang yang jatuh tempo hari ini atau kedaluwarsa tidak dihitung. Tanggal yang belum diisi dilaporkan terpisah.
- Konfirmasi menyimpan jumlah kebutuhan item saat dicentang. Perubahan jumlah kebutuhan meminta pemeriksaan ulang. Centang versi lama tetap disimpan, tetapi memerlukan konfirmasi sekali. Peralatan dengan kebutuhan tetap tidak ikut dibatalkan.
- Layar darurat menampilkan satu bencana dan tiga tindakan utama. Detail dapat dibuka; cetak tetap mencakup semua bencana beserta detail.
- Tautan sumber resmi tersedia per bencana dan di Kontak. Tautan eksternal memerlukan internet; ringkasan di-cache offline.
- Cache service worker naik ke v2. Respons server yang gagal tidak menimpa halaman offline.

Data tetap memakai kunci localStorage versi lama; tambahan `confirmed` ikut dalam ekspor JSON. Progres bukan verifikasi jumlah fisik, kelayakan barang, atau kelengkapan rencana kontak. Saat kebutuhan berubah, periksa kembali persediaan sebenarnya.

## Rujukan yang ditinjau

Tanggal peninjauan: 31 Oktober 2026, bukan tanggal terbit sumber.

- [BMKG: Antisipasi Gempa Bumi](https://www.bmkg.go.id/gempabumi/mitigasi/antisipasi-gempabumi): tindakan saat/setelah gempa.
- [BNPB: Buku Saku Tanggap Tangkas Tangguh](https://bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf): ringkasan tsunami, banjir, longsor, erupsi, tas siaga.
- [CDC: keselamatan saat listrik padam](https://www.cdc.gov/natural-disasters/response/what-to-do-protect-yourself-during-a-power-outage.html): pangan, genset, karbon monoksida.
- [BPBD Kabupaten Malang](https://bpbd.malangkab.go.id/): rujukan informasi daerah. Tidak dilakukan uji sambung nomor telepon atau verifikasi lapangan jalur evakuasi.

Riset lama di `riset/RISET.md` merupakan catatan awal, bukan bukti bahwa seluruh klaim dan formula sudah divalidasi. Angka kalkulator masih estimasi aplikasi. Penelaahan panduan oleh BPBD/tenaga kompeten tetap diperlukan sebelum menyatakan konten tervalidasi menyeluruh.

## Saran fitur berikutnya

Urutan pengembangan yang disarankan; belum diimplementasikan:

1. **Jumlah stok dan daftar belanja** — masukkan jumlah tersedia, hitung kekurangan, kelompokkan belanja prioritas; dukung satuan dan beberapa batch kedaluwarsa. Pisahkan persediaan rumah dan tas evakuasi.
2. **Kartu rencana keluarga** — cetak ringkas satu halaman berisi titik kumpul, kontak, pembagian tugas, dan kebutuhan khusus; dapat dipakai saat HP mati.
3. **Rotasi dan latihan berkala** — tanggal pemeriksaan terakhir, jadwal latihan, ekspor pengingat kalender; jangan menjanjikan notifikasi latar belakang sebelum dukungan perangkat diuji.
4. **Profil lokasi dan aksesibilitas keluarga** — desa, pesisir/lereng, keterbatasan mobilitas, jalur yang dikonfirmasi pengguna bersama petugas. Jangan membuat jalur evakuasi otomatis yang belum divalidasi.
5. **Keandalan penyimpanan** — validasi skema impor sebelum menimpa data, pemberitahuan gagal simpan, cadangan berkala; jelaskan bahwa hapus data browser dapat menghapus catatan keluarga.

## Publikasi

Perubahan ini disiapkan dan diuji lokal. Untuk publikasi gunakan proyek Firebase yang sudah dikonfigurasi, setelah memastikan target akun/proyek benar. Tidak perlu memindahkan hosting atau membuat Site baru.
