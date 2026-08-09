# -*- coding: utf-8 -*-
# E2E fase 1.6: biaya CRUD + RPC generate tagihan bulanan + pembayaran (lunas/partial/batal)
# Bulan uji: 2031-02 (aman, jauh dari data asli; tagihan bulan itu di-cleanup semua di akhir)
import re, urllib.request, json, urllib.error
env = open('.env.local').read()
url = re.search(r'VITE_SUPABASE_URL\s*=\s*([^\n]+)', env).group(1).strip()
key = re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\n]+)', env).group(1).strip()
BULAN = '2031-02-01'
NAMA_UJI = 'UJI-E2E-SPP'

def jreq(method, path, body=None, tok=None, prefer=None):
    h = {'apikey': key, 'Content-Type': 'application/json'}
    if tok: h['Authorization'] = 'Bearer ' + tok
    if prefer: h['Prefer'] = prefer
    r = urllib.request.Request(url + path, method=method, headers=h, data=json.dumps(body).encode() if body else None)
    try:
        resp = urllib.request.urlopen(r, timeout=20)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]

# 1) login admin + guru
st, d = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'admin@sekolah.local', 'password': 'adlok123'})
atok = d['access_token']
st, d2 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'guru1@sekolah.local', 'password': 'guru1234'})
gtok = d2['access_token']
print('1. login admin:', st, '| guru:', st)

# 2) konteks: tahun aktif, sekolah, jumlah biaya existing
st, thn = jreq('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1', tok=atok)
tid = thn[0]['id']
st, sek = jreq('GET', '/rest/v1/sekolah?select=id', tok=atok)
school = sek[0]['id']
st, byk = jreq('GET', '/rest/v1/biaya?select=id', tok=atok)
print('2. tahun %s | sekolah %s | biaya eksisting: %d' % (tid[:8], school, len(byk) if isinstance(byk, list) else -1))

# 3) bersihkan sisa uji lama (kalau ada run sebelumnya gagal)
st3, old_tg = jreq('GET', '/rest/v1/tagihan?select=id&bulan=eq.%s' % BULAN, tok=atok)
if isinstance(old_tg, list):
    for t in old_tg:
        stp, _ = jreq('DELETE', '/rest/v1/pembayaran?tagihan_id=eq.%s' % t['id'], tok=atok)
        jreq('DELETE', '/rest/v1/tagihan?id=eq.%s' % t['id'], tok=atok)
    print('3. cleanup sisa uji lama: %d tagihan' % len(old_tg))
st3b, old_b = jreq('GET', '/rest/v1/biaya?select=id&nama=eq.%s' % NAMA_UJI, tok=atok)
if isinstance(old_b, list):
    for b in old_b: jreq('DELETE', '/rest/v1/biaya?id=eq.%s' % b['id'], tok=atok)
    print('3b. hapus biaya uji lama: %d' % len(old_b))

# 4) buat biaya uji (admin) — harus 201
st4, b = jreq('POST', '/rest/v1/biaya?select=id,nama,nominal',
              {'nama': NAMA_UJI, 'nominal': 123456, 'periode': 'bulanan', 'tahun_ajaran_id': tid},
              tok=atok, prefer='return=representation')
if st4 == 201:
    bid = b[0]['id']
    print('4. buat biaya uji:', st4, bid[:8])
else:
    print('4. GAGAL buat biaya:', st4, str(b)[:200])
    raise SystemExit(1)

# 5) RLS: guru mencoba buat biaya — harus 403
st5, r5 = jreq('POST', '/rest/v1/biaya', {'nama': 'X', 'nominal': 1, 'periode': 'bulanan', 'tahun_ajaran_id': tid}, tok=gtok)
print('5. guru coba buat biaya (harus 403):', st5)

# 6) RPC generate tagihan bulan 2031-02
st6, n = jreq('POST', '/rest/v1/rpc/admin_generate_tagihan_bulanan', {'p_bulan': BULAN}, tok=atok)
print('6. generate tagihan:', st6, '=> jumlah baru:', n)
if st6 != 200:
    print('!! GAGAL RPC:', str(n)[:300])
    raise SystemExit(1)

# 7) baca tagihan bulan itu — harus ada punya biaya uji
st7, tg = jreq('GET', '/rest/v1/tagihan?select=id,siswa_id,biaya_id,nominal,status,jatuh_tempo&bulan=eq.%s' % BULAN, tok=atok)
uji = [t for t in tg if t['biaya_id'] == bid] if isinstance(tg, list) else []
print('7. tagihan bulan %s: %d total, %d punya biaya uji' % (BULAN, len(tg) if isinstance(tg, list) else -1, len(uji)))
if not uji:
    print('!! Tidak ada tagihan uji — siswa aktif kosong?')
    raise SystemExit(1)

