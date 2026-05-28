import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [form, setForm] = useState({ email: '', password: '', nombre: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (modo === 'login') {
        await signIn(form.email, form.password);
      } else {
        if (!form.nombre.trim()) throw new Error('Ingresá tu nombre');
        await signUp(form.email, form.password, form.nombre.trim());
      }
      navigate('/');
    } catch (err) {
      setError(tradError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>💰</div>
        <h1 style={styles.title}>Gastos Familia</h1>
        <p style={styles.subtitle}>
          {modo === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta familiar'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {modo === 'registro' && (
            <div style={styles.field}>
              <label style={styles.label}>Tu nombre</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Ej: Juan, María..."
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="tucuenta@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contraseña</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? '⏳ Cargando...' : modo === 'login' ? '🚀 Ingresar' : '✨ Crear cuenta'}
          </button>
        </form>

        <button style={styles.switchBtn} onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); }}>
          {modo === 'login'
            ? '¿No tenés cuenta? Registrate'
            : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>

        {modo === 'registro' && (
          <p style={styles.hint}>
            💡 Cada persona de la familia debe crear su propia cuenta con un email distinto.
          </p>
        )}
      </div>
    </div>
  );
}

function tradError(msg) {
  if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos';
  if (msg.includes('already registered')) return 'Este email ya está registrado';
  if (msg.includes('Password should')) return 'La contraseña debe tener al menos 6 caracteres';
  if (msg.includes('valid email')) return 'Ingresá un email válido';
  return msg;
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    padding: '20px',
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  logo: { fontSize: '56px', marginBottom: '8px' },
  title: { fontSize: '28px', fontWeight: '800', color: '#1e1b4b', margin: '0 0 6px' },
  subtitle: { fontSize: '14px', color: '#6b7280', margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    textAlign: 'center',
  },
  btn: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '4px',
    fontFamily: 'inherit',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '20px',
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '12px 0 0',
    lineHeight: '1.5',
    background: '#f9fafb',
    padding: '10px 14px',
    borderRadius: '10px',
  },
};
