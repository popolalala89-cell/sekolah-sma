-- =====================================================================
-- SEKOLAH-SMA — demo_seed.sql  (DATA DUMMY + AKUN DEMO)
-- Isi data contoh supaya yang mau mencoba langsung lihat isi aplikasi.
--
-- CARA: buka Supabase Dashboard → SQL Editor → New query →
--       paste SELURUH file → RUN  (aman di-Run ulang)
--
-- DATA DEMO YANG DIBUAT:
--   Guru 2 (DEMO-G1, DEMO-G2), Rombel 2 (X-Ipa-Demo, XI-Ipa-Demo)
--   Siswa 6, Wali 2, Jadwal, Absensi, Nilai, Tagihan SPP + Pembayaran
--   Akun: demo.guru@sekolah.local / demo1234
--         demo.wali@sekolah.local / demo1234
--         demo.siswa@sekolah.local / demo1234
--
-- SAAT MAU PAKAI PRODUKSI: jalankan saja BLOK 6 di file ini
-- (hapus semua data + akun demo). Nama/nisn/nip semua ber-awalan
-- DEMO supaya pembersihan tepat sasaran.
-- =====================================================================

-- ── BLOK 1: PASTIKAN MASTER ADA ──────────────────────────────────────
insert into public.sekolah (nama, npsn, alamat, telepon)
select 'SMA Nusantara', '12345678', 'Jl. Pendidikan No. 1', '021-5551000'
where not exists (select 1 from public.sekolah);

insert into public.tahun_ajaran (sekolah_id, nama, tgl_mulai, tgl_selesai, aktif)
select id, '2026/2027', '2026-07-13', '2027-06-30', true
from public.sekolah limit 1
on conflict (sekolah_id, nama) do nothing;

update public.sekolah
set tahun_ajaran_aktif_id = (select id from public.tahun_ajaran where aktif = true limit 1)
where tahun_ajaran_aktif_id is null;

insert into public.jurusan (sekolah_id, kode, nama)
select s.id, v.kode, v.nama
from public.sekolah s
cross join (values
  ('IPA', 'Ilmu Pengetahuan Alam'),
  ('IPS', 'Ilmu Pengetahuan Sosial'),
  ('BHS', 'Bahasa & Budaya')
) as v(kode, nama)
on conflict (sekolah_id, kode) do nothing;

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

-- ── BLOK 2: GURU, ROMBEL, SISWA, WALI (DEMO) ───────────────────────
insert into public.guru (sekolah_id, nip, nama, mapel_utama)
select s.id, v.nip, v.nama, v.mapel
from public.sekolah s
cross join (values
  ('DEMO-G1', 'DEMO Guru 1 (Matematika)', 'Matematika'),
  ('DEMO-G2', 'DEMO Guru 2 (Bahasa Indonesia)', 'Bahasa Indonesia')
) as v(nip, nama, mapel)
on conflict (nip) do nothing;

insert into public.rombel (sekolah_id, tahun_ajaran_id, tingkat, jurusan_id, nama, wali_kelas_guru_id)
select s.id, ta.id, v.tingkat, j.id, v.nama, g.id
from public.sekolah s
cross join public.tahun_ajaran ta
cross join (values
  (10, 'X-Ipa-Demo'),
  (11, 'XI-Ipa-Demo')
) as v(tingkat, nama)
join public.jurusan j on j.sekolah_id = s.id and j.kode = 'IPA'
join public.guru g on g.sekolah_id = s.id and g.nip = case v.tingkat when 10 then 'DEMO-G1' else 'DEMO-G2' end
where ta.aktif = true
on conflict (sekolah_id, tahun_ajaran_id, nama) do nothing;

