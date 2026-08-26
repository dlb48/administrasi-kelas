# Catatan Perubahan & Fitur (Changelog)

Dokumen ini berisi ringkasan pembaruan dan fitur yang terakhir kali dikerjakan pada aplikasi Administrasi Kelas 2.

## Pembaruan Terakhir (Sesi Terakhir)

### 1. Fitur Import Data Siswa (CSV)
- **File:** `app/src/pages/Students.jsx`
- **Detail Perubahan:**
  - Menambahkan fungsi `handleCSVImport` untuk membaca file CSV dan memasukkannya ke database.
  - Menambahkan validasi untuk mencegah duplikasi data berdasarkan **NISN** (menampilkan alert peringatan jika ada duplikasi).
  - Menambahkan tombol **Upload File (CSV)** baik pada tampilan *desktop* maupun *mobile*.
  - Menambahkan tautan **Download Template CSV** agar pengguna tahu format data yang benar sebelum melakukan import.

### 2. Template CSV
- **File:** `app/public/contoh_data_siswa.csv`
- **Detail Perubahan:**
  - Membuat file template CSV standar yang dapat diunduh oleh pengguna. Template ini berisi header yang sesuai dengan struktur database tabel siswa (misalnya: Nama, NISN, Jenis Kelamin, dll).

### 3. Pembaruan Navigasi & Struktur
- **File:** `app/src/components/Layout.jsx`, `app/src/App.jsx`, `app/src/pages/Settings.jsx`
- **Detail Perubahan:**
  - Melakukan penyesuaian pada tata letak aplikasi (Layout) dan penambahan/perbaikan rute halaman, termasuk persiapan halaman pengaturan (Settings).

### 4. Pembaruan UI Halaman Siswa (Students)
- **File:** `app/src/pages/Students.jsx`
- **Detail Perubahan:**
  - **Penghapusan Avatar Inisial:** Menghilangkan logo huruf awal (inisial) yang sebelumnya muncul di depan nama siswa pada daftar data siswa, sehingga tampilan list menjadi lebih ringkas. (Siswa yang memiliki pas foto tetap akan menampilkan fotonya).
  - **Dropdown Menu Import CSV:** Menggabungkan aksi "Download Template CSV" dan "Upload File CSV" ke dalam satu tombol *dropdown* "Import CSV", membuat antarmuka menjadi jauh lebih rapi baik pada tampilan *desktop* maupun *mobile*.

### 5. Dukungan Akses Jaringan Lokal (Mobile Testing)
- **File:** `app/package.json`
- **Detail Perubahan:**
  - Menambahkan flag `--host` pada script `dev` (`"dev": "vite --host"`) agar server pengembangan dapat diakses melalui jaringan lokal (memudahkan testing langsung dari HP).

### 6. Perbaikan UI Responsif (Navigasi Mobile)
- **File:** `app/src/components/Layout.jsx`
- **Detail Perubahan:**
  - Menambahkan tombol menu hamburger pada bagian *header* yang hanya muncul di layar *mobile*.
  - Mengubah Sidebar menjadi menu laci (*drawer/offcanvas*) yang bisa dibuka-tutup di HP, lengkap dengan efek transisi dan *background overlay* gelap.
  - Sidebar akan otomatis tertutup saat area gelap diklik atau ketika pengguna berpindah halaman.

### 7. Persiapan Fitur Presensi (Database)
- **File:** Database Supabase (SQL Editor)
- **Detail Perubahan:**
  - Menyiapkan rancangan tabel `attendance` dengan kolom `student_id`, `date`, `status` (H, S, I, A), dan `created_at`.
  - Menambahkan _UNIQUE constraint_ pada `student_id` dan `date` untuk menghindari duplikasi absensi di hari yang sama.
  - Menyiapkan _Row Level Security_ (RLS) policy untuk akses CRUD data presensi.

### 8. Implementasi Fitur Presensi
- **File:** `app/src/pages/Attendance.jsx`
- **Detail Perubahan:**
  - Mengubah UI *mockup* presensi menjadi fungsional dengan mengaitkannya ke database Supabase (`students` dan `attendance`).
  - Menambahkan fitur untuk menampilkan daftar siswa aktif dan memberikan status kehadiran (Hadir, Sakit, Izin, Alpa) per tanggal yang bisa dipilih.
  - Menambahkan fungsi Simpan Presensi dengan logika *insert/update/delete* berdasarkan status kehadiran.
  - Mengimplementasikan tab **Rekap Kalender** yang menampilkan kalender kehadiran per bulan untuk siswa yang dipilih, dilengkapi dengan ringkasan jumlah status.

