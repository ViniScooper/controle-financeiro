import React, { useState } from 'react';
import api from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [modo, setModo] = useState('login'); // 'login' | 'solicitar' | 'recuperar'

  // Campos de Login
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('finance_saved_email') || '';
  });
  const [senha, setSenha] = useState(() => {
    const isRemember = localStorage.getItem('finance_remember_me') === 'true';
    return isRemember ? (localStorage.getItem('finance_saved_password') || '') : '';
  });
  const [lembrarDeMim, setLembrarDeMim] = useState(() => {
    return localStorage.getItem('finance_remember_me') === 'true';
  });

  // Campos de Solicitação de Acesso
  const [solicNome, setSolicNome] = useState('');
  const [solicEmail, setSolicEmail] = useState('');
  const [solicWhatsapp, setSolicWhatsapp] = useState('');
  const [solicSalario, setSolicSalario] = useState('');
  const [solicitacaoConcluida, setSolicitacaoConcluida] = useState(false);

  // Campos de Recuperação de Senha
  const [recupEmail, setRecupEmail] = useState('');
  const [recupWhatsapp, setRecupWhatsapp] = useState('');
  const [recupConcluida, setRecupConcluida] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!senha.trim()) {
      setErro('Por favor, digite sua senha para entrar.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const res = await api.post('/api/auth/login', { email, senha });
      if (res.data?.token) {
        localStorage.setItem('finance_token', res.data.token);
        localStorage.setItem('finance_user', JSON.stringify(res.data.usuario || { nome: 'Usuário' }));
        if (res.data.data) {
          localStorage.setItem('finance_cached_data', JSON.stringify(res.data.data));
        } else {
          localStorage.removeItem('finance_cached_data');
        }

        if (lembrarDeMim) {
          localStorage.setItem('finance_remember_me', 'true');
          localStorage.setItem('finance_saved_email', email);
          localStorage.setItem('finance_saved_password', senha);
        } else {
          localStorage.removeItem('finance_remember_me');
          localStorage.removeItem('finance_saved_password');
          localStorage.setItem('finance_saved_email', email);
        }

        if (onLoginSuccess) onLoginSuccess();
        return;
      }
      throw new Error(res.data?.erro || 'Falha no login');
    } catch (err) {
      const msg = err.response?.data?.erro || err.message;
      setErro(msg || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarAcesso = async (e) => {
    e.preventDefault();
    if (!solicNome.trim() || !solicEmail.trim() || !solicWhatsapp.trim()) {
      setErro('Preencha seu Nome, E-mail e WhatsApp.');
      return;
    }

    setLoading(true);
    setErro('');
    setSucesso('');

    try {
      const res = await api.post('/api/auth/request-access', {
        nome: solicNome.trim(),
        email: solicEmail.trim(),
        whatsapp: solicWhatsapp.trim(),
        rendaLiquida: parseFloat(solicSalario) || 0
      });

      if (res.data?.success) {
        setSolicitacaoConcluida(true);
        setSucesso('Solicitação enviada com sucesso ao administrador Vinícius!');
        return;
      }
      throw new Error(res.data?.erro || 'Erro ao enviar solicitação.');
    } catch (err) {
      const msg = err.response?.data?.erro || err.message;
      setErro(msg || 'Não foi possível solicitar acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    if (!recupEmail.trim()) {
      setErro('Informe o seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setErro('');
    setSucesso('');

    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: recupEmail.trim(),
        whatsapp: recupWhatsapp.trim()
      });

      if (res.data?.success) {
        setRecupConcluida(true);
        setSucesso('Pedido de redefinição enviado com sucesso!');
        return;
      }
      throw new Error(res.data?.erro || 'Erro ao solicitar redefinição.');
    } catch (err) {
      const msg = err.response?.data?.erro || err.message;
      setErro(msg || 'Não foi possível solicitar o reset. Verifique o e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">
          💼
        </div>
        <h1 className="login-title">FinControl</h1>
        <p className="login-subtitle">Gestão Pessoal & Dívidas • Oracle Cloud ATP</p>

        {/* Abas Alternadoras: Acessar Conta vs Solicitar Acesso */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '1.25rem',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            type="button"
            onClick={() => { setModo('login'); setErro(''); }}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: modo === 'login' ? '#10b981' : 'transparent',
              color: modo === 'login' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            onClick={() => { setModo('solicitar'); setErro(''); }}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              background: modo === 'solicitar' ? '#10b981' : 'transparent',
              color: modo === 'solicitar' ? '#fff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Solicitar Acesso
          </button>
        </div>

        {erro && (
          <div style={{
            background: 'rgba(244,63,94,0.1)',
            border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: '8px',
            padding: '0.65rem',
            color: '#f43f5e',
            fontSize: '0.78rem',
            marginBottom: '0.9rem',
            textAlign: 'center'
          }}>
            {erro}
          </div>
        )}

        {sucesso && !solicitacaoConcluida && !recupConcluida && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '8px',
            padding: '0.65rem',
            color: '#10b981',
            fontSize: '0.78rem',
            marginBottom: '0.9rem',
            textAlign: 'center'
          }}>
            {sucesso}
          </div>
        )}

        {/* Formulário de Login */}
        {modo === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>E-mail ou Usuário</label>
              <input
                type="text"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                required
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                className="input-field"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.35rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={lembrarDeMim}
                  onChange={(e) => setLembrarDeMim(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                  Lembrar de mim
                </label>
              </div>

              <button
                type="button"
                onClick={() => { setModo('recuperar'); setErro(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.73rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Esqueci a senha
              </button>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Acessar Meu Painel'}
            </button>
          </form>
        )}

        {/* Formulário de Recuperação de Senha */}
        {modo === 'recuperar' && (
          <div>
            {recupConcluida ? (
              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
                <h3 style={{ color: '#38bdf8', fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Pedido de Reset Enviado!
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1rem' }}>
                  O administrador <strong>Vinícius</strong> foi notificado instantaneamente no WhatsApp. Ele redefinirá sua conta e enviará sua nova <strong>Senha Temporária</strong> diretamente no seu WhatsApp.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setRecupConcluida(false);
                    setModo('login');
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem' }}
                >
                  ⬅️ Voltar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecuperarSenha} className="login-form">
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.72rem',
                  color: '#bae6fd',
                  marginBottom: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  🔑 <strong>Recuperação de Senha</strong>: Informe seu e-mail cadastrado e seu WhatsApp. O administrador gerará uma nova senha temporária para você.
                </div>

                <div className="form-group">
                  <label>E-mail Cadastrado *</label>
                  <input
                    type="email"
                    className="input-field"
                    value={recupEmail}
                    onChange={(e) => setRecupEmail(e.target.value)}
                    placeholder="Ex: seuemail@gmail.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Seu WhatsApp com DDD</label>
                  <input
                    type="text"
                    className="input-field"
                    value={recupWhatsapp}
                    onChange={(e) => setRecupWhatsapp(e.target.value)}
                    placeholder="Ex: 5581999999999 (Opcional)"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                  disabled={loading}
                >
                  {loading ? 'Enviando Pedido...' : '🚀 Solicitar Nova Senha'}
                </button>

                <button
                  type="button"
                  onClick={() => setModo('login')}
                  className="btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.78rem' }}
                >
                  Cancelar e Voltar
                </button>
              </form>
            )}
          </div>
        )}

        {/* Formulário de Solicitação de Acesso (Fluxo Hub Vinícius) */}
        {modo === 'solicitar' && (
          <div>
            {solicitacaoConcluida ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h3 style={{ color: '#10b981', fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Solicitação Enviada!
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '1rem' }}>
                  O administrador <strong>Vinícius</strong> foi notificado instantaneamente no WhatsApp.
                  Assim que ele aprovar seu acesso, você receberá sua <strong>Senha Temporária</strong> diretamente no seu WhatsApp para realizar o primeiro login e alterá-la no seu Perfil.
                </p>

                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  marginBottom: '1rem',
                  textAlign: 'left'
                }}>
                  <div>👤 <strong>Nome:</strong> {solicNome}</div>
                  <div>📧 <strong>E-mail:</strong> {solicEmail}</div>
                  <div>📱 <strong>WhatsApp:</strong> {solicWhatsapp}</div>
                  {solicSalario && <div>💰 <strong>Salário Declarado:</strong> R$ {parseFloat(solicSalario).toFixed(2)}</div>}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSolicitacaoConcluida(false);
                    setModo('login');
                    setEmail(solicEmail);
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.65rem', fontSize: '0.8rem' }}
                >
                  ⬅️ Ir para a Tela de Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSolicitarAcesso} className="login-form">
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.72rem',
                  color: '#93c5fd',
                  marginBottom: '0.85rem',
                  lineHeight: '1.4'
                }}>
                  🛡️ <strong>Acesso Controlado por Aprovação</strong>: Preencha seus dados para solicitar acesso. O administrador Vinícius aprovará seu cadastro e enviará sua senha temporária no WhatsApp.
                </div>

                <div className="form-group">
                  <label>Seu Nome Completo *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={solicNome}
                    onChange={(e) => setSolicNome(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Seu Melhor E-mail *</label>
                  <input
                    type="email"
                    className="input-field"
                    value={solicEmail}
                    onChange={(e) => setSolicEmail(e.target.value)}
                    placeholder="Ex: carlos@gmail.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Seu WhatsApp com DDD *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={solicWhatsapp}
                    onChange={(e) => setSolicWhatsapp(e.target.value)}
                    placeholder="Ex: (11) 99999-9999 ou 5511999999999"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Salário Líquido Mensal Base (R$) (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={solicSalario}
                    onChange={(e) => setSolicSalario(e.target.value)}
                    placeholder="Ex: 3500.00"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  disabled={loading}
                >
                  {loading ? 'Enviando Solicitação...' : '🚀 Solicitar Acesso'}
                </button>
              </form>
            )}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', fontSize: '0.72rem', color: '#64748b' }}>
          🏛️ Powered by Oracle Autonomous Database (ATP Exadata)
        </div>
      </div>
    </div>
  );
}
