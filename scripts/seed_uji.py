import re, urllib.request, json, urllib.error
env = open('.env.local').read()
url = re.search(r'VITE_SUPABASE_URL\s*=\s*([^\n]+)', env).group(1).strip()
key = re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\n]+)', env).group(1).strip()
req = urllib.request.Request(url + '/auth/v1/token?grant_type=password', method='POST',
    headers={'apikey': key, 'Content-Type': 'application/json'},
    data=json.dumps({'email':'admin@sekolah.local','password':'adlok123'}).encode())
tok = json.loads(urllib.request.urlopen(req, timeout=15).read().decode())['access_token']
H = {'apikey': key, 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}
def req(method, path, body=None):
    r = urllib.request.Request(url + path, method=method, headers=H, data=json.dumps(body).encode() if body else None)
    try:
        resp = urllib.request.urlopen(r, timeout=15)
        raw = resp.read().decode()
        return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]

st, skl = req('GET', '/rest/v1/sekolah?select=id&limit=1')
st, thn = req('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1')
skid = skl[0]['id']; thnid = thn[0]['id']
print('sekolah', skid, 'tahun', thnid)

st, guru = req('POST', '/rest/v1/guru', {'sekolah_id': skid, 'nama': 'Ahmad Guru Uji', 'nip': 'GU-01', 'mapel_utama': 'MTK', 'aktif': True})
print('guru1', st, guru if isinstance(guru, str) else 'ok')
st, guru2 = req('POST', '/rest/v1/guru', {'sekolah_id': skid, 'nama': 'Siti Guru Uji', 'nip': 'GU-02', 'mapel_utama': 'BIN', 'aktif': True})
print('guru2', st, guru2 if isinstance(guru2, str) else 'ok')
st, rb1 = req('POST', '/rest/v1/rombel', {'sekolah_id': skid, 'tahun_ajaran_id': thnid, 'tingkat': 10, 'nama': 'X-Uji', 'aktif': True})
print('rombel1', st, json.dumps(rb1)[:100] if not isinstance(rb1, str) else rb1)
st, rb2 = req('POST', '/rest/v1/rombel', {'sekolah_id': skid, 'tahun_ajaran_id': thnid, 'tingkat': 11, 'nama': 'XI-Uji', 'aktif': True})
print('rombel2', st, json.dumps(rb2)[:100] if not isinstance(rb2, str) else rb2)