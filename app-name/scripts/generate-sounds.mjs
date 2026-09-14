import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Original deterministic synthesis. No recordings, samples, or existing melodies.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'assets/sounds');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const rate = 44100;
const tau = Math.PI * 2;
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const effects = [
  { name: 'tap', seconds: 0.10, description: 'Soft ascending tile pop', peak: 0.38,
    notes: [[0, 0.075, 640, 880, 1]] },
  { name: 'correct', seconds: 0.43, description: 'Bright two-note confirmation', peak: 0.52,
    notes: [[0, 0.20, midi(76), midi(76), 1], [0.115, 0.27, midi(83), midi(83), 0.85]] },
  { name: 'wrong', seconds: 0.30, description: 'Gentle descending retry cue', peak: 0.44,
    notes: [[0, 0.12, 320, 285, 0.85], [0.11, 0.155, 245, 205, 1]] },
  { name: 'complete', seconds: 1.22, description: 'Short original four-note celebration', peak: 0.56,
    notes: [[0, 0.30, midi(72), midi(72), 0.8], [0.15, 0.30, midi(76), midi(76), 0.8],
      [0.30, 0.31, midi(79), midi(79), 0.85], [0.48, 0.64, midi(84), midi(84), 1],
      [0.48, 0.61, midi(76), midi(76), 0.28], [0.48, 0.61, midi(79), midi(79), 0.28]] },
  { name: 'tick', seconds: 0.075, description: 'Quiet rounded timer tick', peak: 0.28,
    notes: [[0, 0.047, 1150, 850, 1]], noise: 0.08 },
  { name: 'swipe', seconds: 0.16, description: 'Airy short selection sweep', peak: 0.28,
    notes: [[0, 0.12, 360, 920, 0.15]], noise: 0.7 },
  { name: 'bonus', seconds: 0.59, description: 'Sparkling three-note reward', peak: 0.50,
    notes: [[0, 0.20, midi(79), midi(79), 0.8], [0.10, 0.24, midi(86), midi(86), 0.9],
      [0.22, 0.30, midi(91), midi(91), 0.7]] },
  { name: 'over', seconds: 0.72, description: 'Soft descending end-of-round cue', peak: 0.46,
    notes: [[0, 0.26, midi(67), midi(67), 0.8], [0.17, 0.26, midi(64), midi(64), 0.8],
      [0.34, 0.33, midi(60), midi(60), 0.95]] },
];

function synthesize(effect) {
  const samples = new Float64Array(Math.ceil(effect.seconds * rate));
  for (const [start, length, from, to, gain] of effect.notes) {
    const offset = Math.round(start * rate);
    for (let i = 0; i < Math.floor(length * rate) && offset + i < samples.length; i++) {
      const t = i / rate;
      const progress = t / length;
      const envelope = Math.min(1, t / 0.005) * Math.min(1, (length - t) / 0.025) * Math.exp(-3.3 * progress);
      // Integrate the linear frequency sweep to keep phase continuous.
      const phase = tau * (from * t + (to - from) * t * t / (2 * length));
      samples[offset + i] += gain * envelope * (Math.sin(phase) + 0.18 * Math.sin(2 * phase) + 0.045 * Math.sin(3 * phase));
    }
  }
  let seed = 0x51f15e;
  let filtered = 0;
  if (effect.noise) {
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 0x80000000 - 1;
      filtered += 0.19 * (noise - filtered);
      const progress = i / (samples.length - 1);
      samples[i] += effect.noise * filtered * Math.sin(Math.PI * progress) ** 2;
    }
  }
  const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    wav.writeInt16LE(Math.round(samples[i] / peak * effect.peak * 32767), 44 + i * 2);
  }
  return wav;
}

const version = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  throw new Error(`ffmpeg unavailable. Set FFMPEG_PATH to its executable. ${version.error?.message ?? version.stderr}`);
}
await mkdir(output, { recursive: true });
const files = [];
for (const effect of effects) {
  const path = resolve(output, `${effect.name}.mp3`);
  const result = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'wav', '-i', 'pipe:0',
    '-map_metadata', '-1', '-ac', '1', '-ar', String(rate), '-c:a', 'libmp3lame', '-b:a', '64k',
    '-fflags', '+bitexact', '-flags:a', '+bitexact', '-id3v2_version', '0', '-write_xing', '1', path,
  ], { input: synthesize(effect) });
  if (result.error || result.status !== 0) throw new Error(`${effect.name}: ${result.error?.message ?? result.stderr.toString()}`);
  const data = await readFile(path);
  files.push({ file: `${effect.name}.mp3`, bytes: data.length, seconds: effect.seconds,
    sha256: createHash('sha256').update(data).digest('hex'), description: effect.description });
  console.log(`${effect.name}.mp3: ${data.length} bytes, ${effect.seconds}s`);
}
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
if (totalBytes >= 500_000) throw new Error(`Sound budget exceeded: ${totalBytes} bytes`);
await writeFile(resolve(output, 'manifest.json'), `${JSON.stringify({
  generator: 'scripts/generate-sounds.mjs', license: 'CC0-1.0',
  encoding: 'MPEG Layer III, 44100 Hz, mono, 64 kbit/s',
  encoder: version.stdout.split('\n')[0], totalBytes, files,
}, null, 2)}\n`);
console.log(`Total: ${totalBytes} / 500000 bytes`);
