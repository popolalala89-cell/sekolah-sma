-- =====================================================================
-- SEKOLAH-SMA — 0006 FIX RPC admin_buat_akun
--
-- Masalah: fungsi auth.admin_create_user(jsonb) TIDAK ADA di versi
-- Supabase project ini (API berubah), jadi RPC selalu gagal 42883.
-- Ganti dengan insert langsung ke auth.users + auth.identities,
-- pola yang stabil di semua versi Supabase.
--
-- CARA: buka SQL Editor -> paste file ini -> Run
-- (create or replace = aman di-Run berulang; GRANT yang lama tetap berlaku)
-- =====================================================================

create or replace function public.admin_buat_akun(
  p_email text,
  p_password text,
  p_peran text,
  p_terkait_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
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
-- VERIFIKASI — jalankan baris ini di SQL Editor:
--   select public.admin_buat_akun('uji-fix@sekolah.local','abc12345','siswa');
--   -- harus return satu uuid
--   select email, raw_app_meta_data->>'peran' from auth.users
--     where email = 'uji-fix@sekolah.local';
--   -- lalu HAPUS user percobaan: row auth.users delete where email=...
-- =====================================================================