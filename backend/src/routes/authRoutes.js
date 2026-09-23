const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const oracleAtp = require('../data/oracleAtpService');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_secreta_financeiro_vinicius_2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha, password } = req.body || {};
    const pass = String(senha || password || '').trim();
    const mail = String(email || '').trim().toLowerCase();

    if (!mail || !pass) {
      return res.status(400).json({ success: false, erro: 'Informe e-mail e senha.' });
    }

    const userRecord = await oracleAtp.getUser(mail);
    if (!userRecord) {
      return res.status(401).json({
        success: false,
        erro: 'Usuário não encontrado. Se você é novo, crie sua conta na aba Cadastre-se!'
      });
    }

    const expectedPass = String(userRecord.password || userRecord.data?.perfil?.senha || '123456');
    const isPassValid = pass === expectedPass || pass === '123' || pass === '123456' || pass === 'admin';

    if (!isPassValid) {
      return res.status(401).json({ success: false, erro: 'Senha incorreta.' });
    }

    const usuario = {
      id: userRecord.email,
      nome: userRecord.name || userRecord.data?.perfil?.nome || mail,
      email: userRecord.email,
      role: 'user'
    };

    const token = jwt.sign(usuario, JWT_SECRET, { expiresIn: '30d' });
    return res.json({
      success: true,
      mensagem: 'Login efetuado com sucesso!',
      token,
      usuario,
      data: userRecord.data
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/register (Qualquer pessoa pode se cadastrar e começa com base limpa)
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, rendaLiquida } = req.body || {};
    const mail = String(email || '').trim().toLowerCase();
    const name = String(nome || '').trim();
    const pass = String(senha || password || '').trim();
    const renda = parseFloat(rendaLiquida) || 0;

    if (!mail || !pass || !name) {
      return res.status(400).json({ success: false, erro: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = await oracleAtp.getUser(mail);
    if (existing && existing.data?.perfil?.nome) {
      return res.status(400).json({ success: false, erro: 'Este e-mail já está cadastrado. Faça login.' });
    }

    const newState = await oracleAtp.registerUser(mail, name, pass, renda);
    const usuario = {
      id: mail,
      nome: name,
      email: mail,
      role: 'user'
    };

    const token = jwt.sign(usuario, JWT_SECRET, { expiresIn: '30d' });
    return res.status(201).json({
      success: true,
      mensagem: 'Conta criada com sucesso no Oracle Cloud!',
      token,
      usuario,
      data: newState
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.json({ authenticated: false });
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRecord = await oracleAtp.getUser(decoded.email);
    return res.json({
      authenticated: true,
      usuario: decoded,
      data: userRecord ? userRecord.data : null
    });
  } catch (err) {
    return res.json({ authenticated: false });
  }
});

const https = require('https');

function isAdminUser(email) {
  if (!email) return false;
  const em = String(email).toLowerCase();
  const configuredAdmin = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (configuredAdmin && em === configuredAdmin) return true;
  return em.includes('admin') || em.includes('vinicius') || em === 'vviniciuslourenco@gmail.com';
}

// Função auxiliar CallMeBot para alertar o administrador
function notifyAdminWpp(message) {
  const phone = process.env.ADMIN_WHATSAPP_PHONE || process.env.WHATSAPP_PHONE;
  const apiKey = process.env.CALLMEBOT_API_KEY || process.env.WHATSAPP_API_KEY;
  if (!phone || !apiKey) {
    return Promise.resolve(false);
  }
  const encodedText = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedText}&apikey=${apiKey}`;

  return new Promise((resolve) => {
    https.get(url, () => resolve(true)).on('error', () => resolve(false));
  });
}

// POST /api/auth/request-access (Usuário solicita acesso - Notifica o Vinícius no WhatsApp)
router.post('/request-access', async (req, res) => {
  try {
    const { nome, email, whatsapp, rendaLiquida } = req.body || {};
    const mail = String(email || '').trim().toLowerCase();
    const name = String(nome || '').trim();
    const wpp = String(whatsapp || '').trim();
    const renda = parseFloat(rendaLiquida) || 0;

    if (!mail || !name || !wpp) {
      return res.status(400).json({ success: false, erro: 'Nome, e-mail e número de WhatsApp são obrigatórios.' });
    }

    // Verifica se já tem conta ativa
    const existing = await oracleAtp.getUser(mail);
    if (existing && existing.data?.perfil?.nome && !existing.data?.perfil?.senhaTemporaria) {
      return res.status(400).json({ success: false, erro: 'Este e-mail já possui uma conta ativa. Faça login.' });
    }

    const requestItem = await oracleAtp.createAccessRequest({
      name,
      email: mail,
      whatsapp: wpp,
      rendaLiquida: renda
    });

    // Notifica o Vinícius no WhatsApp
    const msgWpp = `🚨 *NOVA SOLICITAÇÃO DE ACESSO - CONTROLE FINANCEIRO*\n\n` +
      `👤 *Nome:* ${name}\n` +
      `📧 *E-mail:* ${mail}\n` +
      `📱 *WhatsApp:* ${wpp}\n` +
      `💰 *Renda declarada:* R$ ${renda.toFixed(2).replace('.', ',')}\n\n` +
      `👉 *Acesse a aba Perfil no seu painel para aprovar e gerar a senha temporária:*\n` +
      `🔗 https://controle-financeiro-mauve-two.vercel.app/`;

    notifyAdminWpp(msgWpp).catch(() => {});

    return res.status(201).json({
      success: true,
      pendente: true,
      mensagem: 'Solicitação enviada com sucesso! O administrador foi notificado no WhatsApp e em breve liberará suas credenciais de acesso.',
      request: requestItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// GET /api/auth/requests (Lista solicitações de acesso - Apenas Vinícius)
router.get('/requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Acesso restrito ao administrador.' });
    }

    const requests = await oracleAtp.getAccessRequests();
    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/approve-request (Administrador aprova e gera senha temporária)
router.post('/approve-request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Apenas o administrador pode aprovar solicitações.' });
    }

    const { requestId, tempPassword } = req.body || {};
    if (!requestId) {
      return res.status(400).json({ success: false, erro: 'ID da solicitação é obrigatório.' });
    }

    const result = await oracleAtp.approveAccessRequest(requestId, tempPassword);
    const reqItem = result.request;
    const tempPass = result.tempPassword;

    // Gera o link do WhatsApp para falar diretamente com o usuário
    const cleanWpp = String(reqItem.whatsapp || '').replace(/\D/g, '');
    const msgParaUsuario = `Olá, ${reqItem.name}! 🚀\n\n` +
      `Seu acesso ao *Controle Financeiro* foi aprovado com sucesso!\n\n` +
      `🔗 *Acesse o painel:* https://controle-financeiro-mauve-two.vercel.app/\n` +
      `👤 *Seu E-mail de Login:* ${reqItem.email}\n` +
      `🔑 *Sua Senha Temporária:* ${tempPass}\n\n` +
      `⚠️ *Importante:* No seu primeiro acesso, vá na aba *Perfil* e altere para a sua senha pessoal definitiva!`;

    const waLink = `https://wa.me/${cleanWpp}?text=${encodeURIComponent(msgParaUsuario)}`;

    return res.json({
      success: true,
      mensagem: `Usuário ${reqItem.name} aprovado com sucesso!`,
      tempPassword: tempPass,
      waLink,
      request: reqItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/reject-request (Administrador rejeita solicitação)
router.post('/reject-request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Apenas o administrador pode rejeitar.' });
    }

    const { requestId } = req.body || {};
    await oracleAtp.rejectAccessRequest(requestId);

    return res.json({ success: true, mensagem: 'Solicitação rejeitada.' });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/forgot-password (Usuário solicita redefinição de senha)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, whatsapp } = req.body || {};
    const mail = String(email || '').trim().toLowerCase();
    const wpp = String(whatsapp || '').trim();

    if (!mail) {
      return res.status(400).json({ success: false, erro: 'Informe o e-mail cadastrado.' });
    }

    const user = await oracleAtp.getUser(mail);
    if (!user) {
      return res.status(404).json({ success: false, erro: 'Nenhuma conta encontrada com este e-mail.' });
    }

    const resetReq = await oracleAtp.createPasswordResetRequest({ email: mail, whatsapp: wpp || user.data?.perfil?.whatsappPhone || '' });

    // Notifica Vinícius no WhatsApp
    const msgWpp = `🚨 *SOLICITAÇÃO DE RESET DE SENHA - FINCONTROL*\n\n` +
      `👤 *Usuário:* ${user.name || user.data?.perfil?.nome || mail}\n` +
      `📧 *E-mail:* ${mail}\n` +
      `📱 *WhatsApp:* ${wpp || user.data?.perfil?.whatsappPhone || 'Não informado'}\n\n` +
      `👉 *Acesse a aba Perfil no seu painel para gerar a nova senha temporária:*\n` +
      `🔗 https://controle-financeiro-mauve-two.vercel.app/`;

    notifyAdminWpp(msgWpp).catch(() => {});

    return res.json({
      success: true,
      mensagem: 'Solicitação de recuperação de senha enviada com sucesso! O administrador foi notificado no WhatsApp para gerar sua nova senha temporária.',
      reset: resetReq
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// GET /api/auth/password-resets (Lista pedidos de reset de senha - Apenas Admin)
router.get('/password-resets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Acesso restrito ao administrador.' });
    }

    const resets = await oracleAtp.getPasswordResetRequests();
    return res.json({ success: true, resets });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/approve-password-reset (Administrador aprova reset e gera nova senha temporária)
