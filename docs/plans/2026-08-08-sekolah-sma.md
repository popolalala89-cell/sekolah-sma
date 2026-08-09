# SEKOLAH-SMA — Implementasi Plan (Manajemen Sekolah SMA Online)

> **Tanggal:** 2026-08-08
> **Status:** ✅ Disetujui lewat sesi grill (frontier kosong, semua keputusan kepegang)

**Goal:** Sistem manajemen sekolah SMA berbasis web — online, multi-peran — dimulai dari 5 modul core (siswa, absensi, nilai/rapor, jadwal, SPP) dan bertumbuh bertahap sampai "terlengkap" (perpustakaan, ekstrakurikuler, BK, e-Rapor, dst.).

**Architecture:** SPA React (Vite) di GitHub Pages + backend Supabase (Postgres + PostgREST + RLS + Auth). Semua data lewat PostgREST dengan RLS per peran; operasi admin-sensitif via service role (RPC). Tanpa backend Node/PHP — Supabase saja.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind, @supabase/supabase-js, React Router, GitHub Pages (custom domain), Supabase project `bbvywuorpnhzkxjqhijz` (akun email ke-2).

**Referensi pola:** proyek RumahKita & Danee Shoes Care (RLS + PostgREST + GH Pages) — ikuti konvensi yang sama.

---

## A. KEPUTUSAN TERKUNCI (hasil grill)

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Target | Produk nyata (dipakai sekolah beneran) |
| 2 | Skala | 1 sekolah dulu; kolom `school_id` (sekolah_id) di SEMUA tabel sejak awal |
| 3 | Akses | ONLINE (Supabase) — wali & siswa akses dari HP |
| 4 | Cakupan | Core-first: siswa, absensi, nilai, jadwal, SPP → sisanya fase 2/3 |
| 5 | Peran | 4 peran: admin TU, guru, wali, siswa. Login email+password (Supabase Auth), admin pakai PIN ekstra utk operasi sensitif |
| 6 | Absensi | Manual per jam pelajaran oleh guru; rekap otomatis; notif in-app |
| 7 | Nilai/rapor | Gradebook bobot + PDF rapor per semester; e-Rapor Kemendikbud + Dapodik = FASE 2 |
| 8 | Jadwal | Input manual + deteksi bentrok (guru/ruang dobel); generator otomatis = FASE 3 |
| 9 | SPP | Catat pembayaran manual oleh admin; rekap tunggakan; bukti transfer & verifikasi = FASE 2 |
| 10 | Akun | Semua akun dibuat ADMIN (bulk via import). Tanpa self-registrasi. Siswa login NISN+password awal; 1 akun wali = beberapa anak (di-link admin) |
| 11 | Kelas | Tingkat (X/XI/XII) + jurusan (IPA/IPS/Bahasa) + rombel; wali kelas 1 guru/rombel; tombol "naik kelas" massal |
| 12 | Notifikasi | In-app (bell) dulu; WA bot terjadwal = FASE 2 |
| 13 | Hosting | GitHub Pages + custom domain; project Supabase baru (email ke-2) |

---

## B. ARSITEKTUR & SETUP

### B.1 Persiapan (siapa kerjakan)

| # | Langkah | Oleh |
|---|---|---|
| 1 | Supabase project `bbvywuorpnhzkxjqhijz` sudah dibuat | ✅ User |
| 2 | Ambil Project URL + anon key + service_role key dari Dashboard → Settings → API | 🔴 User (disimpan ke `.env`) |
| 3 | Pilih custom domain (mis. sekolahku.my.id / sma-xxx.my.id) + setting DNS A record 185.199.108.133 | 🔴 User |
| 4 | Scaffold repo `~/sekolah-sma/` (Vite react-ts + Tailwind + React Router) | 🤖 Agent |
| 5 | GitHub repo baru + GitHub Pages (subpath `/repo` atau custom domain) — pakai skill github-pages-spa-deployment | 🤖 Agent |
| 6 | Buat tabel + RLS + RPC via migration SQL di `supabase/migrations/` | 🤖 Agent |
| 7 | Setup env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 🔴 User (isi dari langkah 2) |

