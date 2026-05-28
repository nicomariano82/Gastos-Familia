# 💰 Gastos Familia

App web progresiva para controlar gastos familiares en pareja, con carga manual, por foto y por audio.

---

## 🚀 Stack tecnológico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | React 18 | Rápido, flexible, fácil de mantener |
| Base de datos | Supabase (PostgreSQL) | Gratis, tiempo real, auth incluida |
| Autenticación | Supabase Auth | Segura, simple, JWT |
| IA Foto | OpenAI GPT-4o Vision | Mejor OCR para tickets |
| IA Audio | OpenAI Whisper + GPT-4o-mini | Transcripción + interpretación |
| Almacenamiento | Supabase Storage | Para imágenes de tickets |
| Hosting | Vercel / Netlify (gratis) | Deploy simple |

---

## 📋 Configuración paso a paso

### 1. Supabase (base de datos)

1. Ir a [supabase.com](https://supabase.com) → **New Project**
2. Elegí nombre del proyecto, contraseña, región: **South America (São Paulo)**
3. Esperá ~2 minutos mientras crea el proyecto
4. Ir a **SQL Editor** → pegar y ejecutar todo el contenido de `supabase-schema.sql`
5. Ir a **Project Settings → API**:
   - Copiá **Project URL** → va en `REACT_APP_SUPABASE_URL`
   - Copiá **anon public key** → va en `REACT_APP_SUPABASE_ANON_KEY`

### 2. Variables de entorno

```bash
cp .env.example .env
```

Completar `.env` con tus credenciales:
```
REACT_APP_SUPABASE_URL=https://abcdefgh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
REACT_APP_OPENAI_API_KEY=sk-proj-...
```

### 3. Instalar y correr

```bash
npm install
npm start
```

Abre en: http://localhost:3000

---

## 👥 Cómo usarla en dos teléfonos

1. **Cada persona** crea su propia cuenta con email y contraseña en la pantalla de registro
2. Los gastos de ambos se ven en tiempo real (Supabase sincroniza automáticamente)
3. Cada gasto muestra quién lo cargó

---

## 📱 Instalar como app en el celular (PWA)

### Android (Chrome):
1. Abrí la URL de la app en Chrome
2. Tocá el menú (3 puntos) → "Agregar a pantalla de inicio"

### iPhone (Safari):
1. Abrí la URL en Safari
2. Tocá el botón compartir → "Agregar a pantalla de inicio"

---

## 🌐 Deploy en producción (gratis)

### Opción A: Vercel (recomendada)
```bash
npm install -g vercel
vercel
```
Configurá las variables de entorno en el panel de Vercel.

### Opción B: Netlify
```bash
npm run build
# Subir la carpeta build/ a netlify.com/drop
```

---

## 📊 Funciones incluidas en v1.0

- ✅ Registro e inicio de sesión por email
- ✅ Carga manual de gastos
- ✅ Carga por foto con análisis de IA (GPT-4o Vision)
- ✅ Carga por audio con transcripción (Whisper + GPT-4o)
- ✅ 15 categorías precargadas
- ✅ Agregar nuevas categorías personalizadas
- ✅ Ver gastos de ambos usuarios
- ✅ Resumen mensual con totales y porcentajes
- ✅ Desglose por categoría con barras visuales
- ✅ Selector de mes histórico
- ✅ Editar gastos propios
- ✅ Eliminar gastos propios (con confirmación)
- ✅ Exportar CSV con datos del mes
- ✅ Totales por usuario

## 🗓️ Segunda etapa (próximas versiones)

- 📈 Gráfico de evolución mensual (recharts ya incluido)
- 🔔 Notificaciones de presupuesto mensual
- 💳 Registro de pagos/deudas entre usuarios
- 📸 Historial de imágenes de tickets
- 🔄 Importar gastos desde CSV
- 🎯 Metas de ahorro por categoría
- 📊 Dashboard comparativo entre meses
- 🌙 Modo oscuro

---

## 🗄️ Estructura de la base de datos

```
profiles          → Datos de cada usuario (nombre, color)
categorias        → Categorías de gastos (precargadas + personalizadas)
gastos            → Todos los gastos registrados
  ├── concepto    → Descripción del gasto
  ├── importe     → Monto en pesos
  ├── fecha       → Fecha del gasto
  ├── comentario  → Nota opcional
  ├── categoria_id → Referencia a categorias
  ├── usuario_id  → Quién lo cargó
  ├── metodo_carga → manual | foto | audio
  └── imagen_url  → URL del ticket (opcional)
```

---

## 💡 Costos estimados

| Servicio | Plan | Costo |
|---------|------|-------|
| Supabase | Free | $0/mes (500MB DB, 1GB storage) |
| Vercel/Netlify | Free | $0/mes |
| OpenAI | Pay per use | ~$0.01-0.05 por análisis de foto |
| OpenAI Whisper | Pay per use | ~$0.006/minuto de audio |

**Estimado real:** Con uso familiar normal (30-60 gastos/mes), el costo de OpenAI sería **menos de $2 USD/mes**.

---

## 🆘 Solución de problemas comunes

**"Error de conexión a Supabase"**
→ Verificá que las variables en `.env` estén correctas y sin espacios extra.

**"No se puede acceder al micrófono"**
→ La grabación de audio requiere HTTPS en producción. En localhost funciona por defecto.

**"La IA no lee bien el ticket"**
→ Asegurate de que la foto tenga buena iluminación y el texto sea legible. Podés corregir manualmente.

**"No se sincronizan los gastos en tiempo real"**
→ Recargá la página. La sincronización automática en tiempo real puede agregarse en v2 con `supabase.channel()`.
