// ---------------------------------------------------------------
// Kiria Online 3D – gemeinsame Spielkonstanten (v5)
// ---------------------------------------------------------------

const TILE = {
  WATER: 0, SAND: 1, GRASS: 2, TREE: 3, ROCK: 4,
  ROAD: 5, WALL: 6, LAVA: 7, DIRT: 8, GRAVE: 9,
};

// Begehbare Kacheltypen
const WALKABLE = new Set([TILE.SAND, TILE.GRASS, TILE.ROAD, TILE.DIRT, TILE.GRAVE]);

// tame: true → Bestienzüchter kann das Tier zähmen
const MONSTERS = {
  rat:      { name: 'Ratte',        hp: 25,   dmg: 6,  atkMs: 2000, moveMs: 650, xp: 12,   gold: [1, 6],     aggro: 5, tame: true,  drops: [{ item: 'hp_potion', p: 0.05 }] },
  snake:    { name: 'Schlange',     hp: 40,   dmg: 10, atkMs: 2000, moveMs: 700, xp: 20,   gold: [0, 5],     aggro: 5, tame: true,  drops: [{ item: 'mp_potion', p: 0.05 }] },
  spider:   { name: 'Spinne',       hp: 55,   dmg: 12, atkMs: 1800, moveMs: 480, xp: 30,   gold: [1, 8],     aggro: 7, tame: true,  drops: [{ item: 'mp_potion', p: 0.07 }] },
  wolf:     { name: 'Wolf',         hp: 70,   dmg: 14, atkMs: 1800, moveMs: 450, xp: 35,   gold: [2, 10],    aggro: 8, tame: true,  drops: [{ item: 'hp_potion', p: 0.08 }] },
  orc:      { name: 'Ork',          hp: 140,  dmg: 22, atkMs: 2000, moveMs: 550, xp: 80,   gold: [8, 30],    aggro: 7, drops: [{ item: 'sword', p: 0.07 }, { item: 'leather', p: 0.05 }, { item: 'leather_helm', p: 0.05 }, { item: 'wood_shield', p: 0.05 }, { item: 'hp_potion', p: 0.12 }] },
  troll:    { name: 'Troll',        hp: 180,  dmg: 26, atkMs: 2200, moveMs: 620, xp: 120,  gold: [12, 40],   aggro: 7, drops: [{ item: 'boots', p: 0.07 }, { item: 'wood_shield', p: 0.06 }, { item: 'hp_potion', p: 0.15 }] },
  skeleton: { name: 'Skelett',      hp: 220,  dmg: 32, atkMs: 2000, moveMs: 600, xp: 150,  gold: [15, 50],   aggro: 8, drops: [{ item: 'axe', p: 0.05 }, { item: 'chain', p: 0.04 }, { item: 'iron_helm', p: 0.03 }, { item: 'mp_potion', p: 0.12 }] },
  ghost:    { name: 'Geist',        hp: 160,  dmg: 30, atkMs: 1800, moveMs: 480, xp: 140,  gold: [10, 45],   aggro: 8, drops: [{ item: 'mp_potion', p: 0.18 }, { item: 'magic_hat', p: 0.03 }] },
  bear:     { name: 'Bär',          hp: 260,  dmg: 35, atkMs: 2200, moveMs: 560, xp: 180,  gold: [5, 25],    aggro: 6, tame: true,  drops: [{ item: 'hp_potion', p: 0.2 }] },
  cyclops:  { name: 'Zyklop',       hp: 450,  dmg: 48, atkMs: 2400, moveMs: 620, xp: 350,  gold: [40, 110],  aggro: 8, drops: [{ item: 'axe', p: 0.08 }, { item: 'iron_shield', p: 0.06 }, { item: 'iron_helm', p: 0.06 }, { item: 'iron_boots', p: 0.05 }, { item: 'hp_potion', p: 0.25 }] },
  dragon:   { name: 'Drache',       hp: 900,  dmg: 65, atkMs: 2200, moveMs: 520, xp: 1000, gold: [120, 350], aggro: 9, ranged: { dmg: 45, range: 5, ms: 3000 }, drops: [{ item: 'fire_sword', p: 0.15 }, { item: 'plate', p: 0.1 }, { item: 'dragon_shield', p: 0.08 }, { item: 'dragon_helm', p: 0.08 }, { item: 'hp_potion', p: 0.5 }] },
  demon:    { name: 'Dämon',        hp: 1500, dmg: 85, atkMs: 2400, moveMs: 540, xp: 2200, gold: [250, 600], aggro: 9, ranged: { dmg: 60, range: 5, ms: 2800 }, drops: [{ item: 'demon_blade', p: 0.12 }, { item: 'demon_plate', p: 0.1 }, { item: 'swift_boots', p: 0.12 }, { item: 'hp_potion', p: 0.6 }, { item: 'mp_potion', p: 0.6 }] },
};

