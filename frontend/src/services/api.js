import axios from 'axios';
import { BASE_API_URL } from '../config/environment';

export const API_BASE_URL = BASE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000
});

// Interceptor para JWT e anti-cache
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
  return config;
});

// Mock / Estado padrão limpo para novos usuários ou offline
export const DEFAULT_FINANCE_STATE = {
  perfil: {
    nome: "Usuário FinControl",
    cidade: "Brasil",
    email: "",
    senha: "",
    rendaLiquida: 0.00,
    rendaExtraMes: 0.00,
    motivoRendaExtra: "",
    meta: "Controle financeiro pessoal e quitação de despesas"
  },
  dividaItau: null, // Sem dívidas pré-cadastradas
  parcelas: [],
  gastosFixos: [],
  despesasVariaveis: [],
  faturasCartoes: [],
  metas: [],
  planejamentoExtra: []
};

export function calculateFinancialSummary(data = {}) {
  const renda = Number(data.perfil?.rendaLiquida || 0);
  const rendaExtra = Number(data.perfil?.rendaExtraMes || 0);
  const rendaTotalMes = renda + rendaExtra;

  const parcelas = data.parcelas || [];
  const parcelasPagas = parcelas.filter(p => p.paga);
  const totalAmortizado = parcelasPagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);

  // Dívidas / Acordos: só calcula se o usuário de fato cadastrou uma dívida
  const temDivida = Boolean(data.dividaItau && (Number(data.dividaItau.valorTotalAcordo) > 0 || Number(data.dividaItau.valorParcela) > 0));
  const valorParcela = temDivida ? Number(data.dividaItau?.valorParcela || (parcelas.length > 0 ? parcelas[0].valor : 0)) : 0;
  const valorTotalAcordo = temDivida ? Number(data.dividaItau?.valorTotalAcordo || 0) : 0;
  const saldoDevedorRestante = temDivida ? Math.max(0, valorTotalAcordo - totalAmortizado) : 0;
  const percentualQuitado = valorTotalAcordo > 0 ? Math.min(100, Math.round((totalAmortizado / valorTotalAcordo) * 100)) : 0;

  const totalFixos = (data.gastosFixos || []).reduce((acc, g) => acc + Number(g.valor || 0), 0);
  const totalComprometido = valorParcela + totalFixos;
  const saldoLivreBase = rendaTotalMes - totalComprometido;

  const totalVariavel = (data.despesasVariaveis || []).reduce((acc, d) => acc + Number(d.valor || 0), 0);
  const saldoLivreAtual = Math.max(0, saldoLivreBase - totalVariavel);

  const faturasCartoes = data.faturasCartoes || [];
  const totalFaturasCartoes = faturasCartoes.reduce((acc, f) => acc + Number(f.valor || 0), 0);
  const totalFaturasPendentes = faturasCartoes.filter(f => !f.paga).reduce((acc, f) => acc + Number(f.valor || 0), 0);

  const totalMetasAlvo = (data.metas || []).reduce((acc, m) => acc + Number(m.valorAlvo || 0), 0);
  const totalMetasPoupado = (data.metas || []).reduce((acc, m) => acc + Number(m.valorAtual || 0), 0);

  return {
    renda,
    rendaExtra,
    rendaTotalMes,
    motivoRendaExtra: data.perfil?.motivoRendaExtra || '',
    valorParcela,
    totalFixos,
    totalFaturasCartoes,
    totalFaturasPendentes,
    faturasCartoesCount: faturasCartoes.length,
    totalComprometido,
    saldoLivreBase,
    totalVariavel,
    saldoLivreAtual,
    parcelasPagasCount: parcelasPagas.length,
    totalParcelas: parcelas.length,
    totalAmortizado,
    valorTotalAcordo,
    saldoDevedorRestante,
    percentualQuitado,
    totalMetasAlvo,
    totalMetasPoupado
  };
}

export default api;