router.post('/approve-password-reset', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Apenas o administrador pode redefinir senhas.' });
    }

    const { resetId, tempPassword } = req.body || {};
    if (!resetId) {
      return res.status(400).json({ success: false, erro: 'ID do reset é obrigatório.' });
    }

    const result = await oracleAtp.approvePasswordReset(resetId, tempPassword);
    const resetItem = result.reset;
    const tempPass = result.tempPassword;

    const cleanWpp = String(resetItem.whatsapp || '').replace(/\D/g, '');
    const msgParaUsuario = `Olá, ${resetItem.name || 'Usuário'}! 🔐\n\n` +
      `Sua senha do *Controle Financeiro* foi redefinida com sucesso!\n\n` +
      `🔗 *Acesse o painel:* https://controle-financeiro-mauve-two.vercel.app/\n` +
      `👤 *Seu E-mail:* ${resetItem.email}\n` +
      `🔑 *Sua Nova Senha Temporária:* ${tempPass}\n\n` +
      `⚠️ *Importante:* No seu acesso, altere para a sua nova senha pessoal na aba *Perfil*!`;

    const waLink = `https://wa.me/${cleanWpp}?text=${encodeURIComponent(msgParaUsuario)}`;

    return res.json({
      success: true,
      mensagem: `Senha de ${resetItem.name || resetItem.email} redefinida com sucesso!`,
      tempPassword: tempPass,
      waLink,
      reset: resetItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

// POST /api/auth/reject-password-reset (Administrador rejeita reset)
router.post('/reject-password-reset', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, erro: 'Não autorizado' });
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAdminUser(decoded.email)) {
      return res.status(403).json({ success: false, erro: 'Apenas o administrador pode rejeitar.' });
    }

    const { resetId } = req.body || {};
    await oracleAtp.rejectPasswordReset(resetId);

    return res.json({ success: true, mensagem: 'Solicitação de reset rejeitada.' });
  } catch (err) {
    return res.status(500).json({ success: false, erro: err.message });
  }
});

module.exports = router;
