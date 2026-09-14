import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (path, encoding) => readFile(resolve(root, path), encoding);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const graphics = JSON.parse(await load('assets/graphics-fonts-manifest.json', 'utf8'));
const html = await load(graphics.source, 'utf8');
assert.equal(sha256(html), graphics.sourceSha256);
for (const file of graphics.files) {
  const data = await load(file.file);
  assert.equal(data.length, file.bytes, file.file);
  assert.equal(sha256(data), file.sha256, file.file);
  if (file.file.endsWith('.svg')) {
    const name = file.file.split('/').at(-1).replace('.svg', '');
    const symbol = [...html.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)]
      .find((match) => match[1].includes(`id="${name}"`));
    const svg = data.toString();
    assert.equal(svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>')), symbol[2]);
    assert.ok(svg.includes(symbol[1].match(/viewBox="[^"]+"/)[0]));
    assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.doesNotMatch(svg, /<symbol|<script|(?:href|src)="https?:/);
  }
}
const css = await load('assets/fonts/fonts.css', 'utf8');
for (const [file, weight] of [['Nunito-Bold.ttf', 700], ['Nunito-ExtraBold.ttf', 800], ['TitanOne-Regular.ttf', 400]]) {
  const font = await load(`assets/fonts/${file}`);
  const tables = new Map();
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const offset = 12 + i * 16;
    tables.set(font.toString('ascii', offset, offset + 4), font.readUInt32BE(offset + 8));
  }
  assert.equal(font.readUInt16BE(tables.get('OS/2') + 4), weight, file);
  assert.ok(!tables.has('fvar'), `${file} must be static, not variable`);
  assert.ok(css.includes(font.toString('base64')), `${file} embedded verbatim`);
}
assert.doesNotMatch(css, /https?:|@import/);
console.log('PASS: five exact SVG bodies/defs, three static font weights, embedded font bytes, source hashes');

const sounds = JSON.parse(await load('assets/sounds/manifest.json', 'utf8'));
const names = ['tap', 'correct', 'wrong', 'complete', 'tick', 'swipe', 'bonus', 'over'];
assert.deepEqual(sounds.files.map((file) => file.file), names.map((name) => `${name}.mp3`));
assert.deepEqual((await readdir(resolve(root, 'assets/sounds'))).filter((file) => file.endsWith('.mp3')).sort(), names.map((name) => `${name}.mp3`).sort());
let total = 0;
for (const file of sounds.files) {
  const data = await load(`assets/sounds/${file.file}`);
  assert.equal(data.length, file.bytes);
  assert.equal(sha256(data), file.sha256);
  const decoded = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', [
    '-v', 'error', '-i', resolve(root, 'assets/sounds', file.file), '-f', 'f32le', '-ac', '1', '-ar', '44100', 'pipe:1',
  ]);
  assert.equal(decoded.status, 0, decoded.error?.message ?? decoded.stderr?.toString());
  let peak = 0;
  let power = 0;
  for (let i = 0; i < decoded.stdout.length; i += 4) {
    const sample = decoded.stdout.readFloatLE(i);
    assert.ok(Number.isFinite(sample));
    peak = Math.max(peak, Math.abs(sample));
    power += sample * sample;
  }
  const samples = decoded.stdout.length / 4;
  assert.ok(peak < 0.95 && peak > 0.05, `${file.file}: no clipping or silence`);
  assert.ok(Math.sqrt(power / samples) > 0.01, `${file.file}: audible signal`);
  assert.ok(Math.abs(samples / 44100 - file.seconds) < 0.06, `${file.file}: duration`);
  total += data.length;
}
assert.equal(total, sounds.totalBytes);
assert.ok(total < 500_000);
console.log(`PASS: eight decodable, non-clipping MP3s, ${total} bytes total (< 500000)`);

const source = await load('src/services/sound.ts', 'utf8');
const js = stripTypeScriptTypes(source, { mode: 'strip' })
  .replace("import { Platform } from 'react-native';", "const Platform = require('react-native').Platform;")
  .replace('export const sound', 'const sound') + '\n; sound;';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function harness(platform = 'ios', options = {}) {
  const instances = [];
  const modes = [];
  let imports = 0;
  function player() {
    const instance = {
      plays: 0, pauses: 0, seeks: 0, removes: 0,
      play() { this.plays++; if (options.playThrow) throw Error('play'); return options.playReject ? Promise.reject(Error('blocked')) : undefined; },
      pause() { this.pauses++; if (options.pauseThrow) throw Error('pause'); },
      seekTo(value) { assert.equal(value, 0); this.seeks++; return options.seekReject ? Promise.reject(Error('seek')) : options.seek?.promise ?? Promise.resolve(); },
      remove() { this.removes++; if (options.removeThrow) throw Error('remove'); },
    };
    instances.push(instance);
    return instance;
  }
  const sound = runInNewContext(js, {
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-asset') return { Asset: { fromModule: (uri) => ({ uri }) } };
      if (name === 'expo-audio') {
        imports++;
        if (options.importThrow) throw Error('native module missing');
        return {
          setAudioModeAsync(mode) { modes.push(mode); return options.modeReject ? Promise.reject(Error('mode')) : options.mode?.promise ?? Promise.resolve(); },
          createAudioPlayer(asset, config) {
            assert.match(asset, /assets\/sounds\/\w+\.mp3$/);
            assert.equal(config.downloadFirst, false);
            if (options.createThrow) throw Error('create');
            return player();
          },
        };
      }
      assert.match(name, /\.mp3$/);
      return name;
    },
    Audio: function (uri) {
      assert.match(uri, /\.mp3$/);
      const media = player();
      media.removeAttribute = (name) => { assert.equal(name, 'src'); media.removes++; };
      media.load = () => {};
      return media;
    },
  });
  return { sound, instances, modes, imports: () => imports };
}

