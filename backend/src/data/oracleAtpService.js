const https = require('https');
const fs = require('fs');
const path = require('path');

const ORDS_HOST = process.env.ORDS_HOST || 'G31AC88BC331093-CLOUDOPSHUB.adb.sa-saopaulo-1.oraclecloudapps.com';
const ORDS_PATH = process.env.ORDS_PATH || '/ords/admin/_/sql';
const ORDS_AUTH = process.env.ORDS_AUTH || '';

const LOCAL_USERS_FILE = path.join(__dirname, '..', '..', 'data', 'finance_users.json');

// Dados padrão do Usuário Administrador
const ADMIN_INITIAL_DATA = {
  perfil: {
    nome: process.env.ADMIN_NAME || "Administrador",
    cidade: "São Paulo, SP",
    email: process.env.ADMIN_EMAIL || "admin@controlefinanceiro.com",
    senha: "123",
    rendaLiquida: 4400.00,
    rendaExtraMes: 0.00,
    motivoRendaExtra: "",
    meta: "Controle rigoroso de gastos, quitação de dívidas e reserva de emergência",
    whatsappPhone: process.env.ADMIN_WHATSAPP_PHONE || "",
    whatsappApiKey: process.env.CALLMEBOT_API_KEY || "",
    notificacoesWppAtivas: true,
    diaLembreteWpp: 2
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
    { id: 1, numero: 1, vencimento: "2026-09-05", valor: 1935.43, paga: true, dataPagamento: "2026-09-05", observacao: "1ª parcela do acordo Itaú paga em dia" },
    { id: 2, numero: 2, vencimento: "2026-10-05", valor: 1935.43, paga: false, dataPagamento: null, observacao: "Pagar parcela regular + antecipar com 1ª parcela do 13º salário" },
    { id: 3, numero: 3, vencimento: "2026-11-05", valor: 1935.43, paga: false, dataPagamento: null, observacao: "Pagar parcela regular + antecipar com 2ª parcela do 13º (Expectativa de quitação total!)" },
    { id: 4, numero: 4, vencimento: "2026-12-05", valor: 1935.43, paga: false, dataPagamento: null, observacao: "4ª parcela (se necessária) + 3ª parcela do 13º salário" },
    { id: 5, numero: 5, vencimento: "2027-01-05", valor: 1935.43, paga: false, dataPagamento: null, observacao: "5ª parcela (Penúltima)" },
    { id: 6, numero: 6, vencimento: "2027-02-05", valor: 1935.43, paga: false, dataPagamento: null, observacao: "6ª parcela (Última)" }
  ],
  gastosFixos: [
    { id: 1, nome: "Jiu-jitsu", valor: 180.00, categoria: "Esporte", pago: true },
    { id: 2, nome: "Academia", valor: 160.00, categoria: "Saúde", pago: true },
    { id: 3, nome: "Remédio TDAH", valor: 180.00, categoria: "Saúde", pago: true },
    { id: 4, nome: "Dentista (manutenção)", valor: 80.00, categoria: "Saúde", pago: true },
    { id: 5, nome: "Internet Celular", valor: 60.00, categoria: "Essencial", pago: true }
  ],
  despesasVariaveis: [
    { id: "tx-1", descricao: "Almoço e lanches semanais", valor: 145.00, categoria: "Alimentação", data: "2026-09-18" },
    { id: "tx-2", descricao: "Supermercado itens essenciais", valor: 210.50, categoria: "Supermercado", data: "2026-09-20" }
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
    { id: "meta-1", titulo: "Quitação Total Acordo Itaú", categoria: "Dívida", valorAlvo: 11612.58, valorAtual: 1935.43, dataAlvo: "2026-12-31", icone: "💳", descricao: "Eliminar 100% dos juros do cartão antecipando parcelas com o 13º salário." },
    { id: "meta-2", titulo: "Reserva de Emergência", categoria: "Segurança", valorAlvo: 5000.00, valorAtual: 200.00, dataAlvo: "2027-03-31", icone: "🛡️", descricao: "Meta inicial para imprevistos de saúde e manutenção, reforçada pelo saque FGTS em março." },
    { id: "meta-3", titulo: "Viagem de Descanso", categoria: "Lazer", valorAlvo: 3000.00, valorAtual: 0.00, dataAlvo: "2027-07-31", icone: "✈️", descricao: "Viagem comemorativa pós-quitação das dívidas." }
  ],
  planejamentoExtra: []
};

