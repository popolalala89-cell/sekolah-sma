import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Link } from 'react-router-dom'
import {
  listSiswa, simpanSiswa, hapusSiswa, tahunAktifId, listRombel,
  rombelSiswaMap, setRombelSiswa, buatAkunSiswa,
  type Siswa, type Rombel,
} from '../lib/db'
import { supabase } from '../lib/supabase'
import { Modal, useToast, inSel, btn, btnKms, btnDgr } from '../lib/ui'

export default function SiswaPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Siswa[]>([])
  const [tahunId, setTahunId] = useState<string | null>(null)
  const [rombels, setRombels] = useState<Rombel[]>([])
  const [rMap, setRMap] = useState<Map<string, string>>(new Map())
  const [cari, setCari] = useState('')
  const [busy, setBusy] = useState(true)

  const [form, setForm] = useState<Partial<Siswa> & { rombel_id?: string }>({})
  const [open, setOpen] = useState(false)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([])
  const [csvOpen, setCsvOpen] = useState(false)
  const [sedangImport, setSedangImport] = useState(false)

  const muat = async () => {
    const t = await tahunAktifId()
    setTahunId(t)
    const [s, r, rm] = await Promise.all([
      listSiswa(),
      t ? listRombel(t) : Promise.resolve([]),
      t ? rombelSiswaMap(t) : Promise.resolve(new Map<string, string>()),
    ])
    setRows(s); setRombels(r); setRMap(rm)
  }

  useEffect(() => {
    muat().catch((e: Error) => toast(e.message, 'err')).finally(() => setBusy(false))
  }, [])

  const namaRombelMap = useMemo(() => {
    const byId = new Map(rombels.map((x) => [x.id, x.nama]))
    const out = new Map<string, string>()
    rMap.forEach((rid, sid) => { const n = byId.get(rid); if (n) out.set(sid, n) })
    return out
  }, [rombels, rMap])

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return rows.filter((r) => !q || r.nama.toLowerCase().includes(q) || r.nisn.toLowerCase().includes(q))
  }, [rows, cari])

  async function simpan() {
    if (!form.nama?.trim() || !form.nisn?.trim()) return toast('NISN & nama wajib diisi', 'err')
    try {
      const id = await simpanSiswa(form as Partial<Siswa> & { nama: string; nisn: string })
      if (form.rombel_id && tahunId) await setRombelSiswa(id!, form.rombel_id, tahunId)
      toast('Tersimpan', 'ok')
      setOpen(false)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function hapus() {
    if (!hapusId) return
    try {
      await hapusSiswa(hapusId)
      toast('Terhapus', 'ok')
      setHapusId(null)
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  async function buatAkun(s: Siswa) {
    try {
      const email = await buatAkunSiswa(s, s.nisn)
      toast(`Akun dibuat: ${email} / sandi: ${s.nisn}`, 'ok')
      await muat()
    } catch (e: any) { toast(e.message, 'err') }
  }

  function pilihCSV(f: File | null) {
    if (!f) return
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => { setCsvRows(res.data); setCsvPreview(res.data.slice(0, 5)) },
    })
  }

  async function imporCSV() {
    if (csvRows.length === 0) return toast('File tidak berisi data', 'err')
    setSedangImport(true)
    let ok = 0
    const errs: string[] = []
    for (let i = 0; i < csvRows.length; i += 100) {
      const batch = csvRows.slice(i, i + 100)
        .filter((r) => r.nisn?.trim() && r.nama?.trim())
        .map((r) => ({
          nisn: r.nisn.trim(), nama: r.nama.trim(),
          gender: r.gender === 'P' || r.gender === 'L' ? r.gender : null,
          tempat_lahir: r.tempat_lahir?.trim() || null,
          tgl_lahir: r.tgl_lahir?.trim() || null,
          alamat: r.alamat?.trim() || null,
          telepon: r.telepon?.trim() || null,
          angkatan: r.angkatan ? Number(r.angkatan) : null,
        }))
      if (batch.length === 0) continue
      try {
        const { error } = await supabase.from('siswa').insert(batch)
        if (error) throw error
        ok += batch.length
      } catch (e: any) { errs.push(e.message) }
    }
    setSedangImport(false)
    setCsvOpen(false)
    setCsvRows([])
    await muat()
    if (errs.length === 0) toast(`Import selesai: ${ok} siswa masuk`, 'ok')
    else toast(`${ok} masuk, ${errs.length} batch gagal`, 'err')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-800">Data Siswa <span className="text-sm text-slate-400 font-normal">({rows.length})</span></h2>
          <div className="flex gap-2">
            <button className={btnKms} onClick={() => setCsvOpen(true)}>⬆ Import CSV</button>
            <button className={btn} onClick={() => { setForm({ gender: 'L' }); setOpen(true) }}>+ Tambah</button>
          </div>
        </div>
        <Link to="/" className="text-blue-600 text-sm">← Dashboard</Link>
        <input className={inSel + ' max-w-xs'} placeholder="Cari nama / NISN..." value={cari} onChange={(e) => setCari(e.target.value)} />

        <div className="bg-white rounded-xl shadow divide-y">
          {busy ? <p className="p-4 text-sm text-slate-400">Memuat...</p> : tampil.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Belum ada siswa</p>
          ) : tampil.map((s) => (
            <div key={s.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-medium text-slate-800">{s.nama}
                  {s.gender && <span className={`ml-2 text-[10px] px-2 py-0.5 rounded ${s.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{s.gender}</span>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {s.nisn} · {namaRombelMap.get(s.id) ?? 'belum dirombel'} · {s.user_id ? 'akun ada' : 'belum ada akun'}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {!s.user_id && <button className={btn} onClick={() => buatAkun(s)}>Buat Akun</button>}
                <button className={btnKms} onClick={() => { setForm({ ...s, rombel_id: rMap.get(s.id) }); setOpen(true) }}>Edit</button>
                <button className={btnDgr} onClick={() => setHapusId(s.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit Siswa' : 'Siswa Baru'} wide>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm col-span-1">
            <span className="text-slate-600">NISN *</span>
            <input className={inSel + ' mt-1'} value={form.nisn ?? ''} onChange={(e) => setForm({ ...form, nisn: e.target.value })} />
          </label>
          <label className="block text-sm col-span-1">
            <span className="text-slate-600">Nama lengkap *</span>
            <input className={inSel + ' mt-1'} value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Gender</span>
            <select className={inSel + ' mt-1'} value={form.gender ?? 'L'} onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Rombel (tahun aktif)</span>
            <select className={inSel + ' mt-1'} value={form.rombel_id ?? ''} onChange={(e) => setForm({ ...form, rombel_id: e.target.value || undefined })}>
              <option value="">— tanpa rombel —</option>
              {rombels.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Tempat lahir</span>
            <input className={inSel + ' mt-1'} value={form.tempat_lahir ?? ''} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Tanggal lahir</span>
            <input type="date" className={inSel + ' mt-1'} value={form.tgl_lahir ?? ''} onChange={(e) => setForm({ ...form, tgl_lahir: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Angkatan</span>
            <input type="number" className={inSel + ' mt-1'} value={form.angkatan ?? ''} onChange={(e) => setForm({ ...form, angkatan: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Telepon</span>
            <input className={inSel + ' mt-1'} value={form.telepon ?? ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
          </label>
          <label className="block text-sm col-span-2">
            <span className="text-slate-600">Alamat</span>
            <input className={inSel + ' mt-1'} value={form.alamat ?? ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
          </label>
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <button className={btnKms} onClick={() => setOpen(false)}>Batal</button>
          <button className={btn} onClick={simpan}>Simpan</button>
        </div>
      </Modal>

      <Modal open={csvOpen} onClose={() => setCsvOpen(false)} title="Import CSV" wide>
        <p className="text-xs text-slate-500 mb-3">
          Kolom yang didukung: <code className="bg-slate-100 px-1 rounded">nisn*, nama*, gender (L/P), tempat_lahir, tgl_lahir (YYYY-MM-DD), alamat, telepon, angkatan</code>
        </p>
        <input type="file" accept=".csv,text/csv" className="text-sm mb-3" onChange={(e) => pilihCSV(e.target.files?.[0] ?? null)} />
        {csvPreview.length > 0 && (
          <>
            <div className="text-xs text-slate-500 mb-1">Pratinjau {csvPreview.length} baris pertama (total {csvRows.length}):</div>
            <div className="overflow-auto border rounded-lg mb-3">
              <table className="text-xs w-full">
                <thead><tr className="bg-slate-50 text-left">
                  {Object.keys(csvPreview[0] ?? {}).map((k) => <th key={k} className="px-2 py-1 font-medium">{k}</th>)}
                </tr></thead>
                <tbody>
                  {csvPreview.map((r, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(r).map((v, j) => <td key={j} className="px-2 py-1">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={btn} disabled={sedangImport} onClick={imporCSV}>
              {sedangImport ? 'Mengimpor...' : `Import ${csvRows.length} siswa`}
            </button>
          </>
        )}
      </Modal>

      <Modal open={!!hapusId} onClose={() => setHapusId(null)} title="Konfirmasi Hapus">
        <p className="text-sm text-slate-600 mb-4">Hapus siswa ini? Nilai, absensi, dan tagihan terkait ikut terhapus.</p>
        <div className="flex gap-2 justify-end">
          <button className={btnKms} onClick={() => setHapusId(null)}>Batal</button>
          <button className={btnDgr} onClick={hapus}>Ya, hapus</button>
        </div>
      </Modal>
    </div>
  )
}