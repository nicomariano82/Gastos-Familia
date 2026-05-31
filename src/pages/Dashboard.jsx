import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useGastos } from '../hooks/useGastos';
import NuevoGastoModal from '../components/NuevoGastoModal';
import GastoItem from '../components/GastoItem';
import ResumenCategoria from '../components/ResumenCategoria';
import SelectorMes from '../components/SelectorMes';
import CategoriasPage from './CategoriasPage';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const { getGastosMes, exportarCSV } = useGastos();

  const hoy = new Date();
  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() + 1 });
  const [gastos, setGastos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [verCategorias, setVerCategorias] = useState(false);

  const cargarGastos = useCallback(async () => {
    setCargando(true);
    const data = await getGastosMes(mes.year, mes.month);
    setGastos(data);
    setCargando(false);
  }, [mes, getGastosMes]);

  useEffect(() => { cargarGastos(); }, [cargarGastos]);

  // ── Cálculos ─────────────────────────────────────────────────────────────
  const totalMes = gastos.reduce((sum, g) => sum + Number(g.importe), 0);
  const totalEfectivo = gastos.filter(g => g.medio_pago === 'efectivo').reduce((sum, g) => sum + Number(g.importe), 0);
  const totalDigital  = gastos.filter(g => g.medio_pago === 'digital').reduce((sum, g) => sum + Number(g.importe), 0);
  const pctEfectivo   = totalMes > 0 ? (totalEfectivo / totalMes) * 100 : 0;
  const pctDigital    = totalMes > 0 ? (totalDigital  / totalMes) * 100 : 0;

  const porCategoria = gastos.reduce((acc, g) => {
    const key   = g.categorias?.nombre || 'Sin categoría';
    const icono = g.categorias?.icono  || '📌';
    const color = g.categorias?.color  || '#94a3b8';
    if (!acc[key]) acc[key] = { total: 0, icono, color, count: 0 };
    acc[key].total += Number(g.importe);
    acc[key].count += 1;
    return acc;
  }, {});

  const porUsuario = gastos.reduce((acc, g) => {
    const nombre = g.profiles?.nombre       || 'Desconocido';
    const color  = g.profiles?.avatar_color || '#6366f1';
    if (!acc[nombre]) acc[nombre] = { total: 0, color };
    acc[nombre].total += Number(g.importe);
    return acc;
  }, {});

  const diasConGastos  = new Set(gastos.map(g => g.fecha)).size;
  const promedioDiario = diasConGastos > 0 ? totalMes / diasConGastos : 0;
  const categoriaTop   = Object.entries(porCategoria).sort((a, b) => b[1].total - a[1].total)[0];
  const esMesActual    = mes.year === hoy.getFullYear() && mes.month === hoy.getMonth() + 1;
  const nombreMes      = format(new Date(mes.year, mes.month - 1, 1), 'MMMM yyyy', { locale: es });

  if (verCategorias) {
    return <CategoriasPage onVolver={() => setVerCategorias(false)} />;
  }

  return (
    <div style={styles.page}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.headerTitle}>💰 Gastos Familia</h1>
            <p style={styles.headerSub}>Hola, <strong>{profile?.nombre}</strong> 👋</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.iconBtn} onClick={() => setVerCategorias(true)} title="Categorías">🏷️</button>
            <button style={styles.iconBtn} onClick={() => exportarCSV(gastos, nombreMes)} title="Exportar CSV">📊</button>
            <button style={styles.iconBtn} onClick={signOut} title="Cerrar sesión">🚪</button>
          </div>
        </div>
        <SelectorMes mes={mes} onChange={setMes} />
      </header>

      {/* ── Hero Total ────────────────────────────────────────────────── */}
      <div style={styles.heroCard}>
        <p style={styles.heroLabel}>Total {esMesActual ? 'este mes' : nombreMes.split(' ')[0]}</p>
        <p style={styles.heroAmount}>${formatARS(totalMes)}</p>

        <div style={styles.heroStats}>
          <span>📅 {gastos.length} gastos</span>
          <span>📈 Prom. ${formatARS(promedioDiario)}/día</span>
          {categoriaTop && <span>🏆 {categoriaTop[1].icono} {categoriaTop[0]}</span>}
        </div>

        {/* Por usuario */}
        {Object.keys(porUsuario).length > 0 && (
          <div style={styles.usuarioRow}>
            {Object.entries(porUsuario).map(([nombre, info]) => (
              <div key={nombre} style={styles.usuarioChip}>
                <span style={{ ...styles.usuarioAvatar, background: info.color }}>{nombre[0].toUpperCase()}</span>
                <span style={styles.usuarioNombre}>{nombre}</span>
                <strong style={styles.usuarioTotal}>${formatARS(info.total)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tarjetas Efectivo / Digital ───────────────────────────────── */}
      <div style={styles.medioPagoGrid}>

        <div style={{ ...styles.medioPagoCard, borderColor: '#6ee7b7' }}>
          <div style={styles.medioPagoCardHeader}>
            <span style={styles.medioPagoCardEmoji}>💵</span>
            <span style={{ ...styles.medioPagoCardLabel, color: '#059669' }}>Efectivo</span>
          </div>
          <p style={{ ...styles.medioPagoCardTotal, color: '#065f46' }}>${formatARS(totalEfectivo)}</p>
          <div style={styles.miniBarBg}>
            <div style={{ ...styles.miniBarFill, width: `${pctEfectivo}%`, background: '#10b981' }} />
          </div>
          <p style={styles.medioPagoCardPct}>{pctEfectivo.toFixed(0)}% del total</p>
        </div>

        <div style={{ ...styles.medioPagoCard, borderColor: '#c4b5fd' }}>
          <div style={styles.medioPagoCardHeader}>
            <span style={styles.medioPagoCardEmoji}>💳</span>
            <span style={{ ...styles.medioPagoCardLabel, color: '#4f46e5' }}>Digital</span>
          </div>
          <p style={{ ...styles.medioPagoCardTotal, color: '#3730a3' }}>${formatARS(totalDigital)}</p>
          <div style={styles.miniBarBg}>
            <div style={{ ...styles.miniBarFill, width: `${pctDigital}%`, background: '#6366f1' }} />
          </div>
          <p style={styles.medioPagoCardPct}>{pctDigital.toFixed(0)}% del total</p>
        </div>

      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'resumen' ? styles.tabActive : {}) }}
          onClick={() => setTab('resumen')}
        >📊 Resumen</button>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'detalle' ? styles.tabActive : {}) }}
          onClick={() => setTab('detalle')}
        >📋 Detalle</button>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────── */}
      <div style={styles.content}>
        {cargando ? (
          <div style={styles.loading}>⏳ Cargando gastos...</div>
        ) : gastos.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyIcon}>🌟</p>
            <p style={styles.emptyText}>No hay gastos cargados</p>
            <p style={styles.emptyHint}>Tocá el botón + para agregar el primero</p>
          </div>
        ) : tab === 'resumen' ? (
          <>
            <h3 style={styles.sectionTitle}>Por categoría</h3>
            {Object.entries(porCategoria)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([nombre, info]) => (
                <ResumenCategoria key={nombre} nombre={nombre} info={info} total={totalMes} />
              ))}
            <h3 style={styles.sectionTitle}>Últimos 5 gastos</h3>
            {gastos.slice(0, 5).map(g => (
              <GastoItem key={g.id} gasto={g} onDeleted={cargarGastos} onUpdated={cargarGastos} />
            ))}
          </>
        ) : (
          <>
            <h3 style={styles.sectionTitle}>Todos los gastos</h3>
            {gastos.map(g => (
              <GastoItem key={g.id} gasto={g} onDeleted={cargarGastos} onUpdated={cargarGastos} />
            ))}
          </>
        )}
      </div>

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      <button style={styles.fab} onClick={() => setMostrarModal(true)}>+</button>

      {mostrarModal && (
        <NuevoGastoModal
          onClose={() => setMostrarModal(false)}
          onGuardado={() => { setMostrarModal(false); cargarGastos(); }}
        />
      )}
    </div>
  );
}

