// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Generierung (v7)
// 1152x1152-Insel: 7 Städte mit begehbaren Häusern (Türen!),
// Bauernhof, Friedhof, Verfluchte Ruinen + Krypta, Ork-Festung,
// Labyrinth, Wyrm-Schlucht, Werwolf-Wald, Golem-Berge,
// Drachenhöhle, Dämonen-Vulkan – und ~1000 Monster.
// ---------------------------------------------------------------
const { TILE, WALKABLE } = require('./constants');

const SIZE = 1152;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(rand) {
  const G = 256;
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

  // ---- Grundterrain ----
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let h = 0.55 * elevNoise(x * 0.022, y * 0.022)
            + 0.30 * elevNoise(x * 0.06 + 20, y * 0.06 + 20)
            + 0.15 * elevNoise(x * 0.15 + 50, y * 0.15 + 50);
      const m = moistNoise(x * 0.035, y * 0.035);
      const edge = Math.min(1, (Math.min(x, SIZE - 1 - x, y, SIZE - 1 - y) / SIZE) * 20);
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
    { name: 'Kiria',       cx: 576, cy: 576, r: 16 },
    { name: 'Porta',       cx: 280, cy: 840, r: 12 },
    { name: 'Steinfels',   cx: 860, cy: 320, r: 12 },
    { name: 'Eichwald',    cx: 300, cy: 320, r: 12 },
    { name: 'Sonnenhafen', cx: 880, cy: 880, r: 12 },
    { name: 'Moorheim',    cx: 180, cy: 576, r: 12 },
    { name: 'Nordwacht',   cx: 576, cy: 180, r: 12 },
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

  // ---- Straßen ----
  const road = (x, y) => {
    if (!inB(x, y)) return;
    tiles[idx(x, y)] = TILE.ROAD;
    heights[idx(x, y)] = 1;
  };
  const roadH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { road(x, y); road(x, y + 1); } };
  const roadV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { road(x, y); road(x + 1, y); } };

  for (const t of towns) { roadH(t.cx - t.r - 6, t.cx + t.r + 6, t.cy); roadV(t.cy - t.r - 6, t.cy + t.r + 6, t.cx); }
  roadH(280, 576, 576); roadV(576, 840, 280);   // Kiria <-> Porta
  roadH(576, 860, 576); roadV(320, 576, 860);   // Kiria <-> Steinfels (+ Golem-Berge am Weg)
  roadV(320, 576, 300);                          // Kiria-West <-> Eichwald
  roadH(180, 576, 576);                          // Kiria <-> Moorheim
  roadV(180, 576, 576);                          // Kiria <-> Nordwacht
  roadH(576, 880, 880); roadV(576, 880, 880);   // Kiria-Süd <-> Sonnenhafen (über Osten)
  roadH(300, 576, 320);                          // Eichwald <-> Nordwacht-Route
  // POI-Zufahrten
  roadH(200, 300, 200); roadV(200, 320, 300);   // Friedhof
  roadV(840, 960, 280); roadH(280, 440, 960);   // Ork-Festung (Porta-Straße verlängert)
  roadV(576, 712, 450);                          // Skorpion-Öde
  roadH(860, 1000, 600); roadV(576, 600, 860);  // Labyrinth
  roadH(860, 1040, 320); roadV(140, 320, 1040); // Drachenhöhle
  roadH(880, 1026, 1040); roadV(880, 1040, 880); // Vulkan
  roadV(140, 180, 576);                          // Wyrm-Schlucht
  roadV(500, 576, 180); roadH(128, 180, 500);   // Werwolf-Wald
  roadH(860, 920, 220);                          // Zyklopen
  roadH(576, 640, 510); roadV(510, 576, 640);   // Bauernhof

  // ---- Gebäude: begehbar (Mauer-Ring, Boden innen, Tür im Süden) ----
  const buildings = [];
  const addBuilding = (kind, x, y, w, h) => {
    const doorX = x + Math.floor(w / 2);
    buildings.push({ kind, x, y, w, h, doorX });
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!inB(xx, yy)) continue;
        const border = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
        tiles[idx(xx, yy)] = border ? TILE.WALL : TILE.FLOOR;
        heights[idx(xx, yy)] = 1;
      }
    }
    // Tür (Süden)
    if (inB(doorX, y + h - 1)) tiles[idx(doorX, y + h - 1)] = TILE.FLOOR;
  };
  const layoutTown = (t, big) => {
    const o = big ? 11 : 8;
    addBuilding('temple', t.cx - o, t.cy - o, big ? 8 : 6, big ? 7 : 6);
    addBuilding('shop', t.cx + (big ? 4 : 3), t.cy - o, big ? 8 : 7, big ? 7 : 6);
    addBuilding('house', t.cx - o, t.cy + (big ? 6 : 4), 6, 5);
    addBuilding('house', t.cx + (big ? 6 : 4), t.cy + (big ? 6 : 5), 6, 5);
    t.temple = { x: t.cx - o + (big ? 4 : 3), y: t.cy - o + (big ? 3 : 3) };  // im Tempel
    t.shopPos = { x: t.cx + (big ? 4 : 3) + (big ? 4 : 3), y: t.cy - o + (big ? 3 : 3) }; // im Laden
  };
  towns.forEach((t, i) => layoutTown(t, i === 0));

  // Springbrunnen in Kiria
  const fountains = [{ x: 570, y: 582 }];
  for (const f of fountains) { tiles[idx(f.x, f.y)] = TILE.FOUNTAIN; heights[idx(f.x, f.y)] = 1; }

  // ---- Bauernhof (Koppel mit Tor, Scheune) ----
  const farm = { x: 628, y: 498, w: 26, h: 17 };
  for (let y = farm.y; y < farm.y + farm.h; y++) {
    for (let x = farm.x; x < farm.x + farm.w; x++) {
      if (!inB(x, y)) continue;
      const border = x === farm.x || x === farm.x + farm.w - 1 || y === farm.y || y === farm.y + farm.h - 1;
      tiles[idx(x, y)] = border ? TILE.WALL : TILE.GRASS;
      heights[idx(x, y)] = 1;
    }
  }
  // Tor (Süden, 2 Kacheln) + Scheune in der Ecke
  tiles[idx(farm.x + 12, farm.y + farm.h - 1)] = TILE.ROAD;
  tiles[idx(farm.x + 13, farm.y + farm.h - 1)] = TILE.ROAD;
  addBuilding('house', farm.x + 2, farm.y + 2, 7, 5); // Scheune

  // ---- Friedhof ----
  const GY = { x: 200, y: 200, r: 10 };
  for (let y = GY.y - GY.r; y <= GY.y + GY.r; y++) {
    for (let x = GY.x - GY.r; x <= GY.x + GY.r; x++) {
      if (!inB(x, y)) continue;
      tiles[idx(x, y)] = rand() < 0.22 ? TILE.GRAVE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }

  // ---- Verfluchte Ruinen + Krypta (Osten, bei Sonnenhafen) ----
  const RUIN = { x: 900, y: 700, r: 18 };
  for (let y = RUIN.y - RUIN.r; y <= RUIN.y + RUIN.r; y++) {
    for (let x = RUIN.x - RUIN.r; x <= RUIN.x + RUIN.r; x++) {
      if (!inB(x, y)) continue;
      const rr = rand();
      tiles[idx(x, y)] = rr < 0.13 ? TILE.GRAVE : rr < 0.19 ? TILE.WALL : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  roadV(600, RUIN.y - RUIN.r, 880); roadH(880, 900, 682);

  // ---- Ork-Festung ----
  const FORT = { x: 440, y: 960, r: 11 };
  for (let y = FORT.y - FORT.r; y <= FORT.y + FORT.r; y++) {
    for (let x = FORT.x - FORT.r; x <= FORT.x + FORT.r; x++) {
      if (!inB(x, y)) continue;
      const d = Math.max(Math.abs(x - FORT.x), Math.abs(y - FORT.y));
      tiles[idx(x, y)] = d === FORT.r ? TILE.WALL : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  // Tor im Westen (dort kommt die Straße an)
  tiles[idx(FORT.x - FORT.r, FORT.y)] = TILE.DIRT;
  tiles[idx(FORT.x - FORT.r, FORT.y + 1)] = TILE.DIRT;

  // ---- Minotauren-Labyrinth ----
  const LAB = { x: 1000, y: 600, r: 12 };
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
    const gapA = ringR === 12 ? 180 : ringR === 8 ? 0 : 90;
    for (let da = -14; da <= 14; da += 2) {
      const x = Math.round(LAB.x + Math.cos((gapA + da) * Math.PI / 180) * ringR);
      const y = Math.round(LAB.y + Math.sin((gapA + da) * Math.PI / 180) * ringR);
      if (inB(x, y)) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }

  // ---- Wyrm-Schlucht (Canyon im Norden) ----
  for (let x = 520; x <= 680; x++) {
    for (let dy = -8; dy <= 8; dy++) {
      const y = 128 + dy;
      if (!inB(x, y)) continue;
      if (Math.abs(dy) >= 6) { tiles[idx(x, y)] = TILE.ROCK; heights[idx(x, y)] = 4; }
      else { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }

  // ---- Werwolf-Wald ----
  const WWALD = { x: 128, y: 500, r: 14 };
  for (let y = WWALD.y - WWALD.r; y <= WWALD.y + WWALD.r; y++) {
    for (let x = WWALD.x - WWALD.r; x <= WWALD.x + WWALD.r; x++) {
      if (!inB(x, y)) continue;
      const d = Math.hypot(x - WWALD.x, y - WWALD.y);
      if (d > WWALD.r) continue;
      tiles[idx(x, y)] = rand() < 0.45 ? TILE.TREE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }

  // ---- Jäger-Lager ----
  const CAMPS = [{ x: 700, y: 760 }, { x: 420, y: 440 }];
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

  // ---- Drachenhöhle + Dämonen-Vulkan ----
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
  const LAIR = { x: 1040, y: 128, r: 12 };
  carveLair(LAIR.x, LAIR.y, LAIR.r, 0.10);
  for (let y = LAIR.y; y <= LAIR.y + LAIR.r + 4; y++) {
    for (let x = LAIR.x - 1; x <= LAIR.x + 1; x++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  const VOLC = { x: 1040, y: 1040, r: 14 };
  carveLair(VOLC.x, VOLC.y, VOLC.r, 0.22);
  for (let x = VOLC.x - VOLC.r - 4; x <= VOLC.x; x++) {
    for (let y = VOLC.y - 1; y <= VOLC.y + 1; y++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }

  // ---- Monster-Spawngebiete (~1000) ----
  const spawns = [];
  for (const t of towns) spawns.push({ type: 'rat', count: 14, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 12 });
  spawns.push(
    { type: 'crab',     count: 12, cx: 240, cy: 900, rMin: 0, rMax: 14 },
    { type: 'crab',     count: 12, cx: 930, cy: 940, rMin: 0, rMax: 14 },
    { type: 'goblin',   count: 14, cx: 560, cy: 260, rMin: 0, rMax: 12 },
    { type: 'goblin',   count: 14, cx: 340, cy: 540, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 16, cx: 320, cy: 900, rMin: 0, rMax: 14 },
    { type: 'snake',    count: 14, cx: 700, cy: 660, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 14, cx: 940, cy: 500, rMin: 0, rMax: 12 },
    { type: 'spider',   count: 18, cx: 420, cy: 420, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 18, cx: 680, cy: 440, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 18, cx: 480, cy: 720, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 240, cy: 480, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 660, cy: 260, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 460, cy: 640, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 760, cy: 840, rMin: 0, rMax: 14 },
    { type: 'scorpion', count: 14, cx: 700, cy: 900, rMin: 0, rMax: 12 },
    { type: 'scorpion', count: 12, cx: 450, cy: 700, rMin: 0, rMax: 12 },
    { type: 'bear',     count: 12, cx: 160, cy: 700, rMin: 0, rMax: 12 },
    { type: 'bear',     count: 12, cx: 960, cy: 540, rMin: 0, rMax: 12 },
    { type: 'bear',     count: 12, cx: 400, cy: 200, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 780, cy: 400, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 520, cy: 340, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 640, cy: 940, rMin: 0, rMax: 12 },
    { type: 'orc',      count: 16, cx: 440, cy: 960, rMin: 0, rMax: 9 },
    { type: 'orc',      count: 16, cx: 500, cy: 900, rMin: 0, rMax: 12 },
    { type: 'orc',      count: 16, cx: 380, cy: 1010, rMin: 0, rMax: 12 },
    { type: 'orc_berserker', count: 12, cx: 440, cy: 960, rMin: 0, rMax: 8 },
    { type: 'hunter',   count: 10, cx: 700, cy: 760, rMin: 0, rMax: 7 },
    { type: 'hunter',   count: 10, cx: 420, cy: 440, rMin: 0, rMax: 7 },
    { type: 'skeleton', count: 20, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'ghost',    count: 12, cx: GY.x, cy: GY.y, rMin: 0, rMax: 12 },
    { type: 'zombie',   count: 10, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'zombie',   count: 16, cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 17 },
    { type: 'ghoul',    count: 14, cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 17 },
    { type: 'banshee',  count: 8,  cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 16 },
    { type: 'mummy',    count: 12, cx: RUIN.x, cy: RUIN.y - 10, rMin: 0, rMax: 12 },
    { type: 'vampire',  count: 6,  cx: RUIN.x, cy: RUIN.y - 10, rMin: 0, rMax: 10 },
    { type: 'giant_spider', count: 10, cx: 250, cy: 450, rMin: 0, rMax: 12 },
    { type: 'giant_spider', count: 10, cx: 760, cy: 560, rMin: 0, rMax: 12 },
    { type: 'werewolf', count: 12, cx: WWALD.x, cy: WWALD.y, rMin: 0, rMax: 13 },
    { type: 'minotaur', count: 12, cx: LAB.x, cy: LAB.y, rMin: 0, rMax: 11 },
    { type: 'cyclops',  count: 12, cx: 920, cy: 220, rMin: 0, rMax: 12 },
    { type: 'golem',    count: 10, cx: 860, cy: 440, rMin: 0, rMax: 12 },
    { type: 'wyrm',     count: 6,  cx: 600, cy: 128, rMin: 0, rMax: 60 },
    { type: 'dragon',   count: 5,  cx: LAIR.x, cy: LAIR.y, rMin: 0, rMax: 8 },
    { type: 'fire_elemental', count: 8, cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 12 },
    { type: 'demon',    count: 6,  cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 10 },
  );

  // ---- NPCs ----
  // Händler stehen IN ihren Läden, Priester/König im Tempel.
  const T = towns;
  const npcs = [
    // Kiria
    { id: 'npc_marcus', name: 'Marcus', role: 'merchant', x: T[0].shopPos.x, y: T[0].shopPos.y,
      dialog: { greeting: 'Willkommen in meinem Laden! Anfänger-Ausrüstung für jeden Beruf.', topics: [
        { k: 'Waren', text: 'Waffen für alle Berufe: Schwert, Bogen, Zauberstab, Bestien-Handschuhe. Und vergiss Brot und eine Fackel nicht!' },
        { k: 'Essen', text: 'Iss regelmäßig! Mit leerem Magen heilen deine Wunden kaum. Monster lassen Fleisch und Käse fallen.' },
        { k: 'Mounts', text: 'Große Bestien lassen ganz selten Sättel fallen. Damit kannst du sie reiten! Ein Pferd bekommst du günstiger – frag Bauer Henrik nördlich der Stadt.' },
      ] } },
    { id: 'npc_aldo', name: 'Priester Aldo', role: 'villager', x: T[0].temple.x - 2, y: T[0].temple.y,
      dialog: { greeting: 'Die Götter seien mit dir, mein Kind.', topics: [
        { k: 'Tempel', text: 'Wenn du fällst, erwachst du im Tempel der nächsten Stadt.' },
        { k: 'PvP', text: 'Draußen in der Wildnis kämpfen Spieler auch gegeneinander. In den Städten wacht der Friede der Götter – hier kann dir niemand etwas antun.' },
      ] } },
    { id: 'npc_bruno', name: 'Wache Bruno', role: 'villager', x: 581, y: 588,
      dialog: { greeting: 'Halt! Ach... du bist ja harmlos. Willkommen in Kiria.', topics: [
        { k: 'Monster', text: 'Ratten und Goblins für Anfänger. Dann Schlangen, Spinnen, Wölfe... und irgendwann Drachen, wenn du dich traust.' },
        { k: 'Zauber', text: 'Du kannst Zaubersprüche auch sprechen! Tippe sie einfach in den Chat: "exura", "utani hur", "utevo lux"...' },
      ] } },
    { id: 'npc_koenig', name: 'König Aldemar', role: 'villager', x: T[0].temple.x + 2, y: T[0].temple.y,
      dialog: { greeting: 'Tritt näher, Held. Das Reich braucht tapfere Kämpfer.', topics: [
        { k: 'Reich', text: 'Sieben Städte, ein Reich: Kiria, Porta, Steinfels, Eichwald, Sonnenhafen, Moorheim und Nordwacht.' },
        { k: 'Bedrohung', text: 'Drachen im Nordosten, Dämonen im Vulkan, ein Vampirfürst in der Krypta... Helden werden gebraucht!' },
      ] } },
    // Porta
    { id: 'npc_lina', name: 'Lina', role: 'merchant', x: T[1].shopPos.x, y: T[1].shopPos.y,
      dialog: { greeting: 'Ahoi! Frische Waren, direkt vom Schiff!', topics: [
        { k: 'Porta', text: 'Am Strand südlich gibt es Schlangen und Krabben. Gute Beute für den Anfang!' },
      ] } },
    { id: 'npc_jonas', name: 'Fischer Jonas', role: 'villager', x: 272, y: 846,
      dialog: { greeting: 'Hach, früher war das Meer voller Fische...', topics: [
        { k: 'Bestien', text: 'Bestienzüchter können viele Tiere zähmen – und im Stall lagern! Erst unter 60% Leben schwächen, dann zähmen.' },
      ] } },
    { id: 'npc_mara', name: 'Priesterin Mara', role: 'villager', x: T[1].temple.x, y: T[1].temple.y,
      dialog: { greeting: 'Die Göttin des Meeres grüßt dich, Wanderer.', topics: [
        { k: 'Ghule', text: 'Ghule schleichen nachts aus den Ruinen im Osten. Etwas Dunkles erhebt sich dort...' },
      ] } },
    // Steinfels
    { id: 'npc_grom', name: 'Grom', role: 'merchant', x: T[2].shopPos.x, y: T[2].shopPos.y,
      dialog: { greeting: 'Hmpf. Kaufst du was oder schaust du nur?', topics: [
        { k: 'Zyklopen', text: 'Westlich von hier hausen Zyklopen. Und in den Bergen südlich sind Golems erwacht – lebendiger Stein!' },
      ] } },
    { id: 'npc_odo', name: 'Bergarbeiter Odo', role: 'villager', x: 856, y: 326,
      dialog: { greeting: 'Vorsicht in den Bergen, Fremder.', topics: [
        { k: 'Labyrinth', text: 'Südöstlich liegt das Fels-Labyrinth der Minotauren. Man hört ihr Brüllen bis hierher!' },
        { k: 'Höhle', text: 'Die Drachenhöhle liegt im hohen Nordosten. Geh da bloß nicht ohne beste Ausrüstung hin.' },
      ] } },
    // Eichwald
    { id: 'npc_eira', name: 'Jägermeisterin Eira', role: 'merchant', x: T[3].shopPos.x, y: T[3].shopPos.y,
      dialog: { greeting: 'Willkommen in Eichwald, dem Dorf der Jäger.', topics: [
        { k: 'Werwölfe', text: 'Im Westwald heulen nachts die Werwölfe. Keiner von uns traut sich mehr dorthin.' },
        { k: 'Riesenspinnen', text: 'Tief im Wald lauern Riesenspinnen. Manche Züchter reiten sogar auf ihnen!' },
      ] } },
    { id: 'npc_alrik', name: 'Ältester Alrik', role: 'villager', x: 294, y: 326,
      dialog: { greeting: 'Setz dich ans Feuer, Wanderer, und hör die alten Geschichten.', topics: [
        { k: 'Wyrm', text: 'In der Schlucht im Norden nisten die Wyrms – uralte Drachenwesen.' },
        { k: 'Friedhof', text: 'Der alte Friedhof im Nordwesten... dort ruhen die Gefallenen nicht mehr.' },
      ] } },
    { id: 'npc_finn', name: 'Finn', role: 'villager', x: 302, y: 328,
      dialog: { greeting: 'Wow, ein echter Abenteurer! Darf ich dein Schwert sehen?', topics: [
        { k: 'Traum', text: 'Eines Tages reite ich einen Drachen! Bauer Henrik sagt, es gibt sogar Drachensättel...' },
      ] } },
    // Sonnenhafen
    { id: 'npc_rollo', name: 'Kapitän Rollo', role: 'merchant', x: T[4].shopPos.x, y: T[4].shopPos.y,
      dialog: { greeting: 'Willkommen in Sonnenhafen, der Perle des Ostens!', topics: [
        { k: 'Hafen', text: 'Von hier segeln wir die Küste entlang. Am Strand gibt es Krabben – und im Norden die verfluchten Ruinen.' },
      ] } },
    { id: 'npc_sera', name: 'Priesterin Sera', role: 'villager', x: T[4].temple.x, y: T[4].temple.y,
      dialog: { greeting: 'Das Licht schütze dich, Reisender.', topics: [
        { k: 'Krypta', text: 'In der alten Krypta bei den Ruinen wandeln Mumien... und ihr Herr, der Blutfürst. Ein Vampir, älter als die Stadt selbst.' },
      ] } },
    // Moorheim
    { id: 'npc_jorn', name: 'Sumpf-Jorn', role: 'merchant', x: T[5].shopPos.x, y: T[5].shopPos.y,
      dialog: { greeting: 'Willkommen im Moor. Pass auf, wo du hintrittst.', topics: [
        { k: 'Moor', text: 'Westlich liegt der Werwolf-Wald. Und die Bären hier sind größer als anderswo...' },
      ] } },
    { id: 'npc_bragi', name: 'Ältester Bragi', role: 'villager', x: 174, y: 582,
      dialog: { greeting: 'Moorheim heißt dich willkommen, Fremder.', topics: [
        { k: 'Golems', text: 'In den Bergen im Osten sind Steingolems erwacht. Uralte Wächter... aber was bewachen sie?' },
      ] } },
    // Nordwacht
    { id: 'npc_ida', name: 'Händlerin Ida', role: 'merchant', x: T[6].shopPos.x, y: T[6].shopPos.y,
      dialog: { greeting: 'Willkommen in Nordwacht, dem Tor zum Norden!', topics: [
        { k: 'Norden', text: 'Hinter uns liegt nur noch die Wyrm-Schlucht und ewiger Fels. Rüste dich gut aus!' },
      ] } },
    { id: 'npc_ulf', name: 'Wache Ulf', role: 'villager', x: 570, y: 186,
      dialog: { greeting: 'Nordwacht hält stand! Was willst du, Zivilist?', topics: [
        { k: 'Goblins', text: 'Goblin-Gesindel treibt sich in den Hügeln herum. Sie stehlen alles, was nicht niet- und nagelfest ist!' },
      ] } },
    // Bauernhof
    { id: 'npc_henrik', name: 'Bauer Henrik', role: 'merchant', x: farm.x + 12, y: farm.y + farm.h,
      shop: ['saddle_horse', 'cheese', 'bread', 'meat', 'ham'],
      dialog: { greeting: 'Na, willst du meine Tiere anschauen? Die Pferde sind mein Stolz!', topics: [
        { k: 'Pferde', text: 'Ein gutes Pferd trägt dich doppelt so schnell durchs Land. Für 2000 Gold gehört dir ein Sattel samt Pferd!' },
        { k: 'Hof', text: 'Kühe, Ziegen, Pferde... alles selbst gezüchtet. Nur die Wölfe machen mir Sorgen.' },
      ] } },
  ];
  for (const n of npcs) {
    if (inB(n.x, n.y) && !WALKABLE.has(tiles[idx(n.x, n.y)])) {
      tiles[idx(n.x, n.y)] = TILE.FLOOR;
      heights[idx(n.x, n.y)] = 1;
    }
  }

  const templeSpawn = towns[0].temple;

  // ---- Erreichbarkeits-Maske ----
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

  return { size: SIZE, tiles, heights, buildings, spawns, npcs, templeSpawn, towns, fountains, farm, reachable };
}

function isWalkable(world, x, y) {
  if (x < 0 || y < 0 || x >= world.size || y >= world.size) return false;
  return WALKABLE.has(world.tiles[y * world.size + x]);
}

module.exports = { generateWorld, isWalkable, SIZE };
