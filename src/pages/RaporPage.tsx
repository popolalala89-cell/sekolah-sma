import { useEffect, useState } from 'react'
import {
  tahunAktifId, listRombel, listSiswaRombel, rekapNilaiSiswa, namaSekolah,
  anakSaya, siswaIdLogin, rombelSiswaMap,
  JENIS_NILAI, LABEL_JENIS, predikat, fmtNilai,
  type Rombel, type Siswa, type RekapNilai,
} from '../lib/db'
import { useToast, inSel, btn } from '../lib/ui'
import { MIcon } from '../lib/icons'
import { supabase, type Peran } from '../lib/supabase'

const JUDUL_SEMESTER = ['', 'Semester 1 (Ganjil)', 'Semester 2 (Genap)']

export default function RaporPage({ peran }: { peran: Peran }) {
  const toast = useToast()
  const isKelas = peran === 'admin' || peran === 'guru' // admin/guru: pilih rombel→siswa; wali/siswa: anak/diri
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [tahunNama, setTahunNama] = useState('')
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [siswaList, setSiswaList] = useState<Siswa[]>([]) // rombel (admin/guru) atau anak (wali)
  const [semester, setSemester] = useState(1)
  const [rombelId, setRombelId] = useState('')
  const [selected, setSelected] = useState<Siswa | null>(null)
  const [rekap, setRekap] = useState<RekapNilai[]>([])
  const [sekolah, setSekolah] = useState('')
  const [rombelNama, setRombelNama] = useState('')
  const [busy, setBusy] = useState(true)
  const [rekapBusy, setRekapBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [t, sk] = await Promise.all([tahunAktifId(), namaSekolah()])
        setTahunId(t); setSekolah(sk)
        let nama = ''
        if (t) {
          const { data: ta } = await supabase.from('tahun_ajaran').select('nama').eq('id', t).maybeSingle()
          nama = (ta?.nama as string | undefined) ?? ''
        }
        setTahunNama(nama)

        if (isKelas) {
          const rs = await listRombel('')
          let list = rs
          if (t) {
            const { data: rb } = await supabase
              .from('rombel').select('id, nama, tingkat, jurusan_id, wali_kelas_guru_id, aktif').eq('tahun_ajaran_id', t).order('nama')
            list = (rb ?? []) as Rombel[]
          }
          setRombels(list)
        } else if (peran === 'wali') {
          setSiswaList(await anakSaya())
        } else {
          // siswa: langsung dirinya
          const sid = await siswaIdLogin()
          if (sid) {
            const { data } = await supabase.from('siswa').select('*').eq('id', sid).maybeSingle()
            if (data) setSelected(data as Siswa)
          }
        }
      } catch (e: any) { toast(e.message, 'err') }
      finally { setBusy(false) }
    })()
  }, [])

  useEffect(() => {
    if (!isKelas || !rombelId || !tahunId) { setSiswaList([]); setSelected(null); return }
    ;(async () => {
      try { setSiswaList(await listSiswaRombel(rombelId, tahunId)) }
      catch (e: any) { toast(e.message, 'err') }
    })()
  }, [rombelId, tahunId])

  async function pilihSiswa(s: Siswa) {
    setSelected(s)
    if (!tahunId) return
    setRekapBusy(true)
    try {
      const [rk, rm] = await Promise.all([
        rekapNilaiSiswa(s.id, tahunId, semester),
        isKelas ? Promise.resolve(rombels.find((r) => r.id === rombelId)?.nama ?? '') : cariRombelNama(s.id, tahunId),
      ])
      setRekap(rk); setRombelNama(rm)
    } catch (e: any) { toast(e.message, 'err') }
    finally { setRekapBusy(false) }
  }

  /** nama rombel anak (wali boleh baca rombel_siswa; siswa tak punya akses -> '-') */
  async function cariRombelNama(siswaId: string, tahunId: string): Promise<string> {
    try {
      const m = await rombelSiswaMap(tahunId)
      const rid = m.get(siswaId)
      if (!rid) return '-'
      const { data } = await supabase.from('rombel').select('nama').eq('id', rid).maybeSingle()
      return (data?.nama as string | undefined) ?? '-'
    } catch { return '-' }
  }

  useEffect(() => {
    if (selected && tahunId) { rekapNilaiSiswa(selected.id, tahunId, semester).then(setRekap).catch((e: any) => toast(e.message, 'err')) }
  }, [semester])

  // siswa: begitu data diri siap langsung susun rapor
  useEffect(() => {
    if (peran === 'siswa' && selected && !rekapBusy && rekap.length === 0 && tahunId) {
      pilihSiswa(selected)
    }
  }, [selected, tahunId])

  const rerataTotal = (() => {
    const arr = rekap.map((r) => r.rerata).filter((v): v is number => v !== null)
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  })()

  const judul = peran === 'admin' || peran === 'guru' ? 'Rapor' : peran === 'wali' ? 'Rapor Anak' : 'Rapor Saya'

  return (
    <div className="page-wrap">
      <h1 className="page-title">{judul}</h1>
      <p className="page-sub">Rekap nilai per siswa — cetak atau simpan PDF lewat browser</p>

      {peran === 'wali' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="form-grid">
            <div className="field">
              <span>Anak</span>
              <select className={inSel} value={selected?.id ?? ''} onChange={(e) => {
                const s = siswaList.find((x) => x.id === e.target.value)
                if (s) pilihSiswa(s); else setSelected(null)
              }}>
                <option value="">— pilih anak —</option>
                {siswaList.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div className="field">
              <span>Semester</span>
              <select className={inSel} value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                <option value={1}>1 (Ganjil)</option>
                <option value={2}>2 (Genap)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {isKelas && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="form-grid">
            <div className="field">
              <span>Rombel</span>
              <select className={inSel} value={rombelId} onChange={(e) => setRombelId(e.target.value)}>
                <option value="">— pilih —</option>
                {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
              </select>
            </div>
            <div className="field">
              <span>Semester</span>
              <select className={inSel} value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                <option value={1}>1 (Ganjil)</option>
                <option value={2}>2 (Genap)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {isKelas && (
        <div className="card" style={{ padding: 0 }}>
          {busy ? <p className="empty">Memuat...</p> : !rombelId ? (
            <div className="empty"><MIcon n="scoreboard" /><p>Pilih rombel dulu</p></div>
          ) : siswaList.length === 0 ? (
            <div className="empty"><MIcon n="groups" /><p>Rombel belum punya siswa</p></div>
          ) : siswaList.map((s, i) => (
            <div key={s.id} onClick={() => pilihSiswa(s)} style={{ cursor: 'pointer' }}>
              {i > 0 && <div className="list-divider" />}
              <div className="list-item">
                <div className="li-avatar">{s.nama.charAt(0)}</div>
                <div className="li-body">
                  <div className="li-title">{s.nama}</div>
                  <div className="li-sub">{s.nisn}</div>
                </div>
                <MIcon n="chevron_right" cls="li-trailing" />
              </div>
            </div>
          ))}
        </div>
      )}

      {peran === 'wali' && (
        <div className="card" style={{ padding: 0 }}>
          {busy ? <p className="empty">Memuat...</p> : siswaList.length === 0 ? (
            <div className="empty"><MIcon n="groups" /><p>Belum ada anak terhubung ke akunmu</p></div>
          ) : (
            siswaList.map((s, i) => (
              <div key={s.id} onClick={() => pilihSiswa(s)} style={{ cursor: 'pointer' }}>
                {i > 0 && <div className="list-divider" />}
                <div className="list-item">
                  <div className="li-avatar">{s.nama.charAt(0)}</div>
                  <div className="li-body">
                    <div className="li-title">{s.nama}</div>
                    <div className="li-sub">{s.nisn}</div>
                  </div>
                  <MIcon n="chevron_right" cls="li-trailing" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="print-area card">
          {rekapBusy ? <p className="empty">Menyusun rapor...</p> : (
            <>
              <div className="rapor">
                <div className="rapor-head">
                  <h2>{sekolah}</h2>
                  <p>Laporan Hasil Belajar Siswa</p>
                  <p className="r-sub">{JUDUL_SEMESTER[semester]}{tahunNama ? ` · ${tahunNama}` : ''}</p>
                </div>
                <div className="r-id">
                  <span>Nama: <b>{selected.nama}</b></span>
                  <span>NISN: {selected.nisn}</span>
                  <span>Rombel: {isKelas ? rombels.find((r) => r.id === rombelId)?.nama ?? '-' : rombelNama}</span>
                </div>
                <table className="rapor-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Mapel</th>
                      {JENIS_NILAI.map((j) => <th key={j} className="r-c">{LABEL_JENIS[j]}</th>)}
                      <th className="r-c">Rata-rata</th><th className="r-c">Pred.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.map((r, i) => (
                      <tr key={r.mapelId}>
                        <td>{i + 1}</td>
                        <td>{r.kode} — {r.nama}</td>
                        {JENIS_NILAI.map((j) => <td key={j} className="r-c">{fmtNilai(r.byJenis[j] ?? null)}</td>)}
                        <td className="r-c r-bold">{fmtNilai(r.rerata)}</td>
                        <td className="r-c r-bold">{predikat(r.rerata)}</td>
                      </tr>
                    ))}
                    {rekap.length === 0 && (
                      <tr><td colSpan={JENIS_NILAI.length + 4} style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                        Belum ada nilai untuk semester ini
                      </td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Rata-rata seluruh mapel</td>
                      {JENIS_NILAI.map((j) => <td key={j} className="r-c" />)}
                      <td className="r-c r-bold">{fmtNilai(rerataTotal)}</td>
                      <td className="r-c r-bold">{predikat(rerataTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="r-foot">Dicetak via aplikasi — Arsip digital di fase 2 (e-Rapor).</p>
              </div>
              <div className="no-print" style={{ display: 'flex', gap: 8, margin: '12px 0 4px' }}>
                <button className={btn} onClick={() => window.print()}>Cetak / Simpan PDF</button>
                <button className={btn} onClick={() => setSelected(null)}>Tutup</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}