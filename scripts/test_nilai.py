# -*- coding: utf-8 -*-
# E2E fase 1.4: verifikasi UNIQUE nilai (0008) + simpan/update nilai via upsert
import re, urllib.request, json, urllib.error
env = open('.env.local').read()
url = re.search(r'VITE_SUPABASE_URL\s*=\s*([^\n]+)', env).group(1).strip()
key = re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\n]+)', env).group(1).strip()

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

def upsiswa(rows, tok):
    """persis supabase-js upsert: on_conflict + resolution=merge-duplicates"""
    return jreq('POST', '/rest/v1/nilai?on_conflict=siswa_id,mapel_id,semester,jenis',
                rows, tok=tok, prefer='resolution=merge-duplicates,return=representation')

# 1) login admin + guru
st, d = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'admin@sekolah.local', 'password': 'adlok123'})
atok = d['access_token']
st, d2 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'guru1@sekolah.local', 'password': 'guru1234'})
gtok = d2['access_token']
print('1. login admin:', st, '| guru:', st, 'peran:', d2['user']['app_metadata'].get('peran'))

# 2) ambil konteks: rombel, mapel MTK, tahun aktif, siswa+gurunya
st, guru = jreq('GET', '/rest/v1/guru?select=id,nama&limit=1', tok=atok)
g = guru[0]
st, rb = jreq('GET', '/rest/v1/rombel?select=id,nama&limit=1', tok=atok)
rid = rb[0]['id']
st, mp = jreq('GET', '/rest/v1/mapel?select=id,kode&kode=eq.MTK', tok=atok)
mid = mp[0]['id']
st, thn = jreq('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1', tok=atok)
tid = thn[0]['id']
st, rs = jreq('GET', '/rest/v1/rombel_siswa?select=siswa_id,siswa:siswa_id(sekolah_id)&rombel_id=eq.%s' % rid, tok=atok)
sids = [x['siswa_id'] for x in rs]
sek = rs[0]['siswa']['sekolah_id']
print('2. guru %s | rombel %s | mapel %s | siswa %d org | sekolah %s' % (g['id'][:8], rb[0]['nama'], mid[:8], len(sids), sek))

JENIS, SEM = 'tugas', 1

# 3) UPSERT PERTAMA: semua siswa dapat nilai (rapor semula)
rows1 = [{'siswa_id': s, 'sekolah_id': sek, 'mapel_id': mid, 'rombel_id': rid, 'guru_id': g['id'],
          'jenis': JENIS, 'nilai': 80 + i, 'semester': SEM, 'tahun_ajaran_id': tid}
         for i, s in enumerate(sids)]
st, up = upsiswa(rows1, gtok)
print('3. upsert nilai (pertama):', st, 'tertulis', len(up or []) if isinstance(up, list) else str(up)[:120])

# 4) UPSERT KEDUA: nilai berubah (80 -> 90 untuk 2 siswa) — harus UPDATE, bukan dobel
rows2 = [{'siswa_id': s['siswa_id'], 'sekolah_id': sek, 'mapel_id': mid, 'rombel_id': rid, 'guru_id': g['id'],
          'jenis': JENIS, 'nilai': 90, 'semester': SEM, 'tahun_ajaran_id': tid}
         for s in rs[:2]]  # cuma 2 siswa di-update
st, up2 = upsiswa(rows2, gtok)
print('4. upsert kedua (update 2 siswa):', st, '=>', len(up2 or []) if isinstance(up2, list) else str(up2)[:120])

# 5) TANTANGAN UNIQUE: insert baris DUPLIKAT tanpa on_conflict — harus 23505 kalau 0008 aktif
dup = [{'siswa_id': sids[0], 'sekolah_id': sek, 'mapel_id': mid, 'rombel_id': rid, 'guru_id': g['id'],
        'jenis': JENIS, 'nilai': 10, 'semester': SEM, 'tahun_ajaran_id': tid}]
st5, r5 = jreq('POST', '/rest/v1/nilai', dup, tok=gtok, prefer='return=representation')
print('5. insert duplikat (harus 409/23505):', st5, str(r5)[:140])

# 6) baca total per kombinasi — harus JUMLAH SISWA baris, bukan 2x lipat
st, tot = jreq('GET', '/rest/v1/nilai?select=siswa_id,nilai&mapel_id=eq.%s&jenis=eq.%s&semester=eq.%d' % (mid, JENIS, SEM), tok=atok)
uniq = len(tot or [])
besar = len(sids)
print('6. baris nilai di DB:', uniq, '| siswa:', len(sids), '| TIDAK DOBEL:', uniq <= len(sids))

# 7) rekap manual: rata-rata kelas utk tugas
avg = round(sum(x['nilai'] for x in tot) / len(tot), 2) if tot else 0
print('7. rata2 kelas:', avg, '| contoh:', json.dumps(tot[:2]))
print('DONE')