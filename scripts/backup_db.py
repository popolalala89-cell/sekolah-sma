#!/usr/bin/env python3
"""Backup DB sekolah-sma → JSON per tabel, di-zip ke ~/storage/shared/Denaya/
Pakai login admin (email+sandi dari .env.local). Jalankan: python3 scripts/backup_db.py
"""
import json, os, re, sys, zipfile, datetime, urllib.request, urllib.error

HOME = os.path.expanduser('~')
ENV = os.path.join(HOME, 'sekolah-sma', '.env.local')
OUT_DIR = os.path.join(HOME, 'storage', 'shared', 'Denaya')

TABLES = ['sekolah', 'jurusan', 'rombel', 'guru', 'siswa', 'mapel', 'wali_murid',
          'wali_siswa', 'rombel_siswa', 'jadwal', 'absensi', 'nilai', 'biaya',
          'tagihan', 'pembayaran', 'akun']

def load_env():
    vals = {}
    for line in open(ENV):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            vals[k.strip()] = v.strip()
    return vals

def main():
    env = load_env()
    url = env.get('VITE_SUPABASE_URL', '').rstrip('/')
    key = env.get('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    if not url or not key:
        print('❌ .env.local tidak lengkap'); sys.exit(1)

    def req(method, path, body=None, tok=None):
        h = {'apikey': key, 'Content-Type': 'application/json'}
        if tok: h['Authorization'] = 'Bearer ' + tok
        r = urllib.request.Request(url + path, method=method, headers=h,
                                   data=json.dumps(body).encode() if body else None)
        try:
            resp = urllib.request.urlopen(r, timeout=30)
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()[:300]

    st, d = req('POST', '/auth/v1/token?grant_type=password',
                {'email': env.get('ADMIN_EMAIL', 'admin@sekolah.local'),
                 'password': env.get('ADMIN_PASSWORD', 'adlok123')})
    if st != 200:
        print('❌ login gagal (%s): %s' % (st, str(d)[:120])); sys.exit(1)
    tok = d['access_token']
    print('✓ login admin OK —', d['user']['email'])

    stamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    os.makedirs(OUT_DIR, exist_ok=True)
    zip_path = os.path.join(OUT_DIR, 'sekolah-sma_backup_%s.zip' % stamp)
    meta = {'dibuat': datetime.datetime.now().isoformat(), 'tabel': {}}

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for t in TABLES:
            st, rows = req('GET', '/rest/v1/%s?select=*' % t, tok=tok)
            if st == 200 and isinstance(rows, list):
                meta['tabel'][t] = len(rows)
                z.writestr('%s.json' % t, json.dumps(rows, ensure_ascii=False, indent=1, default=str))
                print('  ✓ %-14s %3d baris' % (t, len(rows)))
            else:
                meta['tabel'][t] = 'ERR %s' % st
                print('  ⚠ %-14s error %s' % (t, st))
        z.writestr('_meta.json', json.dumps(meta, ensure_ascii=False, indent=1))

    size = os.path.getsize(zip_path) / 1024
    print('\n✔ Backup selesai: %s (%.1f KB)' % (zip_path, size))
    print('  Total baris: %d' % sum(v for v in meta['tabel'].values() if isinstance(v, int)))

if __name__ == '__main__':
    main()