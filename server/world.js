// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Generierung (v5)
// 256x256-Insel mit drei Städten (Kiria, Porta, Steinfels),
// Straßennetz, Friedhof, Drachenhöhle und Dämonen-Vulkan.
// ---------------------------------------------------------------
const { TILE, WALKABLE } = require('./constants');

const SIZE = 256;

// Deterministischer Zufallsgenerator
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Einfaches Wert-Rauschen auf einem 128er-Gitter
function makeNoise(rand) {
  const G = 128;
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

  // ---- Grundterrain: große Insel mit Wasser am Rand ----
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let h = 0.55 * elevNoise(x * 0.045, y * 0.045)
            + 0.30 * elevNoise(x * 0.11 + 20, y * 0.11 + 20)
            + 0.15 * elevNoise(x * 0.25 + 50, y * 0.25 + 50);
      const m = moistNoise(x * 0.07, y * 0.07);
      const edge = Math.min(1, (Math.min(x, SIZE - 1 - x, y, SIZE - 1 - y) / SIZE) * 14);
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
  // Jede Stadt: Zentrum, Radius (Schutzzone), Tempel-Spawnpunkt
  const towns = [
    { name: 'Kiria',     cx: 128, cy: 128, r: 16 },
    { name: 'Porta',     cx: 64,  cy: 192, r: 12 },
    { name: 'Steinfels', cx: 192, cy: 72,  r: 12 },
  ];

  const flatten = (t) => {
    for (let y = t.cy - t.r; y <= t.cy + t.r; y++) {
      for (let x = t.cx - t.r; x <= t.cx + t.r; x++) {
        if (!inB(x, y)) continue;
        tiles[idx(x, y)] = TILE.GRASS;
        heights[idx(x, y)] = 1;
      }
    }
  };
  towns.forEach(flatten);

  // ---- Straßen (auch über Wasser = Dämme, damit alles verbunden ist) ----
  const road = (x, y) => {
    if (!inB(x, y)) return;
    tiles[idx(x, y)] = TILE.ROAD;
    heights[idx(x, y)] = 1;
  };
  const roadH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { road(x, y); road(x, y + 1); } };
  const roadV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) { road(x, y); road(x + 1, y); } };

  // Stadtkreuze
  for (const t of towns) { roadH(t.cx - t.r - 6, t.cx + t.r + 6, t.cy); roadV(t.cy - t.r - 6, t.cy + t.r + 6, t.cx); }
  // Kiria <-> Porta (über Westen, dann Süden)
  roadH(64, 128, 128); roadV(128, 192, 64);
  // Kiria <-> Steinfels (über Osten, dann Norden)
  roadH(128, 192, 128); roadV(72, 128, 192);
  // Steinfels -> Zyklopen-Berge (Gebirgspass nach Süden)
  roadV(72, 96, 208);

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

  // Kiria (Hauptstadt)
  addBuilding('temple', 117, 117, 7, 6);
  addBuilding('shop',   133, 117, 7, 6);
  addBuilding('house',  117, 134, 6, 5);
  addBuilding('house',  134, 134, 6, 5);
  towns[0].temple = { x: 121, y: 124 };

  // Porta (Hafenstadt)
  addBuilding('temple', 56, 184, 5, 5);
  addBuilding('shop',   68, 184, 6, 5);
  addBuilding('house',  56, 196, 5, 4);
  addBuilding('house',  68, 197, 5, 4);
  towns[1].temple = { x: 58, y: 190 };

  // Steinfels (Bergdorf)
  addBuilding('temple', 184, 64, 5, 5);
  addBuilding('shop',   196, 64, 6, 5);
  addBuilding('house',  184, 76, 5, 4);
  addBuilding('house',  196, 77, 5, 4);
  towns[2].temple = { x: 186, y: 70 };

  // ---- Friedhof (Nordwesten) ----
  const GY = { x: 44, y: 44, r: 9 };
  for (let y = GY.y - GY.r; y <= GY.y + GY.r; y++) {
    for (let x = GY.x - GY.r; x <= GY.x + GY.r; x++) {
      if (!inB(x, y)) continue;
      tiles[idx(x, y)] = rand() < 0.22 ? TILE.GRAVE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }
  // Weg vom Friedhof zur Kiria-Weststraße
  roadV(44 + GY.r, 128, 44);

  // ---- Drachenhöhle (Nordosten) ----
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
  const LAIR = { x: 224, y: 28, r: 11 };
  carveLair(LAIR.x, LAIR.y, LAIR.r, 0.10);
  // Eingang von Süden
  for (let y = LAIR.y; y <= LAIR.y + LAIR.r + 4; y++) {
    for (let x = LAIR.x - 1; x <= LAIR.x + 1; x++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  // Weg zum Höhleneingang
  roadV(LAIR.y + LAIR.r, 72, 224); roadH(192, 224, 72);

  // ---- Dämonen-Vulkan (Südosten) ----
  const VOLC = { x: 224, y: 224, r: 13 };
  carveLair(VOLC.x, VOLC.y, VOLC.r, 0.22);
  // Eingang von Westen
  for (let x = VOLC.x - VOLC.r - 4; x <= VOLC.x; x++) {
    for (let y = VOLC.y - 1; y <= VOLC.y + 1; y++) {
      if (inB(x, y) && tiles[idx(x, y)] !== TILE.LAVA) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }
  roadH(140, VOLC.x - VOLC.r, 224); roadV(128, 224, 140);

  // ---- Monster-Spawngebiete (~290 Monster) ----
  const spawns = [];
  // Ratten rund um jede Stadt
  for (const t of towns) spawns.push({ type: 'rat', count: 14, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 10 });
  spawns.push(
    { type: 'snake',    count: 14, cx: 96,  cy: 216, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 14, cx: 200, cy: 150, rMin: 0, rMax: 12 },
    { type: 'spider',   count: 16, cx: 90,  cy: 90,  rMin: 0, rMax: 14 },
    { type: 'spider',   count: 16, cx: 160, cy: 200, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 60,  cy: 100, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 150, cy: 60,  rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 100, cy: 160, rMin: 0, rMax: 14 },
    { type: 'bear',     count: 10, cx: 40,  cy: 70,  rMin: 0, rMax: 12 },
    { type: 'bear',     count: 10, cx: 216, cy: 130, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 110, cy: 200, rMin: 0, rMax: 12 },
    { type: 'troll',    count: 12, cx: 168, cy: 40,  rMin: 0, rMax: 12 },
    { type: 'orc',      count: 14, cx: 176, cy: 176, rMin: 0, rMax: 12 },
    { type: 'orc',      count: 14, cx: 76,  cy: 152, rMin: 0, rMax: 10 },
    { type: 'orc',      count: 14, cx: 140, cy: 216, rMin: 0, rMax: 12 },
    { type: 'skeleton', count: 20, cx: GY.x, cy: GY.y, rMin: 0, rMax: 10 },
    { type: 'ghost',    count: 14, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'cyclops',  count: 10, cx: 208, cy: 96,  rMin: 0, rMax: 11 },
    { type: 'dragon',   count: 5,  cx: LAIR.x, cy: LAIR.y, rMin: 0, rMax: 7 },
    { type: 'demon',    count: 5,  cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 9 },
  );

  // ---- NPCs mit Dialogen ----
  const npcs = [
    {
      id: 'npc_marcus', name: 'Marcus', role: 'merchant', x: 136, y: 124,
      dialog: {
        greeting: 'Willkommen in meinem Laden, Wanderer! Ich habe alles, was ein Abenteurer braucht.',
        topics: [
          { k: 'Waren', text: 'Tränke, Waffen, Rüstungen – klick auf "Handeln" und sieh selbst!' },
          { k: 'Kiria', text: 'Kiria ist die Hauptstadt der Insel. In der Stadt bist du sicher – Monster trauen sich nicht hinein.' },
          { k: 'Gerüchte', text: 'Man sagt, im Nordosten hause ein Drache... und im Süd-Vulkan lauern Dämonen. Geh da nur mit guter Ausrüstung hin!' },
        ],
      },
    },
    {
      id: 'npc_aldo', name: 'Priester Aldo', role: 'villager', x: 120, y: 125,
      dialog: {
        greeting: 'Die Götter seien mit dir, mein Kind.',
        topics: [
          { k: 'Tempel', text: 'Wenn du fällst, erwachst du im Tempel der nächsten Stadt. Die Götter wachen über dich.' },
          { k: 'Heilung', text: 'Sprich "Exura", um dich zu heilen. Mit Taste 1 geht es am schnellsten.' },
          { k: 'Beruf', text: 'Ritter, Paladine, Magier und Bestienzüchter – jeder Weg hat seine Stärken.' },
        ],
      },
    },
    {
      id: 'npc_bruno', name: 'Wache Bruno', role: 'villager', x: 131, y: 133,
      dialog: {
        greeting: 'Halt! Ach... du bist ja harmlos. Willkommen in Kiria.',
        topics: [
          { k: 'Monster', text: 'Ratten und Schlangen sind für Anfänger. Wölfe und Spinnen im Wald sind schon zäher. Orks, Trolle, Bären... erst ab Level 10!' },
          { k: 'Friedhof', text: 'Der alte Friedhof im Nordwesten wimmelt von Skeletten und Geistern. Nichts für schwache Nerven.' },
          { k: 'Straßen', text: 'Folge den Straßen! Sie verbinden Kiria mit Porta im Südwesten und Steinfels im Nordosten.' },
        ],
      },
    },
    {
      id: 'npc_lina', name: 'Lina', role: 'merchant', x: 71, y: 190,
      dialog: {
        greeting: 'Ahoi! Frische Waren, direkt vom Schiff!',
        topics: [
          { k: 'Porta', text: 'Porta ist ein ruhiges Hafenstädtchen. Am Strand südlich gibt es viele Schlangen.' },
          { k: 'Waren', text: 'Klick auf "Handeln" – für dich mache ich einen guten Preis!' },
        ],
      },
    },
    {
      id: 'npc_jonas', name: 'Fischer Jonas', role: 'villager', x: 60, y: 195,
      dialog: {
        greeting: 'Hach, früher war das Meer voller Fische...',
        topics: [
          { k: 'Drache', text: 'Ich hab ihn gesehen! Ein riesiger roter Drache, hoch im Nordosten! Sein Feuer schmilzt Stein!' },
          { k: 'Bestien', text: 'Bestienzüchter können Ratten, Schlangen, Spinnen, Wölfe und sogar Bären zähmen. Erst schwächen, dann zähmen!' },
        ],
      },
    },
    {
      id: 'npc_grom', name: 'Grom', role: 'merchant', x: 199, y: 70,
      dialog: {
        greeting: 'Hmpf. Kaufst du was oder schaust du nur?',
        topics: [
          { k: 'Steinfels', text: 'Wir Bergleute schürfen hier Eisen. Wären da nur nicht die verdammten Zyklopen...' },
          { k: 'Zyklopen', text: 'Südöstlich von hier, in den Bergen. Stark wie zehn Ochsen. Aber ihre Beute ist gutes Eisen wert.' },
        ],
      },
    },
    {
      id: 'npc_odo', name: 'Bergarbeiter Odo', role: 'villager', x: 187, y: 76,
      dialog: {
        greeting: 'Vorsicht in den Bergen, Fremder.',
        topics: [
          { k: 'Höhle', text: 'Die Drachenhöhle liegt nördlich von hier. Folge der Straße nach Norden... wenn du dich traust.' },
          { k: 'Ausrüstung', text: 'Ohne Helm, Schild und gute Rüstung würde ich da nicht hingehen. Zyklopen lassen manchmal Eisenzeug fallen.' },
        ],
      },
    },
  ];
  // NPC-Kacheln freiräumen
  for (const n of npcs) {
    if (inB(n.x, n.y)) { tiles[idx(n.x, n.y)] = TILE.ROAD; heights[idx(n.x, n.y)] = 1; }
  }

  const templeSpawn = towns[0].temple;
  tiles[idx(templeSpawn.x, templeSpawn.y)] = TILE.ROAD;

  // Erreichbarkeits-Maske: nur Kacheln, die man vom Tempel aus
  // zu Fuß erreichen kann (verhindert Spawns in Wald-/Fels-Taschen)
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

  return { size: SIZE, tiles, heights, buildings, spawns, npcs, templeSpawn, towns, reachable };
}

function isWalkable(world, x, y) {
  if (x < 0 || y < 0 || x >= world.size || y >= world.size) return false;
  return WALKABLE.has(world.tiles[y * world.size + x]);
}

module.exports = { generateWorld, isWalkable, SIZE };
