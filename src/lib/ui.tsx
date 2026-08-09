import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// ── Toast ────────────────────────────────────────────────────────
interface ToastPack { msg: string; kind: 'ok' | 'err' | 'info'; id: number }
const ToastCtx = createContext<(msg: string, kind?: ToastPack['kind']) => void>(() => {})

export function useToast() { return useContext(ToastCtx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastPack[]>([])
  const show = useCallback((msg: string, kind: ToastPack['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setList((l) => [...l, { msg, kind, id }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3000)
  }, [])
  const warna = { ok: 'bg-green-600', err: 'bg-red-600', info: 'bg-slate-800' } as const
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2 z-50 w-72">
        {list.map((t) => (
          <div key={t.id} className={`${warna[t.kind]} text-white text-sm rounded-lg px-4 py-2 shadow-lg text-center`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Atribut kecil ─────────────────────────────────────────────────
export const inSel = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
export const btn = 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50'
export const btnKms = 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm font-medium'
export const btnDgr = 'bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium'