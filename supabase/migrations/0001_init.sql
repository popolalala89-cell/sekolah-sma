-- =====================================================================
-- SEKOLAH-SMA — Fase 1 schema LENGKAP (tabel + trigger + RLS + RPC)
-- Jalankan di Supabase Dashboard → SQL Editor → New query → paste semua → RUN
-- =====================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABEL MASTER
-- ─────────────────────────────────────────────────────────────────────

create table public.sekolah (
  id bigint generated always as identity primary key,
  nama text not null,
  npsn text,
  alamat text,
  telepon text,
  logo_url text,
  tahun_ajaran_aktif_id uuid,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tahun_ajaran (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  nama text not null,                                  -- "2026/2027"
  tgl_mulai date,
  tgl_selesai date,
  aktif boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sekolah_id, nama)
);

create table public.jurusan (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  kode text not null,                                  -- IPA / IPS / BHS
  nama text not null,
  created_at timestamptz not null default now(),
  unique (sekolah_id, kode)
);

create table public.guru (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  user_id uuid unique references auth.users(id) on delete set null,
  nip text unique,
  nama text not null,
  mapel_utama text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rombel (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  tingkat smallint not null check (tingkat between 10 and 12),  -- X=10 XI=11 XII=12
  jurusan_id uuid references public.jurusan(id),       -- NULL = belum penjurusan
  nama text not null,                                  -- "XI-IPA-1"
  wali_kelas_guru_id uuid references public.guru(id),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sekolah_id, tahun_ajaran_id, nama)
);

