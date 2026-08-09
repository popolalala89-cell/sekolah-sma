-- =====================================================================
-- SEKOLAH-SMA — CLEANUP: hapus duplikat bootstrap
-- Gejala: sekolah=2, jurusan=6, mapel=12 (harusnya 1/3/6)
-- Penyebab: blok 0004 di-Run lebih dari sekali sedangkan tabel sekolah
-- tidak punya unique constraint, jadi baris baru terus dibuat.
-- =====================================================================

-- hapus data anak dari sekolah duplikat (id terbesar)
delete from public.jurusan
  where sekolah_id = (select max(id) from public.sekolah);

delete from public.mapel
  where sekolah_id = (select max(id) from public.sekolah);

-- pastikan tahun_ajaran cuma punya sekolah aktif pertama
delete from public.tahun_ajaran
  where sekolah_id = (select max(id) from public.sekolah);

-- hapus sekolah duplikat itu sendiri
delete from public.sekolah
  where id = (select max(id) from public.sekolah);

-- =====================================================================
-- VERIFIKASI (jalankan terpisah):
--   select 'sekolah', count(*) from public.sekolah
--   union all select 'tahun_ajaran', count(*) from public.tahun_ajaran
--   union all select 'jurusan', count(*) from public.jurusan
--   union all select 'mapel', count(*) from public.mapel;
-- Harusnya: 1 / 1 / 3 / 6
-- =====================================================================