### 9. Peningkatan Fitur Presensi
- **File:** `app/src/pages/Attendance.jsx`
- **Detail Perubahan:**
  - **Pagination Input Harian:** Menambahkan fitur navigasi halaman pada daftar siswa (Input Harian) agar menampilkan maksimal 10 baris per halaman, lengkap dengan tombol navigasi `1 2 3 ...`.
  - **Default Hadir:** Mengubah logika agar setiap membuka presensi tanggal baru, semua siswa secara otomatis ditandai dengan status **Hadir (H)**.
  - **Penyesuaian Kalender:** Memperbaiki ukuran grid kalender di tab "Rekap Kalender" agar mengisi penuh kontainer *box* utamanya sehingga terlihat proporsional dan teks tidak bertumpuk di layar lebar.
  - **Fitur Share WhatsApp:** Menambahkan tombol **Share ke WA** yang secara otomatis memformat laporan absensi (mendaftar siswa yang tidak hadir atau mencetak "Nihil") dan membukanya di aplikasi/web WhatsApp.

### 10. Implementasi Fitur Uang Kas Kelas (Terintegrasi Database)
- **File:** `app/src/pages/ClassFund.jsx`, Database Supabase (`class_funds`)
- **Detail Perubahan:**
  - **Tabel Baru:** Menambahkan tabel `class_funds` di Supabase dengan relasi ke tabel `students` (`student_id`), agar bisa melacak kas berdasarkan siswa.
  - **Fetch & Join:** Mengambil riwayat transaksi langsung dari Supabase beserta relasi nama siswanya.
  - **Form Dinamis:** Jika pengguna memilih "Pemasukan", formulir akan otomatis memunculkan pilihan **Nama Siswa** (diambil dari tabel `students`) dan **Periode Bulan** (opsional).
  - **Aksi CRUD:** Mengaktifkan fungsi simpan dan hapus transaksi yang langsung terkoneksi ke Supabase.
  - **Indikator Loading:** Menambahkan animasi putar (spinner) saat memuat data dan menonaktifkan tombol simpan selama proses pengiriman untuk mencegah pengiriman data ganda.

