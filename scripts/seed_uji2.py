# -*- coding: utf-8 -*-
# Lanjutan seed: siswa + rombel_siswa + wali kelas
import re, urllib.request, json, urllib.error
env = open('.env.local').read()
url = re.search(r'VITE_SUPABASE_URL\s*=\s*([^\n]+)', env).group(1).strip()
key = re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\n]+)', env).group(1).strip()
req = urllib.request.Request(url + '/auth/v1/token?grant_type=password', method='POST',
    headers={'apikey': key, 'Content-Type': 'application/json'},
    data=json.dumps({'email':'admin@sekolah.local','password':'adlok123'}).encode())
tok = json.loads(urllib.request.urlopen(req, timeout=15).read().decode())['access_token']
H = {'apikey': key, 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}
def req(method, path, body=None, prefer=None):
    h = dict(H)
    if prefer:
        h['Prefer'] = prefer
    r = urllib.request.Request(url + path, method=method, headers=h, data=json.dumps(body).encode() if body else None)
    try:
        resp = urllib.request.urlopen(r, timeout=15)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

st, skl = req('GET', '/rest/v1/sekolah?select=id&limit=1')
skid = skl[0]['id']
st, thn = req('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1')
thnid = thn[0]['id']
st, guru = req('GET', '/rest/v1/guru?select=id,nama')
st, rb = req('GET', '/rest/v1/rombel?select=id,nama')
g1 = guru[0]['id']; rb1 = rb[0]['id']; rb2 = rb[1]['id']
print('guru ids', g1, '| rombel', rb1, rb2)

# 6 siswa uji
nisn = 1000000000
siswa = []
for i in range(1, 7):
    nisn += 1
    s = {'sekolah_id': skid, 'nisn': str(nisn), 'nama': 'Siswa Uji %d' % i,
         'gender': 'L' if i % 2 else 'P', 'status': 'aktif', 'angkatan': 2026}
    st, d = req('POST', '/rest/v1/siswa', s, prefer='return=representation')
    if st == 201:
        siswa.append(d[0]['id'])
    else:
        print('siswa %d err' % i, st, d)
print('siswa inserted:', len(siswa))

# rombel_siswa: 1-3 di X-Uji, 4-6 di XI-Uji
for i, sid in enumerate(siswa):
    rid = rb1 if i < 3 else rb2
    st, d = req('POST', '/rest/v1/rombel_siswa', {'rombel_id': rid, 'siswa_id': sid, 'tahun_ajaran_id': thnid})
    if st != 201:
        print('rs err', st, d)

# wali kelas: guru1 -> X-Uji, guru2 -> XI-Uji
st, d = req('PATCH', '/rest/v1/rombel?id=eq.' + rb1, {'wali_kelas_guru_id': g1})
print('wali kelas rb1', st)
st, d = req('PATCH', '/rest/v1/rombel?id=eq.' + rb2, {'wali_kelas_guru_id': guru[1]['id']})
print('wali kelas rb2', st)

print('DONE')