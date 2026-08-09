import { useEffect, useState } from 'react'
import { tahunAktifId, listRombel, simpanRombel, hapusRombel, listJurusan, listGuru, type Rombel, type Jurusan, type Guru } from '../lib/db'
import { Modal, Confirm, useToast, inSel, btn, btnTxt } from '../lib/ui'
import { MIcon } from '../lib/icons'

export default function RombelPage() {
  const toast = useToast()
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rows, setRows] = useState<Rombel[]>([])
  const [jurusan, setJurusan] = useState<Jurusan[]>([])
  const [gurus, setGurus] = useState<Guru[]>([])
  const [form, setForm] = useState<Partial<Rombel>>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  const muat = async () => {
    const t = await tahunAktifId()
    setTahunId(t)
    if (t) setRows(await listRombel(t))
    setBusy(false)
  }

  useEffect(() => {
    Promise.all([muat(), listJurusan().then(setJurusan), listGuru().then(setGurus)])
      .catch((e: Error) => toast(e.message, 'err'))
  }, [])

  async function simpan() {
    if (!form.nama?.trim() || !form.tingkat) return toast('Nama & tingkat wajib diisi', 'err')
    if (!tahunId) return toast('Tahun ajaran aktif belum dibuat', 'err')
    try {
      await simpanRombel(form as Rombel & { nama: string; tingkat: number }, tahunId)
      toast('Tersimpan', 'ok')
      setOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusRombel(hapusId)
      toast('Terhapus', 'ok')
      setHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  const jurusanNama = (id: string | null) => jurusan.find((j) => j.id === id)?.kode ?? '—'
  const guruNama = (id: string | null) => gurus.find((g) => g.id === id)?.nama ?? '—'

  return (
    <div className="page-wrap">
      <h1 className="page-title">Rombel <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', fontWeight: 400 }}>({rows.length})</span></h1>
      <p className="page-sub">Kelas & wali kelas · tahun ajaran aktif</p>

      <div className="card" style={{ padding: 0 }}>
        {busy ? <p className="empty">Memuat...</p> : rows.length === 0 ? (
          <div className="empty"><MIcon n="meeting_room" /><p>Belum ada rombel</p></div>
        ) : rows.map((r, i) => (
          <div key={r.id}>
            {i > 0 && <div className="list-divider" />}
            <div className="list-item">
              <div className="li-avatar">{r.nama.slice(0, 1)}</div>
              <div className="li-body">
                <div className="li-title">{r.nama}</div>
                <div className="li-sub">Wali: {guruNama(r.wali_kelas_guru_id)} · Jurusan {jurusanNama(r.jurusan_id)}</div>
              </div>
              <div className="li-trailing">
                <button className="icon-btn" title="Edit" onClick={() => { setForm(r); setOpen(true) }}><MIcon n="edit" /></button>
                <button className="icon-btn" title="Hapus" onClick={() => setHapusId(r.id)}><MIcon n="delete" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="fab" title="Tambah rombel" onClick={() => { setForm({ tingkat: 10, nama: '' }); setOpen(true) }}>
        <MIcon n="add" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Rombel' : 'Rombel Baru'}>
        <div className="field">
          <span>Tingkat</span>
          <select className={inSel} value={form.tingkat ?? 10}
            onChange={(e) => setForm({ ...form, tingkat: Number(e.target.value) })}>
            <option value={10}>X (10)</option>
            <option value={11}>XI (11)</option>
            <option value={12}>XII (12)</option>
          </select>
        </div>
        <div className="field">
          <span>Jurusan</span>
          <select className={inSel} value={form.jurusan_id ?? ''}
            onChange={(e) => setForm({ ...form, jurusan_id: e.target.value || null })}>
            <option value="">— tanpa jurusan —</option>
            {jurusan.map((j) => <option key={j.id} value={j.id}>{j.kode} — {j.nama}</option>)}
          </select>
        </div>
        <div className="field">
          <span>Nama rombel</span>
          <input className={inSel} value={form.nama ?? ''}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="contoh: X-IPA-1" />
        </div>
        <div className="field">
          <span>Wali kelas</span>
          <select className={inSel} value={form.wali_kelas_guru_id ?? ''}
            onChange={(e) => setForm({ ...form, wali_kelas_guru_id: e.target.value || null })}>
            <option value="">— belum ada —</option>
            {gurus.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className={btnTxt} onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Confirm open={!!hapusId} onClose={() => setHapusId(null)} onYes={hapus}
        title="Hapus rombel?" desc="Anggota siswa di dalamnya ikut terhapus relasinya." />
    </div>
  )
}