### B.2 Struktur repo

```
~/sekolah-sma/
├── supabase/migrations/   # SQL schema + RLS + RPC (satu sumber kebenaran)
├── src/
│   ├── lib/supabase.ts    # client (anon)
│   ├── lib/admin.ts       # client (service role, HANYA dipakai RPC di sisi server/edge)
│   ├── lib/peran.ts       # helper baca peran user (JWT custom claim / tabel akun)
│   ├── pages/             # halaman per peran (lihat bagian D)
│   ├── components/        # UI bersama (DataTable, Modal, Toast, PIN prompt)
│   └── app.tsx            # router + guard peran
├── docs/plans/
└── README.md
```

**Catatan penting:** service_role key TIDAK boleh bocor ke bundle frontend. Pola RumahKita: operasi yang butuh super-admin lewat **RPC `SECURITY DEFINER`** (fungsi Postgres) yang memvalidasi peran via JWT claims, bukan service key di client.

---

## C. DATA MODEL (FASE 1) — semua tabel punya `sekolah_id`

### C.1 Master
- **sekolah** — id, nama, npsn, alamat, telepon, logo_url, tahun_ajaran_aktif_id
- **tahun_ajaran** — id, sekolah_id, nama ("2026/2027"), tgl_mulai, tgl_selesai, aktif
- **jurusan** — id, sekolah_id, kode (IPA/IPS/BHS), nama
- **rombel** — id, sekolah_id, tahun_ajaran_id, tingkat (10/11/12), jurusan_id NULLABLE (X belum penjurusan), nama ("XI-IPA-1"), wali_kelas_guru_id, aktif
- **guru** — id, sekolah_id, user_id NULLABLE (FK auth.users), nip, nama, mapel_utama, aktif
- **siswa** — id, sekolah_id, user_id NULLABLE, nisn UNIQUE, nis, nama, tempat_lahir, tgl_lahir, gender, alamat, telepon, foto_url, status (aktif/alumni/keluar), angkatan
- **wali_murid** — id, sekolah_id, user_id NULLABLE, nama, telepon
- **wali_siswa** — wali_murid_id, siswa_id (relasi many-to-many; 1 wali = beberapa anak)
- **mapel** — id, sekolah_id, kode, nama
- **akun** — id (PK = auth.users.id), sekolah_id, peran (admin/guru/wali/siswa), terkait_id (guru_id/siswa_id/wali_id), pin_hash NULLABLE (admin)

### C.2 Akademik
- **rombel_siswa** — rombel_id, siswa_id, tahun_ajaran_id, UNIQUE(rombel_id, siswa_id, tahun_ajaran_id) — keanggotaan per tahun ajaran (dipakai tombol naik kelas)
- **jadwal** — id, sekolah_id, rombel_id, mapel_id, guru_id, hari (1-6), jam_mulai, jam_selesai, ruang, tahun_ajaran_id
  - Cek bentrok via UNIQUE: `(guru_id, hari, jam_mulai)` dan `(ruang, hari, jam_mulai)`
- **absensi** — id, sekolah_id, siswa_id, rombel_id, tanggal, jam_ke, mapel_id, status (H/S/I/A/T), catatan, guru_id, UNIQUE(siswa_id, tanggal, mapel_id)
- **nilai** — id, sekolah_id, siswa_id, mapel_id, rombel_id, guru_id, jenis (tugas/formatif/sumatif/uts/uas), nilai NUMERIC(5,2), semester, tahun_ajaran_id
- **rapor** — id, sekolah_id, siswa_id, semester, tahun_ajaran_id, file_url (PDF), dibuat_pada (snapshot)

