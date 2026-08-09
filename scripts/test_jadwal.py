# -*- coding: utf-8 -*-
# E2E fase 1.5: verifikasi UNIQUE jadwal (0009) + simpan/update slot via upsert
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

def ups_jadwal(row, tok):
    """persis supabase-js upsert: on_conflict=rombel_id,hari,jam_mulai"""
    return jreq('POST', '/rest/v1/jadwal?on_conflict=rombel_id,hari,jam_mulai',
                row, tok=tok, prefer='resolution=merge-duplicates,return=representation')

# 1) login admin + guru
st, d = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'admin@sekolah.local', 'password': 'adlok123'})
atok = d['access_token']
st, d2 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'guru1@sekolah.local', 'password': 'guru1234'})
gtok = d2['access_token']
print('1. login admin:', st, '| guru:', st)

# 2) konteks: rombel uji, mapel, guru, tahun aktif, sekolah_id
st, rb = jreq('GET', '/rest/v1/rombel?select=id,nama&limit=2', tok=atok)
rid = rb[0]['id']
rid2 = rb[1]['id'] if len(rb) > 1 else None
st, mp = jreq('GET', '/rest/v1/mapel?select=id,kode&limit=2', tok=atok)
mid1, mid2 = mp[0]['id'], mp[1]['id']
st, gr = jreq('GET', '/rest/v1/guru?select=id,nama&limit=2', tok=atok)
gid1, gid2 = gr[0]['id'], gr[1]['id']
st, thn = jreq('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1', tok=atok)
tid = thn[0]['id']
st, sek = jreq('GET', '/rest/v1/sekolah?select=id&limit=1', tok=atok)
school = sek[0]['id']
print('2. rombel %s (+%s) | mapel %s,%s | guru %s,%s | tahun %s' % (rid[:8], (rid2 or '-')[:8], mid1[:8], mid2[:8], gid1[:8], gid2[:8], tid[:8]))

# 3) cek dulu apakah constraint 0009 sudah ada (upsert senin 07:00)
row = {'sekolah_id': school, 'rombel_id': rid, 'mapel_id': mid1, 'guru_id': gid1,
       'hari': 1, 'jam_mulai': '07:00', 'jam_selesai': '07:45', 'ruang': 'R-1', 'tahun_ajaran_id': tid}
st3, r3 = ups_jadwal(row, atok)
if st3 == 400 and ('ON CONFLICT' in str(r3) or 'matching' in str(r3)):
    print('!! PRASYARAT: constraint 0009 belum terpasang — PASTE dulu sekolah-sma_0009_JADWAL_UNIQUE.sql')
    raise SystemExit(1)
print('3. upsert slot Senin 07:00:', st3, '=>', str(r3)[:100])

# 4) upsert kedua: ganti mapel di slot sama (harus UPDATE, bukan dobel)
row2 = dict(row, mapel_id=mid2, ruang='R-2')
st4, r4 = ups_jadwal(row2, atok)
print('4. upsert ulang slot sama (ubah mapel):', st4, '=>', str(r4)[:100])

# 5) TANTANGAN UNIQUE rombel: INSERT langsung Senin 07:00 (tanpa on_conflict) — harus 409/23505
st5, r5 = jreq('POST', '/rest/v1/jadwal', dict(row, mapel_id=mid1, guru_id=gid2), tok=atok, prefer='return=representation')
print('5. insert slot dobel rombel (harus 409/23505):', st5, str(r5)[:130])

# 6) TANTANGAN bentrok guru: INSERT rombel ke-2 di hari+jam sama dgn guru gid1 — harus 409/23505 ux_jadwal_guru
if rid2:
    st6, r6 = jreq('POST', '/rest/v1/jadwal', {'sekolah_id': school, 'rombel_id': rid2, 'mapel_id': mid1, 'guru_id': gid1,
                          'hari': 1, 'jam_mulai': '07:00', 'jam_selesai': '07:45', 'ruang': 'R-9', 'tahun_ajaran_id': tid}, tok=atok, prefer='return=representation')
    print('6. guru bentrok di jam sama rombel lain (harus 409/23505):', st6, str(r6)[:130])
else:
    print('6. SKIP (butuh rombel kedua untuk uji bentrok guru)')

# 7) guru login hanya BISA BACA (RLS read-only) — insert harus 403
st7, r7 = jreq('POST', '/rest/v1/jadwal', dict(row, hari=3, ruang='R-X'), tok=gtok, prefer='return=representation')
print('7. guru coba tulis jadwal (harus 403):', st7, str(r7)[:100])

# 8) baca jadwal rombel (admin) — harus 1 baris (Senin 07:00, mapel mid2, ruang R-2)
st8, all = jreq('GET', '/rest/v1/jadwal?select=id,hari,jam_mulai,mapel_id,ruang&rombel_id=eq.%s&tahun_ajaran_id=eq.%s' % (rid, tid), tok=atok)
print('8. baca jadwal:', st8, json.dumps(all)[:220])

# 9) bersihkan baris uji (ruang tes) dari kedua rombel
ruang_tes = ['R-1', 'R-2', 'R-9', 'R-X', 'R-3']
for ridx in [rid, rid2]:
    if not ridx: continue
    st8b, rows = jreq('GET', '/rest/v1/jadwal?select=id,ruang&rombel_id=eq.%s&tahun_ajaran_id=eq.%s' % (ridx, tid), tok=atok)
    if isinstance(rows, list):
        for x in rows:
            if x.get('ruang') in ruang_tes:
                st9, _ = jreq('DELETE', '/rest/v1/jadwal?id=eq.%s' % x['id'], tok=atok)
                print('9. hapus slot uji (ruang %s):' % x['ruang'], st9)
print('DONE')