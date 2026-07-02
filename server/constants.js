// ---------------------------------------------------------------
// Kiria Online 3D – gemeinsame Spielkonstanten (v8)
// 38 Monster (stark!), 10 Zauber pro Beruf, XP-Rebalance,
// Mounts, Essen, Berufs-Ausrüstung, 25 Quests
// ---------------------------------------------------------------

const TILE = {
  WATER: 0, SAND: 1, GRASS: 2, TREE: 3, ROCK: 4,
  ROAD: 5, WALL: 6, LAVA: 7, DIRT: 8, GRAVE: 9, FOUNTAIN: 10, FLOOR: 11,
};

const WALKABLE = new Set([TILE.SAND, TILE.GRASS, TILE.ROAD, TILE.DIRT, TILE.GRAVE, TILE.FLOOR]);

// tame: zähmbar • flee: flieht bei wenig Leben • kite: hält Abstand (Fernkampf)
// pack: alarmiert Artgenossen in der Nähe
const MONSTERS = {
  // ---- Anfänger (rund um alle Städte) ----
  bat:       { name: 'Fledermaus',    hp: 20,   dmg: 5,   atkMs: 1800, moveMs: 420, xp: 3,   gold: [0, 3],     aggro: 5, flee: true, drops: [] },
  rat:       { name: 'Ratte',         hp: 30,   dmg: 7,   atkMs: 1900, moveMs: 600, xp: 4,   gold: [1, 5],     aggro: 5, tame: true, flee: true, drops: [{ item: 'cheese', p: 0.35 }] },
  crab:      { name: 'Krabbe',        hp: 50,   dmg: 11,  atkMs: 2100, moveMs: 700, xp: 6,   gold: [1, 7],     aggro: 5, drops: [{ item: 'meat', p: 0.3 }] },
  snake:     { name: 'Schlange',      hp: 45,   dmg: 12,  atkMs: 1900, moveMs: 650, xp: 7,   gold: [0, 5],     aggro: 6, tame: true, drops: [{ item: 'mp_potion', p: 0.05 }] },
  boar:      { name: 'Wildschwein',   hp: 65,   dmg: 15,  atkMs: 2000, moveMs: 520, xp: 9,   gold: [0, 4],     aggro: 6, tame: true, drops: [{ item: 'meat', p: 0.5 }, { item: 'ham', p: 0.1 }] },
  spider:    { name: 'Spinne',        hp: 60,   dmg: 15,  atkMs: 1700, moveMs: 460, xp: 10,  gold: [1, 8],     aggro: 7, tame: true, pack: true, drops: [{ item: 'mp_potion', p: 0.07 }] },
  wolf:      { name: 'Wolf',          hp: 85,   dmg: 19,  atkMs: 1700, moveMs: 430, xp: 13,  gold: [2, 9],     aggro: 8, tame: true, pack: true, drops: [{ item: 'meat', p: 0.4 }, { item: 'saddle_wolf', p: 0.008 }] },
  goblin:    { name: 'Goblin',        hp: 105,  dmg: 20,  atkMs: 1800, moveMs: 480, xp: 14,  gold: [4, 16],    aggro: 7, flee: true, pack: true, drops: [{ item: 'dagger', p: 0.07 }, { item: 'cheese', p: 0.2 }, { item: 'cloth_legs', p: 0.05 }] },
  // ---- Mittelstufe ----
  bandit:    { name: 'Bandit',        hp: 190,  dmg: 30,  atkMs: 1900, moveMs: 480, xp: 25,  gold: [10, 40],   aggro: 8, pack: true, drops: [{ item: 'dagger', p: 0.08 }, { item: 'leather', p: 0.06 }, { item: 'leather_legs', p: 0.05 }, { item: 'bread', p: 0.2 }] },
  scorpion:  { name: 'Skorpion',      hp: 200,  dmg: 36,  atkMs: 1500, moveMs: 500, xp: 28,  gold: [8, 30],    aggro: 8, drops: [{ item: 'mp_potion', p: 0.12 }, { item: 'leather_legs', p: 0.05 }] },
  orc:       { name: 'Ork',           hp: 220,  dmg: 34,  atkMs: 1900, moveMs: 520, xp: 30,  gold: [8, 32],    aggro: 7, pack: true, drops: [{ item: 'sword', p: 0.05 }, { item: 'bow', p: 0.04 }, { item: 'leather', p: 0.05 }, { item: 'leather_helm', p: 0.05 }, { item: 'meat', p: 0.25 }, { item: 'hp_potion', p: 0.1 }] },
  troll:     { name: 'Troll',         hp: 280,  dmg: 42,  atkMs: 2100, moveMs: 580, xp: 40,  gold: [12, 42],   aggro: 7, drops: [{ item: 'boots', p: 0.06 }, { item: 'wood_shield', p: 0.06 }, { item: 'meat', p: 0.3 }, { item: 'hp_potion', p: 0.12 }] },
  ghost:     { name: 'Geist',         hp: 250,  dmg: 42,  atkMs: 1700, moveMs: 450, xp: 45,  gold: [10, 45],   aggro: 8, drops: [{ item: 'mp_potion', p: 0.16 }, { item: 'magic_hat', p: 0.02 }] },
  skeleton:  { name: 'Skelett',       hp: 320,  dmg: 46,  atkMs: 1900, moveMs: 560, xp: 48,  gold: [14, 48],   aggro: 8, drops: [{ item: 'axe', p: 0.04 }, { item: 'wand', p: 0.04 }, { item: 'chain', p: 0.04 }, { item: 'iron_helm', p: 0.03 }, { item: 'mp_potion', p: 0.1 }] },
  zombie:    { name: 'Zombie',        hp: 400,  dmg: 48,  atkMs: 2100, moveMs: 720, xp: 55,  gold: [18, 55],   aggro: 8, drops: [{ item: 'leather', p: 0.06 }, { item: 'leather_legs', p: 0.05 }, { item: 'hp_potion', p: 0.12 }] },
  hunter:    { name: 'Wilderer',      hp: 400,  dmg: 38,  atkMs: 1900, moveMs: 480, xp: 60,  gold: [25, 80],   aggro: 9, kite: true, ranged: { dmg: 48, range: 6, ms: 2300 }, drops: [{ item: 'crossbow', p: 0.05 }, { item: 'ranger_legs', p: 0.04 }, { item: 'meat', p: 0.25 }, { item: 'hp_potion', p: 0.12 }] },
  bear:      { name: 'Bär',           hp: 450,  dmg: 55,  atkMs: 2100, moveMs: 540, xp: 65,  gold: [5, 25],    aggro: 6, tame: true, drops: [{ item: 'meat', p: 0.5 }, { item: 'ham', p: 0.25 }, { item: 'saddle_bear', p: 0.008 }, { item: 'hp_potion', p: 0.15 }] },
  lizardman: { name: 'Echsenkrieger', hp: 500,  dmg: 58,  atkMs: 1900, moveMs: 500, xp: 75,  gold: [25, 75],   aggro: 8, pack: true, drops: [{ item: 'chain', p: 0.06 }, { item: 'iron_shield', p: 0.04 }, { item: 'hp_potion', p: 0.15 }] },
  dark_elf:  { name: 'Dunkelelf',     hp: 480,  dmg: 42,  atkMs: 1800, moveMs: 460, xp: 85,  gold: [30, 90],   aggro: 9, kite: true, ranged: { dmg: 62, range: 6, ms: 2200 }, drops: [{ item: 'elven_bow', p: 0.02 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.2 }] },
  ghoul:     { name: 'Ghul',          hp: 520,  dmg: 62,  atkMs: 1800, moveMs: 500, xp: 80,  gold: [28, 80],   aggro: 8, pack: true, drops: [{ item: 'chain', p: 0.05 }, { item: 'wild_claws', p: 0.04 }, { item: 'mp_potion', p: 0.14 }] },
  harpy:     { name: 'Harpyie',       hp: 500,  dmg: 52,  atkMs: 1700, moveMs: 400, xp: 90,  gold: [30, 85],   aggro: 9, kite: true, ranged: { dmg: 58, range: 5, ms: 2400 }, drops: [{ item: 'swift_boots', p: 0.015 }, { item: 'mp_potion', p: 0.2 }] },
  orc_berserker: { name: 'Ork-Berserker', hp: 560, dmg: 66, atkMs: 1700, moveMs: 460, xp: 85, gold: [30, 90], aggro: 8, pack: true, drops: [{ item: 'axe', p: 0.05 }, { item: 'chain', p: 0.05 }, { item: 'iron_helm', p: 0.04 }, { item: 'ham', p: 0.15 }, { item: 'hp_potion', p: 0.15 }] },
  banshee:   { name: 'Todesfee',      hp: 580,  dmg: 58,  atkMs: 1900, moveMs: 460, xp: 100, gold: [35, 110],  aggro: 8, kite: true, ranged: { dmg: 70, range: 5, ms: 2400 }, drops: [{ item: 'magic_hat', p: 0.04 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.18 }] },
  werewolf:  { name: 'Werwolf',       hp: 650,  dmg: 70,  atkMs: 1600, moveMs: 380, xp: 110, gold: [20, 70],   aggro: 9, pack: true, drops: [{ item: 'swift_boots', p: 0.02 }, { item: 'hide_legs', p: 0.04 }, { item: 'meat', p: 0.3 }, { item: 'hp_potion', p: 0.18 }] },
  mummy:     { name: 'Mumie',         hp: 750,  dmg: 72,  atkMs: 2000, moveMs: 620, xp: 120, gold: [45, 120],  aggro: 8, drops: [{ item: 'silk_legs', p: 0.05 }, { item: 'fire_wand', p: 0.03 }, { item: 'mp_potion', p: 0.2 }] },
  // ---- Oberstufe ----
  giant_spider: { name: 'Riesenspinne', hp: 850, dmg: 78, atkMs: 1700, moveMs: 420, xp: 140, gold: [40, 120],  aggro: 9, tame: true, pack: true, drops: [{ item: 'saddle_spider', p: 0.008 }, { item: 'ranger_armor', p: 0.025 }, { item: 'mp_potion', p: 0.2 }] },
  minotaur:  { name: 'Minotaurus',    hp: 950,  dmg: 85,  atkMs: 2100, moveMs: 500, xp: 160, gold: [55, 150],  aggro: 8, drops: [{ item: 'axe', p: 0.07 }, { item: 'iron_shield', p: 0.07 }, { item: 'plate_legs', p: 0.025 }, { item: 'saddle_minotaur', p: 0.008 }, { item: 'ham', p: 0.3 }, { item: 'hp_potion', p: 0.2 }] },
  ogre:      { name: 'Oger',          hp: 1000, dmg: 88,  atkMs: 2300, moveMs: 580, xp: 165, gold: [50, 145],  aggro: 8, drops: [{ item: 'iron_boots', p: 0.05 }, { item: 'iron_helm', p: 0.06 }, { item: 'ham', p: 0.35 }, { item: 'hp_potion', p: 0.2 }] },
  cyclops:   { name: 'Zyklop',        hp: 1100, dmg: 92,  atkMs: 2300, moveMs: 580, xp: 175, gold: [50, 145],  aggro: 8, drops: [{ item: 'axe', p: 0.07 }, { item: 'iron_shield', p: 0.06 }, { item: 'iron_helm', p: 0.06 }, { item: 'iron_boots', p: 0.05 }, { item: 'ham', p: 0.25 }, { item: 'hp_potion', p: 0.2 }] },
  vampire:   { name: 'Vampir',        hp: 1300, dmg: 100, atkMs: 1700, moveMs: 440, xp: 220, gold: [70, 200],  aggro: 9, drops: [{ item: 'robe', p: 0.03 }, { item: 'elven_bow', p: 0.025 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.25 }] },
  golem:     { name: 'Steingolem',    hp: 1450, dmg: 90,  atkMs: 2400, moveMs: 700, xp: 240, gold: [55, 170],  aggro: 7, drops: [{ item: 'plate_legs', p: 0.035 }, { item: 'iron_shield', p: 0.07 }, { item: 'saddle_golem', p: 0.008 }, { item: 'plate', p: 0.025 }] },
  dark_knight: { name: 'Dunkler Ritter', hp: 1650, dmg: 110, atkMs: 1900, moveMs: 480, xp: 300, gold: [90, 240], aggro: 9, drops: [{ item: 'sword', p: 0.1 }, { item: 'plate', p: 0.04 }, { item: 'plate_legs', p: 0.04 }, { item: 'iron_shield', p: 0.08 }, { item: 'hp_potion', p: 0.3 }] },
  yeti:      { name: 'Yeti',          hp: 1800, dmg: 115, atkMs: 2200, moveMs: 520, xp: 320, gold: [80, 220],  aggro: 8, drops: [{ item: 'swift_boots', p: 0.03 }, { item: 'beast_hide', p: 0.035 }, { item: 'ham', p: 0.4 }, { item: 'hp_potion', p: 0.3 }] },
  fire_elemental: { name: 'Feuerelementar', hp: 1900, dmg: 120, atkMs: 1900, moveMs: 500, xp: 350, gold: [90, 260], aggro: 9, kite: true, ranged: { dmg: 85, range: 5, ms: 2400 }, drops: [{ item: 'fire_wand', p: 0.05 }, { item: 'fire_sword', p: 0.04 }, { item: 'mp_potion', p: 0.35 }] },
  wyrm:      { name: 'Wyrm',          hp: 2200, dmg: 125, atkMs: 2100, moveMs: 480, xp: 450, gold: [120, 340], aggro: 9, ranged: { dmg: 90, range: 5, ms: 2600 }, drops: [{ item: 'storm_staff', p: 0.035 }, { item: 'dragon_shield', p: 0.05 }, { item: 'saddle_wyrm', p: 0.008 }, { item: 'mp_potion', p: 0.35 }] },
  dragon:    { name: 'Drache',        hp: 2600, dmg: 135, atkMs: 2100, moveMs: 500, xp: 550, gold: [140, 400], aggro: 9, ranged: { dmg: 95, range: 5, ms: 2700 }, drops: [{ item: 'fire_sword', p: 0.08 }, { item: 'elven_bow', p: 0.05 }, { item: 'plate', p: 0.06 }, { item: 'dragon_shield', p: 0.07 }, { item: 'dragon_helm', p: 0.07 }, { item: 'saddle_dragon', p: 0.015 }, { item: 'ham', p: 0.5 }] },
  lich:      { name: 'Lich',          hp: 2800, dmg: 115, atkMs: 2000, moveMs: 550, xp: 650, gold: [180, 480], aggro: 9, kite: true, ranged: { dmg: 130, range: 6, ms: 2400 }, drops: [{ item: 'demon_staff', p: 0.04 }, { item: 'storm_staff', p: 0.07 }, { item: 'magic_hat', p: 0.1 }, { item: 'robe', p: 0.05 }, { item: 'mp_potion', p: 0.5 }] },
  demon:     { name: 'Dämon',         hp: 3400, dmg: 165, atkMs: 2200, moveMs: 500, xp: 900, gold: [260, 700], aggro: 9, ranged: { dmg: 115, range: 5, ms: 2500 }, drops: [{ item: 'demon_blade', p: 0.05 }, { item: 'demon_bow', p: 0.05 }, { item: 'demon_staff', p: 0.05 }, { item: 'demon_claws', p: 0.05 }, { item: 'demon_plate', p: 0.06 }, { item: 'swift_boots', p: 0.1 }, { item: 'hp_potion', p: 0.5 }, { item: 'mp_potion', p: 0.5 }] },
};

