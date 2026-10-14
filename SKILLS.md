# SKILLS.md — ERP Fashol Finance

> Dokumen ini menjadi panduan kerja untuk AI coding agent/developer saat menganalisis, membangun, menguji, dan memelihara aplikasi **ERP Fashol – Finance**.  
> **Sumber acuan utama:** SPK *Jasa Pengembangan Aplikasi ERP Fashol – Finance*, khususnya Pasal 1 tentang ruang lingkup pekerjaan. Jika kebutuhan tidak tercantum atau ambigu, jangan menganggapnya otomatis termasuk scope.

---

## 1. Peran dan Tujuan

Bertindak sebagai **Senior Software Engineer, Business Analyst, dan QA Engineer** yang mengembangkan aplikasi Finance sesuai SPK dan keputusan tertulis PARA PIHAK.

Prioritas kerja:
1. Memenuhi kebutuhan yang tertulis di SPK.
2. Menjaga konsistensi data dan perhitungan lintas modul.
3. Mempertahankan histori transaksi agar perubahan master/tarif tidak mengubah transaksi lama.
4. Menghindari pencatatan biaya ganda.
5. Menghasilkan kode yang dapat diuji, dirawat, dan dipahami.
6. Menghindari penambahan fitur di luar scope tanpa persetujuan tertulis.

Jangan mengklaim fitur selesai hanya karena halaman UI sudah dibuat. Fitur dianggap selesai setelah alur data, validasi, otorisasi, perhitungan, dan pengujiannya berjalan.

## 2. Sumber Kebenaran dan Pengelolaan Ambiguitas

Urutan acuan:
1. SPK yang telah disepakati.
2. Spesifikasi kebutuhan, alur, field, dan hak akses yang telah disetujui PARA PIHAK.
3. Keputusan atau Change Request tertulis yang disetujui setelah SPK.
4. Implementasi yang sudah ada, selama tidak bertentangan dengan ketentuan di atas.

Jika ada konflik atau ketidakjelasan:
- Jangan menebak aturan bisnis yang memengaruhi uang, payroll, HPP, histori, atau laporan.
- Catat pertanyaan secara spesifik dan jelaskan dampak dari setiap kemungkinan jawaban.
- Minta konfirmasi sebelum menerapkan keputusan yang berisiko.
- Jangan mengubah scope berdasarkan asumsi, kebiasaan developer, atau saran AI semata.

### Area yang perlu dikonfirmasi saat analisis
- Formula lengkap HPP per unit, metode alokasi biaya, dan perlakuan biaya bahan/biaya produksi lain.
- Definisi, sumber, dan mekanisme pencatatan penjualan/produk terjual untuk HPP penjualan dan laba/rugi.
- Aturan tanggal efektif tarif dan pemilihan tarif saat transaksi dibuat atau dikoreksi.
- Apakah payroll bulanan memiliki komponen tambahan, formula, atau batasan selain field yang disebutkan di SPK.
- Alur persetujuan payroll, pihak yang boleh mengubah status, dan kondisi koreksi payroll yang sudah disetujui/dibayar.
- Format final cetak/unduh laporan.
- Detail audit trail, backup, retensi data, keamanan, dan target performa bila belum ditentukan di spesifikasi yang disetujui.

Jangan menganggap daftar di atas otomatis merupakan fitur tambahan yang disetujui. Gunakan sebagai daftar klarifikasi.

## 3. Ruang Lingkup Produk

Aplikasi berfokus pada pencatatan produksi, penggajian, biaya produksi, HPP, pendapatan/pengeluaran, dan laporan Finance internal.

Alur utama:

`HPP & Tarif Proses → Produksi Harian → Riwayat Produksi → Payroll Mingguan → Rekap Biaya Produksi → Laporan Finance`

Payroll bulanan menjadi sumber rekap biaya gaji sesuai periode. Data pendapatan, HPP penjualan, dan pengeluaran menjadi dasar laporan laba/rugi sederhana.

Aplikasi Finance **bukan sistem Warehouse**. Master produk pada Finance hanya menjadi referensi, bukan pengelolaan persediaan.

## 4. Modul dan Perilaku Wajib

### Modul 1 — Master Pekerja
Data minimum:
- ID Pekerja
- Nama Pekerja
- Jenis Pekerja
- Proses/bagian pekerjaan
- Sistem pembayaran: borongan berdasarkan kuantitas, harian, atau bulanan
- Status aktif/nonaktif
- Keterangan

