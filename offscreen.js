// Relator AI — offscreen document
// Holds the MediaStream from chrome.tabCapture (service workers can't), keeps
// the tab audible by re-routing to AudioContext.destination, and pushes PCM
// chunks into a dedicated Whisper worker.

let audioCtx = null;
let mediaStream = null;
let sourceNode = null;
let workletNode = null;
let whisperWorker = null;
let sessionId = null;

const SAMPLE_RATE = 16000; // Whisper wants 16 kHz mono
const WINDOW_SEC = 15;     // inference window
const OVERLAP_SEC = 2;     // overlap to avoid cutting words
const WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_SEC;
const HOP_SAMPLES = SAMPLE_RATE * (WINDOW_SEC - OVERLAP_SEC);

// Ring buffer of mono Float32 samples at 16 kHz.
let pcmBuffer = new Float32Array(0);
let windowStart = 0; // absolute sample index of pcmBuffer[0]
let nextInferenceAt = WINDOW_SAMPLES; // absolute index when to run next inference

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;
  (async () => {
    try {
      if (msg.type === 'offscreen:start') {
        await startCapture(msg.streamId, msg.sessionId);
        sendResponse({ ok: true });
      } else if (msg.type === 'offscreen:stop') {
        await stopCapture();
        sendResponse({ ok: true });
      }
    } catch (err) {
      console.error('[offscreen] error:', err);
      relay({ type: 'transcript:error', error: String(err?.message ?? err) });
      sendResponse({ ok: false, error: String(err?.message ?? err) });
    }
  })();
  return true;
});

async function startCapture(streamId, sid) {
  sessionId = sid;
  pcmBuffer = new Float32Array(0);
  windowStart = 0;
  nextInferenceAt = WINDOW_SAMPLES;

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  // Native sample rate from the tab (usually 48 kHz). We'll downsample in the
  // worklet to 16 kHz mono.
  audioCtx = new AudioContext();
  sourceNode = audioCtx.createMediaStreamSource(mediaStream);

  // Re-route to destination so the user keeps hearing the meeting.
  sourceNode.connect(audioCtx.destination);

  // Tap the stream with a worklet that posts Float32 chunks back.
  await audioCtx.audioWorklet.addModule('workers/capture-worklet.js');
  workletNode = new AudioWorkletNode(audioCtx, 'capture-processor', {
    processorOptions: { targetSampleRate: SAMPLE_RATE },
  });
  workletNode.port.onmessage = (e) => onPcmChunk(e.data);
  sourceNode.connect(workletNode);
  // Worklet has no output — don't connect to destination.

  // Spin up the Whisper worker.
  whisperWorker = new Worker('workers/whisper-worker.js', { type: 'module' });
  whisperWorker.onmessage = onWorkerMessage;
  whisperWorker.onerror = (e) =>
    relay({ type: 'transcript:error', error: String(e.message ?? e) });

  const { whisperModel, language } = await chrome.storage.local.get([
    'whisperModel',
    'language',
  ]);
  whisperWorker.postMessage({
    type: 'init',
    model: whisperModel || 'Xenova/whisper-base',
    language: language || 'portuguese',
  });

  relay({ type: 'transcript:status', status: 'capturing', sessionId });
}

async function stopCapture() {
  try {
    workletNode?.disconnect();
    sourceNode?.disconnect();
    mediaStream?.getTracks().forEach((t) => t.stop());
    await audioCtx?.close();
  } catch (e) {
    console.warn('[offscreen] cleanup warn:', e);
  }
  audioCtx = mediaStream = sourceNode = workletNode = null;

  if (whisperWorker) {
    whisperWorker.postMessage({ type: 'shutdown' });
    whisperWorker.terminate();
    whisperWorker = null;
  }
  relay({ type: 'transcript:status', status: 'stopped', sessionId });
  sessionId = null;
}

function onPcmChunk(float32) {
  // Append to ring buffer.
  const next = new Float32Array(pcmBuffer.length + float32.length);
  next.set(pcmBuffer, 0);
  next.set(float32, pcmBuffer.length);
  pcmBuffer = next;

  const absEnd = windowStart + pcmBuffer.length;
  while (absEnd >= nextInferenceAt) {
    // Slice the last WINDOW_SAMPLES leading up to nextInferenceAt.
    const startAbs = nextInferenceAt - WINDOW_SAMPLES;
    const localStart = Math.max(0, startAbs - windowStart);
    const localEnd = localStart + WINDOW_SAMPLES;
    if (localEnd > pcmBuffer.length) break;

    const slice = pcmBuffer.slice(localStart, localEnd);

    // Simple energy gate: skip near-silent windows to save CPU.
    if (rms(slice) > 0.005) {
      whisperWorker?.postMessage(
        {
          type: 'transcribe',
          audio: slice,
          startSec: startAbs / SAMPLE_RATE,
          endSec: nextInferenceAt / SAMPLE_RATE,
        },
        [slice.buffer]
      );
    }

    // Advance: drop samples we no longer need (keep last OVERLAP).
    const dropUntilAbs = nextInferenceAt - OVERLAP_SEC * SAMPLE_RATE;
    const dropLocal = Math.max(0, dropUntilAbs - windowStart);
    if (dropLocal > 0) {
      pcmBuffer = pcmBuffer.slice(dropLocal);
      windowStart += dropLocal;
    }
    nextInferenceAt += HOP_SAMPLES;
  }
}

function rms(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i] * arr[i];
  return Math.sqrt(s / arr.length);
}

function onWorkerMessage(e) {
  const m = e.data;
  if (m.type === 'ready') {
    relay({ type: 'transcript:status', status: 'ready', sessionId });
  } else if (m.type === 'chunk') {
    relay({
      type: 'transcript:chunk',
      sessionId,
      text: m.text,
      startSec: m.startSec,
      endSec: m.endSec,
    });
  } else if (m.type === 'error') {
    relay({ type: 'transcript:error', error: m.error });
  } else if (m.type === 'progress') {
    relay({
      type: 'transcript:status',
      status: 'loading-model',
      progress: m.progress,
    });
  }
}

function relay(payload) {
  chrome.runtime.sendMessage(payload).catch(() => {});
}
