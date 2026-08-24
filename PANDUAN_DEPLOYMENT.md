# Panduan Upload ke GitHub dan Deployment

Karena file `.env` sudah diamankan di dalam `.gitignore`, Anda sekarang dapat mengunggah proyek ini ke GitHub dengan aman. 

## 1. Cara Upload ke GitHub

Karena perintah `git` tidak terdeteksi di terminal Anda, ini berarti Git belum terinstal. Anda punya 2 pilihan mudah:

### Pilihan A: Menggunakan GitHub Desktop (Sangat Disarankan)
Cara ini paling visual dan mudah bagi pemula.
1. Unduh dan instal **[GitHub Desktop](https://desktop.github.com/)**.
2. Login dengan akun GitHub Anda.
3. Klik menu **File > Add local repository...**, lalu pilih folder `d:\latihan\administrasi_Kelas2`.
4. Beri nama repositori, lalu klik tombol **"Publish repository"** untuk mengunggahnya ke GitHub Anda.

### Pilihan B: Menggunakan Git CLI (Terminal)
1. Unduh dan instal **[Git for Windows](https://git-scm.com/download/win)**.
2. **Penting:** Setelah diinstal, tutup code editor Anda (VS Code) lalu buka kembali agar terminal membaca Git.
3. Buka terminal di VS Code (pada folder `d:\latihan\administrasi_Kelas2`), lalu jalankan perintah ini satu per satu:
   ```bash
   git init
   git add .
   git commit -m "Commit pertama, Administrasi Kelas v2.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPOSITORY.git
   git push -u origin main
   ```

---

## 2. Cara Deployment (Hosting Gratis) ke Vercel

Setelah kode Anda berhasil masuk ke GitHub, Anda bisa mempublikasikan website Anda:

1. Buka situs **[Vercel](https://vercel.com/)** dan daftar/login menggunakan akun GitHub Anda.
2. Klik tombol **"Add New..."** > **"Project"**.
3. Di bagian *"Import Git Repository"*, cari dan pilih repositori GitHub yang baru saja Anda buat. Klik **Import**.
4. **Environment Variables (Sangat Penting):**
   - Sebelum klik tombol Deploy, scroll ke bawah ke bagian **Environment Variables**.
   - Buka file `.env` Anda secara lokal.
   - Salin dan tempel setiap nama *variabel* dan *isinya* ke dalam form di Vercel (misalnya `VITE_SUPABASE_URL` dan nilainya).
   - Klik **Add** untuk setiap variabel.
5. Klik **Deploy** dan tunggu 1-2 menit.
6. Selesai! Vercel akan memberikan *link* (URL) website Anda yang sudah *live* dan bisa diakses siapa saja.

---

## 3. Cara Mengupdate Website (Jika Ada Perubahan)

Jika di kemudian hari Anda mengedit kode (misalnya menambah fitur, mengubah warna, memperbaiki teks) dan ingin perubahan tersebut muncul di website yang sudah online, Anda **tidak perlu mengulangi semua langkah dari awal**. 

Cukup buka terminal di VS Code, pastikan Anda berada di folder proyek, lalu jalankan 3 perintah ini secara berurutan:

1. **Simpan semua perubahan ke dalam tahap persiapan (staging):**
   ```bash
   git add .
   ```

2. **Beri pesan atau catatan tentang apa yang Anda ubah:**
   *(Ganti teks di dalam tanda kutip dengan catatan Anda sendiri)*
   ```bash
   git commit -m "Update: Memperbaiki tampilan halaman login"
   ```

3. **Kirim perubahan tersebut ke GitHub:**
   ```bash
   git push
   ```

**Selesai!** 
Begitu kode masuk ke GitHub, **Vercel akan otomatis mendeteksinya** dan langsung memperbarui website Anda dalam waktu sekitar 1-2 menit tanpa perlu Anda tekan tombol apa-apa lagi di Vercel.
