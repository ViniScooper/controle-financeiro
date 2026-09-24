const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const https = require('https');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const { parseBankStatement } = require('../services/statementParser');
const oracleAtp = require('../data/oracleAtpService');

const JWT_SECRET = process.env.JWT_SECRET || 'fincontrol_jwt_secret_key_default';

// Dispara mensagem no WhatsApp via CallMeBot
function sendCallMeBot(phone, apiKey, message) {
  return new Promise((resolve) => {
    if (!phone || !apiKey) {
      return resolve({ success: false, erro: 'Telefone ou chave API do CallMeBot não configurados.' });
    }
    const cleanPhone = String(phone).replace(/\D/g, '');
    const cleanKey = String(apiKey).trim();
    const encodedText = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedText}&apikey=${cleanKey}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ success: true, response: data });
      });
    }).on('error', (err) => {
      console.error('[CallMeBot] Erro ao enviar mensagem:', err.message);
      resolve({ success: false, erro: err.message });
    });
  });
}

// Extrai e-mail do usuário autenticado via JWT ou headers
function getUserEmail(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.email) return decoded.email.toLowerCase();
    } catch (e) {}
  }
  if (req.headers['x-user-email']) return String(req.headers['x-user-email']).toLowerCase();
  if (req.query && req.query.userEmail) return String(req.query.userEmail).toLowerCase();
  return null;
}

