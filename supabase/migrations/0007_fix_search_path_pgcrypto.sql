-- =====================================================================
-- SEKOLAH-SMA — 0007 FIX search_path pgcrypto
--
-- MASALAH: RPC security definer ditulis dgn "set search_path = public".
-- Di Supabase versi baru, ekstensi pgcrypto (crypt, gen_salt,
-- gen_random_uuid) dipasang di schema "extensions", BUKAN public.
-- Akibatnya isi fungsi error ketika dipanggil lewat API (jalur yang
-- dipakai aplikasi):
--   function gen_salt(unknown) does not exist
-- (Di SQL Editor tidak kelihatan karena guard admin menolak duluan,
--  jadi kelihatannya "Hanya admin ..." padahal aslinya beda.)
--
-- DIBAHAS: admin_buat_akun, admin_set_pin, cek_pin_admin
-- (3 fungsi yang pakai crypt/gen_salt di dalamnya).
--
-- CARA: buka SQL Editor -> paste SEMUA file ini -> Run
-- (create or replace = aman di-Run berulang; GRANT lama tetap berlaku)
-- =====================================================================

create or replace function public.cek_pin_admin(p_pin text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
begin
  if public.my_peran() <> 'admin' then return false; end if;
  select pin_hash into v_hash from public.akun where user_id = auth.uid();
  return v_hash is not null and crypt(p_pin, v_hash) = v_hash;
end $$;

create or replace function public.admin_set_pin(p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin';
  end if;
  update public.akun
    set pin_hash = crypt(p_pin, gen_salt('bf'))
  where user_id = auth.uid();
end $$;

create or replace function public.admin_buat_akun(
  p_email text,
  p_password text,
  p_peran text,
  p_terkait_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := gen_random_uuid();
begin
  if public.my_peran() <> 'admin' then
    raise exception 'Hanya admin yang bisa membuat akun';
  end if;

  -- 1) user auth (email confirm otomatis, peran di app_metadata)
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, is_sso_user, is_anonymous
  ) values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'peran', p_peran),
    '{}'::jsonb, now(), now(), '', '', '', '', false, false
  );

  -- 2) identity (wajib supaya bisa login email+password)
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, email,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', p_email),
    'email', p_email, now(), now(), now()
  );

  -- 3) baris peran di tabel akun
  insert into public.akun (user_id, peran, terkait_id)
  values (v_uid, p_peran, p_terkait_id);

  return v_uid;
end $$;

-- =====================================================================
-- VERIFIKASI (jalankan di SQL Editor SETELAH SUCCESS, pisah query baru):
--   1) cek nama fungsi — harus ada tiga nama:
--        select proname from pg_proc where proname in
--          ('admin_buat_akun','admin_set_pin','cek_pin_admin');
--   2) uji RPC dengan JWT admin PALSU (agar guard admin lolos):
--      select set_config('request.jwt.claims',
--            json_build_object('sub', (select id from auth.users
--               where email='admin@sekolah.local'),
--              'app_metadata', json_build_object('peran','admin'))::text, false);
--      select public.admin_buat_akun('uji-fix@sekolah.local','abc12345','siswa');
--      -- harus BALIK satu UUID, BUKAN error
--   3) lalu hapus user percobaan (ganti UUID hasil tadi):
--      delete from auth.users where id = 'UUID_HASIL_TADI';
-- =====================================================================