// voc: nur diese Berufe können es tragen (fehlt = alle)
const ITEMS = {
  hp_potion:    { name: 'Heiltrank',       kind: 'potion', heal: 150, price: 45 },
  mp_potion:    { name: 'Manatrank',       kind: 'potion', mana: 120, price: 55 },
  cheese:       { name: 'Käse',            kind: 'food', food: 90,  price: 15 },
  bread:        { name: 'Brot',            kind: 'food', food: 120, price: 20 },
  meat:         { name: 'Fleisch',         kind: 'food', food: 180, price: 35 },
  ham:          { name: 'Schinken',        kind: 'food', food: 300, price: 60 },
  dagger:       { name: 'Dolch',           kind: 'weapon', atk: 8,  price: 40 },
  sword:        { name: 'Schwert',         kind: 'weapon', atk: 18, price: 250,  voc: ['knight'] },
  axe:          { name: 'Kriegsaxt',       kind: 'weapon', atk: 28, price: 900,  voc: ['knight'] },
  fire_sword:   { name: 'Feuerschwert',    kind: 'weapon', atk: 42, price: 4000, voc: ['knight'] },
  demon_blade:  { name: 'Dämonenklinge',   kind: 'weapon', atk: 55, price: 12000, voc: ['knight'] },
  bow:          { name: 'Jagdbogen',       kind: 'weapon', atk: 16, price: 220,  voc: ['paladin'] },
  crossbow:     { name: 'Armbrust',        kind: 'weapon', atk: 26, price: 900,  voc: ['paladin'] },
  elven_bow:    { name: 'Elfenbogen',      kind: 'weapon', atk: 40, price: 4000, voc: ['paladin'] },
  demon_bow:    { name: 'Dämonenbogen',    kind: 'weapon', atk: 54, price: 12000, voc: ['paladin'] },
  wand:         { name: 'Zauberstab',      kind: 'weapon', atk: 16, price: 220,  voc: ['sorcerer'] },
  fire_wand:    { name: 'Feuerstab',       kind: 'weapon', atk: 26, price: 900,  voc: ['sorcerer'] },
  storm_staff:  { name: 'Sturmstab',       kind: 'weapon', atk: 40, price: 4000, voc: ['sorcerer'] },
  demon_staff:  { name: 'Dämonenstab',     kind: 'weapon', atk: 54, price: 12000, voc: ['sorcerer'] },
  claws:        { name: 'Bestien-Handschuhe', kind: 'weapon', atk: 16, price: 220, voc: ['tamer'] },
  wild_claws:   { name: 'Wildkrallen',     kind: 'weapon', atk: 26, price: 900,  voc: ['tamer'] },
  beast_claws:  { name: 'Bestienklauen',   kind: 'weapon', atk: 40, price: 4000, voc: ['tamer'] },
  demon_claws:  { name: 'Dämonenkrallen',  kind: 'weapon', atk: 54, price: 12000, voc: ['tamer'] },
  leather:      { name: 'Lederrüstung',    kind: 'armor', def: 8,  price: 120 },
  chain:        { name: 'Kettenrüstung',   kind: 'armor', def: 16, price: 800 },
  plate:        { name: 'Plattenrüstung',  kind: 'armor', def: 26, price: 3500, voc: ['knight'] },
  demon_plate:  { name: 'Dämonenrüstung',  kind: 'armor', def: 36, price: 10000, voc: ['knight'] },
  ranger_armor: { name: 'Waldläufer-Rüstung', kind: 'armor', def: 24, price: 3200, voc: ['paladin'] },
  robe:         { name: 'Magierrobe',      kind: 'armor', def: 22, price: 3000, voc: ['sorcerer'] },
  beast_hide:   { name: 'Bestienfell',     kind: 'armor', def: 24, price: 3200, voc: ['tamer'] },
  cloth_legs:   { name: 'Stoffhose',       kind: 'legs', def: 3,  price: 50 },
  leather_legs: { name: 'Lederhose',       kind: 'legs', def: 6,  price: 300 },
  plate_legs:   { name: 'Plattenbeinschutz', kind: 'legs', def: 14, price: 2500, voc: ['knight'] },
  ranger_legs:  { name: 'Waldläufer-Hose', kind: 'legs', def: 12, price: 2200, voc: ['paladin'] },
  silk_legs:    { name: 'Seidenhose',      kind: 'legs', def: 12, price: 2200, voc: ['sorcerer'] },
  hide_legs:    { name: 'Fellhose',        kind: 'legs', def: 12, price: 2200, voc: ['tamer'] },
  leather_helm: { name: 'Lederkappe',      kind: 'helmet', def: 4,  price: 80 },
  iron_helm:    { name: 'Eisenhelm',       kind: 'helmet', def: 9,  price: 600 },
  magic_hat:    { name: 'Magierhut',       kind: 'helmet', def: 7,  price: 900, voc: ['sorcerer'] },
  dragon_helm:  { name: 'Drachenhelm',     kind: 'helmet', def: 16, price: 3000 },
  torch:        { name: 'Fackel',          kind: 'shield', def: 1, light: true, price: 30 },
  wood_shield:  { name: 'Holzschild',      kind: 'shield', def: 6,  price: 100 },
  iron_shield:  { name: 'Eisenschild',     kind: 'shield', def: 12, price: 900 },
  dragon_shield:{ name: 'Drachenschild',   kind: 'shield', def: 20, price: 4500 },
  boots:        { name: 'Lederstiefel',    kind: 'boots', def: 2, price: 60 },
  iron_boots:   { name: 'Eisenstiefel',    kind: 'boots', def: 6, price: 700 },
  swift_boots:  { name: 'Windstiefel',     kind: 'boots', def: 3, speed: 30, price: 2500 },
  saddle_horse:    { name: 'Pferdesattel',      kind: 'mount', mount: 'horse',        price: 2000 },
  saddle_wolf:     { name: 'Wolfssattel',       kind: 'mount', mount: 'wolf',         price: 5000 },
  saddle_bear:     { name: 'Bärensattel',       kind: 'mount', mount: 'bear',         price: 5000 },
  saddle_spider:   { name: 'Spinnensattel',     kind: 'mount', mount: 'giant_spider', price: 8000 },
  saddle_minotaur: { name: 'Minotaurus-Sattel', kind: 'mount', mount: 'minotaur',     price: 8000 },
  saddle_golem:    { name: 'Golem-Sattel',      kind: 'mount', mount: 'golem',        price: 10000 },
  saddle_wyrm:     { name: 'Wyrm-Sattel',       kind: 'mount', mount: 'wyrm',         price: 15000 },
  saddle_dragon:   { name: 'Drachensattel',     kind: 'mount', mount: 'dragon',       price: 20000 },
};

