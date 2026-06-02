import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useIngresos } from '../hooks/useIngresos';
import SelectorMes from '../components/SelectorMes';

const MEDIOS = [
  { id: 'digital',  label: 'Dólares Digital',  emoji: '💳', color: '#4f46e5', bg: '#ede9fe', border: '#c4b5fd' },
  { id: 'efectivo', label: 'Dólares Efectivo', emoji: '💵', color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
];

export default function IngresosPage({ onVolver }) {
  const { user } = useAuth();
  const { getIngresosMes, crearIngreso, actualizarIngreso, borrarIngreso, exportarCSV } = useIngresos();

  const hoy = new Date();
  const [mes, setMes]               = useState({ year: hoy.getFullYear(), month: hoy.getMonth() + 1 });
  const [ingresos, setIngresos]     = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando]     = useState(null);
  const [confirmBorrar, setConfirmBorrar] = useState(null);
  const [error, setError]           = useState('');

  const [form, setForm] = useState({
    monto_dolares: '',
    tipo_cambio:   '',
    medio_pago:    'digital',
    concepto:      '',
    fecha:         format(new Date(), 'yyyy-MM-dd'),
  });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await getIngresosMes(mes.year, mes.month);
    setIngresos(data);
    setCargando(false);
  }, [mes, getIngresosMes]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Cálculos ────────────────────────────────────────────────────────────
  const totalPesos    = ingresos.reduce((s, i) => s + Number(i.monto_pesos), 0);
  const totalUSD      = ingresos.reduce((s, i) => s + Number(i.monto_dolares), 0);
  const totalDigital  = ingresos.filter(i => i.medio_pago === 'digital').reduce((s, i) => s + Number(i.monto_pesos), 0);
  const totalEfectivo = ingresos.filter(i => i.medio_pago === 'efectivo').reduce((s, i) => s + Number(i.monto_pesos), 0);
  const tcPromedio    = ingresos.length > 0
    ? ingresos.reduce((s, i) => s + Number(i.tipo_cambio), 0) / ingresos.length
    : 0;

  const nombreMes = format(new Date(mes.year, mes.month - 1, 1), 'MMMM yyyy', { locale: es });

  // ── Formulario ───────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null);
    setForm({ monto_dolares: '', tipo_cambio: '', medio_pago: 'digital', concepto: '', fecha: format(new Date(), 'yyyy-MM-dd') });
    setMostrarForm(true);
    setError('');
  };

  const abrirEditar = (ing) => {
    setEditando(ing);
    setForm({
      monto_dolares: String(ing.monto_dolares),
      tipo_cambio:   String(ing.tipo_cambio),
      medio_pago:    ing.medio_pago,
      concepto:      ing.concepto || '',
      fecha:         ing.fecha,
    });
    setMostrarForm(true);
    setError('');
  };

  const cerrarForm = () => { setMostrarForm(false); setEditando(null); setError(''); };

  const handleGuardar = async () => {
    setError('');
    if (!form.monto_dolares || isNaN(Number(form.monto_dolares))) { setError('Ingresá el monto en dólares'); return; }
    if (!form.tipo_cambio   || isNaN(Number(form.tipo_cambio)))   { setError('Ingresá el tipo de cambio');  return; }
    setGuardando(true);
    try {
      if (editando) {
        await actualizarIngreso(editando.id, form);
      } else {
        await crearIngreso(form, user.id);
      }
      await cargar();
      cerrarForm();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleBorrar = async (id) => {
    if (confirmBorrar !== id) { setConfirmBorrar(id); return; }
    try {
      await borrarIngreso(id);
      setConfirmBorrar(null);
      await cargar();
    } catch { setConfirmBorrar(null); }
  };

  // Preview del cálculo en tiempo real
  const previewPesos = form.monto_dolares && form.tipo_cambio
    ? Number(form.monto_dolares) * Number(form.tipo_cambio)
    : null;

  const medioActual = MEDIOS.find(m => m.id === form.medio_pago);

  return (
    <div style={styles.page}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onVolver}>← Volver</button>
        <h1 style={styles.headerTitle}>💚 Ingresos</h1>
        <button style={styles.exportBtn} onClick={() => exportarCSV(ingresos, nombreMes)} title="Exportar">📊</button>
      </header>

      <SelectorMes mes={mes} onChange={setMes} />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div style={styles.heroCard}>
        <p style={styles.heroLabel}>Total {nombreMes.split(' ')[0]}</p>
        <p style={styles.heroAmount}>${formatARS(totalPesos)}</p>
        <div style={styles.heroSub}>
          <span>💵 USD {formatUSD(totalUSD)}</span>
          {tcPromedio > 0 && <span>📈 TC prom. ${formatARS(tcPromedio)}</span>}
          <span>📋 {ingresos.length} ingreso{ingresos.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Desglose digital / efectivo */}
        {ingresos.length > 0 && (
          <div style={styles.desglose}>
            <div style={styles.desgloseItem}>
              <span style={styles.desgloseEmoji}>💳</span>
              <div>
                <div style={styles.desgloseLabel}>Digital</div>
                <div style={styles.desgloseVal}>${formatARS(totalDigital)}</div>
              </div>
            </div>
            <div style={styles.desgloseDiv} />
            <div style={styles.desgloseItem}>
              <span style={styles.desgloseEmoji}>💵</span>
              <div>
                <div style={styles.desgloseLabel}>Efectivo</div>
                <div style={styles.desgloseVal}>${formatARS(totalEfectivo)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Formulario ─────────────────────────────────────────────────── */}
      {mostrarForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>
            {editando ? '✏️ Editar ingreso' : '➕ Nuevo ingreso'}
          </h3>

          {/* Medio de pago */}
          <label style={styles.label}>Tipo de dólares *</label>
          <div style={styles.medioRow}>
            {MEDIOS.map(m => {
              const activo = form.medio_pago === m.id;
              return (
                <button
                  key={m.id}
                  style={{
                    ...styles.medioBtn,
                    background: activo ? m.bg : 'white',
                    border: `2px solid ${activo ? m.border : '#e2e8f0'}`,
                  }}
                  onClick={() => setForm({ ...form, medio_pago: m.id })}
                >
                  <span style={styles.medioEmoji}>{m.emoji}</span>
                  <span style={{ ...styles.medioLabel, color: activo ? m.color : '#64748b', fontWeight: activo ? '800' : '600' }}>
                    {m.label}
                  </span>
                  {activo && <span style={{ ...styles.medioCheck, color: m.color }}>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Monto en USD */}
          <label style={styles.label}>Monto en dólares (USD) *</label>
          <div style={styles.inputWithPrefix}>
            <span style={styles.prefix}>USD</span>
            <input
              style={styles.inputPrefixed}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={form.monto_dolares}
              onChange={e => setForm({ ...form, monto_dolares: e.target.value })}
            />
          </div>

          {/* Tipo de cambio */}
          <label style={styles.label}>Tipo de cambio ($/USD) *</label>
          <div style={styles.inputWithPrefix}>
            <span style={styles.prefix}>$</span>
            <input
              style={styles.inputPrefixed}
              type="number"
              inputMode="decimal"
              placeholder="Ej: 1050"
              value={form.tipo_cambio}
              onChange={e => setForm({ ...form, tipo_cambio: e.target.value })}
            />
          </div>

          {/* Preview del cálculo */}
          {previewPesos !== null && (
            <div style={{ ...styles.previewCalc, borderColor: medioActual?.border }}>
              <div style={styles.previewCalcRow}>
                <span style={styles.previewCalcText}>
                  USD {formatUSD(Number(form.monto_dolares))} × ${formatARS(Number(form.tipo_cambio))}
                </span>
                <span style={styles.previewCalcIgual}>=</span>
                <span style={{ ...styles.previewCalcResult, color: medioActual?.color }}>
                  ${formatARS(previewPesos)}
                </span>
              </div>
              <div style={styles.previewCalcLabel}>
                {medioActual?.emoji} {medioActual?.label}
              </div>
            </div>
          )}

          {/* Concepto */}
          <label style={styles.label}>Concepto (opcional)</label>
          <input
            style={styles.input}
            placeholder="Ej: Sueldo, Freelance, Alquiler..."
            value={form.concepto}
            onChange={e => setForm({ ...form, concepto: e.target.value })}
          />

          {/* Fecha */}
          <label style={styles.label}>Fecha</label>
          <input
            style={styles.input}
            type="date"
            value={form.fecha}
            onChange={e => setForm({ ...form, fecha: e.target.value })}
          />

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formBtns}>
            <button style={styles.cancelBtn} onClick={cerrarForm}>Cancelar</button>
            <button style={styles.saveBtn} onClick={handleGuardar} disabled={guardando}>
              {guardando ? '⏳ Guardando...' : '✅ Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Lista de ingresos ───────────────────────────────────────────── */}
      <div style={styles.content}>
        {!mostrarForm && (
          <button style={styles.addBtn} onClick={abrirNuevo}>
            + Agregar ingreso
          </button>
        )}

        {cargando ? (
          <p style={styles.loading}>⏳ Cargando ingresos...</p>
        ) : ingresos.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>💚</p>
            <p style={styles.emptyText}>No hay ingresos este mes</p>
            <p style={styles.emptyHint}>Tocá "Agregar ingreso" para registrar el primero</p>
          </div>
        ) : (
          ingresos.map(ing => {
            const medio = MEDIOS.find(m => m.id === ing.medio_pago);
            const esMio = ing.usuario_id === user?.id;
            return (
              <div key={ing.id} style={styles.ingRow}>
                {/* Ícono medio */}
                <div style={{ ...styles.ingIcono, background: medio?.bg, color: medio?.color }}>
                  {medio?.emoji}
                </div>

                {/* Info */}
                <div style={styles.ingInfo}>
                  <div style={styles.ingConcepto}>
                    {ing.concepto || medio?.label}
                  </div>
                  <div style={styles.ingMeta}>
                    <span style={{ ...styles.ingAvatar, background: ing.profiles?.avatar_color || '#6366f1' }}>
                      {(ing.profiles?.nombre || '?')[0].toUpperCase()}
                    </span>
                    <span style={styles.ingMetaText}>{ing.profiles?.nombre}</span>
                    <span style={styles.ingMetaDot}>·</span>
                    <span style={styles.ingMetaText}>
                      {format(new Date(ing.fecha + 'T12:00:00'), 'dd MMM', { locale: es })}
                    </span>
                    <span style={styles.ingMetaDot}>·</span>
                    <span style={styles.ingMetaText}>TC ${formatARS(ing.tipo_cambio)}</span>
                  </div>
                </div>

                {/* Montos */}
                <div style={styles.ingMontos}>
                  <div style={{ ...styles.ingPesos, color: medio?.color }}>${formatARS(ing.monto_pesos)}</div>
                  <div style={styles.ingUSD}>USD {formatUSD(ing.monto_dolares)}</div>
                </div>

                {/* Acciones (solo propios) */}
                {esMio && (
                  <div style={styles.ingActions}>
                    <button style={styles.editBtn} onClick={() => abrirEditar(ing)}>✏️</button>
                    <button
                      style={{ ...styles.deleteBtn, ...(confirmBorrar === ing.id ? styles.deleteBtnConfirm : {}) }}
                      onClick={() => handleBorrar(ing.id)}
                    >
                      {confirmBorrar === ing.id ? '¿Seguro?' : '🗑️'}
                    </button>
                    {confirmBorrar === ing.id && (
                      <button style={styles.cancelSmallBtn} onClick={() => setConfirmBorrar(null)}>✕</button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatARS(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function formatUSD(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const styles = {
  page: { minHeight: '100vh', background: '#f1f5f9', paddingBottom: '40px', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  // Header
  header: {
    background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    padding: '20px', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '14px' },
  headerTitle: { margin: 0, fontSize: '22px', fontWeight: '800' },
  exportBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' },
  // Hero
  heroCard: {
    background: 'linear-gradient(135deg, #059669, #047857)',
    margin: '0 16px 12px', borderRadius: '20px', padding: '24px',
    color: 'white', boxShadow: '0 10px 30px rgba(5,150,105,0.4)',
  },
  heroLabel: { margin: '0 0 4px', fontSize: '13px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px' },
  heroAmount: { margin: '0 0 10px', fontSize: '40px', fontWeight: '800' },
  heroSub: { display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '12px', opacity: 0.9, marginBottom: '16px' },
  desglose: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '14px', padding: '12px 16px', gap: '16px' },
  desgloseItem: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  desgloseEmoji: { fontSize: '24px' },
  desgloseLabel: { fontSize: '11px', opacity: 0.85, fontWeight: '600' },
  desgloseVal: { fontSize: '16px', fontWeight: '800' },
  desgloseDiv: { width: '1px', height: '36px', background: 'rgba(255,255,255,0.3)' },
  // Formulario
  formCard: { background: 'white', margin: '0 16px 12px', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  formTitle: { margin: '0 0 4px', fontSize: '17px', fontWeight: '800', color: '#1e293b' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', margin: '14px 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  medioRow: { display: 'flex', gap: '10px' },
  medioBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '14px 8px', borderRadius: '16px', cursor: 'pointer', fontFamily: 'inherit', position: 'relative', transition: 'all 0.15s' },
  medioEmoji: { fontSize: '28px' },
  medioLabel: { fontSize: '13px', textAlign: 'center', lineHeight: 1.2 },
  medioCheck: { position: 'absolute', top: '8px', right: '10px', fontSize: '13px', fontWeight: '900' },
  inputWithPrefix: { display: 'flex', alignItems: 'center', border: '2px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' },
  prefix: { padding: '12px 14px', background: '#f8fafc', fontSize: '14px', fontWeight: '700', color: '#475569', borderRight: '2px solid #e5e7eb', whiteSpace: 'nowrap' },
  inputPrefixed: { flex: 1, padding: '12px 14px', border: 'none', fontSize: '16px', outline: 'none', fontFamily: 'inherit', fontWeight: '700' },
  previewCalc: {
    border: '2px solid', borderRadius: '14px', padding: '14px 16px',
    background: '#f8fafc', margin: '14px 0 4px',
  },
  previewCalcRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  previewCalcText: { fontSize: '14px', color: '#64748b', flex: 1 },
  previewCalcIgual: { fontSize: '18px', color: '#94a3b8', fontWeight: '700' },
  previewCalcResult: { fontSize: '22px', fontWeight: '800' },
  previewCalcLabel: { fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '600' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', margin: '10px 0 0' },
  formBtns: { display: 'flex', gap: '10px', marginTop: '16px' },
  cancelBtn: { flex: 0.4, padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { flex: 0.6, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  // Contenido
  content: { padding: '4px 16px' },
  addBtn: { width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px' },
  loading: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px' },
  empty: { textAlign: 'center', padding: '50px 20px' },
  emptyIcon: { fontSize: '56px', margin: '0 0 12px' },
  emptyText: { fontSize: '18px', fontWeight: '700', color: '#334155', margin: '0 0 6px' },
  emptyHint: { fontSize: '14px', color: '#94a3b8' },
  // Filas de ingresos
  ingRow: { background: 'white', borderRadius: '14px', padding: '12px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexWrap: 'wrap' },
  ingIcono: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  ingInfo: { flex: 1, minWidth: '120px' },
  ingConcepto: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  ingMeta: { display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' },
  ingAvatar: { width: '16px', height: '16px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: 'white' },
  ingMetaText: { fontSize: '11px', color: '#94a3b8' },
  ingMetaDot: { fontSize: '11px', color: '#cbd5e1' },
  ingMontos: { textAlign: 'right', flexShrink: 0 },
  ingPesos: { fontSize: '16px', fontWeight: '800' },
  ingUSD: { fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' },
  ingActions: { display: 'flex', gap: '6px', alignItems: 'center', width: '100%', paddingTop: '8px', borderTop: '1px solid #f1f5f9' },
  editBtn: { padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '14px' },
  deleteBtn: { padding: '6px 10px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#dc2626' },
  deleteBtnConfirm: { background: '#dc2626', color: 'white', border: '1px solid #dc2626' },
  cancelSmallBtn: { padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
};
