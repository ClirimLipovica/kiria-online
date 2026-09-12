// Verbindungstest: node youtube/check.js
import { elListVoices, elUser, gemListModels } from './lib.js';

let ok = true;
console.log('=== ElevenLabs ===');
try {
  const sub = await elUser();
  console.log(`Verbunden. Plan: ${sub.tier}, Zeichen: ${sub.character_count}/${sub.character_limit}`);
  const voices = await elListVoices();
  console.log(`Stimmen (${voices.length}):`);
  for (const v of voices.slice(0, 15)) {
    console.log(`  ${v.voice_id}  ${v.name}  [${v.labels?.language || ''} ${v.labels?.gender || ''}]`);
  }
} catch (e) { ok = false; console.log('FEHLER:', e.message); }

console.log('\n=== Gemini / Nano Banana ===');
try {
  const models = await gemListModels();
  const img = models.filter(m => /image/i.test(m.name));
  console.log(`Verbunden. ${models.length} Modelle, davon Bild-Modelle:`);
  for (const m of img) console.log(`  ${m.name.replace('models/', '')}  - ${m.displayName}`);
} catch (e) { ok = false; console.log('FEHLER:', e.message); }

console.log(ok ? '\nAlles verbunden.' : '\nMindestens eine Verbindung fehlt.');
process.exit(ok ? 0 : 1);