# 8) bayar PENUH 1 tagihan uji → status harus lunas (trigger 0010)
def cleanup_bulan():
    stx, tgx = jreq('GET', '/rest/v1/tagihan?select=id&bulan=eq.%s' % BULAN, tok=atok)
    if isinstance(tgx, list):
        for t in tgx:
            jreq('DELETE', '/rest/v1/pembayaran?tagihan_id=eq.%s' % t['id'], tok=atok)
            jreq('DELETE', '/rest/v1/tagihan?id=eq.%s' % t['id'], tok=atok)
    jreq('DELETE', '/rest/v1/biaya?id=eq.%s' % bid, tok=atok)

t1 = uji[0]
st8, p1 = jreq('POST', '/rest/v1/pembayaran?select=id',
               {'siswa_id': t1['siswa_id'], 'tagihan_id': t1['id'], 'nominal': int(t1['nominal']),
                'tanggal': '2031-02-05', 'metode': 'transfer', 'no_ref': 'TRX-001'},
               tok=atok, prefer='return=representation')
st8b, t1b = jreq('GET', '/rest/v1/tagihan?select=status&id=eq.%s' % t1['id'], tok=atok)
st1 = t1b[0]['status'] if isinstance(t1b, list) else '?'
print('8. bayar penuh:', st8, '=> status tagihan:', st1)
if st1 != 'lunas':
    cleanup_bulan()
    print('!! PRASYARAT: trigger 0010 belum terpasang — PASTE sekolah-sma_0010_SYNC_STATUS_TAGIHAN.sql')
    raise SystemExit(1)

# 9) bayar SEBAGIAN tagihan uji ke-2 → tetap belum; lunasi sisanya → lunas
t2 = uji[1]
setengah = int(t2['nominal']) // 2
st9, _ = jreq('POST', '/rest/v1/pembayaran',
              {'siswa_id': t2['siswa_id'], 'tagihan_id': t2['id'], 'nominal': setengah,
               'tanggal': '2031-02-06', 'metode': 'tunai'}, tok=atok)
st9b, t2b = jreq('GET', '/rest/v1/tagihan?select=status&id=eq.%s' % t2['id'], tok=atok)
sisa = int(t2['nominal']) - setengah
st9c, _ = jreq('POST', '/rest/v1/pembayaran',
               {'siswa_id': t2['siswa_id'], 'tagihan_id': t2['id'], 'nominal': sisa,
                'tanggal': '2031-02-07', 'metode': 'tunai'}, tok=atok)
st9d, t2d = jreq('GET', '/rest/v1/tagihan?select=status&id=eq.%s' % t2['id'], tok=atok)
s2a = t2b[0]['status'] if isinstance(t2b, list) else '?'
s2b = t2d[0]['status'] if isinstance(t2d, list) else '?'
print('9. bayar sebagian:', st9b, '=>', s2a, '| bayar sisa:', st9d, '=>', s2b)
if s2a != 'belum' or s2b != 'lunas':
    cleanup_bulan()
    print('!! GAGAL: partial/lunasi tidak sesuai (', s2a, '/', s2b, ')')
    raise SystemExit(1)

# 10) batalkan pembayaran tagihan t2 (hapus 2 baris) → kembali belum
st10, pay2 = jreq('GET', '/rest/v1/pembayaran?select=id&tagihan_id=eq.%s' % t2['id'], tok=atok)
for p in pay2:
    jreq('DELETE', '/rest/v1/pembayaran?id=eq.%s' % p['id'], tok=atok)
st10b, t2e = jreq('GET', '/rest/v1/tagihan?select=status&id=eq.%s' % t2['id'], tok=atok)
s10 = t2e[0]['status'] if isinstance(t2e, list) else '?'
print('10. batalkan pembayaran:', st10b, '=> status:', s10)
if s10 != 'belum':
    cleanup_bulan()
    print('!! GAGAL: status tidak kembali belum:', s10)
    raise SystemExit(1)

# 11) CLEANUP: hapus semua tagihan bulan uji + pembayarannya + biaya uji
cleanup_bulan()
print('11. cleanup selesai (tagihan bulan uji + biaya uji)')
print('DONE')