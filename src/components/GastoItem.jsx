import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import { useGastos } from '../hooks/useGastos';
import { formatARS } from '../pages/Dashboard';

export default function GastoItem({ gasto, onDeleted, onUpdated }) {
  const { user } = useAuth();
  const { borrarGasto, actualizarGasto } = useGastos();
  const [expandido, setExpandido] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    concepto: gasto.concepto,
    importe: String(gasto.importe),
    fecha: gasto.fecha,
    comentario: gasto.comentario || '',
  });
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const esMio = gasto.usuario_id === user?.id;
  const fecha = format(new Date(gasto.fecha + 'T12:00:00'), 'dd MMM', { locale: es });
  const color = gasto.categorias?.color || '#94a3b8';
  const icono = gasto.categorias?.icono || '📌';
  const avatarColor = gasto.profiles?.avatar_color || '#6366f1';
  const nombreUsuario = gasto.profiles?.nombre || '?';
  const metodoEmoji = { manual: '✏️', foto: '📷', audio: '🎤' }[gasto.metodo_carga] || '✏️';

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    try {
      await borrarGasto(gasto.id);
      onDeleted();
    } catch {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await actualizarGasto(gasto.id, {
        concepto: form.concepto,
        importe: parseFloat(form.importe),
        fecha: form.fecha,
        comentario: form.comentario || null,
      });
      setEditando(false);
      onUpdated();
    } catch {
      setLoading(false);
    }
  };

  if (editando) {
    return (
      <div style={{ ...styles.card, border: '2px solid #c7d2fe' }}>
        <input style={styles.editInput} value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} placeholder="Concepto" />
        <input style={styles.editInput} type="number" value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} placeholder="Importe" />
        <input style={styles.editInput} type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        <input style={styles.editInput} value={form.comentario} onChange={e => setForm({ ...form, comentario: e.target.value })} placeholder="Comentario" />
        <div style={styles.editBtns}>
          <button style={styles.cancelEditBtn} onClick={() => setEditando(false)}>Cancelar</button>
          <button style={styles.saveEditBtn} onClick={handleSave} disabled={loading}>{loading ? '...' : '✅ Guardar'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card} onClick={() => setExpandido(!expandido)}>
      <div style={styles.row}>
        {/* Icono categoría */}
        <div style={{ ...styles.catIcon, background: color + '22', color }}>
          {icono}
        </div>
        {/* Info */}
        <div style={styles.info}>
          <div style={styles.concepto}>{gasto.concepto}</div>
          <div style={styles.meta}>
            <span style={{ ...styles.avatar, background: avatarColor }}>{nombreUsuario[0]}</span>
            <span style={styles.metaText}>{nombreUsuario}</span>
            <span style={styles.metaDot}>·</span>
            <span style={styles.metaText}>{fecha}</span>
            <span style={styles.metaDot}>·</span>
            <span>{metodoEmoji}</span>
          </div>
          {gasto.comentario && expandido && (
            <div style={styles.comentario}>💬 {gasto.comentario}</div>
          )}
        </div>
        {/* Importe */}
        <div style={styles.importeCol}>
          <span style={styles.importe}>${formatARS(gasto.importe)}</span>
          {gasto.categorias && <span style={{ ...styles.catLabel, color }}>{gasto.categorias.nombre}</span>}
        </div>
      </div>

      {/* Acciones (solo visible si expandido y es gasto mío) */}
      {expandido && esMio && (
        <div style={styles.actions} onClick={e => e.stopPropagation()}>
          <button style={styles.editBtn} onClick={() => setEditando(true)}>✏️ Editar</button>
          <button
            style={{ ...styles.deleteBtn, ...(confirmDelete ? styles.deleteBtnConfirm : {}) }}
            onClick={handleDelete}
            disabled={loading}
          >
            {confirmDelete ? '⚠️ Confirmar' : '🗑️ Eliminar'}
          </button>
          {confirmDelete && (
            <button style={styles.cancelEditBtn} onClick={() => setConfirmDelete(false)}>Cancelar</button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'white', borderRadius: '16px', padding: '14px',
    marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    cursor: 'pointer', transition: 'box-shadow 0.2s',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  catIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  concepto: { fontSize: '15px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px', flexWrap: 'wrap' },
  avatar: { width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'white' },
  metaText: { fontSize: '12px', color: '#94a3b8' },
  metaDot: { fontSize: '12px', color: '#cbd5e1' },
  comentario: { fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' },
  importeCol: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 },
  importe: { fontSize: '16px', fontWeight: '800', color: '#1e293b' },
  catLabel: { fontSize: '10px', fontWeight: '700', marginTop: '2px' },
  actions: { display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' },
  editBtn: { padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { padding: '6px 14px', borderRadius: '10px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtnConfirm: { background: '#dc2626', color: 'white', border: '1px solid #dc2626' },
  cancelEditBtn: { padding: '6px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' },
  editInput: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' },
  editBtns: { display: 'flex', gap: '8px' },
  saveEditBtn: { flex: 1, padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700' },
};