insert into public.siswa (sekolah_id, nisn, nis, nama, gender, tempat_lahir, tgl_lahir, alamat, status, angkatan)
select s.id, v.nisn, v.nis, v.nama, v.gender, 'Jakarta', '2010-03-15', 'Jl. Melati No. 1', 'aktif', 2024
from public.sekolah s
cross join (values
  ('DEMO0001', 'DEMO1001', 'DEMO Siswa 1', 'L'),
  ('DEMO0002', 'DEMO1002', 'DEMO Siswa 2', 'P'),
  ('DEMO0003', 'DEMO1003', 'DEMO Siswa 3', 'L'),
  ('DEMO0004', 'DEMO2001', 'DEMO Siswa 4', 'P'),
  ('DEMO0005', 'DEMO2002', 'DEMO Siswa 5', 'L'),
  ('DEMO0006', 'DEMO2003', 'DEMO Siswa 6', 'P')
) as v(nisn, nis, nama, gender)
on conflict (nisn) do nothing;

insert into public.rombel_siswa (rombel_id, siswa_id, tahun_ajaran_id)
select r.id, sw.id, ta.id
from public.rombel r
join public.tahun_ajaran ta on ta.id = r.tahun_ajaran_id and ta.aktif = true
join public.siswa sw on sw.sekolah_id = r.sekolah_id
where r.nama in ('X-Ipa-Demo', 'XI-Ipa-Demo')
  and ((r.nama = 'X-Ipa-Demo' and sw.nisn in ('DEMO0001','DEMO0002','DEMO0003'))
    or (r.nama = 'XI-Ipa-Demo' and sw.nisn in ('DEMO0004','DEMO0005','DEMO0006')))
on conflict do nothing;

insert into public.wali_murid (sekolah_id, nama, telepon)
select s.id, v.nama, v.telp
from public.sekolah s
cross join (values
  ('DEMO Wali 1', '0812-0001'),
  ('DEMO Wali 2', '0812-0002')
) as v(nama, telp)
where not exists (select 1 from public.wali_murid w where w.nama = v.nama and w.sekolah_id = s.id);

insert into public.wali_siswa (wali_murid_id, siswa_id)
select w.id, sw.id
from public.wali_murid w
join public.siswa sw on sw.sekolah_id = w.sekolah_id
where (w.nama = 'DEMO Wali 1' and sw.nisn in ('DEMO0001','DEMO0002','DEMO0003'))
   or (w.nama = 'DEMO Wali 2' and sw.nisn in ('DEMO0004','DEMO0005','DEMO0006'))
on conflict do nothing;

-- ── BLOK 3: JADWAL, ABSENSI, NILAI (DEMO) ───────────────────────────
insert into public.jadwal (sekolah_id, rombel_id, mapel_id, guru_id, hari, jam_mulai, jam_selesai, ruang, tahun_ajaran_id)
select s.id, r.id, m.id, g.id, v.hari, v.mulai, v.selesai, v.ruang, ta.id
from public.sekolah s
cross join public.rombel r
cross join public.tahun_ajaran ta
cross join (values
  (10, 1, '07:00', '08:40', 'R.101', 'MTK'),
  (10, 2, '08:40', '10:20', 'R.101', 'BIN'),
  (10, 3, '10:30', '12:10', 'R.102', 'ING'),
  (11, 1, '07:00', '08:40', 'R.201', 'FIS'),
  (11, 2, '08:40', '10:20', 'R.201', 'MTK')
) as v(tingkat, hari, mulai, selesai, ruang, kode)
join public.jurusan j on j.sekolah_id = s.id and j.kode = 'IPA'
join public.mapel m on m.sekolah_id = s.id and m.kode = v.kode
join public.guru g on g.sekolah_id = s.id and g.nip = case v.kode when 'MTK' then 'DEMO-G1' else 'DEMO-G2' end
where ta.aktif = true
  and r.nama = case v.tingkat when 10 then 'X-Ipa-Demo' else 'XI-Ipa-Demo' end
on conflict (rombel_id, hari, jam_mulai) do nothing;

