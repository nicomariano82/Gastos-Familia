import React from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function SelectorMes({ mes, onChange }) {
  const fecha = new Date(mes.year, mes.month - 1, 1);
  const hoy = new Date();
  const esFuturo = fecha >= new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);

  const anterior = () => {
    const prev = subMonths(fecha, 1);
    onChange({ year: prev.getFullYear(), month: prev.getMonth() + 1 });
  };

  const siguiente = () => {
    if (esFuturo) return;
    const next = addMonths(fecha, 1);
    onChange({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  const label = format(fecha, "MMMM yyyy", { locale: es });

  return (
    <div style={styles.row}>
      <button style={styles.arrow} onClick={anterior}>‹</button>
      <span style={styles.label}>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
      <button style={{ ...styles.arrow, opacity: esFuturo ? 0.3 : 1 }} onClick={siguiente} disabled={esFuturo}>›</button>
    </div>
  );
}

const styles = {
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
    padding: '14px 20px', color: 'white',
  },
  arrow: {
    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
    width: '32px', height: '32px', borderRadius: '50%',
    fontSize: '22px', cursor: 'pointer', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: '16px', fontWeight: '700', minWidth: '150px', textAlign: 'center' },
};
