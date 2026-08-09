import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { MIcon } from './icons'

// ── Snackbar (toast) MD3 ─────────────────────────────────────────
interface ToastPack { msg: string; kind: 'ok' | 'err' | 'info'; id: number }
const ToastCtx = createContext<(msg: string, kind?: ToastPack['kind']) => void>(() => {})

export function useToast() { return useContext(ToastCtx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastPack[]>([])
  const show = useCallback((msg: string, kind: ToastPack['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setList((l) => [...l, { msg, kind, id }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200)
  }, [])
  const ikon = { ok: 'check_circle', err: 'error', info: 'info' } as const
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toast-stack">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'err' ? 'err' : ''}`}>
            <MIcon n={ikon[t.kind]} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ── Modal bottom-sheet MD3 ───────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        style={wide ? { maxWidth: 640 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-grip" />
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">
            <MIcon n="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Konfirmasi hapus MD3 ─────────────────────────────────────────
export function Confirm({ open, onClose, onYes, title, desc }: {
  open: boolean; onClose: () => void; onYes: () => void; title: string; desc: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="li-sub" style={{ marginBottom: 4 }}>{desc}</p>
      <div className="modal-actions">
        <button className="btn btn-text" onClick={onClose}>Batal</button>
        <button className="btn btn-error btn-sm" onClick={onYes}>Ya, hapus</button>
      </div>
    </Modal>
  )
}

// ── Atribut input MD3 ────────────────────────────────────────────
export const inSel = 'inp'
export const selCls = 'sel'
export const btn = 'btn btn-fill'
export const btnKms = 'btn btn-outline'
export const btnDgr = 'btn btn-error btn-sm'
export const btnTxt = 'btn btn-text'
