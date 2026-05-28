-- ============================================
-- ESQUEMA DE BASE DE DATOS - Gastos Familia
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  es_personalizada BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  importe DECIMAL(12, 2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  comentario TEXT,
  categoria_id UUID REFERENCES public.categorias(id),
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  metodo_carga TEXT CHECK (metodo_carga IN ('manual', 'foto', 'audio')) DEFAULT 'manual',
  imagen_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gastos_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver todos los perfiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden editar su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su perfil"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Políticas para categorias (todos los usuarios autenticados pueden ver y crear)
CREATE POLICY "Usuarios autenticados pueden ver categorías"
  ON public.categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear categorías"
  ON public.categorias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios pueden editar categorías que crearon"
  ON public.categorias FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Políticas para gastos (todos los usuarios autenticados ven todos los gastos)
CREATE POLICY "Usuarios autenticados ven todos los gastos"
  ON public.gastos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden crear sus propios gastos"
  ON public.gastos FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden editar sus propios gastos"
  ON public.gastos FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

CREATE POLICY "Usuarios pueden borrar sus propios gastos"
  ON public.gastos FOR DELETE TO authenticated USING (usuario_id = auth.uid());

-- ============================================
-- CATEGORÍAS PRECARGADAS
-- ============================================

INSERT INTO public.categorias (nombre, icono, color, es_personalizada) VALUES
  ('Supermercado',  '🛒', '#10b981', false),
  ('Verdulería',    '🥬', '#22c55e', false),
  ('Carnicería',    '🥩', '#ef4444', false),
  ('Pollería',      '🍗', '#f97316', false),
  ('Farmacia',      '💊', '#3b82f6', false),
  ('Combustible',   '⛽', '#f59e0b', false),
  ('Colegio',       '📚', '#8b5cf6', false),
  ('Servicios',     '🔌', '#06b6d4', false),
  ('Internet',      '📡', '#0ea5e9', false),
  ('Ropa',          '👕', '#ec4899', false),
  ('Restaurante',   '🍽️', '#f43f5e', false),
  ('Transporte',    '🚗', '#64748b', false),
  ('Salud',         '🏥', '#14b8a6', false),
  ('Entretenimiento','🎬', '#a855f7', false),
  ('Otros',         '📌', '#94a3b8', false);

-- ============================================
-- FUNCIÓN: Crear perfil automático al registrarse
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE: bucket para imágenes de tickets
-- ============================================
-- Ejecutar esto en el dashboard de Supabase > Storage:
-- 1. Crear bucket "tickets" con acceso privado
-- O ejecutar via API:

INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Usuarios autenticados pueden subir tickets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuarios autenticados pueden ver tickets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tickets');

CREATE POLICY "Usuarios pueden borrar sus tickets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tickets' AND auth.uid()::text = (storage.foldername(name))[1]);
