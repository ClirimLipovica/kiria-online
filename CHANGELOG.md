# 📜 Kiria Online – Änderungshistorie

Alle wichtigen Änderungen am Spiel, von der ersten 3D-Version bis heute.

---

## Version 11.0.0 – „Die Unterwelt" *(4. Juli 2026)*

Kiria hat jetzt **6 Stockwerke**: 3 Untergeschosse voller Höhlen, die
Oberwelt und 2 Obergeschosse mit Berg-Plateaus über den Wolken.

### Mehrstöckige Welt
- **13 Höhlensysteme** aus vielen kleinen Kavernen mit Verbindungstunneln –
  keine einzelne Riesenhöhle, sondern verwinkelte Gänge
- **33 Treppen/Löcher** verbinden die Ebenen; die meisten Systeme haben
  **mehrere Eingänge** (die Alte Mine bei Kiria sogar drei)
- 1. UG: Alte Mine, Friedhofs-Krypta, Spinnentiefe, Kriegsmine, Eishöhle,
  Katakomben, Vulkanschlund, Drachengrotte
- 2. UG: Eisgrotte, Tiefengruft, Feuerkammern, Drachenhort-Tiefen
- 3. UG: Dämonenhallen und Urdrachen-Schlund (Endgame!)
- 1. OG: Yeti-Hochplateau, Vulkankrater-Rand, Adlerfels
- 2. OG: Drachengipfel und Sturmgipfel
- Unter Tage ist es **dauerhaft düster** – Fackel und Utevo Lux leuchten
  dort immer; die Minimap zeigt die Höhlen samt Ebenen-Anzeige (z. B. „1. UG")

### Monster überall – nicht nur oberirdisch
- **~2700 Monster**, davon über 400 unter der Erde und auf den Gipfeln
- **Dämonen an 4 Orten** (Vulkan, Feuerkammern, Dämonenhallen, Kraterrand),
  **Drachenbrut in 14 Zonen** über alle Ebenen verteilt
- Die 5 Bosse sitzen jetzt TIEF in der Unterwelt: Spinnenkönigin und
  Ork-Kriegsherr im 1. UG, Yeti-König und Lichkönig im 2. UG, der
  Drachenfürst im 3. UG – weiterhin nur mit aktiver Boss-Quest erreichbar

### Quests
- **11 neue Dungeon-Quests** (jetzt 44): von „Die Alte Mine" (Level 5)
  über „Ruf der Katakomben" bis „Die Dämonenhallen" und „Am Drachengipfel"

### Technik
- Ebenen werden komprimiert übertragen (aus 16 MB Kartendaten werden ~800 KB)
- Kampf, Zauber, Beute, Tiere und Karte sind komplett ebenen-getrennt;
  Tiere folgen ihrem Besitzer durch Treppen
- Einmaliger Positions-Reset: alle Helden starten wieder am Tempel
  (Level, Gold, Ausrüstung und Tiere bleiben natürlich erhalten)

---

## Version 8.0.0 – „Die Challenge" *(2. Juli 2026)*

Die große Balance-Überarbeitung: Kiria ist jetzt ein forderndes Spiel.

### Monster & Schwierigkeit
- **10 neue Monsterarten** (jetzt 38): Fledermaus, Wildschwein, Bandit,
  Dunkelelf, Echsenkrieger, Harpyie, Oger, Yeti, Dunkler Ritter, Lich
- **~1160 Monster** auf der Karte (vorher ~680) — zusätzlich 45 Streu-Gruppen
  überall in der Wildnis, nicht mehr nur in festen Zonen
- Monster deutlich **stärker** (mehr Leben und Schaden auf allen Stufen)
- **Klügere KI**:
  - *Rudel-Alarm*: Wölfe, Goblins, Orks, Spinnen, Banditen u. a. rufen
    Artgenossen in der Nähe zu Hilfe, wenn sie angegriffen werden
  - *Kiting*: Fernkämpfer (Wilderer, Dunkelelfen, Harpyien, Todesfeen, Lich)
    weichen zurück, wenn man sie bedrängt
  - *Flucht*: Feiglinge (Ratten, Fledermäuse, Goblins) fliehen bei unter 25 % Leben
- **XP stark reduziert** (ca. auf 40 %) und **steilere Levelkurve** —
  hohe Level wollen jetzt verdient sein

### Kampf & Steuerung
- **Kein Auto-Hinlaufen mehr**: Ziel anvisieren, selbst laufen — angegriffen
  wird automatisch, sobald man in Reichweite ist
- **Kampfliste (Taste B)** wie in Tibia: alle Gegner in der Nähe mit
  Lebensbalken und Distanz, per Klick anvisierbar
- **XP-Teilung**: Kämpfen mehrere Spieler gegen dasselbe Monster, wird die
  Erfahrung fair nach Schadensanteil verteilt; Quest-Fortschritt zählt für alle

### Zauber
- **10 Zauber pro Beruf** (vorher 7) — die ersten 7 auf den Tasten 1–7,
  Tränke auf 8/9, alle Zauber im neuen **Zauberbuch (Taste Z)**
- **Bestienzüchter hat endlich Angriffszauber**: Exori Bestia (Krallenhieb),
  Exori Natura (Dornengeschoss), Exevo Natura (Dornensturm)
- Neue Zauber: Exori Ico, Exori Mas (Ritter) • Exori Con, Utura –
  Heilung über Zeit (Paladin) • Exori Frigo, Exevo Gran Mas Vis (Magier)
- **Utevo Lux** ist jetzt eine echte, helle Lichtquelle (4 Minuten)

### Welt
- Offeneres Gelände: **64 % der Karte begehbar** (vorher 52 %)
- **Schönere Städte**: Ring-Plaza, 6–8 Gebäude pro Stadt, Springbrunnen in
  jeder Stadt, wehende Fahnen auf den Tempeln
- **28 Quests** (+9 neue, u. a. „Der weiße Schrecken", „Der Totenbeschwörer")
- **Kompletter Spielstand-Reset** — alle starten bei null

---

## Version 7.2 – Cloud-Speicher *(2. Juli 2026)*

- **Spielstände überleben Server-Neustarts**: Speicherung in einer
  kostenlosen Cloud-Datenbank (Upstash Redis), aktiviert über
  Umgebungsvariablen — lokal weiterhin einfache Datei
- Gespeichert wird beim Ausloggen, alle 60 Sekunden und beim Herunterfahren
- Diagnose-Seite **/api/status** zeigt Speicher-Zustand, Konten und Spieler
- Robust gegen Kopierfehler (Anführungszeichen/Leerzeichen in den Schlüsseln
  werden automatisch entfernt, vertauschte Werte erkannt)

## Version 7.1 – PvP-Totenkopf & Sprechblasen *(2. Juli 2026)*

- **💀 Totenkopf-System**: Wer einen Spieler (oder dessen Tier) angreift,
  bekommt 60 Sekunden Stadtverbot — die Stadtwachen blocken
- **Sprechblasen**: Chat-Nachrichten erscheinen über dem Kopf des Sprechers
- **Tiere kämpfen im PvP mit**: Das Tier des Bestienzüchters greift
  Spieler-Ziele seines Besitzers mit an; gegnerische Tiere sind angreifbar

## Version 7.0 – Die große Welt *(2. Juli 2026)*

- **Karte 1152×1152** (vorher 576) mit **7 Städten** (+3: Sonnenhafen,
  Moorheim, Nordwacht) und neuen Orten (Krypta, Yeti-Berge kamen in v8)
- **PvP** außerhalb der Städte (in Städten herrscht Frieden)
- **Zauber per Chat sprechen** („exura", „utani hur" …) wie in Tibia
- Support-Zauber **Utani Hur** (Tempo) und **Utevo Lux** (Licht)
- **Fackel** als Hand-Ausrüstung: Licht ohne Zauberspruch
- **Weltkarte (Taste M)** — klicken zum Reisen; auch Minimap-Klick läuft los
- **8 neue Monster** (28 gesamt): Krabbe, Goblin, Skorpion, Mumie, Vampir,
  Riesenspinne, Steingolem, Feuerelementar
- **Begehbare Häuser** mit Türen und Innenräumen — Dach blendet aus,
  Händler stehen in ihren Läden, Spawn im Tempel
- **Leichen-Loot**: Beute per Klick von der Leiche nehmen (90 s Zeit)
- **Essen & Hunger**: Monster droppen Käse/Fleisch/Schinken — ohne Essen
  kaum Regeneration
- **Mounts**: Sattel-Drops (1 %) bei großen Tieren, Pferd beim Bauern,
  Taste R zum Reiten (fast doppelt so schnell)
- **Bauernhof** mit Pferden, Kühen, Ziegen — Katzen und Hunde in den Städten
- **Berufs-Ausrüstung**: Waffen je Beruf (Schwert/Bogen/Zauberstab/Krallen),
  neuer **Hosen-Slot** (6 Ausrüstungsplätze)
- **Tier-Stall**: Bestienzüchter lagert bis zu 6 Tiere und wechselt sie

## Version 6.0 – Quests & Diagonalen *(2. Juli 2026)*

- **Karte 576×576** (vorher 256) mit 4. Stadt **Eichwald** und neuen Orten:
  Ork-Festung, Minotauren-Labyrinth, Verfluchte Ruinen, Wyrm-Schlucht,
  Werwolf-Wald, Jäger-Lager
- **Quest-System**: 15 Quests mit Kette, „!"-Marker über Questgebern,
  Quest-Tracker und Questlog (Taste L)
- **8 neue Monster** (20 gesamt): Minotaurus, Zombie, Ghul, Wilderer,
  Werwolf, Ork-Berserker, Todesfee, Wyrm
- **Diagonales Laufen** (8 Richtungen) für Spieler, Monster und Wegfindung
- **Bessere Grafik**: Bloom-Glühen, Sonne/Mond/Sternenhimmel, 12 Skins mit
  Umhängen und Berufs-Ausrüstung
- **Lebendiger**: Kaninchen und Rehe (fliehen vor Spielern), fallende
  Blätter, Fackeln, Springbrunnen, 12 NPCs mit Dialogen
- Chunk-Rendering: nur die Umgebung des Spielers wird geladen

## Version 5.0 – Berufe & Bestien *(2. Juli 2026)*

- **Karte 256×256** mit 3 Städten (Kiria, Porta, Steinfels) und Straßennetz
- **4. Beruf: Bestienzüchter** — zähmt geschwächte Tiere (unter 60 % Leben),
  die mitkämpfen und mitleveln
- **Berufseigene Zauberlisten** und Fernkampf-Autoangriff für
  Paladin (Speere), Magier (Magie) und Züchter
- **NPC-Dialoge** mit Gesprächsthemen, **drehbare Kamera** (Q/E),
  **wechselbare Skins**, Ausrüstung mit 5 Slots
- Monster spawnen nur noch auf erreichbaren Kacheln

## Version 4.0 – Der 3D-Neubau *(2. Juli 2026)*

- **Kompletter Neubau** des alten 2D-Spiels als 3D-Welt (three.js)
- Autoritativer Node.js/Socket.io-Server — echtes Online-Multiplayer
- 128×128-Insel mit Stadt, Tempel, Händler, Tag/Nacht-Zyklus
- 6 Monster, 4 Zauber, Level-System, Chat, Minimap
- Charaktere mit Name + Passwort dauerhaft gespeichert

---

*Spielen: https://kiria-online.onrender.com • Code: https://github.com/ClirimLipovica/kiria-online*
