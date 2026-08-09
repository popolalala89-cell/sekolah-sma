-- =====================================================================
-- SEKOLAH-SMA — 0008 NILAI & RAPOR (Fase 1.4)
--
-- Yang dibutuhkan halaman input nilai: constraint UNIQUE supaya
-- simpan berulang (upsert) untuk kombinasi (siswa, mapel, semester,
-- jenis) tidak menumpuk duplikat.
--
-- CARA: buka SQL Editor -> paste file ini -> Run
-- (aman dijalankan ulang? TIDAK 100% — tambah constraint sekali saja.
--  Kalau error "already exists", artinya sudah terpasang, abaikan.)
-- =====================================================================

alter table public.nilai
  add constraint u_nilai_siswa_mapel_jenis
  unique (siswa_id, mapel_id, semester, jenis);

-- =====================================================================
-- VERIFIKASI:
--   select conname from pg_constraint
--   where conrelid = 'public.nilai'::regclass and contype = 'u';
--   -- harus muncul: u_nilai_sis_mapel_jenis
-- =====================================================================