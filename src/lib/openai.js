// ============================================
// Helpers para OpenAI - Foto y Audio
// ============================================

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1';

// ── Analizar imagen de ticket/factura ──────────────────────────────────────
export async function analizarTicket(base64Image, mimeType = 'image/jpeg') {
  const prompt = `Analizá esta imagen de un ticket, factura o comprobante de compra.
Extraé la siguiente información y respondé SOLO con un JSON válido sin markdown:
{
  "concepto": "nombre del comercio o tipo de gasto",
  "importe": 1234.56,
  "fecha": "YYYY-MM-DD o null si no se ve",
  "confianza": "alta/media/baja"
}
Si no podés leer el importe con certeza, ponelo en null.
El importe debe ser un número, sin símbolos de moneda ni puntos de miles.`;

  const response = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'low',
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error al analizar imagen');
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content || '{}';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { concepto: null, importe: null, fecha: null, confianza: 'baja' };
  }
}

// ── Transcribir y parsear audio ────────────────────────────────────────────
export async function analizarAudio(audioBlob) {
  // 1. Transcribir con Whisper
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');

  const transcribeRes = await fetch(`${OPENAI_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!transcribeRes.ok) {
    const err = await transcribeRes.json();
    throw new Error(err.error?.message || 'Error al transcribir audio');
  }

  const { text: transcripcion } = await transcribeRes.json();

  // 2. Extraer datos con GPT
  const parseRes = await fetch(`${OPENAI_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `Sos un asistente que extrae información de gastos de texto en español argentino.
Respondé SOLO con JSON válido sin markdown:
{
  "concepto": "categoria o lugar del gasto",
  "importe": 1234.56,
  "comentario": "detalle extra si hay"
}
El importe es un número sin símbolo de moneda. Si mencionan "pesos", "peso" o "ps" es ARS.`,
        },
        {
          role: 'user',
          content: transcripcion,
        },
      ],
    }),
  });

  const parseData = await parseRes.json();
  const parseText = parseData.choices[0]?.message?.content || '{}';

  try {
    const clean = parseText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, transcripcion };
  } catch {
    return { concepto: null, importe: null, comentario: null, transcripcion };
  }
}

// ── Convertir File/Blob a base64 ───────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
