# -*- coding: utf-8 -*-
# E2E fase 1.7: halaman wali/siswa — RLS baca rapor anak (wali), rapor diri (siswa),
# tagihan anak/diri, dan write-deny (wali coba tulis nilai -> 403).
# Strategi: reuse siswa uji "X-Uji" (kalau ada, biarkan nilainya) + wali uji sekali-buat.
# Cleanup: tagihan/biaya/nilai/relasi wali uji dihapus; akun auth orphan dibiarkan (pola lama).
import re, urllib.request, json, urllib.error, time

env = open('.env.local').read()
url = re.search(r'VITE_SUPABASE_URL\s*=\s*([^\n]+)', env).group(1).strip()
key = re.search(r'VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*([^\n]+)', env).group(1).strip()
BULAN = '2031-03-01'
NAMA_WALI = 'UJI-E2E-WALI'
NAMA_BIAYA = 'UJI-E2E-TAGIHAN'

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

FAIL = []
def cek(nomor, nama, ok, info=''):
    mark = 'OK ' if ok else '!! '
    print('%s%s. %s%s' % (mark, nomor, nama, (' — ' + str(info)) if info else ''))
    if not ok: FAIL.append('%s. %s' % (nomor, nama))

# 1) login admin + guru
st, d = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'admin@sekolah.local', 'password': 'adlok123'})
if st != 200:
    print('1. GAGAL login admin:', st, d); raise SystemExit(1)
atok = d['access_token']
st, d2 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': 'guru1@sekolah.local', 'password': 'guru1234'})
gtok = d2['access_token'] if st == 200 else None
print('1. login admin:', st, '| guru:', st)

# 2) konteks
st, thn = jreq('GET', '/rest/v1/tahun_ajaran?select=id&aktif=eq.true&limit=1', tok=atok)
tid = thn[0]['id']
st, mp = jreq('GET', '/rest/v1/mapel?select=id,kode&limit=1', tok=atok)
mid = mp[0]['id'] if isinstance(mp, list) and mp else None
print('2. tahun %s | mapel %s' % (tid[:8], (mid or '-')[:8]))

# 3) siswa uji: reuse X-Uji kalau ada, kalau tidak buat baru
st, lst = jreq('GET', '/rest/v1/siswa?select=id,nama,nisn&nama=like.*X-Uji*', tok=atok)
siswa = None
if isinstance(lst, list) and lst:
    siswa = lst[0]
    print('3. reuse siswa uji:', siswa['id'][:8], siswa['nama'])
else:
    st, s = jreq('POST', '/rest/v1/siswa?select=id,nama,nisn',
                 {'nama': 'X-Uji WaliSiswa', 'nisn': '0099%d' % (int(time.time()) % 1000000), 'status': 'aktif'},
                 tok=atok, prefer='return=representation')
    siswa = s[0] if st == 201 else None
    print('3. buat siswa uji baru:', st, (siswa or {}).get('id', '')[:8])
if not siswa:
    print('!! siswa uji tidak tersedia'); raise SystemExit(1)
sid = siswa['id']

# 4) wali uji: sekali buat (nama unik); login kalau sudah punya akun
st, wl = jreq('GET', '/rest/v1/wali_murid?select=id,nama,user_id&nama=eq.%s' % NAMA_WALI, tok=atok)
wali = wl[0] if isinstance(wl, list) and wl else None
wife = 'wali-uji@sekolah.local'
if not wali:
    st, w = jreq('POST', '/rest/v1/wali_murid?select=id', {'nama': NAMA_WALI, 'telepon': None}, tok=atok, prefer='return=representation')
    wali = w[0] if st == 201 else None
    print('4. buat wali uji:', st)
    st, _ = jreq('POST', '/rest/v1/rpc/admin_buat_akun', {'p_email': wife, 'p_password': 'wali1234', 'p_peran': 'wali', 'p_terkait_id': wali['id']}, tok=atok)
    print('   buat akun wali:', st)
wid = wali['id']
# pastikan wali_murid.user_id terisi (di aplikasi frontend mengisi setelah RPC; RLS & siswa_ids_for_wali butuh kolom ini)
st, auw = jreq('GET', '/rest/v1/akun?select=user_id&terkait_id=eq.%s' % wid, tok=atok)
if isinstance(auw, list) and auw and auw[0].get('user_id'):
    jreq('PATCH', '/rest/v1/wali_murid?id=eq.%s' % wid, {'user_id': auw[0]['user_id']}, tok=atok)
    print('4. user_id wali di-set')
