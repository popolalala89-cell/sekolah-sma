import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Peran } from '../lib/supabase'
import { MIcon } from '../lib/icons'
import { supabase } from '../lib/supabase'

type Stat = { siswa: number; guru: number; rombel: number; tagihanBelum: number; pemasukanBulan: number; absenHariIni: number }

export default function Dashboard({ peran, email }: { peran: Peran | null; email?: string }) {
  const judul: Record<string, string> = { admin: 'Admin TU', guru: 'Guru', wali: 'Wali Murid', siswa: 'Siswa' }
  const [stat, setStat] = useState<Stat | null>(null)

  useEffect(() => {
    if (peran !== 'admin') return
    let hidup = true
    const bulan = new Date().toISOString().slice(0, 7) + '-01'
    const bulanDepan = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 7) + '-01'
    const hariIni = new Date().toISOString().slice(0, 10)
    ;(async () => {
      const cnt = async (t: string, q: Record<string, unknown>) => {
        const { count } = await supabase.from(t).select('id', { count: 'exact', head: true }).match(q)
        return count ?? 0
      }
      const [siswa, guru, rombel, tagihanBelum, absenHariIni] = await Promise.all([
        cnt('siswa', { status: 'aktif' }),
        cnt('guru', {}),
        cnt('rombel', {}),
        supabase.from('tagihan').select('id', { count: 'exact', head: true }).eq('bulan', bulan).in('status', ['belum', 'terlambat']).then((r) => r.count ?? 0),
        cnt('absensi', { tanggal: hariIni }),
      ])
      const { data: pay } = await supabase.from('pembayaran').select('nominal').gte('created_at', bulan).lt('created_at', bulanDepan)
      const pemasukanBulan = (pay ?? []).reduce((s, p) => s + (p.nominal ?? 0), 0)
      if (hidup) setStat({ siswa, guru, rombel, tagihanBelum, pemasukanBulan, absenHariIni })
    })()
    return () => { hidup = false }
  }, [peran])

  const menu = peran === 'admin'
    ? [
        { label: 'Data Siswa', sub: 'siswa, rombel, akun', to: '/siswa', icon: 'groups' },
        { label: 'Data Guru', sub: 'profil guru', to: '/guru', icon: 'school' },
        { label: 'Rombel', sub: 'kelas & wali kelas', to: '/rombel', icon: 'meeting_room' },
        { label: 'Jurusan', sub: 'IPA / IPS / BHS', to: '/jurusan', icon: 'category' },
        { label: 'Wali Murid', sub: 'link wali ke anak', to: '/wali', icon: 'account_circle' },
        { label: 'Absensi', sub: 'input & rekap kehadiran', to: '/absensi', icon: 'event_available' },
        { label: 'Nilai', sub: 'input nilai per kelas', to: '/nilai', icon: 'scoreboard' },
        { label: 'Rapor', sub: 'rekap & cetak per siswa', to: '/rapor', icon: 'assignment' },
        { label: 'Jadwal', sub: 'susun jadwal pelajaran', to: '/jadwal', icon: 'calendar_month' },
        { label: 'Keuangan SPP', sub: 'biaya, tagihan, bayar', to: '/spp', icon: 'payments' },
      ]
    : [
        { label: 'Dashboard Saya', sub: peran === 'guru' ? 'Absensi & nilai' : 'Info anak', to: '/', icon: 'dashboard' },
        ...(peran === 'guru'
          ? [
              { label: 'Absensi', sub: 'input kehadiran', to: '/absensi', icon: 'event_available' },
              { label: 'Nilai', sub: 'input nilai kelas', to: '/nilai', icon: 'scoreboard' },
              { label: 'Rapor', sub: 'rekap & cetak', to: '/rapor', icon: 'assignment' },
            ]
          : [
              { label: 'Rapor Anak', sub: 'lihat rapor anak', to: '/rapor', icon: 'assignment' },
              { label: 'Tagihan SPP', sub: 'status pembayaran', to: '/tagihan-saya', icon: 'payments' },
            ]),
      ]

  const rupiah = (n: number) => 'Rp' + n.toLocaleString('id-ID')

  const kartu: { label: string; nilai: string; icon: string; cls: string }[] | null = stat && [
    { label: 'Siswa Aktif', nilai: String(stat.siswa), icon: 'groups', cls: 'sk-biru' },
    { label: 'Guru', nilai: String(stat.guru), icon: 'school', cls: 'sk-hijau' },
    { label: 'Rombel', nilai: String(stat.rombel), icon: 'meeting_room', cls: 'sk-ungu' },
    { label: 'Tagihan Belum Lunas', nilai: String(stat.tagihanBelum), icon: 'payments', cls: 'sk-oranye' },
    { label: 'Pemasukan Bulan Ini', nilai: rupiah(stat.pemasukanBulan), icon: 'payments', cls: 'sk-hijau' },
    { label: 'Absensi Hari Ini', nilai: String(stat.absenHariIni), icon: 'event_available', cls: 'sk-biru' },
  ]

  return (
    <div className="page-wrap">
      <h1 className="page-title">Dashboard {judul[peran ?? 'siswa']}</h1>
      <p className="page-sub">{email}</p>

      {peran === null && (
        <div className="card" style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', border: 'none' }}>
          Akunmu belum punya peran — minta admin menghubungkan akunmu.
        </div>
      )}

      {kartu && (
        <div className="stat-grid">
          {kartu.map((k) => (
            <div key={k.label} className={`stat-card ${k.cls}`}>
              <div className="stat-icon"><MIcon n={k.icon} /></div>
              <div className="stat-nilai">{k.nilai}</div>
              <div className="stat-label">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="menu-grid">
        {menu.map((m) => (
          <Link key={m.label} to={m.to} className="menu-tile">
            <div className="mt-icon"><MIcon n={m.icon} /></div>
            <div className="mt-label">{m.label}</div>
            <div className="mt-sub">{m.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}