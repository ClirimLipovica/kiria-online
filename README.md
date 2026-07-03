# ⚔ Kiria Online 3D

Ein von **Tibia** inspiriertes 3D-Online-Rollenspiel — komplett selbst gebaut.
Node.js-Server (autoritativ) + three.js-Client im Browser.

![Spiel](https://img.shields.io/badge/Engine-three.js-blue) ![Server](https://img.shields.io/badge/Server-Node.js%20%2B%20Socket.io-green) ![Version](https://img.shields.io/badge/Version-8.0.0-orange)

## 🎮 Sofort spielen

### 👉 **https://kiria-online.onrender.com**

Kein Download — einfach im Browser öffnen, Charakter erstellen, losspielen.
Charaktere werden dauerhaft in der Cloud gespeichert. *(Erster Aufruf nach
längerer Pause: ~1 Minute Aufwachzeit des Gratis-Servers.)*

Die komplette Spielanleitung gibt es im **[Spielhandbuch (PDF)](Kiria-Online-Handbuch.pdf)**,
alle Versionen und Änderungen im **[Changelog](CHANGELOG.md)**.

## Features (Version 8)

- **Riesige 3D-Welt**: 1152×1152 Kacheln, prozedural generiert — **7 Städte**
  mit Ring-Plazas, Springbrunnen und begehbaren Häusern, dazu Bauernhof,
  Friedhof, Krypta, Ork-Festung, Minotauren-Labyrinth, Wyrm-Schlucht,
  Werwolf-Wald, Yeti-Berge, Drachenhöhle und Dämonen-Vulkan
- **38 Monsterarten, ~1160 Monster** — überall auf der Karte, mit kluger KI:
  Rudel rufen Verstärkung, Fernkämpfer halten Abstand, Feiglinge fliehen
- **4 Berufe** mit je **10 Zaubern** (Zauberbuch auf Z, auch per Chat sprechbar):
  - 🛡️ **Ritter** – Nahkampf-Panzer (Exori Ico, Exori Mas, Utito Tempo …)
  - 🏹 **Paladin** – Distanz + heilige Magie (Exori Con, Utura, Exevo Gran San …)
  - 🔮 **Magier** – Feuer, Blitz und Eis (Exori Frigo, Exevo Gran Mas Vis …)
  - 🐺 **Bestienzüchter** – zähmt Bestien, die mitkämpfen und mitleveln;
    Stall für 6 Tiere; eigene Angriffszauber (Exori Bestia, Exevo Natura …)
- **PvP** außerhalb der Städte — mit 💀 **Totenkopf-System**: Angreifer
  bekommen 60 Sekunden Stadtverbot; XP-Teilung nach Schadensanteil beim
  gemeinsamen Jagen
- **28 Quests** mit Questkette, „!"-Markern, Tracker und Questlog (L)
- **Mounts**: Pferd, Wolf, Bär, Riesenspinne, Minotaurus, Golem, Wyrm und
  Drache — Sättel als seltene Beute (1 %) oder beim Bauern
- **6 Ausrüstungs-Slots** (Waffe, Rüstung, Hose, Helm, Hand, Stiefel) mit
  Berufs-Bindung — Top-Ausrüstung nur von starken Monstern und Quests
- **Essen & Hunger**: ohne Nahrung kaum Regeneration — Monster droppen
  Käse, Fleisch und Schinken
- **Leichen-Loot** per Klick, **Kampfliste** (B), **Weltkarte** (M, klicken
  = reisen), Sprechblasen über den Köpfen, sprechende NPCs mit Dialogen
- **Lebendige Welt**: Tag/Nacht mit Sternenhimmel, Kaninchen, Rehe, Katzen,
  Hunde, Hoftiere, Schmetterlinge, fallende Blätter, Fackeln, Bloom-Glühen
- **Cloud-Spielstände** — Fortschritt bleibt für immer erhalten

## Starten (lokal)

```bash
npm install
npm start
```

Dann im Browser: **http://localhost:3000**

## Steuerung

| Taste | Aktion |
|---|---|
| WASD / Pfeiltasten | Laufen (auch diagonal) — du steuerst selbst! |
| Klick auf Monster/Spieler | Anvisieren — Angriff startet in Reichweite |
| B | Kampfliste (Gegner in der Nähe anklicken) |
| Z | Zauberbuch (alle Zauber, anklicken = wirken) |
| Klick auf Boden / Minimap | Dorthin laufen (Wegfindung) |
| Klick auf NPC | Reden, Handeln, Quests |
| Klick auf Leiche | Beute nehmen |
| 1–7 | Zauber • **8/9** Heil-/Manatrank |
| M | Weltkarte (klicken = reisen) |
| R | Reittier auf-/absteigen |
| I | Inventar, Ausrüstung, Tiere, Skin |
| L | Questlog |
| Q / E | Kamera drehen • Mausrad: Zoom |
| Enter | Chat — Zauber tippen wirkt sie („exura")! |
| K | Sound an/aus • ESC: abwählen/schließen |

## 🌍 Selbst hosten

Das Spiel läuft bereits öffentlich (siehe oben). Wer eine eigene Instanz will:

**Render.com (kostenlos, dauerhaft):** Repository forken → auf render.com
„New → Blueprint" → Repo wählen (die [render.yaml](render.yaml) macht den Rest).
Für dauerhafte Spielstände bei [Upstash](https://upstash.com) eine kostenlose
Redis-Datenbank anlegen und `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` als Umgebungsvariablen in Render eintragen.
Speicher-Status prüfen: `/api/status`.

**Schnelltest vom eigenen PC:** `npm start` und in einem zweiten Terminal
`cloudflared tunnel --url http://localhost:3000` — die trycloudflare-Adresse
an Freunde schicken.

## Technik

```
server/
  server.js     – Express + Socket.io, Login/Konten (Passwörter gehasht)
  game.js       – Spiellogik: Kampf, PvP, Monster-KI, Zauber, Quests,
                  Mounts, Hunger, XP-Teilung, Tier-Stall
  world.js      – prozedurale Welt (1152x1152, Städte, Orte, ~1160 Spawns)
  constants.js  – 38 Monster, ~50 Items, 26 Zauber, 4 Berufe, 28 Quests
  storage.js    – Spielstände: lokale Datei oder Upstash-Cloud
public/
  index.html    – UI (Login, HUD, Panels)
  js/main.js    – Spielschleife, Eingaben, Netzwerk, Wegfindung, Bloom
  js/world3d.js – Chunk-Terrain, Wasser, Himmel, Städte-Deko, Tierwelt
  js/entities.js– Spieler-/Monster-Modelle, Mounts, Animationen
  js/effects.js – Partikel, Projektile, Schadenszahlen, Sound
  js/ui.js      – HUD, Kampfliste, Zauberbuch, Karte, Inventar, Quests
```

Der Server ist autoritativ: Bewegung, Kampf, Käufe und Quests werden
serverseitig geprüft — Schummeln über die Browser-Konsole ist nicht möglich.
