import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Daftarkan Service Worker (PWA: install ke home screen + cache offline).
// Hanya saat production — di dev tidak perlu biar hot-reload tetap normal.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)