Ketentuan:
- Tarif borongan merujuk pada tarif di modul HPP.
- Data pekerja harian/bulanan dapat memiliki komponen pembayaran sesuai aturan yang disepakati.
- Hindari menghapus pekerja yang sudah memiliki histori transaksi; gunakan status nonaktif atau mekanisme yang menjaga histori.

### Modul 2 — Produksi Harian
Setiap transaksi memiliki **satu tanggal, satu pekerja, dan satu proses pekerjaan**, tetapi dapat memuat banyak baris produk/varian/warna.

Data minimum:
- Nomor transaksi
- Tanggal produksi
- Pekerja
- Proses pekerjaan
- Catatan
- Detail produk: produk, varian, warna, kuantitas, tarif, total upah

Perilaku:
- Mendukung aksi Tambah Baris.
- Tarif diambil otomatis dari HPP berdasarkan produk dan proses terkait.
- Total upah baris = kuantitas × tarif yang berlaku.
- Simpan tarif yang digunakan sebagai snapshot historis pada detail transaksi.
- Perubahan tarif berikutnya tidak boleh mengubah nilai transaksi lama.
- Validasi bahwa tarif yang sesuai tersedia dan aktif; jika tidak, jangan diam-diam menggunakan tarif lain atau nol.

### Modul 3 — Riwayat Produksi Harian
Tampilkan detail pada tabel tanpa mewajibkan pengguna membuka halaman detail transaksi.

Kolom minimum:
- Nomor transaksi, tanggal, pekerja, proses, produk, varian, warna, kuantitas, tarif, total upah.

Fitur:
- Pencarian/filter tanggal atau periode, pekerja, proses, produk, varian, dan warna.
- Total kuantitas dan total upah mengikuti filter aktif.
- Lihat dan koreksi transaksi sesuai hak akses.
- Jika transaksi telah masuk ke payroll berstatus disetujui atau dibayar, gunakan mekanisme koreksi yang dapat ditelusuri; jangan mengubah histori secara diam-diam.

### Modul 4 — Penggajian Produksi Mingguan
- Periode payroll: Kamis sampai Rabu.
- Jadwal pembayaran: Kamis, sesuai kebijakan operasional klien.
- Akumulasi produksi harian per pekerja dalam periode payroll.
- Tampilkan nomor payroll, periode, pekerja, total kuantitas, total upah, status, dan aksi.
- Detail harus dapat ditelusuri ke tanggal, proses, produk, varian, warna, kuantitas, tarif, dan total upah.
- Status yang disebut SPK: `Draft`, `Diperiksa`, `Disetujui`, `Dibayar`.
- Hak untuk mengubah status mengikuti alur yang disepakati.
- Data payroll mingguan menjadi referensi biaya produksi tanpa input ulang.

Jangan mengasumsikan aturan pembulatan, penguncian, pembatalan, atau pembukaan ulang payroll jika belum ditentukan.

### Modul 5 — Penggajian Bulanan
Data minimum:
- Nomor payroll
- Pekerja
- Bagian/posisi
- Periode
- Gaji pokok
- Tunjangan
- Lembur
- Insentif
- Potongan
- Total gaji
- Status pembayaran

Perilaku:
- Hitung total gaji berdasarkan komponen yang diinput sesuai formula yang disepakati.
- Sediakan riwayat dan filter periode serta status pembayaran.
- Jangan menciptakan aturan pajak, BPJS, prorata, lembur, atau formula payroll yang tidak ditentukan dalam kebutuhan yang disetujui.

### Modul 6 — HPP Produk
Data produk minimum:
- ID produk yang tetap
- Nama produk
- Kategori/varian relevan
- Status aktif/nonaktif

Contoh produk awal dalam SPK: Baggy Pants Reguler, Baggy Pants Premium, Scuba Pants, Pants, dan Jogger Pants Reguler. Daftar final mengikuti master produk yang disepakati.

Contoh proses: Potong, Jahit Luar, Jahit Dalam, Kansay, Overdeck, QC, Finish Good, dan Packing.

Data tarif minimum:
- Produk
- Proses
- Satuan perhitungan
- Tarif
- Tanggal berlaku
- Status aktif/nonaktif

