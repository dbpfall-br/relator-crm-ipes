// Relator AI — Whisper worker
// Loads Transformers.js (Xenova) and runs a speech-to-text pipeline. Model
// weights are downloaded on first use and cached in IndexedDB by the library.

// Use the bundled build of @xenova/transformers produced by build.mjs.
import { pipeline, env } from '../vendor/transformers.min.js';

// Let Transformers.js download remote models and keep them cached; disable
// local-only mode (no local models shipped with the extension).
env.allowLocalModels = false;
env.allowRemoteModels = true;
// Use WASM backend (CPU). Good enough for whisper-tiny/base on most laptops.
env.backends.onnx.wasm.numThreads = 1;

let transcriber = null;
let currentLanguage = 'portuguese';
let shuttingDown = false;
const queue = [];
let processing = false;

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      currentLanguage = msg.language || 'portuguese';
      const modelId = msg.model || 'Xenova/whisper-base';
      transcriber = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: (p) => {
          if (p?.status === 'progress' && typeof p.progress === 'number') {
            self.postMessage({ type: 'progress', progress: p.progress });
          }
        },
      });
      self.postMessage({ type: 'ready' });
    } else if (msg.type === 'transcribe') {
      queue.push(msg);
      drain();
    } else if (msg.type === 'shutdown') {
      shuttingDown = true;
      queue.length = 0;
    }
  } catch (err) {
    self.postMessage({ type: 'error', error: String(err?.message ?? err) });
  }
};

async function drain() {
  if (processing || shuttingDown) return;
  processing = true;
  while (queue.length && !shuttingDown) {
    const job = queue.shift();
    try {
      if (!transcriber) throw new Error('Transcriber não inicializado.');
      const result = await transcriber(job.audio, {
        language: currentLanguage,
        task: 'transcribe',
        // Faster inference on long streams: limit to 30s and disable
        // timestamps (we already know the window timing).
        chunk_length_s: 30,
        stride_length_s: 0,
        return_timestamps: false,
      });
      const text = (result?.text || '').trim();
      if (text) {
        self.postMessage({
          type: 'chunk',
          text,
          startSec: job.startSec,
          endSec: job.endSec,
        });
      }
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err?.message ?? err) });
    }
  }
  processing = false;
}
