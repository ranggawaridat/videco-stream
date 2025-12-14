# Videco Stream

**Videco Stream** adalah platform streaming video modern yang dibangun dengan arsitektur mikroservis, menggunakan FastAPI untuk backend yang handal dan React (Vite) untuk frontend yang responsif. Aplikasi ini mendukung upload video, transcoding otomatis (menggunakan FFmpeg), dan streaming adaptif (HLS) melalui integrasi BunnyCDN.

## 🚀 Fitur Utama

- **Upload Video**: Upload video dengan mudah ke penyimpanan cloud.
- **Transcoding Otomatis**: Konversi video otomatis ke format HLS untuk streaming lancar di berbagai bandwidth.
- **BunnyCDN Integration**: Penyimpanan dan pengiriman video yang cepat dan aman.
- **Modern UI/UX**: Antarmuka pengguna yang bersih, responsif, dan mudah digunakan.
- **Background Processing**: Menggunakan Celery dan Redis untuk menangani tugas berat (transcoding) di latar belakang.

## 🛠 Teknologi

*   **Frontend**: React, Vite, TailwindCSS, Video.js
*   **Backend**: Python, FastAPI, SQLAlchemy
*   **Database**: PostgreSQL
*   **Queue/Broker**: Redis, Celery
*   **Deployment**: Docker

## 📋 Prasyarat (Lokal)

Untuk menjalankan proyek ini di komputer lokal Anda, pastikan Anda telah menginstal:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

## 🏃‍♂️ Menjalankan Secara Lokal

1.  **Clone Repository**
    ```bash
    git clone https://github.com/username/videco-stream.git
    cd videco-stream
    ```

2.  **Buat File Environment**
    Buat file `.env` di root folder proyek dan isi dengan konfigurasi berikut (sesuaikan dengan kredensial BunnyCDN Anda):
    ```env
    DATABASE_URL=postgresql://user:password@db:5432/videc_db
    REDIS_URL=redis://redis:6379/0
    SECRET_KEY=rahasia_super_aman_ganti_ini
    
    # Konfigurasi BunnyCDN
    BUNNY_API_KEY=kunci_api_anda
    BUNNY_STORAGE_ZONE=nama_zone_storage
    BUNNY_REGION=de  # atau region lain (ny, sg, dll)
    BUNNY_PULL_ZONE=nama_pull_zone
    BUNNY_SECURITY_KEY=kunci_keamanan_url_token
    ```

3.  **Jalankan dengan Docker Compose**
    ```bash
    docker-compose up --build
    ```

4.  **Akses Aplikasi**
    - **Frontend**: http://localhost:5173
    - **Backend API Docs**: http://localhost:8000/docs

---

## 🚂 Panduan Deployment ke Railway

Berikut adalah langkah-langkah untuk mendeploy aplikasi ini ke [Railway.app](https://railway.app/).

### 1. Persiapan
Pastikan kode Anda sudah di-push ke GitHub.

### 2. Buat Project Baru di Railway
1.  Login ke Railway Dashboard.
2.  Klik **"New Project"** > **"Deploy from GitHub repo"**.
3.  Pilih repositori `videco-stream` Anda.
4.  Klik **"Deploy Now"**.

> *Note: Awalnya deployment mungkin gagal karena environment variables belum diset. Abaikan saja dulu.*

### 3. Tambahkan Database & Redis
Di dalam project view Railway Anda, tambahkan service baru:
1.  Klik tombol **New** (atau klik kanan di canvas) > **Database** > **PostgreSQL**.
2.  Klik tombol **New** > **Database** > **Redis**.

### 4. Konfigurasi Service Backend (FastAPI)
Kembali ke service repository Anda (biasanya bernama repo Anda):
1.  Masuk ke **Settings**.
2.  Ubah **Root Directory** menjadi `/backend`.
3.  Di tab **Variables**, tambahkan variabel berikut:
    - `DATABASE_URL`: *Ambil dari variabel service PostgreSQL (`DATABASE_URL`)*.
    - `REDIS_URL`: *Ambil dari variabel service Redis (`REDIS_URL`)*.
    - `SECRET_KEY`: Buat string acak.
    - `BUNNY_API_KEY`, `BUNNY_STORAGE_ZONE`, dll (sesuai `.env` lokal Anda).
4.  Di bagian **Networking**, buat domain publik (misal: `videco-backend.up.railway.app`).

### 5. Konfigurasi Service Worker (Celery)
Karena Celery adalah proses terpisah tetapi menggunakan kode yang sama dengan backend, kita perlu menduplikat service backend.
1.  Di Railway canvas, duplikat service backend yang sudah ada (atau Add New > GitHub Repo > pilih repo yang sama).
2.  Masuk ke **Settings**.
3.  **Root Directory**: `/backend`.
4.  **Start Command**: Ganti menjadi:
    ```bash
    celery -A app.celery_worker.celery_app worker --loglevel=info
    ```
5.  Pastikan variabel env (`DATABASE_URL`, `REDIS_URL`, dll) sama persis dengan backend utama.
6.  Service ini **TIDAK PERLU** domain publik.

### 6. Konfigurasi Service Frontend (React)
Kita akan men-deploy frontend sebagai service terpisah.
1.  Tambahkan service baru > **GitHub Repo** > Pilih repo `videco-stream` lagi.
2.  Masuk ke **Settings**.
3.  **Root Directory**: `/frontend`.
4.  **Docker file path**: Ubah menjadi `Dockerfile.prod` (PENTING! Agar menggunakan Nginx).
5.  Di tab **Variables**, tambahkan:
    - `VITE_API_URL`: Isi dengan domain publik backend Anda (contoh: `https://videco-backend.up.railway.app`).
    - *Note: Di Vite, env var harus diawali `VITE_` agar terbaca di sisi klien.*
6.  Di bagian **Networking**, buat domain publik untuk frontend (misal: `videco-stream.up.railway.app`).

### 7. Selesai!
Tunggu semua proses build selesai (hijau). Buka domain frontend Anda, dan aplikasi siap digunakan!

## ⚠️ Catatan Penting
- **CORS**: Pastikan di kode Backend (`app/main.py`), Anda sudah mengizinkan origin domain frontend Railway Anda di konfigurasi `CORSMiddleware`.
- **Database Migrations**: Railway tidak otomatis menjalankan migrasi Alembic. Anda mungkin perlu menjalankan perintah migrasi melalui *Railway CLI* atau menambahkan *Start Command* khusus di backend.
    - *Opsi Start Command Backend*: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
