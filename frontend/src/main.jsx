import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── LIMPEZA AUTOMÁTICA DE CACHE EM TODOS OS DISPOSITIVOS ──
// Garante que versões antigas de ServiceWorkers ou caches locais sejam resetadas
if (typeof window !== "undefined") {
  // Limpa Service Workers antigos se existirem
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
  // Limpa caches antigos do navegador
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