Perilaku:
- Tarif dikelola di modul ini dan digunakan otomatis di Produksi Harian.
- Dukung pencatatan komponen biaya bahan dan biaya produksi lain yang disepakati.
- HPP produksi per unit harus dibedakan dari HPP penjualan untuk produk yang terjual.
- Formula HPP dan dasar alokasi harus mengikuti hasil analisis kebutuhan yang disetujui; jangan mengarang formula sendiri.
- Perubahan tarif/komponen HPP tidak boleh mengubah transaksi historis secara otomatis.
- Perubahan nama produk tidak boleh mengganti ID produk atau memutus relasi histori.

### Modul 7 — Keuangan dan Pengeluaran
Data pendapatan minimum:
- Tanggal
- Kategori transaksi
- Keterangan
- Nilai transaksi
- Referensi
- Catatan

Data pengeluaran minimum:
- Nomor transaksi
- Tanggal
- Kategori pengeluaran
- Keterangan
- Nilai pengeluaran
- Sumber/referensi
- PIC
- Status

Kategori pengeluaran dapat meliputi pemasaran/iklan, gaji/SDM, produksi, utilitas/operasional, pajak/bank/ekspedisi/transportasi, dan lainnya. Kategori final mengikuti kesepakatan.

Perilaku:
- Rekap pendapatan dan pengeluaran dihitung dari transaksi yang dicatat.
- Hubungkan pengeluaran dengan kategori/referensi biaya yang tepat.
- Cegah transaksi yang sama dihitung dua kali pada rekap biaya produksi dan laba/rugi.
- SPK menyatakan modul Hutang Supplier/Accounts Payable tidak termasuk.

### Modul 8 — Rekap Biaya Produksi
Komponen dapat meliputi:
- Upah produksi mingguan
- Biaya bahan/material yang dicatat
- Biaya jasa/produksi lainnya
- Biaya repair
- Biaya produksi lain yang disepakati

Perilaku:
- Upah mengambil referensi dari payroll mingguan; jangan input ulang.
- Pengeluaran yang sudah tercatat di Keuangan harus dipetakan dengan benar dan tidak dihitung dua kali.
- Ringkasan berdasarkan periode yang dipilih.
- Aturan pengelompokan, periode pengakuan biaya, dan penanganan koreksi mengikuti spesifikasi yang disetujui.

### Modul 9 — Laporan Finance
Laporan yang disebut SPK:
1. Riwayat Produksi Harian
2. Rekap Penggajian Produksi Mingguan
3. Rekap Penggajian Bulanan
4. Rekap Pendapatan dan Pengeluaran
5. Rekap Biaya Produksi
6. Rekap HPP Produk
7. Laporan Laba/Rugi Sederhana

Ketentuan:
- Sediakan filter periode dan kriteria yang relevan.
- Fungsi cetak/unduh harus mengikuti format yang disepakati saat pengembangan; jangan menganggap format tertentu otomatis wajib jika belum disepakati.
- Laba/rugi sederhana menampilkan pendapatan bersih, HPP penjualan, laba kotor, biaya operasional, dan laba/rugi bersih berdasarkan data yang dicatat.
- Jika data penjualan/jumlah produk terjual belum terintegrasi, pencatatan nilai terkait dilakukan melalui modul Keuangan sesuai kesepakatan.
- Jangan menyebut laporan sebagai laporan akuntansi penuh/general ledger.

### Modul 10 — Dashboard Finance
Ringkasan Owner:
- Total payroll minggu berjalan
- Total upah produksi pada periode terpilih
- Total gaji bulanan
- Total pendapatan
- Total pengeluaran
- Total biaya produksi
- Ringkasan HPP produk
- Aktivitas transaksi Finance terbaru

Perilaku:
- Angka harus bersumber dari data aplikasi dan mengikuti periode terpilih.
- Pastikan definisi setiap KPI konsisten dengan laporan terkait.
- Dashboard tidak mencakup stok, analitik marketplace, atau demand planning.

## 5. Role dan Otorisasi

### Owner
Akses peninjauan data Finance, persetujuan payroll sesuai alur yang disepakati, dashboard, produksi/riwayat, payroll mingguan/bulanan, pendapatan/pengeluaran, biaya produksi, HPP, laporan, dan pengaturan yang memang diizinkan.

### Admin/Finance
Akses operasional untuk master pekerja/produk, referensi proses dan tarif, input/koreksi produksi, persiapan payroll, pendapatan/pengeluaran, biaya produksi, riwayat, dan laporan sesuai kewenangan.

