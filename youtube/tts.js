// Sprachausgabe:
//   node youtube/tts.js "Text hier"
//   node youtube/tts.js --file skript.txt [--voice VOICE_ID] [--out datei.mp3]
import fs from 'node:fs';
import { elTTS } from './lib.js';

const args = process.argv.slice(2);
const get = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const skip = new Set([get('--voice'), get('--out'), get('--file')]);
const text = get('--file')
  ? fs.readFileSync(get('--file'), 'utf8')
  : args.filter(a => !a.startsWith('--') && !skip.has(a)).join(' ');

if (!text.trim()) {
  console.log('Nutzung: node youtube/tts.js "Text" | --file skript.txt [--voice ID] [--out datei.mp3]');
  process.exit(1);
}

const out = await elTTS(text, { voiceId: get('--voice'), outFile: get('--out') });
console.log('Gespeichert:', out);
