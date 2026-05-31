import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useGastos } from '../hooks/useGastos';
import { supabase } from '../lib/supabase';

const ICONOS = ['🛒','🥬','🥩','🍗','💊','⛽','📚','🔌','📡','👕','🍽️','🚗','🏥','🎬','📌','🏠','🐾','💇','🎓','🏋️','🎁','✈️','🔧','💰','🧴','🍺','☕','🎮'];
const COLORES = ['#10b981','#22c55e','#ef4444','#f97316','#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#ec4899','#64748b','#14b8a6','#a855f7','#f43f5e','#0ea5e9','#94a3b8'];

export default function CategoriasPage({ onVolver }) {
  const { user } = useAuth();
  const { getCategorias, crearCategoria } = useGastos();

  const [categorias, setCategorias]   = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [editando, setEditando]       = useState(null);
  const [nueva, setNueva]             = useState(false);
  const [form, setForm]               = useState({ nombre: '', icono: '📌', color: '#94a3b8' });
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState('');
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const data = await getCategorias();
    setCategorias(data);
    setCargando(false);
  }, [getCategorias]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirEditar = (cat) => {
    setEditando(cat);
    setForm({ nombre: cat.nombre, icono: cat.icono, color: cat.color });
    setNueva(false);
    setError('');
  };

  const abrirNueva = () => {
    setNueva(true);
    setEditando(null);
    setForm({ nombre: '', icono: '📌', color: '#94a3b8' });
    setError('');
  };

  const cerrarForm = () => {
    setEditando(null);
    setNueva(false);
    setError('');
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('Ingresá un nombre para la categoría'); return; }
    setGuardando(true);
    setError('');
    try {
      if (nueva) {
        await crearCategoria(form.nombre.trim(), form.icono, form.color, user.id);
      } else {
        const { error: err } = await supabase
          .from('categorias')
          .update({ nombre: form.nombre.trim(), icono: form.icono, color: form.color })
          .eq('id', editando.id);
        if (err) throw err;
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
      const { error: err } = await supabase.from('categorias').delete().eq('id', id);
      if (err) throw new Error('No se puede borrar: puede tener gastos asociados');
      setConfirmBorrar(null);
      await cargar();
    } catch (e) {
      setError(e.message);
      setConfirmBorrar(null);
    }
  };

  return (
    <div style={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={onVolver}>← Volver</button>
        <h1 style={styles.headerTitle}>Categorías</h1>
        <button style={styles.addBtn} onClick={abrirNueva}>+ Nueva</button>
      </header>

      {/* ── Formulario (editar o nueva) ──────────────────────────────── */}
      {(editando || nueva) && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>
            {nueva ? '➕ Nueva categoría' : `✏️ Editando: ${editando.nombre}`}
          </h3>

          <label style={styles.label}>Nombre</label>
          <input
            style={styles.input}
            placeholder="Ej: Veterinaria"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            autoFocus
          />

          <label style={styles.label}>Ícono</label>
          <div style={styles.iconGrid}>
            {ICONOS.map(ic => (
              <button
                key={ic}
                style={{ ...styles.iconBtn, ...(form.icono === ic ? styles.iconBtnActive : {}) }}
                onClick={() => setForm({ ...form, icono: ic })}
              >
                {ic}
              </button>
            ))}
          </div>

          <label style={styles.label}>Color</label>
          <div style={styles.colorGrid}>
            {COLORES.map(col => (
              <button
                key={col}
                style={{
                  ...styles.colorBtn,
                  background: col,
                  border: form.color === col ? '3px solid #1e293b' : '3px solid transparent',
                  transform: form.color === col ? 'scale(1.2)' : 'scale(1)',
                }}
                onClick={() => setForm({ ...form, color: col })}
              />
            ))}
          </div>

          {/* Preview en tiempo real */}
          <div style={styles.previewRow}>
            <div style={{ ...styles.previewIcon, background: form.color + '22', color: form.color }}>
              {form.icono}
            </div>
            <span style={styles.previewNombre}>
              {form.nombre || 'Vista previa'}
            </span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formBtns}>
            <button style={styles.cancelBtn} onClick={cerrarForm}>Cancelar</button>
            <button style={styles.saveBtn} onClick={handleGuardar} disabled={guardando}>
              {guardando ? '⏳ Guardando...' : '✅ Guardar'}
            </button>
          </div>
        </div>
      )}

      {error && !editando && !nueva && (
        <div style={{ ...styles.error, margin: '12px 16px' }}>{error}</div>
      )}

      {/* ── Lista de categorías ──────────────────────────────────────── */}
      <div style={styles.content}>
        {cargando ? (
          <p style={styles.loading}>⏳ Cargando categorías...</p>
        ) : (
          categorias.map(cat => (
            <div key={cat.id} style={styles.catRow}>
              <div style={{ ...styles.catIcon, background: cat.color + '22', color: cat.color }}>
                {cat.icono}
              </div>

              <div style={styles.catInfo}>
                <span style={styles.catNombre}>{cat.nombre}</span>
                {cat.es_personalizada && (
                  <span style={styles.badge}>personalizada</span>
                )}
              </div>

              <div style={styles.catActions}>
                <button style={styles.editBtn} onClick={() => abrirEditar(cat)}>
                  ✏️
                </button>
                <button
                  style={{ ...styles.deleteBtn, ...(confirmBorrar === cat.id ? styles.deleteBtnConfirm : {}) }}
                  onClick={() => handleBorrar(cat.id)}
                >
                  {confirmBorrar === cat.id ? '¿Seguro?' : '🗑️'}
                </button>
                {confirmBorrar === cat.id && (
                  <button style={styles.cancelSmallBtn} onClick={() => setConfirmBorrar(null)}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', background: '#f1f5f9', paddingBottom: '40px',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  // Header
  header: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
    padding: '20px', color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: '700', fontSize: '14px',
  },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: '800' },
  addBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
    padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
    fontFamily: 'inherit', fontWeight: '700', fontSize: '14px',
  },
  // Formulario
  formCard: {
    background: 'white', margin: '16px', borderRadius: '20px',
    padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  formTitle: { margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: '#1e293b' },
  label: {
    display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569',
    margin: '14px 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  },
  iconGrid: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  iconBtn: {
    width: '42px', height: '42px', borderRadius: '10px',
    border: '2px solid #e2e8f0', background: 'white',
    fontSize: '20px', cursor: 'pointer',
  },
  iconBtnActive: { border: '2px solid #4f46e5', background: '#ede9fe' },
  colorGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' },
  colorBtn: {
    width: '30px', height: '30px', borderRadius: '50%',
    cursor: 'pointer', transition: 'transform 0.15s',
  },
  previewRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 14px', background: '#f8fafc',
    borderRadius: '12px', margin: '16px 0 4px',
  },
  previewIcon: {
    width: '42px', height: '42px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
  },
  previewNombre: { fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  error: {
    background: '#fef2f2', color: '#dc2626',
    padding: '10px 14px', borderRadius: '10px', fontSize: '13px', margin: '8px 0',
  },
  formBtns: { display: 'flex', gap: '10px', marginTop: '16px' },
  cancelBtn: {
    flex: 0.4, padding: '12px', borderRadius: '12px',
    border: '2px solid #e2e8f0', background: 'white',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    flex: 0.6, padding: '12px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white', border: 'none',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  // Lista
  content: { padding: '8px 16px' },
  loading: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px' },
  catRow: {
    background: 'white', borderRadius: '14px', padding: '12px 14px',
    marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  catIcon: {
    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
  },
  catInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  catNombre: { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  badge: {
    fontSize: '10px', fontWeight: '700', color: '#6366f1',
    background: '#ede9fe', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
  },
  catActions: { display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 },
  editBtn: {
    padding: '7px 11px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: '#f8fafc',
    cursor: 'pointer', fontSize: '15px',
  },
  deleteBtn: {
    padding: '7px 10px', borderRadius: '8px',
    border: '1px solid #fca5a5', background: '#fef2f2',
    cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#dc2626',
  },
  deleteBtnConfirm: { background: '#dc2626', color: 'white', border: '1px solid #dc2626' },
  cancelSmallBtn: {
    padding: '7px 9px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: 'white',
    cursor: 'pointer', fontSize: '12px', fontWeight: '700',
  },
};