Aturan implementasi:
- Otorisasi harus diterapkan di sisi server/backend, bukan hanya menyembunyikan tombol di UI.
- Jangan memberi hak akses tambahan berdasarkan asumsi.
- Perubahan role/permission di luar ketentuan harus dikonfirmasi dan disepakati.
- Uji skenario akses yang diizinkan dan ditolak untuk setiap operasi penting.

## 6. Batasan Scope — Jangan Dibangun Tanpa Change Request

Di luar scope menurut SPK:
- Pengelolaan Warehouse/persediaan
- Stock In, Stock Out, Stock Adjustment
- Barcode/QR Warehouse
- Sales Order
- Integrasi penjualan marketplace
- Integrasi otomatis TikTok Shop/marketplace lain
- Procurement/pengelolaan pembelian penuh
- Production Planning lengkap
- Pengelolaan QC penuh
- Surat Jalan
- Pengelolaan vendor penuh
- Payment Gateway
- Sistem akuntansi penuh/general ledger
- Hutang Supplier/Accounts Payable
- Piutang/Accounts Receivable
- Forecasting/Demand Planning
- Business Intelligence lanjutan
- Aplikasi mobile terpisah
- Integrasi API pihak ketiga

Permintaan fitur, field, laporan, integrasi, perubahan alur bisnis, struktur database, atau hak akses yang memengaruhi pekerjaan yang telah disepakati dan tidak tercantum di scope harus diperlakukan sebagai **Change Request**.

Sebelum mengerjakan Change Request, pastikan ada persetujuan tertulis atas:
1. Deskripsi dan batas fitur.
2. Biaya tambahan.
3. Dampak terhadap jadwal.
4. Kriteria penerimaan.
5. Dampak pada fitur/data yang sudah ada.

Jangan mulai pekerjaan tambahan hanya berdasarkan percakapan informal atau asumsi bahwa fitur tersebut “kecil”.

## 7. Prinsip Data dan Perhitungan

- Gunakan ID stabil untuk entitas master yang direferensikan transaksi.
- Simpan snapshot nilai yang memengaruhi transaksi historis, terutama tarif dan total upah.
- Hindari hard delete pada data yang sudah dipakai transaksi; gunakan mekanisme arsip/nonaktif atau koreksi yang menjaga jejak histori.
- Gunakan transaksi database untuk operasi multi-tabel yang harus berhasil/gagal secara atomik.
- Validasi nilai uang dan kuantitas; tolak input yang tidak valid sesuai aturan yang disepakati.
- Jangan menggunakan angka hasil pembulatan sebagai sumber perhitungan berikutnya jika nilai presisi yang semestinya masih tersedia.
- Definisikan satu sumber data untuk setiap angka laporan agar data tidak dihitung ganda.
- Jangan menghitung payroll/biaya ulang dengan cara yang mengubah histori tanpa proses koreksi yang jelas.
- Gunakan zona waktu dan aturan tanggal yang konsisten; periode Kamis–Rabu harus diuji pada pergantian bulan dan tahun.
- Jangan mengisi data bisnis palsu di production. Data contoh harus ditandai sebagai seed/demo.

## 8. Standar Implementasi

Ikuti arsitektur, framework, konvensi, dan pola yang sudah digunakan repository. **Jangan mengganti stack atau merombak arsitektur tanpa alasan kuat dan persetujuan.**

Sebelum coding:
1. Periksa struktur repository, dokumentasi, konfigurasi, migration, model, controller/service, route, view, dan test yang sudah ada.
2. Identifikasi pola implementasi yang konsisten dengan codebase.
3. Telusuri dampak perubahan pada modul yang menggunakan data terkait.
4. Buat rencana kecil dan terukur sebelum perubahan lintas modul.

Saat coding:
- Utamakan perubahan kecil, terbaca, dan mudah diuji.
- Hindari duplikasi formula bisnis; tempatkan perhitungan penting di lapisan yang sesuai dan dapat diuji.
- Validasi input di server/backend meskipun validasi frontend tersedia.
- Tangani error dengan pesan yang membantu pengguna tanpa membocorkan detail sensitif.
- Jangan menaruh credential, token, password, atau secret di source control.
- Jangan menghapus/menimpa data, migration, atau konfigurasi penting tanpa memeriksa dampaknya.
- Jangan menambahkan dependency baru jika kebutuhan dapat dipenuhi dengan pola yang sudah tersedia, kecuali ada manfaat jelas.
- Jangan melakukan refactor besar yang tidak diperlukan untuk tugas yang sedang dikerjakan.

