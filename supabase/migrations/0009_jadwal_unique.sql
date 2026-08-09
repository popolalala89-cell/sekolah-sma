-- =====================================================================
-- SEKOLAH-SMA — 0009 JADWAL (Fase 1.5)
--
-- Halaman Jadwal menyimpan slot via UPSERT. Supabase butuh constraint
-- UNIQUE pada kombinasi (rombel, hari, jam_mulai) supaya simpan berulang
-- tidak menumpuk duplikat & satu kelas tidak punya 2 pelajaran di jam
-- yang sama. (Bentrok guru & ruang sudah dicegah unique index 0001.)
--
-- CARA: buka SQL Editor -> paste file ini -> Run
-- (aman dijalankan ulang? TIDAK 100% — tambah constraint sekali saja.
--  Kalau error "already exists", artinya sudah terpasang, abaikan.)
-- =====================================================================

alter table public.jadwal
  add constraint u_jadwal_rombel_slot
  unique (rombel_id, hari, jam_mulai);

-- =====================================================================
-- VERIFIKASI:
--   select conname from pg_constraint
--   where conrelid = 'public.jadwal'::regclass and contype = 'u';
--   -- harus muncul: u_jadwal_rombel_slot
-- =====================================================================