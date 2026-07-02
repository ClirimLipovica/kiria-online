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
const KEY = 'kiria_accounts_v8'; // v8: kompletter Neustart der Spielstände

// Werte säubern: Anführungszeichen, Leerzeichen und End-Slash entfernen
// (passiert leicht beim Kopieren aus der Upstash-Konsole)
const clean = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '').trim().replace(/\/+$/, '');
let URL = clean(process.env.UPSTASH_REDIS_REST_URL);
let TOKEN = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
// Vertauschte Werte erkennen (URL muss mit http(s) beginnen)
const isUrl = (v) => /^https?:\/\//i.test(v);
if (URL && TOKEN && !isUrl(URL) && isUrl(TOKEN)) {
  [URL, TOKEN] = [TOKEN, URL];
  console.log('☁ Hinweis: URL und Token waren vertauscht – automatisch korrigiert.');
}
// Fehlendes https:// ergänzen, wenn es nach einer Upstash-Adresse aussieht
if (URL && !isUrl(URL) && /upstash\.io$/i.test(URL)) URL = 'https://' + URL;
const cloud = !!(URL && TOKEN && isUrl(URL));

// Diagnose-Zustand (für /api/status – keine Geheimnisse!)
const status = {
  mode: cloud ? 'cloud' : 'datei',
  urlHost: cloud ? URL.replace(/^https?:\/\//, '').slice(0, 12) + '…' : null,
  loadOk: null, loadError: null,
  lastSaveOk: null, lastSaveError: null, lastSaveAt: null,
};

async function load() {
  try {
    let result;
    if (cloud) {
      const res = await fetch(`${URL}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      if (!res.ok) throw new Error(`Cloud-Speicher: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
      const data = await res.json();
      if (data.result) {
        console.log('☁ Spielstände aus dem Cloud-Speicher geladen.');
        result = JSON.parse(data.result);
      } else {
        console.log('☁ Cloud-Speicher verbunden (noch leer).');
        result = {};
      }
    } else {
      try {
        result = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
      } catch { result = {}; }
    }
    status.loadOk = true;
    return result;
  } catch (e) {
    status.loadOk = false;
    status.loadError = e.message;
    throw e;
  }
}

async function save(accounts) {
  try {
    if (cloud) {
      const res = await fetch(`${URL}/set/${KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify(accounts),
      });
      if (!res.ok) throw new Error(`Cloud-Speicher: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
    } else {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 1));
    }
    status.lastSaveOk = true;
    status.lastSaveError = null;
    status.lastSaveAt = new Date().toISOString();
  } catch (e) {
    status.lastSaveOk = false;
    status.lastSaveError = e.message;
    status.lastSaveAt = new Date().toISOString();
    throw e;
  }
}

module.exports = { load, save, cloud, status };