else:
    st, _ = jreq('POST', '/rest/v1/rpc/admin_buat_akun', {'p_email': wife, 'p_password': 'wali1234', 'p_peran': 'wali', 'p_terkait_id': wid}, tok=atok)
    st, auw = jreq('GET', '/rest/v1/akun?select=user_id&terkait_id=eq.%s' % wid, tok=atok)
    if isinstance(auw, list) and auw and auw[0].get('user_id'):
        jreq('PATCH', '/rest/v1/wali_murid?id=eq.%s' % wid, {'user_id': auw[0]['user_id']}, tok=atok)
        print('4. buat akun wali uji:', st, '+ user_id di-set')

# 5) link wali -> siswa (pastikan ada)
st, rel = jreq('GET', '/rest/v1/wali_siswa?select=wali_murid_id,siswa_id&wali_murid_id=eq.%s&siswa_id=eq.%s' % (wid, sid), tok=atok)
if not (isinstance(rel, list) and rel):
    st, _ = jreq('POST', '/rest/v1/wali_siswa?select=wali_murid_id', {'wali_murid_id': wid, 'siswa_id': sid}, tok=atok)
    print('5. link wali->siswa:', st)
else:
    print('5. relasi wali->siswa sudah ada')

# 6) siswa uji perlu akun (biar bisa tes login siswa) — buat kalau belum
six = 'siswa-uji@sekolah.local'
st, d3 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': six, 'password': 'siswa1234'})
if st != 200:
    st, _ = jreq('POST', '/rest/v1/rpc/admin_buat_akun', {'p_email': six, 'p_password': 'siswa1234', 'p_peran': 'siswa', 'p_terkait_id': sid}, tok=atok)
    print('6. buat akun siswa uji:', st)
    st, d3 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': six, 'password': 'siswa1234'})
stok = d3['access_token'] if st == 200 else None
print('6. login siswa uji:', st if stok else -1)
# pastikan user_id siswa terisi (untuk policy siswa "user_id = auth.uid()")
st, au = jreq('GET', '/rest/v1/akun?select=user_id&terkait_id=eq.%s' % sid, tok=atok)
if isinstance(au, list) and au and au[0].get('user_id'):
    jreq('PATCH', '/rest/v1/siswa?id=eq.%s' % sid, {'user_id': au[0]['user_id']}, tok=atok)
    print('   user_id siswa di-set')

# 7) nilai uji: buat 1 baris (guru) utk siswa uji — semester 1 tahun aktif
st, nval = jreq('GET', '/rest/v1/nilai?select=id&siswa_id=eq.%s&mapel_id=eq.%s&jenis=eq.tugas&semester=eq.1' % (sid, mid), tok=atok)
nilai_id = None
if gtok and mid:
    if isinstance(nval, list) and nval:
        nilai_id = nval[0]['id']
        print('7. nilai tugas siswa uji sudah ada')
    else:
        st, nr = jreq('POST', '/rest/v1/nilai?select=id', {'siswa_id': sid, 'mapel_id': mid, 'nilai': 88,
                     'rombel_id': None, 'guru_id': None, 'jenis': 'tugas', 'semester': 1, 'tahun_ajaran_id': tid},
                     tok=gtok, prefer='return=representation')
        if st == 201: nilai_id = nr[0]['id']
        print('7. buat nilai uji:', st)
else:
    print('7. skip nilai (guru/mapel tidak tersedia)')

# 8) tagihan uji: biaya + 1 tagihan siswa uji (bulan 2031-03)
st, bb = jreq('GET', '/rest/v1/biaya?select=id&nama=eq.%s' % NAMA_BIAYA, tok=atok)
if isinstance(bb, list) and bb:
    biaya_id = bb[0]['id']
else:
    st, b = jreq('POST', '/rest/v1/biaya?select=id', {'nama': NAMA_BIAYA, 'nominal': 555000, 'periode': 'bulanan', 'tahun_ajaran_id': tid}, tok=atok, prefer='return=representation')
    biaya_id = b[0]['id'] if st == 201 else None
tgh_id = None
if biaya_id:
    st, t = jreq('GET', '/rest/v1/tagihan?select=id&siswa_id=eq.%s&biaya_id=eq.%s&bulan=eq.%s' % (sid, biaya_id, BULAN), tok=atok)
    if isinstance(t, list) and t:
        tgh_id = t[0]['id']
    else:
        st, t = jreq('POST', '/rest/v1/tagihan?select=id', {'siswa_id': sid, 'biaya_id': biaya_id, 'bulan': BULAN,
                     'nominal': 555000, 'status': 'belum', 'jatuh_tempo': '2031-03-10', 'tahun_ajaran_id': tid}, tok=atok, prefer='return=representation')
        tgh_id = t[0]['id'] if st == 201 else None
    print('8. tagihan uji:', st if tgh_id else -1, tgh_id[:8] if tgh_id else '')

