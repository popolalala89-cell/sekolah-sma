-- =====================================================================
-- SEKOLAH-SMA — 0003_rpc_grants.sql
-- GRANT execute untuk semua fungsi RPC yang dipanggil dari client.
-- Supabase TIDAK otomatis grant fungsi ke role authenticated/anon.
-- Tanpa ini, admin_buat_akun dkk akan error "permission denied for function".
-- =====================================================================

grant execute on function public.current_sekolah_id() to anon, authenticated;
grant execute on function public.my_peran() to anon, authenticated;
grant execute on function public.siswa_ids_for_wali() to anon, authenticated;

grant execute on function public.admin_buat_akun(text, text, text, uuid) to authenticated;
grant execute on function public.admin_set_pin(text) to authenticated;
grant execute on function public.cek_pin_admin(text) to authenticated;
grant execute on function public.admin_generate_tagihan_bulanan(date) to authenticated;
grant execute on function public.admin_naik_kelas() to authenticated;

-- =====================================================================
-- VERIFIKASI — jalankan query ini terpisah, harusnya semua = "GRANT":
--   select grantee, privilege_type from information_schema.role_routine_grants
--   where routine_name in ('admin_buat_akun','my_peran','cek_pin_admin')
--   order by routine_name, grantee;
-- =====================================================================
