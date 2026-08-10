import { useEffect, useState } from 'react'
import { anakSaya, siswaIdLogin, listTagihanSiswa, type Siswa } from '../lib/db'
import { useToast, inSel } from '../lib/ui'
import { MIcon } from '../lib/icons'
import { supabase, type Peran } from '../lib/supabase'

const NAMA_BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function namaBulan(bulan: string | null): string {
  if (!bulan) return '-'
  const [y, m] = bulan.split('-').map(Number)
  if (!y || !m) return bulan
  return `${NAMA_BULAN[m] ?? m} ${y}`
}

function fmtRp(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function TagihanSayaPage({ peran }: { peran: Peran }) {
  const toast = useToast()
  const [siswaList, setSiswaList] = useState<Siswa[]>([])
  const [selected, setSelected] = useState<Siswa | null>(null)
  const [tagihan, setTagihan] = useState<Awaited<ReturnType<typeof listTagihanSiswa>>>([])
  const [busy, setBusy] = useState(true)
  const [tagBusy, setTagBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        if (peran === 'wali') {
          setSiswaList(await anakSaya())
        } else {
          const sid = await siswaIdLogin()
          if (sid) {
            const { data } = await supabase.from('siswa').select('*').eq('id', sid).maybeSingle()
            if (data) { setSelected(data as Siswa); setSiswaList([data as Siswa]) }
          }
        }
      } catch (e: any) { toast(e.message, 'err') }
      finally { setBusy(false) }
    })()
  }, [])

  function pilihSiswa(s: Siswa) {
    setSelected(s)
    setTagBusy(true)
    setTagihan([])
    listTagihanSiswa(s.id).then(setTagihan).catch((e: any) => toast(e.message, 'err')).finally(() => setTagBusy(false))
  }

  // siswa: auto-pilih diri
  useEffect(() => {
    if (peran === 'siswa' && selected && !tagBusy && tagihan.length === 0) pilihSiswa(selected)
  }, [selected])

  const total = tagihan.reduce((s, t) => s + Number(t.nominal), 0)
  const lunas = tagihan.filter((t) => t.status === 'lunas').reduce((s, t) => s + Number(t.nominal), 0)
  const sisa = total - lunas
  const badge = (st: string) => st === 'lunas' ? 'badge success' : st === 'terlambat' ? 'badge error' : 'badge outline'

  return (
    <div className="page-wrap">
      <h1 className="page-title">{peran === 'wali' ? 'Tagihan Anak' : 'Tagihan Saya'}</h1>
      <p className="page-sub">Keuangan SPP — status tagihan per anak</p>

      {peran === 'wali' && (
        <div className="card" style={{ marginBottom: 14 }}>
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
        </div>
      )}

      {selected && !busy && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div className="field">
              <span className="page-sub" style={{ fontSize: '0.7rem' }}>TOTAL TAGIHAN</span>
              <b>{fmtRp(total)}</b>
            </div>
            <div className="field">
              <span className="page-sub" style={{ fontSize: '0.7rem' }}>SUDAH DIBAYAR</span>
              <b style={{ color: 'var(--primary)' }}>{fmtRp(lunas)}</b>
            </div>
            <div className="field">
              <span className="page-sub" style={{ fontSize: '0.7rem' }}>SISA</span>
              <b style={{ color: sisa > 0 ? 'var(--error)' : 'inherit' }}>{fmtRp(sisa)}</b>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : !selected ? (
          <div className="empty"><MIcon n="payments" /><p>{peran === 'wali' ? 'Pilih anak dulu' : 'Akun belum terhubung ke data siswa'}</p></div>
        ) : tagBusy ? (
          <p className="empty">Menyusun tagihan...</p>
        ) : tagihan.length === 0 ? (
          <div className="empty"><MIcon n="calendar_month" /><p>Belum ada tagihan</p></div>
        ) : tagihan.map((t, i) => (
          <div key={t.id}>
            {i > 0 && <div className="list-divider" />}
            <div className="list-item">
              <div className="li-body">
                <div className="li-title">{t.biayaNama ?? 'Biaya'}</div>
                <div className="li-sub">{namaBulan(t.bulan)}{t.jatuh_tempo ? ` · jatuh tempo ${t.jatuh_tempo}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="li-title">{fmtRp(Number(t.nominal))}</div>
                <span className={badge(t.status)} style={{ marginTop: 2 }}>{t.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}