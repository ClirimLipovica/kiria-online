// Gemeinsame Helfer: .env laden, API-Aufrufe für ElevenLabs + Gemini (Nano Banana)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(here, 'out');
const envFile = path.join(here, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

export function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} fehlt. Trage ihn in youtube/.env ein (Vorlage: youtube/.env.example).`);
  return v;
}

export const EL_BASE = 'https://api.elevenlabs.io/v1';
export const GEM_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ---------- ElevenLabs ----------
export async function elListVoices() {
  const r = await fetch(`${EL_BASE}/voices`, { headers: { 'xi-api-key': need('ELEVENLABS_API_KEY') } });
  if (!r.ok) throw new Error(`ElevenLabs /voices: ${r.status} ${await r.text()}`);
  return (await r.json()).voices;
}

export async function elUser() {
  const r = await fetch(`${EL_BASE}/user/subscription`, { headers: { 'xi-api-key': need('ELEVENLABS_API_KEY') } });
  if (!r.ok) throw new Error(`ElevenLabs /user/subscription: ${r.status} ${await r.text()}`);
  return r.json();
}

export async function elTTS(text, { voiceId, model, outFile } = {}) {
  voiceId = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    const voices = await elListVoices();
    voiceId = voices[0].voice_id;
    console.log(`Keine ELEVENLABS_VOICE_ID gesetzt, nehme "${voices[0].name}" (${voiceId})`);
  }
  model = model || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const r = await fetch(`${EL_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': need('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS: ${r.status} ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(OUT, { recursive: true });
  outFile = outFile || path.join(OUT, `voice-${Date.now()}.mp3`);
  fs.writeFileSync(outFile, buf);
  return outFile;
}

// ---------- Gemini / Nano Banana ----------
export async function gemListModels() {
  const r = await fetch(`${GEM_BASE}/models?pageSize=200`, { headers: { 'x-goog-api-key': need('GEMINI_API_KEY') } });
  if (!r.ok) throw new Error(`Gemini /models: ${r.status} ${await r.text()}`);
  return (await r.json()).models || [];
}

export async function gemImage(prompt, { model, aspectRatio = '16:9', outFile, refImages = [] } = {}) {
  model = model || process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const parts = [{ text: prompt }];
  for (const f of refImages) {
    const ext = path.extname(f).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    parts.push({ inlineData: { mimeType: mime, data: fs.readFileSync(f).toString('base64') } });
  }
  const r = await fetch(`${GEM_BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': need('GEMINI_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio } },
    }),
  });
  if (!r.ok) throw new Error(`Gemini Bild (${model}): ${r.status} ${await r.text()}`);
  const data = await r.json();
  const rparts = data.candidates?.[0]?.content?.parts || [];
  const img = rparts.find(p => p.inlineData);
  if (!img) throw new Error(`Kein Bild in der Antwort: ${JSON.stringify(data).slice(0, 500)}`);
  const ext = (img.inlineData.mimeType || 'image/png').split('/')[1];
  fs.mkdirSync(OUT, { recursive: true });
  outFile = outFile || path.join(OUT, `image-${Date.now()}.${ext}`);
  fs.writeFileSync(outFile, Buffer.from(img.inlineData.data, 'base64'));
  const text = rparts.filter(p => p.text).map(p => p.text).join('\n');
  return { outFile, text };
}
