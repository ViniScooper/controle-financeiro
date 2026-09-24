// ============================================================
// frontend/src/config/environment.js
// Configuração de API com detecção automática (Vercel, Local, VPS/Oracle)
// ============================================================

const ENV_API_URL = import.meta.env.VITE_API_URL;

// URL do túnel ativo ou IP da VM Oracle Cloud
const ORACLE_TUNNEL_URL = 'https://lodge-risks-concrete-loved.trycloudflare.com';

function resolveBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Se estiver na Vercel ou qualquer domínio público
    if (host.includes('vercel.app')) {
      return ORACLE_TUNNEL_URL;
    }
    // Se estiver rodando localmente
    if (host === 'localhost' || host === '127.0.0.1') {
      return ENV_API_URL || 'http://localhost:3001';
    }
    // Se estiver rodando na mesma rede Wi-Fi do celular
    if (host.startsWith('192.168.') || host.startsWith('10.0.')) {
      return `http://${host}:3001`;
    }
  }

  return ENV_API_URL || ORACLE_TUNNEL_URL;
}

export const BASE_API_URL = resolveBaseUrl().replace(/\/+$/, '');

export function getApiUrl(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_API_URL}${clean}`;
}
