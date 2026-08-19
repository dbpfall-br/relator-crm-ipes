// AudioWorklet that downsamples the incoming stream to mono 16 kHz and posts
// Float32 chunks back to the offscreen document. Runs on the audio thread.

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options?.processorOptions?.targetSampleRate ?? 16000;
    this.ratio = sampleRate / this.targetRate; // sampleRate = input rate
    this.accumulator = [];
    this.chunkSize = this.targetRate; // flush ~once per second
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Average channels to mono.
    const ch0 = input[0];
    const ch1 = input[1] ?? null;
    const monoLen = ch0.length;
    const mono = new Float32Array(monoLen);
    if (ch1) {
      for (let i = 0; i < monoLen; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;
    } else {
      mono.set(ch0);
    }

    // Downsample by simple linear interpolation. Good enough for Whisper.
    const outLen = Math.floor(monoLen / this.ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * this.ratio;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(monoLen - 1, i0 + 1);
      const frac = srcIdx - i0;
      out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
    }

    this.accumulator.push(out);
    let total = 0;
    for (const a of this.accumulator) total += a.length;

    if (total >= this.chunkSize) {
      const flat = new Float32Array(total);
      let off = 0;
      for (const a of this.accumulator) {
        flat.set(a, off);
        off += a.length;
      }
      this.accumulator.length = 0;
      this.port.postMessage(flat, [flat.buffer]);
    }

    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
