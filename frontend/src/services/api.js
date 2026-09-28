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
  dividas: [], // Lista de dívidas e acordos com parcelas individuais
  dividaItau: null, // Legado / retrocompatibilidade
  parcelas: [],
  gastosFixos: [],
  despesasVariaveis: [],
  faturasCartoes: [],
  tetosGastos: [
    { id: "teto-1", categoria: "Alimentação", valorTeto: 600.00, cor: "#10b981" },
    { id: "teto-2", categoria: "Saúde", valorTeto: 500.00, cor: "#3b82f6" },
    { id: "teto-3", categoria: "Supermercado", valorTeto: 700.00, cor: "#8b5cf6" },
    { id: "teto-4", categoria: "Esporte", valorTeto: 350.00, cor: "#ec4899" },
    { id: "teto-5", categoria: "Lazer", valorTeto: 300.00, cor: "#f59e0b" },
    { id: "teto-6", categoria: "Essencial", valorTeto: 200.00, cor: "#64748b" }
  ],
  metas: [],
  planejamentoExtra: []
};

export function calculateFinancialSummary(data = {}) {
  const renda = Number(data.perfil?.rendaLiquida || 0);
  const rendaExtra = Number(data.perfil?.rendaExtraMes || 0);
  const rendaTotalMes = renda + rendaExtra;

  // Unifica dívidas: usa data.dividas se existir ou migra dividaItau legado
  let listaDividas = Array.isArray(data.dividas) ? [...data.dividas] : [];
  if (listaDividas.length === 0 && data.dividaItau && (Number(data.dividaItau.valorTotalAcordo) > 0 || Number(data.dividaItau.valorParcela) > 0)) {
    listaDividas.push({
      id: 'divida-itau',
      banco: data.dividaItau.banco || 'Itaú Click',
      valorTotalAcordo: Number(data.dividaItau.valorTotalAcordo || 0),
      valorParcela: Number(data.dividaItau.valorParcela || 0),
      quantidadeParcelas: Number(data.dividaItau.quantidadeParcelas || data.parcelas?.length || 6),
      observacao: 'Acordo Itaú Click',
      parcelas: Array.isArray(data.parcelas) ? data.parcelas : []
    });
  }

  let totalAmortizado = 0;
  let valorTotalAcordo = 0;
  let valorParcelaMensal = 0;
  let parcelasPagasCount = 0;
  let totalParcelasCount = 0;

  listaDividas.forEach(d => {
    const parcs = Array.isArray(d.parcelas) ? d.parcelas : [];
    totalParcelasCount += parcs.length;
    const pagas = parcs.filter(p => p.paga);
    parcelasPagasCount += pagas.length;
    totalAmortizado += pagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    valorTotalAcordo += Number(d.valorTotalAcordo || (parcs.reduce((acc, p) => acc + Number(p.valor || 0), 0)));

    const proxNaoPaga = parcs.find(p => !p.paga);
    if (proxNaoPaga) {
      valorParcelaMensal += Number(proxNaoPaga.valor || d.valorParcela || 0);
    } else if (parcs.length === 0 && d.valorParcela) {
      valorParcelaMensal += Number(d.valorParcela || 0);
    }
  });

  const saldoDevedorRestante = Math.max(0, valorTotalAcordo - totalAmortizado);
  const percentualQuitado = valorTotalAcordo > 0 ? Math.min(100, Math.round((totalAmortizado / valorTotalAcordo) * 100)) : 0;

  const totalFixos = (data.gastosFixos || []).reduce((acc, g) => acc + Number(g.valor || 0), 0);
  const totalComprometido = valorParcelaMensal + totalFixos;
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
    valorParcela: valorParcelaMensal,
    totalFixos,
    totalFaturasCartoes,
    totalFaturasPendentes,
    faturasCartoesCount: faturasCartoes.length,
    totalComprometido,
    saldoLivreBase,
    totalVariavel,
    saldoLivreAtual,
    parcelasPagasCount,
    totalParcelas: totalParcelasCount,
    totalAmortizado,
    valorTotalAcordo,
    saldoDevedorRestante,
    percentualQuitado,
    totalMetasAlvo,
    totalMetasPoupado,
    dividasCount: listaDividas.length
  };
}

export default api;
