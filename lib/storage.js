// Thin wrapper around chrome.storage.local for settings and sessions history.

const DEFAULTS = {
  apiKey: '',
  geminiModel: 'gemini-2.5-flash',
  whisperModel: 'Xenova/whisper-base',
  language: 'portuguese',
};

export async function getSettings() {
  const v = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...v };
}

export async function setSettings(partial) {
  await chrome.storage.local.set(partial);
}

export async function getSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  return sessions;
}

export async function saveSession(session) {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  // Keep the last 50 sessions to avoid bloating storage.
  await chrome.storage.local.set({ sessions: sessions.slice(0, 50) });
}

export async function deleteSession(id) {
  const sessions = (await getSessions()).filter((s) => s.id !== id);
  await chrome.storage.local.set({ sessions });
}
