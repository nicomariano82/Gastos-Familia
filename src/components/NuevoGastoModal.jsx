import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useGastos } from '../hooks/useGastos';
import { analizarTicket, analizarAudio, fileToBase64 } from '../lib/openai';

const METODOS = [
  { id: 'manual', label: 'Manual', emoji: '✏️' },
  { id: 'foto', label: 'Foto', emoji: '📷' },
  { id: 'audio', label: 'Audio', emoji: '🎤' },
];

export default function NuevoGastoModal({ onClose, onGuardado }) {
  const { user } = useAuth();
  const { crearGasto, getCategorias, crearCategoria, subirImagen } = useGastos();

  const [metodo, setMetodo] = useState('manual');
  const [categorias, setCategorias] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form
  const [form, setForm] = useState({
    concepto: '',
    importe: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    comentario: '',
    categoria_id: '',
  });

  // Foto
  const [imagenPreview, setImagenPreview] = useState(null);
  const [imagenFile, setImagenFile] = useState(null);
  const [confianzaFoto, setConfianzaFoto] = useState(null);

  // Audio
  const [grabando, setGrabando] = useState(false);
  const [transcripcion, setTranscripcion] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Nueva categoría
  const [nuevaCat, setNuevaCat] = useState('');
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false);

  useEffect(() => {
    getCategorias().then(setCategorias).catch(() => {});
  }, [getCategorias]);

  // ── Foto ───────────────────────────────────────────────────────────────
  const handleFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
    setProcesando(true);
    setErrorMsg('');
    try {
      const b64 = await fileToBase64(file);
      const resultado = await analizarTicket(b64, file.type);
      setForm(f => ({
        ...f,
        concepto: resultado.concepto || f.concepto,
        importe: resultado.importe ? String(resultado.importe) : f.importe,
        fecha: resultado.fecha || f.fecha,
      }));
      setConfianzaFoto(resultado.confianza);
    } catch (err) {
      setErrorMsg('No se pudo leer el ticket. Completá los datos manualmente.');
    } finally {
      setProcesando(false);
    }
  };

  // ── Audio ──────────────────────────────────────────────────────────────
  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = procesarAudio;
      mr.start();
      mediaRecorderRef.current = mr;
      setGrabando(true);
    } catch {
      setErrorMsg('No se pudo acceder al micrófono');
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const procesarAudio = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setProcesando(true);
    setErrorMsg('');
    try {
      const resultado = await analizarAudio(blob);
      setTranscripcion(resultado.transcripcion || '');
      setForm(f => ({
        ...f,
        concepto: resultado.concepto || f.concepto,
        importe: resultado.importe ? String(resultado.importe) : f.importe,
        comentario: resultado.comentario || f.comentario,
      }));
    } catch {
      setErrorMsg('No se pudo interpretar el audio. Completá manualmente.');
    } finally {
      setProcesando(false);
    }
  };

  const handleAudioFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    chunksRef.current = [blob];
    await procesarAudio();
  };

  // ── Guardar ────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setErrorMsg('');
    if (!form.concepto.trim()) { setErrorMsg('Ingresá el concepto del gasto'); return; }
    if (!form.importe || isNaN(Number(form.importe))) { setErrorMsg('Ingresá un importe válido'); return; }

    setGuardando(true);
    try {
      let imagen_url = null;
      if (imagenFile) {
        imagen_url = await subirImagen(imagenFile, user.id).catch(() => null);
      }
      await crearGasto({ ...form, imagen_url, metodo_carga: metodo }, user.id);
      onGuardado();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el gasto');
    } finally {
      setGuardando(false);
    }
  };

  // ── Agregar categoría ──────────────────────────────────────────────────
  const agregarCategoria = async () => {
    if (!nuevaCat.trim()) return;
    try {
      const cat = await crearCategoria(nuevaCat.trim(), '📌', '#94a3b8', user.id);
      setCategorias(prev => [...prev, cat].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm(f => ({ ...f, categoria_id: cat.id }));
      setNuevaCat('');
      setMostrarNuevaCat(false);
    } catch {
      setErrorMsg('Error al crear categoría');
    }
  };

  // ── Sugerencias de concepto ────────────────────────────────────────────
  const conceptosSugeridos = categorias
    .filter(c => c.nombre.toLowerCase().includes(form.concepto.toLowerCase()) && form.concepto.length > 1)
    .slice(0, 4);

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nuevo Gasto</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Método */}
        <div style={styles.metodoRow}>
          {METODOS.map(m => (
            <button
              key={m.id}
              style={{ ...styles.metodoBtn, ...(metodo === m.id ? styles.metodoBtnActive : {}) }}
              onClick={() => setMetodo(m.id)}
            >
              <span style={styles.metodoEmoji}>{m.emoji}</span>
              <span style={styles.metodoLabel}>{m.label}</span>
            </button>
          ))}
        </div>

        <div style={styles.scroll}>
          {/* ── FOTO ─────────────────────────────────────────────────── */}
          {metodo === 'foto' && (
            <div style={styles.section}>
              {imagenPreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={imagenPreview} alt="ticket" style={styles.preview} />
                  <button style={styles.removeImg} onClick={() => { setImagenPreview(null); setImagenFile(null); }}>✕</button>
                </div>
              ) : (
                <label style={styles.uploadZone}>
                  <span style={styles.uploadIcon}>📷</span>
                  <span style={styles.uploadText}>Tocá para subir o sacar foto</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: 'none' }} />
                </label>
              )}
              {procesando && <p style={styles.procesando}>🤖 Analizando imagen con IA...</p>}
              {confianzaFoto && !procesando && (
                <p style={styles.confianza}>
                  {confianzaFoto === 'alta' ? '✅ Datos leídos correctamente. Revisalos antes de guardar.' :
                    confianzaFoto === 'media' ? '⚠️ Datos leídos con dudas. Verificá antes de guardar.' :
                      '❌ No se pudo leer bien. Completá los datos manualmente.'}
                </p>
              )}
            </div>
          )}

          {/* ── AUDIO ────────────────────────────────────────────────── */}
          {metodo === 'audio' && (
            <div style={styles.section}>
              <div style={styles.audioZone}>
                {grabando ? (
                  <button style={styles.stopBtn} onClick={detenerGrabacion}>
                    <span style={styles.audioIcon}>⏹️</span>
                    <span>Detener grabación</span>
                  </button>
                ) : (
                  <button style={styles.recBtn} onClick={iniciarGrabacion}>
                    <span style={styles.audioIcon}>🎤</span>
                    <span>Grabar audio</span>
                  </button>
                )}
                <label style={styles.audioFileLabel}>
                  📁 Subir audio
                  <input type="file" accept="audio/*" onChange={handleAudioFile} style={{ display: 'none' }} />
                </label>
              </div>
              {procesando && <p style={styles.procesando}>🤖 Interpretando audio con IA...</p>}
              {transcripcion && (
                <div style={styles.transcripcionBox}>
                  <p style={styles.transcripcionLabel}>📝 Transcripción:</p>
                  <p style={styles.transcripcionText}>"{transcripcion}"</p>
                </div>
              )}
            </div>
          )}

          {/* ── FORMULARIO (siempre visible) ──────────────────────────── */}
          <div style={styles.section}>
            <label style={styles.label}>Concepto *</label>
            <input
              style={styles.input}
              placeholder="Ej: Supermercado, Farmacia..."
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
            />
            {/* Sugerencias */}
            {conceptosSugeridos.length > 0 && (
              <div style={styles.suggestions}>
                {conceptosSugeridos.map(c => (
                  <button key={c.id} style={styles.suggestion} onClick={() => setForm({ ...form, concepto: c.nombre, categoria_id: c.id })}>
                    {c.icono} {c.nombre}
                  </button>
                ))}
              </div>
            )}

            <label style={styles.label}>Importe *</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={form.importe}
              onChange={e => setForm({ ...form, importe: e.target.value })}
            />

            <label style={styles.label}>Fecha</label>
            <input
              style={styles.input}
              type="date"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
            />

            <label style={styles.label}>Categoría</label>
            <select
              style={styles.select}
              value={form.categoria_id}
              onChange={e => {
                if (e.target.value === '__nueva__') { setMostrarNuevaCat(true); }
                else setForm({ ...form, categoria_id: e.target.value });
              }}
            >
              <option value="">Sin categoría</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
              <option value="__nueva__">➕ Nueva categoría...</option>
            </select>

            {mostrarNuevaCat && (
              <div style={styles.nuevaCatRow}>
                <input
                  style={{ ...styles.input, flex: 1, margin: 0 }}
                  placeholder="Nombre de la categoría"
                  value={nuevaCat}
                  onChange={e => setNuevaCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarCategoria()}
                />
                <button style={styles.addCatBtn} onClick={agregarCategoria}>Agregar</button>
              </div>
            )}

            <label style={styles.label}>Comentario (opcional)</label>
            <input
              style={styles.input}
              placeholder="Detalle adicional..."
              value={form.comentario}
              onChange={e => setForm({ ...form, comentario: e.target.value })}
            />
          </div>

          {errorMsg && <div style={styles.error}>{errorMsg}</div>}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button style={styles.saveBtn} onClick={handleGuardar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : '✅ Guardar gasto'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'white', borderRadius: '24px 24px 0 0',
    width: '100%', maxWidth: '500px',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 20px 0',
  },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: '800', color: '#1e293b' },
  closeBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: '50%',
    width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: '700',
  },
  metodoRow: { display: 'flex', gap: '8px', padding: '14px 20px' },
  metodoBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    padding: '10px 6px', borderRadius: '14px', border: '2px solid #e2e8f0',
    background: 'white', cursor: 'pointer', fontFamily: 'inherit',
  },
  metodoBtnActive: { background: '#ede9fe', borderColor: '#7c3aed' },
  metodoEmoji: { fontSize: '22px' },
  metodoLabel: { fontSize: '11px', fontWeight: '700', color: '#475569' },
  scroll: { flex: 1, overflowY: 'auto', padding: '0 20px' },
  section: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '2px',
  },
  select: {
    width: '100%', padding: '12px 14px', borderRadius: '12px',
    border: '2px solid #e5e7eb', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', background: 'white',
  },
  suggestions: { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '6px 0' },
  suggestion: {
    padding: '4px 10px', borderRadius: '20px', border: '1px solid #e2e8f0',
    background: '#f8fafc', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
  },
  nuevaCatRow: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' },
  addCatBtn: {
    padding: '12px 16px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  uploadZone: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    padding: '28px', borderRadius: '16px', border: '2px dashed #c7d2fe',
    background: '#f5f3ff', cursor: 'pointer',
  },
  uploadIcon: { fontSize: '36px' },
  uploadText: { fontSize: '14px', color: '#6366f1', fontWeight: '600' },
  preview: { width: '100%', borderRadius: '12px', maxHeight: '200px', objectFit: 'cover' },
  removeImg: {
    position: 'absolute', top: '8px', right: '8px',
    background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
    borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px',
  },
  procesando: { textAlign: 'center', color: '#6366f1', fontSize: '14px', margin: '8px 0' },
  confianza: { fontSize: '13px', color: '#475569', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', margin: '6px 0' },
  audioZone: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', padding: '16px 0' },
  recBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    padding: '16px 24px', background: '#fee2e2', border: '2px solid #fca5a5',
    borderRadius: '16px', cursor: 'pointer', fontFamily: 'inherit',
  },
  stopBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    padding: '16px 24px', background: '#fef3c7', border: '2px solid #fcd34d',
    borderRadius: '16px', cursor: 'pointer', fontFamily: 'inherit', animation: 'pulse 1s infinite',
  },
  audioFileLabel: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '16px 20px', background: '#f0fdf4', border: '2px solid #86efac',
    borderRadius: '16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
  },
  audioIcon: { fontSize: '28px' },
  transcripcionBox: { background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', margin: '6px 0' },
  transcripcionLabel: { margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#6366f1' },
  transcripcionText: { margin: 0, fontSize: '14px', color: '#334155', fontStyle: 'italic' },
  error: {
    background: '#fef2f2', color: '#dc2626', padding: '10px 14px',
    borderRadius: '10px', fontSize: '13px', margin: '8px 0',
  },
  footer: {
    display: 'flex', gap: '10px', padding: '16px 20px',
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    flex: 0.4, padding: '14px', borderRadius: '14px',
    border: '2px solid #e2e8f0', background: 'white',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    flex: 0.6, padding: '14px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white', border: 'none',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
  },
};
