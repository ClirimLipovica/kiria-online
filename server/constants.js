// ---------------------------------------------------------------
// Kiria Online 3D – gemeinsame Spielkonstanten (v9)
// 68 Monster + 6 Bosse (inkl. täglicher Weltboss), viel mehr
// Ausrüstung, Sammel-Loot (Trophäen & Schätze), neue Mounts,
// 10 Zauber pro Beruf, 25 Quests
// ---------------------------------------------------------------

const TILE = {
  WATER: 0, SAND: 1, GRASS: 2, TREE: 3, ROCK: 4,
  ROAD: 5, WALL: 6, LAVA: 7, DIRT: 8, GRAVE: 9, FOUNTAIN: 10, FLOOR: 11,
};

const WALKABLE = new Set([TILE.SAND, TILE.GRASS, TILE.ROAD, TILE.DIRT, TILE.GRAVE, TILE.FLOOR]);

// tame: zähmbar • flee: flieht bei wenig Leben • kite: hält Abstand (Fernkampf)
// pack: alarmiert Artgenossen in der Nähe • boss: Boss (Spezial-Spawnsystem)
const MONSTERS = {
  // ---- Anfänger (rund um alle Städte) ----
  chicken:   { name: 'Huhn',          hp: 14,   dmg: 3,   atkMs: 2200, moveMs: 550, xp: 2,   gold: [0, 2],     aggro: 3, tame: true, flee: true, drops: [{ item: 'feather', p: 0.5 }, { item: 'meat', p: 0.15 }] },
  bat:       { name: 'Fledermaus',    hp: 20,   dmg: 5,   atkMs: 1800, moveMs: 420, xp: 3,   gold: [0, 3],     aggro: 5, flee: true, drops: [{ item: 'rag', p: 0.25 }] },
  rat:       { name: 'Ratte',         hp: 30,   dmg: 7,   atkMs: 1900, moveMs: 600, xp: 4,   gold: [1, 5],     aggro: 5, tame: true, flee: true, drops: [{ item: 'cheese', p: 0.35 }, { item: 'rat_tail', p: 0.4 }] },
  fox:       { name: 'Fuchs',         hp: 40,   dmg: 10,  atkMs: 1900, moveMs: 420, xp: 6,   gold: [0, 4],     aggro: 5, tame: true, flee: true, drops: [{ item: 'fox_fur', p: 0.45 }] },
  crab:      { name: 'Krabbe',        hp: 50,   dmg: 11,  atkMs: 2100, moveMs: 700, xp: 6,   gold: [1, 7],     aggro: 5, drops: [{ item: 'meat', p: 0.3 }, { item: 'pearl', p: 0.03 }] },
  snake:     { name: 'Schlange',      hp: 45,   dmg: 12,  atkMs: 1900, moveMs: 650, xp: 7,   gold: [0, 5],     aggro: 6, tame: true, drops: [{ item: 'mp_potion', p: 0.05 }, { item: 'snake_skin', p: 0.35 }] },
  slime:     { name: 'Schleim',       hp: 60,   dmg: 13,  atkMs: 2000, moveMs: 750, xp: 8,   gold: [1, 6],     aggro: 6, drops: [{ item: 'mp_potion', p: 0.07 }, { item: 'amber', p: 0.03 }] },
  boar:      { name: 'Wildschwein',   hp: 65,   dmg: 15,  atkMs: 2000, moveMs: 520, xp: 9,   gold: [0, 4],     aggro: 6, tame: true, drops: [{ item: 'meat', p: 0.5 }, { item: 'ham', p: 0.1 }, { item: 'tusk', p: 0.25 }] },
  giant_wasp:{ name: 'Riesenwespe',   hp: 75,   dmg: 16,  atkMs: 1500, moveMs: 400, xp: 11,  gold: [0, 5],     aggro: 7, drops: [{ item: 'amber', p: 0.08 }] },
  spider:    { name: 'Spinne',        hp: 60,   dmg: 15,  atkMs: 1700, moveMs: 460, xp: 10,  gold: [1, 8],     aggro: 7, tame: true, pack: true, drops: [{ item: 'mp_potion', p: 0.07 }, { item: 'spider_silk', p: 0.3 }] },
  wolf:      { name: 'Wolf',          hp: 85,   dmg: 19,  atkMs: 1700, moveMs: 430, xp: 13,  gold: [2, 9],     aggro: 8, tame: true, pack: true, drops: [{ item: 'meat', p: 0.4 }, { item: 'wolf_pelt', p: 0.35 }, { item: 'saddle_wolf', p: 0.008 }] },
  kobold:    { name: 'Kobold',        hp: 95,   dmg: 19,  atkMs: 1800, moveMs: 500, xp: 13,  gold: [3, 14],    aggro: 7, pack: true, flee: true, drops: [{ item: 'dagger', p: 0.06 }, { item: 'bone', p: 0.3 }, { item: 'club', p: 0.04 }] },
  goblin:    { name: 'Goblin',        hp: 105,  dmg: 20,  atkMs: 1800, moveMs: 480, xp: 14,  gold: [4, 16],    aggro: 7, flee: true, pack: true, drops: [{ item: 'dagger', p: 0.07 }, { item: 'cheese', p: 0.2 }, { item: 'cloth_legs', p: 0.05 }, { item: 'rag', p: 0.3 }, { item: 'bone', p: 0.15 }] },
  hyena:     { name: 'Hyäne',         hp: 140,  dmg: 25,  atkMs: 1700, moveMs: 450, xp: 19,  gold: [2, 10],    aggro: 8, tame: true, pack: true, drops: [{ item: 'meat', p: 0.4 }, { item: 'tusk', p: 0.08 }] },
  // ---- Mittelstufe ----
  bandit:    { name: 'Bandit',        hp: 190,  dmg: 30,  atkMs: 1900, moveMs: 480, xp: 25,  gold: [10, 40],   aggro: 8, pack: true, drops: [{ item: 'dagger', p: 0.08 }, { item: 'leather', p: 0.06 }, { item: 'leather_legs', p: 0.05 }, { item: 'bread', p: 0.2 }, { item: 'silver_ring', p: 0.04 }, { item: 'rag', p: 0.3 }] },
  scorpion:  { name: 'Skorpion',      hp: 200,  dmg: 36,  atkMs: 1500, moveMs: 500, xp: 28,  gold: [8, 30],    aggro: 8, drops: [{ item: 'mp_potion', p: 0.12 }, { item: 'leather_legs', p: 0.05 }, { item: 'bone', p: 0.25 }, { item: 'amber', p: 0.04 }] },
  orc:       { name: 'Ork',           hp: 220,  dmg: 34,  atkMs: 1900, moveMs: 520, xp: 30,  gold: [8, 32],    aggro: 7, pack: true, drops: [{ item: 'sword', p: 0.05 }, { item: 'bow', p: 0.04 }, { item: 'leather', p: 0.05 }, { item: 'leather_helm', p: 0.05 }, { item: 'meat', p: 0.25 }, { item: 'hp_potion', p: 0.1 }, { item: 'bone', p: 0.3 }, { item: 'tusk', p: 0.1 }] },
  gnoll:     { name: 'Gnoll',         hp: 250,  dmg: 37,  atkMs: 1800, moveMs: 500, xp: 35,  gold: [8, 30],    aggro: 8, pack: true, drops: [{ item: 'club', p: 0.07 }, { item: 'bone', p: 0.35 }, { item: 'leather_helm', p: 0.05 }, { item: 'hp_potion', p: 0.1 }] },
  troll:     { name: 'Troll',         hp: 280,  dmg: 42,  atkMs: 2100, moveMs: 580, xp: 40,  gold: [12, 42],   aggro: 7, drops: [{ item: 'boots', p: 0.06 }, { item: 'wood_shield', p: 0.06 }, { item: 'meat', p: 0.3 }, { item: 'hp_potion', p: 0.12 }, { item: 'bone', p: 0.35 }] },
  ghost:     { name: 'Geist',         hp: 250,  dmg: 42,  atkMs: 1700, moveMs: 450, xp: 45,  gold: [10, 45],   aggro: 8, drops: [{ item: 'mp_potion', p: 0.16 }, { item: 'magic_hat', p: 0.02 }, { item: 'rag', p: 0.3 }, { item: 'pearl', p: 0.04 }] },
  skeleton:  { name: 'Skelett',       hp: 320,  dmg: 46,  atkMs: 1900, moveMs: 560, xp: 48,  gold: [14, 48],   aggro: 8, drops: [{ item: 'axe', p: 0.04 }, { item: 'wand', p: 0.04 }, { item: 'chain', p: 0.04 }, { item: 'iron_helm', p: 0.03 }, { item: 'mp_potion', p: 0.1 }, { item: 'bone', p: 0.6 }, { item: 'skull', p: 0.25 }, { item: 'bone_shield', p: 0.04 }] },
  crocodile: { name: 'Krokodil',      hp: 330,  dmg: 49,  atkMs: 2000, moveMs: 560, xp: 52,  gold: [5, 20],    aggro: 7, tame: true, drops: [{ item: 'snake_skin', p: 0.5 }, { item: 'meat', p: 0.45 }, { item: 'fur_boots', p: 0.04 }] },
  pirate:    { name: 'Pirat',         hp: 360,  dmg: 43,  atkMs: 1800, moveMs: 470, xp: 58,  gold: [20, 70],   aggro: 8, pack: true, drops: [{ item: 'sword', p: 0.04 }, { item: 'pearl', p: 0.07 }, { item: 'silver_ring', p: 0.05 }, { item: 'bread', p: 0.2 }, { item: 'bone_helm', p: 0.05 }] },
  zombie:    { name: 'Zombie',        hp: 400,  dmg: 48,  atkMs: 2100, moveMs: 720, xp: 55,  gold: [18, 55],   aggro: 8, drops: [{ item: 'leather', p: 0.06 }, { item: 'leather_legs', p: 0.05 }, { item: 'hp_potion', p: 0.12 }, { item: 'rag', p: 0.4 }, { item: 'bone', p: 0.3 }] },
  hunter:    { name: 'Wilderer',      hp: 400,  dmg: 38,  atkMs: 1900, moveMs: 480, xp: 60,  gold: [25, 80],   aggro: 9, kite: true, ranged: { dmg: 48, range: 6, ms: 2300 }, drops: [{ item: 'crossbow', p: 0.05 }, { item: 'ranger_legs', p: 0.04 }, { item: 'meat', p: 0.25 }, { item: 'hp_potion', p: 0.12 }, { item: 'feather', p: 0.3 }, { item: 'wolf_pelt', p: 0.15 }] },
  witch:     { name: 'Hexe',          hp: 380,  dmg: 34,  atkMs: 1900, moveMs: 470, xp: 66,  gold: [20, 65],   aggro: 8, kite: true, ranged: { dmg: 55, range: 6, ms: 2300 }, drops: [{ item: 'wand', p: 0.05 }, { item: 'magic_hat', p: 0.03 }, { item: 'oak_staff', p: 0.04 }, { item: 'mp_potion', p: 0.2 }] },
  bear:      { name: 'Bär',           hp: 450,  dmg: 55,  atkMs: 2100, moveMs: 540, xp: 65,  gold: [5, 25],    aggro: 6, tame: true, drops: [{ item: 'meat', p: 0.5 }, { item: 'ham', p: 0.25 }, { item: 'saddle_bear', p: 0.008 }, { item: 'hp_potion', p: 0.15 }, { item: 'bear_fur', p: 0.35 }] },
  orc_shaman:{ name: 'Ork-Schamane',  hp: 420,  dmg: 38,  atkMs: 1900, moveMs: 500, xp: 72,  gold: [22, 70],   aggro: 8, pack: true, kite: true, ranged: { dmg: 60, range: 5, ms: 2400 }, drops: [{ item: 'oak_staff', p: 0.05 }, { item: 'bone', p: 0.3 }, { item: 'mp_potion', p: 0.2 }, { item: 'bone_helm', p: 0.05 }] },
  lizardman: { name: 'Echsenkrieger', hp: 500,  dmg: 58,  atkMs: 1900, moveMs: 500, xp: 75,  gold: [25, 75],   aggro: 8, pack: true, drops: [{ item: 'chain', p: 0.06 }, { item: 'iron_shield', p: 0.04 }, { item: 'hp_potion', p: 0.15 }, { item: 'snake_skin', p: 0.4 }, { item: 'emerald', p: 0.03 }] },
  dark_elf:  { name: 'Dunkelelf',     hp: 480,  dmg: 42,  atkMs: 1800, moveMs: 460, xp: 85,  gold: [30, 90],   aggro: 9, kite: true, ranged: { dmg: 62, range: 6, ms: 2200 }, drops: [{ item: 'elven_bow', p: 0.02 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.2 }, { item: 'silver_ring', p: 0.06 }, { item: 'long_bow', p: 0.05 }] },
  ghoul:     { name: 'Ghul',          hp: 520,  dmg: 62,  atkMs: 1800, moveMs: 500, xp: 80,  gold: [28, 80],   aggro: 8, pack: true, drops: [{ item: 'chain', p: 0.05 }, { item: 'wild_claws', p: 0.04 }, { item: 'mp_potion', p: 0.14 }, { item: 'bone', p: 0.4 }, { item: 'skull', p: 0.2 }] },
  panther:   { name: 'Panther',       hp: 520,  dmg: 60,  atkMs: 1600, moveMs: 380, xp: 88,  gold: [5, 25],    aggro: 9, tame: true, drops: [{ item: 'meat', p: 0.4 }, { item: 'panther_claws', p: 0.02 }, { item: 'saddle_panther', p: 0.008 }] },
  harpy:     { name: 'Harpyie',       hp: 500,  dmg: 52,  atkMs: 1700, moveMs: 400, xp: 90,  gold: [30, 85],   aggro: 9, kite: true, ranged: { dmg: 58, range: 5, ms: 2400 }, drops: [{ item: 'swift_boots', p: 0.015 }, { item: 'mp_potion', p: 0.2 }, { item: 'feather', p: 0.6 }] },
  orc_berserker: { name: 'Ork-Berserker', hp: 560, dmg: 66, atkMs: 1700, moveMs: 460, xp: 85, gold: [30, 90], aggro: 8, pack: true, drops: [{ item: 'axe', p: 0.05 }, { item: 'chain', p: 0.05 }, { item: 'iron_helm', p: 0.04 }, { item: 'ham', p: 0.15 }, { item: 'hp_potion', p: 0.15 }, { item: 'tusk', p: 0.2 }, { item: 'morning_star', p: 0.04 }] },
  banshee:   { name: 'Todesfee',      hp: 580,  dmg: 58,  atkMs: 1900, moveMs: 460, xp: 100, gold: [35, 110],  aggro: 8, kite: true, ranged: { dmg: 70, range: 5, ms: 2400 }, drops: [{ item: 'magic_hat', p: 0.04 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.18 }, { item: 'pearl', p: 0.06 }, { item: 'rag', p: 0.35 }] },
  frost_wolf:{ name: 'Frostwolf',     hp: 620,  dmg: 66,  atkMs: 1700, moveMs: 400, xp: 102, gold: [10, 40],   aggro: 9, tame: true, pack: true, drops: [{ item: 'wolf_pelt', p: 0.5 }, { item: 'saddle_frost_wolf', p: 0.008 }, { item: 'hp_potion', p: 0.12 }, { item: 'fur_boots', p: 0.05 }] },
  werewolf:  { name: 'Werwolf',       hp: 650,  dmg: 70,  atkMs: 1600, moveMs: 380, xp: 110, gold: [20, 70],   aggro: 9, pack: true, drops: [{ item: 'swift_boots', p: 0.02 }, { item: 'hide_legs', p: 0.04 }, { item: 'meat', p: 0.3 }, { item: 'hp_potion', p: 0.18 }, { item: 'wolf_pelt', p: 0.5 }] },
  gargoyle:  { name: 'Gargoyle',      hp: 650,  dmg: 63,  atkMs: 1800, moveMs: 480, xp: 108, gold: [20, 70],   aggro: 8, drops: [{ item: 'bone', p: 0.35 }, { item: 'emerald', p: 0.05 }, { item: 'steel_helm', p: 0.03 }] },
  basilisk:  { name: 'Basilisk',      hp: 720,  dmg: 72,  atkMs: 1800, moveMs: 470, xp: 125, gold: [25, 80],   aggro: 8, drops: [{ item: 'snake_skin', p: 0.55 }, { item: 'emerald', p: 0.06 }, { item: 'scale_armor', p: 0.025 }] },
  mummy:     { name: 'Mumie',         hp: 750,  dmg: 72,  atkMs: 2000, moveMs: 620, xp: 120, gold: [45, 120],  aggro: 8, drops: [{ item: 'silk_legs', p: 0.05 }, { item: 'fire_wand', p: 0.03 }, { item: 'mp_potion', p: 0.2 }, { item: 'rag', p: 0.5 }, { item: 'gold_necklace', p: 0.05 }] },
  // ---- Oberstufe ----
  giant_spider: { name: 'Riesenspinne', hp: 850, dmg: 78, atkMs: 1700, moveMs: 420, xp: 140, gold: [40, 120],  aggro: 9, tame: true, pack: true, drops: [{ item: 'saddle_spider', p: 0.008 }, { item: 'ranger_armor', p: 0.025 }, { item: 'mp_potion', p: 0.2 }, { item: 'spider_silk', p: 0.6 }] },
  treant:    { name: 'Baumhirte',     hp: 950,  dmg: 76,  atkMs: 2300, moveMs: 680, xp: 150, gold: [10, 50],   aggro: 7, drops: [{ item: 'amber', p: 0.25 }, { item: 'oak_staff', p: 0.06 }, { item: 'hp_potion', p: 0.15 }] },
  minotaur:  { name: 'Minotaurus',    hp: 950,  dmg: 85,  atkMs: 2100, moveMs: 500, xp: 160, gold: [55, 150],  aggro: 8, drops: [{ item: 'axe', p: 0.07 }, { item: 'iron_shield', p: 0.07 }, { item: 'plate_legs', p: 0.025 }, { item: 'saddle_minotaur', p: 0.008 }, { item: 'ham', p: 0.3 }, { item: 'hp_potion', p: 0.2 }, { item: 'tusk', p: 0.35 }, { item: 'bone', p: 0.3 }] },
  sabertooth:{ name: 'Säbelzahntiger', hp: 980, dmg: 88,  atkMs: 1800, moveMs: 420, xp: 168, gold: [10, 45],   aggro: 9, tame: true, drops: [{ item: 'tusk', p: 0.5 }, { item: 'meat', p: 0.5 }, { item: 'saddle_tiger', p: 0.008 }, { item: 'fur_boots', p: 0.06 }] },
  ogre:      { name: 'Oger',          hp: 1000, dmg: 88,  atkMs: 2300, moveMs: 580, xp: 165, gold: [50, 145],  aggro: 8, drops: [{ item: 'iron_boots', p: 0.05 }, { item: 'iron_helm', p: 0.06 }, { item: 'ham', p: 0.35 }, { item: 'hp_potion', p: 0.2 }, { item: 'bone', p: 0.4 }, { item: 'tusk', p: 0.2 }, { item: 'club', p: 0.08 }] },
  necromancer:{ name: 'Nekromant',    hp: 1000, dmg: 78,  atkMs: 2000, moveMs: 520, xp: 195, gold: [50, 140],  aggro: 9, kite: true, ranged: { dmg: 95, range: 6, ms: 2400 }, drops: [{ item: 'skull', p: 0.6 }, { item: 'crystal_wand', p: 0.04 }, { item: 'robe', p: 0.03 }, { item: 'mp_potion', p: 0.25 }] },
  cyclops:   { name: 'Zyklop',        hp: 1100, dmg: 92,  atkMs: 2300, moveMs: 580, xp: 175, gold: [50, 145],  aggro: 8, drops: [{ item: 'axe', p: 0.07 }, { item: 'iron_shield', p: 0.06 }, { item: 'iron_helm', p: 0.06 }, { item: 'iron_boots', p: 0.05 }, { item: 'ham', p: 0.25 }, { item: 'hp_potion', p: 0.2 }, { item: 'bone', p: 0.4 }, { item: 'emerald', p: 0.05 }] },
  medusa:    { name: 'Medusa',        hp: 1250, dmg: 92,  atkMs: 1900, moveMs: 480, xp: 225, gold: [55, 150],  aggro: 9, kite: true, ranged: { dmg: 100, range: 5, ms: 2400 }, drops: [{ item: 'snake_skin', p: 0.5 }, { item: 'ruby', p: 0.05 }, { item: 'crystal_circlet', p: 0.04 }, { item: 'crystal_wand', p: 0.04 }] },
  vampire:   { name: 'Vampir',        hp: 1300, dmg: 100, atkMs: 1700, moveMs: 440, xp: 220, gold: [70, 200],  aggro: 9, drops: [{ item: 'robe', p: 0.03 }, { item: 'elven_bow', p: 0.025 }, { item: 'silk_legs', p: 0.04 }, { item: 'mp_potion', p: 0.25 }, { item: 'gold_necklace', p: 0.08 }, { item: 'ruby', p: 0.04 }] },
  unicorn:   { name: 'Einhorn',       hp: 1300, dmg: 90,  atkMs: 1900, moveMs: 400, xp: 250, gold: [0, 20],    aggro: 5, tame: true, drops: [{ item: 'pearl', p: 0.3 }, { item: 'diamond', p: 0.02 }, { item: 'saddle_unicorn', p: 0.012 }] },
  golem:     { name: 'Steingolem',    hp: 1450, dmg: 90,  atkMs: 2400, moveMs: 700, xp: 240, gold: [55, 170],  aggro: 7, drops: [{ item: 'plate_legs', p: 0.035 }, { item: 'iron_shield', p: 0.07 }, { item: 'saddle_golem', p: 0.008 }, { item: 'plate', p: 0.025 }, { item: 'emerald', p: 0.07 }, { item: 'diamond', p: 0.02 }] },
  ice_golem: { name: 'Eisgolem',      hp: 1550, dmg: 96,  atkMs: 2400, moveMs: 680, xp: 265, gold: [50, 150],  aggro: 7, drops: [{ item: 'diamond', p: 0.03 }, { item: 'frost_blade', p: 0.015 }, { item: 'scale_legs', p: 0.03 }, { item: 'steel_shield', p: 0.04 }] },
  shadow_assassin: { name: 'Schattenmeuchler', hp: 1550, dmg: 125, atkMs: 1500, moveMs: 380, xp: 330, gold: [70, 200], aggro: 9, drops: [{ item: 'swift_boots', p: 0.04 }, { item: 'ruby', p: 0.05 }, { item: 'panther_claws', p: 0.04 }, { item: 'steel_boots', p: 0.04 }] },
  lava_hound:{ name: 'Lavahund',      hp: 1650, dmg: 105, atkMs: 1800, moveMs: 430, xp: 295, gold: [60, 170],  aggro: 9, tame: true, drops: [{ item: 'ruby', p: 0.08 }, { item: 'fire_sword', p: 0.03 }, { item: 'saddle_lava_hound', p: 0.008 }] },
  dark_knight: { name: 'Dunkler Ritter', hp: 1650, dmg: 110, atkMs: 1900, moveMs: 480, xp: 300, gold: [90, 240], aggro: 9, drops: [{ item: 'sword', p: 0.1 }, { item: 'plate', p: 0.04 }, { item: 'plate_legs', p: 0.04 }, { item: 'iron_shield', p: 0.08 }, { item: 'hp_potion', p: 0.3 }, { item: 'silver_ring', p: 0.08 }, { item: 'ruby', p: 0.05 }, { item: 'battle_hammer', p: 0.03 }] },
  griffin:   { name: 'Greif',         hp: 1750, dmg: 108, atkMs: 1900, moveMs: 420, xp: 315, gold: [60, 180],  aggro: 8, drops: [{ item: 'feather', p: 0.6 }, { item: 'gold_necklace', p: 0.07 }, { item: 'saddle_griffin', p: 0.01 }, { item: 'hawk_bow', p: 0.04 }] },
  yeti:      { name: 'Yeti',          hp: 1800, dmg: 115, atkMs: 2200, moveMs: 520, xp: 320, gold: [80, 220],  aggro: 8, drops: [{ item: 'swift_boots', p: 0.03 }, { item: 'beast_hide', p: 0.035 }, { item: 'ham', p: 0.4 }, { item: 'hp_potion', p: 0.3 }, { item: 'bear_fur', p: 0.4 }, { item: 'diamond', p: 0.03 }] },
  fire_elemental: { name: 'Feuerelementar', hp: 1900, dmg: 120, atkMs: 1900, moveMs: 500, xp: 350, gold: [90, 260], aggro: 9, kite: true, ranged: { dmg: 85, range: 5, ms: 2400 }, drops: [{ item: 'fire_wand', p: 0.05 }, { item: 'fire_sword', p: 0.04 }, { item: 'mp_potion', p: 0.35 }, { item: 'ruby', p: 0.08 }, { item: 'amber', p: 0.15 }] },
  frost_giant: { name: 'Frostriese',  hp: 2150, dmg: 122, atkMs: 2200, moveMs: 540, xp: 430, gold: [80, 240],  aggro: 8, drops: [{ item: 'battle_hammer', p: 0.05 }, { item: 'frost_helm', p: 0.035 }, { item: 'diamond', p: 0.04 }, { item: 'ham', p: 0.3 }] },
  wyrm:      { name: 'Wyrm',          hp: 2200, dmg: 125, atkMs: 2100, moveMs: 480, xp: 450, gold: [120, 340], aggro: 9, ranged: { dmg: 90, range: 5, ms: 2600 }, drops: [{ item: 'storm_staff', p: 0.035 }, { item: 'dragon_shield', p: 0.05 }, { item: 'saddle_wyrm', p: 0.008 }, { item: 'mp_potion', p: 0.35 }, { item: 'dragon_scale', p: 0.3 }, { item: 'emerald', p: 0.06 }] },
  dragon:    { name: 'Drache',        hp: 2600, dmg: 135, atkMs: 2100, moveMs: 500, xp: 550, gold: [140, 400], aggro: 9, ranged: { dmg: 95, range: 5, ms: 2700 }, drops: [{ item: 'fire_sword', p: 0.08 }, { item: 'elven_bow', p: 0.05 }, { item: 'plate', p: 0.06 }, { item: 'dragon_shield', p: 0.07 }, { item: 'dragon_helm', p: 0.07 }, { item: 'saddle_dragon', p: 0.015 }, { item: 'ham', p: 0.5 }, { item: 'dragon_scale', p: 0.6 }, { item: 'ruby', p: 0.08 }, { item: 'dragon_boots', p: 0.03 }] },
  phoenix:   { name: 'Phönix',        hp: 2650, dmg: 132, atkMs: 2000, moveMs: 420, xp: 610, gold: [140, 400], aggro: 9, ranged: { dmg: 95, range: 5, ms: 2500 }, drops: [{ item: 'phoenix_bow', p: 0.04 }, { item: 'phoenix_claws', p: 0.04 }, { item: 'phoenix_boots', p: 0.03 }, { item: 'feather', p: 0.8 }, { item: 'ruby', p: 0.1 }, { item: 'saddle_phoenix', p: 0.01 }] },
  lich:      { name: 'Lich',          hp: 2800, dmg: 115, atkMs: 2000, moveMs: 550, xp: 650, gold: [180, 480], aggro: 9, kite: true, ranged: { dmg: 130, range: 6, ms: 2400 }, drops: [{ item: 'demon_staff', p: 0.04 }, { item: 'storm_staff', p: 0.07 }, { item: 'magic_hat', p: 0.1 }, { item: 'robe', p: 0.05 }, { item: 'mp_potion', p: 0.5 }, { item: 'skull', p: 0.6 }, { item: 'diamond', p: 0.05 }] },
  frost_dragon: { name: 'Frostdrache', hp: 2950, dmg: 140, atkMs: 2100, moveMs: 500, xp: 640, gold: [150, 420], aggro: 9, ranged: { dmg: 100, range: 5, ms: 2600 }, drops: [{ item: 'frost_blade', p: 0.05 }, { item: 'frost_staff', p: 0.04 }, { item: 'frost_claws', p: 0.04 }, { item: 'dragon_scale', p: 0.35 }, { item: 'dragon_shield', p: 0.05 }, { item: 'saddle_frost_dragon', p: 0.012 }, { item: 'diamond', p: 0.06 }] },
  shadow_demon: { name: 'Schattendämon', hp: 3100, dmg: 152, atkMs: 2100, moveMs: 470, xp: 780, gold: [220, 600], aggro: 9, drops: [{ item: 'demon_horn', p: 0.35 }, { item: 'shadow_robe', p: 0.045 }, { item: 'storm_bow', p: 0.03 }, { item: 'mp_potion', p: 0.4 }] },
  reaper:    { name: 'Sensenmann',    hp: 3300, dmg: 162, atkMs: 2100, moveMs: 500, xp: 860, gold: [240, 640], aggro: 9, drops: [{ item: 'skull', p: 0.8 }, { item: 'royal_legs', p: 0.03 }, { item: 'demon_staff', p: 0.04 }, { item: 'titan_staff', p: 0.015 }] },
  demon:     { name: 'Dämon',         hp: 3400, dmg: 165, atkMs: 2200, moveMs: 500, xp: 900, gold: [260, 700], aggro: 9, ranged: { dmg: 115, range: 5, ms: 2500 }, drops: [{ item: 'demon_blade', p: 0.05 }, { item: 'demon_bow', p: 0.05 }, { item: 'demon_staff', p: 0.05 }, { item: 'demon_claws', p: 0.05 }, { item: 'demon_plate', p: 0.06 }, { item: 'swift_boots', p: 0.1 }, { item: 'hp_potion', p: 0.5 }, { item: 'mp_potion', p: 0.5 }, { item: 'demon_horn', p: 0.5 }, { item: 'diamond', p: 0.06 }] },
  obsidian_golem: { name: 'Obsidiangolem', hp: 3700, dmg: 148, atkMs: 2400, moveMs: 650, xp: 920, gold: [200, 560], aggro: 8, drops: [{ item: 'royal_shield', p: 0.035 }, { item: 'diamond', p: 0.1 }, { item: 'emerald', p: 0.2 }, { item: 'titan_sword', p: 0.012 }] },

  // ---- BOSSE (Spezial-Spawnsystem, siehe game.js) ----
  boss_spider_queen: { name: '👑 Spinnenkönigin', boss: true, hp: 9000, dmg: 150, atkMs: 1800, moveMs: 460, xp: 3200, gold: [800, 1600], aggro: 10, pack: true,
    drops: [{ item: 'spider_silk', p: 1 }, { item: 'saddle_spider', p: 0.35 }, { item: 'ranger_armor', p: 0.3 }, { item: 'emerald', p: 0.5 }, { item: 'ruby', p: 0.3 }, { item: 'hawk_bow', p: 0.2 }] },
  boss_orc_warlord: { name: '👑 Ork-Kriegsherr', boss: true, hp: 11000, dmg: 170, atkMs: 1900, moveMs: 480, xp: 4200, gold: [1000, 2200], aggro: 10, pack: true,
    drops: [{ item: 'battle_hammer', p: 0.35 }, { item: 'axe', p: 0.4 }, { item: 'chain', p: 0.4 }, { item: 'steel_helm', p: 0.3 }, { item: 'steel_shield', p: 0.3 }, { item: 'ruby', p: 0.3 }, { item: 'tusk', p: 1 }] },
  boss_yeti_king: { name: '👑 Yeti-König', boss: true, hp: 14000, dmg: 195, atkMs: 2100, moveMs: 500, xp: 5600, gold: [1200, 2600], aggro: 10,
    drops: [{ item: 'frost_blade', p: 0.3 }, { item: 'frost_staff', p: 0.25 }, { item: 'frost_helm', p: 0.35 }, { item: 'frost_claws', p: 0.25 }, { item: 'diamond', p: 0.5 }, { item: 'bear_fur', p: 1 }] },
  boss_lich_king: { name: '👑 Lichkönig', boss: true, hp: 16000, dmg: 205, atkMs: 2000, moveMs: 520, xp: 6800, gold: [1500, 3200], aggro: 10, kite: true, ranged: { dmg: 170, range: 6, ms: 2300 },
    drops: [{ item: 'titan_staff', p: 0.2 }, { item: 'storm_staff', p: 0.4 }, { item: 'crown_helm', p: 0.35 }, { item: 'royal_legs', p: 0.3 }, { item: 'diamond', p: 0.5 }, { item: 'skull', p: 1 }] },
  boss_dragon_lord: { name: '👑 Drachenfürst', boss: true, hp: 18000, dmg: 225, atkMs: 2000, moveMs: 480, xp: 8000, gold: [1800, 3800], aggro: 10, ranged: { dmg: 150, range: 5, ms: 2400 },
    drops: [{ item: 'saddle_dragon', p: 0.5 }, { item: 'dragon_shield', p: 0.5 }, { item: 'dragon_helm', p: 0.5 }, { item: 'dragon_boots', p: 0.4 }, { item: 'dragon_scale', p: 1 }, { item: 'frost_blade', p: 0.25 }, { item: 'storm_bow', p: 0.25 }, { item: 'ruby', p: 0.6 }] },
  world_titan: { name: '💀 Uralter Titan', boss: true, worldBoss: true, hp: 40000, dmg: 280, atkMs: 2200, moveMs: 560, xp: 20000, gold: [5000, 9000], aggro: 12, ranged: { dmg: 200, range: 6, ms: 2600 },
    drops: [{ item: 'titan_heart', p: 1 }, { item: 'titan_sword', p: 0.35 }, { item: 'titan_staff', p: 0.35 }, { item: 'phoenix_bow', p: 0.35 }, { item: 'phoenix_claws', p: 0.35 }, { item: 'royal_plate', p: 0.3 }, { item: 'royal_shield', p: 0.3 }, { item: 'phoenix_boots', p: 0.3 }, { item: 'crown_helm', p: 0.4 }, { item: 'diamond', p: 1 }] },
};