function computeSummary(data) {
  const rendaBase = Number(data.perfil?.rendaLiquida || 0);
  const rendaExtra = Number(data.perfil?.rendaExtraMes || 0);
  const rendaTotalMes = rendaBase + rendaExtra;

  const valorParcela = Number(data.dividaItau?.valorParcela || 0);
  const totalFixos = (data.gastosFixos || []).reduce((acc, g) => acc + Number(g.valor || 0), 0);
  const totalComprometido = valorParcela + totalFixos;
  const saldoLivreBase = rendaTotalMes - totalComprometido;

  const totalVariavel = (data.despesasVariaveis || []).reduce((acc, d) => acc + Number(d.valor || 0), 0);
  const saldoLivreAtual = Math.max(0, saldoLivreBase - totalVariavel);

  const parcelas = data.parcelas || [];
  const parcelasPagas = parcelas.filter(p => p.paga);
  const totalAmortizado = parcelasPagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const valorTotalAcordo = Number(data.dividaItau?.valorTotalAcordo || 0);
  const saldoDevedorRestante = Math.max(0, valorTotalAcordo - totalAmortizado);
  const percentualQuitado = valorTotalAcordo > 0
    ? Math.min(100, Math.round((totalAmortizado / valorTotalAcordo) * 100))
    : 0;

  const faturasCartoes = data.faturasCartoes || [];
  const totalFaturasCartoes = faturasCartoes.reduce((acc, f) => acc + Number(f.valor || 0), 0);
  const totalFaturasPendentes = faturasCartoes.filter(f => !f.paga).reduce((acc, f) => acc + Number(f.valor || 0), 0);

  const totalMetasAlvo = (data.metas || []).reduce((acc, m) => acc + Number(m.valorAlvo || 0), 0);
  const totalMetasPoupado = (data.metas || []).reduce((acc, m) => acc + Number(m.valorAtual || 0), 0);

  return {
    renda: rendaBase,
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

// GET /api/finance/data
router.get('/data', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ success: false, erro: 'Usuário não autenticado.' });
    }
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord || !userRecord.data) {
      return res.status(404).json({ success: false, erro: 'Dados do usuário não encontrados.' });
    }

    const data = userRecord.data;
    const summary = computeSummary(data);

    return res.json({
      success: true,
      database: "Oracle Autonomous Database (CLOUDOPSHUB ATP Always Free)",
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PUT /api/finance/profile
router.put('/profile', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const {
      nome,
      cidade,
      email,
      senha,
      rendaLiquida,
      rendaExtraMes,
      motivoRendaExtra,
      whatsappPhone,
      whatsappApiKey,
      notificacoesWppAtivas,
      diaLembreteWpp
    } = req.body;

    if (nome) data.perfil.nome = String(nome).trim();
    if (cidade) data.perfil.cidade = String(cidade).trim();
    if (email) data.perfil.email = String(email).trim().toLowerCase();
    if (senha) {
      data.perfil.senha = String(senha);
      data.perfil.senhaTemporaria = false;
    }
    if (rendaLiquida !== undefined && !isNaN(Number(rendaLiquida))) {
      data.perfil.rendaLiquida = Math.abs(Number(rendaLiquida));
    }
    if (rendaExtraMes !== undefined && !isNaN(Number(rendaExtraMes))) {
      data.perfil.rendaExtraMes = Math.abs(Number(rendaExtraMes));
    }
    if (motivoRendaExtra !== undefined) {
      data.perfil.motivoRendaExtra = String(motivoRendaExtra).trim();
    }
    if (whatsappPhone !== undefined) {
      data.perfil.whatsappPhone = String(whatsappPhone).trim();
    }
    if (whatsappApiKey !== undefined) {
      data.perfil.whatsappApiKey = String(whatsappApiKey).trim();
    }
    if (notificacoesWppAtivas !== undefined) {
      data.perfil.notificacoesWppAtivas = Boolean(notificacoesWppAtivas);
    }
    if (diaLembreteWpp !== undefined && !isNaN(Number(diaLembreteWpp))) {
      data.perfil.diaLembreteWpp = Number(diaLembreteWpp);
    }

    await oracleAtp.saveUser(userEmail, data.perfil.nome, data.perfil.senha || userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Perfil, renda e dados do WhatsApp salvos no Oracle ATP!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/notify-whatsapp (Disparar lembrete ou teste via CallMeBot)
router.post('/notify-whatsapp', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { tipo } = req.body || {};
    const phone = data.perfil?.whatsappPhone || process.env.ADMIN_WHATSAPP_PHONE || '';
    const apiKey = data.perfil?.whatsappApiKey || process.env.CALLMEBOT_API_KEY || '';

    if (!phone || !apiKey) {
      return res.status(400).json({
        success: false,
        erro: 'Configure seu número com DDI e a chave do CallMeBot na aba Perfil antes de disparar!'
      });
    }

    let mensagem = '';
    const nome = data.perfil?.nome?.split(' ')[0] || 'Usuário';

    if (tipo === 'teste') {
      mensagem = `🔔 *TESTE DE NOTIFICAÇÃO - CONTROLE FINANCEIRO*\n\n` +
        `Olá, ${nome}! 🚀\n` +
        `O seu Robô de WhatsApp está *conectado e pronto* para te alertar sobre suas faturas!\n\n` +
        `🔗 *Acesse seu painel:* https://controle-financeiro-mauve-two.vercel.app/\n` +
        `👤 *Usuário:* ${data.perfil?.email || userEmail}\n` +
        `🔑 *Senha cadastrada:* ${data.perfil?.senha || '***'}\n\n` +
        `⚡ _Notificações inteligentes do seu agente financeiro._`;
    } else {
      // Monta lembrete das contas pendentes
      const proxParcela = (data.parcelas || []).find(p => !p.paga);
      const faturasPendentes = (data.faturasCartoes || []).filter(f => !f.paga);
      const fixosPendentes = (data.gastosFixos || []).filter(g => !g.pago);

      let detalhesContas = '';
      if (proxParcela) {
        detalhesContas += `💳 *${data.dividaItau?.banco || 'Itaú Click'}:* Parcela ${proxParcela.numero} de R$ ${Number(proxParcela.valor).toFixed(2).replace('.', ',')} (Vence dia 05)\n`;
      }
      faturasPendentes.forEach(fat => {
        detalhesContas += `💳 *${fat.nome}:* R$ ${Number(fat.valor).toFixed(2).replace('.', ',')} (Vence dia ${fat.vencimento ? fat.vencimento.split('-')[2] : '19'} - Variável)\n`;
      });
      if (fixosPendentes.length > 0) {
        const totalFixosP = fixosPendentes.reduce((acc, f) => acc + Number(f.valor || 0), 0);
        detalhesContas += `🛡️ *Gastos Fixos:* R$ ${totalFixosP.toFixed(2).replace('.', ',')} (${fixosPendentes.length} contas)\n`;
      }

      mensagem = `🚨 *LEMBRETE DE PAGAMENTO - CONTROLE FINANCEIRO*\n\n` +
        `Olá, ${nome}!\n` +
        `Chegou o dia de planejar e pagar suas contas do mês:\n\n` +
        detalhesContas + `\n` +
        `👉 *Acesse agora para conferir valores e marcar se já foram pagas:*\n` +
        `🔗 https://controle-financeiro-mauve-two.vercel.app/\n\n` +
        `👤 *Seu Usuário:* ${data.perfil?.email || userEmail}\n` +
        `🔑 *Sua Senha:* ${data.perfil?.senha || '***'}\n\n` +
        `💡 _Mantenha seus pagamentos em dia para zerar os juros!_`;
    }

    const envio = await sendCallMeBot(phone, apiKey, mensagem);
    if (envio.success) {
      return res.json({
        success: true,
        mensagem: 'Notificação enviada com sucesso no seu WhatsApp!',
        preview: mensagem
      });
    } else {
      return res.status(500).json({
        success: false,
        erro: envio.erro || 'Falha ao comunicar com a API do CallMeBot.'
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/debt (Cadastrar / Reconfigurar Acordo de Dívida)
router.post('/debt', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { banco, valorTotalAcordo, quantidadeParcelas, valorParcela, primeiroVencimento, observacao } = req.body;

    const qtd = parseInt(quantidadeParcelas, 10) || 1;
    const valTotal = parseFloat(valorTotalAcordo) || 0;
    const valParc = parseFloat(valorParcela) || (valTotal / qtd);
    const primVenc = primeiroVencimento || new Date().toISOString().split('T')[0];

    data.dividaItau = {
      banco: String(banco || 'Acordo Cartão/Financiamento').trim(),
      faturaAgosto: valTotal,
      entradaAgostoPaga: 0,
      saldoFinanciadoComIOF: valTotal,
      taxaJurosMensal: 'Personalizada',
      taxaJurosAnual: '',
      jurosTotais: 0,
      valorTotalAcordo: valTotal,
      quantidadeParcelas: qtd,
      valorParcela: valParc
    };

    // Gera parcelas
    const parcelas = [];
    const dateObj = new Date(primVenc);

    for (let i = 1; i <= qtd; i++) {
      const vDate = new Date(dateObj);
      vDate.setMonth(vDate.getMonth() + (i - 1));
      const dateStr = vDate.toISOString().split('T')[0];

      parcelas.push({
        id: i,
        numero: i,
        vencimento: dateStr,
        valor: valParc,
        paga: false,
        dataPagamento: null,
        observacao: observacao || `${i}ª parcela de ${banco || 'acordo'}`
      });
    }

    data.parcelas = parcelas;

    // Vincula meta de quitação
    let metaDivida = (data.metas || []).find(m => m.id === 'meta-divida' || m.id === 'meta-1');
    if (!metaDivida) {
      data.metas.unshift({
        id: 'meta-divida',
        titulo: `Quitar Acordo ${data.dividaItau.banco}`,
        categoria: 'Dívida',
        valorAlvo: valTotal,
        valorAtual: 0,
        dataAlvo: parcelas[parcelas.length - 1]?.vencimento || '',
        icone: '💳',
        descricao: `Quitação total das ${qtd} parcelas do acordo.`
      });
    } else {
      metaDivida.titulo = `Quitar Acordo ${data.dividaItau.banco}`;
      metaDivida.valorAlvo = valTotal;
      metaDivida.valorAtual = 0;
    }

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: 'Acordo e parcelas cadastrados com sucesso!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PATCH /api/finance/installments/:id
router.patch('/installments/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;
    const { paga, dataPagamento, observacao } = req.body;

    const idx = (data.parcelas || []).findIndex(p => String(p.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, erro: 'Parcela não encontrada.' });
    }

    if (paga !== undefined) {
      data.parcelas[idx].paga = Boolean(paga);
      data.parcelas[idx].dataPagamento = paga
        ? (dataPagamento || new Date().toISOString().split('T')[0])
        : null;
    }
    if (observacao !== undefined) {
      data.parcelas[idx].observacao = observacao;
    }

    // Atualiza valor amortizado na meta de dívida
    const metaD = (data.metas || []).find(m => m.id === 'meta-divida' || m.id === 'meta-1');
    if (metaD) {
      const pagas = data.parcelas.filter(p => p.paga);
      metaD.valorAtual = pagas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    }

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: `Parcela ${data.parcelas[idx].numero} atualizada!`,
      parcela: data.parcelas[idx],
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/fixed-expenses
router.post('/fixed-expenses', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { nome, valor, categoria } = req.body;
    if (!nome || !valor) {
      return res.status(400).json({ success: false, erro: 'Nome e valor são obrigatórios.' });
    }

    const novoFixo = {
      id: Date.now(),
      nome: String(nome).trim(),
      valor: Math.abs(Number(valor)),
      categoria: categoria || 'Essencial',
      pago: false
    };

    if (!data.gastosFixos) data.gastosFixos = [];
    data.gastosFixos.push(novoFixo);

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: 'Gasto fixo cadastrado com sucesso!',
      gasto: novoFixo,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PATCH /api/finance/fixed-expenses/:id
router.patch('/fixed-expenses/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;
    const { pago, valor, nome, categoria } = req.body;

    const idx = (data.gastosFixos || []).findIndex(g => String(g.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, erro: 'Gasto fixo não encontrado.' });
    }

    if (pago !== undefined) data.gastosFixos[idx].pago = Boolean(pago);
    if (valor !== undefined && !isNaN(Number(valor))) data.gastosFixos[idx].valor = Math.abs(Number(valor));
    if (nome) data.gastosFixos[idx].nome = String(nome).trim();
    if (categoria) data.gastosFixos[idx].categoria = String(categoria).trim();

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      gasto: data.gastosFixos[idx],
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// DELETE /api/finance/fixed-expenses/:id
router.delete('/fixed-expenses/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;

    data.gastosFixos = (data.gastosFixos || []).filter(g => String(g.id) !== String(id));
    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Gasto fixo removido!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/transactions
router.post('/transactions', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { descricao, valor, categoria, data: dataGasto } = req.body;
    if (!descricao || !valor) {
      return res.status(400).json({ success: false, erro: 'Descrição e valor são obrigatórios.' });
    }

    const novoGasto = {
      id: `tx-${Date.now()}`,
      descricao: String(descricao).trim(),
      valor: Math.abs(Number(valor)),
      categoria: categoria || 'Alimentação',
      data: dataGasto || new Date().toISOString().split('T')[0]
    };

    if (!data.despesasVariaveis) data.despesasVariaveis = [];
    data.despesasVariaveis.unshift(novoGasto);

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: 'Despesa registrada com sucesso!',
      transacao: novoGasto,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/parse-statement (Upload e leitura de extratos Itaú, OFX, PDF, CSV)
router.post('/parse-statement', upload.single('file'), async (req, res) => {
  try {
    let buffer = null;
    let filename = '';

    if (req.file) {
      buffer = req.file.buffer;
      filename = req.file.originalname || '';
    } else if (req.body?.fileBase64) {
      buffer = Buffer.from(req.body.fileBase64, 'base64');
      filename = req.body.fileName || 'extrato.pdf';
    } else if (req.body?.fileText) {
      buffer = Buffer.from(req.body.fileText, 'utf8');
      filename = req.body.fileName || 'extrato.csv';
    } else {
      return res.status(400).json({ success: false, erro: 'Nenhum arquivo de extrato enviado.' });
    }

    const transactions = await parseBankStatement(buffer, filename);
    return res.json({
      success: true,
      filename,
      total: transactions.length,
      transactions
    });
  } catch (err) {
    console.error('Erro ao processar extrato:', err);
    return res.status(500).json({ success: false, erro: 'Falha ao processar extrato: ' + err.message });
  }
});

// POST /api/finance/batch-transactions (Cadastrar múltiplos gastos selecionados)
router.post('/batch-transactions', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    if (!userEmail) return res.status(401).json({ success: false, erro: 'Usuário não autenticado.' });
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { transacoes } = req.body;
    if (!Array.isArray(transacoes) || transacoes.length === 0) {
      return res.status(400).json({ success: false, erro: 'Nenhuma transação selecionada.' });
    }

    if (!data.despesasVariaveis) data.despesasVariaveis = [];

    const novosGastos = transacoes.map((t, idx) => ({
      id: `tx-imp-${Date.now()}-${idx}`,
      descricao: String(t.descricao || 'Despesa Extrato').trim(),
      valor: Math.abs(Number(t.valor || 0)),
      categoria: t.categoria || 'Outros',
      data: t.data || new Date().toISOString().split('T')[0]
    }));

    // Adiciona ao topo das despesas
    data.despesasVariaveis = [...novosGastos, ...data.despesasVariaveis];

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: `${novosGastos.length} despesas importadas com sucesso!`,
      adicionados: novosGastos.length,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// DELETE /api/finance/transactions/:id
router.delete('/transactions/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;

    data.despesasVariaveis = (data.despesasVariaveis || []).filter(t => String(t.id) !== String(id));
    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Despesa removida!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/finance/goals
router.post('/goals', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { titulo, categoria, valorAlvo, valorAtual, dataAlvo, icone, descricao } = req.body;
    if (!titulo || !valorAlvo) {
      return res.status(400).json({ success: false, erro: 'Título e valor alvo são obrigatórios.' });
    }

    const novaMeta = {
      id: `meta-${Date.now()}`,
      titulo: String(titulo).trim(),
      categoria: categoria || 'Geral',
      valorAlvo: Math.abs(Number(valorAlvo)),
      valorAtual: Math.abs(Number(valorAtual || 0)),
      dataAlvo: dataAlvo || '',
      icone: icone || '🎯',
      descricao: descricao ? String(descricao).trim() : ''
    };

    if (!data.metas) data.metas = [];
    data.metas.push(novaMeta);

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: 'Nova meta cadastrada!',
      meta: novaMeta,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PATCH /api/finance/goals/:id
router.patch('/goals/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;
    const { valorAporte, valorAtual, valorAlvo, titulo } = req.body;

    const idx = (data.metas || []).findIndex(m => String(m.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, erro: 'Meta não encontrada.' });
    }

    if (valorAporte !== undefined && !isNaN(Number(valorAporte))) {
      data.metas[idx].valorAtual = Math.max(0, Number(data.metas[idx].valorAtual || 0) + Number(valorAporte));
    } else if (valorAtual !== undefined && !isNaN(Number(valorAtual))) {
      data.metas[idx].valorAtual = Math.abs(Number(valorAtual));
    }

    if (valorAlvo !== undefined && !isNaN(Number(valorAlvo))) {
      data.metas[idx].valorAlvo = Math.abs(Number(valorAlvo));
    }
    if (titulo) data.metas[idx].titulo = String(titulo).trim();

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Meta atualizada no Oracle ATP!',
      meta: data.metas[idx],
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// DELETE /api/finance/goals/:id
router.delete('/goals/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;

    data.metas = (data.metas || []).filter(m => String(m.id) !== String(id));
    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Meta removida!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// ==========================================
// FATURAS DE CARTÃO E DÍVIDAS VARIÁVEIS DO MÊS
// ==========================================

// POST /api/finance/fatura-cartao
router.post('/fatura-cartao', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { nome, valor, vencimento, mesReferencia, observacao, categoria } = req.body;

    if (!nome || !valor) {
      return res.status(400).json({ success: false, erro: 'Nome e valor da fatura são obrigatórios.' });
    }

    const novaFatura = {
      id: `fatura-${Date.now()}`,
      nome: String(nome).trim(),
      valor: Math.abs(parseFloat(valor)) || 0,
      vencimento: vencimento || new Date().toISOString().split('T')[0],
      mesReferencia: mesReferencia || 'Outubro / 2026',
      paga: false,
      dataPagamento: null,
      categoria: categoria || 'Cartão de Crédito',
      observacao: observacao ? String(observacao).trim() : 'Fatura variável'
    };

    if (!Array.isArray(data.faturasCartoes)) {
      data.faturasCartoes = [];
    }

    data.faturasCartoes.push(novaFatura);
    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.status(201).json({
      success: true,
      mensagem: `Fatura de ${novaFatura.nome} cadastrada no Oracle ATP!`,
      fatura: novaFatura,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PUT /api/finance/fatura-cartao/:id (Editar valor, vencimento ou dados)
router.put('/fatura-cartao/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;
    const { nome, valor, vencimento, mesReferencia, observacao, categoria } = req.body;

    const idx = (data.faturasCartoes || []).findIndex(f => String(f.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, erro: 'Fatura não encontrada.' });
    }

    if (nome !== undefined) data.faturasCartoes[idx].nome = String(nome).trim();
    if (valor !== undefined && !isNaN(Number(valor))) data.faturasCartoes[idx].valor = Math.abs(parseFloat(valor));
    if (vencimento !== undefined) data.faturasCartoes[idx].vencimento = vencimento;
    if (mesReferencia !== undefined) data.faturasCartoes[idx].mesReferencia = String(mesReferencia).trim();
    if (observacao !== undefined) data.faturasCartoes[idx].observacao = String(observacao).trim();
    if (categoria !== undefined) data.faturasCartoes[idx].categoria = String(categoria).trim();

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: `Fatura atualizada com sucesso para ${data.faturasCartoes[idx].valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}!`,
      fatura: data.faturasCartoes[idx],
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// PUT /api/finance/fatura-cartao/:id/toggle (Marcar como Paga / Pendente)
router.put('/fatura-cartao/:id/toggle', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;

    const idx = (data.faturasCartoes || []).findIndex(f => String(f.id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ success: false, erro: 'Fatura não encontrada.' });
    }

    const atual = data.faturasCartoes[idx];
    atual.paga = !atual.paga;
    atual.dataPagamento = atual.paga ? new Date().toISOString().split('T')[0] : null;

    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: `Fatura ${atual.nome} marcada como ${atual.paga ? 'Paga ✓' : 'Pendente'}!`,
      fatura: atual,
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// DELETE /api/finance/fatura-cartao/:id
router.delete('/fatura-cartao/:id', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord) return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });

    const data = userRecord.data;
    const { id } = req.params;

    data.faturasCartoes = (data.faturasCartoes || []).filter(f => String(f.id) !== String(id));
    await oracleAtp.saveUser(userEmail, userRecord.name, userRecord.password, data);
    const summary = computeSummary(data);

    return res.json({
      success: true,
      mensagem: 'Fatura removida!',
      summary,
      ...data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// Agendamento diário automático de lembrete WhatsApp no dia configurado (ex: dia 02)
let lastAlertDate = null;
setInterval(async () => {
  try {
    const agora = new Date();
    const diaAtual = agora.getDate();
    const horaAtual = agora.getHours();
    const hojeStr = agora.toISOString().split('T')[0];

    // Dispara uma vez ao dia pela manhã (a partir das 09h)
    if (horaAtual >= 9 && lastAlertDate !== hojeStr) {
      const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      if (adminEmail) {
        const user = await oracleAtp.getUser(adminEmail);
        if (user && user.data?.perfil?.notificacoesWppAtivas) {
          const diaProgramado = Number(user.data.perfil.diaLembreteWpp) || 2;
          if (diaAtual === diaProgramado) {
            lastAlertDate = hojeStr;
            const phone = user.data.perfil.whatsappPhone || process.env.ADMIN_WHATSAPP_PHONE;
            const apiKey = user.data.perfil.whatsappApiKey || process.env.CALLMEBOT_API_KEY;
            
            const proxParcela = (user.data.parcelas || []).find(p => !p.paga);
            const faturasP = (user.data.faturasCartoes || []).filter(f => !f.paga);
            
            let detalhes = '';
            if (proxParcela) detalhes += `💳 *Parcela:* R$ ${Number(proxParcela.valor).toFixed(2).replace('.', ',')} (Vence dia 05)\n`;
            faturasP.forEach(f => {
              detalhes += `💳 *${f.nome}:* R$ ${Number(f.valor).toFixed(2).replace('.', ',')} (Vence dia ${f.vencimento ? f.vencimento.split('-')[2] : '19'})\n`;
            });

            const msg = `🚨 *LEMBRETE DO DIA ${String(diaProgramado).padStart(2, '0')} - PAGAMENTO DE FATURAS*\n\n` +
              `Olá, ${user.data.perfil.nome || 'Usuário'}! Lembrete para planejar suas contas deste mês:\n\n` +
              detalhes + `\n` +
              `👉 *Acesse o painel para conferir e marcar se já foram pagas:*\n` +
              `🔗 ${process.env.APP_URL || 'https://fincontrol.vercel.app'}`;

            await sendCallMeBot(phone, apiKey, msg);
            console.log('[WhatsApp Cron] Lembrete automático enviado via CallMeBot!');
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Cron] Falha no agendador:', err.message);
  }
}, 30 * 60 * 1000);

// ==========================================
// BACKUP DIÁRIO & ROTAS DE BACKUP
// ==========================================
const fs = require('fs');
const path = require('path');

function performDailyBackup() {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${dateStr}.json`);

    const usersFile = path.join(__dirname, '..', '..', 'data', 'finance_users.json');
    const reqsFile = path.join(__dirname, '..', '..', 'data', 'access_requests.json');
    const resetsFile = path.join(__dirname, '..', '..', 'data', 'password_resets.json');

    const backupData = {
      timestamp: now.toISOString(),
      users: fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : {},
      accessRequests: fs.existsSync(reqsFile) ? JSON.parse(fs.readFileSync(reqsFile, 'utf8')) : [],
      passwordResets: fs.existsSync(resetsFile) ? JSON.parse(fs.readFileSync(resetsFile, 'utf8')) : []
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`[Backup] Backup gerado com sucesso: ${backupFile}`);
    return { success: true, file: `backup_${dateStr}.json`, timestamp: now.toISOString() };
  } catch (err) {
    console.error('[Backup] Erro ao gerar backup:', err.message);
    return { success: false, erro: err.message };
  }
}

// POST /api/finance/backup-now (Executa snapshot de backup agora)
router.post('/backup-now', async (req, res) => {
  const result = performDailyBackup();
  return res.json(result);
});

// GET /api/finance/backups (Lista backups disponíveis)
router.get('/backups', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'data', 'backups');
    if (!fs.existsSync(backupDir)) return res.json({ success: true, backups: [] });
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
    return res.json({ success: true, backups: files.slice(0, 15) });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// ==========================================
// LANÇAMENTO RÁPIDO PELO ROBÔ DE WHATSAPP
// ==========================================
router.post('/bot-command', async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    const userRecord = await oracleAtp.getUser(userEmail);
    if (!userRecord || !userRecord.data) {
      return res.status(404).json({ success: false, erro: 'Usuário não encontrado.' });
    }

    const { command, text, message } = req.body || {};
    const input = String(command || text || message || '').trim();

    if (!input) {
      return res.status(400).json({ success: false, erro: 'Envie um comando (ex: "gastei 45 almoco" ou "saldo").' });
    }

    const data = userRecord.data;
    const lower = input.toLowerCase();

    // 1. Comando: saldo / resumo
    if (lower === 'saldo' || lower === 'resumo') {
      const summary = computeSummary(data);
      const reply = `📊 *RESUMO FINANCEIRO*\n\n` +
        `💰 *Renda do Mês:* R$ ${summary.rendaTotalMes.toFixed(2).replace('.', ',')}\n` +
        `💳 *Comprometido:* R$ ${summary.totalComprometido.toFixed(2).replace('.', ',')}\n` +
        `🛒 *Gastos Diários:* R$ ${summary.totalVariavel.toFixed(2).replace('.', ',')}\n` +
        `✨ *SALDO LIVRE ATUAL:* R$ ${summary.saldoLivreAtual.toFixed(2).replace('.', ',')}\n\n` +
        `🔗 Acesse: https://controle-financeiro-mauve-two.vercel.app/`;

      return res.json({ success: true, reply, summary });
    }

    // 2. Comando: paguei itau / parcela
    if (lower.includes('paguei itau') || lower.includes('paguei parcela')) {
      const prox = (data.parcelas || []).find(p => !p.paga);
      if (!prox) {
        return res.json({ success: true, reply: '🎉 Todas as parcelas do acordo já estão quitadas!' });
      }
      prox.paga = true;
      prox.dataPagamento = new Date().toISOString().split('T')[0];
      await oracleAtp.saveUser(userEmail, userRecord.name || data.perfil?.nome, userRecord.password, data);
      const summary = computeSummary(data);
      const reply = `✅ *Parcela ${prox.numero} do Itaú marcada como PAGA!*\n` +
        `💰 Valor: R$ ${Number(prox.valor).toFixed(2).replace('.', ',')}\n` +
        `📉 Saldo restante da dívida: R$ ${summary.saldoDevedorRestante.toFixed(2).replace('.', ',')}`;
      return res.json({ success: true, reply, summary, ...data });
    }

    // 3. Comando: gastei [valor] [descricao]
    const matchGasto = input.match(/(?:gastei|despesa|compra|paguei)\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)(?:\s+(.*))?/i);
    if (matchGasto) {
      const valStr = matchGasto[1].replace(',', '.');
      const valor = parseFloat(valStr);
      let desc = (matchGasto[2] || 'Gasto via WhatsApp').trim();
      let cat = 'Outros';

      const descLower = desc.toLowerCase();
      if (descLower.includes('almoco') || descLower.includes('almoço') || descLower.includes('lanche') || descLower.includes('jantar') || descLower.includes('comida') || descLower.includes('mercado') || descLower.includes('ifood')) {
        cat = 'Alimentação';
      } else if (descLower.includes('uber') || descLower.includes('gasolina') || descLower.includes('onibus') || descLower.includes('transporte')) {
        cat = 'Transporte';
      } else if (descLower.includes('farmacia') || descLower.includes('remedio') || descLower.includes('medico')) {
        cat = 'Saúde';
      } else if (descLower.includes('cinema') || descLower.includes('bar') || descLower.includes('praia') || descLower.includes('viagem')) {
        cat = 'Lazer';
      }

      if (!data.despesasVariaveis) data.despesasVariaveis = [];
      const novaTransacao = {
        id: `tx-${Date.now()}`,
        descricao: desc,
        valor,
        categoria: cat,
        data: new Date().toISOString().split('T')[0]
      };
      data.despesasVariaveis.unshift(novaTransacao);

      await oracleAtp.saveUser(userEmail, userRecord.name || data.perfil?.nome, userRecord.password, data);
      const summary = computeSummary(data);

      const reply = `✅ *Gasto Registrado no Oracle ATP!*\n\n` +
        `📝 *Descrição:* ${desc}\n` +
        `🏷️ *Categoria:* ${cat}\n` +
        `💵 *Valor:* R$ ${valor.toFixed(2).replace('.', ',')}\n\n` +
        `✨ *Saldo Livre Restante:* R$ ${summary.saldoLivreAtual.toFixed(2).replace('.', ',')}`;

      return res.json({ success: true, reply, transaction: novaTransacao, summary, ...data });
    }

    return res.json({
      success: false,
      reply: `Comando não reconhecido. Exemplos válidos:\n• "gastei 45 almoco"\n• "gastei 120 mercado"\n• "paguei itau"\n• "saldo"`
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// Agendador de Backup Diário às 23:59
setInterval(() => {
  const agora = new Date();
  if (agora.getHours() === 23 && agora.getMinutes() === 59) {
    performDailyBackup();
  }
}, 60 * 1000);

module.exports = router;
