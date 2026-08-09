# -*- coding: utf-8 -*-
# E2E: buat akun guru via RPC -> login guru -> input absensi
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

# 1) login admin
st, d = jreq('POST', '/auth/v1/token?grant_type=password', {'email':'admin@sekolah.local','password':'adlok123'})
atok = d['access_token']
print('admin login:', st)

# 2) ambil guru1 + rombel X-Uji + mapel MTK + siswanya
st, guru = jreq('GET', '/rest/v1/guru?select=id,nama,nip', tok=atok)
g = guru[0]
st, rb = jreq('GET', '/rest/v1/rombel?select=id,nama', tok=atok)
rid = rb[0]['id']
st, mp = jreq('GET', '/rest/v1/mapel?select=id&kode=eq.MTK', tok=atok)
mid = mp[0]['id']
st, thn = jreq('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1', tok=atok)
tid = thn[0]['id']
st, rs = jreq('GET', '/rest/v1/rombel_siswa?select=siswa_id', tok=atok).__class__ and jreq('GET', '/rest/v1/rombel_siswa?select=siswa_id&rombel_id=eq.%s' % rid, tok=atok)
sids = [x['siswa_id'] for x in rs]
print('2. guru %s | rombel %s | mapel %s | siswa %d org' % (g['nip'], rb[0]['nama'], 'MTK', len(sids)))

# 3) buat akun login guru via RPC (kalau belum ada)
st, uid = jreq('POST', '/rest/v1/rpc/admin_buat_akun',
    {'p_email':'guru1@sekolah.local','p_password':'guru1234','p_peran':'guru','p_terkait_id':g['id']}, tok=atok)
print('3. RPC buat akun guru:', st, str(uid)[:40])
if st == 200 and isinstance(uid, str):
    jreq('PATCH', '/rest/v1/guru?id=eq.%s' % g['id'], {'user_id': uid}, tok=atok)

# 4) login sebagai guru
st, d2 = jreq('POST', '/auth/v1/token?grant_type=password', {'email':'guru1@sekolah.local','password':'guru1234'})
gtok = d2['access_token']
print('4. login guru:', st, 'peran:', d2['user']['app_metadata'])

# 5) guru baca rombel_siswa (RLS)
st, rs2 = jreq('GET', '/rest/v1/rombel_siswa?select=siswa_id&rombel_id=eq.%s' % rid, tok=gtok)
print('5. guru baca rombel_siswa:', st, len(rs2 or []), 'baris')

# 6) input absensi (upsert) — H untuk semua, 1 siswa S
today = '2026-08-10'
rows = [{'siswa_id': sid, 'rombel_id': rid, 'mapel_id': mid, 'tanggal': today, 'jam_ke': 1,
         'status': 'S' if i == 0 else 'H', 'guru_id': g['id']} for i, sid in enumerate(sids)]
st, ins = jreq('POST', '/rest/v1/absensi', rows, tok=gtok, prefer='return=representation')
print('6. insert absensi:', st, len(ins or []) if isinstance(ins, list) else str(ins)[:120])

# 7) baca ulang absensi (guru)
st, baca = jreq('GET', '/rest/v1/absensi?select=siswa_id,status&tanggal=eq.%s' % today, tok=gtok)
print('7. baca absensi guru:', st, json.dumps(baca)[:200])

# 8) admin cek absensi tanpa spesial rombel — seharusnya semua
st, baca2 = jreq('GET', '/rest/v1/absensi?select=status&tanggal=eq.%s' % today, tok=atok)
print('8. baca absensi admin:', st, json.dumps(baca2)[:200])
print('DONE')