// Executa SQL diretamente no Oracle Autonomous Database (ATP Exadata)
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = sql;
    const req = https.request({
      hostname: ORDS_HOST,
      path: ORDS_PATH,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ORDS_AUTH}`,
        'Content-Type': 'application/sql',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve({ raw: data, statusCode: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('Oracle ATP ORDS warning:', err.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

function loadLocalUsers() {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_USERS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    "vviniciuslourenco@gmail.com": VINI_INITIAL_DATA
  };
}

function saveLocalUsers(users) {
  try {
    const dir = path.dirname(LOCAL_USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {}
}

// Cria tabela se não existir
async function initDatabase() {
  const sqlUsers = `CREATE TABLE FINANCIAL_USERS (
    EMAIL VARCHAR2(255) PRIMARY KEY,
    NAME VARCHAR2(255),
    PASSWORD VARCHAR2(255),
    DATA_JSON CLOB,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  const sqlRequests = `CREATE TABLE FINANCIAL_ACCESS_REQUESTS (
    ID VARCHAR2(50) PRIMARY KEY,
    NAME VARCHAR2(255),
    EMAIL VARCHAR2(255),
    WHATSAPP VARCHAR2(50),
    SALARIO NUMBER,
    STATUS VARCHAR2(20) DEFAULT 'pending',
    TEMP_PASSWORD VARCHAR2(100),
    REQUESTED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  const sqlResets = `CREATE TABLE FINANCIAL_PASSWORD_RESETS (
    ID VARCHAR2(50) PRIMARY KEY,
    EMAIL VARCHAR2(255),
    WHATSAPP VARCHAR2(50),
    STATUS VARCHAR2(20) DEFAULT 'pending',
    TEMP_PASSWORD VARCHAR2(100),
    REQUESTED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  try {
    await executeSql(sqlUsers);
  } catch (e) {}
  try {
    await executeSql(sqlRequests);
  } catch (e) {}
  try {
    await executeSql(sqlResets);
  } catch (e) {}
}

// Busca usuário no Oracle ATP (com fallback local)
async function getUser(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const localUsers = loadLocalUsers();

  try {
    const escapedEmail = cleanEmail.replace(/'/g, "''");
    const sql = `SELECT EMAIL, NAME, PASSWORD, DATA_JSON FROM FINANCIAL_USERS WHERE LOWER(EMAIL) = '${escapedEmail}'`;
    const res = await executeSql(sql);

    if (res && res.items && res.items[0]?.resultSet?.items?.length > 0) {
      const row = res.items[0].resultSet.items[0];
      const dataObj = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : (row.data_json || {});
      
      // Garante faturasCartoes
      if (!dataObj.faturasCartoes) {
        if (cleanEmail === 'vviniciuslourenco@gmail.com' || cleanEmail.includes('vinicius')) {
          dataObj.faturasCartoes = VINI_INITIAL_DATA.faturasCartoes;
        } else {
          dataObj.faturasCartoes = [];
        }
      }

      // Garante dados WhatsApp
      if (dataObj.perfil) {
        if (!dataObj.perfil.whatsappPhone && process.env.ADMIN_WHATSAPP_PHONE) {
          dataObj.perfil.whatsappPhone = process.env.ADMIN_WHATSAPP_PHONE;
          dataObj.perfil.whatsappApiKey = process.env.CALLMEBOT_API_KEY || "";
          dataObj.perfil.notificacoesWppAtivas = true;
          dataObj.perfil.diaLembreteWpp = 2;
        }
      }

      // Atualiza cache local
      localUsers[cleanEmail] = dataObj;
      saveLocalUsers(localUsers);
      return {
        email: row.email,
        name: row.name,
        password: row.password,
        data: dataObj
      };
    }
  } catch (e) {
    console.warn('Falha na consulta Oracle ATP, usando cache local:', e.message);
  }

  // Fallback cache local
  if (localUsers[cleanEmail]) {
    const u = localUsers[cleanEmail];
    return {
      email: cleanEmail,
      name: u.perfil?.nome || cleanEmail,
      password: u.perfil?.senha || '123456',
      data: u
    };
  }

  // Se for o admin ou usuário com padrão, inicializa
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@controlefinanceiro.com').toLowerCase();
  if (cleanEmail === adminEmail || cleanEmail.includes('admin') || cleanEmail.includes('vinicius') || cleanEmail === 'vviniciuslourenco@gmail.com') {
    await saveUser(cleanEmail, ADMIN_INITIAL_DATA.perfil.nome, ADMIN_INITIAL_DATA.perfil.senha, ADMIN_INITIAL_DATA);
    return {
      email: cleanEmail,
      name: ADMIN_INITIAL_DATA.perfil.nome,
      password: ADMIN_INITIAL_DATA.perfil.senha,
      data: ADMIN_INITIAL_DATA
    };
  }

  return null;
}

// Salva ou atualiza usuário no Oracle ATP
async function saveUser(email, name, password, dataObj) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || cleanEmail).trim();
  const cleanPass = String(password || '123456').trim();

  // Salva no cache local imediatamente
  const localUsers = loadLocalUsers();
  localUsers[cleanEmail] = dataObj;
  saveLocalUsers(localUsers);

  // Salva no Oracle Autonomous Database
  try {
    const jsonStr = JSON.stringify(dataObj);
    const escapedJson = jsonStr.replace(/'/g, "''");
    const escapedEmail = cleanEmail.replace(/'/g, "''");
    const escapedName = cleanName.replace(/'/g, "''");
    const escapedPass = cleanPass.replace(/'/g, "''");

    const sql = `MERGE INTO FINANCIAL_USERS target
    USING (SELECT '${escapedEmail}' AS EMAIL, '${escapedName}' AS NAME, '${escapedPass}' AS PASSWORD, '${escapedJson}' AS DATA_JSON FROM DUAL) source
    ON (LOWER(target.EMAIL) = LOWER(source.EMAIL))
    WHEN MATCHED THEN
      UPDATE SET target.NAME = source.NAME, target.PASSWORD = source.PASSWORD, target.DATA_JSON = source.DATA_JSON, target.UPDATED_AT = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
      INSERT (EMAIL, NAME, PASSWORD, DATA_JSON, CREATED_AT, UPDATED_AT)
      VALUES (source.EMAIL, source.NAME, source.PASSWORD, source.DATA_JSON, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;

    await executeSql(sql);
  } catch (err) {
    console.warn('Erro ao sincronizar com Oracle ATP:', err.message);
  }

  return dataObj;
}

// Registra um novo usuário do zero (com base limpa / sem dívidas pré-cadastradas)
async function registerUser(email, name, password, rendaBase) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || 'Novo Usuário').trim();
  const cleanPass = String(password || '123456').trim();
  const salario = Number(rendaBase) > 0 ? Number(rendaBase) : 0;

  // Base limpa para novos usuários
  const newUserFinancialState = {
    perfil: {
      nome: cleanName,
      cidade: "Brasil",
      email: cleanEmail,
      senha: cleanPass,
      rendaLiquida: salario,
      rendaExtraMes: 0.00,
      motivoRendaExtra: "",
      meta: "Controle financeiro pessoal e quitação de despesas",
      whatsappPhone: "",
      whatsappApiKey: "",
      notificacoesWppAtivas: false,
      diaLembreteWpp: 2
    },
    dividaItau: null, // Sem dívidas pré-carregadas! O usuário cadastra as suas próprias dívidas
    parcelas: [],
    gastosFixos: [],
    despesasVariaveis: [],
    faturasCartoes: [],
    metas: [
      {
        id: `meta-${Date.now()}`,
        titulo: "Reserva de Emergência",
        categoria: "Segurança",
        valorAlvo: salario > 0 ? salario * 3 : 3000,
        valorAtual: 0,
        dataAlvo: "2027-12-31",
        icone: "🛡️",
        descricao: "Criar uma reserva equivalente a pelo menos 3 meses de despesas."
      }
    ],
    planejamentoExtra: []
  };

  await saveUser(cleanEmail, cleanName, cleanPass, newUserFinancialState);
  return newUserFinancialState;
}

// ==========================================
// SOLICITAÇÕES DE ACESSO (FLUXO CLOUDOPS HUB)
// ==========================================
const LOCAL_REQUESTS_FILE = path.join(__dirname, '..', '..', 'data', 'access_requests.json');

function loadLocalRequests() {
  try {
    if (fs.existsSync(LOCAL_REQUESTS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_REQUESTS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveLocalRequests(reqs) {
  try {
    const dir = path.dirname(LOCAL_REQUESTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_REQUESTS_FILE, JSON.stringify(reqs, null, 2), 'utf8');
  } catch (e) {}
}

async function createAccessRequest({ name, email, whatsapp, rendaLiquida }) {
  const id = `req-${Date.now()}`;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  const cleanWpp = String(whatsapp || '').replace(/\D/g, '');
  const salario = Number(rendaLiquida) || 0;
  const now = new Date().toISOString();

  const newReq = {
    id,
    name: cleanName,
    email: cleanEmail,
    whatsapp: cleanWpp,
    salario,
    status: 'pending',
    tempPassword: null,
    requestedAt: now,
    updatedAt: now
  };

  const list = loadLocalRequests();
  list.unshift(newReq);
  saveLocalRequests(list);

  try {
    const sql = `MERGE INTO FINANCIAL_ACCESS_REQUESTS target
    USING (SELECT '${id}' AS ID, '${cleanName.replace(/'/g, "''")}' AS NAME, '${cleanEmail.replace(/'/g, "''")}' AS EMAIL, '${cleanWpp}' AS WHATSAPP, ${salario} AS SALARIO, 'pending' AS STATUS FROM DUAL) source
    ON (target.ID = source.ID)
    WHEN MATCHED THEN
      UPDATE SET target.NAME = source.NAME, target.STATUS = source.STATUS, target.UPDATED_AT = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
      INSERT (ID, NAME, EMAIL, WHATSAPP, SALARIO, STATUS, REQUESTED_AT, UPDATED_AT)
      VALUES (source.ID, source.NAME, source.EMAIL, source.WHATSAPP, source.SALARIO, source.STATUS, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
    await executeSql(sql);
  } catch (e) {
    console.warn('Erro ao salvar request no Oracle ATP:', e.message);
  }

  return newReq;
}

async function getAccessRequests() {
  const localList = loadLocalRequests();
  try {
    const sql = `SELECT ID, NAME, EMAIL, WHATSAPP, SALARIO, STATUS, TEMP_PASSWORD, TO_CHAR(REQUESTED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS REQUESTED_AT, TO_CHAR(UPDATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPDATED_AT FROM FINANCIAL_ACCESS_REQUESTS ORDER BY REQUESTED_AT DESC`;
    const res = await executeSql(sql);
    if (res && res.items && res.items[0]?.resultSet?.items) {
      const dbList = res.items[0].resultSet.items.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        whatsapp: row.whatsapp,
        salario: Number(row.salario || 0),
        status: row.status || 'pending',
        tempPassword: row.temp_password,
        requestedAt: row.requested_at,
        updatedAt: row.updated_at
      }));
      if (dbList.length > 0) {
        saveLocalRequests(dbList);
        return dbList;
      }
    }
  } catch (e) {}
  return localList;
}

async function approveAccessRequest(requestId, tempPasswordInput) {
  const list = loadLocalRequests();
  const idx = list.findIndex(r => r.id === requestId);
  const reqItem = idx !== -1 ? list[idx] : null;

  if (!reqItem) {
    throw new Error('Solicitação de acesso não encontrada.');
  }

  const tempPass = tempPasswordInput || `Fin@${Math.floor(1000 + Math.random() * 9000)}!`;
  reqItem.status = 'approved';
  reqItem.tempPassword = tempPass;
  reqItem.updatedAt = new Date().toISOString();
  saveLocalRequests(list);

  // Cria ou atualiza a conta do usuário com a senha temporária e flag senhaTemporaria: true
  const cleanEmail = reqItem.email.toLowerCase();
  const cleanName = reqItem.name;
  const salario = reqItem.salario || 0;

  const newUserState = {
    perfil: {
      nome: cleanName,
      cidade: "Brasil",
      email: cleanEmail,
      senha: tempPass,
      senhaTemporaria: true, // Flag para forçar a troca no primeiro acesso
      rendaLiquida: salario,
      rendaExtraMes: 0.00,
      motivoRendaExtra: "",
      meta: "Controle financeiro pessoal e quitação de despesas",
      whatsappPhone: reqItem.whatsapp || "",
      whatsappApiKey: "",
      notificacoesWppAtivas: false,
      diaLembreteWpp: 2
    },
    dividaItau: null,
    parcelas: [],
    gastosFixos: [],
    despesasVariaveis: [],
    faturasCartoes: [],
    metas: [
      {
        id: `meta-${Date.now()}`,
        titulo: "Reserva de Emergência",
        categoria: "Segurança",
        valorAlvo: salario > 0 ? salario * 3 : 3000,
        valorAtual: 0,
        dataAlvo: "2027-12-31",
        icone: "🛡️",
        descricao: "Criar uma reserva equivalente a pelo menos 3 meses de despesas."
      }
    ],
    planejamentoExtra: []
  };

  await saveUser(cleanEmail, cleanName, tempPass, newUserState);

  try {
    const sql = `UPDATE FINANCIAL_ACCESS_REQUESTS SET STATUS = 'approved', TEMP_PASSWORD = '${tempPass}', UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = '${requestId}'`;
    await executeSql(sql);
  } catch (e) {}

  return {
    request: reqItem,
    tempPassword: tempPass,
    userState: newUserState
  };
}

async function rejectAccessRequest(requestId) {
  const list = loadLocalRequests();
  const idx = list.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    list[idx].status = 'rejected';
    list[idx].updatedAt = new Date().toISOString();
    saveLocalRequests(list);
  }

  try {
    const sql = `UPDATE FINANCIAL_ACCESS_REQUESTS SET STATUS = 'rejected', UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = '${requestId}'`;
    await executeSql(sql);
  } catch (e) {}

  return true;
}

// ===============================
// SOLICITAÇÕES DE RESET DE SENHA
// ===============================
const LOCAL_RESETS_FILE = path.join(__dirname, '..', '..', 'data', 'password_resets.json');

function loadLocalResets() {
  try {
    if (fs.existsSync(LOCAL_RESETS_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_RESETS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveLocalResets(resets) {
  try {
    const dir = path.dirname(LOCAL_RESETS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_RESETS_FILE, JSON.stringify(resets, null, 2), 'utf8');
  } catch (e) {}
}

async function createPasswordResetRequest({ email, whatsapp }) {
  const id = `reset-${Date.now()}`;
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanWpp = String(whatsapp || '').replace(/\D/g, '');
  const now = new Date().toISOString();

  const user = await getUser(cleanEmail);
  const userName = user?.name || user?.data?.perfil?.nome || cleanEmail;

  const newReset = {
    id,
    name: userName,
    email: cleanEmail,
    whatsapp: cleanWpp,
    status: 'pending',
    tempPassword: null,
    requestedAt: now,
    updatedAt: now
  };

  const list = loadLocalResets();
  list.unshift(newReset);
  saveLocalResets(list);

  try {
    const sql = `INSERT INTO FINANCIAL_PASSWORD_RESETS (ID, EMAIL, WHATSAPP, STATUS, REQUESTED_AT, UPDATED_AT) VALUES ('${id}', '${cleanEmail}', '${cleanWpp}', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    await executeSql(sql);
  } catch (e) {}

  return newReset;
}

async function getPasswordResetRequests() {
  const localList = loadLocalResets();
  try {
    const sql = `SELECT ID, EMAIL, WHATSAPP, STATUS, TEMP_PASSWORD, TO_CHAR(REQUESTED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS REQUESTED_AT, TO_CHAR(UPDATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPDATED_AT FROM FINANCIAL_PASSWORD_RESETS ORDER BY REQUESTED_AT DESC`;
    const res = await executeSql(sql);
    if (res && res.items && res.items[0]?.resultSet?.items) {
      const dbList = res.items[0].resultSet.items.map(row => ({
        id: row.id,
        email: row.email,
        whatsapp: row.whatsapp,
        status: row.status || 'pending',
        tempPassword: row.temp_password,
        requestedAt: row.requested_at,
        updatedAt: row.updated_at
      }));
      if (dbList.length > 0) {
        saveLocalResets(dbList);
        return dbList;
      }
    }
  } catch (e) {}
  return localList;
}

async function approvePasswordReset(resetId, tempPasswordInput) {
  const list = loadLocalResets();
  const idx = list.findIndex(r => r.id === resetId);
  const resetItem = idx !== -1 ? list[idx] : null;

  if (!resetItem) {
    throw new Error('Solicitação de reset não encontrada.');
  }

  const tempPass = tempPasswordInput || `Reset@${Math.floor(1000 + Math.random() * 9000)}!`;
  resetItem.status = 'approved';
  resetItem.tempPassword = tempPass;
  resetItem.updatedAt = new Date().toISOString();
  saveLocalResets(list);

  // Atualiza senha do usuário no banco e ativa flag senhaTemporaria
  const userRecord = await getUser(resetItem.email);
  if (userRecord && userRecord.data) {
    userRecord.data.perfil.senha = tempPass;
    userRecord.data.perfil.senhaTemporaria = true;
    await saveUser(resetItem.email, userRecord.name || userRecord.data.perfil.nome, tempPass, userRecord.data);
  }

  try {
    const sql = `UPDATE FINANCIAL_PASSWORD_RESETS SET STATUS = 'approved', TEMP_PASSWORD = '${tempPass}', UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = '${resetId}'`;
    await executeSql(sql);
  } catch (e) {}

  return {
    reset: resetItem,
    tempPassword: tempPass
  };
}

async function rejectPasswordReset(resetId) {
  const list = loadLocalResets();
  const idx = list.findIndex(r => r.id === resetId);
  if (idx !== -1) {
    list[idx].status = 'rejected';
    list[idx].updatedAt = new Date().toISOString();
    saveLocalResets(list);
  }
  try {
    const sql = `UPDATE FINANCIAL_PASSWORD_RESETS SET STATUS = 'rejected', UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = '${resetId}'`;
    await executeSql(sql);
  } catch (e) {}
  return true;
}

module.exports = {
  executeSql,
  initDatabase,
  getUser,
  saveUser,
  registerUser,
  createAccessRequest,
  getAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  createPasswordResetRequest,
  getPasswordResetRequests,
  approvePasswordReset,
  rejectPasswordReset,
  VINI_INITIAL_DATA
};
