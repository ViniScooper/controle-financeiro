const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'finance_data.json');

const INITIAL_DATA = {
  perfil: {
    nome: process.env.ADMIN_NAME || "Administrador",
    cidade: "Brasil",
    email: process.env.ADMIN_EMAIL || "admin@controlefinanceiro.com",
    senha: "admin",
    rendaLiquida: 4400.00,
    rendaExtraMes: 0.00,
    motivoRendaExtra: "",
    meta: "Controle financeiro pessoal e quitação de despesas"
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

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
  }
}

function getData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Assegura campos de metas e perfil
    if (!parsed.metas) parsed.metas = INITIAL_DATA.metas;
    if (parsed.perfil && parsed.perfil.rendaExtraMes === undefined) {
      parsed.perfil.rendaExtraMes = 0;
      parsed.perfil.motivoRendaExtra = "";
      parsed.perfil.email = process.env.ADMIN_EMAIL || "admin@controlefinanceiro.com";
      parsed.perfil.senha = "admin";
    }
    return parsed;
  } catch (err) {
    console.error("Erro ao ler finance_data.json:", err);
    return INITIAL_DATA;
  }
}

function saveData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function resetData() {
  return saveData(INITIAL_DATA);
}

module.exports = {
  getData,
  saveData,
  resetData,
  INITIAL_DATA
};