insert into public.absensi (sekolah_id, siswa_id, rombel_id, mapel_id, tanggal, jam_ke, status, guru_id)
select s.id, sw.id, r.id, m.id, current_date - v.hari_lalu, 1, v.status, g.id
from public.sekolah s
cross join public.rombel r
cross join public.siswa sw
cross join (values
  (0, 'H'), (0, 'H'), (0, 'H'), (0, 'S'), (0, 'H'), (0, 'A'),
  (1, 'H'), (1, 'H'), (1, 'I'), (1, 'H'), (1, 'H'), (1, 'H')
) as v(hari_lalu, status)
join public.mapel m on m.sekolah_id = s.id and m.kode = 'BIN'
join public.guru g on g.sekolah_id = s.id and g.nip = 'DEMO-G2'
join public.rombel_siswa rs on rs.siswa_id = sw.id and rs.rombel_id = r.id
where r.nama in ('X-Ipa-Demo', 'XI-Ipa-Demo')
  and sw.nisn like 'DEMO%'
  and sw.nisn = case (row_number() over (partition by v.hari_lalu order by sw.nisn) - 1) % 6 + 1
    when 1 then 'DEMO0001' when 2 then 'DEMO0002' when 3 then 'DEMO0003'
    when 4 then 'DEMO0004' when 5 then 'DEMO0005' else 'DEMO0006' end
on conflict (siswa_id, tanggal, mapel_id) do nothing;

insert into public.nilai (sekolah_id, siswa_id, mapel_id, rombel_id, guru_id, jenis, nilai, semester, tahun_ajaran_id)
select s.id, sw.id, m.id, r.id, g.id, v.jenis, v.angka, 1, ta.id
from public.sekolah s
cross join public.siswa sw
cross join public.rombel r
cross join public.tahun_ajaran ta
cross join (values
  ('tugas', 85), ('formatif', 88), ('sumatif', 90), ('uts', 82),
  ('tugas', 80), ('formatif', 84), ('sumatif', 86), ('uts', 78)
) as v(jenis, angka)
join public.mapel m on m.sekolah_id = s.id and m.kode = 'MTK'
join public.guru g on g.sekolah_id = s.id and g.nip = 'DEMO-G1'
join public.rombel_siswa rs on rs.siswa_id = sw.id and rs.rombel_id = r.id
where r.nama in ('X-Ipa-Demo', 'XI-Ipa-Demo')
  and sw.nisn like 'DEMO%'
  and sw.nisn = case (row_number() over (partition by v.jenis order by sw.nisn) - 1) % 6 + 1
    when 1 then 'DEMO0001' when 2 then 'DEMO0002' when 3 then 'DEMO0003'
    when 4 then 'DEMO0004' when 5 then 'DEMO0005' else 'DEMO0006' end
on conflict (siswa_id, mapel_id, semester, jenis) do nothing;

-- ── BLOK 4: SPP (biaya + tagihan + pembayaran demo) ──────────────────
insert into public.biaya (sekolah_id, tahun_ajaran_id, nama, nominal, periode)
select s.id, ta.id, 'SPP', 300000, 'bulanan'
from public.sekolah s
cross join public.tahun_ajaran ta
where ta.aktif = true
  and not exists (select 1 from public.biaya b where b.sekolah_id = s.id and b.tahun_ajaran_id = ta.id and b.nama = 'SPP');

insert into public.tagihan (sekolah_id, siswa_id, biaya_id, bulan, nominal, jatuh_tempo, status, tahun_ajaran_id)
select s.id, sw.id, b.id, v.bulan, b.nominal, v.bulan + 10, 'belum', ta.id
from public.sekolah s
cross join public.siswa sw
cross join public.biaya b
cross join public.tahun_ajaran ta
cross join (values
  (date_trunc('month', current_date)::date),
  ((date_trunc('month', current_date) + interval '1 month')::date)
) as v(bulan)
where ta.aktif = true
  and b.nama = 'SPP'
  and sw.nisn like 'DEMO%'
on conflict (siswa_id, biaya_id, bulan) do nothing;

