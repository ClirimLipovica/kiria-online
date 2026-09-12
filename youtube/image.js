// Bild erzeugen (Nano Banana):
//   node youtube/image.js "Prompt" [--ratio 16:9|9:16|1:1] [--ref bild.png] [--out datei.png]
import { gemImage } from './lib.js';

const args = process.argv.slice(2);
const get = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const skip = new Set([get('--ratio'), get('--ref'), get('--out')]);
const prompt = args.filter(a => !a.startsWith('--') && !skip.has(a)).join(' ');

if (!prompt.trim()) {
  console.log('Nutzung: node youtube/image.js "Prompt" [--ratio 16:9] [--ref bild.png] [--out datei.png]');
  process.exit(1);
}

const { outFile, text } = await gemImage(prompt, {
  aspectRatio: get('--ratio') || '16:9',
  outFile: get('--out'),
  refImages: get('--ref') ? [get('--ref')] : [],
});
console.log('Gespeichert:', outFile);
if (text) console.log('Modell sagt:', text);
