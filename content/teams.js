// Best-effort DOM scrape for Microsoft Teams web.
(function () {
  const PLATFORM = 'Microsoft Teams';
  let lastSent = null;

  function snapshot() {
    try {
      const tituloReuniao =
        document.querySelector('[data-tid="meeting-title"]')?.textContent?.trim() ||
        document.querySelector('h1[role="heading"]')?.textContent?.trim() ||
        document.title.replace(/\s*\|\s*Microsoft Teams.*$/, '').trim();

      const participantes = Array.from(
        document.querySelectorAll('[data-tid="roster-list"] [data-tid="roster-participant-name"]')
      )
        .map((n) => n.textContent?.trim())
        .filter(Boolean);

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

  setTimeout(maybeSend, 1500);
  setInterval(maybeSend, 5000);
})();
