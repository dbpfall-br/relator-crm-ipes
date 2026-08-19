// Relator AI — side panel controller
import { callGemini } from '../lib/gemini.js';
import { ataFormal, resumoExecutivo, actionItems } from '../lib/prompts.js';
import { getSettings, saveSession } from '../lib/storage.js';

const $ = (id) => document.getElementById(id);

const els = {
  status: $('status'),
  meta: $('meta'),
  startHint: $('startHint'),
  stopBtn: $('stopBtn'),
  settingsBtn: $('settingsBtn'),
  transcript: $('transcript'),
  genAta: $('genAta'),
  ataOut: $('ataOut'),
  copyAta: $('copyAta'),
  dlAta: $('dlAta'),
  genResumo: $('genResumo'),
  resumoOut: $('resumoOut'),
  copyResumo: $('copyResumo'),
  dlResumo: $('dlResumo'),
  genActions: $('genActions'),
  actionsOut: $('actionsOut'),
  copyActions: $('copyActions'),
  dlTranscript: $('dlTranscript'),
  clearBtn: $('clearBtn'),
};

// Session state held in memory in the side panel.
const state = {
  sessionId: null,
  startedAt: null,
  chunks: [], // { text, startSec, endSec }
  meta: null, // from content script
  ata: '',
  resumo: '',
  actions: [],
};

init().catch((err) => setStatus('erro: ' + err.message, 'err'));

async function init() {
  bindUI();

  // If a session is already active (e.g., side panel was reopened), resume.
  const res = await chrome.runtime.sendMessage({ type: 'session:status' });
  if (res?.session) {
    state.sessionId = res.session.id;
    state.startedAt = res.session.startedAt;
    setRunning(true);
    setStatus('gravando (sessão em andamento)', 'on');
  } else {
    setRunning(false);
  }

  // Listen for transcript events from offscreen (via background).
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'transcript:chunk') {
      // If we missed the session:status event (e.g. side panel opened after
      // start), pick up the sessionId from the first chunk.
      if (!state.sessionId) state.sessionId = msg.sessionId;
      if (msg.sessionId === state.sessionId) addChunk(msg);
    } else if (msg?.type === 'transcript:status') {
      if (msg.sessionId && !state.sessionId) {
        state.sessionId = msg.sessionId;
        state.startedAt = Date.now();
      }
      if (msg.status === 'capturing') {
        setRunning(true);
        setStatus('gravando', 'on');
        refreshMeta();
      } else if (msg.status === 'ready') {
        setRunning(true);
        setStatus('modelo carregado, gravando', 'on');
      } else if (msg.status === 'loading-model') {
        const pct = msg.progress != null ? ` (${Math.round(msg.progress)}%)` : '';
        setStatus('baixando modelo' + pct);
      } else if (msg.status === 'stopped') {
        setRunning(false);
        setStatus('parado');
      }
    } else if (msg?.type === 'transcript:error') {
      setStatus('erro: ' + msg.error, 'err');
    }
  });
}

async function refreshMeta() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const metaRes = await chrome.runtime
      .sendMessage({ type: 'meeting_meta:get', tabId: tab.id })
      .catch(() => null);
    state.meta = metaRes?.meta ?? inferMetaFromTab(tab);
    renderMeta();
  } catch {}
}

