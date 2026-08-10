-- ════════════════════════════════════════════════════════════════
-- CLEANUP SIAP PRODUKSI — sekolah-sma
-- Cara pakai: buka Supabase Dashboard → SQL Editor → New query →
-- paste SEMUA ini → Run. (Jalankan SEBAGIAN jika mau bertahap)
-- ════════════════════════════════════════════════════════════════

-- ── 1. GANTI PASSWORD ADMIN (WAJIB — password lama 'adlok123'
--     dipakai akun uji & sudah pernah dikirim di chat) ────────────
-- GANTI 'PASSWORD_BARU_ADMIN' dengan password kuat pilihan Pa
-- (mis. campur huruf besar/kecil + angka + simbol, min. 12 karakter).

update auth.users
set encrypted_password = crypt('PASSWORD_BARU_ADMIN', gen_salt('bf')),
    updated_at = now()
where email = 'admin@sekolah.local';

-- ── 2. HAPUS AKUN UJI (auth + identitas + baris tabel akun) ─────
-- Menghapus guru1, wali-uji, siswa-uji. Jalankan SETELAH blok 1
-- (pastikan dulu Pa masih bisa login admin dengan password baru).

delete from auth.users
where email in ('guru1@sekolah.local', 'wali-uji@sekolah.local', 'siswa-uji@sekolah.local');

delete from public.akun where peran <> 'admin';

-- ── 3. ISI DATA SEKOLAH (ganti placeholder dengan data asli) ────
-- Tahun ajaran aktif: cek id di tabel tahun_ajaran dulu kalau ragu.

update public.sekolah
set nama = 'NAMA_SEKOLAH_ASLI',
    npsn = 'NPSN_ASLI',
    alamat = 'ALAMAT_ASLI',
    telepon = 'NO_TELEPON_ASLI'
where id = 1;

-- ── 4. CEK HASIL (jalankan kapan saja, aman) ────────────────────
select 'siswa' as tbl, count(*) from public.siswa
union all select 'guru', count(*) from public.guru
union all select 'rombel', count(*) from public.rombel
union all select 'akun', count(*) from public.akun
union all select 'tagihan', count(*) from public.tagihan;