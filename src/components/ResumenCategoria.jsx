import React from 'react';
import { formatARS } from '../pages/Dashboard';

export default function ResumenCategoria({ nombre, info, total }) {
  const pct = total > 0 ? (info.total / total) * 100 : 0;

  return (
    <div style={styles.card}>
      <div style={styles.row}>
        <div style={{ ...styles.icon, background: info.color + '22', color: info.color }}>
          {info.icono}
        </div>
        <div style={styles.info}>
          <div style={styles.nombre}>{nombre}</div>
          <div style={styles.bar}>
            <div style={{ ...styles.barFill, width: `${pct}%`, background: info.color }} />
          </div>
        </div>
        <div style={styles.right}>
          <div style={styles.importe}>${formatARS(info.total)}</div>
          <div style={styles.pct}>{pct.toFixed(0)}% · {info.count} gasto{info.count !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'white', borderRadius: '14px', padding: '12px 14px',
    marginBottom: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  row: { display: 'flex', alignItems: 'center', gap: '12px' },
  icon: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 },
  info: { flex: 1, minWidth: 0 },
  nombre: { fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' },
  bar: { height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '99px', transition: 'width 0.5s ease' },
  right: { textAlign: 'right', flexShrink: 0 },
  importe: { fontSize: '15px', fontWeight: '800', color: '#1e293b' },
  pct: { fontSize: '11px', color: '#94a3b8', marginTop: '2px' },
};
