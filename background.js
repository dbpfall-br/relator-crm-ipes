// Relator AI — service worker
// Responsibilities:
//   • Open the side panel when the toolbar icon is clicked.
//   • Start/stop a capture session: get a tabCapture streamId, create the
//     offscreen document, forward the streamId, and relay transcript chunks
//     back to the side panel.
//   • Persist meeting metadata captured from content scripts.

const OFFSCREEN_PATH = 'offscreen.html';

// Per-tab session state. Kept in memory; the service worker may be killed, so
// `activeSession` is also mirrored in chrome.storage.session.
let activeSession = null;
let meetingMeta = {}; // tabId -> { platform, title, participants }

// CRITICAL: Chrome persists setPanelBehavior across sessions. A previous
// version set openPanelOnActionClick:true, which makes Chrome swallow the
// click and NOT fire action.onClicked. We must explicitly set it back to
// false so our handler runs. Done at top-level so it's applied every time
// the service worker starts.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((e) => console.warn('[background] setPanelBehavior:', e));

chrome.action.onClicked.addListener((tab) => {
  console.log('[background] action clicked on tab', tab.id, tab.url);
  // Open the side panel for this tab immediately (needs the click gesture).
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  // Toggle capture on the clicked tab. activeTab is granted by this click.
  handleToggleCapture(tab).catch((err) => {
    console.error('[background] toggle error:', err);
    chrome.runtime
      .sendMessage({
        type: 'transcript:error',
        error: String(err?.message ?? err),
      })
      .catch(() => {});
  });
});

async function handleToggleCapture(tab) {
  if (activeSession) {
    // Already running — a second icon click stops it.
    await stopCapture();
    return;
  }
  await startCaptureOnTab(tab);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case 'session:start': {
          // Starting from inside the side panel doesn't have an activeTab
          // grant — the Chrome tabCapture API requires a fresh click on the
          // extension's action icon to invoke it on the target tab. So we
          // refuse here and tell the user what to do.
          sendResponse({
            ok: false,
            error:
              'Para iniciar a gravação, clique no ícone do Relator AI na ' +
              'barra de ferramentas enquanto a aba da reunião está focada.',
          });
          break;
        }
        case 'session:stop': {
          await stopCapture();
          sendResponse({ ok: true });
          break;
        }
        case 'session:status': {
          sendResponse({ ok: true, session: activeSession });
          break;
        }
        case 'meeting_meta': {
          // From content scripts.
          if (sender.tab?.id != null) {
            meetingMeta[sender.tab.id] = { ...msg.data, tabId: sender.tab.id };
          }
          sendResponse({ ok: true });
          break;
        }
        case 'meeting_meta:get': {
          sendResponse({ ok: true, meta: meetingMeta[msg.tabId] ?? null });
          break;
        }
        // Forwarded from offscreen → sidepanel.
        case 'transcript:chunk':
        case 'transcript:status':
        case 'transcript:error': {
          chrome.runtime.sendMessage(msg).catch(() => {});
          sendResponse({ ok: true });
          break;
        }
        default:
          sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (err) {
      console.error('[background] message error:', err);
      sendResponse({ ok: false, error: String(err?.message ?? err) });
    }
  })();
  return true; // async
});

async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA'],
    justification:
      'Capturar áudio da aba da reunião e executar transcrição local com Whisper.',
  });
}

async function startCaptureOnTab(tab) {
  if (activeSession) {
    throw new Error('Já existe uma sessão de captura em andamento.');
  }
  if (!tab) throw new Error('Nenhuma aba fornecida.');

  // tabCapture only works on regular http(s) pages. Reject chrome://, about:,
  // chrome-extension://, file:// etc. up front with a clear message.
  if (!/^https?:\/\//i.test(tab.url || '')) {
    throw new Error(
      `Esta aba não pode ser capturada (${tab.url || 'URL desconhecida'}). ` +
        'Abra a reunião numa aba http(s) normal (Meet, Teams, Zoom ou um vídeo do YouTube para testar).'
    );
  }

  // The MV3 API returns a streamId that the offscreen document can pass to
  // getUserMedia with chromeMediaSource: 'tab'. activeTab is granted because
  // this function is called from chrome.action.onClicked.
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
      const err = chrome.runtime.lastError;
      if (err || !id) {
        const raw = err?.message || 'Não foi possível obter o streamId.';
        if (/invoked|activeTab/i.test(raw)) {
          reject(
            new Error(
              'Permissão activeTab não foi concedida para esta aba. ' +
                'Tente clicar no ícone do Relator AI na barra de ferramentas novamente ' +
                'com a aba da reunião focada.'
            )
          );
        } else {
          reject(new Error(raw));
        }
      } else {
        resolve(id);
      }
    });
  });

  await ensureOffscreen();

  const startedAt = Date.now();
  activeSession = {
    id: `sess_${startedAt}`,
    tabId: tab.id,
    tabUrl: tab.url,
    tabTitle: tab.title,
    startedAt,
  };
  await chrome.storage.session.set({ activeSession });

  // Tell the offscreen document to start capturing with this streamId.
  await chrome.runtime.sendMessage({
    type: 'offscreen:start',
    target: 'offscreen',
    streamId,
    sessionId: activeSession.id,
  });

  return activeSession;
}

async function stopCapture() {
  if (!activeSession) return;
  await chrome.runtime
    .sendMessage({ type: 'offscreen:stop', target: 'offscreen' })
    .catch(() => {});
  activeSession = null;
  await chrome.storage.session.remove('activeSession');
  // Keep the offscreen doc around so a subsequent start is instant. If you
  // want to free RAM, uncomment:
  // await chrome.offscreen.closeDocument().catch(() => {});
}

// If the tab being captured is closed, end the session.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  delete meetingMeta[tabId];
  if (activeSession?.tabId === tabId) await stopCapture();
});