const ITEMS = {
  // Tränke
  hp_potion:    { name: 'Heiltrank',        kind: 'potion', heal: 150, price: 45 },
  mp_potion:    { name: 'Manatrank',        kind: 'potion', mana: 120, price: 55 },
  // Waffen
  dagger:       { name: 'Dolch',            kind: 'weapon', atk: 8,  price: 40 },
  sword:        { name: 'Schwert',          kind: 'weapon', atk: 18, price: 250 },
  axe:          { name: 'Kriegsaxt',        kind: 'weapon', atk: 28, price: 900 },
  fire_sword:   { name: 'Feuerschwert',     kind: 'weapon', atk: 42, price: 4000 },
  demon_blade:  { name: 'Dämonenklinge',    kind: 'weapon', atk: 55, price: 12000 },
  // Rüstungen
  leather:      { name: 'Lederrüstung',     kind: 'armor', def: 8,  price: 120 },
  chain:        { name: 'Kettenrüstung',    kind: 'armor', def: 16, price: 800 },
  plate:        { name: 'Plattenrüstung',   kind: 'armor', def: 26, price: 3500 },
  demon_plate:  { name: 'Dämonenrüstung',   kind: 'armor', def: 36, price: 10000 },
  // Helme
  leather_helm: { name: 'Lederkappe',       kind: 'helmet', def: 4,  price: 80 },
  iron_helm:    { name: 'Eisenhelm',        kind: 'helmet', def: 9,  price: 600 },
  magic_hat:    { name: 'Magierhut',        kind: 'helmet', def: 7,  price: 900 },
  dragon_helm:  { name: 'Drachenhelm',      kind: 'helmet', def: 16, price: 3000 },
  // Schilde
  wood_shield:  { name: 'Holzschild',       kind: 'shield', def: 6,  price: 100 },
  iron_shield:  { name: 'Eisenschild',      kind: 'shield', def: 12, price: 900 },
  dragon_shield:{ name: 'Drachenschild',    kind: 'shield', def: 20, price: 4500 },
  // Stiefel
  boots:        { name: 'Lederstiefel',     kind: 'boots', def: 2, price: 60 },
  iron_boots:   { name: 'Eisenstiefel',     kind: 'boots', def: 6, price: 700 },
  swift_boots:  { name: 'Windstiefel',      kind: 'boots', def: 3, speed: 30, price: 2500 },
};

const EQUIP_SLOTS = ['weapon', 'armor', 'helmet', 'shield', 'boots'];