### C.3 Keuangan
- **biaya** — id, sekolah_id, tahun_ajaran_id, nama ("SPP", "Uang Gedung"...), nominal, periode (bulanan/tahunan), berlaku_rombel_id NULLABLE (NULL = semua)
- **tagihan** — id, sekolah_id, siswa_id, biaya_id, bulan NULLABLE (2026-08), nominal, jatuh_tempo, status (belum/lunas/terlambat), tahun_ajaran_id, UNIQUE(siswa_id, biaya_id, bulan)
- **pembayaran** — id, sekolah_id, siswa_id, tagihan_id, nominal, tanggal, metode (tunai/transfer), no_ref, catatan, dibuat_oleh_user_id
- **RPC `generate_tagihan_bulanan()`** — admin klik "generate tagihan bulan ini" → bikin tagihan SPP semua siswa aktif (bulan belum ada)

### C.4 Catatan desain
- `sekolah_id` default = sekolah aktif, di-set via RLS policy + trigger (pola multi-sekolah aman sejak hari pertama).
- Nomor urut, relasi wali-anak, dan validasi tanggal absen (tidak boleh absen hari libur) via CHECK constraint.
- Semua tabel punya `created_at`, `updated_at` (trigger set).

---

## D. RLS POLICY MATRIX

| Tabel | admin | guru | wali | siswa |
|---|---|---|---|---|
| sekolah, tahun_ajaran, jurusan, mapel | CRUD | R | R | R |
| rombel | CRUD | R | R | R |
| guru | CRUD | R | - | - |
| siswa | CRUD | R | R (anaknya) | R (dirinya) |
| wali_murid, wali_siswa | CRUD | - | R (dirinya) | - |
| jadwal | CRUD | R + tulis jadwal sendiri? (R saja dulu) | R (anaknya) | R (rombelnya) |
| absensi | CRUD + rekap | INSERT/UPDATE (rombel yang diajar) + R | R (anaknya) | R (dirinya) |
| nilai | CRUD + rekap | INSERT/UPDATE (mapel diajar) + R | R (anaknya) | R (dirinya) |
| rapor | CRUD | R | R (anaknya) | R (dirinya) |
| biaya, tagihan, pembayaran | CRUD | - | R (anaknya) | R (dirinya, tagihan) |

- **Peran dibaca dari JWT custom claim** (`app_metadata.peran`) + tabel `akun`. Set di trigger saat akun dibuat admin.
- **Wali/siswa "anaknya"** = via `wali_siswa` join atau `siswa.user_id = auth.uid()`.
- Operasi super-admin (buat akun, PIN, hapus data) → RPC `SECURITY DEFINER` yang cek peran + PIN admin.

---

## E. AUTH FLOW

1. **Admin buat akun** (halaman /admin/akun): input/bulk import → RPC `admin_buat_akun(nama, peran, nisn/nip, password_awal)` → insert auth.users (confirmed) + row tabel terkait + custom claim peran.
2. **Siswa login**: email = `nisn@sekolah.local` (fiktif, non-routable) ATAU nomor HP — putuskan di implementasi; rekomendasi: email fiktif berbasis NISN + password awal yang direset. Ganti password wajib di login pertama (flag `harus_ganti_password`).
3. **Wali**: akun dibuat admin, di-link ke 1..n siswa lewat halaman wali.
4. **PIN admin**: operasi sensitif (hapus siswa, hapus pembayaran, ubah nominal) minta PIN — verifikasi via RPC (hash), tanpa bocorkan PIN ke client.

---

## F. HALAMAN PER PERAN (React Router)

