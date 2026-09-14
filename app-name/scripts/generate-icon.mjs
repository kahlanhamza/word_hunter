import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../assets/art/mascot.svg', import.meta.url));
// Keep the mascot inside Android's adaptive-icon safe region.
const foreground = await sharp(source, { density: 288 }).resize(650, 650, { fit: 'inside' }).png().toBuffer();
for (const [file, background] of [
  ['icon.png', '#EFE6FA'],
  ['adaptive-icon.png', { r: 0, g: 0, b: 0, alpha: 0 }],
]) {
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background } })
    .composite([{ input: foreground, gravity: 'centre' }])
    .png()
    .toFile(fileURLToPath(new URL(`../assets/${file}`, import.meta.url)));
  console.log(`Generated assets/${file}`);
}