const normal = harness();
assert.equal(normal.imports(), 0, 'lazy native module');
assert.equal(normal.sound.play('tap'), undefined, 'play returns void');
await flush();
normal.sound.play('tap');
await flush();
assert.equal(normal.instances.length, 1, 'reuse cached player');
assert.equal(normal.instances[0].plays, 2);
assert.equal(normal.instances[0].seeks, 1);
for (const name of names.slice(1)) normal.sound.play(name);
await flush();
assert.equal(normal.instances.length, 8);
assert.equal(normal.modes.length, 1);
assert.equal(normal.modes[0].shouldPlayInBackground, false);
assert.equal(normal.modes[0].interruptionMode, 'mixWithOthers');
normal.sound.play('toString');
assert.equal(normal.instances.length, 8, 'unknown names ignored');
normal.sound.setEnabled(false);
normal.sound.play('tap');
await flush();
assert.equal(normal.instances[0].plays, 2, 'muted play ignored');
await normal.sound.dispose();
await normal.sound.dispose();
assert.ok(normal.instances.every((instance) => instance.removes === 1));
normal.sound.setEnabled(true);
normal.sound.play('tap');
await flush();
assert.equal(normal.instances.length, 9, 'can recreate after dispose');
await normal.sound.dispose();

for (const action of ['mute', 'dispose']) {
  const mode = deferred();
  const test = harness('android', { mode });
  test.sound.play('correct');
  if (action === 'mute') test.sound.setEnabled(false); else await test.sound.dispose();
  mode.resolve();
  await flush();
  assert.equal(test.instances[0].plays, 0, `${action} cancels pending initialization`);
  await test.sound.dispose();
}
const seek = deferred();
const pending = harness('ios', { seek });
pending.sound.play('tap');
await flush();
pending.sound.play('tap');
pending.sound.play('tap');
await flush();
assert.equal(pending.instances[0].seeks, 1, 'coalesce pending restarts');
pending.sound.setEnabled(false);
pending.sound.setEnabled(true);
seek.resolve();
await flush();
assert.equal(pending.instances[0].plays, 1, 'mute/unmute does not revive an old seek');
await pending.sound.dispose();

for (const failure of ['importThrow', 'createThrow', 'modeReject', 'playThrow', 'playReject', 'seekReject', 'pauseThrow', 'removeThrow']) {
  const test = harness('ios', { [failure]: true });
  assert.doesNotThrow(() => test.sound.play('tap'));
  await flush();
  test.sound.play('tap');
  await flush();
  assert.doesNotThrow(() => test.sound.setEnabled(false));
  await test.sound.dispose();
  await flush();
}
const web = harness('web', { playReject: true });
web.sound.play('bonus');
assert.equal(web.instances[0].plays, 1, 'web initial play uses the gesture synchronously');
await flush();
assert.equal(web.imports(), 0, 'web avoids unsafe expo-audio play promise');
assert.equal(web.instances[0].removes, 1, 'blocked web playback cleaned up');
await web.sound.dispose();
console.log('PASS: playback API, lazy/reused players, mute, cancellation, disposal, native failures, web autoplay rejection');

if (process.argv.includes('--regenerate')) {
  for (const script of ['scripts/extract-assets.mjs', 'scripts/generate-sounds.mjs']) {
    const result = spawnSync(process.execPath, [resolve(root, script)], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  }
  assert.deepEqual(JSON.parse(await load('assets/graphics-fonts-manifest.json', 'utf8')), graphics);
  assert.deepEqual(JSON.parse(await load('assets/sounds/manifest.json', 'utf8')), sounds);
  console.log('PASS: offline regeneration reproduces every asset hash and both manifests');
}

async function inventory(directory) {
  for (const file of (await readdir(resolve(root, directory))).sort()) {
    const path = `${directory}/${file}`;
    const info = await stat(resolve(root, path));
    if (info.isDirectory()) await inventory(path);
    else console.log(`${path}\t${info.size} bytes`);
  }
}
await inventory('assets');
for (const path of ['src/services/sound.ts', 'scripts/extract-assets.mjs', 'scripts/generate-sounds.mjs']) {
  console.log(`${path}\t${(await stat(resolve(root, path))).size} bytes`);
}