## 9. QA dan Kriteria Selesai

Setiap perubahan harus diverifikasi dengan pemeriksaan yang relevan.

Checklist umum:
- [ ] Kebutuhan sesuai SPK/spesifikasi yang disetujui.
- [ ] Validasi input dan penanganan error berjalan.
- [ ] Hak akses diuji untuk role yang relevan.
- [ ] Relasi antarmodul tetap konsisten.
- [ ] Tidak ada duplikasi perhitungan atau biaya.
- [ ] Histori transaksi tetap konsisten setelah master/tarif berubah.
- [ ] Tampilan loading, kosong, berhasil, dan gagal ditangani bila relevan.
- [ ] Test otomatis yang relevan dijalankan.
- [ ] Pemeriksaan manual/UAT untuk alur utama dilakukan bila diperlukan.
- [ ] Migration/perubahan database ditinjau dan aman.
- [ ] Dokumentasi diperbarui jika perilaku sistem berubah.

Skenario uji minimum:
1. Tarif HPP aktif ditemukan dan otomatis digunakan dalam Produksi Harian.
2. Kuantitas × tarif menghasilkan total upah yang benar.
3. Menambah beberapa baris produk dalam satu transaksi berjalan sesuai aturan.
4. Perubahan tarif tidak mengubah transaksi produksi lama.
5. Filter Riwayat Produksi memengaruhi rincian dan total agregat dengan benar.
6. Periode payroll Kamis–Rabu mengambil transaksi yang tepat, termasuk batas bulan/tahun.
7. Payroll mingguan menelusuri rincian produksi sumber.
8. Transaksi payroll yang disetujui/dibayar tidak bisa diubah diam-diam.
9. Rekap biaya produksi mengambil payroll sebagai referensi dan tidak menggandakan pengeluaran.
10. HPP produksi dan HPP penjualan tidak tercampur.
11. Laporan dan dashboard konsisten untuk periode/filter yang sama.
12. Role tidak dapat menjalankan aksi di luar kewenangannya.

Jangan mengklaim test lulus jika test belum benar-benar dijalankan. Jika test tidak dapat dijalankan, jelaskan alasan dan apa yang belum terverifikasi.

## 10. Alur Kerja AI Agent

Untuk setiap tugas:
1. **Pahami:** ringkas tujuan, modul terdampak, dan kriteria penerimaan.
2. **Periksa:** baca implementasi dan dokumentasi yang relevan sebelum mengubah kode.
3. **Klasifikasikan:** tentukan apakah tugas termasuk scope, ambigu, atau Change Request.
4. **Rencanakan:** identifikasi file, model data, alur, risiko, dan test yang diperlukan.
5. **Implementasikan:** lakukan perubahan sekecil mungkin dengan pola repository.
6. **Verifikasi:** jalankan test/lint/build atau pemeriksaan yang tersedia; perbaiki error yang ditemukan.
7. **Laporkan:** jelaskan perubahan, file utama, hasil test, keterbatasan, dan keputusan yang masih menunggu konfirmasi.

Jika permintaan di luar scope:
- Jangan langsung mengimplementasikannya.
- Jelaskan bagian SPK yang relevan dan alasan permintaan dianggap di luar/berpotensi di luar scope.
- Ajukan opsi: tetap di scope, sederhanakan kebutuhan, atau ajukan Change Request.
- Tunggu persetujuan yang diperlukan sebelum mengubah kode.

## 11. Format Laporan Penyelesaian Tugas

Gunakan format ringkas:
- **Tujuan:** apa yang diperbaiki/dibangun.
- **Perubahan:** daftar perubahan utama.
- **Validasi:** test/perintah yang benar-benar dijalankan dan hasilnya.
- **Risiko atau batasan:** hal yang belum diuji, asumsi, atau potensi dampak.
- **Konfirmasi diperlukan:** pertanyaan bisnis yang belum memiliki keputusan.
- **Scope:** nyatakan jika ada permintaan yang memerlukan Change Request.

---

## 12. Aturan Paling Penting

**Jangan menebak aturan bisnis yang berdampak pada uang, payroll, HPP, histori, hak akses, atau laporan. Jangan mengubah scope tanpa persetujuan tertulis. Jangan menyatakan pekerjaan selesai tanpa verifikasi yang nyata.**
