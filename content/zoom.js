// Best-effort DOM scrape for Zoom web client.
(function () {
  const PLATFORM = 'Zoom';
  let lastSent = null;

  function snapshot() {
    try {
      const tituloReuniao =
        document.querySelector('.meeting-info-container .meeting-info__title')?.textContent?.trim() ||
        document.title.replace(/\s*-\s*Zoom.*$/, '').trim();

      const participantes = Array.from(
        document.querySelectorAll('.participants-li .participants-item__display-name')
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
