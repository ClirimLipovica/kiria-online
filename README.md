# ⚔ Kiria Online 3D

Ein von **Tibia** inspiriertes 3D-Online-Rollenspiel — komplett selbst gehostet.
Node.js-Server (autoritativ) + three.js-Client im Browser.

![Spiel](https://img.shields.io/badge/Engine-three.js-blue) ![Server](https://img.shields.io/badge/Server-Node.js%20%2B%20Socket.io-green)

## Features

- **Riesige 3D-Welt** (1152×1152 Kacheln, prozedural generiert): Insel mit **7 Städten**
  samt Straßennetz, Wäldern, Bergen, Friedhof, Ruinen, Labyrinth,
  Drachenhöhle und Dämonen-Vulkan
- **4 Berufe** mit eigenen Zauberlisten (je 10 Zauber, Tasten 1–7):
  - 🛡️ **Ritter** – Nahkämpfer (Exori, Exori Gran, Utito Tempo…)
  - 🏹 **Paladin** – kämpft mit Wurfspeeren auf Distanz (Exori San, Utamo Vita…)
  - 🔮 **Magier** – magische Geschosse auf Distanz (Exori Vis, Exevo Gran Mas…)
  - 🐺 **Bestienzüchter** – zähmt Bestien, die für ihn kämpfen und mitleveln
    (Utevo Bestia: Ziel unter 60 % Leben)
- **68 Monsterarten** – vom Huhn bis zum Obsidiangolem, ~1800 Monster
  gleichzeitig in der Welt, viele davon frei in der Wildnis unterwegs
- **Schlaue Monster-KI**: Wegfindung um Felsen und Bäume, Rudel-Alarm,
  Rache an Angreifern, Fernkämpfer halten Abstand — und wer Monster
  aus unerreichbaren Ecken beschießt, geht leer aus (Reset + Vollheilung)
- **6 Bosse**: 5 Gebiets-Bosse (Spinnenkönigin, Ork-Kriegsherr, Yeti-König,
  Lichkönig, Drachenfürst) + der **Uralte Titan**, ein Weltboss, der einmal
  pro Tag erscheint und auf der Weltkarte (M) mit 💀 markiert wird
- **Über 120 Items**: Waffen/Rüstungen in 5+ Qualitätsstufen je Beruf,
  Trophäen und Schätze zum Verkaufen (Perlen, Rubine, Diamanten…),
  16 reitbare Mounts (Pferd, Panther, Greif, Einhorn, Phönix, Drache…)
- **Wegpunkte**: Karte öffnen (M), Ziel anklicken → 🚩 Fahne auf der Minimap
- **Städte als echte Schutzzonen** — niemand kann aus der Stadt heraus angreifen
- **Schönere Städte**: bunte Dächer, Fenster, Türen, Schornsteine,
  Marktstände, Springbrunnen mit Blumenbeeten, Fackeln, Tempel-Fahnen
- **Sprechende NPCs** in jeder Stadt (anklicken → Dialog mit Themen + Handel),
  25 Quests mit Questlog (L) und Verfolgung unter der Minimap
- **12 wählbare Skins** (beim Login und im Inventar jederzeit wechselbar)
- **Drehbare Kamera** (Q/E), Zoom (Mausrad)
- **Lebendige Welt**: Schmetterlinge, Vögel, Wolken, Gras, Blumen,
  Glühwürmchen und Fackellicht bei Nacht, Tag/Nacht-Zyklus
- **Level-System** mit XP, Loot, Buffs, PvP mit Totenkopf-System, Chat, Minimap
- **Charaktere werden gespeichert** (Name + Passwort) — Fortschritt bleibt erhalten
- **Echtes Multiplayer** über Socket.io — alle Spieler in einer Welt

## Starten (lokal)

```bash
npm install
npm start
```

Dann im Browser: **http://localhost:3000**

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (folgt der Kameradrehung) |
| Klick auf Monster | Angreifen (Fernkämpfer bleiben auf Distanz) |
| Klick auf Boden | Dorthin laufen (Wegfindung) |
| Klick auf NPC | Reden (Dialog, bei Händlern auch Handel) |
| 1–7 | Zauber (je nach Beruf) |
| 8 / 9 | Heiltrank / Manatrank |
| Q / E | Kamera drehen |
| I | Inventar, Ausrüstung, Tier, Skin |
| B | Kampfliste (Gegner anvisieren) |
| Z | Zauberbuch |
| L | Questlog |
| M | Weltkarte (Klick = 🚩 Wegpunkt, 💀 = Boss) |
| R | Reiten (Mount auf/absteigen) |
| Enter | Chat |
| ESC | Ziel abwählen / Fenster schließen |
| Mausrad | Zoom |
| K | Sound an/aus |

## 🌍 Online spielen (mit Freunden außerhalb deines Netzwerks)

### Variante A: Kostenloses Hosting bei Render.com (empfohlen, dauerhaft)

1. Lade das Projekt auf GitHub hoch (ohne `node_modules`):
   ```bash
   git init
   git add .
   git commit -m "Kiria Online 3D"
   ```
   Dann auf github.com ein Repository erstellen und pushen.
2. Auf **https://render.com** kostenlos registrieren
3. **New → Web Service** → dein GitHub-Repository auswählen
4. Einstellungen:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Nach dem Deploy bekommst du eine URL wie `https://kiria-online.onrender.com` —
   **diese URL einfach an Freunde schicken, fertig!**

> Hinweis: Im Free-Tarif schläft der Server nach 15 Minuten ohne Besucher ein
> (erster Aufruf danach dauert ~30 Sekunden). Charaktere können beim Neustart
> des Gratis-Servers verloren gehen, da der Speicher dort nicht dauerhaft ist.

### Variante B: Dein PC ist der Server (schnell, solange dein PC läuft)

Mit **Cloudflare Tunnel** (kostenlos, keine Registrierung):

```bash
winget install Cloudflare.cloudflared
npm start
```

In einem zweiten Terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Du bekommst eine öffentliche URL wie `https://xyz-abc.trycloudflare.com` —
die schickst du deinen Freunden. Solange dein PC und beide Fenster laufen,
können alle mitspielen.

Alternative ohne Installation: `npm run tunnel` (localtunnel — Besucher müssen
beim ersten Aufruf einmal deine öffentliche IP eingeben, die auf der Seite steht).

### Variante C: Portfreigabe im Router

Port **3000** (TCP) im Router auf deinen PC weiterleiten, dann können Freunde
über `http://DEINE-ÖFFENTLICHE-IP:3000` beitreten (IP z. B. auf wieistmeineip.de).

## Technik

```
server/
  server.js     – Express + Socket.io, Login/Konten (Passwörter gehasht)
  game.js       – Spiellogik: Kampf, Monster-KI, Zauber, Loot, Level, Speicherung
  world.js      – prozedurale Welt-Generierung (Seed-basiert)
  constants.js  – Monster, Items, Zauber, Berufe
  data/         – gespeicherte Charaktere (accounts.json)
public/
  index.html    – UI (Login, HUD, Inventar, Shop, Chat)
  js/main.js    – Spielschleife, Eingaben, Netzwerk, Wegfindung
  js/world3d.js – 3D-Terrain, Wasser, Bäume, Gebäude, Tag/Nacht
  js/entities.js– Spieler-/Monster-Modelle + Animationen
  js/effects.js – Partikel, Projektile, Schadenszahlen, Sound
  js/ui.js      – HUD-Logik (Balken, Hotbar, Minimap, Shop)
```

Der Server ist autoritativ: Bewegung, Kampf und Käufe werden serverseitig
geprüft — Schummeln über die Browser-Konsole ist nicht möglich.