export function formatARS(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const styles = {
  page: {
    minHeight: '100vh', background: '#f1f5f9', paddingBottom: '100px',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  // Header
  header: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
    padding: '20px 20px 0', color: 'white',
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  headerTitle: { margin: 0, fontSize: '22px', fontWeight: '800' },
  headerSub: { margin: '4px 0 0', fontSize: '14px', opacity: 0.85 },
  headerActions: { display: 'flex', gap: '8px' },
  iconBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
    padding: '8px 12px', fontSize: '18px', cursor: 'pointer',
  },
  // Hero
  heroCard: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    margin: '0 16px', borderRadius: '20px', padding: '24px',
    color: 'white', marginTop: '-1px', boxShadow: '0 10px 30px rgba(79,70,229,0.4)',
    position: 'relative', zIndex: 1, marginBottom: '12px',
  },
  heroLabel: { margin: '0 0 4px', fontSize: '13px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' },
  heroAmount: { margin: '0 0 12px', fontSize: '42px', fontWeight: '800' },
  heroStats: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', opacity: 0.9, marginBottom: '16px' },
  usuarioRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  usuarioChip: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 10px 4px 4px',
  },
  usuarioAvatar: {
    width: '26px', height: '26px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '13px', fontWeight: '700', color: 'white',
  },
  usuarioNombre: { fontSize: '13px' },
  usuarioTotal: { fontSize: '13px', marginLeft: '4px' },
  // Tarjetas medio de pago
  medioPagoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '10px', margin: '0 16px 12px',
  },
  medioPagoCard: {
    background: 'white', borderRadius: '16px', padding: '14px',
    border: '2px solid', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  medioPagoCardHeader: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' },
  medioPagoCardEmoji: { fontSize: '20px' },
  medioPagoCardLabel: { fontSize: '13px', fontWeight: '700' },
  medioPagoCardTotal: { margin: '0 0 8px', fontSize: '20px', fontWeight: '800' },
  miniBarBg: { height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' },
  miniBarFill: { height: '100%', borderRadius: '99px', transition: 'width 0.5s ease' },
  medioPagoCardPct: { margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '600' },
  // Tabs
  tabs: { display: 'flex', margin: '0 16px 12px', gap: '8px' },
  tabBtn: {
    flex: 1, padding: '10px', borderRadius: '12px', border: '2px solid #e2e8f0',
    background: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    color: '#64748b', fontFamily: 'inherit',
  },
  tabActive: { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' },
  // Contenido
  content: { padding: '0 16px' },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#475569', margin: '16px 0 10px' },
  loading: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '16px' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: '64px', margin: '0 0 12px' },
  emptyText: { fontSize: '20px', fontWeight: '700', color: '#334155', margin: '0 0 6px' },
  emptyHint: { fontSize: '14px', color: '#94a3b8' },
  // FAB
  fab: {
    position: 'fixed', bottom: '28px', right: '24px',
    width: '62px', height: '62px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white', fontSize: '32px', fontWeight: '300',
    border: 'none', cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(79,70,229,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, lineHeight: 1,
  },
};