const EQUIP_SLOTS = ['weapon', 'armor', 'legs', 'helmet', 'shield', 'boots'];

// kind: heal | strike (Einzelschlag Nahkampf) | missile | aoe1 (Nahkampf-Fläche)
//       nova (Zauber-Fläche) | buff | light | tame | petheal | petbuff
const SPELLS = {
  // --- alle Berufe ---
  exura:        { name: 'Exura',            words: 'exura',            desc: 'Kleine Heilung',                     lvl: 1,  mana: 20,  cd: 1000, kind: 'heal', power: 1 },
  utevo_lux:    { name: 'Utevo Lux',        words: 'utevo lux',        desc: 'Helles Licht (4 Minuten)',           lvl: 2,  mana: 30,  cd: 2000, kind: 'light', dur: 240000 },
  utani_hur:    { name: 'Utani Hur',        words: 'utani hur',        desc: 'Schneller laufen (30 Sek.)',         lvl: 8,  mana: 60,  cd: 15000, kind: 'buff', buff: 'speed', dur: 30000 },
  exura_gran:   { name: 'Exura Gran',       words: 'exura gran',       desc: 'Große Heilung',                      lvl: 14, mana: 70,  cd: 1200, kind: 'heal', power: 2.6 },
  // --- Ritter ---
  exori_ico:    { name: 'Exori Ico',        words: 'exori ico',        desc: 'Wuchtiger Einzelschlag',             lvl: 4,  mana: 35,  cd: 5000, kind: 'strike', power: 2.2 },
  exori:        { name: 'Exori',            words: 'exori',            desc: 'Wirbelangriff auf alle Nachbarn',    lvl: 10, mana: 50,  cd: 5000, kind: 'aoe1', power: 1.5, radius: 1 },
  utamo:        { name: 'Utamo Vita',       words: 'utamo vita',       desc: '-40% Schaden für 12 Sekunden',       lvl: 12, mana: 70,  cd: 25000, kind: 'buff', buff: 'def', dur: 12000 },
  utito:        { name: 'Utito Tempo',      words: 'utito tempo',      desc: '+40% Angriff für 12 Sekunden',       lvl: 16, mana: 80,  cd: 25000, kind: 'buff', buff: 'atk', dur: 12000 },
  exori_gran:   { name: 'Exori Gran',       words: 'exori gran',       desc: 'Mächtiger Wirbelangriff',            lvl: 22, mana: 95,  cd: 7000, kind: 'aoe1', power: 2.4, radius: 1 },
  exori_mas:    { name: 'Exori Mas',        words: 'exori mas',        desc: 'Gewaltiger Rundumschlag (Radius 2)', lvl: 32, mana: 160, cd: 10000, kind: 'aoe1', power: 2.0, radius: 2 },
  // --- Paladin ---
  exori_san:    { name: 'Exori San',        words: 'exori san',        desc: 'Heiliges Geschoss',                  lvl: 5,  mana: 30,  cd: 2000, range: 7, kind: 'missile', base: 26, perLvl: 2.6, fx: 'san' },
  exori_con:    { name: 'Exori Con',        words: 'exori con',        desc: 'Ätherischer Speer (stark)',          lvl: 12, mana: 45,  cd: 2500, range: 7, kind: 'missile', base: 48, perLvl: 3.6, fx: 'con' },
  utura:        { name: 'Utura',            words: 'utura',            desc: 'Heilung über Zeit (24 Sek.)',        lvl: 18, mana: 90,  cd: 30000, kind: 'buff', buff: 'regen', dur: 24000 },
  exevo_san:    { name: 'Exevo Mas San',    words: 'exevo mas san',    desc: 'Heilige Explosion (Radius 2)',       lvl: 20, mana: 110, cd: 8000, radius: 2, kind: 'nova', base: 44, perLvl: 3.4, fx: 'san' },
  exevo_mas_san:{ name: 'Exevo Gran San',   words: 'exevo gran san',   desc: 'Großes heiliges Strahlen (Radius 3)', lvl: 30, mana: 220, cd: 14000, radius: 3, kind: 'nova', base: 75, perLvl: 4.5, fx: 'san' },
  // --- Magier ---
  exori_flam:   { name: 'Exori Flam',       words: 'exori flam',       desc: 'Feuergeschoss',                      lvl: 4,  mana: 28,  cd: 2000, range: 7, kind: 'missile', base: 28, perLvl: 2.8, fx: 'flam' },
  exori_vis:    { name: 'Exori Vis',        words: 'exori vis',        desc: 'Blitzschlag',                        lvl: 12, mana: 48,  cd: 2500, range: 7, kind: 'missile', base: 48, perLvl: 3.8, fx: 'vis' },
  exevo_gran:   { name: 'Exevo Gran',       words: 'exevo gran',       desc: 'Feuer-Explosion (Radius 3)',         lvl: 16, mana: 130, cd: 9000, radius: 3, kind: 'nova', base: 50, perLvl: 3.8, fx: 'flam' },
  exori_frigo:  { name: 'Exori Frigo',      words: 'exori frigo',      desc: 'Eisgeschoss (sehr stark)',           lvl: 20, mana: 70,  cd: 3000, range: 7, kind: 'missile', base: 70, perLvl: 4.6, fx: 'frigo' },
  exevo_mas:    { name: 'Exevo Gran Mas',   words: 'exevo gran mas',   desc: 'Gewaltige Feuersbrunst (Radius 4)',  lvl: 26, mana: 240, cd: 14000, radius: 4, kind: 'nova', base: 85, perLvl: 5.2, fx: 'flam' },
  exevo_ultra:  { name: 'Exevo Gran Mas Vis', words: 'exevo gran mas vis', desc: 'Der Sturm der Stürme (Radius 5)', lvl: 36, mana: 400, cd: 20000, radius: 5, kind: 'nova', base: 130, perLvl: 6.0, fx: 'vis' },
  // --- Bestienzüchter ---
  utevo_bestia: { name: 'Utevo Bestia',     words: 'utevo bestia',     desc: 'Zähmt das Ziel (unter 60% Leben)',   lvl: 1,  mana: 40,  cd: 4000, range: 3, kind: 'tame' },
  exori_bestia: { name: 'Exori Bestia',     words: 'exori bestia',     desc: 'Wilder Krallenhieb',                 lvl: 4,  mana: 30,  cd: 4000, kind: 'strike', power: 1.9 },
  exura_bestia: { name: 'Exura Bestia',     words: 'exura bestia',     desc: 'Heilt dein Tier',                    lvl: 8,  mana: 45,  cd: 2000, kind: 'petheal', power: 2 },
  exori_natura: { name: 'Exori Natura',     words: 'exori natura',     desc: 'Dornengeschoss',                     lvl: 12, mana: 40,  cd: 2500, range: 7, kind: 'missile', base: 44, perLvl: 3.4, fx: 'leaf' },
  utito_bestia: { name: 'Utito Bestia',     words: 'utito bestia',     desc: 'Dein Tier: +50% Angriff, 15 Sek.',   lvl: 16, mana: 90,  cd: 25000, kind: 'petbuff', dur: 15000 },
  exevo_natura: { name: 'Exevo Natura',     words: 'exevo natura',     desc: 'Dornensturm (Radius 2)',             lvl: 22, mana: 120, cd: 9000, radius: 2, kind: 'nova', base: 48, perLvl: 3.6, fx: 'leaf' },
};

