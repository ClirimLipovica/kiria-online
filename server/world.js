// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Generierung (v6)
// 576x576-Insel: 4 Städte (Kiria, Porta, Steinfels, Eichwald),
// Straßennetz, Friedhof, Verfluchte Ruinen, Ork-Festung,
// Minotauren-Labyrinth, Wyrm-Schlucht, Werwolf-Wald,
// Jäger-Lager, Drachenhöhle, Dämonen-Vulkan.
// ---------------------------------------------------------------
const { TILE, WALKABLE } = require('./constants');

const SIZE = 576;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Wert-Rauschen auf einem 192er-Gitter
function makeNoise(rand) {
  const G = 192;
  const grid = new Float32Array((G + 1) * (G + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const smooth = (t) => t * t * (3 - 2 * t);
  return function (x, y) {
    x = ((x % G) + G) % G; y = ((y % G) + G) % G;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = grid[y0 * (G + 1) + x0], b = grid[y0 * (G + 1) + x0 + 1];
    const c = grid[(y0 + 1) * (G + 1) + x0], d = grid[(y0 + 1) * (G + 1) + x0 + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function generateWorld(seed = 20260702) {
  const rand = mulberry32(seed);
  const elevNoise = makeNoise(rand);
  const moistNoise = makeNoise(rand);

  const tiles = new Uint8Array(SIZE * SIZE);
  const heights = new Uint8Array(SIZE * SIZE);
  const idx = (x, y) => y * SIZE + x;
  const inB = (x, y) => x >= 1 && y >= 1 && x < SIZE - 1 && y < SIZE - 1;

  // ---- Grundterrain: große Insel ----
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let h = 0.55 * elevNoise(x * 0.030, y * 0.030)
            + 0.30 * elevNoise(x * 0.085 + 20, y * 0.085 + 20)
            + 0.15 * elevNoise(x * 0.21 + 50, y * 0.21 + 50);
      const m = moistNoise(x * 0.05, y * 0.05);
      const edge = Math.min(1, (Math.min(x, SIZE - 1 - x, y, SIZE - 1 - y) / SIZE) * 16);
      h = h * edge + 0.15 * (1 - edge);

      let t, ht;
      if (h < 0.34)      { t = TILE.WATER; ht = 0; }
      else if (h < 0.38) { t = TILE.SAND;  ht = 1; }
      else if (h > 0.72) { t = TILE.ROCK;  ht = Math.min(5, 3 + Math.round((h - 0.72) * 10)); }
      else {
        t = TILE.GRASS; ht = h > 0.58 ? 2 : 1;
        if (m > 0.60 && rand() < 0.55) t = TILE.TREE;
        else if (m < 0.24 && rand() < 0.30) t = TILE.DIRT;
      }
      tiles[idx(x, y)] = t;
      heights[idx(x, y)] = ht;
    }
  }

  // ---- Städte ----
  const towns = [
    { name: 'Kiria',     cx: 288, cy: 288, r: 16 },
    { name: 'Porta',     cx: 140, cy: 420, r: 12 },
    { name: 'Steinfels', cx: 430, cy: 160, r: 12 },
    { name: 'Eichwald',  cx: 150, cy: 160, r: 12 },
  ];
  for (const t of towns) {
    for (let y = t.cy - t.r; y <= t.cy + t.r; y++) {
      for (let x = t.cx - t.r; x <= t.cx + t.r; x++) {
        if (!inB(x, y)) continue;
        tiles[idx(x, y)] = TILE.GRASS;
        heights[idx(x, y)] = 1;
      }
    }
  }

  // ---- Straßen (auch über Wasser = Dämme) ----
  const road = (x, y) => {
    if (!inB(x, y)) return;
    tiles[idx(x, y)] = TILE.ROAD;
    heights[idx(x, y)] = 1;
  };
  const roadH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { road(x, y); road(x, y + 1); } };
  const roadV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { road(x, y); road(x + 1, y); } };

  for (const t of towns) { roadH(t.cx - t.r - 6, t.cx + t.r + 6, t.cy); roadV(t.cy - t.r - 6, t.cy + t.r + 6, t.cx); }
  roadH(140, 288, 288); roadV(288, 420, 140);   // Kiria <-> Porta
  roadH(288, 430, 288); roadV(160, 288, 430);   // Kiria <-> Steinfels
  roadH(150, 288, 288); roadV(160, 288, 150);   // Kiria <-> Eichwald (über Westen)
  roadH(150, 430, 160);                          // Eichwald <-> Steinfels (Nordroute)

  // ---- Gebäude ----
  const buildings = [];
  const addBuilding = (kind, x, y, w, h) => {
    buildings.push({ kind, x, y, w, h });
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!inB(xx, yy)) continue;
        tiles[idx(xx, yy)] = TILE.WALL;
        heights[idx(xx, yy)] = 1;
      }
    }
  };
  const layoutTown = (t, big) => {
    const o = big ? 11 : 8;
    addBuilding('temple', t.cx - o, t.cy - o, big ? 7 : 5, big ? 6 : 5);
    addBuilding('shop', t.cx + (big ? 5 : 4), t.cy - o, big ? 7 : 6, 5);
    addBuilding('house', t.cx - o, t.cy + (big ? 6 : 4), big ? 6 : 5, big ? 5 : 4);
    addBuilding('house', t.cx + (big ? 6 : 4), t.cy + (big ? 6 : 5), big ? 6 : 5, 4);
    t.temple = { x: t.cx - o + (big ? 4 : 3), y: t.cy - o + (big ? 7 : 6) };
  };
  layoutTown(towns[0], true);
  layoutTown(towns[1], false);
  layoutTown(towns[2], false);
  layoutTown(towns[3], false);

  // Springbrunnen in Kiria (Deko, blockiert)
  const fountains = [{ x: 286, y: 285 }];
  for (const f of fountains) { tiles[idx(f.x, f.y)] = TILE.FOUNTAIN; heights[idx(f.x, f.y)] = 1; }

  // ---- Friedhof (Nordwesten, bei Eichwald) ----
  const GY = { x: 100, y: 100, r: 10 };
  for (let y = GY.y - GY.r; y <= GY.y + GY.r; y++) {
    for (let x = GY.x - GY.r; x <= GY.x + GY.r; x++) {
      if (!inB(x, y)) continue;
      tiles[idx(x, y)] = rand() < 0.22 ? TILE.GRAVE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  roadV(100 + GY.r, 160, 100); roadH(100, 150, 160);

  // ---- Verfluchte Ruinen (Südosten): Zombies, Ghule, Todesfeen ----
  const RUIN = { x: 450, y: 450, r: 16 };
  for (let y = RUIN.y - RUIN.r; y <= RUIN.y + RUIN.r; y++) {
    for (let x = RUIN.x - RUIN.r; x <= RUIN.x + RUIN.r; x++) {
      if (!inB(x, y)) continue;
      const rr = rand();
      tiles[idx(x, y)] = rr < 0.14 ? TILE.GRAVE : rr < 0.20 ? TILE.WALL : TILE.DIRT; // Mauerreste
      heights[idx(x, y)] = 1;
    }
  }
  roadH(288, RUIN.x - RUIN.r, 450); roadV(288, 450, 288);

  // ---- Ork-Festung (Süden): Mauerring mit Tor ----
  const FORT = { x: 220, y: 480, r: 11 };
  for (let y = FORT.y - FORT.r; y <= FORT.y + FORT.r; y++) {
    for (let x = FORT.x - FORT.r; x <= FORT.x + FORT.r; x++) {
      if (!inB(x, y)) continue;
      const d = Math.max(Math.abs(x - FORT.x), Math.abs(y - FORT.y));
      if (d === FORT.r) tiles[idx(x, y)] = TILE.WALL;
      else tiles[idx(x, y)] = TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  // Tor im Norden
  for (let x = FORT.x - 1; x <= FORT.x + 1; x++) tiles[idx(x, FORT.y - FORT.r)] = TILE.DIRT;
  roadV(420, FORT.y - FORT.r, 220); roadH(140, 220, 420);

  // ---- Minotauren-Labyrinth (Osten): Felsringe mit Lücken ----
  const LAB = { x: 500, y: 300, r: 12 };
  for (let y = LAB.y - LAB.r - 1; y <= LAB.y + LAB.r + 1; y++) {
    for (let x = LAB.x - LAB.r - 1; x <= LAB.x + LAB.r + 1; x++) {
      if (!inB(x, y)) continue;
      tiles[idx(x, y)] = TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  for (const ringR of [12, 8, 4]) {
    for (let a = 0; a < 360; a += 2) {
      const x = Math.round(LAB.x + Math.cos(a * Math.PI / 180) * ringR);
      const y = Math.round(LAB.y + Math.sin(a * Math.PI / 180) * ringR);
      if (inB(x, y)) { tiles[idx(x, y)] = TILE.ROCK; heights[idx(x, y)] = 3; }
    }
    // Lücken in jeden Ring schneiden (versetzt)
    const gapA = ringR === 12 ? 180 : ringR === 8 ? 0 : 90;
    for (let da = -14; da <= 14; da += 2) {
      const x = Math.round(LAB.x + Math.cos((gapA + da) * Math.PI / 180) * ringR);
      const y = Math.round(LAB.y + Math.sin((gapA + da) * Math.PI / 180) * ringR);
      if (inB(x, y)) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  roadH(430, LAB.x - LAB.r - 2, 300); roadV(288, 300, 430);

  // ---- Wyrm-Schlucht (Norden): Canyon ----
  const CANYON = { x1: 260, x2: 340, y: 64 };
  for (let x = CANYON.x1; x <= CANYON.x2; x++) {
    for (let dy = -8; dy <= 8; dy++) {
      const y = CANYON.y + dy;
      if (!inB(x, y)) continue;
      if (Math.abs(dy) >= 6) { tiles[idx(x, y)] = TILE.ROCK; heights[idx(x, y)] = 4; }
      else { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  // Eingang West + Ost offen lassen
  roadV(64, 288, 288); roadH(288, CANYON.x1, 64);

  // ---- Werwolf-Wald (Westen): dichter dunkler Wald ----
  const WWALD = { x: 64, y: 250, r: 14 };
  for (let y = WWALD.y - WWALD.r; y <= WWALD.y + WWALD.r; y++) {
    for (let x = WWALD.x - WWALD.r; x <= WWALD.x + WWALD.r; x++) {
      if (!inB(x, y)) continue;
      const d = Math.hypot(x - WWALD.x, y - WWALD.y);
      if (d > WWALD.r) continue;
      tiles[idx(x, y)] = rand() < 0.45 ? TILE.TREE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  roadH(64, 150, 250); roadV(160, 250, 150);

  // ---- Jäger-Lager (Wilderer): kleine Lichtungen mit Lagerfeuer ----
  const CAMPS = [{ x: 350, y: 380 }, { x: 210, y: 220 }];
  for (const c of CAMPS) {
    for (let y = c.y - 5; y <= c.y + 5; y++) {
      for (let x = c.x - 5; x <= c.x + 5; x++) {
        if (!inB(x, y)) continue;
        tiles[idx(x, y)] = TILE.DIRT;
        heights[idx(x, y)] = 1;
      }
    }
    tiles[idx(c.x, c.y)] = TILE.LAVA; // Lagerfeuer
  }

  // ---- Drachenhöhle (Nordost-Ecke) + Dämonen-Vulkan (Südost-Ecke) ----
  const carveLair = (LX, LY, LR, lavaP) => {
    for (let y = LY - LR - 2; y <= LY + LR + 2; y++) {
      for (let x = LX - LR - 2; x <= LX + LR + 2; x++) {
        if (!inB(x, y)) continue;
        const d = Math.hypot(x - LX, y - LY);
        if (d < LR - 2) {
          tiles[idx(x, y)] = rand() < lavaP ? TILE.LAVA : TILE.DIRT;
          heights[idx(x, y)] = 1;
        } else if (d < LR) {
          tiles[idx(x, y)] = TILE.ROCK;
          heights[idx(x, y)] = 4;
        }
      }
    }
  };
  const LAIR = { x: 520, y: 64, r: 12 };
  carveLair(LAIR.x, LAIR.y, LAIR.r, 0.10);
  for (let y = LAIR.y; y <= LAIR.y + LAIR.r + 4; y++) {
    for (let x = LAIR.x - 1; x <= LAIR.x + 1; x++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  roadV(LAIR.y + LAIR.r, 160, 520); roadH(430, 520, 160);

  const VOLC = { x: 520, y: 520, r: 14 };
  carveLair(VOLC.x, VOLC.y, VOLC.r, 0.22);
  for (let x = VOLC.x - VOLC.r - 4; x <= VOLC.x; x++) {
    for (let y = VOLC.y - 1; y <= VOLC.y + 1; y++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  roadH(RUIN.x, VOLC.x - VOLC.r, 520); roadV(450 + RUIN.r, 520, 450);

  // ---- Monster-Spawngebiete (~620 Monster) ----
  const spawns = [];
  for (const t of towns) spawns.push({ type: 'rat', count: 16, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 12 });
  spawns.push(
    { type: 'snake',    count: 16, cx: 170, cy: 460, rMin: 0, rMax: 14 },
    { type: 'snake',    count: 16, cx: 350, cy: 330, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 16, cx: 470, cy: 250, rMin: 0, rMax: 12 },
    { type: 'spider',   count: 18, cx: 210, cy: 210, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 18, cx: 340, cy: 220, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 18, cx: 240, cy: 360, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 120, cy: 240, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 330, cy: 130, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 230, cy: 320, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 380, cy: 420, rMin: 0, rMax: 14 },
    { type: 'bear',     count: 12, cx: 90,  cy: 330, rMin: 0, rMax: 12 },
    { type: 'bear',     count: 12, cx: 480, cy: 350, rMin: 0, rMax: 12 },
    { type: 'bear',     count: 12, cx: 200, cy: 100, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 390, cy: 200, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 260, cy: 160, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 320, cy: 470, rMin: 0, rMax: 12 },
    { type: 'orc',      count: 16, cx: 220, cy: 480, rMin: 0, rMax: 9 },
    { type: 'orc',      count: 16, cx: 260, cy: 430, rMin: 0, rMax: 12 },
    { type: 'orc',      count: 16, cx: 180, cy: 510, rMin: 0, rMax: 12 },
    { type: 'orc_berserker', count: 12, cx: 220, cy: 480, rMin: 0, rMax: 8 },
    { type: 'hunter',   count: 10, cx: 350, cy: 380, rMin: 0, rMax: 7 },
    { type: 'hunter',   count: 10, cx: 210, cy: 220, rMin: 0, rMax: 7 },
    { type: 'skeleton', count: 20, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'ghost',    count: 12, cx: GY.x, cy: GY.y, rMin: 0, rMax: 12 },
    { type: 'zombie',   count: 10, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'zombie',   count: 16, cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 15 },
    { type: 'ghoul',    count: 14, cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 15 },
    { type: 'banshee',  count: 8,  cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 14 },
    { type: 'werewolf', count: 12, cx: WWALD.x, cy: WWALD.y, rMin: 0, rMax: 13 },
    { type: 'minotaur', count: 12, cx: LAB.x, cy: LAB.y, rMin: 0, rMax: 11 },
    { type: 'cyclops',  count: 12, cx: 460, cy: 110, rMin: 0, rMax: 12 },
    { type: 'wyrm',     count: 6,  cx: 300, cy: 64,  rMin: 0, rMax: 30 },
    { type: 'dragon',   count: 5,  cx: LAIR.x, cy: LAIR.y, rMin: 0, rMax: 8 },
    { type: 'demon',    count: 6,  cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 10 },
  );

  // ---- NPCs mit Dialogen (Rolle merchant = Händler) ----
  const npcs = [
    // ===== Kiria =====
    { id: 'npc_marcus', name: 'Marcus', role: 'merchant', x: 296, y: 284,
      dialog: { greeting: 'Willkommen in meinem Laden, Wanderer! Ich habe alles, was ein Abenteurer braucht.',
        topics: [
          { k: 'Waren', text: 'Tränke, Waffen, Rüstungen – klick auf "Handeln"!' },
          { k: 'Kiria', text: 'Kiria ist die Hauptstadt. In allen Städten bist du sicher – Monster kommen nicht hinein.' },
          { k: 'Orte', text: 'Es gibt viel zu entdecken: den Friedhof im Nordwesten, die Ork-Festung im Süden, das Labyrinth im Osten, die Wyrm-Schlucht im Norden und die verfluchten Ruinen im Südosten...' },
        ] } },
    { id: 'npc_aldo', name: 'Priester Aldo', role: 'villager', x: 280, y: 285,
      dialog: { greeting: 'Die Götter seien mit dir, mein Kind.',
        topics: [
          { k: 'Tempel', text: 'Wenn du fällst, erwachst du im Tempel der nächsten Stadt.' },
          { k: 'Ruinen', text: 'In den verfluchten Ruinen im Südosten wandeln die Toten... Zombies, Ghule, Todesfeen. Möge das Licht dich schützen.' },
        ] } },
    { id: 'npc_bruno', name: 'Wache Bruno', role: 'villager', x: 291, y: 296,
      dialog: { greeting: 'Halt! Ach... du bist ja harmlos. Willkommen in Kiria.',
        topics: [
          { k: 'Monster', text: 'Ratten für Anfänger. Dann Schlangen, Spinnen, Wölfe. Ab Level 10: Orks, Trolle, Bären. Und lass die Finger von Minotauren, bis du stark genug bist!' },
          { k: 'Festung', text: 'Die Ork-Festung liegt im Süden, hinter Porta. Dort sammeln sich Berserker. Irgendwann brauchen wir dort einen Helden...' },
        ] } },
    { id: 'npc_koenig', name: 'König Aldemar', role: 'villager', x: 285, y: 296,
      dialog: { greeting: 'Tritt näher, Held. Das Reich braucht tapfere Kämpfer.',
        topics: [
          { k: 'Reich', text: 'Vier Städte, ein Reich: Kiria, Porta, Steinfels und Eichwald. Beschütze sie!' },
          { k: 'Bedrohung', text: 'Drachen im Nordosten, Dämonen im Süd-Vulkan. Wer sie besiegt, wird als Held gefeiert – und fürstlich belohnt.' },
        ] } },
    // ===== Porta =====
    { id: 'npc_lina', name: 'Lina', role: 'merchant', x: 148, y: 416,
      dialog: { greeting: 'Ahoi! Frische Waren, direkt vom Schiff!',
        topics: [
          { k: 'Porta', text: 'Porta ist ein ruhiges Hafenstädtchen. Am Strand südlich gibt es viele Schlangen.' },
          { k: 'Waren', text: 'Klick auf "Handeln" – für dich mache ich einen guten Preis!' },
        ] } },
    { id: 'npc_jonas', name: 'Fischer Jonas', role: 'villager', x: 136, y: 424,
      dialog: { greeting: 'Hach, früher war das Meer voller Fische...',
        topics: [
          { k: 'Bestien', text: 'Bestienzüchter können Ratten, Schlangen, Spinnen, Wölfe und Bären zähmen. Erst unter 60% Leben schwächen, dann zähmen!' },
          { k: 'Festung', text: 'Die Ork-Festung im Osten macht uns Angst. Nachts hören wir ihre Trommeln...' },
        ] } },
    { id: 'npc_mara', name: 'Priesterin Mara', role: 'villager', x: 144, y: 424,
      dialog: { greeting: 'Die Göttin des Meeres grüßt dich, Wanderer.',
        topics: [
          { k: 'Ghule', text: 'Ghule schleichen nachts um die Stadtmauern. Sie kommen aus den Ruinen im Osten. Etwas Dunkles erhebt sich dort...' },
        ] } },
    // ===== Steinfels =====
    { id: 'npc_grom', name: 'Grom', role: 'merchant', x: 438, y: 158,
      dialog: { greeting: 'Hmpf. Kaufst du was oder schaust du nur?',
        topics: [
          { k: 'Steinfels', text: 'Wir Bergleute schürfen hier Eisen. Wären da nur nicht die verdammten Trolle und Zyklopen...' },
          { k: 'Zyklopen', text: 'Nordwestlich von hier, in den Bergen. Stark wie zehn Ochsen, aber ihre Beute ist gutes Eisen wert.' },
        ] } },
    { id: 'npc_odo', name: 'Bergarbeiter Odo', role: 'villager', x: 426, y: 166,
      dialog: { greeting: 'Vorsicht in den Bergen, Fremder.',
        topics: [
          { k: 'Labyrinth', text: 'Südlich von hier liegt ein uraltes Fels-Labyrinth. Minotauren hausen darin. Man hört ihr Brüllen bis hierher!' },
          { k: 'Höhle', text: 'Die Drachenhöhle liegt im hohen Norden, folge der Straße. Geh da bloß nicht ohne beste Ausrüstung hin.' },
        ] } },
    // ===== Eichwald =====
    { id: 'npc_eira', name: 'Jägermeisterin Eira', role: 'merchant', x: 158, y: 156,
      dialog: { greeting: 'Willkommen in Eichwald, dem Dorf der Jäger.',
        topics: [
          { k: 'Wald', text: 'Unsere Wälder sind voller Leben – aber auch voller Gefahren. Spinnen, Wölfe... und Schlimmeres.' },
          { k: 'Werwölfe', text: 'Im Westwald heulen nachts die Werwölfe. Keiner von uns traut sich mehr dorthin.' },
        ] } },
    { id: 'npc_alrik', name: 'Ältester Alrik', role: 'villager', x: 146, y: 164,
      dialog: { greeting: 'Setz dich ans Feuer, Wanderer, und hör die alten Geschichten.',
        topics: [
          { k: 'Wyrm', text: 'In der Schlucht im Norden nisten die Wyrms – uralte Drachenwesen. Ihre Schuppen sind härter als Stahl.' },
          { k: 'Friedhof', text: 'Der alte Friedhof im Nordwesten... dort ruhen die Gefallenen des großen Krieges. Doch sie ruhen nicht mehr.' },
        ] } },
    { id: 'npc_finn', name: 'Finn', role: 'villager', x: 154, y: 166,
      dialog: { greeting: 'Wow, ein echter Abenteurer! Darf ich dein Schwert sehen?',
        topics: [
          { k: 'Traum', text: 'Eines Tages werde ich auch ein Held! Ich übe schon mit dem Holzschwert!' },
          { k: 'Geheimnis', text: 'Psst... ich hab gesehen, wie die Wilderer im Süden ein Lagerfeuer gemacht haben. Die führen was im Schilde!' },
        ] } },
  ];
  for (const n of npcs) {
    if (inB(n.x, n.y)) { tiles[idx(n.x, n.y)] = TILE.ROAD; heights[idx(n.x, n.y)] = 1; }
  }

  const templeSpawn = towns[0].temple;
  tiles[idx(templeSpawn.x, templeSpawn.y)] = TILE.ROAD;

  // ---- Erreichbarkeits-Maske (BFS vom Tempel) ----
  const reachable = new Uint8Array(SIZE * SIZE);
  {
    const qx = [templeSpawn.x], qy = [templeSpawn.y];
    reachable[idx(templeSpawn.x, templeSpawn.y)] = 1;
    let head = 0;
    while (head < qx.length) {
      const x = qx[head], y = qy[head]; head++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const ni = idx(nx, ny);
        if (reachable[ni] || !WALKABLE.has(tiles[ni])) continue;
        reachable[ni] = 1;
        qx.push(nx); qy.push(ny);
      }
    }
  }

  return { size: SIZE, tiles, heights, buildings, spawns, npcs, templeSpawn, towns, fountains, reachable };
}

function isWalkable(world, x, y) {
  if (x < 0 || y < 0 || x >= world.size || y >= world.size) return false;
  return WALKABLE.has(world.tiles[y * world.size + x]);
}

module.exports = { generateWorld, isWalkable, SIZE };
