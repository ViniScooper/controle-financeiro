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

// Mock / Estado padrão offline
export const DEFAULT_FINANCE_STATE = {
  perfil: {
    nome: "Usuário FinControl",
    cidade: "São Paulo, SP",
    email: "usuario@exemplo.com",
    senha: "123",
    rendaLiquida: 4400.00,
    rendaExtraMes: 0.00,
    motivoRendaExtra: "",
    meta: "Controle rigoroso de gastos, quitação de dívidas e reserva de emergência"
  },
  dividaItau: {
    banco: "Itaú Click",
    faturaAgosto: 8390.72,
    entradaAgostoPaga: 797.12,
    saldoFinanciadoComIOF: 7697.30,
    taxaJurosMensal: "12,9% a.m.",
    taxaJurosAnual: "337,63% a.a.",
    jurosTotais: 3915.28,
    valorTotalAcordo: 11612.58,
    quantidadeParcelas: 6,
    valorParcela: 1935.43
  },
  parcelas: [
    {
      id: 1,
      numero: 1,
      vencimento: "2026-09-05",
      valor: 1935.43,
      paga: true,
      dataPagamento: "2026-09-05",
      observacao: "1ª parcela do acordo Itaú paga em dia"
    },
    {
      id: 2,
      numero: 2,
      vencimento: "2026-10-05",
      valor: 1935.43,
      paga: false,
      dataPagamento: null,
      observacao: "Pagar parcela regular + antecipar com 1ª parcela do 13º salário"
    },
    {
      id: 3,
      numero: 3,
      vencimento: "2026-11-05",
      valor: 1935.43,
      paga: false,
      dataPagamento: null,
      observacao: "Pagar parcela regular + antecipar com 2ª parcela do 13º (Expectativa de quitação total!)"
    },
    {
      id: 4,
      numero: 4,
      vencimento: "2026-12-05",
      valor: 1935.43,
      paga: false,
      dataPagamento: null,
      observacao: "4ª parcela (se necessária) + 3ª parcela do 13º salário"
    },
    {
      id: 5,
      numero: 5,
      vencimento: "2027-01-05",
      valor: 1935.43,
      paga: false,
      dataPagamento: null,
      observacao: "5ª parcela (Penúltima)"
    },
    {
      id: 6,
      numero: 6,
      vencimento: "2027-02-05",
      valor: 1935.43,
      paga: false,
      dataPagamento: null,
      observacao: "6ª parcela (Última)"
    }
  ],
  gastosFixos: [
    { id: 1, nome: "Jiu-jitsu", valor: 180.00, categoria: "Esporte", pago: true },
    { id: 2, nome: "Academia", valor: 160.00, categoria: "Saúde", pago: true },
    { id: 3, nome: "Remédio TDAH", valor: 180.00, categoria: "Saúde", pago: true },
    { id: 4, nome: "Dentista (manutenção)", valor: 80.00, categoria: "Saúde", pago: true },
    { id: 5, nome: "Internet Celular", valor: 60.00, categoria: "Essencial", pago: true }
  ],
  despesasVariaveis: [
    {
      id: "tx-1",
      descricao: "Almoço e lanches semanais",
      valor: 145.00,
      categoria: "Alimentação",
      data: "2026-09-18"
    },
    {
      id: "tx-2",
      descricao: "Supermercado itens essenciais",
      valor: 210.50,
      categoria: "Supermercado",
      data: "2026-09-20"
    }
  ],
  faturasCartoes: [
    {
      id: "fatura-picpay",
      nome: "Fatura PicPay",
      valor: 600.00,
      vencimento: "2026-10-19",
      mesReferencia: "Outubro / 2026",
      paga: false,
      dataPagamento: null,
      categoria: "Cartão de Crédito",
      observacao: "Fatura variável (geralmente entre R$ 300 e R$ 600). Vence dia 19/10/2026."
    }
  ],
  metas: [
    {
      id: "meta-1",
      titulo: "Quitação Total Acordo Itaú",
      categoria: "Dívida",
      valorAlvo: 11612.58,
      valorAtual: 1935.43,
      dataAlvo: "2026-12-31",
      icone: "💳",
      descricao: "Eliminar 100% dos juros do cartão antecipando parcelas com o 13º salário."
    },
    {
      id: "meta-2",
      titulo: "Reserva de Emergência",
      categoria: "Segurança",
      valorAlvo: 5000.00,
      valorAtual: 200.00,
      dataAlvo: "2027-03-31",
      icone: "🛡️",
      descricao: "Meta inicial para imprevistos de saúde e manutenção, reforçada pelo saque FGTS em março."
    },
    {
      id: "meta-3",
      titulo: "Viagem de Descanso",
      categoria: "Lazer",
      valorAlvo: 3000.00,
      valorAtual: 0.00,
      dataAlvo: "2027-07-31",
      icone: "✈️",
      descricao: "Viagem comemorativa pós-quitação das dívidas."
    }
  ],
  planejamentoExtra: [
    {
      id: "ext-1",
      titulo: "13º Salário (Out, Nov, Dez)",
      tipo: "entrada_estrategica",
      descricao: "Recebido parcelado. Manter pagamento fixo e antecipar parcelas finais diretamente no app do Itaú para abater juros abusivos."
    },
    {
      id: "ext-2",
      titulo: "Emergência Médica (20/10/2026)",
      tipo: "imprevisto",
      valor: 700.00,
      data: "2026-10-20",
      status: "provisionado",
      descricao: "Despesa pontual de aprox. R$ 700 decorrente de duas emergências médicas. Absorvida com auxílio da 1ª parcela do 13º mantendo saldo de R$ 2.570."
    },
    {
      id: "ext-3",
      titulo: "Saque-Aniversário FGTS (Março/2027)",
      tipo: "entrada_extra",
      valor: 2000.00,
      data: "2027-03-01",
      descricao: "Entrada extra de R$ 2.000,00 elevando a renda do mês para R$ 6.400,00."
    }
  ]
};

export function calculateFinancialSummary(data) {
  const renda = Number(data.perfil?.rendaLiquida || 4400);
  const rendaExtra = Number(data.perfil?.rendaExtraMes || 0);
  const rendaTotalMes = renda + rendaExtra;

  const valorParcela = Number(data.dividaItau?.valorParcela || 1935.43);
  const totalFixos = (data.gastosFixos || []).reduce((acc, g) => acc + Number(g.valor || 0), 0);
  const totalComprometido = valorParcela + totalFixos;
  const saldoLivreBase = rendaTotalMes - totalComprometido;

  const totalVariavel = (data.despesasVariaveis || []).reduce((acc, d) => acc + Number(d.valor || 0), 0);
  const saldoLivreAtual = Math.max(0, saldoLivreBase - totalVariavel);

  const parcelas = data.parcelas || [];
  const parcelasPagas = parcelas.filter(p => p.paga);
  const totalAmortizado = parcelasPagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const valorTotalAcordo = Number(data.dividaItau?.valorTotalAcordo || 11612.58);
  const saldoDevedorRestante = Math.max(0, valorTotalAcordo - totalAmortizado);
  const percentualQuitado = Math.min(100, Math.round((totalAmortizado / valorTotalAcordo) * 100));

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
