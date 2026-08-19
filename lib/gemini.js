// Minimal fetch wrapper for the Gemini generateContent REST API.
// Called directly from the side panel — the user's API key stays on device.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini({
  apiKey,
  model = 'gemini-2.5-flash',
  prompt,
  json = false,
  temperature = 0.3,
}) {
  if (!apiKey) throw new Error('API key do Gemini não configurada.');
  const url = `${BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      ...(json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${txt || res.statusText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('\n');
  if (!text) throw new Error('Resposta vazia do Gemini.');
  return text;
}
