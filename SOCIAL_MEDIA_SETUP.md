# Panduan Konfigurasi Media Sosial (Facebook & Instagram)

Panduan ini akan membantu Anda mengonfigurasi aplikasi di Meta (Facebook) Developers agar fitur koneksi Instagram dan Facebook di aplikasi Mitra Retali berfungsi dengan baik.

## Prasyarat
- Akun Facebook.
- Akun Instagram Professional (Bisnis/Kreator) yang sudah terhubung dengan Halaman Facebook (Facebook Page).
- Akses ke [developers.facebook.com](https://developers.facebook.com).

---

## Langkah 1: Akses Aplikasi di Dashboard
1. Buka [Meta for Developers](https://developers.facebook.com/apps/).
2. Pilih aplikasi yang Anda gunakan untuk proyek ini.

## Langkah 2: Konfigurasi Produk "Facebook Login"
Bagian ini sangat penting untuk mengatasi error **"Opsi JSSDK Tidak Diubah"** dan masalah domain.

1. Di menu sebelah kiri, cari bagian **Facebook Login**. Jika tidak ada, klik icon `+` (Add Product) dan pilih Facebook Login.
2. Klik **Settings** di bawah menu Facebook Login.
3. Pastikan konfigurasi berikut diatur dengan benar:
   - **Client OAuth Login**: `Yes`
   - **Web OAuth Login**: `Yes`
   - **Login with the JavaScript SDK**: **`Yes`** (Ini solusi untuk error JSSDK).
   - **Allowed Domains for the JavaScript SDK**: Masukkan domain berikut:
     - `https://retali.id`
     - `http://localhost:5173` (untuk testing lokal)
4. Klik tombol **Save Changes** di bagian bawah.

## Langkah 3: Menambahkan Izin (Permissions)
Untuk mengatasi error **"Invalid Scopes"**, kita perlu memastikan aplikasi meminta izin yang benar dan izin tersebut tersedia untuk aplikasi Anda.

### Mode Pengembangan (Development Mode)
Jika aplikasi Anda masih dalam **App Mode: Development** (tombol di bagian atas layar), Anda (sebagai Admin/Developer) secara otomatis memiliki akses ke semua izin. Anda **TIDAK PERLU** mengajukan App Review untuk testing.

Namun, Anda harus memastikan kode program meminta izin yang benar. Kami telah memperbarui kode untuk meminta izin berikut:
- `instagram_basic` (Akses profil IG)
- `instagram_content_publish` (Posting ke IG)
- `pages_show_list` (Melihat daftar Halaman FB)
- `pages_read_engagement` (Membaca interaksi)
- `pages_manage_posts` (Posting ke FB Page)

### Mode Live (Production)
Jika Anda ingin merilis aplikasi ke publik (App Mode: Live):
1. Masuk ke menu **App Review** > **Permissions and Features**.
2. Cari izin-izin di atas (seperti `instagram_content_publish`).
3. Klik **Request Advanced Access**.
4. Anda akan diminta untuk melakukan Verifikasi Bisnis dan memberikan penjelasan penggunaan data.

> **Catatan:** Untuk tahap saat ini, sangat disarankan tetap menggunakan **Development Mode** dan menambahkan akun pengguna yang akan mencoba fitur ini sebagai **Tester** atau **Administrator** di menu **App Roles**.

## Langkah 4: Konfigurasi Dasar (Basic Settings)
1. Buka menu **Settings** > **Basic**.
2. Pastikan **App Domains** diisi dengan:
   - `retali.id`
3. Pastikan **Privacy Policy URL** diisi (wajib untuk mode Live).
4. Klik **Save Changes**.

## Langkah 5: Menambahkan Produk "Instagram Graph API" (Opsional tapi Disarankan)
1. Di menu kiri, klik icon `+` (Add Product).
2. Pilih **Instagram Graph API**.
3. Ini memastikan dashboard Anda memiliki fitur untuk memantau penggunaan API Instagram.

---

## Troubleshooting Umum

### Error: "Invalid Scopes: instagram_basic..."
- **Penyebab:** Aplikasi mencoba meminta izin yang tidak dikonfigurasi dengan benar di tipe aplikasi Anda, atau Anda menggunakan "Consumer App" bukan "Business App".
- **Solusi:**
  1. Pastikan **App Type** Anda adalah **Business** (Bukan Consumer/None). Anda bisa melihat ini di Dashboard utama. Jika salah, Anda mungkin perlu membuat App ID baru dengan tipe "Business".
  2. Jika App Type sudah Business, pastikan Anda login menggunakan akun yang terdaftar sebagai Admin/Developer/Tester di aplikasi tersebut.

### Error: "Login with Javascript SDK"
- **Solusi:** Ikuti **Langkah 2** di atas dan pastikan toggle diaktifkan ke "Yes".

### Tidak bisa connect Instagram
- **Solusi:**
  1. Pastikan akun Instagram adalah akun **Professional** (Bisnis/Kreator).
  2. Pastikan akun Instagram tersebut **sudah terhubung** dengan Halaman Facebook (Page) yang Anda kelola.