| Route | Peran | Isi |
|---|---|---|
| /login | semua | login + ganti password pertama |
| / | semua | dashboard per peran (redirect sesuai claim) |
| /admin/* | admin | dashboard (statistik siswa/keuangan/absensi), siswa (list/form/import CSV/bulk akun), guru, rombel (+naik kelas massal), jadwal (+cek bentrok), nilai (rekap), keuangan (biaya, generate tagihan, pembayaran, rekap tunggakan), akun (buat/link wali), laporan, PIN prompt |
| /guru/* | guru | dashboard (jadwal hari ini, rombel ajar), absensi (pilih rombel+mapel+tanggal → grid siswa → H/S/I/A/T), nilai (input per rombel+mapel), jadwal |
| /wali/* | wali | dashboard (anak-anak), nilai anak, absensi anak, tagihan anak (status SPP) |
| /siswa/* | siswa | dashboard, nilai, jadwal, absensi diri |

Guard peran: wrapper `RequirePeran` yang baca claim sebelum render; redirect kalau salah peran.

---

## G. ROADMAP FASE

### 🔵 FASE 1 — Core (bisa dipakai harian)
> Goal: 5 modul inti jalan end-to-end. DB + UI + Auth.

1.1 **Setup & auth** — scaffold repo, tabel + RLS + RPC, login 4 peran, guard, PIN admin.
   - ✅ Kriteria: login 4 peran beda dashboard; akses silang tertolak (403).
1.2 **Master data** — sekolah/tahun_ajaran/jurusan/rombel/guru/siswa CRUD + import CSV siswa + generate akun otomatis + link wali.
   - ✅ Kriteria: import CSV 500 siswa → akun semua kebuat; wali bisa lihat anaknya.
1.3 **Absensi** — grid absen per jam oleh guru, rekap harian/bulanan, notif in-app.
   - ✅ Kriteria: guru absen 1 kelas < 1 menit; rekap per siswa/bulan keluar.
1.4 **Nilai & rapor** — input nilai (jenis+bobot), rata-rata otomatis, PDF rapor per semester.
   - ✅ Kriteria: nilai 1 mapel masuk → rapor PDF siswa jadi (nama, nilai, rata-rata).
1.5 **Jadwal** — CRUD jadwal + deteksi bentrok, tampil per rombel/guru.
   - ✅ Kriteria: input 2 jadwal bentrok guru → ditolak dengan pesan jelas.
1.6 **SPP** — biaya, generate tagihan bulanan, catat bayar, rekap tunggakan.
   - ✅ Kriteria: generate tagihan 1 bulan semua siswa; bayar 1 tagihan → status lunas; rekap tunggakan per rombel benar.

### 🟢 FASE 2 — Pelengkap operasional
- WA bot reminder SPP & absensi (pola bot kamu, cron), upload bukti transfer + verifikasi admin
- e-Rapor template Kemendikbud + export Dapodik (CSV)
- Perpustakaan (katalog, pinjam, denda), ekstrakurikuler + penilaian, BK/catatan konseling, inventaris
- Notifikasi push (VAPID, pola RumahKita)

### 🟡 FASE 3 — Enterprise
- Auto-generator jadwal (algoritma penjadwalan), gateway pembayaran online, multi-sekolah (aktifkan `sekolah_id`), analytics & KPI dashboard

---

## H. RISIKO & MITIGASI

| Risiko | Mitigasi |
|---|---|
| Scope melebar ("terlengkap" = tak berujung) | Fase ketat; YAGNI; modul baru = PR tersendiri |
| Format e-Rapor/Dapodik sering berubah | Isolasi di Fase 2; Fase 1 hanya PDF sendiri |
| Data lama di Excel berantakan | Import CSV terstruktur + laporan baris gagal per kolom (pola BRD) |
| Siswa/wali lupa password | Admin reset + password awal di undangan singkat |
| Service key bocor ke frontend | Semua operasi super-admin lewat RPC SECURITY DEFINER |
| GH Pages SPA 404 di refresh | Hash router atau 404.html redirect (skill github-pages-spa-deployment) |
| Supabase free auto-pause 7 hari | App dipakai harian; kalau kepend-pause tinggal dibuka |

---

## I. MILESTONE PERTAMA (langsung bisa dikerjakan)

1. `npm create vite@latest` (react-ts) di `~/sekolah-sma/` + Tailwind + React Router
2. Migration SQL: tabel C.1-C.3 + RLS D + RPC E (satu file `supabase/migrations/0001_init.sql`)
3. `supabase link` + jalankan migrasi
4. Login 4 peran + guard + PIN prompt
5. Halaman master siswa + import CSV

> **Untuk eksekusi:** pakai skill subagent-driven-development — 1 subagent per task, review 2 tahap (spec compliance → code quality). TDD untuk logika hitung (nilai rata-rata, bentrok jadwal, tunggakan).