create table public.siswa (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  user_id uuid unique references auth.users(id) on delete set null,
  nisn text unique not null,
  nis text,
  nama text not null,
  tempat_lahir text,
  tgl_lahir date,
  gender text check (gender in ('L','P')),
  alamat text,
  telepon text,
  foto_url text,
  status text not null default 'aktif' check (status in ('aktif','alumni','keluar')),
  angkatan smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wali_murid (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  user_id uuid unique references auth.users(id) on delete set null,
  nama text not null,
  telepon text,
  created_at timestamptz not null default now()
);

create table public.wali_siswa (
  wali_murid_id uuid not null references public.wali_murid(id) on delete cascade,
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  primary key (wali_murid_id, siswa_id)
);

create table public.mapel (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  kode text not null,
  nama text not null,
  created_at timestamptz not null default now(),
  unique (sekolah_id, kode)
);

create table public.akun (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sekolah_id bigint references public.sekolah(id),
  peran text not null check (peran in ('admin','guru','wali','siswa')),
  terkait_id uuid,                                   -- guru.id / siswa.id / wali_murid.id
  pin_hash text,                                   -- khusus admin (bcrypt)
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. TABEL AKADEMIK
-- ─────────────────────────────────────────────────────────────────────

create table public.rombel_siswa (
  rombel_id uuid not null references public.rombel(id) on delete cascade,
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id) on delete cascade,
  primary key (rombel_id, siswa_id, tahun_ajaran_id)
);

create table public.jadwal (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  rombel_id uuid not null references public.rombel(id) on delete cascade,
  mapel_id uuid not null references public.mapel(id),
  guru_id uuid references public.guru(id),
  hari smallint not null check (hari between 1 and 6),
  jam_mulai time not null,
  jam_selesai time not null,
  ruang text,
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  created_at timestamptz not null default now(),
  constraint cek_jam_wajar check (jam_selesai > jam_mulai)
);

-- cek bentrok: guru & ruang tidak dobel di hari+jam yang sama
create unique index ux_jadwal_guru on public.jadwal (guru_id, hari, jam_mulai) where guru_id is not null;
create unique index ux_jadwal_ruang on public.jadwal (ruang, hari, jam_mulai) where ruang is not null;

create table public.absensi (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  rombel_id uuid not null references public.rombel(id),
  mapel_id uuid references public.mapel(id),
  tanggal date not null,
  jam_ke smallint,
  status text not null check (status in ('H','S','I','A','T')),  -- Hadir/Sakit/Izin/Alpha/Telat
  catatan text,
  guru_id uuid references public.guru(id),
  created_at timestamptz not null default now(),
  constraint u_absensi unique (siswa_id, tanggal, mapel_id)
);

create table public.nilai (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  mapel_id uuid not null references public.mapel(id),
  rombel_id uuid references public.rombel(id),
  guru_id uuid references public.guru(id),
  jenis text not null check (jenis in ('tugas','formatif','sumatif','uts','uas')),
  nilai numeric(5,2) not null check (nilai between 0 and 100),
  semester smallint not null check (semester in (1,2)),
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rapor (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  semester smallint not null,
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  file_url text,
  dibuat_pada timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 3. TABEL KEUANGAN
-- ─────────────────────────────────────────────────────────────────────

create table public.biaya (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  nama text not null,                               -- "SPP", "Uang Gedung", ...
  nominal numeric(12,2) not null check (nominal > 0),
  periode text not null check (periode in ('bulanan','tahunan')),
  berlaku_rombel_id uuid references public.rombel(id),  -- NULL = semua rombel
  created_at timestamptz not null default now()
);

create table public.tagihan (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  biaya_id uuid not null references public.biaya(id),
  bulan date,                                       -- bulan untuk biaya 'bulanan'
  nominal numeric(12,2) not null,
  jatuh_tempo date,
  status text not null default 'belum' check (status in ('belum','lunas','terlambat')),
  tahun_ajaran_id uuid not null references public.tahun_ajaran(id),
  created_at timestamptz not null default now(),
  unique (siswa_id, biaya_id, bulan)
);

create table public.pembayaran (
  id uuid primary key default gen_random_uuid(),
  sekolah_id bigint not null references public.sekolah(id),
  siswa_id uuid not null references public.siswa(id) on delete cascade,
  tagihan_id uuid not null references public.tagihan(id),
  nominal numeric(12,2) not null check (nominal > 0),
  tanggal date not null default current_date,
  metode text not null check (metode in ('tunai','transfer')),
  no_ref text,
  catatan text,
  dibuat_oleh_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- 3b. HELPER FUNCTION (dibuat SETELAH tabel — ada referensi tabel)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.current_sekolah_id() returns bigint
language plpgsql stable as $$
begin
  return (select id from public.sekolah where aktif = true limit 1);
end $$;

create or replace function public.my_peran() returns text
language plpgsql stable as $$
begin
  return coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'peran', ''), '');
end $$;

-- ids siswa milik wali yang sedang login
create or replace function public.siswa_ids_for_wali() returns uuid[]
language plpgsql stable as $$
begin
  return coalesce((
    select array_agg(ws.siswa_id)
    from public.wali_siswa ws
    join public.wali_murid w on w.id = ws.wali_murid_id
    where w.user_id = auth.uid()
  ), '{}');
end $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.set_sekolah_id() returns trigger
language plpgsql as $$
begin
  if new.sekolah_id is null then
    new.sekolah_id := public.current_sekolah_id();
  end if;
  return new;
end $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. TRIGGER
-- ─────────────────────────────────────────────────────────────────────

create trigger trg_sekolah_upd before update on public.sekolah
  for each row execute function public.set_updated_at();
create trigger trg_tahun_ajaran_id before insert on public.tahun_ajaran
  for each row execute function public.set_sekolah_id();
create trigger trg_jurusan_id before insert on public.jurusan
  for each row execute function public.set_sekolah_id();
create trigger trg_rombel_id before insert on public.rombel
  for each row execute function public.set_sekolah_id();
create trigger trg_guru_upd before update on public.guru
  for each row execute function public.set_updated_at();
create trigger trg_guru_id before insert on public.guru
  for each row execute function public.set_sekolah_id();
create trigger trg_siswa_upd before update on public.siswa
  for each row execute function public.set_updated_at();
create trigger trg_siswa_id before insert on public.siswa
  for each row execute function public.set_sekolah_id();
create trigger trg_wali_id before insert on public.wali_murid
  for each row execute function public.set_sekolah_id();
create trigger trg_mapel_id before insert on public.mapel
  for each row execute function public.set_sekolah_id();
create trigger trg_akun_id before insert on public.akun
  for each row execute function public.set_sekolah_id();
create trigger trg_jadwal_id before insert on public.jadwal
  for each row execute function public.set_sekolah_id();
create trigger trg_absensi_id before insert on public.absensi
  for each row execute function public.set_sekolah_id();
create trigger trg_nilai_upd before update on public.nilai
  for each row execute function public.set_updated_at();
create trigger trg_nilai_id before insert on public.nilai
  for each row execute function public.set_sekolah_id();
create trigger trg_rapor_id before insert on public.rapor
  for each row execute function public.set_sekolah_id();
create trigger trg_biaya_id before insert on public.biaya
  for each row execute function public.set_sekolah_id();
create trigger trg_tagihan_id before insert on public.tagihan
  for each row execute function public.set_sekolah_id();
create trigger trg_pembayaran_id before insert on public.pembayaran
  for each row execute function public.set_sekolah_id();

-- ─────────────────────────────────────────────────────────────────────
-- 5. RLS + POLICY
-- ─────────────────────────────────────────────────────────────────────

alter table public.sekolah enable row level security;
alter table public.tahun_ajaran enable row level security;
alter table public.jurusan enable row level security;
alter table public.rombel enable row level security;
alter table public.guru enable row level security;
alter table public.siswa enable row level security;
alter table public.wali_murid enable row level security;
alter table public.wali_siswa enable row level security;
alter table public.mapel enable row level security;
alter table public.akun enable row level security;
alter table public.rombel_siswa enable row level security;
alter table public.jadwal enable row level security;
alter table public.absensi enable row level security;
alter table public.nilai enable row level security;
alter table public.rapor enable row level security;
alter table public.biaya enable row level security;
alter table public.tagihan enable row level security;
alter table public.pembayaran enable row level security;

-- sekolah
create policy p_sekolah_read on public.sekolah for select to authenticated using (true);
create policy p_sekolah_admin on public.sekolah for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- master: tahun_ajaran, jurusan, rombel, mapel — baca semua login, tulis admin
create policy p_tahun_read on public.tahun_ajaran for select to authenticated using (true);
create policy p_tahun_admin on public.tahun_ajaran for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_jurusan_read on public.jurusan for select to authenticated using (true);
create policy p_jurusan_admin on public.jurusan for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_rombel_read on public.rombel for select to authenticated using (true);
create policy p_rombel_admin on public.rombel for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_mapel_read on public.mapel for select to authenticated using (true);
create policy p_mapel_admin on public.mapel for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- guru: baca admin+guru, tulis admin
create policy p_guru_read on public.guru for select to authenticated
  using (public.my_peran() in ('admin','guru'));
create policy p_guru_admin on public.guru for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- siswa: admin+guru baca semua; wali baca anaknya; siswa baca dirinya; tulis admin
create policy p_siswa_admin_guru on public.siswa for select to authenticated
  using (public.my_peran() in ('admin','guru'));
create policy p_siswa_wali on public.siswa for select to authenticated
  using (id = any (public.siswa_ids_for_wali()));
create policy p_siswa_diri on public.siswa for select to authenticated
  using (user_id = auth.uid());
create policy p_siswa_admin on public.siswa for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- wali_murid / wali_siswa — admin tulis; wali baca relasinya sendiri
create policy p_wm_admin on public.wali_murid for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_wm_diri on public.wali_murid for select to authenticated
  using (user_id = auth.uid());
create policy p_ws_admin on public.wali_siswa for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_ws_wali on public.wali_siswa for select to authenticated
  using (wali_murid_id in (select id from public.wali_murid where user_id = auth.uid()));

-- akun — baca baris sendiri (buat ambil terkait_id), admin baca semua
create policy p_akun_self on public.akun for select to authenticated
  using (user_id = auth.uid());
create policy p_akun_admin on public.akun for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- rombel_siswa — admin tulis, guru baca, wali baca anaknya via siswa_ids_for_wali
create policy p_rs_admin on public.rombel_siswa for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_rs_guru on public.rombel_siswa for select to authenticated
  using (public.my_peran() = 'guru');
create policy p_rs_wali on public.rombel_siswa for select to authenticated
  using (siswa_id = any (public.siswa_ids_for_wali()));

-- jadwal — baca semua login, tulis admin
create policy p_jadwal_read on public.jadwal for select to authenticated using (true);
create policy p_jadwal_admin on public.jadwal for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- absensi — admin semua; guru tulis rombel ajarannya; wali/siswa baca
create policy p_abs_admin on public.absensi for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_abs_guru on public.absensi for all to authenticated
  using (public.my_peran() = 'guru') with check (public.my_peran() = 'guru');
create policy p_abs_wali on public.absensi for select to authenticated
  using (siswa_id = any (public.siswa_ids_for_wali()));
create policy p_abs_siswa on public.absensi for select to authenticated
  using (siswa_id in (select id from public.siswa where user_id = auth.uid()));

-- nilai — sama seperti absensi
create policy p_nil_admin on public.nilai for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_nil_guru on public.nilai for all to authenticated
  using (public.my_peran() = 'guru') with check (public.my_peran() = 'guru');
create policy p_nil_wali on public.nilai for select to authenticated
  using (siswa_id = any (public.siswa_ids_for_wali()));
create policy p_nil_siswa on public.nilai for select to authenticated
  using (siswa_id in (select id from public.siswa where user_id = auth.uid()));

-- rapor — admin tulis; guru baca; wali & siswa baca
create policy p_rapor_admin on public.rapor for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_rapor_guru on public.rapor for select to authenticated
  using (public.my_peran() = 'guru');
create policy p_rapor_wali on public.rapor for select to authenticated
  using (siswa_id = any (public.siswa_ids_for_wali()));
create policy p_rapor_siswa on public.rapor for select to authenticated
  using (siswa_id in (select id from public.siswa where user_id = auth.uid()));

-- biaya — baca semua login, tulis admin
create policy p_biaya_read on public.biaya for select to authenticated using (true);
create policy p_biaya_admin on public.biaya for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- tagihan — admin semua; wali & siswa baca tagihannya
create policy p_tag_admin on public.tagihan for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');
create policy p_tag_wali on public.tagihan for select to authenticated
  using (siswa_id = any (public.siswa_ids_for_wali()));
create policy p_tag_siswa on public.tagihan for select to authenticated
  using (siswa_id in (select id from public.siswa where user_id = auth.uid()));

-- pembayaran — admin saja (wali lihat status via tagihan)
create policy p_bay_admin on public.pembayaran for all to authenticated
  using (public.my_peran() = 'admin') with check (public.my_peran() = 'admin');

-- ─────────────────────────────────────────────────────────────────────
-- 6. RPC (security definer — operasi yang butuh privilese admin)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.admin_buat_akun(
  p_email text,
  p_password text,
  p_peran text,
  p_terkait_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin yang bisa membuat akun';
  end if;
  select id into v_uid
  from auth.admin_create_user(
    jsonb_build_object(
      'email', p_email,
      'password', p_password,
      'email_confirm', true,
      'app_metadata', jsonb_build_object('peran', p_peran)
    )
  );
  insert into public.akun (user_id, peran, terkait_id)
  values (v_uid, p_peran, p_terkait_id);
  return v_uid;
end $$;

create or replace function public.admin_set_pin(p_pin text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin';
  end if;
  update public.akun
    set pin_hash = crypt(p_pin, gen_salt('bf'))
  where user_id = auth.uid();
end $$;

create or replace function public.cek_pin_admin(p_pin text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
begin
  if public.my_peran() <> 'admin' then return false; end if;
  select pin_hash into v_hash from public.akun where user_id = auth.uid();
  return v_hash is not null and crypt(p_pin, v_hash) = v_hash;
end $$;

-- generate tagihan SPP bulanan untuk semua siswa aktif
create or replace function public.admin_generate_tagihan_bulanan(p_bulan date) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_sel bigint := public.current_sekolah_id();
  v_tahun uuid;
  v_bulan date := date_trunc('month', p_bulan)::date;
  v_count int := 0;
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin';
  end if;
  select tahun_ajaran_aktif_id into v_tahun from public.sekolah where id = v_sel;
  if v_tahun is null then raise exception 'Tahun ajaran aktif belum di-set'; end if;

  insert into public.tagihan (sekolah_id, siswa_id, biaya_id, bulan, nominal, jatuh_tempo, tahun_ajaran_id)
  select v_sel, s.id, b.id, v_bulan, b.nominal,
         v_bulan + interval '10 days', v_tahun
  from public.biaya b
  join public.siswa s on s.sekolah_id = v_sel and s.status = 'aktif'
  where b.sekolah_id = v_sel
    and b.tahun_ajaran_id = v_tahun
    and b.periode = 'bulanan'
    and (b.berlaku_rombel_id is null or exists (
          select 1 from public.rombel_siswa rs
          where rs.siswa_id = s.id and rs.rombel_id = b.berlaku_rombel_id
            and rs.tahun_ajaran_id = v_tahun))
    and not exists (
          select 1 from public.tagihan t
          where t.siswa_id = s.id and t.biaya_id = b.id and t.bulan = v_bulan)
  ;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- naik kelas semua siswa (tingkat 10/11 → naik; tingkat 12 → alumni)
create or replace function public.admin_naik_kelas() returns int
language plpgsql security definer set search_path = public as $$
declare
  v_sel bigint := public.current_sekolah_id();
  v_tahun_lama uuid;
  v_tahun_baru uuid;
  r record;
  v_new_rombel uuid;
  v_count int := 0;
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin';
  end if;
  select tahun_ajaran_aktif_id into v_tahun_lama from public.sekolah where id = v_sel;
  if v_tahun_lama is null then raise exception 'Tahun ajaran aktif belum di-set'; end if;

  -- tahun ajaran baru (akhir tahun lalu + 1) — buat kalau tidak ada
  v_tahun_baru := (
    select ta.id from public.tahun_ajaran ta
    where ta.sekolah_id = v_sel and ta.aktif = false
    order by ta.nama desc limit 1
  );
  if v_tahun_baru is null then raise exception 'Buat dulu tahun ajaran baru di tabel tahun_ajaran'; end if;

  for r in
    select * from public.rombel
    where sekolah_id = v_sel and tahun_ajaran_id = v_tahun_lama and aktif = true
  loop
    if r.tingkat = 12 then
      update public.siswa set status = 'alumni'
      where id in (select siswa_id from public.rombel_siswa where rombel_id = r.id);
      continue;
    end if;
    -- pikul rombel tingkat baru (nama romawi baru)
    insert into public.rombel (sekolah_id, tahun_ajaran_id, tingkat, jurusan_id, nama, wali_kelas_guru_id)
    values (v_sel, v_tahun_baru, r.tingkat + 1, r.jurusan_id,
            public.romawi(r.tingkat + 1) || substring(r.nama from position('-' in r.nama)),
            r.wali_kelas_guru_id)
    on conflict do nothing;
    select id into v_new_rombel from public.rombel
    where tahun_ajaran_id = v_tahun_baru and nama = public.romawi(r.tingkat + 1) ||
          substring(r.nama from position('-' in r.nama))
    limit 1;

    insert into public.rombel_siswa (rombel_id, siswa_id, tahun_ajaran_id)
    select v_new_rombel, rs.siswa_id, v_tahun_baru
    from public.rombel_siswa rs
    where rs.rombel_id = r.id
    on conflict do nothing;
    v_count := v_count + 1;
  end loop;

  -- set aktif flag: tahun lama mati, tahun baru aktif
  update public.tahun_ajaran set aktif = false where sekolah_id = v_sel;
  update public.tahun_ajaran set aktif = true where id = v_tahun_baru;
  update public.sekolah set tahun_ajaran_aktif_id = v_tahun_baru where id = v_sel;

  return v_count;
end $$;

create or replace function public.romawi (p integer) returns text
language sql immutable as $$
  select case p when 10 then 'X' when 11 then 'XI' when 12 then 'XII' else p::text end
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. INDEX
-- ─────────────────────────────────────────────────────────────────────

create index if not exists ix_absensi_siswa on public.absensi (siswa_id, tanggal);
create index if not exists ix_nilai_siswa on public.nilai (siswa_id, semester);
create index if not exists ix_tagihan_siswa on public.tagihan (siswa_id, status);
create index if not exists ix_pembayaran_tagihan on public.pembayaran (tagihan_id);
create index if not exists ix_rs_siswa on public.rombel_siswa (siswa_id);

-- =====================================================================
-- BOOTSTRAP (jalankan SEKALI, setelah migration di atas sukses):
--
-- 1) Dashboard → Authentication → Users → Add user
--    email: admin@sekolah.local  password: (bikin kuat, nanti diganti)
--
-- 2) Set peran admin + isi data sekolah (SQL editor):
--    update auth.users set raw_app_meta_data = '{"peran":"admin"}'::jsonb
--      where email = 'admin@sekolah.local';
--    insert into public.sekolah (nama, npsn) values ('SMA Contoh', '12345678');
--    insert into public.tahun_ajaran (sekolah_id, nama, aktif)
--      select id, '2026/2027', true from public.sekolah limit 1;
--    update public.sekolah set tahun_ajaran_aktif_id =
--      (select id from public.tahun_ajaran limit 1);
--    insert into public.akun (user_id, peran) select id, 'admin'
--      from auth.users where email = 'admin@sekolah.local';
--
-- 3) Set PIN admin (lewat UI nanti, atau direkt SQL:
--    update public.akun set pin_hash = crypt('123456', gen_salt('bf'))
--      where peran = 'admin';
-- =====================================================================