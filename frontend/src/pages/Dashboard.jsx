import React, { useState, useEffect, useMemo } from 'react';
import api, { DEFAULT_FINANCE_STATE, calculateFinancialSummary } from '../services/api';

function formatBRLGlobal(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'gastos' | 'fixos' | 'metas' | 'perfil'

  // Modo Privacidade (Esconder Saldos / Valores)
  const [ocultarSaldos, setOcultarSaldos] = useState(() => {
    return localStorage.getItem('fincontrol_ocultar_saldos') === 'true';
  });

  const toggleOcultarSaldos = () => {
    setOcultarSaldos(prev => {
      const next = !prev;
      localStorage.setItem('fincontrol_ocultar_saldos', String(next));
      return next;
    });
  };

  const formatBRL = (val) => {
    if (ocultarSaldos) return 'R$ ••••••';
    return formatBRLGlobal(val);
  };

  const [data, setData] = useState(() => {
    const cached = localStorage.getItem('finance_cached_data');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return DEFAULT_FINANCE_STATE;
  });

  const [syncStatus, setSyncStatus] = useState('Oracle ATP');
  const [alerta, setAlerta] = useState('');

  // Formulário: Cadastrar Nova Dívida / Acordo
  const [mostrarFormDivida, setMostrarFormDivida] = useState(false);
  const [dividaBanco, setDividaBanco] = useState('');
  const [dividaValorTotal, setDividaValorTotal] = useState('');
  const [dividaParcelasQtd, setDividaParcelasQtd] = useState('6');
  const [dividaValorParcela, setDividaValorParcela] = useState('');
  const [dividaVencimento, setDividaVencimento] = useState(() => {
    const d = new Date();
    d.setDate(5);
    return d.toISOString().split('T')[0];
  });
  // Minimizar / Expandir Bloco da Dívida Itaú
  const [dividaItauMinimizada, setDividaItauMinimizada] = useState(true);

  // Faturas de Cartão & Contas Variáveis (PicPay, etc.)
  const [mostrarFormFatura, setMostrarFormFatura] = useState(false);
  const [novaFaturaNome, setNovaFaturaNome] = useState('PicPay (Cartão)');
  const [novaFaturaValor, setNovaFaturaValor] = useState('600');
  const [novaFaturaVencimento, setNovaFaturaVencimento] = useState('2026-10-19');
  const [novaFaturaMes, setNovaFaturaMes] = useState('Outubro / 2026');
  const [novaFaturaObs, setNovaFaturaObs] = useState('Fatura variável (média R$ 300 ~ R$ 600). Ajuste conforme o fechamento.');
  const [editandoFaturaId, setEditandoFaturaId] = useState(null);
  const [valorEditadoFatura, setValorEditadoFatura] = useState('');

  // Importação Inteligente de Extrato Bancário (Itaú / PDF / OFX / CSV)
  const [mostrarModalImportacao, setMostrarModalImportacao] = useState(false);
  const [extratoCarregando, setExtratoCarregando] = useState(false);
  const [extratoNomeArquivo, setExtratoNomeArquivo] = useState('');
  const [transacoesExtrato, setTransacoesExtrato] = useState([]);
  const [filtroPeriodoExtrato, setFiltroPeriodoExtrato] = useState('30'); // '7' | '15' | '30' | 'todos' | 'personalizado'
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroTipoExtrato, setFiltroTipoExtrato] = useState('saida'); // 'saida' | 'todas'
  const [itensExtratoSelecionados, setItensExtratoSelecionados] = useState({});
  const [importandoLote, setImportandoLote] = useState(false);

  // Formulário: Novo Gasto do Dia a Dia
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('Alimentação');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');

  // Formulário: Novo Gasto Fixo
  const [novoFixoNome, setNovoFixoNome] = useState('');
  const [novoFixoValor, setNovoFixoValor] = useState('');
  const [novoFixoCategoria, setNovoFixoCategoria] = useState('Saúde');

  // Formulário: Nova Meta
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('');
  const [novaMetaValor, setNovaMetaValor] = useState('');
  const [novaMetaIcone, setNovaMetaIcone] = useState('✈️');
  const [novaMetaCategoria, setNovaMetaCategoria] = useState('Viagem');

  // Modal / Aporte em Meta
  const [aporteMetaId, setAporteMetaId] = useState(null);
  const [valorAporte, setValorAporte] = useState('');

  // Formulário: Perfil & Renda
  const [rendaBaseInput, setRendaBaseInput] = useState(data.perfil?.rendaLiquida || 0);
  const [rendaExtraInput, setRendaExtraInput] = useState(data.perfil?.rendaExtraMes || 0);
  const [motivoRendaExtraInput, setMotivoRendaExtraInput] = useState(data.perfil?.motivoRendaExtra || '');
  const [emailInput, setEmailInput] = useState(data.perfil?.email || '');
  const [novaSenhaInput, setNovaSenhaInput] = useState('');

  // Configurações do Robô WhatsApp
  const [whatsappPhone, setWhatsappPhone] = useState(data.perfil?.whatsappPhone || '');
  const [whatsappApiKey, setWhatsappApiKey] = useState(data.perfil?.whatsappApiKey || '');
  const [notificacoesWppAtivas, setNotificacoesWppAtivas] = useState(data.perfil?.notificacoesWppAtivas !== false);
  const [diaLembreteWpp, setDiaLembreteWpp] = useState(data.perfil?.diaLembreteWpp || 2);
  const [enviandoWpp, setEnviandoWpp] = useState(false);

  // Determina se o usuário conectado é o administrador
  const userEmail = (data.perfil?.email || '').toLowerCase();
  const userName = (data.perfil?.nome || '').toLowerCase();
  const isAdmin = userEmail.includes('vinicius') || userEmail.includes('admin') || userName.includes('vinicius') || userName.includes('vinícius') || userName.includes('admin');

  // Gestão de Solicitações de Acesso (Administrador Vinícius)
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false);
  const [filtroSolicitacao, setFiltroSolicitacao] = useState('todas'); // 'todas' | 'pending' | 'approved'
  const [senhasTemp, setSenhasTemp] = useState({});
  const [solicitacaoRecenteAprovada, setSolicitacaoRecenteAprovada] = useState(null);

  // 1. Navegador de Meses
  const MESES_DISPONIVEIS = [
    { id: '2026-09', rotulo: 'Setembro / 2026', curto: 'Set/26' },
    { id: '2026-10', rotulo: 'Outubro / 2026', curto: 'Out/26' },
    { id: '2026-11', rotulo: 'Novembro / 2026', curto: 'Nov/26' },
    { id: '2026-12', rotulo: 'Dezembro / 2026', curto: 'Dez/26' },
    { id: '2027-01', rotulo: 'Janeiro / 2027', curto: 'Jan/27' },
    { id: '2027-02', rotulo: 'Fevereiro / 2027', curto: 'Fev/27' }
  ];
  const [mesAtivo, setMesAtivo] = useState('2026-09');

  // 2. Simulador de Amortização 13º
  const [mostrarSimulador13, setMostrarSimulador13] = useState(false);
  const [valorSimulado13, setValorSimulado13] = useState(1000);

  // 3. PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [pwaInstalavel, setPwaInstalavel] = useState(false);
  const [mostrarModalPwa, setMostrarModalPwa] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstalavel(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstalarPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setPwaInstalavel(false);
          setDeferredPrompt(null);
          return;
        }
      } catch (e) {}
    }
    setMostrarModalPwa(true);
  };

  // 4. Exportação Completa de Dados em Planilha (CSV / Excel)
  const handleExportarCSV = () => {
    try {
      const separador = ';';
      const linhas = [];

      linhas.push(`RELATÓRIO FINANCEIRO FINCONTROL - ${data.perfil?.nome || 'Usuário'}`);
      linhas.push(`Mês de Referência:;${mesAtivo}`);
      linhas.push(`Data de Emissão:;${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
      linhas.push('');

      linhas.push('--- RESUMO FINANCEIRO GERAL ---');
      linhas.push(`Renda Total:;R$ ${summary.rendaTotalMes.toFixed(2).replace('.', ',')}`);
      linhas.push(`Total Comprometido (Dívida + Fixos):;R$ ${summary.totalComprometido.toFixed(2).replace('.', ',')}`);
      linhas.push(`Gastos Diários:;R$ ${summary.totalVariavel.toFixed(2).replace('.', ',')}`);
      linhas.push(`Saldo Livre Atual:;R$ ${summary.saldoLivreAtual.toFixed(2).replace('.', ',')}`);
      linhas.push(`Saldo Devedor Restante de Dívidas:;R$ ${summary.saldoDevedorRestante.toFixed(2).replace('.', ',')}`);
      linhas.push('');

      linhas.push('--- GASTOS DIÁRIOS (DESPESAS VARIÁVEIS) ---');
      linhas.push(['Data', 'Descrição', 'Categoria', 'Valor (R$)'].join(separador));
      const variaveis = data.despesasVariaveis || [];
      if (variaveis.length === 0) {
        linhas.push('Nenhum gasto registrado;;;');
      } else {
        variaveis.forEach(d => {
          linhas.push([
            d.data || '',
            `"${(d.descricao || '').replace(/"/g, '""')}"`,
            `"${(d.categoria || '').replace(/"/g, '""')}"`,
            Number(d.valor || 0).toFixed(2).replace('.', ',')
          ].join(separador));
        });
      }
      linhas.push('');

      linhas.push('--- GASTOS FIXOS MENSAIS ---');
      linhas.push(['Nome da Despesa', 'Categoria', 'Valor (R$)', 'Status'].join(separador));
      const fixos = data.gastosFixos || [];
      if (fixos.length === 0) {
        linhas.push('Nenhum gasto fixo cadastrado;;;');
      } else {
        fixos.forEach(g => {
          linhas.push([
            `"${(g.nome || '').replace(/"/g, '""')}"`,
            `"${(g.categoria || '').replace(/"/g, '""')}"`,
            Number(g.valor || 0).toFixed(2).replace('.', ','),
            g.pago ? 'PAGO' : 'PENDENTE'
          ].join(separador));
        });
      }
      linhas.push('');

      linhas.push('--- FATURAS DE CARTÃO E CONTAS VARIÁVEIS ---');
      linhas.push(['Fatura / Cartão', 'Vencimento', 'Mês Referência', 'Valor (R$)', 'Status', 'Observação'].join(separador));
      const faturas = data.faturasCartoes || [];
      if (faturas.length === 0) {
        linhas.push('Nenhuma fatura cadastrada;;;;;');
      } else {
        faturas.forEach(f => {
          linhas.push([
            `"${(f.nome || '').replace(/"/g, '""')}"`,
            f.vencimento || '',
            `"${(f.mesReferencia || '').replace(/"/g, '""')}"`,
            Number(f.valor || 0).toFixed(2).replace('.', ','),
            f.paga ? 'PAGA' : 'PENDENTE',
            `"${(f.observacao || '').replace(/"/g, '""')}"`
          ].join(separador));
        });
      }
      linhas.push('');

      linhas.push('--- PARCELAS DE DÍVIDAS / ACORDOS ---');
      linhas.push(['Parcela', 'Vencimento', 'Valor (R$)', 'Status', 'Data Pagamento', 'Observação'].join(separador));
      const parcelas = data.parcelas || [];
      if (parcelas.length === 0) {
        linhas.push('Nenhuma dívida cadastrada;;;;;');
      } else {
        parcelas.forEach(p => {
          linhas.push([
            `${p.numero || p.id}ª Parcela`,
            p.vencimento || '',
            Number(p.valor || 0).toFixed(2).replace('.', ','),
            p.paga ? 'PAGA' : 'PENDENTE',
            p.dataPagamento || '-',
            `"${(p.observacao || '').replace(/"/g, '""')}"`
          ].join(separador));
        });
      }

      // Adiciona BOM (\uFEFF) para garantir que caracteres acentuados funcionem perfeitamente no Excel
      const conteudoCsv = '\uFEFF' + linhas.join('\r\n');
      const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `fincontrol_extrato_${mesAtivo}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      mostrarMensagem('Planilha de dados (CSV) exportada com sucesso!');
    } catch (e) {
      console.error('Erro ao exportar CSV:', e);
      mostrarMensagem('Erro ao exportar dados.');
    }
  };

  // 5. Notificações Nativas Web Push (Sem depender de terceiros / CallMeBot)
  const [pushPermissao, setPushPermissao] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });

  const dispararNotificacaoNativa = (titulo, corpo, tag = '') => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    
    const options = {
      body: corpo,
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      vibrate: [200, 100, 200],
      tag: tag || undefined,
      renotify: true
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(titulo, options);
      }).catch(() => {
        try { new Notification(titulo, options); } catch (e) {}
      });
    } else {
      try { new Notification(titulo, options); } catch (e) {}
    }
  };

  const verificarLembretesVencimento = (dadosFinanceiros) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Faturas de cartão
    const faturas = dadosFinanceiros?.faturasCartoes || [];
    faturas.filter(f => !f.paga && f.vencimento).forEach(f => {
      const [ano, mes, dia] = f.vencimento.split('-').map(Number);
      const dataVenc = new Date(ano, mes - 1, dia);
      const diffMs = dataVenc - hoje;
      const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDias >= 0 && diffDias <= 2) {
        const diaTexto = diffDias === 0 ? 'VENCE HOJE!' : diffDias === 1 ? 'vence AMANHÃ!' : `vence em 2 dias!`;
        dispararNotificacaoNativa(
          `💳 Fatura ${f.nome} ${diaTexto}`,
          `A fatura de R$ ${Number(f.valor).toFixed(2).replace('.', ',')} vence no dia ${f.vencimento.split('-').reverse().join('/')}. Clique para conferir.`,
          `fatura-${f.id || f.nome}-${f.vencimento}`
        );
      } else if (diffDias < 0) {
        dispararNotificacaoNativa(
          `🚨 Fatura ${f.nome} em atraso!`,
          `Venceu dia ${f.vencimento.split('-').reverse().join('/')} (R$ ${Number(f.valor).toFixed(2).replace('.', ',')}).`,
          `fatura-atrasada-${f.id || f.nome}`
        );
      }
    });

    // 2. Próxima Parcela de Dívida
    const parcelas = dadosFinanceiros?.parcelas || [];
    const proxParcela = parcelas.find(p => !p.paga && p.vencimento);
    if (proxParcela) {
      const [ano, mes, dia] = proxParcela.vencimento.split('-').map(Number);
      const dataVenc = new Date(ano, mes - 1, dia);
      const diffMs = dataVenc - hoje;
      const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDias >= 0 && diffDias <= 2) {
        const diaTexto = diffDias === 0 ? 'VENCE HOJE!' : diffDias === 1 ? 'vence AMANHÃ!' : `vence em 2 dias!`;
        dispararNotificacaoNativa(
          `💳 Parcela ${proxParcela.numero}ª de Acordo ${diaTexto}`,
          `Parcela de R$ ${Number(proxParcela.valor).toFixed(2).replace('.', ',')} vence em ${proxParcela.vencimento.split('-').reverse().join('/')}.`,
          `parcela-${proxParcela.id || proxParcela.numero}`
        );
      }
    }
  };

  const handleAtivarNotificacoes = async () => {
    if (typeof Notification === 'undefined') {
      mostrarMensagem('Seu navegador atual não suporta notificações nativas.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermissao(perm);
      if (perm === 'granted') {
        dispararNotificacaoNativa(
          '🔔 Notificações Ativadas no FinControl!',
          'Você receberá alertas automáticos sempre que uma fatura ou parcela estiver próxima do vencimento.',
          'welcome-notification'
        );
        mostrarMensagem('Notificações no celular ativadas com sucesso!');
        verificarLembretesVencimento(data);
      } else if (perm === 'denied') {
        mostrarMensagem('Notificações bloqueadas no navegador. Para ativar, libere nas configurações do site.');
      }
    } catch (e) {
      console.warn('Erro ao solicitar permissão de notificação:', e);
    }
  };

  const handleTestarNotificacao = () => {
    if (pushPermissao !== 'granted') {
      handleAtivarNotificacoes();
      return;
    }
    const faturasP = (data.faturasCartoes || []).filter(f => !f.paga);
    const faturaExemplo = faturasP[0] || { nome: 'PicPay', valor: 600 };
    dispararNotificacaoNativa(
      `🚨 FinControl: Fatura ${faturaExemplo.nome} vence em 2 dias!`,
      `Alerta de teste: R$ ${Number(faturaExemplo.valor).toFixed(2).replace('.', ',')} com vencimento próximo. Toque para acessar!`,
      'test-notification'
    );
    mostrarMensagem('Notificação nativa enviada ao seu aparelho!');
  };

  // 5. Gestão de Pedidos de Reset de Senha (Administrador)
  const [resetsSenha, setResetsSenha] = useState([]);
  const [senhasTempReset, setSenhasTempReset] = useState({});
  const [resetRecenteAprovado, setResetRecenteAprovado] = useState(null);

  const carregarResetsSenha = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/api/auth/password-resets');
      if (res.data?.success) {
        setResetsSenha(res.data.resets || []);
      }
    } catch (e) {}
  };

  const handleAprovarReset = async (item) => {
    const custom = senhasTempReset[item.id];
    try {
      const res = await api.post('/api/auth/approve-password-reset', {
        resetId: item.id,
        tempPassword: custom ? custom.trim() : undefined
      });
      if (res.data?.success) {
        setResetRecenteAprovado({
          name: item.name || item.email,
          tempPassword: res.data.tempPassword,
          waLink: res.data.waLink
        });
        mostrarMensagem(`Senha de ${item.email} redefinida!`);
        carregarResetsSenha();
      }
    } catch (err) {
      mostrarMensagem('Erro ao aprovar reset: ' + (err.response?.data?.erro || err.message));
    }
  };

  const handleRejeitarReset = async (resetId) => {
    if (!window.confirm('Deseja rejeitar este pedido de reset?')) return;
    try {
      const res = await api.post('/api/auth/reject-password-reset', { resetId });
      if (res.data?.success) {
        mostrarMensagem('Pedido de reset rejeitado.');
        carregarResetsSenha();
      }
    } catch (e) {}
  };

  // 6. Chatbot Interativo do Robô de WhatsApp
  const [comandoBotInput, setComandoBotInput] = useState('');
  const [botHistorico, setBotHistorico] = useState([
    { autor: 'bot', texto: '🤖 Olá! Digite comandos como "gastei 45 almoco" ou "saldo" para testar o robô:' }
  ]);
  const [enviandoComandoBot, setEnviandoComandoBot] = useState(false);

  const handleEnviarComandoBot = async (e) => {
    if (e) e.preventDefault();
    if (!comandoBotInput.trim()) return;
    const cmd = comandoBotInput.trim();
    setBotHistorico(h => [...h, { autor: 'user', texto: cmd }]);
    setComandoBotInput('');
    setEnviandoComandoBot(true);

    try {
      const res = await api.post('/api/finance/bot-command', { message: cmd });
      if (res.data) {
        setBotHistorico(h => [...h, { autor: 'bot', texto: res.data.reply || 'Comando executado!' }]);
        if (res.data.summary) {
          carregarDados();
        }
      }
    } catch (err) {
      setBotHistorico(h => [...h, { autor: 'bot', texto: '❌ Erro ao processar comando.' }]);
    } finally {
      setEnviandoComandoBot(false);
    }
  };

  // 7. Backup Snapshot Manual
  const [fazendoBackup, setFazendoBackup] = useState(false);
  const handleBackupAgora = async () => {
    setFazendoBackup(true);
    try {
      const res = await api.post('/api/finance/backup-now');
      if (res.data?.success) {
        mostrarMensagem(`✅ Backup salvo: ${res.data.file}`);
      } else {
        mostrarMensagem('Erro ao gerar backup.');
      }
    } catch (e) {
      mostrarMensagem('Erro: ' + e.message);
    } finally {
      setFazendoBackup(false);
    }
  };

  const carregarSolicitacoes = async () => {
    if (!isAdmin) return;
    setCarregandoSolicitacoes(true);
    try {
      const res = await api.get('/api/auth/requests');
      if (res.data?.success) {
        setSolicitacoes(res.data.requests || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar solicitações:', err);
    } finally {
      setCarregandoSolicitacoes(false);
    }
  };

  // Processamento e Leitura de Arquivo de Extrato (Itaú / PDF / OFX / CSV)
  const handleProcessarArquivoExtrato = async (file) => {
    if (!file) return;
    setExtratoCarregando(true);
    setExtratoNomeArquivo(file.name);

    try {
      let payload = {};
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const b64 = result.split(',')[1] || result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload = { fileBase64: base64, fileName: file.name };
      } else {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file, 'utf-8');
        });
        payload = { fileText: text, fileName: file.name };
      }

      const res = await api.post('/api/finance/parse-statement', payload);
      if (res.data?.success && Array.isArray(res.data.transactions)) {
        const txs = res.data.transactions;
        setTransacoesExtrato(txs);

        // Marca por padrão todos os gastos (saídas)
        const selecionadosIniciais = {};
        txs.forEach(t => {
          if (t.tipo === 'saida') {
            selecionadosIniciais[t.id] = true;
          }
        });
        setItensExtratoSelecionados(selecionadosIniciais);
        mostrarMensagem(`✅ ${txs.length} lançamentos identificados no extrato!`);
      } else {
        mostrarMensagem('Nenhuma transação foi identificada no arquivo.');
      }
    } catch (err) {
      console.error('Erro ao ler extrato:', err);
      const erroMsg = err.response?.data?.erro || err.message;
      mostrarMensagem(`Erro ao processar extrato: ${erroMsg}`);
    } finally {
      setExtratoCarregando(false);
    }
  };

  // Filtragem Dinâmica por Período e Tipo
  const transacoesFiltradasExtrato = useMemo(() => {
    if (!transacoesExtrato.length) return [];

    // Localiza data mais recente presente no extrato (ou hoje)
    const datasMs = transacoesExtrato.map(t => new Date(t.data).getTime()).filter(d => !isNaN(d));
    const dataRef = datasMs.length ? new Date(Math.max(...datasMs)) : new Date();

    return transacoesExtrato.filter(t => {
      // 1. Filtro Tipo
      if (filtroTipoExtrato === 'saida' && t.tipo !== 'saida') return false;

      // 2. Filtro Período
      if (filtroPeriodoExtrato === 'todos') return true;

      const tDate = new Date(t.data);
      if (isNaN(tDate.getTime())) return true;

      const diffDays = Math.round((dataRef - tDate) / (1000 * 60 * 60 * 24));

      if (filtroPeriodoExtrato === '7') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filtroPeriodoExtrato === '15') {
        return diffDays >= 0 && diffDays <= 15;
      }
      if (filtroPeriodoExtrato === '30') {
        return diffDays >= 0 && diffDays <= 30;
      }
      if (filtroPeriodoExtrato === 'personalizado') {
        if (filtroDataInicio && t.data < filtroDataInicio) return false;
        if (filtroDataFim && t.data > filtroDataFim) return false;
        return true;
      }
      return true;
    });
  }, [transacoesExtrato, filtroPeriodoExtrato, filtroTipoExtrato, filtroDataInicio, filtroDataFim]);

  const toggleSelecionarTodosExtrato = () => {
    const todosMarcados = transacoesFiltradasExtrato.length > 0 && transacoesFiltradasExtrato.every(t => itensExtratoSelecionados[t.id]);
    const novo = { ...itensExtratoSelecionados };
    transacoesFiltradasExtrato.forEach(t => {
      novo[t.id] = !todosMarcados;
    });
    setItensExtratoSelecionados(novo);
  };

  const toggleItemExtrato = (id) => {
    setItensExtratoSelecionados(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAlterarCategoriaExtrato = (id, novaCat) => {
    setTransacoesExtrato(prev => prev.map(t => t.id === id ? { ...t, categoria: novaCat } : t));
  };

  const handleConfirmarImportacaoExtrato = async () => {
    const selecionados = transacoesFiltradasExtrato.filter(t => itensExtratoSelecionados[t.id]);
    if (selecionados.length === 0) {
      mostrarMensagem('Selecione ao menos um gasto para cadastrar.');
      return;
    }

    setImportandoLote(true);
    try {
      const res = await api.post('/api/finance/batch-transactions', {
        transacoes: selecionados.map(s => ({
          descricao: s.descricao,
          valor: s.valor,
          categoria: s.categoria,
          data: s.data
        }))
      });

      if (res.data?.success) {
        setData(res.data);
        localStorage.setItem('finance_cached_data', JSON.stringify(res.data));
        mostrarMensagem(`🎉 ${selecionados.length} gastos do extrato cadastrados com sucesso!`);
        setMostrarModalImportacao(false);
        setTransacoesExtrato([]);
        setItensExtratoSelecionados({});
      }
    } catch (err) {
      // Fallback local se estiver offline
      const novosGastos = selecionados.map((s, idx) => ({
        id: `tx-imp-${Date.now()}-${idx}`,
        descricao: s.descricao,
        valor: s.valor,
        categoria: s.categoria,
        data: s.data
      }));
      const novoData = {
        ...data,
        despesasVariaveis: [...novosGastos, ...(data.despesasVariaveis || [])]
      };
      setData(novoData);
      localStorage.setItem('finance_cached_data', JSON.stringify(novoData));
      mostrarMensagem(`🎉 ${selecionados.length} gastos salvos localmente!`);
      setMostrarModalImportacao(false);
      setTransacoesExtrato([]);
      setItensExtratoSelecionados({});
    } finally {
      setImportandoLote(false);
    }
  };

  const carregarDados = async () => {
    try {
      const res = await api.get('/api/finance/data');
      if (res.data?.success) {
        setData(res.data);
        localStorage.setItem('finance_cached_data', JSON.stringify(res.data));
        setSyncStatus('Oracle ATP (Exadata)');
        setRendaBaseInput(res.data.perfil?.rendaLiquida || 0);
        setRendaExtraInput(res.data.perfil?.rendaExtraMes || 0);
        setMotivoRendaExtraInput(res.data.perfil?.motivoRendaExtra || '');
        setEmailInput(res.data.perfil?.email || '');
        setWhatsappPhone(res.data.perfil?.whatsappPhone || '');
        setWhatsappApiKey(res.data.perfil?.whatsappApiKey || '');
        setNotificacoesWppAtivas(res.data.perfil?.notificacoesWppAtivas !== false);
        setDiaLembreteWpp(res.data.perfil?.diaLembreteWpp || 2);
        verificarLembretesVencimento(res.data);
      }
    } catch (err) {
      setSyncStatus('Local (Offline)');
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const summary = calculateFinancialSummary(data);
  const rendaTotalMes = Number(data.perfil?.rendaLiquida || 0) + Number(data.perfil?.rendaExtraMes || 0);
  const saldoLivreReal = Math.max(0, rendaTotalMes - summary.totalComprometido - summary.totalVariavel);

  const mostrarMensagem = (msg) => {
    setAlerta(msg);
    setTimeout(() => setAlerta(''), 3500);
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'perfil') {
      carregarSolicitacoes();
      carregarResetsSenha();
    }
  }, [isAdmin, activeTab]);

  const handleAprovarSolicitacao = async (reqItem) => {
    const customPass = senhasTemp[reqItem.id];
    try {
      const res = await api.post('/api/auth/approve-request', {
        requestId: reqItem.id,
        tempPassword: customPass ? customPass.trim() : undefined
      });
      if (res.data?.success) {
        setSolicitacaoRecenteAprovada({
          nome: reqItem.name,
          email: reqItem.email,
          whatsapp: reqItem.whatsapp,
          tempPassword: res.data.tempPassword,
          waLink: res.data.waLink
        });
        mostrarMensagem(`Acesso aprovado para ${reqItem.name}! Senha: ${res.data.tempPassword}`);
        carregarSolicitacoes();
      }
    } catch (err) {
      mostrarMensagem('Erro ao aprovar: ' + (err.response?.data?.erro || err.message));
    }
  };

  const handleRejeitarSolicitacao = async (requestId) => {
    if (!window.confirm('Tem certeza que deseja rejeitar esta solicitação de acesso?')) return;
    try {
      const res = await api.post('/api/auth/reject-request', { requestId });
      if (res.data?.success) {
        mostrarMensagem('Solicitação rejeitada.');
        carregarSolicitacoes();
      }
    } catch (err) {
      mostrarMensagem('Erro ao rejeitar: ' + (err.response?.data?.erro || err.message));
    }
  };

  // Cadastrar / Reconfigurar Acordo de Dívida
  const handleSalvarDivida = async (e) => {
    e.preventDefault();
    if (!dividaValorTotal) return;

    const valTotal = parseFloat(dividaValorTotal.replace(',', '.'));
    const qtd = parseInt(dividaParcelasQtd, 10) || 1;
    const valParc = dividaValorParcela ? parseFloat(dividaValorParcela.replace(',', '.')) : (valTotal / qtd);

    const payload = {
      banco: dividaBanco.trim(),
      valorTotalAcordo: valTotal,
      quantidadeParcelas: qtd,
      valorParcela: valParc,
      primeiroVencimento: dividaVencimento
    };

    try {
      const res = await api.post('/api/finance/debt', payload);
      if (res.data?.success) {
        setData(res.data);
        localStorage.setItem('finance_cached_data', JSON.stringify(res.data));
        setMostrarFormDivida(false);
        mostrarMensagem('Acordo e parcelas cadastrados no Oracle Cloud!');
        return;
      }
    } catch (err) {}

    // Fallback local
    const parcelas = [];
    const dateObj = new Date(dividaVencimento);
    for (let i = 1; i <= qtd; i++) {
      const vDate = new Date(dateObj);
      vDate.setMonth(vDate.getMonth() + (i - 1));
      parcelas.push({
        id: i,
        numero: i,
        vencimento: vDate.toISOString().split('T')[0],
        valor: valParc,
        paga: false,
        dataPagamento: null,
        observacao: `${i}ª parcela de ${dividaBanco}`
      });
    }

    const novoData = {
      ...data,
      dividaItau: {
        banco: dividaBanco.trim(),
        valorTotalAcordo: valTotal,
        quantidadeParcelas: qtd,
        valorParcela: valParc
      },
      parcelas
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));
    setMostrarFormDivida(false);
    mostrarMensagem('Acordo de dívida salvo localmente!');
  };

  // Alternar parcela
  const toggleParcela = async (parcela) => {
    const novoStatus = !parcela.paga;
    const dataPag = novoStatus ? new Date().toISOString().split('T')[0] : null;

    const novoData = {
      ...data,
      parcelas: data.parcelas.map(p =>
        p.id === parcela.id ? { ...p, paga: novoStatus, dataPagamento: dataPag } : p
      )
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.patch(`/api/finance/installments/${parcela.id}`, { paga: novoStatus, dataPagamento: dataPag });
      setSyncStatus('Salvo no Oracle ATP');
    } catch (e) {
      setSyncStatus('Salvo local');
    }
  };

  // Adicionar gasto do dia a dia
  const handleAdicionarGasto = async (e) => {
    e.preventDefault();
    if (!novaDescricao.trim() || !novoValor) return;

    const valNum = parseFloat(novoValor.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) return;

    const novoGasto = {
      id: `tx-${Date.now()}`,
      descricao: novaDescricao.trim(),
      valor: valNum,
      categoria: novaCategoria,
      data: new Date().toISOString().split('T')[0]
    };

    const novoData = {
      ...data,
      despesasVariaveis: [novoGasto, ...(data.despesasVariaveis || [])]
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    setNovaDescricao('');
    setNovoValor('');
    mostrarMensagem('Despesa adicionada com sucesso!');

    try {
      await api.post('/api/finance/transactions', novoGasto);
    } catch (e) {}
  };

  // Remover gasto diário
  const handleRemoverGasto = async (id) => {
    const novoData = {
      ...data,
      despesasVariaveis: (data.despesasVariaveis || []).filter(t => t.id !== id)
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.delete(`/api/finance/transactions/${id}`);
    } catch (e) {}
  };

  // Alternar checkbox gasto fixo
  const toggleGastoFixo = async (gasto) => {
    const novoStatus = !gasto.pago;
    const novoData = {
      ...data,
      gastosFixos: data.gastosFixos.map(g =>
        g.id === gasto.id ? { ...g, pago: novoStatus } : g
      )
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.patch(`/api/finance/fixed-expenses/${gasto.id}`, { pago: novoStatus });
    } catch (e) {}
  };

  // Cadastrar novo gasto fixo
  const handleAdicionarFixo = async (e) => {
    e.preventDefault();
    if (!novoFixoNome.trim() || !novoFixoValor) return;

    const valNum = parseFloat(novoFixoValor.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) return;

    const novoFixo = {
      id: Date.now(),
      nome: novoFixoNome.trim(),
      valor: valNum,
      categoria: novoFixoCategoria,
      pago: false
    };

    const novoData = {
      ...data,
      gastosFixos: [...(data.gastosFixos || []), novoFixo]
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    setNovoFixoNome('');
    setNovoFixoValor('');
    mostrarMensagem('Gasto fixo cadastrado com sucesso!');

    try {
      await api.post('/api/finance/fixed-expenses', novoFixo);
    } catch (e) {}
  };

  // Remover gasto fixo
  const handleRemoverFixo = async (id) => {
    if (!window.confirm('Deseja excluir este gasto fixo?')) return;
    const novoData = {
      ...data,
      gastosFixos: (data.gastosFixos || []).filter(g => g.id !== id)
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.delete(`/api/finance/fixed-expenses/${id}`);
    } catch (e) {}
  };

  // Cadastrar nova meta
  const handleAdicionarMeta = async (e) => {
    e.preventDefault();
    if (!novaMetaTitulo.trim() || !novaMetaValor) return;

    const valNum = parseFloat(novaMetaValor.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) return;

    const novaMeta = {
      id: `meta-${Date.now()}`,
      titulo: novaMetaTitulo.trim(),
      categoria: novaMetaCategoria,
      valorAlvo: valNum,
      valorAtual: 0,
      icone: novaMetaIcone,
      dataAlvo: '2027-12-31'
    };

    const novoData = {
      ...data,
      metas: [...(data.metas || []), novaMeta]
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    setNovaMetaTitulo('');
    setNovaMetaValor('');
    mostrarMensagem('Nova meta cadastrada!');

    try {
      await api.post('/api/finance/goals', novaMeta);
    } catch (e) {}
  };

  // Aportar dinheiro em uma meta
  const handleAporteMeta = async (metaId) => {
    const valNum = parseFloat(valorAporte.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) return;

    const novoData = {
      ...data,
      metas: (data.metas || []).map(m =>
        m.id === metaId ? { ...m, valorAtual: Number(m.valorAtual || 0) + valNum } : m
      )
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    setAporteMetaId(null);
    setValorAporte('');
    mostrarMensagem('Aporte realizado com sucesso!');

    try {
      await api.patch(`/api/finance/goals/${metaId}`, { valorAporte: valNum });
    } catch (e) {}
  };

  // Remover meta
  const handleRemoverMeta = async (id) => {
    if (!window.confirm('Excluir esta meta?')) return;
    const novoData = {
      ...data,
      metas: (data.metas || []).filter(m => m.id !== id)
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.delete(`/api/finance/goals/${id}`);
    } catch (e) {}
  };

  // Cadastrar nova fatura de cartão / conta do próximo mês (ex: PicPay)
  const handleAdicionarFatura = async (e) => {
    e.preventDefault();
    if (!novaFaturaNome.trim() || !novaFaturaValor) return;

    const valNum = parseFloat(String(novaFaturaValor).replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) return;

    const novaFatura = {
      id: `fatura-${Date.now()}`,
      nome: novaFaturaNome.trim(),
      valor: valNum,
      vencimento: novaFaturaVencimento || '2026-10-19',
      mesReferencia: novaFaturaMes || 'Outubro / 2026',
      paga: false,
      dataPagamento: null,
      categoria: 'Cartão de Crédito',
      observacao: novaFaturaObs.trim()
    };

    const novoData = {
      ...data,
      faturasCartoes: [...(data.faturasCartoes || []), novaFatura]
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    setNovaFaturaNome('PicPay (Cartão)');
    setNovaFaturaValor('');
    setMostrarFormFatura(false);
    mostrarMensagem(`Fatura de ${novaFatura.nome} cadastrada com sucesso!`);

    try {
      await api.post('/api/finance/fatura-cartao', novaFatura);
    } catch (e) {}
  };

  // Salvar valor editado de uma fatura existente (ex: mudar de R$ 600 para R$ 300)
  const handleSalvarEdicaoFatura = async (id) => {
    const valNum = parseFloat(String(valorEditadoFatura).replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) {
      setEditandoFaturaId(null);
      return;
    }

    const novoData = {
      ...data,
      faturasCartoes: (data.faturasCartoes || []).map(f =>
        f.id === id ? { ...f, valor: valNum } : f
      )
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));
    setEditandoFaturaId(null);
    mostrarMensagem(`Valor da fatura atualizado para ${formatBRL(valNum)}!`);

    try {
      await api.put(`/api/finance/fatura-cartao/${id}`, { valor: valNum });
    } catch (e) {}
  };

  // Alternar Paga / Pendente fatura de cartão
  const toggleFaturaCartao = async (fatura) => {
    const novoStatus = !fatura.paga;
    const novoData = {
      ...data,
      faturasCartoes: (data.faturasCartoes || []).map(f =>
        f.id === fatura.id ? { ...f, paga: novoStatus, dataPagamento: novoStatus ? new Date().toISOString().split('T')[0] : null } : f
      )
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.put(`/api/finance/fatura-cartao/${fatura.id}/toggle`);
    } catch (e) {}
  };

  // Remover fatura de cartão
  const handleRemoverFatura = async (id) => {
    if (!window.confirm('Deseja excluir esta fatura/conta de cartão?')) return;
    const novoData = {
      ...data,
      faturasCartoes: (data.faturasCartoes || []).filter(f => f.id !== id)
    };
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));

    try {
      await api.delete(`/api/finance/fatura-cartao/${id}`);
    } catch (e) {}
  };

  // Atualizar Renda & Perfil
  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    const payload = {
      rendaLiquida: parseFloat(rendaBaseInput) || 0,
      rendaExtraMes: parseFloat(rendaExtraInput || 0),
      motivoRendaExtra: motivoRendaExtraInput.trim(),
      email: emailInput.trim(),
      whatsappPhone: whatsappPhone.trim(),
      whatsappApiKey: whatsappApiKey.trim(),
      notificacoesWppAtivas,
      diaLembreteWpp: Number(diaLembreteWpp) || 2,
      ...(novaSenhaInput.trim() ? { senha: novaSenhaInput.trim() } : {})
    };

    const novoData = {
      ...data,
      perfil: {
        ...data.perfil,
        ...payload
      }
    };

    if (novaSenhaInput.trim()) {
      novoData.perfil.senhaTemporaria = false;
    }
    setData(novoData);
    localStorage.setItem('finance_cached_data', JSON.stringify(novoData));
    localStorage.setItem('finance_saved_email', emailInput.trim());

    if (novaSenhaInput.trim() && localStorage.getItem('finance_remember_me') === 'true') {
      localStorage.setItem('finance_saved_password', novaSenhaInput.trim());
    }

    setNovaSenhaInput('');
    mostrarMensagem('Perfil, credenciais e Robô de WhatsApp salvos no Oracle ATP!');

    try {
      await api.put('/api/finance/profile', payload);
      setSyncStatus('Oracle ATP (Exadata)');
    } catch (e) {
      setSyncStatus('Salvo local');
    }
  };

  // Disparar Teste ou Alerta no WhatsApp
  const handleDispararWpp = async (tipo) => {
    setEnviandoWpp(true);
    try {
      const res = await api.post('/api/finance/notify-whatsapp', { tipo });
      if (res.data?.success) {
        mostrarMensagem(res.data.mensagem || 'Mensagem enviada no WhatsApp com sucesso!');
      } else {
        mostrarMensagem('Erro: ' + (res.data?.erro || 'Falha no envio'));
      }
    } catch (err) {
      mostrarMensagem('Erro ao conectar com WhatsApp: ' + (err.response?.data?.erro || err.message));
    } finally {
      setEnviandoWpp(false);
    }
  };

  // Iniciais do Avatar
  const nomeUsuario = data.perfil?.nome || 'Usuário';
  const iniciais = nomeUsuario
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('') || 'U';

  const despesasFiltradas = (data.despesasVariaveis || []).filter(t => {
    if (filtroCategoria === 'Todas') return true;
    return t.categoria === filtroCategoria;
  });

  const temDividas = summary.valorTotalAcordo > 0 && (data.parcelas || []).length > 0;

  // Cálculos para Gráfico Donut de Distribuição Financeira
  const totalDividasMes = Number(summary.valorParcela || 0) + Number(summary.totalFaturasCartoes || 0);
  const totalFixosMes = Number(summary.totalFixos || 0);
  const totalVariavelMes = Number(summary.totalVariavel || 0);
  const totalRendaCalc = rendaTotalMes > 0 ? rendaTotalMes : (totalDividasMes + totalFixosMes + totalVariavelMes || 1);

  const pctDividas = Math.min(100, Math.round((totalDividasMes / totalRendaCalc) * 100));
  const pctFixos = Math.min(100, Math.round((totalFixosMes / totalRendaCalc) * 100));
  const pctVariavel = Math.min(100, Math.round((totalVariavelMes / totalRendaCalc) * 100));
  const pctSaldoLivre = Math.max(0, 100 - (pctDividas + pctFixos + pctVariavel));

  // Amortização do 13º Salário
  const valorParcelaBase = Number(summary.valorParcela || (data.parcelas?.length > 0 ? data.parcelas[0].valor : 0));
  const parcelasEliminadas = valorParcelaBase > 0 ? Math.max(0, Math.floor(valorSimulado13 / valorParcelaBase)) : 0;
  const economiaJurosEstimada = Math.round(parcelasEliminadas * valorParcelaBase * 0.28);
  const mesesAdiantados = parcelasEliminadas;

  // Data de hoje formatada em PT-BR
  const dataHojeTexto = (() => {
    try {
      const opcoes = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const str = new Intl.DateTimeFormat('pt-BR', opcoes).format(new Date());
      return str.charAt(0).toUpperCase() + str.slice(1);
    } catch (e) {
      return '23 de Setembro de 2026';
    }
  })();

  return (
    <div className="app-container">
      {/* Topbar Header com Logo Simples */}
      <header className="topbar">
        <div className="topbar-brand-section">
          <div className="brand-logo-badge">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="7" fill="#10b981" fillOpacity="0.2" />
              <path d="M12 2L4 6V12C4 17 7.5 21.5 12 22C16.5 21.5 20 17 20 12V6L12 2Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M12 7V17M9 10.5H15M9 13.5H14" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="brand-texts">
              <span className="brand-title">Fin<strong>Control</strong></span>
              <span className="brand-subtitle">{syncStatus}</span>
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Botão de Ocultar / Exibir Saldos */}
          <button
            onClick={toggleOcultarSaldos}
            className="btn-icon"
            title={ocultarSaldos ? "Exibir Saldos e Valores" : "Ocultar Saldos (Modo Privacidade)"}
            style={{
              color: ocultarSaldos ? '#fbbf24' : '#10b981',
              borderColor: ocultarSaldos ? 'rgba(251,191,36,0.4)' : 'rgba(16,185,129,0.3)',
              background: ocultarSaldos ? 'rgba(251,191,36,0.12)' : 'rgba(16,185,129,0.08)'
            }}
          >
            {ocultarSaldos ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            )}
          </button>
          <button 
            onClick={handleInstalarPwa} 
            className="btn-icon" 
            title="Baixar App no Celular (iPhone / Android)" 
            style={{ 
              color: '#10b981', 
              borderColor: 'rgba(16,185,129,0.4)',
              background: 'rgba(16,185,129,0.12)'
            }}
          >
            📲
          </button>
          <button 
            onClick={handleExportarCSV} 
            className="btn-icon" 
            title="Exportar Planilha Completa (Excel / CSV)"
            style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)' }}
          >
            📊
          </button>
          <button 
            onClick={pushPermissao === 'granted' ? handleTestarNotificacao : handleAtivarNotificacoes} 
            className="btn-icon" 
            title={pushPermissao === 'granted' ? 'Notificações Ativas no Celular (Toque para testar alerta)' : 'Ativar Notificações no Celular / Navegador'}
            style={pushPermissao === 'granted' ? { color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.1)' } : { color: '#94a3b8' }}
          >
            {pushPermissao === 'granted' ? '🔔' : '🔕'}
          </button>
          <button onClick={carregarDados} className="btn-icon" title="Sincronizar Oracle ATP">🔄</button>
          <button onClick={onLogout} className="btn-icon" title="Sair">🚪</button>
        </div>
      </header>

      {/* Banner da Data de Hoje */}
      <div className="date-banner">
        <div className="date-badge">
          <span>📅</span> <strong>Hoje:</strong> {dataHojeTexto}
        </div>
        <div className="date-user-chip">
          <div className="user-avatar-mini">{iniciais}</div>
          <span>{nomeUsuario.split(' ')[0]}</span>
        </div>
      </div>

      {/* SELETOR DE MÊS / HISTÓRICO & PLANEJAMENTO FUTURO */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1.25rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <button
          onClick={() => {
            const idx = MESES_DISPONIVEIS.findIndex(m => m.id === mesAtivo);
            if (idx > 0) setMesAtivo(MESES_DISPONIVEIS[idx - 1].id);
          }}
          disabled={mesAtivo === MESES_DISPONIVEIS[0].id}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: mesAtivo === MESES_DISPONIVEIS[0].id ? '#475569' : '#fff',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            cursor: mesAtivo === MESES_DISPONIVEIS[0].id ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ◀
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.9rem' }}>🗓️</span>
          <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
            {MESES_DISPONIVEIS.find(m => m.id === mesAtivo)?.rotulo || mesAtivo}
          </strong>
          {mesAtivo === '2026-09' && (
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399'
            }}>
              Mês Vigente
            </span>
          )}
        </div>

        <button
          onClick={() => {
            const idx = MESES_DISPONIVEIS.findIndex(m => m.id === mesAtivo);
            if (idx < MESES_DISPONIVEIS.length - 1) setMesAtivo(MESES_DISPONIVEIS[idx + 1].id);
          }}
          disabled={mesAtivo === MESES_DISPONIVEIS[MESES_DISPONIVEIS.length - 1].id}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: mesAtivo === MESES_DISPONIVEIS[MESES_DISPONIVEIS.length - 1].id ? '#475569' : '#fff',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            cursor: mesAtivo === MESES_DISPONIVEIS[MESES_DISPONIVEIS.length - 1].id ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ▶
        </button>
      </div>

      {/* Alerta / Notificação Flutuante */}
      {alerta && (
        <div style={{ padding: '0 1.25rem', marginTop: '0.75rem' }}>
          <div className="alert-box">{alerta}</div>
        </div>
      )}

      {/* Aviso de Senha Temporária */}
      {data.perfil?.senhaTemporaria && (
        <div style={{ padding: '0 1.25rem', marginTop: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(90deg, rgba(234, 88, 12, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '0.85rem', display: 'block' }}>
                  Você está utilizando uma Senha Temporária!
                </strong>
                <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>
                  Por segurança, defina sua senha pessoal definitiva na aba <strong>Perfil</strong>.
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('perfil')}
              style={{
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: 'none',
                background: '#f59e0b',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              🔑 Trocar Senha
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal com Abas */}
      <main className="main-content">
        {/* ========================================================= */}
        {/* ABA 1: DASHBOARD (TELA PRINCIPAL)                         */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <>
            {/* Card Saldo Livre Destaque */}
            <section className="hero-card">
              <div className="hero-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>✨</span> Saldo Livre Restante do Mês
                </div>
                <button
                  onClick={toggleOcultarSaldos}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: ocultarSaldos ? '#fbbf24' : '#cbd5e1',
                    borderRadius: '8px',
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.2s'
                  }}
                  title={ocultarSaldos ? "Clique para exibir saldos" : "Clique para ocultar saldos"}
                >
                  {ocultarSaldos ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                      <span>Oculto</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <span>Visível</span>
                    </>
                  )}
                </button>
              </div>
              <div className="hero-value" style={ocultarSaldos ? { letterSpacing: '4px' } : {}}>
                {formatBRL(saldoLivreReal)}
              </div>

              <div className="hero-grid">
                <div className="hero-subitem">
                  <span>Renda Total do Mês</span>
                  <span style={{ color: '#10b981' }}>{formatBRL(rendaTotalMes)}</span>
                </div>
                <div className="hero-subitem">
                  <span>Comprometido (Dívida + Fixos)</span>
                  <span style={{ color: '#f43f5e' }}>-{formatBRL(summary.totalComprometido)}</span>
                </div>
                <div className="hero-subitem">
                  <span>Gastos Diários</span>
                  <span style={{ color: '#f59e0b' }}>-{formatBRL(summary.totalVariavel)}</span>
                </div>
                <div className="hero-subitem">
                  <span>Dívida Restante</span>
                  <span style={{ color: '#8b5cf6' }}>{formatBRL(summary.saldoDevedorRestante)}</span>
                </div>
              </div>
            </section>

            {/* Aviso de Renda Extra se houver */}
            {data.perfil?.rendaExtraMes > 0 && (
              <div style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.8rem',
                color: '#10b981'
              }}>
                🎉 <strong>Renda Extra Ativa:</strong> +{formatBRL(data.perfil.rendaExtraMes)} ({data.perfil.motivoRendaExtra || '13º / Bônus'}) somados ao seu orçamento!
              </div>
            )}

            {/* GRÁFICO VISUAL DE DISTRIBUIÇÃO DE GASTOS (DONUT INTERATIVO) */}
            <section className="card" style={{ padding: '1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📊</span> Distribuição da Renda ({MESES_DISPONIVEIS.find(m => m.id === mesAtivo)?.curto || 'Mês'})
                  </div>
                  <div className="card-subtitle">
                    Visão percentual de para onde está indo o seu dinheiro
                  </div>
                </div>
              </div>

              {/* Render do Gráfico SVG Donut e Legenda */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '130px 1fr',
                gap: '1.25rem',
                alignItems: 'center'
              }}>
                {/* SVG Donut */}
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                  <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    {/* Fundo do círculo */}
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />

                    {/* Dívidas & Cartões (Vermelho) */}
                    {pctDividas > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth="12"
                        strokeDasharray={`${(pctDividas / 100) * 238.76} 238.76`}
                        strokeDashoffset="0"
                      />
                    )}

                    {/* Gastos Fixos (Azul) */}
                    {pctFixos > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="12"
                        strokeDasharray={`${(pctFixos / 100) * 238.76} 238.76`}
                        strokeDashoffset={`${-((pctDividas / 100) * 238.76)}`}
                      />
                    )}

                    {/* Gastos Diários (Laranja) */}
                    {pctVariavel > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="12"
                        strokeDasharray={`${(pctVariavel / 100) * 238.76} 238.76`}
                        strokeDashoffset={`${-(((pctDividas + pctFixos) / 100) * 238.76)}`}
                      />
                    )}

                    {/* Saldo Livre (Verde) */}
                    {pctSaldoLivre > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeDasharray={`${(pctSaldoLivre / 100) * 238.76} 238.76`}
                        strokeDashoffset={`${-(((pctDividas + pctFixos + pctVariavel) / 100) * 238.76)}`}
                      />
                    )}
                  </svg>

                  {/* Texto Central */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Livre</span>
                    <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>{pctSaldoLivre}%</strong>
                  </div>
                </div>

                {/* Legenda com Valores e Percentuais */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f43f5e', display: 'inline-block' }} />
                      <span style={{ color: '#cbd5e1' }}>Dívidas / Cartões</span>
                    </div>
                    <div>
                      <strong style={{ color: '#f43f5e' }}>{formatBRL(totalDividasMes)}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', marginLeft: '0.3rem' }}>({pctDividas}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6', display: 'inline-block' }} />
                      <span style={{ color: '#cbd5e1' }}>Gastos Fixos</span>
                    </div>
                    <div>
                      <strong style={{ color: '#60a5fa' }}>{formatBRL(totalFixosMes)}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', marginLeft: '0.3rem' }}>({pctFixos}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', display: 'inline-block' }} />
                      <span style={{ color: '#cbd5e1' }}>Gastos Diários</span>
                    </div>
                    <div>
                      <strong style={{ color: '#fbbf24' }}>{formatBRL(totalVariavelMes)}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', marginLeft: '0.3rem' }}>({pctVariavel}%)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981', display: 'inline-block' }} />
                      <strong style={{ color: '#fff' }}>Saldo Livre</strong>
                    </div>
                    <div>
                      <strong style={{ color: '#34d399' }}>{formatBRL(saldoLivreReal)}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.68rem', marginLeft: '0.3rem' }}>({pctSaldoLivre}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SIMULADOR DE AMORTIZAÇÃO COM O 13º SALÁRIO (ECONOMIA DE JUROS DO ITAÚ) */}
            {temDividas && (
              <section className="card" style={{ borderLeft: '4px solid #f59e0b', background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
                <div 
                  className="card-header" 
                  onClick={() => setMostrarSimulador13(!mostrarSimulador13)}
                  style={{ cursor: 'pointer', alignItems: 'flex-start' }}
                >
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24' }}>
                      <span style={{ fontSize: '1.25rem' }}>⚡</span> Simulador de Amortização com o 13º Salário
                    </div>
                    <div className="card-subtitle">
                      Veja quantas parcelas você elimina e quanto economiza em juros antecipando o Itaú
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    style={{ fontSize: '0.8rem', width: '28px', height: '28px' }}
                  >
                    {mostrarSimulador13 ? '▲' : '▼'}
                  </button>
                </div>

                {mostrarSimulador13 && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <label style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                      Valor do 13º Salário que você pretende destinar para amortização:
                    </label>

                    {/* Botões Rápidos de Sugestão */}
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setValorSimulado13(1000)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: valorSimulado13 === 1000 ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                          color: valorSimulado13 === 1000 ? '#000' : '#cbd5e1'
                        }}
                      >
                        R$ 1.000 (Parcial)
                      </button>

                      {valorParcelaBase > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setValorSimulado13(valorParcelaBase)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: valorSimulado13 === valorParcelaBase ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                              color: valorSimulado13 === valorParcelaBase ? '#000' : '#cbd5e1'
                            }}
                          >
                            {formatBRL(valorParcelaBase)} (1 Parcela)
                          </button>

                          <button
                            type="button"
                            onClick={() => setValorSimulado13(valorParcelaBase * 2)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: valorSimulado13 === (valorParcelaBase * 2) ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                              color: valorSimulado13 === (valorParcelaBase * 2) ? '#000' : '#cbd5e1'
                            }}
                          >
                            {formatBRL(valorParcelaBase * 2)} (2 Parcelas!)
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setValorSimulado13(2000)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: valorSimulado13 === 2000 ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                            color: valorSimulado13 === 2000 ? '#000' : '#cbd5e1'
                          }}
                        >
                          R$ 2.000
                        </button>
                      )}
                    </div>

                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={valorSimulado13}
                      onChange={(e) => setValorSimulado13(parseFloat(e.target.value) || 0)}
                      placeholder="Ou digite o valor desejado"
                      style={{ marginBottom: '1rem' }}
                    />

                    {/* Resultado da Simulação */}
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                          Parcelas Eliminadas
                        </span>
                        <strong style={{ fontSize: '1.25rem', color: '#f59e0b' }}>
                          {parcelasEliminadas}x
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block' }}>
                          {parcelasEliminadas > 0 ? `Parcelas 5 e 6 antecipadas` : 'Amortização parcial'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                          Quitação Adiantada
                        </span>
                        <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>
                          {mesesAdiantados > 0 ? `${mesesAdiantados} meses antes!` : 'No prazo'}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block' }}>
                          {mesesAdiantados >= 2 ? 'Liquidação em Nov/2026' : mesesAdiantados === 1 ? 'Liquidação em Jan/2027' : 'Em Fev/2027'}
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>
                          Economia Estimada em Juros
                        </span>
                        <strong style={{ fontSize: '1.15rem', color: '#38bdf8' }}>
                          ~ {formatBRL(economiaJurosEstimada)}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: '#cbd5e1', display: 'block' }}>
                          Economia de juros de 12,9% a.m.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* SE O USUÁRIO TEM DÍVIDAS CADASTRADAS */}
            {temDividas ? (
              <section className="card">
                <div 
                  className="card-header" 
                  onClick={() => setDividaItauMinimizada(!dividaItauMinimizada)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="card-title">
                      <span>💳</span> {data.dividaItau?.banco || 'Acordo de Dívida'} ({data.parcelas?.length}x de {formatBRL(summary.valorParcela)})
                    </div>
                    <div className="card-subtitle">
                      Total da Dívida: {formatBRL(summary.valorTotalAcordo)} • Resta {formatBRL(summary.saldoDevedorRestante)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="badge-tag">
                      {summary.parcelasPagasCount} de {summary.totalParcelas} Pagas
                    </span>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ fontSize: '0.8rem', width: '28px', height: '28px', background: 'rgba(255,255,255,0.06)' }}
                      title={dividaItauMinimizada ? 'Expandir Parcelas' : 'Minimizar Parcelas'}
                    >
                      {dividaItauMinimizada ? '▼' : '▲'}
                    </button>
                  </div>
                </div>

                <div className="debt-progress-box">
                  <div className="debt-progress-bar">
                    <div className="debt-progress-fill" style={{ width: `${summary.percentualQuitado}%` }} />
                  </div>
                  <div className="debt-progress-labels">
                    <span>Quitado: {formatBRL(summary.totalAmortizado)} ({summary.percentualQuitado}%)</span>
                    <span>Resta: {formatBRL(summary.saldoDevedorRestante)}</span>
                  </div>
                </div>

                {/* Conteúdo minimizado ou expandido */}
                {dividaItauMinimizada ? (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '0.5rem',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      ⏳ Próxima: <strong>{data.parcelas?.find(p => !p.paga)?.numero || 2}ª Parcela</strong> ({formatDate(data.parcelas?.find(p => !p.paga)?.vencimento)})
                    </span>
                    <button 
                      onClick={() => setDividaItauMinimizada(false)}
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                    >
                      👁️ Ver 6 Parcelas ▼
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="installments-list">
                      {(data.parcelas || []).map((parc) => (
                        <div key={parc.id} className={`installment-item ${parc.paga ? 'is-paid' : ''}`}>
                          <div className="installment-left">
                            <div className="installment-num">{parc.paga ? '✓' : parc.numero}</div>
                            <div className="installment-details">
                              <h4>{parc.numero}ª Parcela • {formatDate(parc.vencimento)}</h4>
                              <p>{parc.paga ? `Pago em ${formatDate(parc.dataPagamento || parc.vencimento)}` : 'Vencimento dia 05'}</p>
                              {parc.observacao && <div className="installment-note">💡 {parc.observacao}</div>}
                            </div>
                          </div>
                          <div className="installment-right">
                            <div className="installment-val">{formatBRL(parc.valor)}</div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleParcela(parc); }}
                              className={`btn-toggle-paid ${parc.paga ? 'paid' : 'pending'}`}
                            >
                              {parc.paga ? 'Paga ✓' : 'Marcar Paga'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        onClick={() => setDividaItauMinimizada(true)}
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem' }}
                      >
                        ▲ Recolher Parcelas
                      </button>
                      <button
                        onClick={() => {
                          if (data.dividaItau) {
                            setDividaBanco(data.dividaItau.banco || '');
                            setDividaValorTotal(String(data.dividaItau.valorTotalAcordo || ''));
                            setDividaParcelasQtd(String(data.dividaItau.quantidadeParcelas || data.parcelas?.length || '6'));
                            setDividaValorParcela(String(data.dividaItau.valorParcela || ''));
                          }
                          setMostrarFormDivida(!mostrarFormDivida);
                        }}
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem' }}
                      >
                        ✏️ Reconfigurar Acordo
                      </button>
                    </div>
                  </>
                )}
              </section>
            ) : (
              /* SE O USUÁRIO NÃO TEM DÍVIDAS CADASTRADAS (NOVO USUÁRIO) */
              <section className="card" style={{ textAlign: 'center', padding: '1.75rem 1.25rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                  Nenhuma dívida cadastrada!
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem', maxWidth: '340px', margin: '0 auto 1rem auto' }}>
                  Se você possui algum acordo de cartão, empréstimo ou parcelamento que quer liquidar, cadastre abaixo para gerenciar mês a mês.
                </p>
                <button
                  onClick={() => {
                    setDividaBanco('');
                    setDividaValorTotal('');
                    setDividaParcelasQtd('6');
                    setDividaValorParcela('');
                    setMostrarFormDivida(!mostrarFormDivida);
                  }}
                  className="btn-primary"
                  style={{ margin: '0 auto' }}
                >
                  + Cadastrar Minha Dívida / Acordo
                </button>
              </section>
            )}

            {/* FORMULÁRIO PARA CADASTRAR OU RECONFIGURAR DÍVIDA */}
            {mostrarFormDivida && (
              <section className="card" style={{ borderColor: 'rgba(59,130,246,0.4)', background: '#131d31' }}>
                <div className="card-header">
                  <div className="card-title">
                    <span>📝</span> Cadastrar Acordo de Dívida / Cartão
                  </div>
                  <button onClick={() => setMostrarFormDivida(false)} className="btn-del">✕</button>
                </div>

                <form onSubmit={handleSalvarDivida} className="quick-add-box">
                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nome da Dívida / Banco</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Nubank, Cartão Itaú, Financiamento"
                      value={dividaBanco}
                      onChange={(e) => setDividaBanco(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-row">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Valor Total (R$)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: 5000.00"
                        value={dividaValorTotal}
                        onChange={(e) => setDividaValorTotal(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nº de Parcelas</label>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Ex: 6"
                        value={dividaParcelasQtd}
                        onChange={(e) => setDividaParcelasQtd(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-row">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Valor da Parcela (R$)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: 833.33 (ou automático)"
                        value={dividaValorParcela}
                        onChange={(e) => setDividaValorParcela(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>1º Vencimento</label>
                      <input
                        type="date"
                        className="input-field"
                        value={dividaVencimento}
                        onChange={(e) => setDividaVencimento(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary">
                    💾 Salvar e Gerar Parcelas no Oracle ATP
                  </button>
                </form>
              </section>
            )}

            {/* SEÇÃO: DÍVIDAS E FATURAS PRÓXIMO MÊS (PICPAY, ETC.) */}
            <section className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <span>💳</span> Dívidas e Fatura Próximo Mês
                  </div>
                  <div className="card-subtitle">
                    Acompanhe faturas de cartão (PicPay) e contas com valor variável
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarFormFatura(!mostrarFormFatura)}
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
                >
                  {mostrarFormFatura ? '✕ Fechar' : '+ Nova Dívida / Fatura'}
                </button>
              </div>

              {/* FORMULÁRIO DE CADASTRO DE NOVA FATURA */}
              {mostrarFormFatura && (
                <form onSubmit={handleAdicionarFatura} className="quick-add-box" style={{ marginBottom: '1.25rem', background: '#162238', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '0.65rem', fontWeight: 700 }}>
                    + Cadastrar Nova Dívida ou Fatura do Mês
                  </h4>
                  <div className="input-row">
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Nome da Conta / Cartão</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Cartão PicPay, Nubank"
                        value={novaFaturaNome}
                        onChange={(e) => setNovaFaturaNome(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Valor Previsto R$</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: 600 ou 300"
                        value={novaFaturaValor}
                        onChange={(e) => setNovaFaturaValor(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Data de Vencimento</label>
                      <input
                        type="date"
                        className="input-field"
                        value={novaFaturaVencimento}
                        onChange={(e) => setNovaFaturaVencimento(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Mês Referência</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Outubro / 2026"
                        value={novaFaturaMes}
                        onChange={(e) => setNovaFaturaMes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Observação (Opcional)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: Valor varia entre R$ 300 e R$ 600 conforme fechamento"
                      value={novaFaturaObs}
                      onChange={(e) => setNovaFaturaObs(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setMostrarFormFatura(false)}
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                      💾 Salvar Dívida no Oracle ATP
                    </button>
                  </div>
                </form>
              )}

              {/* LISTAGEM DAS DÍVIDAS E FATURAS (PICPAY, ETC.) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(data.faturasCartoes || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    Nenhuma dívida ou fatura cadastrada. Clique em "+ Nova Dívida / Fatura" acima para lançar!
                  </div>
                ) : (
                  (data.faturasCartoes || []).map((fat) => (
                    <div
                      key={fat.id}
                      style={{
                        background: fat.paga ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${fat.paga ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '14px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Linha Superior: Nome, Badge e Valor em Destaque */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>💳</span>
                            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
                              {fat.nome}
                            </h4>
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '20px',
                              background: fat.paga ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.15)',
                              color: fat.paga ? '#10b981' : '#38bdf8',
                              fontWeight: 600
                            }}>
                              {fat.mesReferencia || 'Outubro'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                            📅 Vencimento: {formatDate(fat.vencimento)}
                          </div>
                        </div>

                        {/* Valor em Destaque Grande */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: fat.paga ? '#10b981' : '#38bdf8' }}>
                            {formatBRL(fat.valor)}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {fat.paga ? 'Status: Pago ✓' : 'Valor Variável'}
                          </span>
                        </div>
                      </div>

                      {/* Observação / Dica */}
                      {fat.observacao && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          borderLeft: '2px solid #38bdf8'
                        }}>
                          💡 {fat.observacao}
                        </div>
                      )}

                      {/* Modal / Caixa de Ajuste de Valor Confortável */}
                      {editandoFaturaId === fat.id && (
                        <div style={{
                          background: '#1a2744',
                          border: '1px solid #38bdf8',
                          borderRadius: '10px',
                          padding: '0.85rem',
                          marginTop: '0.25rem'
                        }}>
                          <label style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                            Digite o novo valor da fatura (ex: se veio R$ 300):
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>R$</span>
                              <input
                                type="number"
                                step="0.01"
                                className="input-field"
                                style={{ paddingLeft: '2.2rem', fontSize: '1rem', fontWeight: 700, width: '100%' }}
                                value={valorEditadoFatura}
                                onChange={(e) => setValorEditadoFatura(e.target.value)}
                                placeholder="0,00"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSalvarEdicaoFatura(fat.id)}
                              className="btn-primary"
                              style={{ padding: '0.6rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                            >
                              Salvar Novo Valor
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoFaturaId(null)}
                              className="btn-secondary"
                              style={{ padding: '0.6rem 0.8rem', fontSize: '0.82rem' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Barra de Ações: Botões Grandes e Fáceis de Clicar no Mobile */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 0.8fr',
                        gap: '0.5rem',
                        marginTop: '0.25rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        {/* Botão 1: Marcar Paga / Pendente */}
                        <button
                          type="button"
                          onClick={() => toggleFaturaCartao(fat)}
                          style={{
                            background: fat.paga ? '#10b981' : 'rgba(16,185,129,0.15)',
                            color: fat.paga ? '#ffffff' : '#10b981',
                            border: '1px solid rgba(16,185,129,0.5)',
                            borderRadius: '8px',
                            padding: '0.55rem 0.4rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          {fat.paga ? '✓ Paga' : '✅ Marcar Paga'}
                        </button>

                        {/* Botão 2: Alterar Valor */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoFaturaId(fat.id);
                            setValorEditadoFatura(fat.valor);
                          }}
                          className="btn-secondary"
                          style={{
                            padding: '0.55rem 0.4rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: '#38bdf8',
                            borderColor: 'rgba(56,189,248,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.3rem'
                          }}
                          title="Alterar o valor da fatura (ex: se vier R$ 300)"
                        >
                          ✏️ Mudar Valor
                        </button>

                        {/* Botão 3: Excluir */}
                        <button
                          type="button"
                          onClick={() => handleRemoverFatura(fat.id)}
                          style={{
                            background: 'rgba(244,63,94,0.1)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244,63,94,0.3)',
                            borderRadius: '8px',
                            padding: '0.55rem 0.4rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.2rem'
                          }}
                          title="Excluir se cadastrou errado"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* ABA 2: GASTOS DO DIA A DIA                                */}
        {/* ========================================================= */}
        {activeTab === 'gastos' && (
          <>
            <section className="card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
                <div>
                  <div className="card-title">
                    <span>🛒</span> Lançar Novo Gasto
                  </div>
                  <div className="card-subtitle">
                    Alimentação, transporte, lazer e dia a dia
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarModalImportacao(true)}
                    className="btn-primary"
                    style={{
                      fontSize: '0.76rem',
                      padding: '0.45rem 0.8rem',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>📥</span> Importar Extrato (Itaú / PDF / OFX)
                  </button>
                  <span className="badge-tag" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                    Total: {formatBRL(summary.totalVariavel)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAdicionarGasto} className="quick-add-box">
                <div className="input-row">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Descrição (ex: Almoço, Farmácia)"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="R$ 0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <select
                    className="select-field"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                  >
                    <option value="Alimentação">🍽️ Alimentação</option>
                    <option value="Supermercado">🛒 Supermercado</option>
                    <option value="Transporte">🚗 Transporte</option>
                    <option value="Saúde">💊 Saúde / Farmácia</option>
                    <option value="Lazer">🎉 Lazer</option>
                    <option value="Outros">📦 Outros</option>
                  </select>

                  <button type="submit" className="btn-primary">
                    + Lançar Gasto
                  </button>
                </div>
              </form>
            </section>

            <section className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>📜</span> Histórico de Gastos do Mês
                </div>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  style={{
                    background: '#172033',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                    borderRadius: '8px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="Todas">Todas as Categorias</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Supermercado">Supermercado</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="tx-list">
                {despesasFiltradas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                    Nenhum gasto encontrado nesta categoria.
                  </div>
                ) : (
                  despesasFiltradas.map((item) => (
                    <div key={item.id} className="tx-item">
                      <div className="tx-left">
                        <h5>{item.descricao}</h5>
                        <span>{item.categoria} • {formatDate(item.data)}</span>
                      </div>
                      <div className="tx-right">
                        <span className="tx-val">-{formatBRL(item.valor)}</span>
                        <button
                          onClick={() => handleRemoverGasto(item.id)}
                          className="btn-del"
                          title="Remover"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* ABA 3: GASTOS FIXOS                                       */}
        {/* ========================================================= */}
        {activeTab === 'fixos' && (
          <>
            <section className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <span>🛡️</span> Cadastrar Novo Gasto Fixo
                  </div>
                  <div className="card-subtitle">
                    Assinaturas, saúde, esportes e compromissos mensais
                  </div>
                </div>
                <span className="badge-tag" style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>
                  Total: {formatBRL(summary.totalFixos)}
                </span>
              </div>

              <form onSubmit={handleAdicionarFixo} className="quick-add-box">
                <div className="input-row">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nome (ex: Pilates, Spotify)"
                    value={novoFixoNome}
                    onChange={(e) => setNovoFixoNome(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Valor R$"
                    value={novoFixoValor}
                    onChange={(e) => setNovoFixoValor(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <select
                    className="select-field"
                    value={novoFixoCategoria}
                    onChange={(e) => setNovoFixoCategoria(e.target.value)}
                  >
                    <option value="Saúde">💊 Saúde</option>
                    <option value="Esporte">🥋 Esporte / Luta</option>
                    <option value="Essencial">📱 Essencial / Telecom</option>
                    <option value="Educação">📚 Educação</option>
                    <option value="Lazer">🎉 Assinatura / Lazer</option>
                  </select>

                  <button type="submit" className="btn-primary">
                    + Salvar Gasto Fixo
                  </button>
                </div>
              </form>
            </section>

            <section className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>📋</span> Seus Gastos Fixos Ativos
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Marque o que já pagou</span>
              </div>

              <div className="fixed-expenses-list">
                {(data.gastosFixos || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                    Nenhum gasto fixo cadastrado ainda. Use o formulário acima!
                  </div>
                ) : (
                  (data.gastosFixos || []).map((gasto) => (
                    <div key={gasto.id} className="fixed-expense-row">
                      <div className="fixed-expense-left">
                        <input
                          type="checkbox"
                          className="fixed-checkbox"
                          checked={Boolean(gasto.pago)}
                          onChange={() => toggleGastoFixo(gasto)}
                        />
                        <div>
                          <div className="fixed-name">{gasto.nome}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {gasto.categoria} • {gasto.pago ? 'Pago no mês ✓' : 'Pendente'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div className="fixed-val">{formatBRL(gasto.valor)}</div>
                        <button
                          onClick={() => handleRemoverFixo(gasto.id)}
                          className="btn-del"
                          title="Excluir gasto fixo"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* SEÇÃO: DÍVIDAS E FATURAS PRÓXIMO MÊS NA ABA FIXOS */}
            <section className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <span>💳</span> Dívidas e Fatura Próximo Mês
                  </div>
                  <div className="card-subtitle">
                    Contas com valor variável para o mês atual ou próximo mês
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMostrarFormFatura(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem' }}
                >
                  + Nova Dívida / Fatura
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(data.faturasCartoes || []).map((fat) => (
                  <div
                    key={fat.id}
                    style={{
                      background: fat.paga ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${fat.paga ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '14px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>💳</span>
                          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
                            {fat.nome}
                          </h4>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '20px',
                            background: fat.paga ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.15)',
                            color: fat.paga ? '#10b981' : '#38bdf8',
                            fontWeight: 600
                          }}>
                            {fat.mesReferencia || 'Outubro'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                          📅 Vencimento: {formatDate(fat.vencimento)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: fat.paga ? '#10b981' : '#38bdf8' }}>
                          {formatBRL(fat.valor)}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {fat.paga ? 'Status: Pago ✓' : 'Valor Variável'}
                        </span>
                      </div>
                    </div>

                    {fat.observacao && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        borderLeft: '2px solid #38bdf8'
                      }}>
                        💡 {fat.observacao}
                      </div>
                    )}

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 0.8fr',
                      gap: '0.5rem',
                      marginTop: '0.25rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleFaturaCartao(fat)}
                        style={{
                          background: fat.paga ? '#10b981' : 'rgba(16,185,129,0.15)',
                          color: fat.paga ? '#ffffff' : '#10b981',
                          border: '1px solid rgba(16,185,129,0.5)',
                          borderRadius: '8px',
                          padding: '0.55rem 0.4rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        {fat.paga ? '✓ Paga' : '✅ Marcar Paga'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditandoFaturaId(fat.id);
                          setValorEditadoFatura(fat.valor);
                          setActiveTab('dashboard');
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '0.55rem 0.4rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#38bdf8',
                          borderColor: 'rgba(56,189,248,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        ✏️ Mudar Valor
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoverFatura(fat.id)}
                        style={{
                          background: 'rgba(244,63,94,0.1)',
                          color: '#f43f5e',
                          border: '1px solid rgba(244,63,94,0.3)',
                          borderRadius: '8px',
                          padding: '0.55rem 0.4rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.2rem'
                        }}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* ABA 4: METAS & SONHOS                                     */}
        {/* ========================================================= */}
        {activeTab === 'metas' && (
          <>
            <section className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <span>🎯</span> Metas & Planejamento Financeiro
                  </div>
                  <div className="card-subtitle">
                    Acompanhe a quitação e guarde para viagens e reservas
                  </div>
                </div>
                <span className="badge-tag" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
                  Total Poupado: {formatBRL(summary.totalMetasPoupado)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(data.metas || []).map((meta) => {
                  const pct = Math.min(100, Math.round(((meta.valorAtual || 0) / (meta.valorAlvo || 1)) * 100));
                  return (
                    <div key={meta.id} className="goal-card">
                      <div className="goal-header">
                        <div className="goal-title-box">
                          <div className="goal-icon">{meta.icone || '🎯'}</div>
                          <div className="goal-meta-info">
                            <h4>{meta.titulo}</h4>
                            <p>{meta.categoria} {meta.dataAlvo ? `• Limite: ${formatDate(meta.dataAlvo)}` : ''}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoverMeta(meta.id)}
                          className="btn-del"
                          title="Excluir meta"
                        >
                          ✕
                        </button>
                      </div>

                      {meta.descricao && (
                        <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          {meta.descricao}
                        </p>
                      )}

                      <div className="debt-progress-bar">
                        <div className="debt-progress-fill" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="debt-progress-labels">
                        <span>Guardado: {formatBRL(meta.valorAtual)} ({pct}%)</span>
                        <span>Alvo: {formatBRL(meta.valorAlvo)}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                        {aporteMetaId === meta.id ? (
                          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Valor do aporte (R$)"
                              value={valorAporte}
                              onChange={(e) => setValorAporte(e.target.value)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleAporteMeta(meta.id)}
                              className="btn-primary"
                              style={{ padding: '0.5rem 0.8rem' }}
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setAporteMetaId(null)}
                              className="btn-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAporteMetaId(meta.id); setValorAporte(''); }}
                            className="btn-secondary"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                          >
                            <span>💰</span> Guardar Dinheiro nesta Meta
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Criar Nova Meta */}
            <section className="card">
              <div className="card-title" style={{ marginBottom: '0.75rem' }}>
                <span>✨</span> Criar Nova Meta Pessoal
              </div>

              <form onSubmit={handleAdicionarMeta} className="quick-add-box">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Título (ex: Viagem para Fernando de Noronha)"
                  value={novaMetaTitulo}
                  onChange={(e) => setNovaMetaTitulo(e.target.value)}
                  required
                />

                <div className="input-row">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Valor Alvo R$"
                    value={novaMetaValor}
                    onChange={(e) => setNovaMetaValor(e.target.value)}
                    required
                  />
                  <select
                    className="select-field"
                    value={novaMetaIcone}
                    onChange={(e) => setNovaMetaIcone(e.target.value)}
                  >
                    <option value="✈️">✈️ Viagem</option>
                    <option value="🛡️">🛡️ Reserva</option>
                    <option value="💻">💻 Tecnologia</option>
                    <option value="🏠">🏠 Casa</option>
                    <option value="🚗">🚗 Carro</option>
                    <option value="🎁">🎁 Sonho</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary">
                  + Adicionar Nova Meta
                </button>
              </form>
            </section>
          </>
        )}

        {/* ========================================================= */}
        {/* ABA 5: PERFIL & AJUSTE DE RENDA                           */}
        {/* ========================================================= */}
        {activeTab === 'perfil' && (
          <>
            {/* GESTÃO DE SOLICITAÇÕES DE ACESSO (EXCLUSIVO ADMINISTRADOR VINÍCIUS) */}
            {isAdmin && (
              <section className="card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
                <div className="card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa' }}>
                      <span style={{ fontSize: '1.25rem' }}>👑</span> Painel de Aprovação de Acessos
                    </div>
                    <div className="card-subtitle">
                      Usuários que solicitaram cadastro. Aprove para gerar a senha temporária e enviar no WhatsApp.
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge-tag" style={{
                      color: solicitacoes.filter(s => s.status === 'pending').length > 0 ? '#f59e0b' : '#10b981',
                      borderColor: solicitacoes.filter(s => s.status === 'pending').length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                    }}>
                      {solicitacoes.filter(s => s.status === 'pending').length} Pendente(s)
                    </span>
                    <button
                      type="button"
                      onClick={carregarSolicitacoes}
                      disabled={carregandoSolicitacoes}
                      className="btn-icon"
                      title="Atualizar Solicitações"
                      style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                    >
                      🔄
                    </button>
                  </div>
                </div>

                {/* Toast / Alerta de Sucesso com Botão do WhatsApp */}
                {solicitacaoRecenteAprovada && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                        🎉 Acesso Liberado para {solicitacaoRecenteAprovada.nome}!
                      </strong>
                      <button
                        onClick={() => setSolicitacaoRecenteAprovada(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                      🔑 <strong>Senha Temporária Gerada:</strong> <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#38bdf8', fontWeight: 'bold' }}>{solicitacaoRecenteAprovada.tempPassword}</code>
                    </div>
                    <a
                      href={solicitacaoRecenteAprovada.waLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: '#22c55e',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        marginTop: '0.25rem'
                      }}
                    >
                      <span>📲</span> Enviar Credenciais para {solicitacaoRecenteAprovada.nome} no WhatsApp
                    </a>
                  </div>
                )}

                {/* Filtros de Lista */}
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setFiltroSolicitacao('pending')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: filtroSolicitacao === 'pending' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      color: filtroSolicitacao === 'pending' ? '#000' : '#94a3b8'
                    }}
                  >
                    Pendentes ({solicitacoes.filter(s => s.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroSolicitacao('approved')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: filtroSolicitacao === 'approved' ? '#10b981' : 'rgba(255,255,255,0.06)',
                      color: filtroSolicitacao === 'approved' ? '#fff' : '#94a3b8'
                    }}
                  >
                    Aprovados ({solicitacoes.filter(s => s.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroSolicitacao('todas')}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: filtroSolicitacao === 'todas' ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                      color: filtroSolicitacao === 'todas' ? '#fff' : '#94a3b8'
                    }}
                  >
                    Todas ({solicitacoes.length})
                  </button>
                </div>

                {/* Lista de Solicitações */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {carregandoSolicitacoes && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                      Carregando solicitações no Oracle ATP...
                    </div>
                  )}

                  {!carregandoSolicitacoes && solicitacoes.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.75rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                      Nenhuma solicitação de acesso recebida ainda.
                    </div>
                  )}

                  {!carregandoSolicitacoes && solicitacoes
                    .filter(s => filtroSolicitacao === 'todas' || s.status === filtroSolicitacao)
                    .map(item => {
                      const cleanPhone = String(item.whatsapp || '').replace(/\D/g, '');
                      const isPending = item.status === 'pending';
                      const isApproved = item.status === 'approved';
                      const waChatLink = `https://wa.me/${cleanPhone}`;
                      const waSendCredentialsLink = isApproved
                        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá, ${item.name}! 🚀\n\nSeu acesso ao *Controle Financeiro* foi aprovado com sucesso!\n\n🔗 *Acesse o painel:* https://controle-financeiro-mauve-two.vercel.app/\n👤 *Seu E-mail de Login:* ${item.email}\n🔑 *Sua Senha Temporária:* ${item.tempPassword}\n\n⚠️ *Importante:* No seu primeiro acesso, vá na aba *Perfil* e altere para a sua senha pessoal definitiva!`)}`
                        : waChatLink;

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : isApproved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '10px',
                            padding: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '1rem' }}>👤</span>
                              <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{item.name}</strong>
                            </div>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: isPending ? 'rgba(245, 158, 11, 0.15)' : isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: isPending ? '#fbbf24' : isApproved ? '#34d399' : '#f87171'
                            }}>
                              {isPending ? '⏳ Aguardando Aprovação' : isApproved ? '✅ Aprovado' : '❌ Rejeitado'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'grid', gridTemplateColumns: '1fr', gap: '0.2rem', marginBottom: '0.65rem' }}>
                            <div>📧 <strong>E-mail:</strong> <span style={{ color: '#cbd5e1' }}>{item.email}</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              📱 <strong>WhatsApp:</strong> 
                              <a href={waChatLink} target="_blank" rel="noreferrer" style={{ color: '#22c55e', textDecoration: 'underline' }}>
                                {item.whatsapp}
                              </a>
                            </div>
                            {item.salario > 0 && (
                              <div>💰 <strong>Renda Declarada:</strong> <span style={{ color: '#10b981' }}>{formatBRL(item.salario)}</span></div>
                            )}
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              🕒 Solicitado em: {item.requestedAt ? new Date(item.requestedAt).toLocaleString('pt-BR') : 'Recentemente'}
                            </div>
                          </div>

                          {/* Se aprovado: exibe a senha temporária gerada e botão para reenviar no WhatsApp */}
                          {isApproved && (
                            <div style={{
                              background: 'rgba(16, 185, 129, 0.08)',
                              borderRadius: '6px',
                              padding: '0.5rem 0.65rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                                🔑 Senha Temporária: <strong style={{ color: '#38bdf8' }}>{item.tempPassword || 'Definida'}</strong>
                              </div>
                              <a
                                href={waSendCredentialsLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '6px',
                                  background: '#22c55e',
                                  color: '#fff',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <span>📲</span> Reenviar no WhatsApp
                              </a>
                            </div>
                          )}

                          {/* Se pendente: input para senha temporária + botões Aprovar e Rejeitar */}
                          {isPending && (
                            <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                              <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                                Definir Senha Temporária (ou deixe em branco para gerar aleatória):
                              </label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.4rem', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                                  placeholder="Ex: Fin@2026! (Opcional)"
                                  value={senhasTemp[item.id] || ''}
                                  onChange={(e) => setSenhasTemp({ ...senhasTemp, [item.id]: e.target.value })}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAprovarSolicitacao(item)}
                                  className="btn-primary"
                                  style={{
                                    padding: '0.45rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ✅ Aprovar & Gerar Senha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejeitarSolicitacao(item.id)}
                                  className="btn-secondary"
                                  style={{
                                    padding: '0.45rem 0.65rem',
                                    fontSize: '0.75rem',
                                    color: '#f43f5e',
                                    borderColor: 'rgba(244,63,94,0.3)',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ❌
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* GESTÃO DE PEDIDOS DE RESET DE SENHA (EXCLUSIVO ADMINISTRADOR VINÍCIUS) */}
            {isAdmin && resetsSenha.length > 0 && (
              <section className="card" style={{ borderLeft: '4px solid #0284c7', background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
                <div className="card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
                      <span style={{ fontSize: '1.25rem' }}>🔐</span> Pedidos de Redefinição de Senha
                    </div>
                    <div className="card-subtitle">
                      Usuários que solicitaram nova senha. Aprove para gerar uma senha temporária.
                    </div>
                  </div>
                  <span className="badge-tag" style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)' }}>
                    {resetsSenha.filter(r => r.status === 'pending').length} Pendente(s)
                  </span>
                </div>

                {resetRecenteAprovado && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                        🎉 Senha Redefinida para {resetRecenteAprovado.name}!
                      </strong>
                      <button
                        onClick={() => setResetRecenteAprovado(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                      🔑 <strong>Nova Senha Temporária:</strong> <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#38bdf8', fontWeight: 'bold' }}>{resetRecenteAprovado.tempPassword}</code>
                    </div>
                    <a
                      href={resetRecenteAprovado.waLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: '#22c55e',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.55rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        marginTop: '0.25rem'
                      }}
                    >
                      <span>📲</span> Enviar Nova Senha no WhatsApp
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {resetsSenha.filter(r => r.status === 'pending').map((rItem) => (
                    <div
                      key={rItem.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '10px',
                        padding: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{rItem.name || rItem.email}</strong>
                        <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          Aguardando Reset
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        <div>📧 <strong>E-mail:</strong> {rItem.email}</div>
                        <div>📱 <strong>WhatsApp:</strong> {rItem.whatsapp || 'Não informado'}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                          placeholder="Nova senha (ou automático)"
                          value={senhasTempReset[rItem.id] || ''}
                          onChange={(e) => setSenhasTempReset({ ...senhasTempReset, [rItem.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => handleAprovarReset(rItem)}
                          className="btn-primary"
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', background: '#0284c7' }}
                        >
                          🔑 Resetar Senha
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejeitarReset(rItem.id)}
                          className="btn-secondary"
                          style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem', color: '#f43f5e' }}
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <span>💵</span> Salário & Renda Extra do Mês
                  </div>
                  <div className="card-subtitle">
                    Modifique seu salário base e lance a parcela do 13º quando receber
                  </div>
                </div>
              </div>

              <form onSubmit={handleSalvarPerfil} className="quick-add-box">
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', display: 'block' }}>
                    Salário Líquido Mensal Base (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={rendaBaseInput}
                    onChange={(e) => setRendaBaseInput(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>
                    + Dinheiro Extra deste Mês (13º Salário / Bônus / FGTS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="Ex: 1500.00"
                    value={rendaExtraInput}
                    onChange={(e) => setRendaExtraInput(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', display: 'block' }}>
                    Motivo do Dinheiro Extra
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: 1ª Parcela do 13º Salário (Outubro)"
                    value={motivoRendaExtraInput}
                    onChange={(e) => setMotivoRendaExtraInput(e.target.value)}
                  />
                </div>

                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.78rem',
                  color: '#94a3b8'
                }}>
                  Renda Total Calculada para este Mês:{' '}
                  <strong style={{ color: '#10b981' }}>
                    {formatBRL(Number(rendaBaseInput || 0) + Number(rendaExtraInput || 0))}
                  </strong>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                  <div className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <span>🔐</span> E-mail e Senha de Acesso
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', display: 'block' }}>
                      E-mail de Login
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', display: 'block' }}>
                      Nova Senha (deixe em branco para manter a atual)
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Digite a nova senha"
                      value={novaSenhaInput}
                      onChange={(e) => setNovaSenhaInput(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                  💾 Salvar no Oracle Autonomous Database
                </button>
              </form>
            </section>

            {/* SEÇÃO: ROBÔ DE NOTIFICAÇÕES WHATSAPP */}
            <section className="card" style={{ borderLeft: '4px solid #22c55e' }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🤖</span> Robô de Lembretes no WhatsApp
                  </div>
                  <div className="card-subtitle">
                    Receba notificações automáticas de vencimento das faturas e link direto
                  </div>
                </div>
                <span className="badge-tag" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                  CallMeBot API
                </span>
              </div>

              <div className="quick-add-box">
                {/* Switch de Ativação */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'rgba(34,197,94,0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(34,197,94,0.2)',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'block' }}>
                      Ativar Lembretes Automáticos no WhatsApp
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Envia mensagem no dia {diaLembreteWpp} do mês avisando sobre as contas
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificacoesWppAtivas}
                    onChange={(e) => setNotificacoesWppAtivas(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#22c55e', cursor: 'pointer' }}
                  />
                </div>

                {/* Campos: Telefone e API Key */}
                <div className="input-row">
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Seu Número de WhatsApp (com DDI 55)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: 558195126839"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                      Sua Chave API (apikey CallMeBot)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ex: 7939819"
                      value={whatsappApiKey}
                      onChange={(e) => setWhatsappApiKey(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                    Dia do Mês para Enviar o Lembrete Automático
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="input-field"
                      style={{ maxWidth: '100px' }}
                      value={diaLembreteWpp}
                      onChange={(e) => setDiaLembreteWpp(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      (Padrão recomendado: <strong>Dia 02</strong> — 3 dias antes do Itaú dia 05)
                    </span>
                  </div>
                </div>

                {/* Botões de Ação do Robô */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDispararWpp('teste')}
                    disabled={enviandoWpp}
                    className="btn-secondary"
                    style={{
                      padding: '0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#22c55e',
                      borderColor: 'rgba(34,197,94,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>📲</span> {enviandoWpp ? 'Enviando...' : 'Testar WhatsApp'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDispararWpp('alerta')}
                    disabled={enviandoWpp}
                    className="btn-primary"
                    style={{
                      padding: '0.65rem',
                      fontSize: '0.78rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>🚨</span> {enviandoWpp ? 'Disparando...' : 'Disparar Lembrete'}
                  </button>
                </div>
              </div>

              {/* GUIA PASSO A PASSO: COMO FUNCIONA E COMO FAZ */}
              <div style={{
                marginTop: '1rem',
                background: '#0d1526',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <h4 style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>📖</span> Como Funciona o Robô de WhatsApp & Como Ativar
                </h4>
                
                <p style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.65rem' }}>
                  O robô monitora automaticamente os seus acordos de dívida (Itaú Click), despesas fixas e faturas variáveis (PicPay). Todo <strong>dia 02 de cada mês</strong> às 09:00, ele envia uma mensagem direta no seu WhatsApp com o resumo de tudo o que você tem a pagar, junto com o link direto do sistema, seu usuário e senha para você acessar e marcar o que já quitou.
                </p>

                <div style={{ fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  <strong style={{ color: '#fff' }}>Como gerar sua chave (apikey) gratuita em 30 segundos:</strong>
                  <ol style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
                    <li style={{ marginBottom: '0.25rem' }}>
                      Abra o WhatsApp oficial do robô pelo link:{' '}
                      <a 
                        href="https://wa.me/34644591347?text=I%20allow%20callmebot%20to%20send%20me%20messages" 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        wa.me/34644591347 (+34 644 59 13 47)
                      </a>.
                    </li>
                    <li style={{ marginBottom: '0.25rem' }}>
                      Envie para ele a frase: <code style={{ color: '#10b981', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>I allow callmebot to send me messages</code>
                    </li>
                    <li style={{ marginBottom: '0.25rem' }}>
                      Em segundos o robô responderá com sua chave, por exemplo: <strong style={{ color: '#fff' }}>apikey: 7939819</strong>.
                    </li>
                    <li>
                      Copie o seu número com o 55 (ex: <code style={{ color: '#10b981' }}>558195126839</code>) e a chave nos campos acima e clique em <strong>"Salvar no Oracle Autonomous Database"</strong>.
                    </li>
                  </ol>
                </div>
              </div>
              {/* CONSOLE INTERATIVO DO ROBÔ DE WHATSAPP */}
              <div style={{
                marginTop: '1rem',
                background: '#090d16',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e', fontWeight: 700, fontSize: '0.85rem' }}>
                    <span>💬</span> Chatbot Console: Lançar Gastos via WhatsApp
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Webhook Live</span>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.75rem'
                }}>
                  {botHistorico.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: m.autor === 'user' ? 'flex-end' : 'flex-start',
                        background: m.autor === 'user' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${m.autor === 'user' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '8px',
                        padding: '0.45rem 0.65rem',
                        maxWidth: '88%',
                        whiteSpace: 'pre-line',
                        color: m.autor === 'user' ? '#34d399' : '#e2e8f0'
                      }}
                    >
                      {m.texto}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleEnviarComandoBot} style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem' }}
                    placeholder='Ex: "gastei 45 almoco" ou "saldo"'
                    value={comandoBotInput}
                    onChange={(e) => setComandoBotInput(e.target.value)}
                    disabled={enviandoComandoBot}
                  />
                  <button
                    type="submit"
                    disabled={enviandoComandoBot}
                    className="btn-primary"
                    style={{
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.75rem',
                      background: '#22c55e',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {enviandoComandoBot ? '...' : 'Enviar'}
                  </button>
                </form>
              </div>
            </section>

            {/* SEÇÃO: NOTIFICAÇÕES NATIVAS NO CELULAR (SEM WHATSAPP) */}
            <section className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24' }}>
                    <span>🔔</span> Notificações Nativas no Celular / Desktop
                  </div>
                  <div className="card-subtitle">
                    Alertas do próprio navegador/celular quando contas e faturas (PicPay) estiverem a vencer
                  </div>
                </div>
                <span className="badge-tag" style={{
                  color: pushPermissao === 'granted' ? '#10b981' : '#f59e0b',
                  borderColor: pushPermissao === 'granted' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'
                }}>
                  {pushPermissao === 'granted' ? 'Ativadas ✅' : 'Desativadas 🔕'}
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '0.85rem' }}>
                O FinControl avisa você proativamente quando suas faturas de cartão ou parcelas de dívida estiverem a <strong>2 dias do vencimento</strong> ou no dia do vencimento, sem você precisar abrir o WhatsApp.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {pushPermissao !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleAtivarNotificacoes}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                  >
                    🔔 Ativar Notificações no Celular
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestarNotificacao}
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', background: '#f59e0b' }}
                  >
                    ⚡ Testar Notificação na Tela Agora
                  </button>
                )}
              </div>
            </section>

            {/* SEÇÃO: EXPORTAR PLANILHA COMPLETA (CSV / EXCEL) */}
            <section className="card" style={{ borderLeft: '4px solid #38bdf8' }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
                    <span>📊</span> Exportação de Dados Financeiros
                  </div>
                  <div className="card-subtitle">
                    Baixe apenas os dados em planilha formatada para Microsoft Excel ou Google Sheets
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportarCSV}
                  className="btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', background: '#0284c7' }}
                >
                  📥 Baixar CSV (Excel)
                </button>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Gera um arquivo <code>.csv</code> com resumo do mês, gastos diários categorizados, despesas fixas, faturas de cartão e status das parcelas de dívidas.
              </p>
            </section>

            <section className="card">
              <div className="card-header" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div className="card-title">
                    <span>🏛️</span> Banco de Dados Gerenciado OCI & Backups
                  </div>
                  <div className="card-subtitle">
                    Oracle Autonomous Database (ATP Exadata) Always Free • 20 GB NVMe • 1 OCPU
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackupAgora}
                  disabled={fazendoBackup}
                  className="btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)', whiteSpace: 'nowrap' }}
                >
                  💾 {fazendoBackup ? 'Salvando...' : 'Backup Snapshot Agora'}
                </button>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                Suas informações contam com isolamento multi-tenant e <strong>Backup Diário Automático agendado para às 23:59</strong>, com dumps armazenados com segurança.
              </p>

              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ width: '100%', color: '#f43f5e', textAlign: 'center' }}
              >
                🚪 Sair do Aplicativo
              </button>
            </section>
          </>
        )}
      </main>

      {/* Barra de Navegação Inferior (Mobile Tabs Dock) */}
      <nav className="bottom-nav-bar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`nav-tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <span className="nav-tab-icon">📊</span>
          <span className="nav-tab-label">Início</span>
        </button>

        <button
          onClick={() => setActiveTab('gastos')}
          className={`nav-tab-item ${activeTab === 'gastos' ? 'active' : ''}`}
        >
          <span className="nav-tab-icon">💸</span>
          <span className="nav-tab-label">Gastos</span>
        </button>

        <button
          onClick={() => setActiveTab('fixos')}
          className={`nav-tab-item ${activeTab === 'fixos' ? 'active' : ''}`}
        >
          <span className="nav-tab-icon">🛡️</span>
          <span className="nav-tab-label">Fixos</span>
        </button>

        <button
          onClick={() => setActiveTab('metas')}
          className={`nav-tab-item ${activeTab === 'metas' ? 'active' : ''}`}
        >
          <span className="nav-tab-icon">🎯</span>
          <span className="nav-tab-label">Metas</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`nav-tab-item ${activeTab === 'perfil' ? 'active' : ''}`}
        >
          <span className="nav-tab-icon">👤</span>
          <span className="nav-tab-label">Perfil</span>
        </button>
      </nav>

      {/* MODAL TUTORIAL: INSTALAR PWA NO IPHONE E ANDROID */}
      {mostrarModalPwa && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setMostrarModalPwa(false)}
        >
          <div 
            style={{
              background: '#0f172a',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>
                  📲
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Baixar o FinControl
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Instale como aplicativo nativo sem ocupar memória
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMostrarModalPwa(false)}
                className="btn-del"
                style={{ fontSize: '1rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Seção iPhone (iOS) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🍎</span>
                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Como baixar no iPhone (iOS):</strong>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                  <span>Abra este link no navegador <strong>Safari</strong> do iPhone (não funciona pelo Chrome no iOS).</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                  <span>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com uma setinha para cima <strong style={{ color: '#60a5fa' }}>📤</strong> na barra inferior do Safari).</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>3</span>
                  <span>Role a lista para baixo e toque em <strong style={{ color: '#10b981' }}>"Adicionar à Tela de Início" ➕</strong>.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>4</span>
                  <span>No canto superior direito, toque em <strong>"Adicionar"</strong>. Pronto! O app fica na tela inicial.</span>
                </div>
              </div>
            </div>

            {/* Seção Android */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🤖</span>
                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Como baixar no Android (Google Chrome):</strong>
              </div>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setPwaInstalavel(false);
                        setDeferredPrompt(null);
                        setMostrarModalPwa(false);
                      }
                    } catch (e) {}
                  }}
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '0.6rem', textAlign: 'center', justifyContent: 'center' }}
                >
                  ⚡ Instalar Agora no Android (1 Clique)
                </button>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  Toque no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome e selecione <strong style={{ color: '#10b981' }}>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </div>
              )}
            </div>

            {/* Benefícios */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '1.25rem',
              fontSize: '0.72rem',
              color: '#94a3b8'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>⚡</span> Abre instantaneamente
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>📱</span> Tela cheia sem abas
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>🛡️</span> Funciona offline
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>💾</span> Quase 0MB de espaço
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarModalPwa(false)}
              className="btn-secondary"
              style={{ width: '100%', textAlign: 'center' }}
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAÇÃO INTELIGENTE DE EXTRATO BANCÁRIO */}
      {mostrarModalImportacao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setMostrarModalImportacao(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem'
                }}>
                  📥
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Importar Extrato Bancário
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    Itaú, Nubank, Bradesco, Inter (PDF, OFX, CSV ou TXT)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMostrarModalImportacao(false)}
                className="btn-del"
                style={{ fontSize: '1rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Dropzone / Upload Box */}
            <div
              style={{
                border: '2px dashed rgba(59, 130, 246, 0.4)',
                borderRadius: '14px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                background: 'rgba(59, 130, 246, 0.04)',
                cursor: 'pointer',
                marginBottom: '1.25rem'
              }}
              onClick={() => document.getElementById('input-file-extrato').click()}
            >
              <input
                id="input-file-extrato"
                type="file"
                accept=".pdf,.ofx,.csv,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessarArquivoExtrato(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
                {extratoCarregando ? '⏳' : '📄'}
              </div>
              <strong style={{ display: 'block', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                {extratoCarregando ? 'Lendo e categorizando lançamentos...' : (extratoNomeArquivo ? `Arquivo selecionado: ${extratoNomeArquivo}` : 'Toque para selecionar o extrato do seu banco')}
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Suporta o PDF do Extrato Itaú, arquivos bancários OFX ou planilhas CSV
              </span>
            </div>

            {/* Configurações de Filtro de Período e Tipo se houver transações lidas */}
            {transacoesExtrato.length > 0 && (
              <>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  {/* Filtro de Período */}
                  <div style={{ marginBottom: '0.65rem' }}>
                    <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      ⏱️ Período de Lançamentos a Importar:
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {[
                        { id: '30', label: 'Últimos 30 dias' },
                        { id: '15', label: 'Últimos 15 dias' },
                        { id: '7', label: 'Últimos 7 dias' },
                        { id: 'todos', label: 'Todos do Arquivo' },
                        { id: 'personalizado', label: 'Personalizado' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFiltroPeriodoExtrato(tab.id)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.72rem',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: filtroPeriodoExtrato === tab.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.06)',
                            color: filtroPeriodoExtrato === tab.id ? '#fff' : '#94a3b8'
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Datas personalizadas se selecionado */}
                    {filtroPeriodoExtrato === 'personalizado' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#64748b' }}>De:</label>
                          <input
                            type="date"
                            className="input-field"
                            style={{ padding: '0.35rem', fontSize: '0.72rem' }}
                            value={filtroDataInicio}
                            onChange={(e) => setFiltroDataInicio(e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.68rem', color: '#64748b' }}>Até:</label>
                          <input
                            type="date"
                            className="input-field"
                            style={{ padding: '0.35rem', fontSize: '0.72rem' }}
                            value={filtroDataFim}
                            onChange={(e) => setFiltroDataFim(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filtro de Tipo (Saída vs Todas) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setFiltroTipoExtrato('saida')}
                        style={{
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          background: filtroTipoExtrato === 'saida' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                          color: filtroTipoExtrato === 'saida' ? '#f43f5e' : '#94a3b8',
                          fontWeight: filtroTipoExtrato === 'saida' ? 700 : 500
                        }}
                      >
                        Apenas Despesas (Saídas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltroTipoExtrato('todas')}
                        style={{
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          background: filtroTipoExtrato === 'todas' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                          color: filtroTipoExtrato === 'todas' ? '#60a5fa' : '#94a3b8',
                          fontWeight: filtroTipoExtrato === 'todas' ? 700 : 500
                        }}
                      >
                        Todas (Saídas e Entradas)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelecionarTodosExtrato}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {transacoesFiltradasExtrato.every(t => itensExtratoSelecionados[t.id]) ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                  </div>
                </div>

                {/* Lista de Transações Lidas com Categorias Inteligentes */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span>
                      Mostrando <strong>{transacoesFiltradasExtrato.length}</strong> lançamentos no período
                    </span>
                    <span>
                      Selecionados: <strong style={{ color: '#10b981' }}>
                        {transacoesFiltradasExtrato.filter(t => itensExtratoSelecionados[t.id]).length}
                      </strong> (Total: {formatBRL(transacoesFiltradasExtrato.filter(t => itensExtratoSelecionados[t.id]).reduce((acc, t) => acc + t.valor, 0))})
                    </span>
                  </div>

                  <div style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px',
                    padding: '0.4rem'
                  }}>
                    {transacoesFiltradasExtrato.map(t => {
                      const isChecked = Boolean(itensExtratoSelecionados[t.id]);
                      return (
                        <div
                          key={t.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto 65px 1fr 125px auto',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '8px',
                            background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isChecked ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.04)'}`,
                            fontSize: '0.75rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleItemExtrato(t.id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />

                          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                            {t.dataFormatada || t.data}
                          </span>

                          <span style={{
                            color: '#e2e8f0',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={t.descricao}>
                            {t.descricao}
                          </span>

                          <select
                            className="select-field"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', height: '26px' }}
                            value={t.categoria}
                            onChange={(e) => handleAlterarCategoriaExtrato(t.id, e.target.value)}
                          >
                            <option value="Alimentação">🍽️ Alimentação</option>
                            <option value="Supermercado">🛒 Supermercado</option>
                            <option value="Transporte">🚗 Transporte</option>
                            <option value="Saúde">💊 Saúde</option>
                            <option value="Lazer">🎉 Lazer</option>
                            <option value="Esporte">🥋 Esporte</option>
                            <option value="Assinaturas">📺 Assinaturas</option>
                            <option value="Essencial">🏠 Essencial</option>
                            <option value="Outros">📦 Outros</option>
                          </select>

                          <strong style={{
                            color: t.tipo === 'saida' ? '#f43f5e' : '#10b981',
                            whiteSpace: 'nowrap',
                            textAlign: 'right'
                          }}>
                            {t.tipo === 'saida' ? '-' : '+'}{formatBRL(t.valor)}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarModalImportacao(false)}
                    className="btn-secondary"
                    style={{ textAlign: 'center' }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmarImportacaoExtrato}
                    disabled={importandoLote || transacoesFiltradasExtrato.filter(t => itensExtratoSelecionados[t.id]).length === 0}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}
                  >
                    {importandoLote
                      ? 'Salvando no Oracle ATP...'
                      : `💾 Cadastrar ${transacoesFiltradasExtrato.filter(t => itensExtratoSelecionados[t.id]).length} Gastos Selecionados`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
