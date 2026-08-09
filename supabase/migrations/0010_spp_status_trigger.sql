-- 0010: trigger sinkron status tagihan ← pembayaran (fase 1.6 SPP)
-- Setiap insert/hapus pembayaran otomatis menghitung ulang status tagihan
-- (lunas jika total terbayar >= nominal, selain itu belum).
-- Dipakai aplikasi supaya status konsisten apa pun jalur inputnya.

create or replace function public.sync_status_tagihan() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_nominal numeric;
  v_total numeric;
begin
  v_id := coalesce(new.tagihan_id, old.tagihan_id);
  select nominal into v_nominal from public.tagihan where id = v_id;
  select coalesce(sum(nominal), 0) into v_total
    from public.pembayaran where tagihan_id = v_id;
  update public.tagihan
     set status = case when v_total >= v_nominal then 'lunas' else 'belum' end
   where id = v_id;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sync_status_tagihan on public.pembayaran;
create trigger trg_sync_status_tagihan
  after insert or delete on public.pembayaran
  for each row execute function public.sync_status_tagihan();