// Zauber – jeder Beruf hat seine eigene Liste (VOCATIONS[..].spells)
const SPELLS = {
  exura:        { name: 'Exura',            desc: 'Kleine Heilung',                      lvl: 1,  mana: 20,  cd: 1000, kind: 'heal', power: 1 },
  exura_gran:   { name: 'Exura Gran',       desc: 'Große Heilung',                       lvl: 12, mana: 65,  cd: 1200, kind: 'heal', power: 2.6 },
  // Ritter
  exori:        { name: 'Exori',            desc: 'Wirbelangriff auf alle Nachbarn',     lvl: 8,  mana: 40,  cd: 4000, kind: 'aoe1', power: 1.5 },
  exori_gran:   { name: 'Exori Gran',       desc: 'Mächtiger Wirbelangriff',             lvl: 18, mana: 90,  cd: 6000, kind: 'aoe1', power: 2.6 },
  utito:        { name: 'Utito Tempo',      desc: '+40% Angriff für 12 Sekunden',        lvl: 14, mana: 70,  cd: 20000, kind: 'buff', buff: 'atk', dur: 12000 },
  // Paladin
  exori_san:    { name: 'Exori San',        desc: 'Heiliges Geschoss',                   lvl: 6,  mana: 30,  cd: 2000, range: 7, kind: 'missile', base: 28, perLvl: 3.0, fx: 'san' },
  exevo_san:    { name: 'Exevo Mas San',    desc: 'Heilige Explosion um dich',           lvl: 16, mana: 100, cd: 7000, radius: 3, kind: 'nova', base: 50, perLvl: 4.2, fx: 'san' },
  utamo:        { name: 'Utamo Vita',       desc: '-40% Schaden für 12 Sekunden',        lvl: 10, mana: 60,  cd: 20000, kind: 'buff', buff: 'def', dur: 12000 },
  // Magier
  exori_flam:   { name: 'Exori Flam',       desc: 'Feuergeschoss',                       lvl: 3,  mana: 25,  cd: 2000, range: 7, kind: 'missile', base: 30, perLvl: 3.2, fx: 'flam' },
  exori_vis:    { name: 'Exori Vis',        desc: 'Blitzschlag (stark)',                 lvl: 10, mana: 50,  cd: 2500, range: 7, kind: 'missile', base: 55, perLvl: 4.5, fx: 'vis' },
  exevo_gran:   { name: 'Exevo Gran',       desc: 'Feuer-Explosion um dich',             lvl: 14, mana: 120, cd: 8000, radius: 3, kind: 'nova', base: 55, perLvl: 4.5, fx: 'flam' },
  exevo_mas:    { name: 'Exevo Gran Mas',   desc: 'Gewaltige Feuersbrunst',              lvl: 24, mana: 240, cd: 14000, radius: 4, kind: 'nova', base: 95, perLvl: 6.0, fx: 'flam' },
  // Bestienzüchter
  utevo_bestia: { name: 'Utevo Bestia',     desc: 'Zähmt das Ziel (unter 60% Leben)',    lvl: 1,  mana: 40,  cd: 4000, range: 3, kind: 'tame' },
  exura_bestia: { name: 'Exura Bestia',     desc: 'Heilt dein Tier',                     lvl: 8,  mana: 45,  cd: 2000, kind: 'petheal', power: 2 },
  utito_bestia: { name: 'Utito Bestia',     desc: 'Dein Tier: +50% Angriff, 15 Sek.',    lvl: 15, mana: 90,  cd: 25000, kind: 'petbuff', dur: 15000 },
};

// range = Reichweite des normalen Angriffs (Fernkampf für Paladin/Magier/Züchter)
const VOCATIONS = {
  knight:   { name: 'Ritter',         desc: 'Viel Leben, starker Nahkampf',        hp: 180, mp: 40,  hpL: 35, mpL: 10, melee: 1.35, spell: 0.9,  range: 1, atkFx: 'slash',
              spells: ['exura', 'exori', 'utito', 'exori_gran', 'exura_gran'] },
  paladin:  { name: 'Paladin',        desc: 'Kämpft mit Wurfspeeren auf Distanz',  hp: 150, mp: 70,  hpL: 25, mpL: 20, melee: 1.10, spell: 1.15, range: 5, atkFx: 'spear',
              spells: ['exura', 'exori_san', 'utamo', 'exevo_san', 'exura_gran'] },
  sorcerer: { name: 'Magier',         desc: 'Magische Geschosse, mächtige Zauber', hp: 120, mp: 110, hpL: 18, mpL: 32, melee: 0.85, spell: 1.5,  range: 4, atkFx: 'zap',
              spells: ['exura', 'exori_flam', 'exori_vis', 'exevo_gran', 'exevo_mas'] },
  tamer:    { name: 'Bestienzüchter', desc: 'Zähmt Bestien, die für ihn kämpfen',  hp: 140, mp: 90,  hpL: 24, mpL: 24, melee: 0.95, spell: 1.1,  range: 3, atkFx: 'leaf',
              spells: ['exura', 'utevo_bestia', 'exura_bestia', 'utito_bestia', 'exura_gran'] },
};

// Was Händler verkaufen
const SHOP_ITEMS = ['hp_potion', 'mp_potion', 'dagger', 'sword', 'leather', 'chain', 'leather_helm', 'wood_shield', 'boots'];

// Gesamt-XP, die für ein Level nötig ist
function xpForLevel(lvl) { return 100 * (lvl - 1) * (lvl - 1); }
// XP-Kurve für Tiere des Bestienzüchters
function petXpForLevel(lvl) { return 60 * (lvl - 1) * (lvl - 1); }

module.exports = { TILE, WALKABLE, MONSTERS, ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS, SHOP_ITEMS, xpForLevel, petXpForLevel };
