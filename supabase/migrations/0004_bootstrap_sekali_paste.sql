-- =====================================================================
-- SEKOLAH-SMA — BOOTSTRAP SEKALI PASTE (0002 + 0003 digabung)
-- Urutan WAJIB:
--   1) Dashboard → Authentication → Users → Add user
--      email: admin@sekolah.local  password: (baca di bawah)
--   2) Paste SELURUH blok ini di SQL Editor → Run
-- =====================================================================

-- 1) Tandai user admin + isi baris di tabel akun (peran admin)
update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"peran":"admin"}'::jsonb
  where email = 'admin@sekolah.local';

-- 2) Data sekolah (GANTI nama/npsn sesuai sekolah asli)
insert into public.sekolah (nama, npsn, alamat, telepon)
values ('SMA Nusantara', '12345678', 'Jl. Pendidikan No. 1', '021-5551000')
on conflict do nothing;

-- 3) Tahun ajaran aktif
insert into public.tahun_ajaran (sekolah_id, nama, tgl_mulai, tgl_selesai, aktif)
select id, '2026/2027', '2026-07-13', '2027-06-30', true
from public.sekolah order by id limit 1
on conflict (sekolah_id, nama) do nothing;

-- 4) Kaitkan tahun ajaran aktif ke sekolah
update public.sekolah
  set tahun_ajaran_aktif_id = (select id from public.tahun_ajaran where aktif = true order by id limit 1)
  where tahun_ajaran_aktif_id is null;

-- 5) Jurusan (bisa ditambah lewat UI nanti)
insert into public.jurusan (sekolah_id, kode, nama)
select s.id, v.kode, v.nama
from public.sekolah s
cross join (values
  ('IPA', 'Ilmu Pengetahuan Alam'),
  ('IPS', 'Ilmu Pengetahuan Sosial'),
  ('BHS', 'Bahasa & Budaya')
) as v(kode, nama)
on conflict (sekolah_id, kode) do nothing;

-- 6) Mapel inti (bisa ditambah lewat UI nanti)
insert into public.mapel (sekolah_id, kode, nama)
select s.id, v.kode, v.nama
from public.sekolah s
cross join (values
  ('MTK', 'Matematika'),
  ('BIN', 'Bahasa Indonesia'),
  ('ING', 'Bahasa Inggris'),
  ('FIS', 'Fisika'),
  ('KIM', 'Kimia'),
  ('BIO', 'Biologi')
) as v(kode, nama)
on conflict (sekolah_id, kode) do nothing;

-- 7) Isi baris akun admin (peran admin sudah di raw_app_meta_data)
insert into public.akun (user_id, sekolah_id, peran)
select u.id, s.id, 'admin'
from auth.users u
cross join public.sekolah s
where u.email = 'admin@sekolah.local'
on conflict (user_id) do nothing;

-- 8) GRANT — fungsi RPC wajib di-grant supaya bisa dipanggil dari client
grant execute on function public.current_sekolah_id() to anon, authenticated;
grant execute on function public.my_peran() to anon, authenticated;
grant execute on function public.siswa_ids_for_wali() to anon, authenticated;

grant execute on function public.admin_buat_akun(text, text, text, uuid) to authenticated;
grant execute on function public.admin_set_pin(text) to authenticated;
grant execute on function public.cek_pin_admin(text) to authenticated;
grant execute on function public.admin_generate_tagihan_bulanan(date) to authenticated;
grant execute on function public.admin_naik_kelas() to authenticated;

-- =====================================================================
-- VERIFIKASI (jalankan baris ini terpisah setelah Run sukses):
--   select 'sekolah', count(*) from public.sekolah
--   union all select 'tahun_ajaran', count(*) from public.tahun_ajaran
--   union all select 'jurusan', count(*) from public.jurusan
--   union all select 'mapel', count(*) from public.mapel
--   union all select 'akun_admin', count(*) from public.akun where peran='admin';
-- Semua angka harus >= 1.
-- =====================================================================