const VOCATIONS = {
  knight:   { name: 'Ritter',         desc: 'Viel Leben, starker Nahkampf',        hp: 180, mp: 40,  hpL: 32, mpL: 10, melee: 1.35, spell: 0.9,  range: 1, atkFx: 'slash',
              spells: ['exura', 'exori_ico', 'exori', 'utamo', 'utito', 'exori_gran', 'exori_mas', 'utevo_lux', 'utani_hur', 'exura_gran'] },
  paladin:  { name: 'Paladin',        desc: 'Kämpft mit Wurfspeeren auf Distanz',  hp: 150, mp: 70,  hpL: 24, mpL: 18, melee: 1.10, spell: 1.15, range: 5, atkFx: 'spear',
              spells: ['exura', 'exori_san', 'exori_con', 'utura', 'exevo_san', 'exevo_mas_san', 'utamo', 'utevo_lux', 'utani_hur', 'exura_gran'] },
  sorcerer: { name: 'Magier',         desc: 'Magische Geschosse, mächtige Zauber', hp: 120, mp: 110, hpL: 16, mpL: 30, melee: 0.85, spell: 1.5,  range: 4, atkFx: 'zap',
              spells: ['exura', 'exori_flam', 'exori_vis', 'exevo_gran', 'exori_frigo', 'exevo_mas', 'exevo_ultra', 'utevo_lux', 'utani_hur', 'exura_gran'] },
  tamer:    { name: 'Bestienzüchter', desc: 'Zähmt Bestien, die für ihn kämpfen',  hp: 140, mp: 90,  hpL: 22, mpL: 22, melee: 0.95, spell: 1.1,  range: 3, atkFx: 'leaf',
              spells: ['utevo_bestia', 'exura', 'exori_bestia', 'exura_bestia', 'exori_natura', 'utito_bestia', 'exevo_natura', 'utevo_lux', 'utani_hur', 'exura_gran'] },
};