// voc: nur diese Berufe können es tragen (fehlt = alle)
const ITEMS = {
  hp_potion:    { name: 'Heiltrank',       kind: 'potion', heal: 150, price: 45 },
  mp_potion:    { name: 'Manatrank',       kind: 'potion', mana: 120, price: 55 },
  cheese:       { name: 'Käse',            kind: 'food', food: 90,  price: 15 },
  bread:        { name: 'Brot',            kind: 'food', food: 120, price: 20 },
  meat:         { name: 'Fleisch',         kind: 'food', food: 180, price: 35 },
  ham:          { name: 'Schinken',        kind: 'food', food: 300, price: 60 },

  // ---- Sammel-Loot: Trophäen & Schätze (beim Händler verkaufen!) ----
  rag:          { name: 'Stofffetzen',     kind: 'loot', price: 6 },
  rat_tail:     { name: 'Rattenschwanz',   kind: 'loot', price: 8 },
  bone:         { name: 'Knochen',         kind: 'loot', price: 10 },
  feather:      { name: 'Schimmernde Feder', kind: 'loot', price: 16 },
  skull:        { name: 'Totenschädel',    kind: 'loot', price: 24 },
  snake_skin:   { name: 'Schlangenhaut',   kind: 'loot', price: 30 },
  fox_fur:      { name: 'Fuchspelz',       kind: 'loot', price: 36 },
  tusk:         { name: 'Stoßzahn',        kind: 'loot', price: 40 },
  spider_silk:  { name: 'Spinnenseide',    kind: 'loot', price: 44 },
  wolf_pelt:    { name: 'Wolfspelz',       kind: 'loot', price: 50 },
  bear_fur:     { name: 'Bärenfell',       kind: 'loot', price: 80 },
  amber:        { name: 'Bernstein',       kind: 'loot', price: 120 },
  silver_ring:  { name: 'Silberring',      kind: 'loot', price: 170 },
  pearl:        { name: 'Perle',           kind: 'loot', price: 190 },
  gold_necklace:{ name: 'Goldkette',       kind: 'loot', price: 380 },
  emerald:      { name: 'Smaragd',         kind: 'loot', price: 550 },
  ruby:         { name: 'Rubin',           kind: 'loot', price: 900 },
  dragon_scale: { name: 'Drachenschuppe',  kind: 'loot', price: 1200 },
  diamond:      { name: 'Diamant',         kind: 'loot', price: 1800 },
  demon_horn:   { name: 'Dämonenhorn',     kind: 'loot', price: 2400 },
  titan_heart:  { name: 'Titanenherz',     kind: 'loot', price: 9000 },

  // ---- Waffen ----
  dagger:       { name: 'Dolch',           kind: 'weapon', atk: 8,  price: 40 },
  club:         { name: 'Keule',           kind: 'weapon', atk: 12, price: 120, voc: ['knight'] },
  sword:        { name: 'Schwert',         kind: 'weapon', atk: 18, price: 250,  voc: ['knight'] },
  morning_star: { name: 'Morgenstern',     kind: 'weapon', atk: 22, price: 550,  voc: ['knight'] },
  axe:          { name: 'Kriegsaxt',       kind: 'weapon', atk: 28, price: 900,  voc: ['knight'] },
  battle_hammer:{ name: 'Kriegshammer',    kind: 'weapon', atk: 34, price: 1900, voc: ['knight'] },
  fire_sword:   { name: 'Feuerschwert',    kind: 'weapon', atk: 42, price: 4000, voc: ['knight'] },
  frost_blade:  { name: 'Frostklinge',     kind: 'weapon', atk: 48, price: 7500, voc: ['knight'] },
  demon_blade:  { name: 'Dämonenklinge',   kind: 'weapon', atk: 55, price: 12000, voc: ['knight'] },
  titan_sword:  { name: 'Titanenschwert',  kind: 'weapon', atk: 62, price: 22000, voc: ['knight'] },
  bow:          { name: 'Jagdbogen',       kind: 'weapon', atk: 16, price: 220,  voc: ['paladin'] },
  long_bow:     { name: 'Langbogen',       kind: 'weapon', atk: 21, price: 550,  voc: ['paladin'] },
  crossbow:     { name: 'Armbrust',        kind: 'weapon', atk: 26, price: 900,  voc: ['paladin'] },
  hawk_bow:     { name: 'Falkenbogen',     kind: 'weapon', atk: 33, price: 1900, voc: ['paladin'] },
  elven_bow:    { name: 'Elfenbogen',      kind: 'weapon', atk: 40, price: 4000, voc: ['paladin'] },
  storm_bow:    { name: 'Sturmbogen',      kind: 'weapon', atk: 48, price: 7500, voc: ['paladin'] },
  demon_bow:    { name: 'Dämonenbogen',    kind: 'weapon', atk: 54, price: 12000, voc: ['paladin'] },
  phoenix_bow:  { name: 'Phönixbogen',     kind: 'weapon', atk: 62, price: 22000, voc: ['paladin'] },
  wand:         { name: 'Zauberstab',      kind: 'weapon', atk: 16, price: 220,  voc: ['sorcerer'] },
  oak_staff:    { name: 'Eichenstab',      kind: 'weapon', atk: 21, price: 550,  voc: ['sorcerer'] },
  fire_wand:    { name: 'Feuerstab',       kind: 'weapon', atk: 26, price: 900,  voc: ['sorcerer'] },
  crystal_wand: { name: 'Kristallstab',    kind: 'weapon', atk: 33, price: 1900, voc: ['sorcerer'] },
  storm_staff:  { name: 'Sturmstab',       kind: 'weapon', atk: 40, price: 4000, voc: ['sorcerer'] },
  frost_staff:  { name: 'Froststab',       kind: 'weapon', atk: 48, price: 7500, voc: ['sorcerer'] },
  demon_staff:  { name: 'Dämonenstab',     kind: 'weapon', atk: 54, price: 12000, voc: ['sorcerer'] },
  titan_staff:  { name: 'Titanenstab',     kind: 'weapon', atk: 62, price: 22000, voc: ['sorcerer'] },
  claws:        { name: 'Bestien-Handschuhe', kind: 'weapon', atk: 16, price: 220, voc: ['tamer'] },
  bone_claws:   { name: 'Knochenkrallen',  kind: 'weapon', atk: 21, price: 550,  voc: ['tamer'] },
  wild_claws:   { name: 'Wildkrallen',     kind: 'weapon', atk: 26, price: 900,  voc: ['tamer'] },
  panther_claws:{ name: 'Pantherkrallen',  kind: 'weapon', atk: 33, price: 1900, voc: ['tamer'] },
  beast_claws:  { name: 'Bestienklauen',   kind: 'weapon', atk: 40, price: 4000, voc: ['tamer'] },
  frost_claws:  { name: 'Frostkrallen',    kind: 'weapon', atk: 48, price: 7500, voc: ['tamer'] },
  demon_claws:  { name: 'Dämonenkrallen',  kind: 'weapon', atk: 54, price: 12000, voc: ['tamer'] },
  phoenix_claws:{ name: 'Phönixkrallen',   kind: 'weapon', atk: 62, price: 22000, voc: ['tamer'] },

  // ---- Rüstungen ----
  leather:      { name: 'Lederrüstung',    kind: 'armor', def: 8,  price: 120 },
  studded:      { name: 'Nietenrüstung',   kind: 'armor', def: 12, price: 420 },
  chain:        { name: 'Kettenrüstung',   kind: 'armor', def: 16, price: 800 },
  scale_armor:  { name: 'Schuppenrüstung', kind: 'armor', def: 20, price: 1700 },
  robe:         { name: 'Magierrobe',      kind: 'armor', def: 22, price: 3000, voc: ['sorcerer'] },
  ranger_armor: { name: 'Waldläufer-Rüstung', kind: 'armor', def: 24, price: 3200, voc: ['paladin'] },
  beast_hide:   { name: 'Bestienfell',     kind: 'armor', def: 24, price: 3200, voc: ['tamer'] },
  plate:        { name: 'Plattenrüstung',  kind: 'armor', def: 26, price: 3500, voc: ['knight'] },
  shadow_robe:  { name: 'Schattenrobe',    kind: 'armor', def: 28, price: 6000, voc: ['sorcerer'] },
  storm_mail:   { name: 'Sturmharnisch',   kind: 'armor', def: 29, price: 6200, voc: ['paladin'] },
  titan_hide:   { name: 'Titanenfell',     kind: 'armor', def: 29, price: 6200, voc: ['tamer'] },
  frost_plate:  { name: 'Frostpanzer',     kind: 'armor', def: 31, price: 6500, voc: ['knight'] },
  demon_plate:  { name: 'Dämonenrüstung',  kind: 'armor', def: 36, price: 10000, voc: ['knight'] },
  royal_plate:  { name: 'Königsharnisch',  kind: 'armor', def: 42, price: 20000, voc: ['knight'] },

  // ---- Hosen ----
  cloth_legs:   { name: 'Stoffhose',       kind: 'legs', def: 3,  price: 50 },
  leather_legs: { name: 'Lederhose',       kind: 'legs', def: 6,  price: 300 },
  chain_legs:   { name: 'Kettenbeinschutz', kind: 'legs', def: 9, price: 750 },
  ranger_legs:  { name: 'Waldläufer-Hose', kind: 'legs', def: 12, price: 2200, voc: ['paladin'] },
  silk_legs:    { name: 'Seidenhose',      kind: 'legs', def: 12, price: 2200, voc: ['sorcerer'] },
  hide_legs:    { name: 'Fellhose',        kind: 'legs', def: 12, price: 2200, voc: ['tamer'] },
  plate_legs:   { name: 'Plattenbeinschutz', kind: 'legs', def: 14, price: 2500, voc: ['knight'] },
  scale_legs:   { name: 'Schuppenhose',    kind: 'legs', def: 16, price: 3200 },
  royal_legs:   { name: 'Königsbeinschutz', kind: 'legs', def: 21, price: 9000 },

  // ---- Helme ----
  leather_helm: { name: 'Lederkappe',      kind: 'helmet', def: 4,  price: 80 },
  bone_helm:    { name: 'Knochenhelm',     kind: 'helmet', def: 6,  price: 260 },
  magic_hat:    { name: 'Magierhut',       kind: 'helmet', def: 7,  price: 900, voc: ['sorcerer'] },
  iron_helm:    { name: 'Eisenhelm',       kind: 'helmet', def: 9,  price: 600 },
  steel_helm:   { name: 'Stahlhelm',       kind: 'helmet', def: 12, price: 1600 },
  crystal_circlet: { name: 'Kristallreif', kind: 'helmet', def: 14, price: 3200, voc: ['sorcerer'] },
  dragon_helm:  { name: 'Drachenhelm',     kind: 'helmet', def: 16, price: 3000 },
  crown_helm:   { name: 'Kronenhelm',      kind: 'helmet', def: 19, price: 5500 },
  frost_helm:   { name: 'Frosthelm',       kind: 'helmet', def: 22, price: 9500 },

  // ---- Schilde ----
  torch:        { name: 'Fackel',          kind: 'shield', def: 1, light: true, price: 30 },
  wood_shield:  { name: 'Holzschild',      kind: 'shield', def: 6,  price: 100 },
  bone_shield:  { name: 'Knochenschild',   kind: 'shield', def: 9,  price: 420 },
  iron_shield:  { name: 'Eisenschild',     kind: 'shield', def: 12, price: 900 },
  steel_shield: { name: 'Stahlschild',     kind: 'shield', def: 16, price: 2400 },
  dragon_shield:{ name: 'Drachenschild',   kind: 'shield', def: 20, price: 4500 },
  royal_shield: { name: 'Königsschild',    kind: 'shield', def: 25, price: 9500 },

  // ---- Stiefel ----
  boots:        { name: 'Lederstiefel',    kind: 'boots', def: 2, price: 60 },
  fur_boots:    { name: 'Fellstiefel',     kind: 'boots', def: 4, price: 320 },
  iron_boots:   { name: 'Eisenstiefel',    kind: 'boots', def: 6, price: 700 },
  steel_boots:  { name: 'Stahlstiefel',    kind: 'boots', def: 9, price: 2600 },
  swift_boots:  { name: 'Windstiefel',     kind: 'boots', def: 3, speed: 30, price: 2500 },
  dragon_boots: { name: 'Drachenstiefel',  kind: 'boots', def: 12, price: 6500 },
  phoenix_boots:{ name: 'Phönixstiefel',   kind: 'boots', def: 8, speed: 45, price: 13000 },

  // ---- Sättel (Mounts) ----
  saddle_horse:    { name: 'Pferdesattel',      kind: 'mount', mount: 'horse',        price: 2000 },
  saddle_wolf:     { name: 'Wolfssattel',       kind: 'mount', mount: 'wolf',         price: 5000 },
  saddle_bear:     { name: 'Bärensattel',       kind: 'mount', mount: 'bear',         price: 5000 },
  saddle_panther:  { name: 'Panthersattel',     kind: 'mount', mount: 'panther',      price: 6000 },
  saddle_frost_wolf: { name: 'Frostwolf-Sattel', kind: 'mount', mount: 'frost_wolf',  price: 7000 },
  saddle_spider:   { name: 'Spinnensattel',     kind: 'mount', mount: 'giant_spider', price: 8000 },
  saddle_minotaur: { name: 'Minotaurus-Sattel', kind: 'mount', mount: 'minotaur',     price: 8000 },
  saddle_tiger:    { name: 'Säbelzahn-Sattel',  kind: 'mount', mount: 'sabertooth',   price: 9000 },
  saddle_golem:    { name: 'Golem-Sattel',      kind: 'mount', mount: 'golem',        price: 10000 },
  saddle_unicorn:  { name: 'Einhornsattel',     kind: 'mount', mount: 'unicorn',      price: 12000 },
  saddle_lava_hound: { name: 'Lavahund-Sattel', kind: 'mount', mount: 'lava_hound',   price: 12000 },
  saddle_griffin:  { name: 'Greifensattel',     kind: 'mount', mount: 'griffin',      price: 15000 },
  saddle_wyrm:     { name: 'Wyrm-Sattel',       kind: 'mount', mount: 'wyrm',         price: 15000 },
  saddle_dragon:   { name: 'Drachensattel',     kind: 'mount', mount: 'dragon',       price: 20000 },
  saddle_frost_dragon: { name: 'Frostdrachen-Sattel', kind: 'mount', mount: 'frost_dragon', price: 25000 },
  saddle_phoenix:  { name: 'Phönixsattel',      kind: 'mount', mount: 'phoenix',      price: 25000 },
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
  'dagger', 'club', 'sword', 'bow', 'wand', 'claws',
  'leather', 'studded', 'cloth_legs', 'leather_legs', 'leather_helm', 'bone_helm', 'wood_shield', 'boots', 'fur_boots',
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