### 11. Peningkatan Validasi & Status Uang Kas
- **File:** `app/src/pages/ClassFund.jsx`
- **Detail Perubahan:**
  - **Validasi Ketat Form:** Mengubah input siswa dan periode bulan menjadi wajib diisi khusus untuk transaksi "Pemasukan", sehingga mencegah data kas tersimpan secara tidak lengkap.
  - **Tab Baru "Status Pembayaran":** Memisahkan tampilan menjadi dua tab: Riwayat Transaksi dan Status Pembayaran.
  - **Rekap Otomatis:** Mengkalkulasi daftar siswa dan mendeteksi minggu berapa saja (1 hingga 5) yang sudah dibayar pada bulan tertentu (Periode).
  - **Status Menunggak:** Menambahkan logika status otomatis: "Lunas" jika telah membayar sebanyak 5 minggu penuh, dan "Menunggak" jika kurang dari 5 minggu.
  - **Filter Bulan Kustom:** Mengubah komponen filter bulan bawaan browser (`<input type="month">`) menjadi dua *dropdown* terpisah untuk pilihan **Bulan** (Januari - Desember) dan **Tahun** (2024 - 2033), agar lebih mudah digunakan dan konsisten di berbagai perangkat.
  - **Cegah Bayar Ganda:** Pada form "Catat Transaksi", sistem kini mendeteksi jika siswa tertentu telah membayar minggu ke-berapa saja pada periode bulan yang dipilih. Tombol minggu yang sudah dilunasi akan **dimatikan (disabled)**, dicetak transparan, dan diberi ikon centang sehingga tidak bisa dipilih ulang.
  - **Sinkronisasi Logika Filter:** Menyelaraskan logika filter pada tab "Riwayat Transaksi" agar uang kas (pemasukan) ditampilkan berdasarkan "Periode Bulan" (dan Tahun-nya) secara akurat, bukan hanya semata-mata dari tanggal fisiknya dibayarkan, sehingga isinya selalu konsisten dengan tabel "Status Pembayaran".
  - **Login Siswa & Password Default:** Menghapus kolom dan logika "Status Pembayaran" (Tunggakan) pada halaman Data Siswa (karena sudah dipindahkan ke Uang Kas), dan menggantinya dengan kolom dan form input **Password**. Password ini memiliki nilai bawaan (default) `12345` untuk setiap siswa baru yang ditambahkan.
  - **Filter Laporan:** Memperbarui menu pilihan pada halaman "Laporan Kelas" (Reports) dengan komponen filter **Bulan** dan **Tahun** yang terpisah untuk bagian Laporan Kehadiran dan Laporan Keuangan, menyerupai filter yang ada di halaman Uang Kas.
  - **Tabel Rekap Kehadiran Real-time:** Mengubah antarmuka Laporan Kehadiran di halaman Reports dari grafik contoh menjadi tabel data asli yang terkoneksi dengan *database* kehadiran. Tabel ini kini merangkum total presensi tiap siswa (Hadir, Sakit, Izin, Alpa) dan total kehadirannya berdasarkan bulan yang dipilih.
  - **Integrasi Status Bayar di Laporan:** Menambahkan kolom **Bayar Kas** di tabel Laporan Kehadiran. Kolom ini menghitung jumlah minggu (x kali) yang sudah dibayar oleh siswa pada bulan yang bersangkutan dengan membaca riwayat transaksi uang kas secara otomatis.
  - **Penghapusan Laporan Keuangan:** Laporan Keuangan telah dihapus sepenuhnya dari halaman *Reports* sesuai dengan arahan yang diberikan, sehingga halaman tersebut kini sepenuhnya difokuskan untuk menampilkan Laporan Kehadiran Siswa.
  - **Download Data ke Excel (CSV):** Mengubah tombol "Download PDF" menjadi "Download Excel" dan menambahkan fitur untuk mengunduh rekap laporan kehadiran serta status bayar kas ke dalam format file *spreadsheet* (.csv) yang bisa dibuka dengan Microsoft Excel.
  - **Penghapusan Tombol Cetak:** Tombol "Cetak" (Print) telah dihapus dari antarmuka halaman Reports untuk merapikan tampilan karena fungsinya sudah tergantikan oleh pengunduhan Excel.
  - **Daftar Presensi Tampil Semua:** Menghapus fitur navigasi halaman (paginasi) pada halaman Input Presensi, sehingga nama seluruh siswa dalam satu kelas kini langsung tertampil semua dari atas sampai bawah (tinggal di-scroll) untuk mempercepat proses pengisian.
  - **Beranda (Dashboard) Terintegrasi:** Mengubah seluruh tampilan awal Beranda dari data *dummy* menjadi angka nyata dan hidup (real-time) yang ditarik langsung dari database, mencakup:
    - Total Siswa Aktif, Hadir, dan Tidak Hadir hari ini.
    - Menambahkan daftar **Siswa Tidak Hadir Hari Ini** lengkap dengan nama dan keterangannya (Sakit/Izin/Alpa) sebagai pengganti grafik tingkat kehadiran.
    - **Total Saldo Uang Kas**, yang kini dipecah lebih detail untuk menampilkan rincian **Total Pemasukan** dan **Total Pengeluaran** secara terpisah.
    - Menampilkan **semua daftar Tunggakan Kas** (tidak dibatasi) bagi siswa yang belum melunasi iuran pada bulan berjalan (Riwayat Transaksi Terakhir dihapus agar ruang tampilan lebih luas). Ikon huruf inisial nama siswa pada daftar tunggakan juga telah dihilangkan agar desainnya lebih bersih.
  - **Penyederhanaan Bilah Atas (Top Bar):** Ikon Lonceng (Notifikasi) dan Kaca Pembesar (Pencarian) di pojok kanan atas layar telah dihapus agar antarmuka kelas terlihat lebih fokus dan tidak penuh. Selain itu, ikon gerigi (Settings) juga dihilangkan; kini menu *Account Settings* dan *Logout* tersembunyi dengan rapi dan dapat diakses dengan mengklik **Foto Profil** Anda.
  - **Menu Pengaturan (Settings):** Menambahkan menu "Pengaturan" di bagian paling bawah pada panel navigasi kiri (sidebar). Di halaman ini, Anda kini dapat mengubah **Nama Kelas** (misal: XII RPL 1) dan **Nama Sekolah** secara leluasa. Perubahan identitas ini akan langsung diterapkan secara global pada aplikasi.
  - **Sistem Hak Akses (Role) Siswa:** Formulir Tambah/Ubah Siswa kini dilengkapi dengan *checkbox* (kotak centang) **Hak Akses Menu**. Anda bisa memilih secara spesifik menu apa saja yang boleh diakses oleh siswa tersebut (misal: Beranda, Data Siswa, Presensi, Uang Kas, Laporan). Pilihan hak akses ini akan ditampilkan sebagai *badge* rapi di daftar siswa dan kelak digunakan untuk membatasi tampilan saat siswa melakukan *login*.
  - **Portal Login Terintegrasi:** Halaman Login kini memiliki dua *tab* (mode masuk): **Admin Guru** (menggunakan Email/Username Supabase Auth) dan **Akses Siswa** (menggunakan kombinasi NISN dan Password bawaan). Selain itu, judul dan nama kelas pada halaman Login juga sudah langsung tersinkronisasi dengan pengaturan Identitas Kelas Anda.
  - **Tampilan Khusus Siswa:** Saat seorang siswa berhasil login, *sidebar* navigasi akan otomatis menyembunyikan menu-menu yang tidak diizinkan untuk siswa tersebut. Secara bawaan (default), siswa hanya bisa melihat menu **Dashboard**. Menu **Pengaturan** dan *Account Settings* sepenuhnya disembunyikan bagi pengguna dengan level siswa. Identitas *header* di bagian atas layar juga akan menyesuaikan dengan memanggil Nama Siswa yang sedang masuk.
  - **Ubah Password Mandiri (Siswa):** Siswa yang sedang login kini dapat merubah password *default* mereka secara mandiri. Caranya dengan mengklik profil (pojok kanan atas) dan memilih opsi "Ganti Password".
  - **Laporan Pribadi Siswa (Profil Saya):** Siswa kini memiliki halaman profil khusus yang dapat diakses dengan mengeklik menu "Profil Saya" dari tombol foto profil mereka. Halaman ini menampilkan:
    - Identitas diri beserta pasfoto berukuran proporsional 4x6 cm.
    - **Laporan Absensi:** Tab khusus untuk melihat ringkasan (total Hadir/Sakit/Izin/Alpa) dan rincian riwayat absensi mereka per bulan.
    - **Laporan Kas:** Tab khusus untuk memantau riwayat setoran uang kas (pemasukan) yang telah mereka bayarkan selama menjadi siswa.
  - **Kompresi Foto Otomatis:** Sistem kini dilengkapi dengan algoritma cerdas yang secara otomatis akan mengecilkan dimensi dan mengompres (*compress*) ukuran pasfoto yang diunggah hingga batas maksimal ~200KB sebelum dikirim ke database Supabase. Hal ini sangat menghemat penyimpanan Cloud dan mempercepat waktu *loading*.