const SHOP_ITEMS = [
  'hp_potion', 'mp_potion', 'bread', 'torch',
  'dagger', 'sword', 'bow', 'wand', 'claws',
  'leather', 'cloth_legs', 'leather_legs', 'leather_helm', 'wood_shield', 'boots',
];

const QUESTS = {
  q_bats:     { name: 'Flattern im Turm',      npc: 'npc_ulf',   lvl: 1,  target: 'bat',       count: 6,  reward: { gold: 60,   xp: 40 },                        desc: 'Fledermäuse nisten überall um Nordwacht. Verscheuche 6 davon!' },
  q_rats:     { name: 'Rattenplage',           npc: 'npc_bruno', lvl: 1,  target: 'rat',       count: 8,  reward: { gold: 70,   xp: 55 },                        desc: 'Die Ratten vor den Toren Kirias werden zur Plage. Erledige 8 davon!' },
  q_snakes:   { name: 'Schlangen am Strand',   npc: 'npc_lina',  lvl: 2,  target: 'snake',     count: 8,  reward: { gold: 120,  xp: 90 },                        desc: 'Am Strand südlich von Porta wimmelt es vor Schlangen. Hilf uns!' },
  q_boars:    { name: 'Wildschwein-Jagd',      npc: 'npc_henrik',lvl: 3,  target: 'boar',      count: 8,  reward: { gold: 160,  xp: 130, item: 'meat' },         desc: 'Wildschweine wühlen meine Felder um! Jage sie fort, und es gibt Braten.' },
  q_spiders:  { name: 'Spinnennetz',           npc: 'npc_eira',  lvl: 4,  target: 'spider',    count: 10, reward: { gold: 180,  xp: 160, item: 'leather' },      desc: 'Die Spinnen im Wald fressen unser Wild. Töte 10 Spinnen.' },
  q_goblins:  { name: 'Goblin-Gesindel',       npc: 'npc_ulf',   lvl: 5,  target: 'goblin',    count: 10, reward: { gold: 220,  xp: 200 }, prereq: 'q_bats',     desc: 'Goblins stehlen unsere Vorräte. Jage sie aus den Hügeln um Nordwacht!' },
  q_wolves:   { name: 'Wolfsrudel',            npc: 'npc_bruno', lvl: 6,  target: 'wolf',      count: 12, reward: { gold: 260,  xp: 260 }, prereq: 'q_rats',     desc: 'Ein Wolfsrudel bedroht die Händler auf den Straßen. Dezimiere es!' },
  q_bandits:  { name: 'Räuber am Wegesrand',   npc: 'npc_bruno', lvl: 9,  target: 'bandit',    count: 10, reward: { gold: 420,  xp: 420, item: 'leather_legs' }, prereq: 'q_wolves', desc: 'Banditen überfallen Reisende. Sorge für Ordnung auf den Straßen!' },
  q_hunters:  { name: 'Wilderer stoppen',      npc: 'npc_eira',  lvl: 11, target: 'hunter',    count: 8,  reward: { gold: 480,  xp: 520 }, prereq: 'q_spiders',  desc: 'Wilderer plündern unsere Wälder. Zeig ihnen, dass Eichwald sich wehrt!' },
  q_trolls:   { name: 'Trolle im Gebirge',     npc: 'npc_grom',  lvl: 12, target: 'troll',     count: 10, reward: { gold: 520,  xp: 640, item: 'iron_helm' },    desc: 'Trolle blockieren unsere Minen. Räum sie aus dem Weg!' },
  q_orcs:     { name: 'Die Ork-Festung',       npc: 'npc_bruno', lvl: 14, target: 'orc',       count: 14, reward: { gold: 560,  xp: 760, item: 'chain' }, prereq: 'q_bandits', desc: 'Die Orks im Süden rüsten zum Krieg. Schwäche ihre Truppen!' },
  q_zombies:  { name: 'Die wandelnden Toten',  npc: 'npc_aldo',  lvl: 15, target: 'zombie',    count: 12, reward: { gold: 660,  xp: 950 },                       desc: 'In den verfluchten Ruinen erheben sich die Toten. Schicke sie zurück ins Grab!' },
  q_lizard:   { name: 'Echsen im Schilf',      npc: 'npc_jorn',  lvl: 16, target: 'lizardman', count: 10, reward: { gold: 750,  xp: 1100 },                      desc: 'Echsenkrieger kriechen aus dem Moor. Moorheim braucht deine Klinge!' },
  q_ghouls:   { name: 'Ghul-Jagd',             npc: 'npc_mara',  lvl: 17, target: 'ghoul',     count: 10, reward: { gold: 800,  xp: 1200 },                      desc: 'Ghule schleichen nachts um Porta. Die Göttin verlangt ihre Vernichtung.' },
  q_harpies:  { name: 'Schreie am Himmel',     npc: 'npc_rollo', lvl: 18, target: 'harpy',     count: 8,  reward: { gold: 850,  xp: 1300 },                      desc: 'Harpyien zerreißen unsere Segel. Hol sie vom Himmel!' },
  q_werewolf: { name: 'Vollmondnächte',        npc: 'npc_eira',  lvl: 19, target: 'werewolf',  count: 8,  reward: { gold: 900,  xp: 1450 }, prereq: 'q_hunters', desc: 'Werwölfe heulen im Westwald. Jage die Bestien!' },
  q_mummies:  { name: 'Fluch der Krypta',      npc: 'npc_sera',  lvl: 20, target: 'mummy',     count: 8,  reward: { gold: 1000, xp: 1700, item: 'silk_legs' },   desc: 'Mumien wandeln durch die alte Krypta nördlich von Sonnenhafen. Erlöse sie!' },
  q_minotaur: { name: 'Das Labyrinth',         npc: 'npc_odo',   lvl: 22, target: 'minotaur',  count: 8,  reward: { gold: 1100, xp: 1900, item: 'iron_shield' }, desc: 'Im Fels-Labyrinth östlich von Kiria hausen Minotauren. Stelle dich ihnen!' },
  q_ogres:    { name: 'Hunger des Ogers',      npc: 'npc_grom',  lvl: 23, target: 'ogre',      count: 8,  reward: { gold: 1200, xp: 2100 },                      desc: 'Oger fressen unsere Vorratslager leer. Zeig ihnen, was Hunger heißt!' },
  q_cyclops:  { name: 'Zyklopen-Schmiede',     npc: 'npc_grom',  lvl: 24, target: 'cyclops',   count: 8,  reward: { gold: 1300, xp: 2200, item: 'iron_boots' }, prereq: 'q_trolls', desc: 'Die Zyklopen horten bestes Eisen. Hol es dir!' },
  q_golems:   { name: 'Herz aus Stein',        npc: 'npc_bragi', lvl: 26, target: 'golem',     count: 6,  reward: { gold: 1600, xp: 2800 },                      desc: 'Steingolems erwachen in den Bergen. Zerschmettere sie, bevor sie Moorheim erreichen!' },
  q_vampire:  { name: 'Der Blutfürst',         npc: 'npc_sera',  lvl: 28, target: 'vampire',   count: 5,  reward: { gold: 2600, xp: 4600 }, prereq: 'q_mummies', desc: 'Ein Vampirfürst hat die Krypta zu seinem Reich gemacht. Beende seine Herrschaft!' },
  q_dark:     { name: 'Die schwarze Garde',    npc: 'npc_koenig',lvl: 30, target: 'dark_knight', count: 5, reward: { gold: 3200, xp: 5600, item: 'plate' },      desc: 'Dunkle Ritter sammeln sich in den Ruinen. Wer schickt sie? Finde und schlage sie!' },
  q_yeti:     { name: 'Der weiße Schrecken',   npc: 'npc_odo',   lvl: 32, target: 'yeti',      count: 4,  reward: { gold: 3600, xp: 6400 },                      desc: 'Ein Yeti-Rudel ist aus dem hohen Norden herabgestiegen. Vertreibe die Bestien!' },
  q_wyrm:     { name: 'Die Wyrm-Schlucht',     npc: 'npc_alrik', lvl: 34, target: 'wyrm',      count: 4,  reward: { gold: 4200, xp: 7800 },                      desc: 'In der Schlucht im Norden nisten Wyrms. Nur die Mutigsten kehren zurück.' },
  q_dragon:   { name: 'Drachenjagd',           npc: 'npc_koenig',lvl: 36, target: 'dragon',    count: 3,  reward: { gold: 5200, xp: 9600, item: 'dragon_helm' }, desc: 'Die Drachen im Nordosten bedrohen das Reich. Der König ruft die Helden!' },
  q_lich:     { name: 'Der Totenbeschwörer',   npc: 'npc_sera',  lvl: 38, target: 'lich',      count: 2,  reward: { gold: 6500, xp: 12000 }, prereq: 'q_vampire', desc: 'Ein Lich beherrscht die Untoten der Krypta. Zerstöre den Meister, und die Toten ruhen.' },
  q_demon:    { name: 'Herz des Vulkans',      npc: 'npc_koenig',lvl: 40, target: 'demon',     count: 3,  reward: { gold: 9000, xp: 16000 }, prereq: 'q_dragon', desc: 'Aus dem Vulkan kriechen Dämonen. Beende den Albtraum – für Kiria!' },
};

const MOUNT_SPEED = 0.6;
const HASTE_SPEED = 0.65;
const FOOD_MAX = 900;
const SKULL_MS = 60000;

// Steilere Kurve als früher – Level wollen verdient sein
function xpForLevel(lvl) { return Math.round(120 * Math.pow(lvl - 1, 2.1)); }
function petXpForLevel(lvl) { return Math.round(80 * Math.pow(lvl - 1, 2.1)); }

module.exports = {
  TILE, WALKABLE, MONSTERS, ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS,
  SHOP_ITEMS, QUESTS, MOUNT_SPEED, HASTE_SPEED, FOOD_MAX, SKULL_MS, xpForLevel, petXpForLevel,
};
