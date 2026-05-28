import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export function useGastos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Obtener gastos de un mes ────────────────────────────────────────────
  const getGastosMes = useCallback(async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      const desde = `${year}-${String(month).padStart(2, '0')}-01`;
      const hasta = new Date(year, month, 0); // último día del mes
      const hastaStr = format(hasta, 'yyyy-MM-dd');

      const { data, error: err } = await supabase
        .from('gastos')
        .select(`
          *,
          categorias (id, nombre, icono, color),
          profiles (id, nombre, avatar_color)
        `)
        .gte('fecha', desde)
        .lte('fecha', hastaStr)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data || [];
    } catch (e) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Crear gasto ─────────────────────────────────────────────────────────
  const crearGasto = useCallback(async (gastoData, userId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('gastos')
        .insert({
          concepto: gastoData.concepto,
          importe: parseFloat(gastoData.importe),
          fecha: gastoData.fecha || format(new Date(), 'yyyy-MM-dd'),
          comentario: gastoData.comentario || null,
          categoria_id: gastoData.categoria_id || null,
          usuario_id: userId,
          metodo_carga: gastoData.metodo_carga || 'manual',
          imagen_url: gastoData.imagen_url || null,
        })
        .select(`
          *,
          categorias (id, nombre, icono, color),
          profiles (id, nombre, avatar_color)
        `)
        .single();

      if (err) throw err;
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Actualizar gasto ────────────────────────────────────────────────────
  const actualizarGasto = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          categorias (id, nombre, icono, color),
          profiles (id, nombre, avatar_color)
        `)
        .single();

      if (err) throw err;
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Borrar gasto ────────────────────────────────────────────────────────
  const borrarGasto = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (err) throw err;
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Obtener categorías ──────────────────────────────────────────────────
  const getCategorias = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (err) throw err;
    return data || [];
  }, []);

  // ── Crear categoría ─────────────────────────────────────────────────────
  const crearCategoria = useCallback(async (nombre, icono, color, userId) => {
    const { data, error: err } = await supabase
      .from('categorias')
      .insert({ nombre, icono: icono || '📌', color: color || '#94a3b8', es_personalizada: true, created_by: userId })
      .select()
      .single();

    if (err) throw err;
    return data;
  }, []);

  // ── Exportar gastos a CSV ───────────────────────────────────────────────
  const exportarCSV = useCallback((gastos, nombreMes) => {
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Importe', 'Usuario', 'Comentario', 'Método'];
    const rows = gastos.map(g => [
      g.fecha,
      g.concepto,
      g.categorias?.nombre || '',
      g.importe,
      g.profiles?.nombre || '',
      g.comentario || '',
      g.metodo_carga,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gastos-${nombreMes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Subir imagen a Supabase Storage ────────────────────────────────────
  const subirImagen = useCallback(async (file, userId) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: err } = await supabase.storage
      .from('tickets')
      .upload(path, file);

    if (err) throw err;

    const { data } = supabase.storage.from('tickets').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  return {
    loading, error,
    getGastosMes, crearGasto, actualizarGasto, borrarGasto,
    getCategorias, crearCategoria, exportarCSV, subirImagen,
  };
}
