# Analisis & Roadmap Backend: LeadGen Pro System

Dokumen ini berisi analisis teknis dan panduan langkah demi langkah untuk membangun backend sistem Lead Generator & CRM berbasis Firebase.

## 1. Arsitektur Backend (Firebase Blaze Plan)

Kami merekomendasikan penggunaan **Firebase Serverless Architecture** sepenuhnya untuk skalabilitas dan kemudahan maintenance.

### Komponen Utama:
1.  **Firebase Authentication**: Mengelola user login.
    *   *Fitur Kunci*: **Custom Claims** untuk menangani Role (PUSAT, CABANG, MITRA) secara aman di level token, bukan hanya di database client-side.
2.  **Cloud Firestore (Database)**: Menyimpan data Leads, User Profile, dan Content Queue.
3.  **Cloud Functions (Backend Logic)**:
    *   Menjalankan logika berat (Generasi AI).
    *   Menyimpan rahasia (API Keys Gemini/OpenAI, Meta Access Tokens).
    *   Menangani Webhooks (dari Facebook Lead Ads atau WhatsApp).
4.  **Firebase Storage**: Menyimpan gambar/video hasil generate AI sebelum diposting.

---

## 2. Rancangan Database (Schema Recommendation)

Struktur data harus mendukung hierarki PUSAT -> CABANG -> MITRA.

### Collections:

#### `users`
Menyimpan profil pengguna.
```json
{
  "uid": "user123",
  "email": "mitra@travel.com",
  "role": "MITRA", // PUSAT, CABANG, MITRA
  "parentId": "cabang_abc", // ID atasan (jika ada)
  "branchId": "cabang_abc", // Referensi Cabang
  "connectedAccounts": { // Status koneksi sosmed
    "facebook": true,
    "instagram": true
  }
}
```

#### `leads`
Data prospek haji/umrah.
```json
{
  "id": "lead_xyz",
  "name": "Budi Santoso",
  "phone": "+62812345678",
  "source": "IG_ADS", // atau MANUAL, REFERRAL
  "status": "NEW", // NEW, FOLLOW_UP, CLOSING, LOST
  "assignedTo": "user123", // ID Mitra/Sales
  "branchId": "cabang_abc", // ID Cabang pemilik data
  "createdAt": "Timestamp"
}
```

#### `content_requests`
Antrian untuk Content Generator (AI).
```json
{
  "id": "job_789",
  "userId": "user123",
  "topic": "Promo Umrah Ramadhan",
  "platform": "INSTAGRAM",
  "status": "PENDING", // PROCESSING, COMPLETED, FAILED
  "generatedContent": {
    "caption": "...",
    "hashtags": ["#umrah", "#travel"],
    "imageUrl": "https://..."
  }
}
```

---

## 3. Strategi Implementasi Cloud Functions

Cloud Functions akan menjadi jembatan aman antara Frontend dan layanan Pihak Ketiga (AI & Meta). Frontend **TIDAK BOLEH** menyimpan API Key.

### Modul Functions yang Disarankan:

1.  **`authTriggers`**:
    *   `onCreateUser`: Otomatis membuat dokumen di `users` dan set Custom Claims.

2.  **`aiService`** (Callable Function):
    *   Menerima request topik & platform dari frontend.
    *   Memanggil API Gemini/OpenAI menggunakan API Key yang tersimpan di *Environment Variables*.
    *   Mengembalikan hasil text/image ke frontend atau menyimpan ke DB.

3.  **`socialMediaService`**:
    *   `postToInstagram`: Menerima konten final, memvalidasi token user, dan mengirim ke Meta Graph API.
    *   `webhookHandler`: Menerima notifikasi dari Meta (misal: pesan masuk WA/IG) dan menyimpannya ke Firestore (untuk fitur Unified Inbox).

---

## 4. Langkah-Langkah Pengerjaan (Step-by-Step)

### Fase 1: Persiapan Environment
1.  **Upgrade Firebase ke Blaze Plan** (Pay as you go) agar Cloud Functions dapat melakukan request ke API luar (Google/Meta).
2.  **Setup Environment Config**:
    *   Simpan API Keys di Firebase Config:
        ```bash
        firebase functions:config:set openai.key="sk-..." meta.app_secret="..."
        ```

### Fase 2: Struktur Kode Backend (Telah Dibuat)
Kami telah membuatkan kerangka dasar di folder `/functions` yang mencakup:
*   `src/index.ts`: Entry point.
*   `src/services/`: Logika bisnis terpisah (AI, Social).
*   `src/controllers/`: Handler untuk HTTP request.

### Fase 3: Keamanan Data (Security Rules)
Kami akan menerapkan `firestore.rules` yang ketat:
*   **Pusat**: `read, write` semua data.
*   **Cabang**: `read, write` data dimana `resource.data.branchId == request.auth.uid`.
*   **Mitra**: `read, write` data dimana `resource.data.assignedTo == request.auth.uid`.

### Fase 4: Integrasi Frontend
1.  Update `src/lib/firebase.ts` untuk memanggil Cloud Functions menggunakan `httpsCallable`.
2.  Hapus logika mock data dan gantikan dengan *real-time listener* Firestore.

---

## 5. Analisis Risiko & Mitigasi
*   **Cost Control**: Karena menggunakan AI & Functions, pasang **Budget Alert** di Google Cloud Console untuk menghindari tagihan tak terduga.
*   **Token Expiry**: Token akses Facebook/Instagram bersifat sementara. Implementasikan mekanisme *refresh token* di database.