# 9) login WALI -> baca anak + nilai + tagihan (RLS)
st, d4 = jreq('POST', '/auth/v1/token?grant_type=password', {'email': wife, 'password': 'wali1234'})
wtok = d4['access_token'] if st == 200 else None
print('9. login wali:', st if wtok else -1)
if wtok:
    st, ids = jreq('POST', '/rest/v1/rpc/siswa_ids_for_wali', {}, tok=wtok)
    ok1 = st == 200 and isinstance(ids, list) and sid in ids
    cek(9.1, 'wali: siswa_ids_for_wali memuat anak', ok1)
    st, s = jreq('GET', '/rest/v1/siswa?select=id,nama&id=eq.%s' % sid, tok=wtok)
    ok2 = st == 200 and isinstance(s, list) and len(s) == 1 and s[0]['id'] == sid
    cek(9.2, 'wali: baca profil anak', ok2)
    st, n = jreq('GET', '/rest/v1/nilai?select=id,nilai&siswa_id=eq.%s' % sid, tok=wtok)
    ok3 = st == 200 and isinstance(n, list) and len(n) >= 1
    cek(9.3, 'wali: baca nilai anak (%d baris)' % (len(n) if isinstance(n, list) else -1), ok3)
    st, tg = jreq('GET', '/rest/v1/tagihan?select=id,nominal,status&siswa_id=eq.%s' % sid, tok=wtok)
    ok4 = st == 200 and isinstance(tg, list) and any(x['id'] == tgh_id for x in tg)
    cek(9.4, 'wali: baca tagihan anak', ok4)
    st, r = jreq('POST', '/rest/v1/nilai', {'siswa_id': sid, 'mapel_id': mid, 'nilai': 1, 'jenis': 'tugas', 'semester': 1, 'tahun_ajaran_id': tid}, tok=wtok)
    cek(9.5, 'wali: coba TULIS nilai -> 403', st == 403)
    st, r = jreq('POST', '/rest/v1/tagihan', {'siswa_id': sid, 'biaya_id': biaya_id, 'bulan': '2031-04-01', 'nominal': 1, 'status': 'belum'}, tok=wtok)
    cek(9.6, 'wali: coba TULIS tagihan -> 403', st == 403)

# 10) login SISWA -> baca nilai diri + tagihan diri
if stok:
    st, n = jreq('GET', '/rest/v1/nilai?select=id,nilai&siswa_id=eq.%s' % sid, tok=stok)
    ok1 = st == 200 and isinstance(n, list) and len(n) >= 1
    cek(10.1, 'siswa: baca nilai diri (%d baris)' % (len(n) if isinstance(n, list) else -1), ok1)
    st, tg = jreq('GET', '/rest/v1/tagihan?select=id,nominal,status&siswa_id=eq.%s' % sid, tok=stok)
    ok2 = st == 200 and isinstance(tg, list) and any(x['id'] == tgh_id for x in tg)
    cek(10.2, 'siswa: baca tagihan diri', ok2)
    st, r = jreq('POST', '/rest/v1/nilai', {'siswa_id': sid, 'mapel_id': mid, 'nilai': 1, 'jenis': 'tugas', 'semester': 1, 'tahun_ajaran_id': tid}, tok=stok)
    cek(10.3, 'siswa: coba TULIS nilai -> 403', st == 403)
    st, r = jreq('GET', '/rest/v1/siswa?select=id&id=neq.%s' % sid, tok=stok)
    cek(10.4, 'siswa: tidak bisa lihat siswa lain', st == 200 and (not isinstance(r, list) or len(r) == 0))

# 11) cleanup: tagihan uji + biaya uji + relasi wali (row) + nilai uji (baru dibuat saja)
if tgh_id: jreq('DELETE', '/rest/v1/tagihan?id=eq.%s' % tgh_id, tok=atok)
if biaya_id: jreq('DELETE', '/rest/v1/biaya?id=eq.%s' % biaya_id, tok=atok)
jreq('DELETE', '/rest/v1/wali_siswa?wali_murid_id=eq.%s' % wid, tok=atok)
if nilai_id:
    # hapus hanya kalau test ini yang membuat (nilai 88 khusus uji) — aman biarkan juga
    jreq('DELETE', '/rest/v1/nilai?id=eq.%s' % nilai_id, tok=atok)
    print('11. cleanup: tagihan + biaya + relasi + nilai uji')
else:
    print('11. cleanup: tagihan + biaya + relasi (nilai uji tidak dibuat)')

print()
if FAIL:
    print('GAGAL %d langkah: %s' % (len(FAIL), '; '.join(FAIL)))
    raise SystemExit(1)
print('DONE')