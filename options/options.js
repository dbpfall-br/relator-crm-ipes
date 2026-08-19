import { getSettings, setSettings } from '../lib/storage.js';

const FIELDS = ['apiKey', 'geminiModel', 'whisperModel', 'language'];

(async function init() {
  const s = await getSettings();
  for (const k of FIELDS) {
    const el = document.getElementById(k);
    if (el) el.value = s[k] ?? '';
  }
  document.getElementById('saveBtn').addEventListener('click', save);
})();

async function save() {
  const patch = {};
  for (const k of FIELDS) {
    const el = document.getElementById(k);
    if (el) patch[k] = el.value.trim();
  }
  await setSettings(patch);
  const el = document.getElementById('saved');
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 1500);
}
