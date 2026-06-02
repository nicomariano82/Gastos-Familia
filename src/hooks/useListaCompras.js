import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useListaCompras() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── RUBROS ──────────────────────────────────────────────────────────────
  const getRubros = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('rubros_compra').select('*').order('nombre');
    if (err) throw err;
    return data || [];
  }, []);

  const crearRubro = useCallback(async (nombre, icono, color) => {
    const { data, error: err } = await supabase
      .from('rubros_compra').insert({ nombre, icono: icono || '🛒', color: color || '#6366f1' })
      .select().single();
    if (err) throw err;
    return data;
  }, []);

  const editarRubro = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase
      .from('rubros_compra').update(updates).eq('id', id).select().single();
    if (err) throw err;
    return data;
  }, []);

  const borrarRubro = useCallback(async (id) => {
    const { error: err } = await supabase.from('rubros_compra').delete().eq('id', id);
    if (err) throw err;
  }, []);

  // ── PRODUCTOS ────────────────────────────────────────────────────────────
  const getProductos = useCallback(async (rubroId) => {
    const { data, error: err } = await supabase
      .from('productos_compra').select('*')
      .eq('rubro_id', rubroId).order('nombre');
    if (err) throw err;
    return data || [];
  }, []);

  const crearProducto = useCallback(async (nombre, rubroId) => {
    const { data, error: err } = await supabase
      .from('productos_compra').insert({ nombre, rubro_id: rubroId })
      .select().single();
    if (err) throw err;
    return data;
  }, []);

  const editarProducto = useCallback(async (id, nombre) => {
    const { data, error: err } = await supabase
      .from('productos_compra').update({ nombre }).eq('id', id).select().single();
    if (err) throw err;
    return data;
  }, []);

  const borrarProducto = useCallback(async (id) => {
    const { error: err } = await supabase.from('productos_compra').delete().eq('id', id);
    if (err) throw err;
  }, []);

  // ── LISTAS ───────────────────────────────────────────────────────────────
  const getListaActiva = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('listas_compra').select(`*, items_lista(*, rubros_compra(id,nombre,icono,color))`)
      .eq('estado', 'activa').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (err) throw err;
    return data;
  }, []);

  const getHistorial = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('listas_compra').select('*, items_lista(id, comprado)')
      .eq('estado', 'finalizada').order('finalizada_at', { ascending: false }).limit(20);
    if (err) throw err;
    return data || [];
  }, []);

  const crearLista = useCallback(async (nombre, userId) => {
    const { data, error: err } = await supabase
      .from('listas_compra').insert({ nombre, creado_por: userId, estado: 'activa' })
      .select().single();
    if (err) throw err;
    return data;
  }, []);

  const finalizarLista = useCallback(async (id) => {
    const { error: err } = await supabase.from('listas_compra')
      .update({ estado: 'finalizada', finalizada_at: new Date().toISOString() }).eq('id', id);
    if (err) throw err;
  }, []);

  const borrarLista = useCallback(async (id) => {
    const { error: err } = await supabase.from('listas_compra').delete().eq('id', id);
    if (err) throw err;
  }, []);

  const renombrarLista = useCallback(async (id, nombre) => {
    const { error: err } = await supabase.from('listas_compra').update({ nombre }).eq('id', id);
    if (err) throw err;
  }, []);

  // ── ITEMS ────────────────────────────────────────────────────────────────
  const agregarItem = useCallback(async (listaId, rubroId, nombre, cantidad) => {
    const { data, error: err } = await supabase
      .from('items_lista').insert({
        lista_id: listaId, rubro_id: rubroId,
        nombre_item: nombre, cantidad: cantidad || null, comprado: false,
      }).select('*, rubros_compra(id,nombre,icono,color)').single();
    if (err) throw err;
    return data;
  }, []);

  const toggleComprado = useCallback(async (itemId, comprado, userId) => {
    const { error: err } = await supabase.from('items_lista')
      .update({ comprado, comprado_por: comprado ? userId : null }).eq('id', itemId);
    if (err) throw err;
  }, []);

  const editarItem = useCallback(async (itemId, nombre, cantidad) => {
    const { error: err } = await supabase.from('items_lista')
      .update({ nombre_item: nombre, cantidad: cantidad || null }).eq('id', itemId);
    if (err) throw err;
  }, []);

  const borrarItem = useCallback(async (itemId) => {
    const { error: err } = await supabase.from('items_lista').delete().eq('id', itemId);
    if (err) throw err;
  }, []);

  const limpiarComprados = useCallback(async (listaId) => {
    const { error: err } = await supabase.from('items_lista')
      .delete().eq('lista_id', listaId).eq('comprado', true);
    if (err) throw err;
  }, []);

  return {
    loading, error,
    getRubros, crearRubro, editarRubro, borrarRubro,
    getProductos, crearProducto, editarProducto, borrarProducto,
    getListaActiva, getHistorial, crearLista, finalizarLista, borrarLista, renombrarLista,
    agregarItem, toggleComprado, editarItem, borrarItem, limpiarComprados,
  };
}