-- lunaskan tagihan bulan pertama utk 3 siswa pertama (biar ada data pembayaran)
insert into public.pembayaran (sekolah_id, siswa_id, tagihan_id, nominal, tanggal, metode, no_ref, catatan)
select t.sekolah_id, t.siswa_id, t.id, t.nominal, t.bulan + 5, 'tunai', 'DEMO-BAYAR', 'pembayaran demo'
from public.tagihan t
join public.siswa sw on sw.id = t.siswa_id
where t.bulan = date_trunc('month', current_date)::date
  and sw.nisn in ('DEMO0001','DEMO0002','DEMO0003')
on conflict do nothing;

update public.tagihan t
set status = 'lunas'
from public.siswa sw
where sw.id = t.siswa_id
  and sw.nisn in ('DEMO0001','DEMO0002','DEMO0003')
  and t.bulan = date_trunc('month', current_date)::date
  and exists (select 1 from public.pembayaran p where p.tagihan_id = t.id);

-- ── BLOK 5: AKUN DEMO (email+password) ───────────────────────────────
-- demo.guru@sekolah.local / demo1234   (role guru)
-- demo.wali@sekolah.local / demo1234   (role wali)
-- demo.siswa@sekolah.local / demo1234  (role siswa)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, is_sso_user, is_anonymous
)
select
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email,
  crypt('demo1234', gen_salt('bf')), now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'peran', v.peran),
  '{}'::jsonb, now(), now(), '', '', '', '', false, false
from (values
  ('demo.guru@sekolah.local', 'guru'),
  ('demo.wali@sekolah.local', 'wali'),
  ('demo.siswa@sekolah.local', 'siswa')
) as v(email, peran)
where not exists (select 1 from auth.users u where u.email = v.email);

-- identities (wajib supaya bisa login email+password)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, email, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', u.email, now(), now(), now()
from auth.users u
where u.email in ('demo.guru@sekolah.local','demo.wali@sekolah.local','demo.siswa@sekolah.local')
  and not exists (select 1 from auth.identities i where i.user_id = u.id);

-- baris peran + kaitkan ke data (guru/siswa/wali) biar login lihat datanya
insert into public.akun (user_id, peran, terkait_id)
select u.id, v.peran, v.terkait
from auth.users u
join (values
  ('demo.guru@sekolah.local', 'guru', (select id from public.guru where nip = 'DEMO-G1' limit 1)),
  ('demo.wali@sekolah.local', 'wali', (select id from public.wali_murid where nama = 'DEMO Wali 1' limit 1)),
  ('demo.siswa@sekolah.local', 'siswa', (select id from public.siswa where nisn = 'DEMO0001' limit 1))
) as v(email, peran, terkait) on u.email = v.email
where not exists (select 1 from public.akun a where a.user_id = u.id);

update public.guru g set user_id = u.id
from auth.users u where u.email = 'demo.guru@sekolah.local' and g.nip = 'DEMO-G1';

update public.wali_murid w set user_id = u.id
from auth.users u where u.email = 'demo.wali@sekolah.local' and w.nama = 'DEMO Wali 1';

update public.siswa sw set user_id = u.id
from auth.users u where u.email = 'demo.siswa@sekolah.local' and sw.nisn = 'DEMO0001';

-- ── BLOK 6: BERSIHKAN DATA DEMO (jalankan saat mau pakai produksi) ──
-- Semua data demo ber-awalan DEMO — hapus tuntas dari akun sampai data.
-- delete from public.wali_murid where nama like 'DEMO%';
-- delete from public.siswa where nisn like 'DEMO%';
-- delete from public.guru where nip like 'DEMO%';
-- delete from public.rombel where nama like '%Demo';
-- delete from auth.users where email like 'demo.%@sekolah.local';

-- ── VERIFIKASI (jalankan terpisah setelah RUN) ────────────────────────
-- select 'siswa', count(*) from public.siswa where nisn like 'DEMO%'
-- union all select 'guru', count(*) from public.guru where nip like 'DEMO%'
-- union all select 'rombel', count(*) from public.rombel where nama like '%Demo'
-- union all select 'tagihan', count(*) from public.tagihan t join public.siswa sw on sw.id = t.siswa_id where sw.nisn like 'DEMO%'
-- union all select 'akun_demo', count(*) from auth.users where email like 'demo.%@sekolah.local';