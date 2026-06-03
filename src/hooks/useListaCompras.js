import { supabase } from '../lib/supabase';

// Funciones sueltas (no hook) — sin useCallback, sin dependencias, sin bucles
export const getRubros = async () => {
  const { data, error } = await supabase.from('rubros_compra').select('*').order('nombre');
  if (error) throw error;
  return data || [];
};

export const crearRubro = async (nombre, icono, color) => {
  const { data, error } = await supabase.from('rubros_compra')
    .insert({ nombre, icono: icono || '🛒', color: color || '#6366f1' }).select().single();
  if (error) throw error;
  return data;
};

export const editarRubro = async (id, updates) => {
  const { data, error } = await supabase.from('rubros_compra')
    .update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const borrarRubro = async (id) => {
  const { error } = await supabase.from('rubros_compra').delete().eq('id', id);
  if (error) throw error;
};

export const getProductos = async (rubroId) => {
  const { data, error } = await supabase.from('productos_compra')
    .select('*').eq('rubro_id', rubroId).order('nombre');
  if (error) throw error;
  return data || [];
};

export const crearProducto = async (nombre, rubroId) => {
  const { data, error } = await supabase.from('productos_compra')
    .insert({ nombre, rubro_id: rubroId }).select().single();
  if (error) throw error;
  return data;
};

export const editarProducto = async (id, nombre) => {
  const { data, error } = await supabase.from('productos_compra')
    .update({ nombre }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const borrarProducto = async (id) => {
  const { error } = await supabase.from('productos_compra').delete().eq('id', id);
  if (error) throw error;
};

export const getListaActiva = async () => {
  const { data, error } = await supabase.from('listas_compra')
    .select('*, items_lista(*, rubros_compra(id,nombre,icono,color))')
    .eq('estado', 'activa').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
};

export const getHistorial = async () => {
  const { data, error } = await supabase.from('listas_compra')
    .select('*, items_lista(id, comprado)')
    .eq('estado', 'finalizada').order('finalizada_at', { ascending: false }).limit(20);
  if (error) throw error;
  return data || [];
};

export const crearLista = async (nombre, userId) => {
  const { data, error } = await supabase.from('listas_compra')
    .insert({ nombre, creado_por: userId, estado: 'activa' }).select().single();
  if (error) throw error;
  return data;
};

export const finalizarLista = async (id) => {
  const { error } = await supabase.from('listas_compra')
    .update({ estado: 'finalizada', finalizada_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
};

export const borrarLista = async (id) => {
  const { error } = await supabase.from('listas_compra').delete().eq('id', id);
  if (error) throw error;
};

export const agregarItem = async (listaId, rubroId, nombre, cantidad) => {
  const { data, error } = await supabase.from('items_lista')
    .insert({ lista_id: listaId, rubro_id: rubroId, nombre_item: nombre, cantidad: cantidad || null, comprado: false })
    .select('*, rubros_compra(id,nombre,icono,color)').single();
  if (error) throw error;
  return data;
};

export const toggleComprado = async (itemId, comprado, userId) => {
  const { error } = await supabase.from('items_lista')
    .update({ comprado, comprado_por: comprado ? userId : null }).eq('id', itemId);
  if (error) throw error;
};

export const editarItem = async (itemId, nombre, cantidad) => {
  const { error } = await supabase.from('items_lista')
    .update({ nombre_item: nombre, cantidad: cantidad || null }).eq('id', itemId);
  if (error) throw error;
};

export const borrarItem = async (itemId) => {
  const { error } = await supabase.from('items_lista').delete().eq('id', itemId);
  if (error) throw error;
};

export const limpiarComprados = async (listaId) => {
  const { error } = await supabase.from('items_lista')
    .delete().eq('lista_id', listaId).eq('comprado', true);
  if (error) throw error;
};
