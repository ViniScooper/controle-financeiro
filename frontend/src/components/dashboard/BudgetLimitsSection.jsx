import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  PieChart,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import CategoryIcon from './CategoryIcon';

const PRESET_CATEGORIES = [
  'Alimentação',
  'Saúde',
  'Supermercado',
  'Esporte',
  'Lazer',
  'Essencial',
  'Transporte',
  'Educação',
  'Outros'
];

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#64748b'  // Slate
];

export default function BudgetLimitsSection({
  tetos = [],
  despesasVariaveis = [],
  ocultarSaldos = false,
  formatCurrency,
  onSaveTeto,
  onDeleteTeto
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeto, setEditingTeto] = useState(null);
  const [catInput, setCatInput] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [corInput, setCorInput] = useState('#10b981');
  const [salvando, setSalvando] = useState(false);

  // Calcula gastos reais agregados por categoria
  const gastosPorCategoria = {};
  (despesasVariaveis || []).forEach(tx => {
    const rawCat = String(tx.categoria || 'Outros').trim();
    // Chave normalizada para soma
    const key = rawCat.toLowerCase();
    const val = Number(tx.valor || 0);
    gastosPorCategoria[key] = (gastosPorCategoria[key] || 0) + val;
  });

  // Totais orçados e gastos nas categorias mapeadas
  let totalOrcado = 0;
  let totalGastoOrcado = 0;

  (tetos || []).forEach(t => {
    const tetoVal = Number(t.valorTeto || 0);
    totalOrcado += tetoVal;
    const gasto = gastosPorCategoria[t.categoria.toLowerCase()] || 0;
    totalGastoOrcado += gasto;
  });

  const saldoRestanteOrcamento = Math.max(0, totalOrcado - totalGastoOrcado);
  const percentualGeral = totalOrcado > 0 ? Math.min(100, Math.round((totalGastoOrcado / totalOrcado) * 100)) : 0;

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setEditingTeto(null);
    setCatInput('Alimentação');
    setValorInput('');
    setCorInput('#10b981');
    setModalOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (teto) => {
    setEditingTeto(teto);
    setCatInput(teto.categoria);
    setValorInput(String(teto.valorTeto));
    setCorInput(teto.cor || '#10b981');
    setModalOpen(true);
  };

  // Salvar teto (criação ou edição)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!catInput.trim() || !valorInput) return;

    try {
      setSalvando(true);
      const payload = {
        id: editingTeto ? editingTeto.id : undefined,
        categoria: catInput.trim(),
        valorTeto: Math.abs(parseFloat(valorInput)),
        cor: corInput
      };
      if (onSaveTeto) {
        await onSaveTeto(payload);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar teto:', err);
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async (id, categoria) => {
    if (!window.confirm(`Deseja remover o teto de gastos para a categoria "${categoria}"?`)) return;
    if (onDeleteTeto) {
      await onDeleteTeto(id);
    }
  };

  return (
    <section className="budget-section">
      {/* CARD DE RESUMO GLOBAL DO ORÇAMENTO */}
      <div className="budget-summary-card">
        <div className="budget-summary-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <Sliders size={18} />
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>
                Teto de Gastos por Categoria
              </h4>
              <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                Monitore seus limites mensais para evitar estouro de orçamento
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <Plus size={15} /> Novo Teto
          </button>
        </div>

        {/* MÉTRICAS GLOBAIS */}
        <div className="budget-summary-metrics">
          <div className="budget-metric-item">
            <span className="budget-metric-label">Teto Total Orçado</span>
            <span className="budget-metric-value" style={{ color: '#38bdf8' }}>
              {ocultarSaldos ? 'R$ ••••••' : (formatCurrency ? formatCurrency(totalOrcado) : `R$ ${totalOrcado.toFixed(2)}`)}
            </span>
          </div>

          <div className="budget-metric-item">
            <span className="budget-metric-label">Gasto Real Atual</span>
            <span className="budget-metric-value" style={{ color: totalGastoOrcado > totalOrcado ? '#ef4444' : '#f8fafc' }}>
              {ocultarSaldos ? 'R$ ••••••' : (formatCurrency ? formatCurrency(totalGastoOrcado) : `R$ ${totalGastoOrcado.toFixed(2)}`)}
            </span>
          </div>

          <div className="budget-metric-item">
            <span className="budget-metric-label">Margem Disponível</span>
            <span className="budget-metric-value" style={{ color: saldoRestanteOrcamento > 0 ? '#10b981' : '#f59e0b' }}>
              {ocultarSaldos ? 'R$ ••••••' : (formatCurrency ? formatCurrency(saldoRestanteOrcamento) : `R$ ${saldoRestanteOrcamento.toFixed(2)}`)}
            </span>
          </div>

          <div className="budget-metric-item">
            <span className="budget-metric-label">Uso do Orçamento</span>
            <span className="budget-metric-value" style={{ color: percentualGeral > 100 ? '#ef4444' : (percentualGeral > 70 ? '#f59e0b' : '#10b981') }}>
              {percentualGeral}%
            </span>
          </div>
        </div>

        {/* BARRA DE PROGRESSO GLOBAL */}
        <div style={{ marginTop: '0.5rem' }}>
          <div className="budget-bar-track">
            <div
              className="budget-bar-fill"
              style={{
                width: `${Math.min(100, percentualGeral)}%`,
                background: percentualGeral > 100
                  ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                  : (percentualGeral > 70 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #10b981, #059669)')
              }}
            />
          </div>
        </div>
      </div>

      {/* GRID DE CARDS POR CATEGORIA */}
      <div className="budget-grid">
        {(tetos || []).map((teto) => {
          const gastoAtual = gastosPorCategoria[teto.categoria.toLowerCase()] || 0;
          const valorTeto = Number(teto.valorTeto || 1);
          const percentual = Math.round((gastoAtual / valorTeto) * 100);
          const estourou = gastoAtual > valorTeto;
          const quaseEstourou = !estourou && percentual >= 70;

          let statusClass = 'status-success';
          let badgeClass = 'badge-success';
          let statusLabel = `No Limite (${percentual}%)`;
          let StatusIcon = CheckCircle2;

          if (estourou) {
            statusClass = 'status-danger';
            badgeClass = 'badge-danger';
            statusLabel = `Estourou (${percentual}%)`;
            StatusIcon = AlertTriangle;
          } else if (quaseEstourou) {
            statusClass = 'status-warning';
            badgeClass = 'badge-warning';
            statusLabel = `Atenção (${percentual}%)`;
            StatusIcon = AlertCircle;
          }

          const sobra = valorTeto - gastoAtual;

          return (
            <div key={teto.id} className={`budget-card ${statusClass}`}>
              <div className="budget-card-header">
                <div className="budget-card-title">
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: `${teto.cor || '#10b981'}22`,
                    color: teto.cor || '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CategoryIcon category={teto.categoria} size={15} color={teto.cor || '#10b981'} />
                  </span>
                  <span>{teto.categoria}</span>
                </div>

                <span className={`budget-badge ${badgeClass}`}>
                  <StatusIcon size={12} />
                  {statusLabel}
                </span>
              </div>

              {/* VALORES */}
              <div className="budget-card-values">
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Gasto Atual</span>
                  <span className="budget-val-current">
                    {ocultarSaldos ? 'R$ ••••••' : (formatCurrency ? formatCurrency(gastoAtual) : `R$ ${gastoAtual.toFixed(2)}`)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Teto Máximo</span>
                  <span className="budget-val-limit">
                    {ocultarSaldos ? 'R$ ••••••' : (formatCurrency ? formatCurrency(valorTeto) : `R$ ${valorTeto.toFixed(2)}`)}
                  </span>
                </div>
              </div>

              {/* BARRA DE PROGRESSO INDIVIDUAL */}
              <div className="budget-bar-track">
                <div
                  className="budget-bar-fill"
                  style={{
                    width: `${Math.min(100, percentual)}%`,
                    background: estourou
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : (quaseEstourou ? 'linear-gradient(90deg, #f59e0b, #d97706)' : `linear-gradient(90deg, ${teto.cor || '#10b981'}, #10b981)`)
                  }}
                />
              </div>

              {/* RODAPÉ DO CARD COM AÇÕES */}
              <div className="budget-card-footer">
                <div>
                  {estourou ? (
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                      Excedeu {ocultarSaldos ? 'R$ •••' : (formatCurrency ? formatCurrency(Math.abs(sobra)) : `R$ ${Math.abs(sobra).toFixed(2)}`)}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      Resta {ocultarSaldos ? 'R$ •••' : (formatCurrency ? formatCurrency(sobra) : `R$ ${sobra.toFixed(2)}`)}
                    </span>
                  )}
                </div>

                <div className="budget-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(teto)}
                    title="Editar Teto de Gastos"
                    className="btn-del"
                    style={{ color: '#94a3b8' }}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(teto.id, teto.categoria)}
                    title="Remover Teto"
                    className="btn-del"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CADASTRAR / EDITAR TETO */}
      {modalOpen && (
        <div className="modal-overlay-custom" onClick={() => !salvando && setModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem', color: '#10b981' }}>🎯</span>
                <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>
                  {editingTeto ? `Editar Teto: ${editingTeto.categoria}` : 'Novo Teto de Gastos'}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-del"
                disabled={salvando}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body-custom" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={catInput}
                    onChange={e => setCatInput(e.target.value)}
                    placeholder="Ex: Alimentação, Lazer, Uber..."
                    required
                    className="input-field"
                    style={{ width: '100%' }}
                  />

                  {/* Sugestões rápidas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                    {PRESET_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCatInput(cat)}
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: catInput === cat ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                          background: catInput === cat ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.03)',
                          color: catInput === cat ? '#34d399' : '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Teto Máximo Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={valorInput}
                    onChange={e => setValorInput(e.target.value)}
                    placeholder="Ex: 600.00"
                    required
                    className="input-field"
                    style={{ width: '100%', fontSize: '1.05rem', fontWeight: 700 }}
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '0.25rem', display: 'block' }}>
                    O app emitirá alerta visual amarelo ao passar de 70% e vermelho ao ultrapassar 100%.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Cor do Indicador
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCorInput(c)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: c,
                          border: corInput === c ? '2px solid #ffffff' : '2px solid transparent',
                          cursor: 'pointer',
                          boxShadow: corInput === c ? '0 0 8px rgba(255,255,255,0.5)' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  disabled={salvando}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={salvando}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  {salvando ? 'Salvando...' : (editingTeto ? 'Atualizar Teto' : 'Criar Teto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
