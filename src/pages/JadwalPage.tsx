import { useEffect, useMemo, useState } from 'react'
import {
  tahunAktifId, listMapel, listGuru, listJadwal,
  simpanJadwalSlot, hapusJadwalSlot,
  SLOT_JAM, HARI,
  type Rombel, type Mapel, type Guru, type JadwalView,
} from '../lib/db'
import { Modal, useToast, inSel, btn, btnDgr, btnTxt } from '../lib/ui'
import { supabase, peranDariUser } from '../lib/supabase'

export default function JadwalPage() {
  const toast = useToast()
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [mapels, setMapels] = useState<Mapel[]>([])
  const [gurus, setGurus] = useState<Guru[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const [rombelId, setRombelId] = useState('')
  const [jadwal, setJadwal] = useState<JadwalView[]>([])
  const [busy, setBusy] = useState(true)

  // modal edit slot
  const [edit, setEdit] = useState<{ hari: number; slot: number; row: JadwalView | null } | null>(null)
  const [eMapel, setEMapel] = useState('')
  const [eGuru, setEGuru] = useState('')
  const [eRuang, setERuang] = useState('')
  const [eMulai, setEMulai] = useState('07:00')
  const [eSelesai, setESelesai] = useState('07:45')
  const [simpanBusy, setSimpanBusy] = useState(false)

  // muat master
  useEffect(() => {
    ;(async () => {
      try {
        const [t, ms, gs, user] = await Promise.all([tahunAktifId(), listMapel(), listGuru(), supabase.auth.getUser()])
        let list: Rombel[] = []
        if (t) {
          const { data } = await supabase
            .from('rombel').select('id, nama, tingkat, jurusan_id, wali_kelas_guru_id, aktif')
            .eq('tahun_ajaran_id', t).order('nama')
          list = (data ?? []) as Rombel[]
        }
        setTahunId(t); setRombels(list); setMapels(ms); setGurus(gs)
        setIsAdmin(!!user.data.user && peranDariUser(user.data.user) === 'admin')
      } catch (e: any) { toast(e.message, 'err') }
      finally { setBusy(false) }
    })()
  }, [])

  // muat jadwal rombel
  useEffect(() => {
    if (!rombelId || !tahunId) { setJadwal([]); return }
    ;(async () => {
      try { setJadwal(await listJadwal(rombelId, tahunId)) }
      catch (e: any) { toast(e.message, 'err') }
    })()
  }, [rombelId, tahunId])

  /** cari baris jadwal di (hari, slot) — termasuk slot custom yang jatuh di rentang jam */
  const rowFor = useMemo(() => (hari: number, slotIdx: number): JadwalView | null => {
    const jam = SLOT_JAM[slotIdx]
    const batas = slotIdx === SLOT_JAM.length - 1 ? '99:99' : SLOT_JAM[slotIdx + 1].mulai
    return jadwal.find((r) => r.hari === hari && r.jam_mulai >= jam.mulai && r.jam_mulai < batas) ?? null
  }, [jadwal])

  function openEdit(hari: number, slotIdx: number) {
    if (!isAdmin) return
    const row = rowFor(hari, slotIdx)
    setEdit({ hari, slot: slotIdx, row })
    setEMapel(row?.mapel_id ?? '')
    setEGuru(row?.guru_id ?? '')
    setERuang(row?.ruang ?? '')
    setEMulai(row?.jam_mulai ?? SLOT_JAM[slotIdx].mulai)
    setESelesai(row?.jam_selesai ?? SLOT_JAM[slotIdx].selesai)
  }

  async function simpanSlot() {
    if (!edit || !rombelId || !tahunId) return
    if (!eMapel) { toast('Pilih mata pelajaran dulu', 'err'); return }
    if (!eMulai || !eSelesai || eSelesai <= eMulai) { toast('Jam tidak valid (selesai harus setelah mulai)', 'err'); return }
    setSimpanBusy(true)
    try {
      await simpanJadwalSlot({
        id: edit.row?.id ?? undefined,
        rombel_id: rombelId, mapel_id: eMapel, guru_id: eGuru || null,
        hari: edit.hari, jam_mulai: eMulai, jam_selesai: eSelesai,
        ruang: eRuang.trim() || null,
      })
      toast('Jadwal tersimpan', 'ok')
      setEdit(null)
      setJadwal(await listJadwal(rombelId, tahunId))
    } catch (e: any) { toast(e.message, 'err') }
    finally { setSimpanBusy(false) }
  }

  async function hapusSlot() {
    if (!edit?.row?.id || !rombelId || !tahunId) return
    setSimpanBusy(true)
    try {
      await hapusJadwalSlot(edit.row.id)
      toast('Slot dihapus', 'ok')
      setEdit(null)
      setJadwal(await listJadwal(rombelId, tahunId))
    } catch (e: any) { toast(e.message, 'err') }
    finally { setSimpanBusy(false) }
  }

  const terisi = jadwal.length

  return (
    <div className="page-wrap">
      <h1 className="page-title">Jadwal Pelajaran</h1>
      <p className="page-sub">{isAdmin ? 'Atur jadwal per rombel — ketuk slot untuk isi' : 'Lihat jadwal per rombel (hanya baca)'}</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="form-grid">
          <select className={inSel} value={rombelId} onChange={(e) => setRombelId(e.target.value)}>
            <option value="">— Pilih Rombel —</option>
            {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
          {rombelId && <div className="li-sub" style={{ alignSelf: 'center' }}>{terisi} slot terisi</div>}
        </div>
      </div>

      {busy ? (
        <div style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>Memuat...</div>
      ) : !rombelId ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--on-surface-variant)', padding: 28 }}>
          Pilih rombel untuk melihat / menyusun jadwal.
        </div>
      ) : (
        <div className="jd-scroll">
          <table className="jd-table">
            <thead>
              <tr>
                <th className="jd-tim">Jam</th>
                {HARI.map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOT_JAM.map((slot, si) => (
                <tr key={si}>
                  <td className="jd-tim">{slot.mulai}<br /><small>{slot.selesai}</small></td>
                  {HARI.map((h, hi) => {
                    const row = rowFor(hi + 1, si)
                    return (
                      <td key={h} className="jd-cell">
                        {row ? (
                          <button
                            className="jd-btn"
                            onClick={() => openEdit(hi + 1, si)}
                            style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
                          >
                            <b>{row.mapel?.kode ?? '?'}</b>
                            <small>{row.guru?.nama?.split(' ')[0] ?? '-'}</small>
                            {row.ruang && <small className="jd-ruang">{row.ruang}</small>}
                          </button>
                        ) : isAdmin ? (
                          <button className="jd-btn jd-empty" onClick={() => openEdit(hi + 1, si)}>
                            <span className="jd-plus">+</span>
                          </button>
                        ) : (
                          <span className="jd-polos" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal edit slot */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `${HARI[edit.hari - 1]} · jam ke-${edit.slot + 1}` : ''}
        wide
      >
        {edit && (
          <div style={{ padding: '4px 20px 20px' }}>
            <label className="lbl">Mata pelajaran *</label>
            <select className={inSel} value={eMapel} onChange={(e) => setEMapel(e.target.value)}>
              <option value="">— pilih mapel —</option>
              {mapels.map((m) => <option key={m.id} value={m.id}>{m.kode} — {m.nama}</option>)}
            </select>

            <label className="lbl">Guru pengajar</label>
            <select className={inSel} value={eGuru} onChange={(e) => setEGuru(e.target.value)}>
              <option value="">— (belum ditentukan) —</option>
              {gurus.map((g) => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div>
                <label className="lbl">Mulai</label>
                <input type="time" className={inSel} value={eMulai} onChange={(e) => setEMulai(e.target.value)} />
              </div>
              <div>
                <label className="lbl">Selesai</label>
                <input type="time" className={inSel} value={eSelesai} onChange={(e) => setESelesai(e.target.value)} />
              </div>
            </div>

            <label className="lbl">Ruang / lab</label>
            <input className={inSel} value={eRuang} onChange={(e) => setERuang(e.target.value)} placeholder="mis. R-12 / Lab Fisika" />

            <div className="modal-actions" style={{ marginTop: 18 }}>
              {edit.row?.id ? (
                <button className={btnDgr} onClick={hapusSlot} disabled={simpanBusy}>Hapus slot</button>
              ) : null}
              <span style={{ flex: 1 }} />
              <button className={btnTxt} onClick={() => setEdit(null)}>Batal</button>
              <button className={btn} onClick={simpanSlot} disabled={simpanBusy}>{simpanBusy ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}