### 12. Sinkronisasi Identitas Sekolah ke Database
- **File:** `app/src/contexts/AuthContext.jsx`, `app/src/pages/Settings.jsx`, `app/src/components/Layout.jsx`, `app/src/pages/Login.jsx`, `app/src/pages/StudentProfile.jsx`, Database Supabase (`settings`)
- **Detail Perubahan:**
  - Memindahkan penyimpanan pengaturan "Nama Kelas" dan "Nama Sekolah" yang sebelumnya menggunakan *localStorage* (penyimpanan lokal browser) ke database Supabase agar tersinkronisasi di semua perangkat.
  - Memperbarui halaman terkait agar selalu mengambil dan menampilkan pengaturan identitas sekolah secara terpusat dan *real-time* melalui `AuthContext`.

### 13. Integrasi Fitur Saldo Awal Uang Kas (Diperbarui)
- **File:** `app/src/pages/ClassFund.jsx`, Database Supabase (`class_funds`)
- **Detail Perubahan:**
  - Fitur Saldo Awal kini dipindahkan dan dikelola murni di halaman Uang Kas Kelas, bukan lagi di Pengaturan.
  - Menambahkan opsi jenis transaksi **"Saldo Awal"** pada formulir Catat Transaksi, berdampingan dengan Pemasukan dan Pengeluaran.
  - Data "Saldo Awal" disimpan secara langsung sebagai *record* transaksi masuk (pemasukan khusus) di dalam tabel `class_funds`, sehingga sistem menjadi lebih rapi dan konsisten secara *database*.
  - **Pembatasan Hak Akses (Role-Based Access):** Siswa yang diberikan wewenang (seperti Bendahara Kelas) tetap bisa mencatat transaksi Pemasukan/Pengeluaran dan menghapus riwayat. Namun, opsi khusus **"Saldo Awal"** di dalam form transaksi disembunyikan dan hanya dapat diatur oleh Admin (Guru).

