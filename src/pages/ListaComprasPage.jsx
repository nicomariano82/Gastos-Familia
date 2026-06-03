import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../hooks/useAuth';
import * as db from '../hooks/useListaCompras';

// ─────────────────────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ListaComprasPage({ onVolver, onRegistrarGasto }) {
  const { user } = useAuth();
  const [vista, setVista]               = useState('main');
  const [listaActiva, setListaActiva]   = useState(null);
  const [historial, setHistorial]       = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [nombreNueva, setNombreNueva]   = useState('');
  const [mostrarForm, setMostrarForm]   = useState(false);
  const [error, setError]               = useState('');
  const cargado = useRef(false);

  useEffect(() => {
    if (cargado.current) return;
    cargado.current = true;
    cargar();
  }, []); // eslint-disable-line

  const cargar = async () => {
    setCargando(true);
    try {
      const [activa, hist] = await Promise.all([db.getListaActiva(), db.getHistorial()]);
      setListaActiva(activa);
      setHistorial(hist);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  };

  const crearNueva = async () => {
    if (!nombreNueva.trim()) { setError('Escribí un nombre para la lista'); return; }
    try {
      const lista = await db.crearLista(nombreNueva.trim(), user.id);
      setListaActiva({ ...lista, items_lista: [] });
      setNombreNueva(''); setMostrarForm(false);
      setVista('lista');
    } catch (e) { setError(e.message); }
  };

  const finalizar = async () => {
    if (!listaActiva) return;
    await db.finalizarLista(listaActiva.id);
    await cargar();
    setVista('main');
  };

  if (vista === 'lista' && listaActiva) {
    return <VistaLista lista={listaActiva} user={user}
      onVolver={() => { cargar(); setVista('main'); }}
      onFinalizar={finalizar}
      onRegistrarGasto={onRegistrarGasto} />;
  }
  if (vista === 'historial') {
    return <VistaHistorial historial={historial}
      onVolver={() => setVista('main')} onRecargado={cargar} />;
  }
  if (vista === 'rubros') {
    return <VistaRubros onVolver={() => setVista('main')} />;
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <h1 style={s.headerTitle}>🛒 Lista de compras</h1>
        <button style={s.iconBtn} onClick={() => setVista('rubros')}>⚙️</button>
      </header>

      <div style={s.content}>
        {cargando ? <p style={s.loading}>⏳ Cargando...</p> : (<>

          {listaActiva ? (
            <div style={s.activaCard}>
              <div style={s.activaHeader}>
                <span style={{ fontSize: '20px' }}>🟢</span>
                <div style={{ flex: 1 }}>
                  <div style={s.activaNombre}>{listaActiva.nombre}</div>
                  <div style={s.activaMeta}>
                    {listaActiva.items_lista?.length || 0} productos ·{' '}
                    {listaActiva.items_lista?.filter(i => i.comprado).length || 0} comprados
                  </div>
                </div>
              </div>
              {listaActiva.items_lista?.length > 0 && (
                <div style={s.activaRubros}>
                  {agruparPorRubro(listaActiva.items_lista).map(g => (
                    <div key={g.rubroId} style={s.activaRubroChip}>
                      <span>{g.icono}</span>
                      <span style={s.activaRubroNombre}>{g.nombre}</span>
                      <span style={s.activaRubroCount}>{g.items.length}</span>
                    </div>
                  ))}
                </div>
              )}
              <button style={s.continuarBtn} onClick={() => setVista('lista')}>
                Continuar lista →
              </button>
            </div>
          ) : (
            <div style={s.sinListaCard}>
              <p style={{ fontSize: '52px', margin: '0 0 10px' }}>🛒</p>
              <p style={s.sinListaText}>No hay lista activa</p>
              <p style={s.sinListaHint}>Creá una nueva para empezar</p>
            </div>
          )}

          {mostrarForm ? (
            <div style={s.nuevaForm}>
              <input style={s.input} placeholder="Ej: Compra semanal, Cumpleaños..."
                value={nombreNueva} onChange={e => setNombreNueva(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && crearNueva()} autoFocus />
              {error && <div style={s.error}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button style={s.cancelBtn} onClick={() => { setMostrarForm(false); setError(''); }}>Cancelar</button>
                <button style={s.crearBtn} onClick={crearNueva}>✅ Crear lista</button>
              </div>
            </div>
          ) : (
            <button style={s.nuevaBtn} onClick={() => {
              if (listaActiva) {
                if (window.confirm('¿Finalizar la lista actual y crear una nueva?')) {
                  finalizar().then(() => setMostrarForm(true));
                }
              } else { setMostrarForm(true); }
            }}>+ Nueva lista de compras</button>
          )}

          {historial.length > 0 && (<>
            <h3 style={s.sectionTitle}>Listas anteriores</h3>
            {historial.slice(0, 3).map(l => (
              <div key={l.id} style={s.histRow}>
                <div style={{ flex: 1 }}>
                  <div style={s.histNombre}>{l.nombre}</div>
                  <div style={s.histMeta}>
                    {format(new Date(l.finalizada_at), "dd 'de' MMMM", { locale: es })} · {l.items_lista?.length || 0} productos
                  </div>
                </div>
                <button style={s.verHistBtn} onClick={() => setVista('historial')}>Ver →</button>
              </div>
            ))}
            {historial.length > 3 && (
              <button style={s.verTodoHistBtn} onClick={() => setVista('historial')}>
                Ver historial completo ({historial.length} listas)
              </button>
            )}
          </>)}
        </>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA LISTA ACTIVA
// ─────────────────────────────────────────────────────────────────────────────
function VistaLista({ lista, user, onVolver, onFinalizar, onRegistrarGasto }) {
  const [items, setItems]                   = useState(lista.items_lista || []);
  const [rubros, setRubros]                 = useState([]);
  const [rubroSel, setRubroSel]             = useState(null);
  const [productos, setProductos]           = useState([]);
  const [busqueda, setBusqueda]             = useState('');
  const [cantidad, setCantidad]             = useState('');
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [editandoItem, setEditandoItem]     = useState(null);
  const [guardando, setGuardando]           = useState(false);
  const [error, setError]                   = useState('');
  const [modalFinalizar, setModalFinalizar] = useState(false);

  const totalItems     = items.length;
  const totalComprados = items.filter(i => i.comprado).length;
  const pct = totalItems > 0 ? Math.round((totalComprados / totalItems) * 100) : 0;

  useEffect(() => { db.getRubros().then(setRubros); }, []);

  useEffect(() => {
    if (rubroSel) db.getProductos(rubroSel.id).then(setProductos);
  }, [rubroSel]);

  const yaEnLista = (nombre) => items.some(i =>
    i.nombre_item.toLowerCase() === nombre.toLowerCase() && i.rubro_id === rubroSel?.id
  );

  const agregarProducto = async (nombre, qty) => {
    if (!rubroSel) { setError('Seleccioná un rubro primero'); return; }
    if (yaEnLista(nombre)) { setError(`"${nombre}" ya está en la lista`); return; }
    setGuardando(true); setError('');
    try {
      const item = await db.agregarItem(lista.id, rubroSel.id, nombre, qty || cantidad);
      setItems(prev => [...prev, { ...item, rubros_compra: rubroSel }]);
      setCantidad(''); setBusqueda('');
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const toggle = async (item) => {
    const nuevo = !item.comprado;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, comprado: nuevo } : i));
    await db.toggleComprado(item.id, nuevo, user.id);
  };

  const eliminarItem = async (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    await db.borrarItem(itemId);
  };

  const guardarEdicion = async (item, nombre, cant) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, nombre_item: nombre, cantidad: cant || null } : i));
    await db.editarItem(item.id, nombre, cant);
    setEditandoItem(null);
  };

  const quitarComprados = async () => {
    await db.limpiarComprados(lista.id);
    setItems(prev => prev.filter(i => !i.comprado));
  };

  const gruposRubro = agruparPorRubro(items);
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ ...s.headerTitle, fontSize: '16px' }}>{lista.nombre}</div>
        </div>
        <button style={s.iconBtn} onClick={() => setModalFinalizar(true)}>✅</button>
      </header>

      {totalItems > 0 && (
        <div style={s.progressBar}>
          <div style={s.progressTop}>
            <span style={s.progressLabel}>Comprados {totalComprados} de {totalItems}</span>
            <span style={s.progressPct}>{pct}%</span>
          </div>
          <div style={s.progressBg}>
            <div style={{ ...s.progressFill, width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div style={s.listaContent}>
        {/* Panel agregar */}
        <div style={s.agregarPanel}>
          <div style={s.agregarHeader} onClick={() => setMostrarAgregar(!mostrarAgregar)}>
            <span>➕</span>
            <span style={{ flex: 1, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>Agregar productos</span>
            <span style={{ color: '#94a3b8' }}>{mostrarAgregar ? '▲' : '▼'}</span>
          </div>

          {mostrarAgregar && (
            <div style={s.agregarBody}>
              <label style={s.label}>Rubro</label>
              <div style={s.rubrosScroll}>
                {rubros.map(r => (
                  <button key={r.id}
                    style={{ ...s.rubroChip, ...(rubroSel?.id === r.id ? { background: r.color + '22', borderColor: r.color, color: r.color, fontWeight: '800' } : {}) }}
                    onClick={() => { setRubroSel(r); setBusqueda(''); setError(''); }}>
                    {r.icono} {r.nombre}
                  </button>
                ))}
              </div>

              {rubroSel && (<>
                <label style={s.label}>Buscar o escribir producto</label>
                <input style={s.input} placeholder={`Buscar en ${rubroSel.nombre}...`}
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />

                <label style={s.label}>Cantidad (opcional)</label>
                <input style={s.input} placeholder="Ej: 2 kg, 1 litro..."
                  value={cantidad} onChange={e => setCantidad(e.target.value)} />

                {error && <div style={s.error}>{error}</div>}

                {productosFiltrados.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {productosFiltrados.slice(0, 8).map(p => {
                      const enLista = yaEnLista(p.nombre);
                      return (
                        <button key={p.id}
                          style={{ ...s.productoBtn, ...(enLista ? s.productoBtnEnLista : {}) }}
                          onClick={() => !enLista && agregarProducto(p.nombre)}
                          disabled={enLista || guardando}>
                          <span>{p.nombre}</span>
                          {enLista
                            ? <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>✓ en lista</span>
                            : <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>+ Agregar</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {busqueda && !productos.find(p => p.nombre.toLowerCase() === busqueda.toLowerCase()) && (
                  <button style={s.nuevoProductoBtn}
                    onClick={() => agregarProducto(busqueda.trim())} disabled={guardando}>
                    ➕ Agregar "{busqueda}" a la lista
                  </button>
                )}
              </>)}
            </div>
          )}
        </div>

        {/* Lista */}
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: '48px', margin: '0 0 10px' }}>🛒</p>
            <p style={{ fontSize: '17px', fontWeight: '700', color: '#334155' }}>Lista vacía</p>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Tocá "Agregar productos" para empezar</p>
          </div>
        ) : (<>
          {totalComprados > 0 && (
            <button style={s.limpiarBtn} onClick={quitarComprados}>
              🗑️ Quitar {totalComprados} comprado{totalComprados !== 1 ? 's' : ''}
            </button>
          )}
          {gruposRubro.map(grupo => (
            <div key={grupo.rubroId} style={s.rubroGroup}>
              <div style={{ ...s.rubroGroupHeader, color: grupo.color }}>
                <span style={{ fontSize: '18px' }}>{grupo.icono}</span>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: '800' }}>{grupo.nombre}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                  {grupo.items.filter(i => i.comprado).length}/{grupo.items.length}
                </span>
              </div>
              {grupo.items.map(item => (
                <ItemRow key={item.id} item={item}
                  onToggle={() => toggle(item)}
                  onBorrar={() => eliminarItem(item.id)}
                  onEditar={(n, c) => guardarEdicion(item, n, c)}
                  editando={editandoItem?.id === item.id}
                  setEditando={() => setEditandoItem(editandoItem?.id === item.id ? null : item)} />
              ))}
            </div>
          ))}
        </>)}
      </div>

      {modalFinalizar && (
        <ModalFinalizar items={items}
          onCancelar={() => setModalFinalizar(false)}
          onFinalizar={onFinalizar}
          onRegistrarGasto={onRegistrarGasto} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILA ITEM
// ─────────────────────────────────────────────────────────────────────────────
function ItemRow({ item, onToggle, onBorrar, onEditar, editando, setEditando }) {
  const [nombre, setNombre]     = useState(item.nombre_item);
  const [cantidad, setCantidad] = useState(item.cantidad || '');

  if (editando) {
    return (
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #f8fafc' }}>
        <input style={{ ...s.input, marginBottom: '6px' }} value={nombre}
          onChange={e => setNombre(e.target.value)} placeholder="Nombre" />
        <input style={s.input} value={cantidad}
          onChange={e => setCantidad(e.target.value)} placeholder="Cantidad (opcional)" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button style={s.cancelSmallBtn} onClick={setEditando}>Cancelar</button>
          <button style={s.saveSmallBtn} onClick={() => onEditar(nombre, cantidad)}>✅ Guardar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...s.itemRow, ...(item.comprado ? { background: '#f0fdf4' } : {}) }}>
      <button style={{ ...s.checkbox, ...(item.comprado ? s.checkboxChecked : {}) }} onClick={onToggle}>
        {item.comprado && <span style={{ color: 'white', fontSize: '14px', fontWeight: '900' }}>✓</span>}
      </button>
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={onToggle}>
        <span style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', ...(item.comprado ? { textDecoration: 'line-through', color: '#94a3b8' } : {}) }}>
          {item.nombre_item}
        </span>
        {item.cantidad && <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{item.cantidad}</span>}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={s.itemEditBtn} onClick={setEditando}>✏️</button>
        <button style={s.itemDeleteBtn} onClick={onBorrar}>✕</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL FINALIZAR
// ─────────────────────────────────────────────────────────────────────────────
function ModalFinalizar({ items, onCancelar, onFinalizar, onRegistrarGasto }) {
  const pendientes = items.filter(i => !i.comprado).length;
  const comprados  = items.filter(i => i.comprado).length;
  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onCancelar()}>
      <div style={s.modal}>
        <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>✅ Finalizar lista</h3>
        <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 10px' }}>
          Comprados: <strong>{comprados}</strong><br />
          {pendientes > 0 && <>Pendientes: <strong style={{ color: '#f59e0b' }}>{pendientes}</strong></>}
        </p>
        {pendientes > 0 && (
          <p style={{ fontSize: '13px', color: '#f59e0b', background: '#fffbeb', padding: '8px 12px', borderRadius: '10px', margin: '0 0 16px' }}>
            ⚠️ Hay {pendientes} producto{pendientes !== 1 ? 's' : ''} sin comprar.
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button style={s.cancelBtn} onClick={onCancelar}>Cancelar</button>
          <button style={s.finalizarBtn} onClick={onFinalizar}>Finalizar</button>
        </div>
        {onRegistrarGasto && (
          <button style={s.registrarGastoBtn} onClick={() => { onFinalizar(); onRegistrarGasto(); }}>
            💰 Finalizar y registrar como gasto
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA HISTORIAL
// ─────────────────────────────────────────────────────────────────────────────
function VistaHistorial({ historial, onVolver, onRecargado }) {
  const [confirmBorrar, setConfirmBorrar] = useState(null);

  const borrar = async (id) => {
    if (confirmBorrar !== id) { setConfirmBorrar(id); return; }
    await db.borrarLista(id);
    setConfirmBorrar(null);
    onRecargado();
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <h1 style={s.headerTitle}>📋 Historial</h1>
        <div style={{ width: 60 }} />
      </header>
      <div style={s.content}>
        {historial.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <p style={{ fontSize: '48px', margin: '0 0 10px' }}>📋</p>
            <p style={{ fontSize: '17px', fontWeight: '700', color: '#334155' }}>No hay listas anteriores</p>
          </div>
        ) : historial.map(l => (
          <div key={l.id} style={s.histRow}>
            <div style={{ fontSize: '24px' }}>📋</div>
            <div style={{ flex: 1 }}>
              <div style={s.histNombre}>{l.nombre}</div>
              <div style={s.histMeta}>
                {format(new Date(l.finalizada_at), "dd 'de' MMMM yyyy", { locale: es })} · {l.items_lista?.length || 0} productos
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button style={{ ...s.deleteBtn, ...(confirmBorrar === l.id ? s.deleteBtnConfirm : {}) }}
                onClick={() => borrar(l.id)}>
                {confirmBorrar === l.id ? '¿Seguro?' : '🗑️'}
              </button>
              {confirmBorrar === l.id && (
                <button style={s.cancelSmallBtn} onClick={() => setConfirmBorrar(null)}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA RUBROS
// ─────────────────────────────────────────────────────────────────────────────
function VistaRubros({ onVolver }) {
  const [rubros, setRubros]               = useState([]);
  const [rubroSel, setRubroSel]           = useState(null);
  const [productos, setProductos]         = useState([]);
  const [form, setForm]                   = useState({ nombre: '', icono: '🛒', color: '#6366f1' });
  const [editandoRubro, setEditandoRubro] = useState(null);
  const [mostrarForm, setMostrarForm]     = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState('');
  const [editandoProd, setEditandoProd]   = useState(null);
  const [editNombreProd, setEditNombreProd] = useState('');
  const [confirmBorrarRubro, setConfirmBorrarRubro] = useState(null);
  const [confirmBorrarProd, setConfirmBorrarProd]   = useState(null);
  const [error, setError] = useState('');

  const ICONOS  = ['🛒','🥬','🥩','🍗','💊','🍞','🧹','🐟','🧀','🥚','🍷','🧃','🌿','🐄','🏪'];
  const COLORES = ['#6366f1','#22c55e','#ef4444','#f97316','#3b82f6','#f59e0b','#06b6d4','#ec4899','#8b5cf6'];

  const recargarRubros   = () => db.getRubros().then(setRubros);
  const recargarProductos = (id) => db.getProductos(id).then(setProductos);

  useEffect(() => { recargarRubros(); }, []); // eslint-disable-line
  useEffect(() => { if (rubroSel) recargarProductos(rubroSel.id); }, [rubroSel]); // eslint-disable-line

  const abrirNuevo   = () => { setMostrarForm(true); setEditandoRubro(null); setForm({ nombre: '', icono: '🛒', color: '#6366f1' }); setError(''); };
  const abrirEditar  = (r) => { setMostrarForm(true); setEditandoRubro(r); setForm({ nombre: r.nombre, icono: r.icono, color: r.color }); setError(''); };
  const cerrarForm   = () => { setMostrarForm(false); setEditandoRubro(null); setError(''); };

  const guardarRubro = async () => {
    if (!form.nombre.trim()) { setError('Ingresá un nombre'); return; }
    try {
      if (editandoRubro) await db.editarRubro(editandoRubro.id, form);
      else await db.crearRubro(form.nombre, form.icono, form.color);
      await recargarRubros(); cerrarForm();
    } catch (e) { setError(e.message); }
  };

  const eliminarRubro = async (id) => {
    if (confirmBorrarRubro !== id) { setConfirmBorrarRubro(id); return; }
    try {
      await db.borrarRubro(id);
      setConfirmBorrarRubro(null);
      await recargarRubros();
      if (rubroSel?.id === id) setRubroSel(null);
    } catch { setError('No se puede borrar: tiene productos asociados'); setConfirmBorrarRubro(null); }
  };

  const agregarProducto = async () => {
    if (!nuevoProducto.trim() || !rubroSel) return;
    if (productos.find(p => p.nombre.toLowerCase() === nuevoProducto.toLowerCase())) {
      setError(`"${nuevoProducto}" ya existe`); return;
    }
    await db.crearProducto(nuevoProducto.trim(), rubroSel.id);
    setNuevoProducto(''); setError('');
    await recargarProductos(rubroSel.id);
  };

  const guardarEdicionProducto = async (id) => {
    if (!editNombreProd.trim()) return;
    await db.editarProducto(id, editNombreProd.trim());
    setEditandoProd(null);
    await recargarProductos(rubroSel.id);
  };

  const eliminarProducto = async (id) => {
    if (confirmBorrarProd !== id) { setConfirmBorrarProd(id); return; }
    await db.borrarProducto(id);
    setConfirmBorrarProd(null);
    await recargarProductos(rubroSel.id);
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={onVolver}>← Volver</button>
        <h1 style={s.headerTitle}>⚙️ Rubros y productos</h1>
        <div style={{ width: 60 }} />
      </header>
      <div style={s.content}>

        {mostrarForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>{editandoRubro ? '✏️ Editar rubro' : '➕ Nuevo rubro'}</h3>
            <label style={s.label}>Nombre</label>
            <input style={s.input} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pescadería" autoFocus />
            <label style={s.label}>Ícono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ICONOS.map(ic => (
                <button key={ic} style={{ width: '40px', height: '40px', borderRadius: '10px', border: `2px solid ${form.icono === ic ? '#1e40af' : '#e2e8f0'}`, background: form.icono === ic ? '#eff6ff' : 'white', fontSize: '20px', cursor: 'pointer' }}
                  onClick={() => setForm({ ...form, icono: ic })}>{ic}</button>
              ))}
            </div>
            <label style={s.label}>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {COLORES.map(col => (
                <button key={col} style={{ width: '28px', height: '28px', borderRadius: '50%', background: col, border: form.color === col ? '3px solid #1e293b' : '3px solid transparent', cursor: 'pointer', transform: form.color === col ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s' }}
                  onClick={() => setForm({ ...form, color: col })} />
              ))}
            </div>
            {error && <div style={s.error}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button style={s.cancelBtn} onClick={cerrarForm}>Cancelar</button>
              <button style={s.saveBtn} onClick={guardarRubro}>✅ Guardar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ ...s.sectionTitle, margin: 0 }}>Rubros</h3>
          <button style={s.addSmallBtn} onClick={abrirNuevo}>+ Nuevo</button>
        </div>

        {rubros.map(r => (
          <div key={r.id} style={{ ...s.rubroManageRow, ...(rubroSel?.id === r.id ? { border: `2px solid ${r.color}` } : {}) }}>
            <button style={s.rubroManageBtn} onClick={() => setRubroSel(rubroSel?.id === r.id ? null : r)}>
              <span style={{ ...s.rubroManageIcon, background: r.color + '22', color: r.color }}>{r.icono}</span>
              <span style={s.rubroManageNombre}>{r.nombre}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{rubroSel?.id === r.id ? '▲' : '▼'}</span>
            </button>
            <button style={s.editBtn} onClick={() => abrirEditar(r)}>✏️</button>
            <button style={{ ...s.deleteBtn, ...(confirmBorrarRubro === r.id ? s.deleteBtnConfirm : {}) }}
              onClick={() => eliminarRubro(r.id)}>
              {confirmBorrarRubro === r.id ? '¿?' : '🗑️'}
            </button>
            {confirmBorrarRubro === r.id && <button style={s.cancelSmallBtn} onClick={() => setConfirmBorrarRubro(null)}>✕</button>}

            {rubroSel?.id === r.id && (
              <div style={s.productosExpand}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input style={{ ...s.input, flex: 1, margin: 0 }} placeholder="Nuevo producto..."
                    value={nuevoProducto} onChange={e => { setNuevoProducto(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && agregarProducto()} />
                  <button style={s.addProductoBtn} onClick={agregarProducto}>+ Add</button>
                </div>
                {error && <div style={s.error}>{error}</div>}
                {productos.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
                    {editandoProd === p.id ? (<>
                      <input style={{ ...s.input, flex: 1, margin: 0, fontSize: '13px' }} value={editNombreProd}
                        onChange={e => setEditNombreProd(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && guardarEdicionProducto(p.id)} autoFocus />
                      <button style={s.saveSmallBtn} onClick={() => guardarEdicionProducto(p.id)}>✅</button>
                      <button style={s.cancelSmallBtn} onClick={() => setEditandoProd(null)}>✕</button>
                    </>) : (<>
                      <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#334155' }}>{p.nombre}</span>
                      <button style={s.itemEditBtn} onClick={() => { setEditandoProd(p.id); setEditNombreProd(p.nombre); }}>✏️</button>
                      <button style={{ ...s.itemDeleteBtn, ...(confirmBorrarProd === p.id ? { background: '#dc2626', color: 'white' } : {}) }}
                        onClick={() => eliminarProducto(p.id)}>
                        {confirmBorrarProd === p.id ? '¿?' : '✕'}
                      </button>
                      {confirmBorrarProd === p.id && <button style={s.cancelSmallBtn} onClick={() => setConfirmBorrarProd(null)}>✕</button>}
                    </>)}
                  </div>
                ))}
                {productos.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>Sin productos. Agregá el primero arriba.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
function agruparPorRubro(items) {
  const map = {};
  items.forEach(item => {
    const rId = item.rubro_id || 'sin-rubro';
    const r   = item.rubros_compra;
    if (!map[rId]) map[rId] = { rubroId: rId, nombre: r?.nombre || 'Sin rubro', icono: r?.icono || '📌', color: r?.color || '#94a3b8', items: [] };
    map[rId].items.push(item);
  });
  return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  page:         { minHeight: '100vh', background: '#f1f5f9', paddingBottom: '40px', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  header:       { background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)', padding: '20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:      { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '14px' },
  headerTitle:  { margin: 0, fontSize: '18px', fontWeight: '800' },
  iconBtn:      { background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' },
  content:      { padding: '16px' },
  listaContent: { padding: '0 16px 16px' },
  loading:      { textAlign: 'center', padding: '40px', color: '#94a3b8' },
  activaCard:   { background: 'white', borderRadius: '20px', padding: '18px', marginBottom: '12px', border: '2px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  activaHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  activaNombre: { fontSize: '17px', fontWeight: '800', color: '#1e293b' },
  activaMeta:   { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  activaRubros: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' },
  activaRubroChip:   { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#f1f5f9', borderRadius: '20px', fontSize: '13px' },
  activaRubroNombre: { color: '#475569', fontWeight: '600' },
  activaRubroCount:  { background: '#e2e8f0', color: '#475569', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' },
  continuarBtn: { width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  sinListaCard: { background: 'white', borderRadius: '20px', padding: '40px 20px', textAlign: 'center', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  sinListaText: { fontSize: '18px', fontWeight: '700', color: '#334155', margin: '0 0 6px' },
  sinListaHint: { fontSize: '13px', color: '#94a3b8', margin: 0 },
  nuevaBtn:     { width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px' },
  nuevaForm:    { background: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  histRow:      { background: 'white', borderRadius: '14px', padding: '12px 14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  histNombre:   { fontSize: '15px', fontWeight: '700', color: '#1e293b' },
  histMeta:     { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  verHistBtn:   { padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' },
  verTodoHistBtn: { width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '4px' },
  sectionTitle: { fontSize: '15px', fontWeight: '700', color: '#475569', margin: '0 0 10px' },
  progressBar:  { background: 'white', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' },
  progressTop:  { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  progressLabel:{ fontSize: '13px', fontWeight: '700', color: '#475569' },
  progressPct:  { fontSize: '13px', fontWeight: '800', color: '#1e40af' },
  progressBg:   { height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: '99px', transition: 'width 0.4s ease' },
  agregarPanel: { background: 'white', borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginTop: '12px' },
  agregarHeader:{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' },
  agregarBody:  { padding: '0 16px 16px' },
  rubrosScroll: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' },
  rubroChip:    { padding: '7px 14px', borderRadius: '20px', border: '2px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', color: '#475569' },
  productoBtn:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  productoBtnEnLista: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#94a3b8', cursor: 'default' },
  nuevoProductoBtn: { width: '100%', padding: '11px', borderRadius: '10px', border: '2px dashed #93c5fd', background: '#eff6ff', color: '#1e40af', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' },
  limpiarBtn:   { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '10px' },
  rubroGroup:        { background: 'white', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  rubroGroupHeader:  { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: '800' },
  itemRow:      { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #f8fafc' },
  checkbox:     { width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  checkboxChecked: { background: '#10b981', border: '2px solid #10b981' },
  itemEditBtn:  { padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '13px' },
  itemDeleteBtn:{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: '12px', color: '#dc2626', fontWeight: '700' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' },
  modal:        { background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '360px', fontFamily: "'Nunito', 'Segoe UI', sans-serif" },
  finalizarBtn: { flex: 1, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  registrarGastoBtn: { width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  formCard:     { background: 'white', borderRadius: '20px', padding: '20px', marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  formTitle:    { margin: '0 0 14px', fontSize: '17px', fontWeight: '800', color: '#1e293b' },
  addSmallBtn:  { padding: '6px 14px', borderRadius: '10px', background: '#1e40af', color: 'white', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  rubroManageRow: { background: 'white', borderRadius: '14px', marginBottom: '8px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '2px solid transparent', display: 'flex', alignItems: 'center', flexWrap: 'wrap' },
  rubroManageBtn: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  rubroManageIcon: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 },
  rubroManageNombre: { fontSize: '15px', fontWeight: '700', color: '#1e293b', flex: 1, textAlign: 'left' },
  productosExpand: { width: '100%', padding: '12px 14px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' },
  addProductoBtn:  { padding: '10px 14px', background: '#1e40af', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', whiteSpace: 'nowrap' },
  label:        { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', margin: '12px 0 5px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input:        { width: '100%', padding: '11px 13px', borderRadius: '11px', border: '2px solid #e5e7eb', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  error:        { background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: '10px', fontSize: '13px', margin: '8px 0' },
  cancelBtn:    { flex: 0.4, padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  crearBtn:     { flex: 0.6, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn:      { flex: 0.6, padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  saveSmallBtn: { padding: '7px 12px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '700', fontSize: '13px' },
  cancelSmallBtn: { padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700' },
  deleteBtn:        { padding: '7px 10px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#dc2626' },
  deleteBtnConfirm: { background: '#dc2626', color: 'white', border: '1px solid #dc2626' },
  editBtn:          { padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '14px' },
};
