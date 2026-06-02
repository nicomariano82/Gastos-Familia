import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

export function useIngresos() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const getIngresosMes = useCallback(async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      const desde   = `${year}-${String(month).padStart(2, '0')}-01`;
      const hasta   = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const { data, error: err } = await supabase
        .from('ingresos')
        .select('*, profiles(id, nombre, avatar_color)')
        .gte('fecha', desde)
        .lte('fecha', hasta)
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

  const crearIngreso = useCallback(async (datos, userId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('ingresos')
        .insert({
          concepto:      datos.concepto || null,
          monto_dolares: parseFloat(datos.monto_dolares),
          tipo_cambio:   parseFloat(datos.tipo_cambio),
          medio_pago:    datos.medio_pago || 'digital',
          fecha:         datos.fecha || format(new Date(), 'yyyy-MM-dd'),
          usuario_id:    userId,
        })
        .select('*, profiles(id, nombre, avatar_color)')
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

  const actualizarIngreso = useCallback(async (id, datos) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('ingresos')
        .update({
          concepto:      datos.concepto || null,
          monto_dolares: parseFloat(datos.monto_dolares),
          tipo_cambio:   parseFloat(datos.tipo_cambio),
          medio_pago:    datos.medio_pago,
          fecha:         datos.fecha,
        })
        .eq('id', id)
        .select('*, profiles(id, nombre, avatar_color)')
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

  const borrarIngreso = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('ingresos').delete().eq('id', id);
      if (err) throw err;
      return true;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportarCSV = useCallback((ingresos, nombreMes) => {
    const headers = ['Fecha', 'Concepto', 'USD', 'Tipo de Cambio', 'Pesos', 'Medio', 'Usuario'];
    const rows = ingresos.map(i => [
      i.fecha,
      i.concepto || '',
      i.monto_dolares,
      i.tipo_cambio,
      i.monto_pesos,
      i.medio_pago === 'digital' ? 'Digital' : 'Efectivo',
      i.profiles?.nombre || '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `ingresos-${nombreMes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { loading, error, getIngresosMes, crearIngreso, actualizarIngreso, borrarIngreso, exportarCSV };
}
