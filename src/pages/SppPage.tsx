import { useEffect, useMemo, useState } from 'react'
import {
  tahunAktifId, listRombel, listSiswa,
  listBiaya, simpanBiaya, hapusBiaya,
  generateTagihanBulanan, listTagihan,
  listPembayaran, simpanPembayaran, hapusPembayaran,
  type Biaya, type Rombel, type Tagihan, type Pembayaran,
} from '../lib/db'
import { Modal, Confirm, useToast, inSel, btn, btnTxt } from '../lib/ui'
import { MIcon } from '../lib/icons'

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const rupiah = (n: number | null | undefined) => 'Rp ' + (n ?? 0).toLocaleString('id-ID')
const tgl = (d: string | null) => {
  if (!d) return '—'
  const [y, m, dd] = d.slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}
const bulanSekarang = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
const namaBulan = (ym: string) => NAMA_BULAN[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4)

type Tab = 'biaya' | 'tagihan' | 'pembayaran'

export default function SppPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('biaya')
  const [tahunId, setTahunId] = useState<string | null>(null)

  // biaya
  const [biayas, setBiayas] = useState<Biaya[]>([])
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [bForm, setBForm] = useState<Partial<Biaya>>({})
  const [bOpen, setBOpen] = useState(false)
  const [bHapusId, setBHapusId] = useState<string | null>(null)

  // tagihan & pembayaran
  const [bulan, setBulan] = useState(bulanSekarang())
  const [tagihans, setTagihans] = useState<Tagihan[]>([])
  const [pembayarans, setPembayarans] = useState<Pembayaran[]>([])
  const [siswas, setSiswas] = useState<{ id: string; nama: string }[]>([])
  const [generating, setGenerating] = useState(false)
  const [busy, setBusy] = useState(true)

  // modal bayar
  const [bayarTag, setBayarTag] = useState<Tagihan | null>(null)
  const [pForm, setPForm] = useState({ nominal: '', tanggal: new Date().toISOString().slice(0, 10), metode: 'tunai', no_ref: '', catatan: '' })
  const [hapusBayId, setHapusBayId] = useState<Pembayaran | null>(null)

  const namaSiswa = useMemo(() => new Map(siswas.map((s) => [s.id, s.nama])), [siswas])
  const namaRombel = useMemo(() => new Map(rombels.map((r) => [r.id, r.nama])), [rombels])
  const namaBiaya = useMemo(() => new Map(biayas.map((b) => [b.id, b.nama])), [biayas])
  const dibayarMap = useMemo(() => {
    const m = new Map<string, number>()
    pembayarans.forEach((p) => m.set(p.tagihan_id, (m.get(p.tagihan_id) ?? 0) + Number(p.nominal)))
    return m
  }, [pembayarans])

  const muat = async () => {
    const t = await tahunAktifId()
    setTahunId(t)
    if (t) setRombels(await listRombel(t))
    setBiayas(await listBiaya())
    setSiswas(await listSiswa())
    setPembayarans(await listPembayaran())
    setBusy(false)
  }
  const muatTagihan = async () => {
    setTagihans(await listTagihan(bulan + '-01'))
  }

  useEffect(() => {
    muat().catch((e: Error) => toast(e.message, 'err'))
  }, [])
  useEffect(() => {
    if (tab === 'tagihan') muatTagihan().catch((e: Error) => toast(e.message, 'err'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bulan])

  async function simpanBiayaBaru() {
    if (!bForm.nama?.trim() || !bForm.nominal) return toast('Nama & nominal wajib diisi', 'err')
    if (!tahunId) return toast('Tahun ajaran aktif belum dibuat', 'err')
    try {
      await simpanBiaya(bForm as Biaya & { nama: string; nominal: number; tahun_ajaran_id: string })
      toast('Tersimpan', 'ok')
      setBOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapusBiayaBaru() {
    if (!bHapusId) return
    try {
      await hapusBiaya(bHapusId)
      toast('Terhapus', 'ok')
      setBHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function generate() {
    setGenerating(true)
    try {
      const n = await generateTagihanBulanan(bulan + '-01')
      toast(n > 0 ? `${n} tagihan baru dibuat` : 'Tidak ada tagihan baru (semua sudah ada / biaya belum dibuat)', n > 0 ? 'ok' : 'info')
      await muatTagihan()
    } catch (e: any) { toast(e.message, 'err') } finally { setGenerating(false) }
  }

  function bukaBayar(t: Tagihan) {
    const sisa = Number(t.nominal) - (dibayarMap.get(t.id) ?? 0)
    setPForm({ nominal: String(sisa), tanggal: new Date().toISOString().slice(0, 10), metode: 'tunai', no_ref: '', catatan: '' })
    setBayarTag(t)
  }

  async function simpanBayar() {
    if (!bayarTag) return
    const nominal = Number(pForm.nominal)
    if (!nominal || nominal <= 0) return toast('Nominal wajib diisi', 'err')
    try {
      await simpanPembayaran({
        siswa_id: bayarTag.siswa_id, tagihan_id: bayarTag.id, nominal,
        tanggal: pForm.tanggal || new Date().toISOString().slice(0, 10),
        metode: pForm.metode as 'tunai' | 'transfer',
        no_ref: pForm.no_ref.trim() || null, catatan: pForm.catatan.trim() || null,
      })
      toast('Pembayaran dicatat', 'ok')
      setBayarTag(null)
      await Promise.all([muat(), muatTagihan()])
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function batalkanBayar() {
    if (!hapusBayId) return
    try {
      await hapusPembayaran(hapusBayId.id)
      toast('Pembayaran dibatalkan', 'ok')
      setHapusBayId(null)
      await Promise.all([muat(), muatTagihan()])
    } catch (e: any) { toast(e.message, 'err') }
  }

  const statusTampil = (t: Tagihan) => {
    const today = new Date().toISOString().slice(0, 10)
    if (t.status === 'belum' && t.jatuh_tempo && today > t.jatuh_tempo.slice(0, 10)) return 'terlambat'
    return t.status
  }
  const badge = (s: string) => s === 'lunas' ? 'badge success' : s === 'terlambat' ? 'badge error' : 'badge outline'

  const totalTagihan = tagihans.reduce((s, t) => s + Number(t.nominal), 0)
  const totalBayar = tagihans.reduce((s, t) => s + (dibayarMap.get(t.id) ?? 0), 0)

  return (
    <div className="page-wrap">
      <h1 className="page-title">Keuangan SPP</h1>
      <p className="page-sub">Biaya, tagihan bulanan & pembayaran siswa</p>

      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip${tab === 'biaya' ? ' active' : ''}`} onClick={() => setTab('biaya')}><MIcon n="payments" /> Biaya</button>
        <button className={`chip${tab === 'tagihan' ? ' active' : ''}`} onClick={() => setTab('tagihan')}><MIcon n="calendar_month" /> Tagihan</button>
        <button className={`chip${tab === 'pembayaran' ? ' active' : ''}`} onClick={() => setTab('pembayaran')}><MIcon n="check_circle" /> Pembayaran</button>
      </div>

      {tab === 'biaya' && (
        <>
          <div className="card" style={{ padding: 0 }}>
            {busy ? <p className="empty">Memuat...</p> : biayas.length === 0 ? (
              <div className="empty"><MIcon n="payments" /><p>Belum ada biaya — buat dulu (mis. SPP bulanan)</p></div>
            ) : biayas.map((b, i) => (
              <div key={b.id}>
                {i > 0 && <div className="list-divider" />}
                <div className="list-item">
                  <div className="li-avatar">{b.nama.charAt(0)}</div>
                  <div className="li-body">
                    <div className="li-title">{b.nama}</div>
                    <div className="li-sub">
                      <span className={badge(b.periode === 'bulanan' ? 'lunas' : 'terlambat')} style={{ marginRight: 6, fontSize: '0.62rem' }}>
                        {b.periode}
                      </span>
                      {b.berlaku_rombel_id ? `khusus ${namaRombel.get(b.berlaku_rombel_id) ?? '—'}` : 'semua rombel'}
                    </div>
                  </div>
                  <div className="li-trailing">
                    <span className="li-title" style={{ color: 'var(--primary)', marginRight: 8 }}>{rupiah(b.nominal)}</span>
                    <button className="icon-btn" title="Edit" onClick={() => { setBForm(b); setBOpen(true) }}><MIcon n="edit" /></button>
                    <button className="icon-btn" title="Hapus" onClick={() => setBHapusId(b.id)}><MIcon n="delete" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="fab" title="Tambah biaya" onClick={() => { setBForm({ periode: 'bulanan' }); setBOpen(true) }}>
            <MIcon n="add" />
          </button>
        </>
      )}

      {tab === 'tagihan' && (
        <>
          <div className="card" style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="month" className={inSel} style={{ flex: 1, minWidth: 150 }}
              value={bulan} onChange={(e) => e.target.value && setBulan(e.target.value)} />
            <button className={btn} disabled={generating} onClick={generate} style={{ whiteSpace: 'nowrap' }}>
              <MIcon n="add" /> {generating ? 'Membuat...' : 'Generate Tagihan'}
            </button>
          </div>

          {tagihans.length > 0 && (
            <div className="card" style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 0 }}>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>TOTAL TAGIHAN</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rupiah(totalTagihan)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>TERBAYAR</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>{rupiah(totalBayar)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 90 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--on-surface-variant)' }}>SISA</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--error)' }}>{rupiah(totalTagihan - totalBayar)}</div>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0, marginTop: 12 }}>
            {busy ? <p className="empty">Memuat...</p> : tagihans.length === 0 ? (
              <div className="empty"><MIcon n="calendar_month" /><p>Belum ada tagihan {namaBulan(bulan)} — tekan Generate</p></div>
            ) : tagihans.map((t, i) => {
              const s = statusTampil(t)
              const sisa = Number(t.nominal) - (dibayarMap.get(t.id) ?? 0)
              return (
                <div key={t.id}>
                  {i > 0 && <div className="list-divider" />}
                  <div className="list-item">
                    <div className="li-avatar">{(namaSiswa.get(t.siswa_id) ?? '?').charAt(0)}</div>
                    <div className="li-body">
                      <div className="li-title">
                        {namaSiswa.get(t.siswa_id) ?? 'siswa terhapus'}
                        <span className={badge(s)} style={{ marginLeft: 8 }}>{s}</span>
                      </div>
                      <div className="li-sub">{namaBiaya.get(t.biaya_id) ?? '—'} · tempo {tgl(t.jatuh_tempo)}{s !== 'lunas' ? ` · sisa ${rupiah(sisa)}` : ''}</div>
                    </div>
                    <div className="li-trailing">
                      <span className="li-title" style={{ color: 'var(--primary)' }}>{rupiah(t.nominal)}</span>
                      {s !== 'lunas' && (
                        <button className="btn btn-sm" style={{ marginLeft: 10 }} onClick={() => bukaBayar(t)}>Bayar</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'pembayaran' && (
        <div className="card" style={{ padding: 0 }}>
          {busy ? <p className="empty">Memuat...</p> : pembayarans.length === 0 ? (
            <div className="empty"><MIcon n="check_circle" /><p>Belum ada pembayaran tercatat</p></div>
          ) : pembayarans.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <div className="list-divider" />}
              <div className="list-item">
                <div className="li-avatar">{(namaSiswa.get(p.siswa_id) ?? '?').charAt(0)}</div>
                <div className="li-body">
                  <div className="li-title">{namaSiswa.get(p.siswa_id) ?? 'siswa terhapus'}</div>
                  <div className="li-sub">{p.metode}{p.no_ref ? ` · ref ${p.no_ref}` : ''} · {tgl(p.tanggal)}{p.catatan ? ` · ${p.catatan}` : ''}</div>
                </div>
                <div className="li-trailing">
                  <span className="li-title" style={{ color: 'var(--success)', marginRight: 8 }}>{rupiah(p.nominal)}</span>
                  <button className="icon-btn" title="Batalkan" onClick={() => setHapusBayId(p)}><MIcon n="delete" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal biaya */}
      <Modal open={bOpen} onClose={() => setBOpen(false)} title={bForm.id ? 'Edit Biaya' : 'Biaya Baru'}>
        <div className="field">
          <span>Nama biaya *</span>
          <input className={inSel} value={bForm.nama ?? ''} onChange={(e) => setBForm({ ...bForm, nama: e.target.value })} placeholder="contoh: SPP" />
        </div>
        <div className="field">
          <span>Nominal (Rp) *</span>
          <input type="number" className={inSel} value={bForm.nominal ?? ''} onChange={(e) => setBForm({ ...bForm, nominal: e.target.value ? Number(e.target.value) : undefined })} placeholder="150000" />
        </div>
        <div className="field">
          <span>Periode</span>
          <select className={inSel} value={bForm.periode ?? 'bulanan'}
            onChange={(e) => setBForm({ ...bForm, periode: e.target.value as 'bulanan' | 'tahunan' })}>
            <option value="bulanan">Bulanan</option>
            <option value="tahunan">Tahunan</option>
          </select>
        </div>
        <div className="field">
          <span>Berlaku untuk rombel</span>
          <select className={inSel} value={bForm.berlaku_rombel_id ?? ''}
            onChange={(e) => setBForm({ ...bForm, berlaku_rombel_id: e.target.value || null })}>
            <option value="">Semua rombel</option>
            {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className={btnTxt} onClick={() => setBOpen(false)}>Batal</button>
          <button className={btn} onClick={simpanBiayaBaru}>Simpan</button>
        </div>
      </Modal>

      {/* Modal bayar */}
      <Modal open={!!bayarTag} onClose={() => setBayarTag(null)} title="Catat Pembayaran">
        {bayarTag && (
          <>
            <p className="li-sub" style={{ marginBottom: 10 }}>
              {namaSiswa.get(bayarTag.siswa_id) ?? '—'} · {namaBiaya.get(bayarTag.biaya_id) ?? '—'}<br />
              Tagihan {rupiah(bayarTag.nominal)} · dibayar {rupiah(dibayarMap.get(bayarTag.id) ?? 0)} · sisa {rupiah(Number(bayarTag.nominal) - (dibayarMap.get(bayarTag.id) ?? 0))}
            </p>
            <div className="form-grid">
              <div className="field">
                <span>Nominal *</span>
                <input type="number" className={inSel} value={pForm.nominal}
                  onChange={(e) => setPForm({ ...pForm, nominal: e.target.value })} />
              </div>
              <div className="field">
                <span>Tanggal</span>
                <input type="date" className={inSel} value={pForm.tanggal}
                  onChange={(e) => setPForm({ ...pForm, tanggal: e.target.value })} />
              </div>
              <div className="field">
                <span>Metode</span>
                <select className={inSel} value={pForm.metode}
                  onChange={(e) => setPForm({ ...pForm, metode: e.target.value })}>
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div className="field">
                <span>No. referensi</span>
                <input className={inSel} value={pForm.no_ref}
                  onChange={(e) => setPForm({ ...pForm, no_ref: e.target.value })} placeholder="opsional" />
              </div>
              <div className="field span2">
                <span>Catatan</span>
                <input className={inSel} value={pForm.catatan}
                  onChange={(e) => setPForm({ ...pForm, catatan: e.target.value })} placeholder="opsional" />
              </div>
            </div>
            <div className="modal-actions">
              <button className={btnTxt} onClick={() => setBayarTag(null)}>Batal</button>
              <button className={btn} onClick={simpanBayar}>Simpan</button>
            </div>
          </>
        )}
      </Modal>

      <Confirm open={!!bHapusId} onClose={() => setBHapusId(null)} onYes={hapusBiayaBaru}
        title="Hapus biaya?" desc="Tagihan terkait ikut terhapus." />
      <Confirm open={!!hapusBayId} onClose={() => setHapusBayId(null)} onYes={batalkanBayar}
        title="Batalkan pembayaran?" desc="Status tagihan akan kembali belum lunas." />
    </div>
  )
}