### 14. Pembaruan Versi Aplikasi
- **File:** `app/src/components/Layout.jsx`, `app/src/pages/Login.jsx`
- **Detail Perubahan:**
  - Memperbarui label teks versi aplikasi di bagian *footer* halaman dari **v2.0** menjadi **v2.0.1** sebagai penanda dirilisnya perbaikan sistem manajemen pengaturan dan sinkronisasi saldo awal kas kelas.

### 15. Penyesuaian Nama Aplikasi dan Perbaikan Zona Waktu Tanggal
- **File:** `app/index.html`, `app/src/pages/Attendance.jsx`, `app/src/pages/ClassFund.jsx`
- **Detail Perubahan:**
  - Mengubah judul nama aplikasi pada tab browser dari "Administrasi Kelas 2.0" menjadi "Administrasi Kelas".
  - Memperbaiki perhitungan tanggal di fitur Presensi dan Uang Kas Kelas agar selalu akurat mengikuti zona waktu lokal (timezone) perangkat pengguna. Sebelumnya sistem selalu mengambil tanggal dalam format UTC yang menyebabkan ketidaksesuaian hari saat digunakan pada pagi hari.

### 16. Fitur Pengaturan Hari Libur & Auto-Lock Presensi (v2.1.1)
- **File:** `app/src/pages/Settings.jsx`, `app/src/pages/Attendance.jsx`, Database Supabase (`holidays`)
- **Detail Perubahan:**
  - Menambahkan pengaturan baru untuk menentukan **Libur Mingguan** (misal: setiap hari Minggu) dan **Libur Event** (insidental dengan keterangan).
  - Sistem kalender absen akan mendeteksi libur tersebut, mencetak kotak kalender berwarna merah, dan memunculkan deskripsi libur di dalam kalender.
  - Menerapkan fitur *Auto-Lock*: tombol input presensi akan dikunci (disabled) dan muncul peringatan jika tanggal yang dipilih jatuh pada hari libur.
  - Menerapkan perlindungan ganda (pencegahan tumpang tindih): Jika presensi untuk hari tersebut sudah pernah disimpan, tombol input akan terkunci dan tombol "Simpan" berubah menjadi "Hapus Presensi Hari Ini". Pengguna wajib menekan hapus jika ingin merevisi presensi di hari tersebut.

### 17. Perbaikan Akurasi Tunggakan Kas (v2.1.1)
- **File:** `app/src/pages/Settings.jsx`, `app/src/pages/ClassFund.jsx`, `app/src/pages/Dashboard.jsx`
- **Detail Perubahan:**
  - Mengubah titik awal perhitungan komulatif target uang kas (akumulasi 4 minggu per bulan) dari yang sebelumnya kaku pada bulan berjalan, menjadi dinamis berdasarkan **Bulan Awal Kas** yang kini bisa disetel langsung oleh Admin dari halaman Pengaturan.
  - Logika tunggakan akan secara cerdas menghitung bulan-bulan sebelumnya (sejak "Bulan Awal Kas") hingga bulan saat ini, sehingga total tunggakan akumulatif tampil jauh lebih akurat jika ada siswa yang belum membayar berbulan-bulan.

---
*Catatan ini dibuat otomatis untuk menyimpan riwayat pengembangan fitur agar mudah dilanjutkan di sesi berikutnya.*