function bindUI() {
  els.stopBtn.addEventListener('click', onStop);
  els.settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

  els.genAta.addEventListener('click', () => runGemini('ata'));
  els.genResumo.addEventListener('click', () => runGemini('resumo'));
  els.genActions.addEventListener('click', () => runGemini('actions'));

  els.copyAta.addEventListener('click', () => copyText(state.ata));
  els.copyResumo.addEventListener('click', () => copyText(state.resumo));
  els.copyActions.addEventListener('click', () =>
    copyText(JSON.stringify(state.actions, null, 2))
  );

  els.dlAta.addEventListener('click', () =>
    download(fileName('ata', 'md'), state.ata || '# Ata vazia')
  );
  els.dlResumo.addEventListener('click', () =>
    download(fileName('resumo', 'md'), state.resumo || '# Resumo vazio')
  );
  els.dlTranscript.addEventListener('click', () =>
    download(fileName('transcricao', 'txt'), plainTranscript())
  );

  els.clearBtn.addEventListener('click', () => {
    if (!confirm('Limpar transcrição, ata, resumo e action items desta sessão?')) return;
    state.chunks = [];
    state.ata = state.resumo = '';
    state.actions = [];
    render();
  });

  // Tabs.
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`panel-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function onStop() {
  setStatus('parando...');
  const res = await chrome.runtime.sendMessage({ type: 'session:stop' });
  setRunning(false);
  if (!res?.ok) setStatus('erro ao parar: ' + res?.error, 'err');
  else setStatus('parado');
  // Persist the session for later.
  if (state.sessionId) {
    await saveSession({
      id: state.sessionId,
      startedAt: state.startedAt,
      endedAt: Date.now(),
      meta: state.meta,
      chunks: state.chunks,
      ata: state.ata,
      resumo: state.resumo,
      actions: state.actions,
    });
  }
}

function setRunning(on) {
  els.stopBtn.disabled = !on;
  els.startHint.classList.toggle('hidden', on);
}

function setStatus(text, cls = '') {
  els.status.textContent = text;
  els.status.className = 'status ' + cls;
}

function addChunk(msg) {
  state.chunks.push({ text: msg.text, startSec: msg.startSec, endSec: msg.endSec });
  renderTranscript();
}

function renderTranscript() {
  els.transcript.innerHTML = state.chunks
    .map(
      (c) =>
        `<div class="line"><span class="ts">[${fmtTime(c.startSec)}]</span>${escapeHtml(c.text)}</div>`
    )
    .join('');
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function render() {
  renderTranscript();
  renderMeta();
  els.ataOut.innerHTML = state.ata ? renderMarkdown(state.ata) : '';
  els.resumoOut.innerHTML = state.resumo ? renderMarkdown(state.resumo) : '';
  renderActions();
}

function renderMeta() {
  if (!state.meta) { els.meta.textContent = ''; return; }
  const bits = [];
  if (state.meta.plataforma) bits.push(state.meta.plataforma);
  if (state.meta.tituloReuniao) bits.push(state.meta.tituloReuniao);
  if (state.meta.participantes?.length)
    bits.push(`${state.meta.participantes.length} participantes`);
  els.meta.textContent = bits.join(' · ');
}

function renderActions() {
  if (!state.actions?.length) { els.actionsOut.innerHTML = ''; return; }
  const rows = state.actions
    .map(
      (a) =>
        `<tr>
          <td>${escapeHtml(a.tarefa ?? '')}</td>
          <td>${escapeHtml(a.responsavel ?? '—')}</td>
          <td>${escapeHtml(a.prazo ?? '—')}</td>
          <td class="conf-${escapeHtml(a.confianca ?? '')}">${escapeHtml(a.confianca ?? '')}</td>
        </tr>`
    )
    .join('');
  els.actionsOut.innerHTML = `<table class="action-table">
    <thead><tr><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th>Confiança</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function runGemini(kind) {
  const transcript = plainTranscript();
  if (!transcript.trim()) {
    alert('Transcrição vazia. Grave alguma coisa primeiro.');
    return;
  }
  const { apiKey, geminiModel } = await getSettings();
  if (!apiKey) {
    alert('Configure a API key do Gemini em ⚙ Configurações primeiro.');
    chrome.runtime.openOptionsPage();
    return;
  }

  const metaForPrompt = state.meta
    ? {
        plataforma: state.meta.plataforma,
        tituloReuniao: state.meta.tituloReuniao,
        participantes: state.meta.participantes,
        dataHora: new Date(state.startedAt || Date.now()).toLocaleString('pt-BR'),
      }
    : { dataHora: new Date(state.startedAt || Date.now()).toLocaleString('pt-BR') };

  const targetEl = { ata: els.ataOut, resumo: els.resumoOut, actions: els.actionsOut }[kind];
  targetEl.innerHTML = '<div class="loading">Chamando Gemini...</div>';

  try {
    if (kind === 'ata') {
      state.ata = await callGemini({
        apiKey,
        model: geminiModel,
        prompt: ataFormal(transcript, metaForPrompt),
      });
      els.ataOut.innerHTML = renderMarkdown(state.ata);
    } else if (kind === 'resumo') {
      state.resumo = await callGemini({
        apiKey,
        model: geminiModel,
        prompt: resumoExecutivo(transcript, metaForPrompt),
      });
      els.resumoOut.innerHTML = renderMarkdown(state.resumo);
    } else if (kind === 'actions') {
      const raw = await callGemini({
        apiKey,
        model: geminiModel,
        prompt: actionItems(transcript, metaForPrompt),
        json: true,
      });
      try {
        state.actions = JSON.parse(raw);
      } catch {
        state.actions = [];
        throw new Error('Gemini retornou JSON inválido:\n' + raw);
      }
      renderActions();
    }
  } catch (err) {
    targetEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
  }
}

function plainTranscript() {
  return state.chunks.map((c) => `[${fmtTime(c.startSec)}] ${c.text}`).join('\n');
}

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// Very small Markdown renderer: we only need headings, bold, italic, bullets,
// numbered lists, and tables. Good enough for Gemini output.
function renderMarkdown(md) {
  let html = escapeHtml(md);
  // Tables (very simple: lines starting with |)
  html = html.replace(/((?:^\|.*\|\s*\n?)+)/gm, (block) => {
    const rows = block.trim().split('\n').map((r) =>
      r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    );
    if (rows.length < 2) return block;
    // Drop the alignment row (---).
    const body = rows.filter((r) => !r.every((c) => /^:?-{3,}:?$/.test(c)));
    const [head, ...rest] = body;
    return (
      '<table>' +
      '<thead><tr>' + head.map((c) => `<th>${c}</th>`).join('') + '</tr></thead>' +
      '<tbody>' + rest.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody>' +
      '</table>'
    );
  });
  html = html
    .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  return `<div class="markdown">${html}</div>`;
}

function inferMetaFromTab(tab) {
  const url = tab.url || '';
  let plataforma = null;
  if (url.includes('meet.google.com')) plataforma = 'Google Meet';
  else if (url.includes('teams.microsoft.com')) plataforma = 'Microsoft Teams';
  else if (url.includes('zoom.us')) plataforma = 'Zoom';
  return { plataforma, tituloReuniao: tab.title, participantes: [] };
}

async function copyText(text) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus('copiado', 'on');
  setTimeout(() => setStatus(''), 1200);
}

function download(name, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function fileName(kind, ext) {
  const d = new Date(state.startedAt || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `relator-${kind}-${stamp}.${ext}`;
}
