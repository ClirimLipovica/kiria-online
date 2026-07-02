// ---------------------------------------------------------------
// Kiria Online 3D – Spielstand-Speicherung
// Lokal:  server/data/accounts.json (wie bisher)
// Cloud:  Upstash Redis (kostenlos) – aktiviert sich automatisch,
//         wenn die Umgebungsvariablen UPSTASH_REDIS_REST_URL und
//         UPSTASH_REDIS_REST_TOKEN gesetzt sind (z. B. auf Render).
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const KEY = 'kiria_accounts';

// Werte säubern: Anführungszeichen, Leerzeichen und End-Slash entfernen
// (passiert leicht beim Kopieren aus der Upstash-Konsole)
const clean = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '').trim().replace(/\/+$/, '');
const URL = clean(process.env.UPSTASH_REDIS_REST_URL);
const TOKEN = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
const cloud = !!(URL && TOKEN);

async function load() {
  if (cloud) {
    const res = await fetch(`${URL}/get/${KEY}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`Cloud-Speicher: HTTP ${res.status}`);
    const data = await res.json();
    if (data.result) {
      console.log('☁ Spielstände aus dem Cloud-Speicher geladen.');
      return JSON.parse(data.result);
    }
    console.log('☁ Cloud-Speicher verbunden (noch leer).');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch { return {}; }
}

async function save(accounts) {
  if (cloud) {
    const res = await fetch(`${URL}/set/${KEY}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(accounts),
    });
    if (!res.ok) throw new Error(`Cloud-Speicher: HTTP ${res.status}`);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 1));
}

module.exports = { load, save, cloud };
