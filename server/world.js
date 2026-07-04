// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Generierung (v9)
// 1152x1152: offeneres Gelände, 7 Städte, ~1800 Monster aus 68
// Arten – verteilt über die GANZE Karte (feste Zonen + viele
// Streu-Spawns) sowie Boss-Plätze und Weltboss-Erscheinungsorte.
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

  // ---- Grundterrain: offener als früher (weniger Wald-/Felsriegel) ----
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let h = 0.55 * elevNoise(x * 0.022, y * 0.022)
            + 0.30 * elevNoise(x * 0.06 + 20, y * 0.06 + 20)
            + 0.15 * elevNoise(x * 0.15 + 50, y * 0.15 + 50);
      const m = moistNoise(x * 0.035, y * 0.035);
      const edge = Math.min(1, (Math.min(x, SIZE - 1 - x, y, SIZE - 1 - y) / SIZE) * 20);
      h = h * edge + 0.15 * (1 - edge);

      let t, ht;
      if (h < 0.33)      { t = TILE.WATER; ht = 0; }
      else if (h < 0.37) { t = TILE.SAND;  ht = 1; }
      else if (h > 0.75) { t = TILE.ROCK;  ht = Math.min(5, 3 + Math.round((h - 0.75) * 12)); }
      else {
        t = TILE.GRASS; ht = h > 0.58 ? 2 : 1;
        if (m > 0.66 && rand() < 0.45) t = TILE.TREE;
        else if (m < 0.24 && rand() < 0.30) t = TILE.DIRT;
      }
      tiles[idx(x, y)] = t;
      heights[idx(x, y)] = ht;
    }
  }

  // ---- Städte ----
  const towns = [
    { name: 'Kiria',       cx: 576, cy: 576, r: 17 },
    { name: 'Porta',       cx: 280, cy: 840, r: 14 },
    { name: 'Steinfels',   cx: 860, cy: 320, r: 14 },
    { name: 'Eichwald',    cx: 300, cy: 320, r: 14 },
    { name: 'Sonnenhafen', cx: 880, cy: 880, r: 14 },
    { name: 'Moorheim',    cx: 180, cy: 576, r: 14 },
    { name: 'Nordwacht',   cx: 576, cy: 180, r: 14 },
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

  for (const t of towns) {
    roadH(t.cx - t.r - 6, t.cx + t.r + 6, t.cy);
    roadV(t.cy - t.r - 6, t.cy + t.r + 6, t.cx);
    // Ring-Plaza um das Stadtzentrum
    const r3 = 4;
    for (let d = -r3; d <= r3; d++) {
      road(t.cx + d, t.cy - r3); road(t.cx + d, t.cy + r3);
      road(t.cx - r3, t.cy + d); road(t.cx + r3, t.cy + d);
    }
  }
  roadH(280, 576, 576); roadV(576, 840, 280);   // Kiria <-> Porta
  roadH(576, 860, 576); roadV(320, 576, 860);   // Kiria <-> Steinfels
  roadV(320, 576, 300);                          // Kiria-West <-> Eichwald
  roadH(180, 576, 576);                          // Kiria <-> Moorheim
  roadV(180, 576, 576);                          // Kiria <-> Nordwacht
  roadH(576, 880, 880); roadV(576, 880, 880);   // Kiria-Süd <-> Sonnenhafen
  roadH(300, 576, 320);                          // Eichwald <-> Nordwacht
  roadH(200, 300, 200); roadV(200, 320, 300);   // Friedhof
  roadV(840, 960, 280); roadH(280, 440, 960);   // Ork-Festung
  roadV(576, 712, 450);                          // Skorpion-Öde
  roadH(860, 1000, 600); roadV(576, 600, 860);  // Labyrinth
  roadH(860, 1040, 320); roadV(140, 320, 1040); // Drachenhöhle
  roadH(880, 1026, 1040); roadV(880, 1040, 880); // Vulkan
  roadV(140, 180, 576);                          // Wyrm-Schlucht
  roadV(500, 576, 180); roadH(128, 180, 500);   // Werwolf-Wald
  roadH(860, 920, 220);                          // Zyklopen
  roadH(576, 640, 510); roadV(510, 576, 640);   // Bauernhof
  roadV(90, 180, 760); roadH(576, 760, 180);    // Yeti-Berge (Nordroute)
  roadH(180, 250, 620);                          // Echsen-Moor

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
    if (inB(doorX, y + h - 1)) tiles[idx(doorX, y + h - 1)] = TILE.FLOOR;
  };
  // Schönere Städte: Tempel, Laden und ein Kranz von Wohnhäusern
  const layoutTown = (t, big) => {
    const o = big ? 12 : 9;
    addBuilding('temple', t.cx - o, t.cy - o, big ? 8 : 6, big ? 7 : 6);
    addBuilding('shop', t.cx + (big ? 4 : 3), t.cy - o, big ? 8 : 7, big ? 7 : 6);
    addBuilding('house', t.cx - o, t.cy + 6, 6, 5);
    addBuilding('house', t.cx + (big ? 6 : 4), t.cy + 6, 6, 5);
    if (big) {
      addBuilding('house', t.cx - 12, t.cy + 12, 5, 4);
      addBuilding('house', t.cx + 8, t.cy + 12, 5, 4);
      addBuilding('house', t.cx - 12, t.cy - 3, 5, 4);
      addBuilding('house', t.cx + 8, t.cy - 3, 5, 4);
    } else {
      addBuilding('house', t.cx - 9, t.cy - 2, 4, 4);
      addBuilding('house', t.cx + 6, t.cy - 2, 4, 4);
    }
    t.temple = { x: t.cx - o + (big ? 4 : 3), y: t.cy - o + 3 };
    t.shopPos = { x: t.cx + (big ? 4 : 3) + (big ? 4 : 3), y: t.cy - o + 3 };
  };
  towns.forEach((t, i) => layoutTown(t, i === 0));

  // Springbrunnen in JEDER Stadt (auf der Plaza)
  const fountains = towns.map((t) => ({ x: t.cx - 2, y: t.cy - 2 }));
  for (const f of fountains) { tiles[idx(f.x, f.y)] = TILE.FOUNTAIN; heights[idx(f.x, f.y)] = 1; }

  // ---- Bauernhof ----
  const farm = { x: 628, y: 498, w: 26, h: 17 };
  for (let y = farm.y; y < farm.y + farm.h; y++) {
    for (let x = farm.x; x < farm.x + farm.w; x++) {
      if (!inB(x, y)) continue;
      const border = x === farm.x || x === farm.x + farm.w - 1 || y === farm.y || y === farm.y + farm.h - 1;
      tiles[idx(x, y)] = border ? TILE.WALL : TILE.GRASS;
      heights[idx(x, y)] = 1;
    }
  }
  tiles[idx(farm.x + 12, farm.y + farm.h - 1)] = TILE.ROAD;
  tiles[idx(farm.x + 13, farm.y + farm.h - 1)] = TILE.ROAD;
  addBuilding('house', farm.x + 2, farm.y + 2, 7, 5);

  // ---- Friedhof ----
  const GY = { x: 200, y: 200, r: 10 };
  for (let y = GY.y - GY.r; y <= GY.y + GY.r; y++) {
    for (let x = GY.x - GY.r; x <= GY.x + GY.r; x++) {
      if (!inB(x, y)) continue;
      tiles[idx(x, y)] = rand() < 0.22 ? TILE.GRAVE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }

  // ---- Verfluchte Ruinen + Krypta ----
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

  // ---- Wyrm-Schlucht ----
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
      tiles[idx(x, y)] = rand() < 0.4 ? TILE.TREE : TILE.DIRT;
      heights[idx(x, y)] = 1;
    }
  }

  // ---- Lager (Wilderer + Banditen): Lichtung mit Feuer ----
  const CAMPS = [
    { x: 700, y: 760 }, { x: 420, y: 440 },              // Wilderer
    { x: 500, y: 500 }, { x: 350, y: 700 }, { x: 660, y: 380 }, // Banditen
  ];
  for (const c of CAMPS) {
    for (let y = c.y - 5; y <= c.y + 5; y++) {
      for (let x = c.x - 5; x <= c.x + 5; x++) {
        if (!inB(x, y)) continue;
        tiles[idx(x, y)] = TILE.DIRT;
        heights[idx(x, y)] = 1;
      }
    }
    tiles[idx(c.x, c.y)] = TILE.LAVA;
  }

  // ---- Echsen-Moor (bei Moorheim) ----
  for (let y = 590; y <= 660; y++) {
    for (let x = 220; x <= 290; x++) {
      if (!inB(x, y)) continue;
      if (tiles[idx(x, y)] === TILE.GRASS && rand() < 0.35) { tiles[idx(x, y)] = TILE.DIRT; }
    }
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

  // ---- Yeti-Berge (hoher Norden) ----
  const YETI = { x: 760, y: 90, r: 14 };
  for (let y = YETI.y - YETI.r; y <= YETI.y + YETI.r; y++) {
    for (let x = YETI.x - YETI.r; x <= YETI.x + YETI.r; x++) {
      if (!inB(x, y)) continue;
      const d = Math.hypot(x - YETI.x, y - YETI.y);
      if (d < YETI.r - 3) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
      else if (d < YETI.r) { tiles[idx(x, y)] = TILE.ROCK; heights[idx(x, y)] = 4; }
    }
  }
  for (let y = YETI.y; y <= YETI.y + YETI.r + 4; y++) {
    for (let x = 759; x <= 761; x++) {
      if (inB(x, y) && tiles[idx(x, y)] === TILE.ROCK) { tiles[idx(x, y)] = TILE.DIRT; heights[idx(x, y)] = 1; }
    }
  }

  // ---- NPCs ----
  const T = towns;
  const npcs = [
    { id: 'npc_marcus', name: 'Marcus', role: 'merchant', x: T[0].shopPos.x, y: T[0].shopPos.y,
      dialog: { greeting: 'Willkommen in meinem Laden! Anfänger-Ausrüstung für jeden Beruf.', topics: [
        { k: 'Waren', text: 'Waffen für alle Berufe, dazu Brot und Fackeln. Bessere Ausrüstung lassen nur Monster fallen!' },
        { k: 'Essen', text: 'Iss regelmäßig! Mit leerem Magen heilen deine Wunden kaum.' },
        { k: 'Mounts', text: 'Große Bestien lassen ganz selten Sättel fallen. Ein Pferd bekommst du bei Bauer Henrik nördlich der Stadt.' },
      ] } },
    { id: 'npc_aldo', name: 'Priester Aldo', role: 'villager', x: T[0].temple.x - 2, y: T[0].temple.y,
      dialog: { greeting: 'Die Götter seien mit dir, mein Kind.', topics: [
        { k: 'Tempel', text: 'Wenn du fällst, erwachst du im Tempel der nächsten Stadt.' },
        { k: 'Gefahr', text: 'Die Welt ist gefährlicher geworden. Geh nie ohne Tränke los – und unterschätze niemals ein Rudel Wölfe!' },
      ] } },
    { id: 'npc_bruno', name: 'Wache Bruno', role: 'villager', x: 581, y: 588,
      dialog: { greeting: 'Halt! Ach... du bist ja harmlos. Willkommen in Kiria.', topics: [
        { k: 'Monster', text: 'Fledermäuse und Ratten für den Anfang. Dann Schweine, Spinnen, Wölfe... Orks erst, wenn du ein paar Freunde dabei hast!' },
        { k: 'Kampf', text: 'Öffne die Kampfliste mit B – da siehst du alle Gegner in der Nähe und kannst sie direkt anvisieren.' },
      ] } },
    { id: 'npc_koenig', name: 'König Aldemar', role: 'villager', x: T[0].temple.x + 2, y: T[0].temple.y,
      dialog: { greeting: 'Tritt näher, Held. Das Reich braucht tapfere Kämpfer.', topics: [
        { k: 'Reich', text: 'Sieben Städte, ein Reich. Beschütze sie!' },
        { k: 'Bedrohung', text: 'Dunkle Ritter in den Ruinen, Drachen im Nordosten, Dämonen im Vulkan... Helden werden gebraucht!' },
      ] } },
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
    { id: 'npc_grom', name: 'Grom', role: 'merchant', x: T[2].shopPos.x, y: T[2].shopPos.y,
      dialog: { greeting: 'Hmpf. Kaufst du was oder schaust du nur?', topics: [
        { k: 'Berge', text: 'Zyklopen im Westen, Oger in den Hügeln, Golems im Süden. Die Berge sind kein Spielplatz!' },
      ] } },
    { id: 'npc_odo', name: 'Bergarbeiter Odo', role: 'villager', x: 856, y: 326,
      dialog: { greeting: 'Vorsicht in den Bergen, Fremder.', topics: [
        { k: 'Labyrinth', text: 'Südöstlich liegt das Fels-Labyrinth der Minotauren. Man hört ihr Brüllen bis hierher!' },
        { k: 'Yeti', text: 'Im hohen Norden, hinter der Wyrm-Schlucht, haust der weiße Schrecken. Nur die Härtesten wagen sich dorthin.' },
      ] } },
    { id: 'npc_eira', name: 'Jägermeisterin Eira', role: 'merchant', x: T[3].shopPos.x, y: T[3].shopPos.y,
      dialog: { greeting: 'Willkommen in Eichwald, dem Dorf der Jäger.', topics: [
        { k: 'Wald', text: 'Spinnen, Wölfe, Wilderer... und im Westwald heulen nachts die Werwölfe.' },
        { k: 'Dunkelelfen', text: 'In den tiefen Wäldern lauern Dunkelelfen mit vergifteten Pfeilen. Halte Abstand oder sei schneller!' },
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
    { id: 'npc_rollo', name: 'Kapitän Rollo', role: 'merchant', x: T[4].shopPos.x, y: T[4].shopPos.y,
      dialog: { greeting: 'Willkommen in Sonnenhafen, der Perle des Ostens!', topics: [
        { k: 'Harpyien', text: 'Diese verfluchten Vogelweiber zerreißen unsere Segel! Sie nisten in den Klippen im Norden und Westen.' },
      ] } },
    { id: 'npc_sera', name: 'Priesterin Sera', role: 'villager', x: T[4].temple.x, y: T[4].temple.y,
      dialog: { greeting: 'Das Licht schütze dich, Reisender.', topics: [
        { k: 'Krypta', text: 'In der Krypta wandeln Mumien, ihr Herr der Blutfürst... und über allen thront ein Lich, der die Toten befehligt.' },
      ] } },
    { id: 'npc_jorn', name: 'Sumpf-Jorn', role: 'merchant', x: T[5].shopPos.x, y: T[5].shopPos.y,
      dialog: { greeting: 'Willkommen im Moor. Pass auf, wo du hintrittst.', topics: [
        { k: 'Echsen', text: 'Echsenkrieger kriechen aus dem Moor östlich von hier. Zäh wie Sumpfleder!' },
      ] } },
    { id: 'npc_bragi', name: 'Ältester Bragi', role: 'villager', x: 174, y: 582,
      dialog: { greeting: 'Moorheim heißt dich willkommen, Fremder.', topics: [
        { k: 'Golems', text: 'In den Bergen im Osten sind Steingolems erwacht. Uralte Wächter... aber was bewachen sie?' },
      ] } },
    { id: 'npc_ida', name: 'Händlerin Ida', role: 'merchant', x: T[6].shopPos.x, y: T[6].shopPos.y,
      dialog: { greeting: 'Willkommen in Nordwacht, dem Tor zum Norden!', topics: [
        { k: 'Norden', text: 'Hinter uns liegt die Wyrm-Schlucht und dahinter die Yeti-Berge. Rüste dich gut aus!' },
      ] } },
    { id: 'npc_ulf', name: 'Wache Ulf', role: 'villager', x: 570, y: 186,
      dialog: { greeting: 'Nordwacht hält stand! Was willst du, Zivilist?', topics: [
        { k: 'Plage', text: 'Fledermäuse im Turm, Goblins in den Hügeln – Arbeit gibt es genug für dich!' },
      ] } },
    { id: 'npc_henrik', name: 'Bauer Henrik', role: 'merchant', x: farm.x + 12, y: farm.y + farm.h,
      shop: ['saddle_horse', 'cheese', 'bread', 'meat', 'ham'],
      dialog: { greeting: 'Na, willst du meine Tiere anschauen? Die Pferde sind mein Stolz!', topics: [
        { k: 'Pferde', text: 'Ein gutes Pferd trägt dich doppelt so schnell durchs Land. Für 2000 Gold gehört dir ein Sattel samt Pferd!' },
        { k: 'Schweine', text: 'Die Wildschweine wühlen mir die Felder um! Wenn du ein paar erlegst, zahle ich gut.' },
      ] } },
  ];
  for (const n of npcs) {
    if (inB(n.x, n.y) && !WALKABLE.has(tiles[idx(n.x, n.y)])) {
      tiles[idx(n.x, n.y)] = TILE.FLOOR;
      heights[idx(n.x, n.y)] = 1;
    }
  }

  const templeSpawn = towns[0].temple;

  // ================================================================
  //  EBENEN-SYSTEM: 6 Stockwerke (z = -3..+2)
  //  UG voller Fels (Höhlen werden gecarvt), OG leere Luft (Plateaus).
  //  Treppen verbinden die Ebenen: STAIR_DOWN oben <-> STAIR_UP unten.
  // ================================================================
  const F = (z) => z + 3;
  const floors = [];
  for (let z = -3; z <= 2; z++) {
    if (z === 0) { floors.push({ tiles, heights }); continue; }
    floors.push({
      tiles: new Uint8Array(SIZE * SIZE).fill(z < 0 ? TILE.ROCK : TILE.VOID),
      heights: new Uint8Array(SIZE * SIZE).fill(z < 0 ? 4 : 0),
    });
  }
  const TF = (z) => floors[F(z)].tiles;
  const HF = (z) => floors[F(z)].heights;
  const setT = (z, x, y, t, h) => { if (!inB(x, y)) return; TF(z)[idx(x, y)] = t; HF(z)[idx(x, y)] = h; };

  // Runde Kaverne: Boden freischlagen (UG) bzw. Plateau mit Felskranz (OG)
  const carveCavern = (z, cx, cy, r, opts = {}) => {
    const floorTile = opts.floor !== undefined ? opts.floor : TILE.DIRT;
    for (let y = cy - r - 1; y <= cy + r + 1; y++) {
      for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        if (!inB(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d < r - 0.5) {
          const t = opts.lavaP && rand() < opts.lavaP ? TILE.LAVA : floorTile;
          setT(z, x, y, t, t === TILE.LAVA ? 0 : 1);
        } else if (d < r + 1.2 && z > 0 && TF(z)[idx(x, y)] === TILE.VOID) {
          setT(z, x, y, TILE.ROCK, 3); // Felskranz am Plateaurand
        }
      }
    }
  };
  // L-förmiger Verbindungstunnel (Breite 2)
  const carveTunnel = (z, x1, y1, x2, y2) => {
    const dig = (x, y) => {
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1]]) {
        const tx = x + ox, ty = y + oy;
        if (!inB(tx, ty)) continue;
        const t = TF(z)[idx(tx, ty)];
        if (t === TILE.ROCK || t === TILE.VOID || t === TILE.WALL) setT(z, tx, ty, TILE.DIRT, 1);
      }
    };
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) dig(x, y1);
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) dig(x2, y);
  };
  // Treppe: STAIR_DOWN auf zUpper an (x,y) <-> STAIR_UP auf zUpper-1 an (x,y).
  // Rundherum wird auf beiden Ebenen Boden freigeräumt (Landeplatz).
  const stairs = [];
  const linkDown = (zUpper, x, y) => {
    setT(zUpper, x, y, TILE.STAIR_DOWN, 1);
    setT(zUpper - 1, x, y, TILE.STAIR_UP, 1);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const ux = x + dx, uy = y + dy;
        if (!inB(ux, uy)) continue;
        const tU = TF(zUpper)[idx(ux, uy)];
        if ([TILE.ROCK, TILE.VOID, TILE.TREE, TILE.WATER, TILE.WALL].includes(tU)) setT(zUpper, ux, uy, TILE.DIRT, 1);
        const tL = TF(zUpper - 1)[idx(ux, uy)];
        if ([TILE.ROCK, TILE.VOID, TILE.WALL].includes(tL)) setT(zUpper - 1, ux, uy, TILE.DIRT, 1);
      }
    }
    stairs.push({ x, y, zTop: zUpper, zBottom: zUpper - 1 });
  };

  // ---- Oberirdische Eingangs-Vorhöhlen (mit Straßenanbindung, aus v10.1) ----
  const carveCave = (cx, cy, r) => {
    for (let y = cy - r - 1; y <= cy + r + 1; y++) {
      for (let x = cx - r - 1; x <= cx + r + 1; x++) {
        if (!inB(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d < r - 0.5) { tiles[idx(x, y)] = TILE.FLOOR; heights[idx(x, y)] = 1; }
        else if (d < r + 0.8) { tiles[idx(x, y)] = TILE.ROCK; heights[idx(x, y)] = 4; }
      }
    }
  };
  const entranceCaves = [
    { cx: 200,  cy: 462,  r: 6, sx: 300,  sy: 320 },  // -> Spinnentiefe
    { cx: 440,  cy: 1024, r: 6, sx: 440,  sy: 960 },  // -> Kriegsmine
    { cx: 700,  cy: 58,   r: 6, sx: 700,  sy: 180 },  // -> Eishöhle
    { cx: 965,  cy: 648,  r: 6, sx: 900,  sy: 690 },  // -> Katakomben
    { cx: 1090, cy: 92,   r: 6, sx: 1040, sy: 140 },  // -> Drachengrotte
  ];
  for (const bc of entranceCaves) {
    carveCave(bc.cx, bc.cy, bc.r);
    roadV(Math.min(bc.cy, bc.sy), Math.max(bc.cy, bc.sy), bc.cx);
    roadH(Math.min(bc.cx, bc.sx), Math.max(bc.cx, bc.sx), bc.sy);
    tiles[idx(bc.cx, bc.cy)] = TILE.FLOOR; heights[idx(bc.cx, bc.cy)] = 1;
  }

  // ================================================================
  //  1. UG (z=-1): 8 Höhlensysteme aus mehreren kleinen Kavernen
  // ================================================================
  const caveSpawns = []; // {type, count, cx, cy, z, rMin, rMax}
  const cs = (z, type, count, cx, cy, rMax = 8) => caveSpawns.push({ type, count, cx, cy, z, rMin: 0, rMax });

  // -- Alte Mine (südöstlich von Kiria, Einsteiger-Dungeon) --
  carveCavern(-1, 620, 620, 8); carveCavern(-1, 655, 625, 7); carveCavern(-1, 640, 655, 9); carveCavern(-1, 668, 652, 6); carveCavern(-1, 612, 650, 6);
  carveTunnel(-1, 620, 620, 655, 625); carveTunnel(-1, 655, 625, 640, 655); carveTunnel(-1, 640, 655, 668, 652); carveTunnel(-1, 640, 655, 612, 650); carveTunnel(-1, 612, 650, 620, 620);
  linkDown(0, 620, 612); linkDown(0, 668, 660); linkDown(0, 604, 652); // 3 Eingänge!
  cs(-1, 'kobold', 16, 640, 640, 20); cs(-1, 'bat', 12, 620, 620, 14); cs(-1, 'slime', 10, 655, 630, 12); cs(-1, 'cave_bear', 6, 640, 655, 10); cs(-1, 'golem', 4, 668, 652, 7);

  // -- Friedhofs-Krypta --
  carveCavern(-1, 190, 190, 8); carveCavern(-1, 215, 195, 7); carveCavern(-1, 200, 220, 8); carveCavern(-1, 225, 220, 6);
  carveTunnel(-1, 190, 190, 215, 195); carveTunnel(-1, 215, 195, 200, 220); carveTunnel(-1, 200, 220, 225, 220);
  linkDown(0, 200, 200); linkDown(0, 226, 224);
  cs(-1, 'skeleton', 18, 200, 205, 18); cs(-1, 'ghost', 10, 190, 190, 10); cs(-1, 'zombie', 12, 215, 200, 12); cs(-1, 'necromancer', 5, 200, 220, 10);

  // -- Spinnentiefe (unter dem Spinnenwald) + Boss-Raum der Spinnenkönigin --
  carveCavern(-1, 240, 440, 8); carveCavern(-1, 265, 445, 7); carveCavern(-1, 250, 470, 8); carveCavern(-1, 225, 465, 6);
  carveCavern(-1, 205, 462, 7);                    // Kaverne unter der Vorhöhle
  carveCavern(-1, 285, 472, 7, { floor: TILE.FLOOR }); // Boss-Raum
  carveTunnel(-1, 240, 440, 265, 445); carveTunnel(-1, 265, 445, 250, 470); carveTunnel(-1, 250, 470, 225, 465);
  carveTunnel(-1, 225, 465, 205, 462); carveTunnel(-1, 250, 470, 285, 472);
  linkDown(0, 200, 462); linkDown(0, 252, 438);
  cs(-1, 'giant_spider', 14, 250, 455, 20); cs(-1, 'spider', 10, 240, 440, 12); cs(-1, 'giant_wasp', 8, 265, 448, 10);

  // -- Kriegsmine (unter der Ork-Festung) + Boss-Raum des Kriegsherrn --
  carveCavern(-1, 430, 950, 8); carveCavern(-1, 455, 955, 7); carveCavern(-1, 440, 980, 8); carveCavern(-1, 415, 975, 6);
  carveCavern(-1, 440, 1015, 7);                   // Kaverne unter der Vorhöhle
  carveCavern(-1, 472, 987, 7, { floor: TILE.FLOOR }); // Boss-Raum
  carveTunnel(-1, 430, 950, 455, 955); carveTunnel(-1, 455, 955, 440, 980); carveTunnel(-1, 440, 980, 415, 975);
  carveTunnel(-1, 440, 980, 440, 1015); carveTunnel(-1, 440, 980, 472, 987);
  linkDown(0, 440, 958); linkDown(0, 440, 1024);
  cs(-1, 'orc', 14, 440, 965, 20); cs(-1, 'orc_berserker', 10, 440, 980, 12); cs(-1, 'orc_shaman', 8, 455, 958, 10);

  // -- Eishöhle (unter den Yeti-Bergen) --
  carveCavern(-1, 750, 85, 8); carveCavern(-1, 775, 88, 7); carveCavern(-1, 760, 110, 8); carveCavern(-1, 735, 105, 6);
  carveCavern(-1, 705, 65, 7);                     // Kaverne unter der Eis-Vorhöhle
  carveTunnel(-1, 750, 85, 775, 88); carveTunnel(-1, 775, 88, 760, 110); carveTunnel(-1, 760, 110, 735, 105); carveTunnel(-1, 735, 105, 705, 65);
  linkDown(0, 760, 88); linkDown(0, 700, 58);
  cs(-1, 'frost_wolf', 10, 755, 90, 16); cs(-1, 'ice_golem', 8, 760, 105, 12); cs(-1, 'yeti', 6, 775, 90, 9);

  // -- Katakomben (unter den Ruinen) --
  carveCavern(-1, 890, 690, 8); carveCavern(-1, 915, 695, 7); carveCavern(-1, 900, 720, 8); carveCavern(-1, 875, 715, 6); carveCavern(-1, 925, 722, 6);
  carveCavern(-1, 958, 653, 7);                    // Kaverne unter der Gruft-Vorhöhle
  carveTunnel(-1, 890, 690, 915, 695); carveTunnel(-1, 915, 695, 900, 720); carveTunnel(-1, 900, 720, 875, 715);
  carveTunnel(-1, 900, 720, 925, 722); carveTunnel(-1, 915, 695, 958, 653);
  linkDown(0, 900, 700); linkDown(0, 965, 648);
  cs(-1, 'mummy', 14, 900, 705, 20); cs(-1, 'ghoul', 12, 890, 692, 12); cs(-1, 'banshee', 8, 915, 700, 10); cs(-1, 'vampire', 6, 900, 720, 10);

  // -- Vulkanschlund (unter dem Vulkan) --
  carveCavern(-1, 1030, 1030, 8, { lavaP: 0.12 }); carveCavern(-1, 1055, 1035, 7, { lavaP: 0.12 }); carveCavern(-1, 1040, 1060, 8, { lavaP: 0.12 }); carveCavern(-1, 1015, 1055, 6);
  carveTunnel(-1, 1030, 1030, 1055, 1035); carveTunnel(-1, 1055, 1035, 1040, 1060); carveTunnel(-1, 1040, 1060, 1015, 1055);
  linkDown(0, 1040, 1036); linkDown(0, 1004, 1004);
  cs(-1, 'lava_hound', 8, 1040, 1040, 16); cs(-1, 'fire_elemental', 8, 1040, 1055, 12);

  // -- Drachengrotte (unter dem Drachenhort) --
  carveCavern(-1, 1030, 120, 8); carveCavern(-1, 1055, 125, 7); carveCavern(-1, 1040, 150, 8);
  carveCavern(-1, 1085, 100, 7);                   // Kaverne unter der Hort-Vorhöhle
  carveTunnel(-1, 1030, 120, 1055, 125); carveTunnel(-1, 1055, 125, 1040, 150); carveTunnel(-1, 1055, 125, 1085, 100);
  linkDown(0, 1040, 126); linkDown(0, 1090, 92);
  cs(-1, 'dragon', 4, 1040, 130, 16); cs(-1, 'wyrm', 4, 1030, 122, 10); cs(-1, 'lava_hound', 4, 1055, 128, 9);

  // ================================================================
  //  2. UG (z=-2): tiefere, gefährlichere Systeme
  // ================================================================
  // -- Eisgrotte + Boss-Raum des Yeti-Königs --
  carveCavern(-2, 750, 105, 8); carveCavern(-2, 775, 110, 7); carveCavern(-2, 760, 132, 8);
  carveCavern(-2, 733, 130, 7, { floor: TILE.FLOOR }); // Boss-Raum
  carveTunnel(-2, 750, 105, 775, 110); carveTunnel(-2, 775, 110, 760, 132); carveTunnel(-2, 760, 132, 733, 130);
  linkDown(-1, 760, 110);
  cs(-2, 'frost_giant', 6, 760, 115, 16); cs(-2, 'ice_golem', 6, 752, 108, 10); cs(-2, 'mammoth', 5, 770, 125, 10);

  // -- Tiefengruft + Boss-Raum des Lichkönigs --
  carveCavern(-2, 890, 715, 8); carveCavern(-2, 915, 720, 7); carveCavern(-2, 900, 742, 8);
  carveCavern(-2, 927, 747, 7, { floor: TILE.FLOOR }); // Boss-Raum
  carveTunnel(-2, 890, 715, 915, 720); carveTunnel(-2, 915, 720, 900, 742); carveTunnel(-2, 900, 742, 927, 747);
  linkDown(-1, 900, 720);
  cs(-2, 'dark_knight', 8, 900, 725, 16); cs(-2, 'vampire', 6, 890, 718, 10); cs(-2, 'reaper', 3, 900, 742, 9); cs(-2, 'spectral_dragon', 2, 915, 724, 8);

  // -- Feuerkammern (Dämonen!) --
  carveCavern(-2, 1030, 1055, 8, { lavaP: 0.2 }); carveCavern(-2, 1055, 1060, 7, { lavaP: 0.2 }); carveCavern(-2, 1040, 1080, 8, { lavaP: 0.15 });
  carveTunnel(-2, 1030, 1055, 1055, 1060); carveTunnel(-2, 1055, 1060, 1040, 1080);
  linkDown(-1, 1040, 1060);
  cs(-2, 'fire_elemental', 10, 1040, 1062, 16); cs(-2, 'shadow_demon', 4, 1030, 1057, 9); cs(-2, 'obsidian_golem', 4, 1055, 1062, 9); cs(-2, 'demon', 3, 1040, 1080, 8);

  // -- Drachenhort-Tiefen --
  carveCavern(-2, 1030, 145, 8); carveCavern(-2, 1055, 150, 7); carveCavern(-2, 1040, 172, 8);
  carveTunnel(-2, 1030, 145, 1055, 150); carveTunnel(-2, 1055, 150, 1040, 172);
  linkDown(-1, 1040, 150);
  cs(-2, 'dragon', 5, 1040, 155, 16); cs(-2, 'wyrm', 5, 1032, 148, 10); cs(-2, 'spectral_dragon', 3, 1050, 160, 9);

  // ================================================================
  //  3. UG (z=-3): das Endgame in der Tiefe
  // ================================================================
  // -- Dämonenhallen --
  carveCavern(-3, 1030, 1075, 9, { lavaP: 0.25 }); carveCavern(-3, 1055, 1080, 8, { lavaP: 0.25 }); carveCavern(-3, 1040, 1100, 9, { lavaP: 0.2 }); carveCavern(-3, 1010, 1095, 7);
  carveTunnel(-3, 1030, 1075, 1055, 1080); carveTunnel(-3, 1055, 1080, 1040, 1100); carveTunnel(-3, 1040, 1100, 1010, 1095);
  linkDown(-2, 1040, 1080);
  cs(-3, 'demon', 8, 1040, 1088, 18); cs(-3, 'shadow_demon', 6, 1030, 1078, 10); cs(-3, 'obsidian_golem', 5, 1055, 1082, 9); cs(-3, 'reaper', 4, 1040, 1100, 10);

  // -- Urdrachen-Schlund + Boss-Raum des Drachenfürsten --
  carveCavern(-3, 1030, 168, 9); carveCavern(-3, 1055, 172, 8); carveCavern(-3, 1040, 192, 9);
  carveCavern(-3, 1012, 190, 8, { floor: TILE.FLOOR }); // Boss-Raum
  carveTunnel(-3, 1030, 168, 1055, 172); carveTunnel(-3, 1055, 172, 1040, 192); carveTunnel(-3, 1040, 192, 1012, 190);
  linkDown(-2, 1040, 172);
  cs(-3, 'dragon', 6, 1040, 178, 18); cs(-3, 'frost_dragon', 4, 1032, 170, 10); cs(-3, 'spectral_dragon', 4, 1050, 182, 10); cs(-3, 'wyrm', 4, 1040, 192, 10);

  // ================================================================
  //  Obergeschosse (z=+1/+2): Berg-Plateaus über der Welt
  // ================================================================
  // -- Yeti-Hochplateau (1. OG) --
  carveCavern(1, 760, 80, 12, { floor: TILE.DIRT });
  linkDown(1, 752, 84); linkDown(1, 770, 76); // 2 Aufstiege aus dem Yeti-Kessel
  cs(1, 'yeti', 6, 760, 80, 10); cs(1, 'frost_giant', 4, 755, 76, 8); cs(1, 'frost_wolf', 6, 766, 84, 9);

  // -- Vulkankrater-Rand (1. OG) --
  carveCavern(1, 1040, 1032, 11, { floor: TILE.DIRT, lavaP: 0.1 });
  linkDown(1, 1034, 1036); linkDown(1, 1048, 1028);
  cs(1, 'fire_elemental', 6, 1040, 1032, 9); cs(1, 'phoenix', 3, 1035, 1028, 8); cs(1, 'lava_hound', 5, 1046, 1036, 8); cs(1, 'demon', 2, 1040, 1030, 7);

  // -- Adlerfels (1. OG, über den Bergen bei Steinfels) --
  carveCavern(1, 904, 248, 13, { floor: TILE.GRASS });
  linkDown(1, 896, 246); linkDown(1, 912, 258);
  cs(1, 'griffin', 8, 904, 248, 11); cs(1, 'storm_eagle', 6, 898, 244, 9); cs(1, 'harpy', 8, 910, 252, 10);

  // -- Drachengipfel (2. OG über dem Adlerfels) --
  carveCavern(2, 904, 240, 9, { floor: TILE.DIRT });
  linkDown(2, 906, 244); linkDown(2, 898, 236);
  cs(2, 'frost_dragon', 4, 904, 240, 7); cs(2, 'dragon', 4, 900, 238, 7); cs(2, 'wyrm', 4, 908, 242, 7);

  // -- Sturmgipfel (2. OG über dem Yeti-Hochplateau) --
  carveCavern(2, 760, 74, 8, { floor: TILE.DIRT });
  linkDown(2, 758, 78); linkDown(2, 764, 70);
  cs(2, 'phoenix', 4, 760, 74, 6); cs(2, 'storm_eagle', 5, 757, 72, 6); cs(2, 'frost_dragon', 2, 763, 76, 6);

  // ---- Sichtbare Trampelpfade zu ALLEN Oberwelt-Eingängen ----
  // Jede Treppe an der Oberfläche wird mit einem 2 Kacheln breiten
  // Erdpfad an die nächste Straße angebunden – so findet man jeden
  // Eingang und kommt garantiert hin (kein Irren durch Felsspalten).
  {
    const isRoadAt = (x, y) => inB(x, y) && tiles[idx(x, y)] === TILE.ROAD;
    const surfaceStairs = stairs.filter((s) => s.zTop === 0 || s.zBottom === 0);
    for (const st of surfaceStairs) {
      // nächste Straßen-Kachel suchen (Spiralsuche bis Radius 90)
      let target = null;
      outer:
      for (let r = 4; r <= 90 && !target; r += 2) {
        for (let a = 0; a < 360; a += 10) {
          const x = Math.round(st.x + Math.cos(a * Math.PI / 180) * r);
          const y = Math.round(st.y + Math.sin(a * Math.PI / 180) * r);
          if (isRoadAt(x, y)) { target = { x, y }; break outer; }
        }
      }
      if (!target) continue;
      // L-förmiger Erdpfad (2 breit), Wasser wird NICHT überbrückt,
      // Gebäudewände bleiben stehen – nur Fels/Bäume weichen
      const dig = (x, y) => {
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1]]) {
          const tx = x + ox, ty = y + oy;
          if (!inB(tx, ty)) continue;
          const t = tiles[idx(tx, ty)];
          if (t === TILE.ROCK || t === TILE.TREE) { tiles[idx(tx, ty)] = TILE.DIRT; heights[idx(tx, ty)] = 1; }
        }
      };
      for (let x = Math.min(st.x, target.x); x <= Math.max(st.x, target.x); x++) dig(x, st.y);
      for (let y = Math.min(st.y, target.y); y <= Math.max(st.y, target.y); y++) dig(target.x, y);
    }
  }

  // ---- Erreichbarkeits-Maske über ALLE Ebenen (BFS mit Treppen) ----
  const reachable = [];
  for (let f = 0; f < 6; f++) reachable.push(new Uint8Array(SIZE * SIZE));
  const reachList = []; // nur Oberwelt (für Streu-Spawns)
  {
    const qx = [templeSpawn.x], qy = [templeSpawn.y], qz = [0];
    reachable[F(0)][idx(templeSpawn.x, templeSpawn.y)] = 1;
    let head = 0;
    while (head < qx.length) {
      const x = qx[head], y = qy[head], z = qz[head]; head++;
      const t = TF(z)[idx(x, y)];
      // Treppen verbinden die Ebenen
      if (t === TILE.STAIR_DOWN && z > -3 && !reachable[F(z - 1)][idx(x, y)]) {
        reachable[F(z - 1)][idx(x, y)] = 1; qx.push(x); qy.push(y); qz.push(z - 1);
      }
      if (t === TILE.STAIR_UP && z < 2 && !reachable[F(z + 1)][idx(x, y)]) {
        reachable[F(z + 1)][idx(x, y)] = 1; qx.push(x); qy.push(y); qz.push(z + 1);
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        const ni = idx(nx, ny);
        if (reachable[F(z)][ni] || !WALKABLE.has(TF(z)[ni])) continue;
        reachable[F(z)][ni] = 1;
        qx.push(nx); qy.push(ny); qz.push(z);
        if (z === 0) reachList.push(ni);
      }
    }
  }

  // ---- Monster-Spawngebiete (~1800 Monster, überall auf der Karte) ----
  const spawns = [];
  // Anfänger-Ringe um jede Stadt
  for (const t of towns) {
    spawns.push({ type: 'rat', count: 12, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 12 });
    spawns.push({ type: 'bat', count: 10, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 14 });
    spawns.push({ type: 'chicken', count: 6, cx: t.cx, cy: t.cy, rMin: t.r + 2, rMax: t.r + 10 });
  }
  spawns.push(
    { type: 'crab',     count: 12, cx: 240, cy: 900, rMin: 0, rMax: 14 },
    { type: 'crab',     count: 12, cx: 930, cy: 940, rMin: 0, rMax: 14 },
    { type: 'boar',     count: 14, cx: 600, cy: 430, rMin: 0, rMax: 14 },
    { type: 'boar',     count: 14, cx: 350, cy: 250, rMin: 0, rMax: 14 },
    { type: 'goblin',   count: 14, cx: 560, cy: 260, rMin: 0, rMax: 12 },
    { type: 'goblin',   count: 14, cx: 340, cy: 540, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 14, cx: 320, cy: 900, rMin: 0, rMax: 14 },
    { type: 'snake',    count: 14, cx: 700, cy: 660, rMin: 0, rMax: 12 },
    { type: 'snake',    count: 14, cx: 940, cy: 500, rMin: 0, rMax: 12 },
    { type: 'spider',   count: 16, cx: 420, cy: 420, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 16, cx: 680, cy: 440, rMin: 0, rMax: 14 },
    { type: 'spider',   count: 16, cx: 480, cy: 720, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 240, cy: 480, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 660, cy: 260, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 460, cy: 640, rMin: 0, rMax: 14 },
    { type: 'wolf',     count: 16, cx: 760, cy: 840, rMin: 0, rMax: 14 },
    { type: 'bandit',   count: 10, cx: 500, cy: 500, rMin: 0, rMax: 7 },
    { type: 'bandit',   count: 10, cx: 350, cy: 700, rMin: 0, rMax: 7 },
    { type: 'bandit',   count: 10, cx: 660, cy: 380, rMin: 0, rMax: 7 },
    { type: 'scorpion', count: 12, cx: 700, cy: 900, rMin: 0, rMax: 12 },
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
    { type: 'dark_knight', count: 8, cx: 860, cy: 760, rMin: 0, rMax: 10 },
    { type: 'lich',     count: 2,  cx: RUIN.x, cy: RUIN.y - 12, rMin: 0, rMax: 8 },
    { type: 'lizardman', count: 16, cx: 255, cy: 625, rMin: 0, rMax: 14 },
    { type: 'dark_elf', count: 10, cx: 200, cy: 380, rMin: 0, rMax: 12 },
    { type: 'dark_elf', count: 10, cx: 540, cy: 760, rMin: 0, rMax: 12 },
    { type: 'harpy',    count: 10, cx: 760, cy: 180, rMin: 0, rMax: 12 },
    { type: 'harpy',    count: 10, cx: 980, cy: 760, rMin: 0, rMax: 12 },
    { type: 'giant_spider', count: 10, cx: 250, cy: 450, rMin: 0, rMax: 12 },
    { type: 'giant_spider', count: 10, cx: 760, cy: 560, rMin: 0, rMax: 12 },
    { type: 'werewolf', count: 12, cx: WWALD.x, cy: WWALD.y, rMin: 0, rMax: 13 },
    { type: 'minotaur', count: 12, cx: LAB.x, cy: LAB.y, rMin: 0, rMax: 11 },
    { type: 'ogre',     count: 10, cx: 820, cy: 560, rMin: 0, rMax: 12 },
    { type: 'ogre',     count: 10, cx: 400, cy: 340, rMin: 0, rMax: 12 },
    { type: 'cyclops',  count: 12, cx: 920, cy: 220, rMin: 0, rMax: 12 },
    { type: 'golem',    count: 10, cx: 860, cy: 440, rMin: 0, rMax: 12 },
    { type: 'yeti',     count: 8,  cx: YETI.x, cy: YETI.y, rMin: 0, rMax: 10 },
    { type: 'wyrm',     count: 6,  cx: 600, cy: 128, rMin: 0, rMax: 60 },
    { type: 'dragon',   count: 5,  cx: LAIR.x, cy: LAIR.y, rMin: 0, rMax: 8 },
    // Vulkan-Oberfläche ausgedünnt – die Masse lauert jetzt UNTER der Erde
    { type: 'fire_elemental', count: 5, cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 12 },
    { type: 'demon',    count: 3,  cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 10 },
    // ---- Neue Arten (v9): feste thematische Zonen ----
    { type: 'chicken',  count: 10, cx: farm.x + 12, cy: farm.y + 8, rMin: 0, rMax: 10 },
    { type: 'fox',      count: 10, cx: 350, cy: 350, rMin: 0, rMax: 14 },
    { type: 'fox',      count: 10, cx: 620, cy: 700, rMin: 0, rMax: 14 },
    { type: 'fox',      count: 8,  cx: 520, cy: 240, rMin: 0, rMax: 12 },
    { type: 'slime',    count: 12, cx: 250, cy: 760, rMin: 0, rMax: 12 },
    { type: 'slime',    count: 12, cx: 700, cy: 500, rMin: 0, rMax: 12 },
    { type: 'kobold',   count: 14, cx: 480, cy: 300, rMin: 0, rMax: 12 },
    { type: 'kobold',   count: 14, cx: 380, cy: 860, rMin: 0, rMax: 12 },
    { type: 'giant_wasp', count: 12, cx: 660, cy: 600, rMin: 0, rMax: 12 },
    { type: 'giant_wasp', count: 12, cx: 330, cy: 450, rMin: 0, rMax: 12 },
    { type: 'hyena',    count: 12, cx: 760, cy: 700, rMin: 0, rMax: 14 },
    { type: 'hyena',    count: 12, cx: 400, cy: 780, rMin: 0, rMax: 12 },
    { type: 'gnoll',    count: 12, cx: 540, cy: 660, rMin: 0, rMax: 12 },
    { type: 'gnoll',    count: 12, cx: 300, cy: 240, rMin: 0, rMax: 12 },
    { type: 'crocodile', count: 10, cx: 245, cy: 640, rMin: 0, rMax: 12 },
    { type: 'crocodile', count: 8,  cx: 330, cy: 930, rMin: 0, rMax: 10 },
    { type: 'pirate',   count: 12, cx: 240, cy: 940, rMin: 0, rMax: 10 },
    { type: 'pirate',   count: 10, cx: 940, cy: 900, rMin: 0, rMax: 10 },
    { type: 'witch',    count: 8,  cx: 160, cy: 420, rMin: 0, rMax: 10 },
    { type: 'witch',    count: 8,  cx: 240, cy: 260, rMin: 0, rMax: 10 },
    { type: 'orc_shaman', count: 8, cx: 440, cy: 960, rMin: 0, rMax: 9 },
    { type: 'orc_shaman', count: 8, cx: 500, cy: 900, rMin: 0, rMax: 10 },
    { type: 'panther',  count: 10, cx: 700, cy: 340, rMin: 0, rMax: 12 },
    { type: 'panther',  count: 8,  cx: 250, cy: 530, rMin: 0, rMax: 12 },
    { type: 'frost_wolf', count: 10, cx: 640, cy: 200, rMin: 0, rMax: 12 },
    { type: 'frost_wolf', count: 8,  cx: 500, cy: 150, rMin: 0, rMax: 10 },
    { type: 'gargoyle', count: 8,  cx: 860, cy: 700, rMin: 0, rMax: 12 },
    { type: 'gargoyle', count: 6,  cx: 980, cy: 560, rMin: 0, rMax: 10 },
    { type: 'basilisk', count: 8,  cx: 940, cy: 480, rMin: 0, rMax: 12 },
    { type: 'basilisk', count: 6,  cx: 820, cy: 620, rMin: 0, rMax: 10 },
    { type: 'treant',   count: 6,  cx: 420, cy: 380, rMin: 0, rMax: 10 },
    { type: 'treant',   count: 6,  cx: 680, cy: 760, rMin: 0, rMax: 10 },
    { type: 'sabertooth', count: 8, cx: 860, cy: 180, rMin: 0, rMax: 12 },
    { type: 'sabertooth', count: 6, cx: 720, cy: 260, rMin: 0, rMax: 10 },
    { type: 'necromancer', count: 5, cx: GY.x, cy: GY.y, rMin: 0, rMax: 11 },
    { type: 'necromancer', count: 6, cx: RUIN.x, cy: RUIN.y, rMin: 0, rMax: 14 },
    { type: 'medusa',   count: 6,  cx: 1000, cy: 660, rMin: 0, rMax: 10 },
    { type: 'unicorn',  count: 4,  cx: 360, cy: 600, rMin: 0, rMax: 10 },
    { type: 'unicorn',  count: 3,  cx: 620, cy: 320, rMin: 0, rMax: 10 },
    { type: 'ice_golem', count: 6, cx: 700, cy: 120, rMin: 0, rMax: 10 },
    { type: 'ice_golem', count: 5, cx: 840, cy: 100, rMin: 0, rMax: 8 },
    { type: 'lava_hound', count: 6, cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 12 },
    { type: 'lava_hound', count: 4, cx: LAIR.x, cy: LAIR.y, rMin: 0, rMax: 10 },
    { type: 'griffin',  count: 5,  cx: 900, cy: 240, rMin: 0, rMax: 10 },
    { type: 'griffin',  count: 4,  cx: 760, cy: 140, rMin: 0, rMax: 8 },
    { type: 'shadow_assassin', count: 6, cx: 880, cy: 760, rMin: 0, rMax: 10 },
    { type: 'frost_giant', count: 5, cx: YETI.x, cy: YETI.y, rMin: 0, rMax: 12 },
    { type: 'frost_giant', count: 4, cx: 680, cy: 90, rMin: 0, rMax: 10 },
    { type: 'frost_dragon', count: 4, cx: 600, cy: 110, rMin: 0, rMax: 14 },
    { type: 'phoenix',  count: 3,  cx: 1000, cy: 1000, rMin: 0, rMax: 10 },
    { type: 'phoenix',  count: 2,  cx: 1080, cy: 1080, rMin: 0, rMax: 8 },
    { type: 'shadow_demon', count: 4, cx: VOLC.x, cy: VOLC.y, rMin: 0, rMax: 10 },
    { type: 'reaper',   count: 3,  cx: RUIN.x, cy: RUIN.y - 12, rMin: 0, rMax: 8 },
    { type: 'obsidian_golem', count: 4, cx: 1010, cy: 1070, rMin: 0, rMax: 10 },
    // ---- Neue Arten (v10) ----
    { type: 'sheep',    count: 10, cx: farm.x + 12, cy: farm.y + 8, rMin: 0, rMax: 12 },
    { type: 'sheep',    count: 8,  cx: 520, cy: 620, rMin: 0, rMax: 12 },
    { type: 'giant_beetle', count: 12, cx: 380, cy: 420, rMin: 0, rMax: 12 },
    { type: 'giant_beetle', count: 12, cx: 640, cy: 520, rMin: 0, rMax: 12 },
    { type: 'king_cobra', count: 10, cx: 270, cy: 660, rMin: 0, rMax: 12 },
    { type: 'king_cobra', count: 8,  cx: 360, cy: 950, rMin: 0, rMax: 10 },
    { type: 'swamp_lurker', count: 10, cx: 240, cy: 620, rMin: 0, rMax: 14 },
    { type: 'swamp_lurker', count: 8,  cx: 200, cy: 680, rMin: 0, rMax: 10 },
    { type: 'forest_spirit', count: 8, cx: 400, cy: 360, rMin: 0, rMax: 12 },
    { type: 'forest_spirit', count: 8, cx: 660, cy: 720, rMin: 0, rMax: 12 },
    { type: 'cave_bear', count: 8, cx: 800, cy: 480, rMin: 0, rMax: 12 },
    { type: 'cave_bear', count: 6, cx: 900, cy: 380, rMin: 0, rMax: 10 },
    { type: 'storm_eagle', count: 6, cx: 880, cy: 200, rMin: 0, rMax: 10 },
    { type: 'storm_eagle', count: 5, cx: 700, cy: 160, rMin: 0, rMax: 10 },
    { type: 'mammoth',  count: 6,  cx: 700, cy: 100, rMin: 0, rMax: 12 },
    { type: 'mammoth',  count: 5,  cx: 820, cy: 80, rMin: 0, rMax: 10 },
    { type: 'dire_wolf', count: 6, cx: WWALD.x, cy: WWALD.y - 20, rMin: 0, rMax: 10 },
    { type: 'dire_wolf', count: 5, cx: 540, cy: 100, rMin: 0, rMax: 10 },
    { type: 'spectral_dragon', count: 3, cx: RUIN.x + 10, cy: RUIN.y + 10, rMin: 0, rMax: 8 },
    { type: 'spectral_dragon', count: 3, cx: LAIR.x, cy: LAIR.y + 16, rMin: 0, rMax: 8 },
  );

  // Streu-Spawns: zufällige Wildnis-Gruppen auf ERREICHBAREN Kacheln.
  // 85 gemischte Gruppen + 35 Elite-Gruppen fernab der Städte:
  // die Wildnis lebt ÜBERALL, nicht nur an festen Orten.
  const inAnyTown = (x, y) => towns.some((t) => Math.abs(x - t.cx) <= t.r + 6 && Math.abs(y - t.cy) <= t.r + 6);
  const distToTown = (x, y) => Math.min(...towns.map((t) => Math.hypot(x - t.cx, y - t.cy)));
  const scatterPool = [
    'rat', 'bat', 'boar', 'wolf', 'spider', 'goblin', 'snake', 'bandit', 'scorpion', 'bear', 'troll', 'orc',
    'chicken', 'fox', 'slime', 'kobold', 'giant_wasp', 'hyena', 'gnoll', 'crocodile', 'pirate',
    'sheep', 'giant_beetle', 'king_cobra',
  ];
  const elitePool = [
    'witch', 'orc_shaman', 'panther', 'frost_wolf', 'gargoyle', 'basilisk', 'treant',
    'sabertooth', 'hunter', 'dark_elf', 'werewolf', 'ogre', 'harpy', 'ghoul', 'lizardman',
    'swamp_lurker', 'forest_spirit', 'cave_bear',
  ];
  const placeScatter = (pool, groups, minTownDist) => {
    let placed = 0;
    let guard = 0;
    while (placed < groups && guard++ < 8000) {
      const ni = reachList[Math.floor(rand() * reachList.length)];
      const x = ni % SIZE, y = Math.floor(ni / SIZE);
      if (inAnyTown(x, y)) continue;
      if (minTownDist && distToTown(x, y) < minTownDist) continue;
      const type = pool[Math.floor(rand() * pool.length)];
      spawns.push({ type, count: 5 + Math.floor(rand() * 4), cx: x, cy: y, rMin: 0, rMax: 10 });
      placed++;
    }
  };
  placeScatter(scatterPool, 85, 0);
  placeScatter(elitePool, 35, 90);

  // Höhlen- und Gipfel-Spawns dazu (haben ein z-Feld)
  spawns.push(...caveSpawns);

  // ---- Boss-Plätze: tief in der Unterwelt (Quest-Kopplung in game.js) ----
  const bossLairs = [
    { type: 'boss_spider_queen', x: 285,  y: 472,  z: -1, r: 4, quest: 'bq_spider', zone: 'in der Spinnentiefe (1. UG unter dem Spinnenwald)' },
    { type: 'boss_orc_warlord',  x: 472,  y: 987,  z: -1, r: 4, quest: 'bq_orc',    zone: 'in der Kriegsmine (1. UG unter der Ork-Festung)' },
    { type: 'boss_yeti_king',    x: 733,  y: 130,  z: -2, r: 4, quest: 'bq_yeti',   zone: 'in der Eisgrotte (2. UG unter den Yeti-Bergen)' },
    { type: 'boss_lich_king',    x: 927,  y: 747,  z: -2, r: 4, quest: 'bq_lich',   zone: 'in der Tiefengruft (2. UG unter den Ruinen)' },
    { type: 'boss_dragon_lord',  x: 1012, y: 190,  z: -3, r: 4, quest: 'bq_dragon', zone: 'im Urdrachen-Schlund (3. UG unter dem Drachenhort)' },
  ];
  // Mögliche Erscheinungsorte des Weltbosses (Uralter Titan)
  const worldBossSpots = [
    { x: 576, y: 760, name: 'südlich von Kiria' },
    { x: 400, y: 576, name: 'westlich von Kiria' },
    { x: 760, y: 430, name: 'nordöstlich von Kiria' },
    { x: 300, y: 800, name: 'nördlich von Porta' },
    { x: 860, y: 560, name: 'westlich der Ruinen' },
  ];

  return {
    size: SIZE, floors, tiles, heights, buildings, spawns, npcs, templeSpawn,
    towns, fountains, farm, reachable, bossLairs, worldBossSpots, stairs,
  };
}

// Begehbar auf Ebene z? (z = -3..+2, Standard Oberwelt)
function isWalkable(world, x, y, z = 0) {
  if (x < 0 || y < 0 || x >= world.size || y >= world.size) return false;
  const f = world.floors[z + 3];
  if (!f) return false;
  return WALKABLE.has(f.tiles[y * world.size + x]);
}

module.exports = { generateWorld, isWalkable, SIZE };
