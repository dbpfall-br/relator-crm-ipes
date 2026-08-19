// Best-effort scraping of Google Meet DOM for meeting metadata.
// Selectors will drift; all reads are wrapped in try/catch and results are
// optional. If nothing is found, the side panel just falls back to tab.title.

(function () {
  const PLATFORM = 'Google Meet';
  let lastSent = null;

  function snapshot() {
    try {
      const tituloReuniao =
        document.querySelector('[data-meeting-title]')?.getAttribute('data-meeting-title') ||
        document.querySelector('[jscontroller] div[role="heading"]')?.textContent?.trim() ||
        document.title.replace(/\s*-\s*Google Meet.*$/, '').trim();

      // Participants are rendered as tiles inside the main grid.
      const participantes = Array.from(
        document.querySelectorAll('[data-participant-id] [data-self-name], [data-participant-id] [jsname]')
      )
        .map((n) => n.textContent?.trim())
        .filter((t) => t && t.length > 1 && t.length < 60);

      return {
        plataforma: PLATFORM,
        tituloReuniao,
        participantes: Array.from(new Set(participantes)),
      };
    } catch {
      return { plataforma: PLATFORM, tituloReuniao: document.title, participantes: [] };
    }
  }

  function maybeSend() {
    const data = snapshot();
    const sig = JSON.stringify(data);
    if (sig === lastSent) return;
    lastSent = sig;
    chrome.runtime.sendMessage({ type: 'meeting_meta', data }).catch(() => {});
  }

  // Poll every 5 s — cheap and avoids MutationObserver complexity.
  setTimeout(maybeSend, 1500);
  setInterval(maybeSend, 5000);
})();
