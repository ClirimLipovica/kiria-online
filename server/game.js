// ---------------------------------------------------------------
// Kiria Online 3D – Spiellogik (v9)
// PvP (außerhalb der Städte), Zauber per Chat, Leichen-Loot,
// Essen/Hunger, Mounts, Tier-Stall, Berufs-Ausrüstung.
// Neu in v9: Monster mit Wegfindung um Hindernisse, schlaue
// Zielwahl (Rache/Schwache zuerst), Schutzzonen ohne Exploits,
// Boss-System mit täglichem Weltboss.
// ---------------------------------------------------------------
const storage = require('./storage');
const {
  MONSTERS, ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS, OUTFITS, SHOP_ITEMS, QUESTS,
  MOUNT_SPEED, HASTE_SPEED, FOOD_MAX, SKULL_MS, xpForLevel, petXpForLevel,
  skillNext, SKILL_CAP, tameMlRequired, tameStartLevel,
} = require('./constants');

const OUTFIT_IDS = OUTFITS.map((o) => o.id);
const ALL_MOUNTS = [...new Set(Object.values(ITEMS).filter((i) => i.kind === 'mount').map((i) => i.mount))];

// Welche Outfits hat der Spieler frei? (Start + Level-erreicht + gekaufte/Quest in p.outfits)
function isOutfitUnlocked(p, o) {
  if (o.unlock === 'start') return true;
  if (o.unlock.level) return p.level >= o.unlock.level;
  return p.outfits.includes(o.id); // gold/quest/item werden in p.outfits gespeichert
}
function unlockedOutfitIds(p) {
  return OUTFITS.filter((o) => isOutfitUnlocked(p, o)).map((o) => o.id);
}
const { generateWorld, isWalkable } = require('./world');

const TICK_MS = 150;
const BASE_ATK_MS = 2000;
const MAP_VERSION = 5;
const CORPSE_TTL = 90000;
const STABLE_MAX = 6;

const world = generateWorld();

const players = new Map();
const monsters = new Map();
const pets = new Map();
const corpses = new Map();
const occ = new Map();
let nextMonsterId = 1;
let nextPetId = 1;
let nextCorpseId = 1;
let io = null;

let dirtyMoves = new Map();
let dirtyHp = new Map();
let events = [];
let dirtyPrivate = new Set();

const key = (x, y) => x + ',' + y;
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function isFree(x, y, ignoreId) {
  if (!isWalkable(world, x, y)) return false;
  const o = occ.get(key(x, y));
  return !o || o === ignoreId;
}

function inTown(x, y) {
  for (const t of world.towns) {
    if (Math.abs(x - t.cx) <= t.r && Math.abs(y - t.cy) <= t.r) return true;
  }
  return false;
}

function monsterCanStep(x, y) {
  return isFree(x, y) && !inTown(x, y);
}

function nearestTemple(x, y) {
  let best = world.towns[0], bestD = Infinity;
  for (const t of world.towns) {
    const d = Math.hypot(x - t.cx, y - t.cy);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best.temple;
}

function place(ent, x, y) {
  occ.delete(key(ent.x, ent.y));
  ent.x = x; ent.y = y;
  occ.set(key(x, y), ent.id);
  dirtyMoves.set(ent.id, [x, y]);
}

function placePet(pet, x, y) {
  pet.x = x; pet.y = y;
  dirtyMoves.set(pet.id, [x, y]);
}

function removeFromMap(ent) {
  if (occ.get(key(ent.x, ent.y)) === ent.id) occ.delete(key(ent.x, ent.y));
}

function findFreeNear(cx, cy, rMax, rMin = 0, avoidTown = false) {
  for (let tries = 0; tries < 60; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (!isFree(x, y)) continue;
    if (!world.reachable[y * world.size + x]) continue;
    if (avoidTown && inTown(x, y)) continue;
    return { x, y };
  }
  return null;
}

// ---------------- Monster ----------------
function spawnMonster(type, home, silent = false) {
  const def = MONSTERS[type];
  const pos = findFreeNear(home.x, home.y, home.r, home.rMin || 0, true);
  if (!pos) return null;
  const m = {
    id: 'm' + (nextMonsterId++),
    type, x: pos.x, y: pos.y,
    hp: def.hp, maxHp: def.hp,
    home, targetId: null,
    // Shiny: 4% Chance auf eine seltene Farbvariante (nicht bei Bossen)
    shiny: !def.boss && Math.random() < SHINY_CHANCE,
    lastMove: 0, lastAtk: 0, lastRanged: 0,
    dead: false, respawnAt: 0,
    damageBy: {},
    path: null, nextPathAt: 0, pathGoal: null,
    blockedSince: 0, lastCombatAt: 0, retargetAt: 0,
  };
  monsters.set(m.id, m);
  occ.set(key(m.x, m.y), m.id);
  if (!silent) events.push({ t: 'spawn', monster: publicMonster(m) });
  return m;
}

function initMonsters() {
  for (const s of world.spawns) {
    for (let i = 0; i < s.count; i++) {
      spawnMonster(s.type, { x: s.cx, y: s.cy, r: s.rMax, rMin: s.rMin }, true);
    }
  }
}

function publicMonster(m) {
  const def = MONSTERS[m.type];
  return {
    id: m.id, type: m.type, name: (m.shiny ? '✨ ' : '') + def.name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp,
    mv: def.moveMs, boss: def.boss ? true : undefined,
    worldBoss: def.worldBoss ? true : undefined,
    shiny: m.shiny ? true : undefined,
  };
}

// ---------------- Tiere (Bestienzüchter) ----------------
function petStats(type, level) {
  const def = MONSTERS[type];
  return {
    maxHp: Math.round(def.hp * 1.9 * (1 + 0.12 * (level - 1))),
    dmg: def.dmg * 1.35 * (1 + 0.10 * (level - 1)),
  };
}

const MAX_ACTIVE_PETS = 2;    // so viele Tiere darf man gleichzeitig beschwören
const SHINY_CHANCE = 0.04;    // 4% Chance auf ein glänzendes (andersfarbiges) Tier

function createPet(owner, type, level = 1, xp = 0, silent = false, opts = {}) {
  const stats = petStats(type, level);
  const pos = findFreeNear(owner.x, owner.y, 3) || { x: owner.x, y: owner.y };
  const pet = {
    id: 'p' + (nextPetId++),
    type, level, xp,
    name: opts.name || MONSTERS[type].name,
    shiny: !!opts.shiny,
    x: pos.x, y: pos.y,
    hp: stats.maxHp, maxHp: stats.maxHp,
    ownerId: owner.id, ownerName: owner.name,
    targetId: null, retargetAt: 0,
    lastMove: 0, lastAtk: 0, buffUntil: 0,
  };
  pets.set(pet.id, pet);
  owner.pets.push(pet);
  if (!silent) events.push({ t: 'pet', pet: publicPet(pet) });
  dirtyPrivate.add(owner.id);
  return pet;
}

function publicPet(p) {
  return {
    id: p.id, type: p.type, name: p.name, level: p.level, shiny: p.shiny,
    x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
    ownerId: p.ownerId, ownerName: p.ownerName,
  };
}

function removePet(pet, deathEvent = true) {
  pets.delete(pet.id);
  const owner = players.get(pet.ownerId);
  if (owner && owner.pets) {
    const i = owner.pets.indexOf(pet);
    if (i >= 0) { owner.pets.splice(i, 1); dirtyPrivate.add(owner.id); }
  }
  if (deathEvent) events.push({ t: 'die', id: pet.id });
}

function damagePet(pet, dmg, source) {
  pet.hp = Math.max(0, pet.hp - dmg);
  dirtyHp.set(pet.id, [pet.hp, pet.maxHp]);
  events.push({ t: 'dmg', id: pet.id, amount: dmg });
  const owner = players.get(pet.ownerId);
  if (owner) dirtyPrivate.add(owner.id);
  if (pet.hp <= 0) {
    if (owner) info(owner, `💔 Dein ${pet.name} ist gefallen!`);
    removePet(pet);
    if (source && source.targetId === pet.id) source.targetId = null;
  }
}

function givePetXp(pet, amount) {
  pet.xp += amount;
  let leveled = false;
  while (pet.level < 40 && pet.xp >= petXpForLevel(pet.level + 1)) {
    pet.level++;
    leveled = true;
    const stats = petStats(pet.type, pet.level);
    pet.maxHp = stats.maxHp;
    pet.hp = stats.maxHp;
  }
  if (leveled) {
    dirtyHp.set(pet.id, [pet.hp, pet.maxHp]);
    events.push({ t: 'levelup', id: pet.id, level: pet.level });
    const owner = players.get(pet.ownerId);
    if (owner) { info(owner, `🐾 Dein ${pet.name} ist jetzt Stufe ${pet.level}!`); dirtyPrivate.add(owner.id); }
  }
}

// Stall: ein aktives Tier deponieren (index in p.pets, Standard 0)
function petStash(p, index = 0) {
  const pet = p.pets[index] || p.pets[0];
  if (!pet) return info(p, 'Du hast kein aktives Tier.');
  if (p.petStable.length >= STABLE_MAX) return info(p, `Dein Stall ist voll (max. ${STABLE_MAX}).`);
  p.petStable.push({ type: pet.type, level: pet.level, xp: pet.xp, name: pet.name, shiny: pet.shiny });
  info(p, `${pet.name} wurde im Stall untergebracht.`);
  removePet(pet);
  dirtyPrivate.add(p.id);
}

// Stall: Tier einsetzen (bis zu 2 gleichzeitig)
function petDeploy(p, index) {
  const entry = p.petStable[index];
  if (!entry) return;
  if (p.pets.length >= MAX_ACTIVE_PETS) return info(p, `Du kannst nur ${MAX_ACTIVE_PETS} Tiere gleichzeitig bei dir haben. Bring eins in den Stall.`);
  p.petStable.splice(index, 1);
  createPet(p, entry.type, entry.level, entry.xp, false, { name: entry.name, shiny: entry.shiny });
  info(p, `${entry.name || MONSTERS[entry.type].name} (Stufe ${entry.level}) ist wieder an deiner Seite!`);
  dirtyPrivate.add(p.id);
}

function petRelease(p, index) {
  const entry = p.petStable[index];
  if (!entry) return;
  p.petStable.splice(index, 1);
  info(p, `Du entlässt ${entry.name || MONSTERS[entry.type].name} in die Freiheit.`);
  dirtyPrivate.add(p.id);
}

// aktives Tier freilassen (index, Standard das erste)
function dismissPet(p, index = 0) {
  const pet = p.pets[index] || p.pets[0];
  if (!pet) return;
  info(p, `Du entlässt ${pet.name} in die Freiheit.`);
  removePet(pet);
}

// Aktives Tier oder Stall-Tier benennen
function renamePet(p, ref, name) {
  name = String(name || '').trim().replace(/[^A-Za-z0-9ÄÖÜäöüß _-]/g, '').slice(0, 16);
  if (!name) return info(p, 'Bitte einen gültigen Namen eingeben (bis 16 Zeichen).');
  if (typeof ref === 'string' && ref.startsWith('p')) {
    const pet = p.pets.find((x) => x.id === ref);
    if (!pet) return;
    pet.name = name;
    events.push({ t: 'petName', id: pet.id, name });
    info(p, `Dein Tier heißt jetzt ${name}!`);
  } else {
    const entry = p.petStable[ref | 0];
    if (!entry) return;
    entry.name = name;
    info(p, `Dein Stall-Tier heißt jetzt ${name}!`);
  }
  dirtyPrivate.add(p.id);
}

// ---------------- Spieler ----------------
function publicPlayer(p) {
  return {
    id: p.id, name: p.name, vocation: p.vocation, outfit: p.outfit,
    x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, level: p.level, dead: p.dead,
    mounted: p.mounted, skull: p.skullUntil > Date.now(),
  };
}

// Totenkopf: PvP-Angreifer dürfen 60 s lang keine Stadt betreten
function markSkull(p) {
  const now = Date.now();
  const had = p.skullUntil > now;
  p.skullUntil = now + SKULL_MS;
  if (!had) {
    events.push({ t: 'skull', id: p.id, on: true });
    info(p, '💀 Du hast einen Totenkopf! Städte sind für dich 60 Sekunden gesperrt.');
  }
  dirtyPrivate.add(p.id);
}

function privatePlayer(p) {
  const now = Date.now();
  return {
    ...publicPlayer(p),
    mp: p.mp, maxMp: p.maxMp, xp: p.xp, xpNext: xpForLevel(p.level + 1),
    gold: p.gold, speed: effectiveSpeed(p), food: Math.round(p.food),
    inv: p.inv, eq: p.eq, quests: p.quests, mounts: p.mounts,
    atk: Math.round(meleeBase(p)), def: armorDef(p),
    skills: Object.fromEntries(['atk', 'shield', 'magic'].map((k) => [k, {
      lvl: p.skills[k].lvl,
      pct: p.skills[k].lvl >= SKILL_CAP ? 100 : Math.min(99, Math.floor(100 * p.skills[k].pts / skillNext(k, p.skills[k].lvl))),
    }])),
    buffs: {
      atk: Math.max(0, p.buffs.atk - now), def: Math.max(0, p.buffs.def - now),
      speed: Math.max(0, p.buffs.speed - now), light: Math.max(0, p.buffs.light - now),
      regen: Math.max(0, p.buffs.regen - now),
    },
    skullMs: Math.max(0, p.skullUntil - now),
    torchLight: !!(p.eq.shield && ITEMS[p.eq.shield].light),
    pets: p.pets.map((pet) => ({
      id: pet.id, type: pet.type, name: pet.name, level: pet.level, shiny: pet.shiny,
      hp: pet.hp, maxHp: pet.maxHp, xp: pet.xp, xpNext: petXpForLevel(pet.level + 1),
    })),
    petStable: p.petStable,
    maxPets: MAX_ACTIVE_PETS,
    unlockedOutfits: unlockedOutfitIds(p),
  };
}

function recalcSpeed(p) {
  const boots = p.eq.boots ? ITEMS[p.eq.boots] : null;
  p.speed = Math.max(170, 300 - p.level * 2 - (boots && boots.speed ? boots.speed : 0));
}

function effectiveSpeed(p) {
  let s = p.speed;
  if (p.buffs.speed > Date.now()) s *= HASTE_SPEED;
  if (p.mounted) s *= MOUNT_SPEED;
  return Math.max(100, Math.round(s));
}

function createPlayer(socket, account) {
  const voc = VOCATIONS[account.vocation];
  let save = account.save;
  if (save && save.mapV !== MAP_VERSION) {
    save = { ...save, x: undefined, y: undefined };
  }
  const spawn = findFreeNear(world.templeSpawn.x, world.templeSpawn.y, 3) || world.templeSpawn;
  const eq = { weapon: null, armor: null, legs: null, helmet: null, shield: null, boots: null };
  if (save && save.eq) Object.assign(eq, save.eq);
  const p = {
    id: socket.id,
    accountKey: account.name.toLowerCase(),
    name: account.name,
    vocation: account.vocation,
    outfit: normalizeOutfit(account.outfit),
    x: save && save.x !== undefined ? save.x : spawn.x,
    y: save && save.y !== undefined ? save.y : spawn.y,
    level: save ? save.level : 1,
    xp: save ? save.xp : 0,
    gold: save ? save.gold : 50,
    food: save && save.food !== undefined ? save.food : 300,
    inv: save ? save.inv : { potHp: 3, potMp: 2, items: ['bread', 'torch'] },
    eq,
    quests: save && save.quests ? save.quests : {},
    mounts: save && save.mounts ? save.mounts : [],
    mounted: null,
    petStable: save && save.petStable ? save.petStable : [],
    skills: save && save.skills ? save.skills : {
      atk: { lvl: 10, pts: 0 }, shield: { lvl: 10, pts: 0 }, magic: { lvl: 0, pts: 0 },
    },
    buffs: { atk: 0, def: 0, speed: 0, light: 0, regen: 0 },
    skullUntil: 0, skullMsgAt: 0,
    pets: [],
    outfits: save && save.outfits ? save.outfits : null, // freigeschaltete Outfits (lazy init unten)
    targetId: null, dead: false,
    nextMoveAt: 0, lastAtk: 0, potCd: 0, spellCds: {}, lastChat: 0,
    socket,
  };
  p.maxHp = voc.hp + voc.hpL * (p.level - 1);
  p.maxMp = voc.mp + voc.mpL * (p.level - 1);
  p.hp = save && save.hp ? Math.min(save.hp, p.maxHp) : p.maxHp;
  p.mp = save && save.mp ? Math.min(save.mp, p.maxMp) : p.maxMp;
  recalcSpeed(p);
  if (!isFree(p.x, p.y)) {
    const alt = findFreeNear(p.x, p.y, 6) || spawn;
    p.x = alt.x; p.y = alt.y;
  }
  // Freigeschaltete Outfits: mindestens die Standard-Farben (Index 0–11)
  if (!Array.isArray(p.outfits)) p.outfits = [];
  players.set(p.id, p);
  occ.set(key(p.x, p.y), p.id);
  // Gespeicherte Tiere wiederbeleben (neues Array-Format + altes Einzel-Format)
  if (account.vocation === 'tamer' && save) {
    const list = Array.isArray(save.pets) ? save.pets : (save.pet ? [save.pet] : []);
    for (const sp of list.slice(0, MAX_ACTIVE_PETS)) {
      createPet(p, sp.type, sp.level, sp.xp || 0, true, { name: sp.name, shiny: sp.shiny });
    }
  }
  return p;
}

function saveData(p) {
  return {
    mapV: MAP_VERSION,
    x: p.x, y: p.y, level: p.level, xp: p.xp, gold: p.gold, food: p.food,
    hp: p.hp, mp: p.mp, inv: p.inv, eq: p.eq, quests: p.quests,
    mounts: p.mounts, petStable: p.petStable, skills: p.skills, outfits: p.outfits,
    pets: p.pets.map((pet) => ({ type: pet.type, level: pet.level, xp: pet.xp, name: pet.name, shiny: pet.shiny })),
  };
}

function removePlayer(p) {
  removeFromMap(p);
  for (const pet of [...p.pets]) removePet(pet);
  players.delete(p.id);
  for (const m of monsters.values()) if (m.targetId === p.id) m.targetId = null;
  for (const o of players.values()) if (o.targetId === p.id) o.targetId = null;
}

// ---------------- Fertigkeiten (Skills) ----------------
// Training durch BENUTZEN: Angriff durch Schläge, Schildkunst durch
// erlittene Treffer, Magie durch verbrauchtes Mana. Das Tempo hängt
// vom Beruf ab (Ritter skillt Angriff schnell, Magier die Magie …).
function trainSkill(p, kind, points) {
  const s = p.skills[kind];
  if (!s || s.lvl >= SKILL_CAP) return;
  s.pts += points * VOCATIONS[p.vocation].skills[kind];
  const need = skillNext(kind, s.lvl);
  if (s.pts >= need) {
    s.pts -= need;
    s.lvl++;
    const names = { atk: '⚔ Dein Angriff', shield: '🛡 Deine Schildkunst', magic: '✨ Dein Magie-Level' };
    info(p, `${names[kind]} steigt auf ${s.lvl}!`);
    events.push({ t: 'fx', kind: 'buff', at: [p.x, p.y], style: 'atk' });
    events.push({ t: 'levelup', id: p.id, level: p.level });
    dirtyPrivate.add(p.id);
  }
}

// ---------------- Kampfformeln ----------------
function meleeBase(p) {
  const voc = VOCATIONS[p.vocation];
  const wAtk = p.eq.weapon ? ITEMS[p.eq.weapon].atk : 0;
  let base = (12 + p.level * 1.8 + wAtk * 1.4) * voc.melee;
  base *= 1 + (p.skills.atk.lvl - 10) * 0.03; // ⚔ Angriffs-Skill
  if (p.buffs.atk > Date.now()) base *= 1.4;
  return base;
}

// Rüstung schützt – aber erst gute 🛡 Schildkunst schützt DICH
function armorDef(p) {
  let def = Math.floor(p.level * 0.3);
  for (const slot of ['armor', 'legs', 'helmet', 'shield', 'boots']) {
    if (p.eq[slot]) def += ITEMS[p.eq[slot]].def || 0;
  }
  def += Math.round((p.skills.shield.lvl - 10) * 1.2);
  return def;
}

function meleeDamage(p) {
  return Math.max(1, Math.round(meleeBase(p) * (0.5 + Math.random() * 0.5)));
}

function spellDamage(p, base, perLvl) {
  const voc = VOCATIONS[p.vocation];
  const mlBonus = 1 + p.skills.magic.lvl * 0.04; // ✨ Magie-Level
  return Math.max(1, Math.round((base + p.level * perLvl) * voc.spell * mlBonus * (0.85 + Math.random() * 0.3)));
}

// Roh-Schaden auf Spieler anwenden (Rüstung + Schildkunst + Schutzzauber)
function applyDamageToPlayer(target, raw, source) {
  let dmg = Math.max(1, Math.round(raw * (50 / (50 + armorDef(target)))));
  if (target.buffs.def > Date.now()) dmg = Math.max(1, Math.round(dmg * 0.6));
  // Getroffen werden trainiert die Schildkunst (mit Schild schneller)
  trainSkill(target, 'shield', target.eq.shield && !ITEMS[target.eq.shield].light ? 1.5 : 1);
  damagePlayer(target, dmg, source);
}

// ---------------- Schaden / Tod / XP ----------------
function damagePlayer(p, dmg, source) {
  if (p.dead) return;
  p.hp = Math.max(0, p.hp - dmg);
  dirtyHp.set(p.id, [p.hp, p.maxHp]);
  dirtyPrivate.add(p.id);
  events.push({ t: 'dmg', id: p.id, amount: dmg });
  if (p.hp <= 0) {
    p.dead = true;
    p.targetId = null;
    p.mounted = null;
    events.push({ t: 'mount', id: p.id, mount: null });
    p.gold = Math.floor(p.gold * 0.75);
    events.push({ t: 'die', id: p.id });
    info(p, 'Du bist gestorben! Du verlierst 25% deines Goldes.');
    // PvP-Tod im Chat verkünden
    if (source && players.has(source.id)) {
      io.emit('chat', { id: 'system', from: '⚔ Kiria', text: `☠ ${p.name} wurde von ${source.name} im Kampf besiegt!` });
    }
    for (const m of monsters.values()) if (m.targetId === p.id) m.targetId = null;
    for (const o of players.values()) if (o.targetId === p.id) o.targetId = null;
  }
}

function respawnPlayer(p) {
  if (!p.dead) return;
  const temple = nearestTemple(p.x, p.y);
  const spawn = findFreeNear(temple.x, temple.y, 3) || temple;
  p.dead = false;
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  place(p, spawn.x, spawn.y);
  dirtyHp.set(p.id, [p.hp, p.maxHp]);
  dirtyPrivate.add(p.id);
  events.push({ t: 'respawn', id: p.id });
  for (const pet of p.pets) placePet(pet, spawn.x, spawn.y);
}

function damageMonster(m, dmg, attacker, kind, aggroId) {
  if (m.dead) return;
  m.hp = Math.max(0, m.hp - dmg);
  m.lastCombatAt = Date.now();
  dirtyHp.set(m.id, [m.hp, m.maxHp]);
  events.push({ t: 'dmg', id: m.id, amount: dmg, kind: kind || 'melee' });
  if (!m.targetId) m.targetId = aggroId || attacker.id;
  // Schaden je Spieler merken (für faire XP-Teilung)
  if (players.has(attacker.id)) {
    m.damageBy[attacker.id] = (m.damageBy[attacker.id] || 0) + dmg;
  }
  // Rudel-Verhalten: Artgenossen in der Nähe eilen zu Hilfe!
  if (MONSTERS[m.type].pack) {
    for (const o of monsters.values()) {
      if (o.dead || o.targetId || o.type !== m.type || o === m) continue;
      if (cheb(o, m) <= 7) o.targetId = aggroId || attacker.id;
    }
  }
  if (m.hp <= 0) killMonster(m, attacker);
}

// Beute landet in einer Leiche – Spieler plündern per Klick
function killMonster(m, killer) {
  const def = MONSTERS[m.type];
  m.dead = true;
  m.targetId = null;
  m.respawnAt = Date.now() + 20000 + Math.random() * 20000;
  removeFromMap(m);
  events.push({ t: 'die', id: m.id });
  if (def.boss) onBossKilled(m, def, killer);

  // Leiche mit Beute
  const gold = randInt(def.gold[0], def.gold[1]);
  const items = [];
  for (const d of def.drops || []) {
    if (Math.random() < d.p) items.push(d.item);
  }
  if (gold > 0 || items.length) {
    const corpse = {
      id: 'c' + (nextCorpseId++),
      name: def.name, x: m.x, y: m.y, gold, items,
      expires: Date.now() + CORPSE_TTL,
    };
    corpses.set(corpse.id, corpse);
    events.push({ t: 'corpse', corpse: publicCorpse(corpse) });
  }

  // XP fair nach verursachtem Schaden auf alle Beteiligten verteilen
  const contributors = Object.entries(m.damageBy).filter(([id]) => players.has(id));
  const totalDmg = contributors.reduce((a, [, d]) => a + d, 0);
  const shares = totalDmg > 0
    ? contributors.map(([id, d]) => [players.get(id), d / totalDmg])
    : (killer && players.has(killer.id) ? [[killer, 1]] : []);

  for (const [p, share] of shares) {
    const xp = Math.max(1, Math.round(def.xp * share));
    giveXp(p, xp);
    for (const pet of p.pets) givePetXp(pet, xp);
    for (const [qid, state] of Object.entries(p.quests)) {
      const q = QUESTS[qid];
      if (!q || state.s !== 'active' || q.target !== m.type || state.n >= q.count) continue;
      state.n++;
      if (state.n >= q.count) info(p, `📜 Quest „${q.name}" erfüllt! Kehre zum Questgeber zurück.`);
      else info(p, `📜 ${q.name}: ${state.n}/${q.count}`);
    }
    dirtyPrivate.add(p.id);
  }
  m.damageBy = {};
  // Boss-Wächter respawnen nicht – sie existieren nur mit ihrem Boss
  if (m.guard) monsters.delete(m.id);
}

function publicCorpse(c) {
  return { id: c.id, name: c.name, x: c.x, y: c.y };
}

function lootCorpse(p, corpseId) {
  if (p.dead) return;
  const c = corpses.get(corpseId);
  if (!c) return;
  if (cheb(p, c) > 2) return info(p, 'Geh näher an die Beute heran.');
  const lootNames = [];
  if (c.gold > 0) { p.gold += c.gold; lootNames.push(c.gold + ' Gold'); }
  for (const itemId of c.items) {
    const item = ITEMS[itemId];
    if (item.kind === 'potion') {
      if (itemId === 'hp_potion') p.inv.potHp++;
      else p.inv.potMp++;
    } else {
      p.inv.items.push(itemId);
    }
    lootNames.push(item.name);
  }
  corpses.delete(corpseId);
  events.push({ t: 'corpseGone', id: corpseId });
  info(p, lootNames.length ? `Du erbeutest: ${lootNames.join(', ')}` : 'Die Beute war leer.');
  dirtyPrivate.add(p.id);
}

function giveXp(p, amount) {
  p.xp += amount;
  info(p, `Du erhältst ${amount} Erfahrung.`);
  const voc = VOCATIONS[p.vocation];
  while (p.xp >= xpForLevel(p.level + 1)) {
    p.level++;
    p.maxHp += voc.hpL;
    p.maxMp += voc.mpL;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    recalcSpeed(p);
    dirtyHp.set(p.id, [p.hp, p.maxHp]);
    events.push({ t: 'levelup', id: p.id, level: p.level });
    info(p, `⭐ Du bist jetzt Level ${p.level}!`);
  }
  dirtyPrivate.add(p.id);
}

function info(p, msg) {
  p.socket.emit('info', { msg });
}

function announce(text) {
  if (io) io.emit('chat', { id: 'system', from: '⚔ Kiria', text });
}

// ---------------- Boss-System ----------------
// Feste Bosse sitzen in Höhlen und erscheinen NUR, wenn ein Spieler mit
// der passenden Quest die Höhle betritt – mitsamt ihren Wächtern.
// Der Weltboss (Uralter Titan) erscheint nur am 13. des Monats, 18–19 Uhr.
const BOSS_RESPAWN_MS = 8 * 60000;        // nach Tod 8 Min. Ruhe, dann wieder beschwörbar
const BOSS_TRIGGER_DIST = 24;             // so nah muss man mit Quest an die Höhle
const WORLD_BOSS_SPOT = { x: 576, y: 720, name: 'auf dem großen Feld südlich von Kiria' };

const bossStates = [];
const worldBoss = { monsterId: null, spawnedThisWindow: false, spot: null };

function initBosses() {
  for (const lair of world.bossLairs) {
    bossStates.push({ ...lair, monsterId: null, guardIds: [], nextAt: 0 });
  }
}

// Zeitfenster des Weltbosses: 13. Tag des Monats, 18:00–18:59 (echte Zeit).
// Mit Umgebungsvariable TITAN_ALWAYS=1 zum Testen dauerhaft offen.
function titanWindowOpen(now) {
  if (process.env.TITAN_ALWAYS === '1') return true;
  const d = new Date(now);
  return d.getDate() === 13 && d.getHours() === 18;
}

function despawnBossGuards(b) {
  for (const gid of b.guardIds) {
    const g = monsters.get(gid);
    if (g && !g.dead) { removeFromMap(g); events.push({ t: 'die', id: gid }); }
    monsters.delete(gid);
  }
  b.guardIds = [];
}

function onBossKilled(m, def, killer) {
  const killerName = killer && killer.name ? killer.name : 'Ein Held';
  if (def.worldBoss) {
    worldBoss.monsterId = null;
    announce(`🏆 ${killerName} und seine Verbündeten haben den URALTEN TITANEN bezwungen! Kiria ist gerettet.`);
  } else {
    const state = bossStates.find((b) => b.monsterId === m.id);
    if (state) {
      state.monsterId = null;
      state.nextAt = Date.now() + BOSS_RESPAWN_MS;
      despawnBossGuards(state); // verbliebene Wächter ziehen sich zurück
    }
    announce(`🏆 ${killerName} hat ${def.name} bezwungen!`);
  }
  monsters.delete(m.id);
}

function updateBosses(now) {
  // ---- Feste Höhlen-Bosse ----
  for (const b of bossStates) {
    if (b.monsterId && monsters.has(b.monsterId)) continue; // Boss lebt
    if (b.monsterId) { b.monsterId = null; despawnBossGuards(b); }
    if (now < b.nextAt) continue;
    // Ist ein Spieler mit AKTIVER Boss-Quest nah genug an der Höhle?
    let trigger = null;
    for (const p of players.values()) {
      if (p.dead) continue;
      const st = p.quests[b.quest];
      if (!st || st.s !== 'active') continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) <= BOSS_TRIGGER_DIST) { trigger = p; break; }
    }
    if (!trigger) continue;
    const m = spawnMonster(b.type, { x: b.x, y: b.y, r: b.r });
    if (!m) { b.nextAt = now + 15000; continue; }
    b.monsterId = m.id;
    // Wächter mit erscheinen lassen
    const def = MONSTERS[b.type];
    b.guardIds = [];
    if (def.guards) {
      for (let i = 0; i < def.guards.count; i++) {
        const g = spawnMonster(def.guards.type, { x: b.x, y: b.y, r: b.r + 2 });
        if (g) { g.guard = true; b.guardIds.push(g.id); }
      }
    }
    // Nur Spieler in der Höhle benachrichtigen
    for (const p of players.values()) {
      if (Math.hypot(p.x - b.x, p.y - b.y) <= BOSS_TRIGGER_DIST + 8) {
        info(p, `⚔️ ${def.name} erhebt sich ${b.zone} – gemeinsam mit ihren Wächtern! Zum Kampf!`);
      }
    }
  }

  // ---- Weltboss (Uralter Titan) ----
  const titanAlive = worldBoss.monsterId && monsters.has(worldBoss.monsterId);
  if (titanWindowOpen(now)) {
    if (!titanAlive && !worldBoss.spawnedThisWindow) {
      const m = spawnMonster('world_titan', { x: WORLD_BOSS_SPOT.x, y: WORLD_BOSS_SPOT.y, r: 6 });
      if (m) {
        worldBoss.monsterId = m.id;
        worldBoss.spawnedThisWindow = true;
        worldBoss.spot = WORLD_BOSS_SPOT;
        announce(`💀💀💀 DER URALTE TITAN ist erwacht – ${WORLD_BOSS_SPOT.name}! Öffnet die Karte (M) und stellt ihn GEMEINSAM, ehe die Stunde vergeht!`);
      }
    }
  } else {
    worldBoss.spawnedThisWindow = false;
    if (titanAlive) {
      const m = monsters.get(worldBoss.monsterId);
      if (m) { removeFromMap(m); events.push({ t: 'die', id: m.id }); }
      monsters.delete(worldBoss.monsterId);
      worldBoss.monsterId = null;
      announce('💀 Der Uralte Titan versinkt wieder in der Tiefe – bis zum nächsten Mal…');
    }
  }
}

// ---------------- Aktionen ----------------
// Aus der Schutzzone heraus darf NIEMAND angreifen – sonst könnte
// man Monster gefahrlos von der Stadt aus beschießen.
function blockedBySafeZone(p, quiet = false) {
  if (!inTown(p.x, p.y)) return false;
  const now = Date.now();
  if (!quiet || now - (p.safeMsgAt || 0) > 2500) {
    p.safeMsgAt = now;
    info(p, '🕊 In der Schutzzone der Stadt kannst du nicht angreifen. Tritt vor die Tore!');
  }
  return true;
}

function tryMove(p, dx, dy) {
  if (p.dead) return;
  if (!Number.isInteger(dx) || !Number.isInteger(dy)) return;
  if (dx < -1 || dx > 1 || dy < -1 || dy > 1 || (dx === 0 && dy === 0)) return;
  const now = Date.now();
  if (now < p.nextMoveAt) return;
  const nx = p.x + dx, ny = p.y + dy;
  const diag = dx !== 0 && dy !== 0;
  if (diag && (!isWalkable(world, p.x + dx, p.y) || !isWalkable(world, p.x, p.y + dy))) {
    events.push({ t: 'pos', id: p.id, x: p.x, y: p.y });
    return;
  }
  // Mit Totenkopf keine Stadt betreten
  if (p.skullUntil > now && inTown(nx, ny) && !inTown(p.x, p.y)) {
    events.push({ t: 'pos', id: p.id, x: p.x, y: p.y });
    if (now - p.skullMsgAt > 2500) {
      p.skullMsgAt = now;
      info(p, `💀 Die Stadtwachen lassen dich nicht rein! Noch ${Math.ceil((p.skullUntil - now) / 1000)} Sekunden.`);
    }
    return;
  }
  if (!isFree(nx, ny, p.id)) {
    events.push({ t: 'pos', id: p.id, x: p.x, y: p.y });
    return;
  }
  p.nextMoveAt = now + effectiveSpeed(p) * (diag ? 1.45 : 1) * 0.85;
  place(p, nx, ny);
}

// Ziel darf Monster, Spieler oder gegnerisches Tier sein (PvP)
function setTarget(p, id) {
  if (typeof id !== 'string' && id !== null) return;
  if (id === p.id) id = null;
  const pt = id ? pets.get(id) : null;
  if (pt && pt.ownerId === p.id) id = null; // eigenes Tier nicht angreifbar
  p.targetId = id && (monsters.has(id) || players.has(id) || pets.has(id)) ? id : null;
}

// altes Format (Zahl-Farbindex) → Outfit-ID
function normalizeOutfit(v) {
  if (typeof v === 'string' && OUTFIT_IDS.includes(v)) return v;
  const n = Math.abs(parseInt(v, 10) || 0) % 12;
  return OUTFIT_IDS[n] || 'red';
}

// Outfit auswählen (nur ein freigeschaltetes)
function selectOutfit(p, outfitId) {
  outfitId = String(outfitId);
  const o = OUTFITS.find((x) => x.id === outfitId);
  if (!o) return;
  if (!isOutfitUnlocked(p, o)) {
    // per Gold kaufbar? dann direkt freischalten
    if (o.unlock.gold) {
      if (p.gold < o.unlock.gold) return info(p, `${o.name} kostet ${o.unlock.gold} Gold – so viel hast du nicht.`);
      p.gold -= o.unlock.gold;
      if (!p.outfits.includes(o.id)) p.outfits.push(o.id);
      info(p, `🎉 Outfit „${o.name}" gekauft!`);
    } else {
      return info(p, `„${o.name}" musst du erst freischalten.`);
    }
  }
  p.outfit = outfitId;
  const acc = accounts[p.accountKey];
  if (acc) acc.outfit = outfitId;
  events.push({ t: 'outfit', id: p.id, outfit: outfitId });
  dirtyPrivate.add(p.id);
}

// Ein bestimmtes Reittier aufsatteln (oder null = absteigen)
function selectMount(p, type) {
  if (p.dead) return;
  if (!type || type === 'none') {
    p.mounted = null;
    events.push({ t: 'mount', id: p.id, mount: null });
    dirtyPrivate.add(p.id);
    return;
  }
  type = String(type);
  if (!p.mounts.includes(type)) return info(p, 'Dieses Reittier besitzt du nicht.');
  p.mounted = type;
  events.push({ t: 'mount', id: p.id, mount: type });
  dirtyPrivate.add(p.id);
}

// Test-/Admin-Befehl: schaltet alles frei (Level 500, alle Mounts & Outfits).
// Funktioniert nur mit dem richtigen Code (ENV UNLOCK_CODE, Standard "kiria500").
function unlockAll(p, code) {
  const secret = process.env.UNLOCK_CODE || 'kiria500';
  if (code !== secret) return info(p, 'Falscher Code.');
  const voc = VOCATIONS[p.vocation];
  p.level = 500;
  p.xp = xpForLevel(500);
  p.maxHp = voc.hp + voc.hpL * 499; p.hp = p.maxHp;
  p.maxMp = voc.mp + voc.mpL * 499; p.mp = p.maxMp;
  p.gold = 9999999;
  p.skills = { atk: { lvl: 130, pts: 0 }, shield: { lvl: 130, pts: 0 }, magic: { lvl: 130, pts: 0 } };
  p.mounts = [...ALL_MOUNTS];
  p.outfits = OUTFITS.filter((o) => o.unlock !== 'start' && !o.unlock.level).map((o) => o.id);
  recalcSpeed(p);
  dirtyHp.set(p.id, [p.hp, p.maxHp]);
  events.push({ t: 'levelup', id: p.id, level: p.level });
  info(p, '⚡ ADMIN: Level 500, alle Reittiere und Outfits freigeschaltet! Öffne das Charakter-Menü (Taste C).');
  dirtyPrivate.add(p.id);
}

function mountToggle(p, type) {
  if (p.dead) return;
  if (p.mounted) {
    p.mounted = null;
    events.push({ t: 'mount', id: p.id, mount: null });
    dirtyPrivate.add(p.id);
    return;
  }
  type = String(type || p.mounts[0] || '');
  if (!p.mounts.includes(type)) return info(p, 'Dieses Mount besitzt du nicht.');
  p.mounted = type;
  events.push({ t: 'mount', id: p.id, mount: type });
  info(p, `Du reitest jetzt auf deinem ${MONSTERS[type] ? MONSTERS[type].name : 'Pferd'}.`);
  dirtyPrivate.add(p.id);
}

// Gegenstand benutzen: Essen essen / Sattel lernen
function useItem(p, invIndex) {
  if (p.dead) return;
  const itemId = p.inv.items[invIndex];
  if (!itemId) return;
  const item = ITEMS[itemId];
  if (item.kind === 'food') {
    p.inv.items.splice(invIndex, 1);
    p.food = Math.min(FOOD_MAX, p.food + item.food);
    info(p, `Mmh, ${item.name}! (+${Math.floor(item.food / 60)} Min. satt)`);
    dirtyPrivate.add(p.id);
  } else if (item.kind === 'mount') {
    if (p.mounts.includes(item.mount)) return info(p, 'Dieses Mount kennst du schon.');
    p.inv.items.splice(invIndex, 1);
    p.mounts.push(item.mount);
    const name = MONSTERS[item.mount] ? MONSTERS[item.mount].name : 'Pferd';
    info(p, `🐎 Du kannst jetzt ${name} reiten! (Taste R oder Charakter-Menü C)`);
    events.push({ t: 'fx', kind: 'tame', at: [p.x, p.y] });
    dirtyPrivate.add(p.id);
  } else {
    // Schaltet dieses Item ein Outfit frei? (z. B. Titanenherz, Dämonenhorn)
    const o = OUTFITS.find((x) => x.unlock.item === itemId);
    if (o) {
      if (p.outfits.includes(o.id)) return info(p, 'Dieses Outfit hast du schon.');
      p.inv.items.splice(invIndex, 1);
      p.outfits.push(o.id);
      info(p, `🎽 Outfit „${o.name}" freigeschaltet! (Charakter-Menü, Taste C)`);
      events.push({ t: 'fx', kind: 'nova', at: [p.x, p.y] });
      dirtyPrivate.add(p.id);
    }
  }
}

function castSpell(p, spellId) {
  if (p.dead) return;
  const spell = SPELLS[spellId];
  if (!spell) return;
  const voc = VOCATIONS[p.vocation];
  if (!voc.spells.includes(spellId)) return info(p, 'Diesen Zauber beherrscht dein Beruf nicht.');
  const now = Date.now();
  if (p.level < spell.lvl) return info(p, `Dafür brauchst du Level ${spell.lvl}.`);
  if ((p.spellCds[spellId] || 0) > now) return;
  if (p.mp < spell.mana) return info(p, 'Nicht genug Mana.');

  if (spell.kind === 'heal') {
    const heal = Math.round((30 + p.level * 5) * spell.power * voc.spell * (1 + p.skills.magic.lvl * 0.03));
    p.hp = Math.min(p.maxHp, p.hp + heal);
    events.push({ t: 'heal', id: p.id, amount: heal });
    dirtyHp.set(p.id, [p.hp, p.maxHp]);

  } else if (spell.kind === 'missile') {
    const m = monsters.get(p.targetId);
    const enemy = players.get(p.targetId);
    const enemyPet = pets.get(p.targetId);
    if (m && !m.dead) {
      if (blockedBySafeZone(p)) return;
      if (cheb(p, m) > spell.range) return info(p, 'Ziel ist zu weit weg.');
      events.push({ t: 'fx', kind: spell.fx, from: [p.x, p.y], to: [m.x, m.y] });
      damageMonster(m, spellDamage(p, spell.base, spell.perLvl), p, 'fire');
    } else if (enemy && !enemy.dead) {
      if (inTown(p.x, p.y) || inTown(enemy.x, enemy.y)) return info(p, 'In der Stadt herrscht Frieden.');
      if (cheb(p, enemy) > spell.range) return info(p, 'Ziel ist zu weit weg.');
      events.push({ t: 'fx', kind: spell.fx, from: [p.x, p.y], to: [enemy.x, enemy.y] });
      applyDamageToPlayer(enemy, spellDamage(p, spell.base, spell.perLvl), p);
      markSkull(p);
    } else if (enemyPet && enemyPet.ownerId !== p.id) {
      if (inTown(p.x, p.y) || inTown(enemyPet.x, enemyPet.y)) return info(p, 'In der Stadt herrscht Frieden.');
      if (cheb(p, enemyPet) > spell.range) return info(p, 'Ziel ist zu weit weg.');
      events.push({ t: 'fx', kind: spell.fx, from: [p.x, p.y], to: [enemyPet.x, enemyPet.y] });
      damagePet(enemyPet, spellDamage(p, spell.base, spell.perLvl), p);
      markSkull(p);
    } else return info(p, 'Kein Ziel ausgewählt.');

  } else if (spell.kind === 'strike') {
    // Wuchtiger Einzelschlag auf das aktuelle Ziel (Nahkampf)
    const m = monsters.get(p.targetId);
    const enemy = players.get(p.targetId);
    const enemyPet = pets.get(p.targetId);
    const dmg = Math.max(1, Math.round(meleeDamage(p) * spell.power));
    if (m && !m.dead) {
      if (blockedBySafeZone(p)) return;
      if (cheb(p, m) > 1) return info(p, 'Geh näher heran.');
      events.push({ t: 'fx', kind: 'slash', from: [p.x, p.y], to: [m.x, m.y] });
      damageMonster(m, dmg, p, 'melee');
    } else if (enemy && !enemy.dead) {
      if (inTown(p.x, p.y) || inTown(enemy.x, enemy.y)) return info(p, 'In der Stadt herrscht Frieden.');
      if (cheb(p, enemy) > 1) return info(p, 'Geh näher heran.');
      events.push({ t: 'fx', kind: 'slash', from: [p.x, p.y], to: [enemy.x, enemy.y] });
      applyDamageToPlayer(enemy, dmg, p);
      markSkull(p);
    } else if (enemyPet && enemyPet.ownerId !== p.id) {
      if (inTown(p.x, p.y) || inTown(enemyPet.x, enemyPet.y)) return info(p, 'In der Stadt herrscht Frieden.');
      if (cheb(p, enemyPet) > 1) return info(p, 'Geh näher heran.');
      events.push({ t: 'fx', kind: 'slash', from: [p.x, p.y], to: [enemyPet.x, enemyPet.y] });
      damagePet(enemyPet, dmg, p);
      markSkull(p);
    } else return info(p, 'Kein Ziel ausgewählt.');

  } else if (spell.kind === 'aoe1') {
    if (blockedBySafeZone(p)) return;
    const radius = spell.radius || 1;
    let hit = 0;
    for (const m of monsters.values()) {
      if (!m.dead && cheb(p, m) <= radius) {
        damageMonster(m, Math.round(meleeDamage(p) * spell.power), p, 'melee');
        hit++;
      }
    }
    events.push({ t: 'fx', kind: radius > 1 ? 'nova' : 'exori', at: [p.x, p.y], radius });
    if (!hit) info(p, 'Kein Monster in Reichweite.');

  } else if (spell.kind === 'nova') {
    if (blockedBySafeZone(p)) return;
    events.push({ t: 'fx', kind: 'nova', at: [p.x, p.y], style: spell.fx, radius: spell.radius });
    for (const m of monsters.values()) {
      if (!m.dead && cheb(p, m) <= spell.radius) {
        damageMonster(m, spellDamage(p, spell.base, spell.perLvl), p, 'fire');
      }
    }

  } else if (spell.kind === 'buff') {
    p.buffs[spell.buff] = now + spell.dur;
    events.push({ t: 'fx', kind: 'buff', at: [p.x, p.y], style: spell.buff });
    const msgs = { atk: '⚔ Dein Angriff ist verstärkt!', def: '🛡 Du bist geschützt!', speed: '💨 Du fühlst dich schnell wie der Wind!', regen: '💗 Heilende Kraft durchströmt dich!' };
    info(p, msgs[spell.buff] || 'Zauber gewirkt.');

  } else if (spell.kind === 'light') {
    p.buffs.light = now + spell.dur;
    events.push({ t: 'light', id: p.id, dur: spell.dur });
    info(p, '🔆 Licht umgibt dich.');

  } else if (spell.kind === 'tame') {
    const m = monsters.get(p.targetId);
    if (!m || m.dead) return info(p, 'Wähle zuerst ein Tier als Ziel.');
    const def = MONSTERS[m.type];
    if (!def.tame) return info(p, `${def.name} kann nicht gezähmt werden.`);
    if (p.pets.length >= MAX_ACTIVE_PETS) return info(p, `Du hast schon ${MAX_ACTIVE_PETS} Tiere. Bring eins in den Stall (Inventar).`);
    if (cheb(p, m) > spell.range) return info(p, 'Geh näher heran.');
    // Starke Bestien brauchen ein hohes ✨ Magie-Level!
    const ml = p.skills.magic.lvl;
    const reqMl = tameMlRequired(def.hp);
    if (ml < reqMl) return info(p, `${def.name} ist zu mächtig für dich – du brauchst Magie-Level ${reqMl} (du hast ${ml}). Wirke Zauber, um Magie zu trainieren!`);
    const hpPct = m.hp / m.maxHp;
    if (hpPct > 0.6) return info(p, 'Das Tier ist noch zu stark – schwäche es unter 60% Leben!');
    const chance = Math.min(0.95, 0.35 + 0.6 * ((0.6 - hpPct) / 0.6) + ml * 0.01);
    if (Math.random() < chance) {
      m.dead = true;
      m.targetId = null;
      m.respawnAt = now + 30000 + Math.random() * 20000;
      removeFromMap(m);
      events.push({ t: 'die', id: m.id });
      // Höheres Magie-Level = das Tier startet gleich stärker!
      const startLvl = tameStartLevel(ml);
      const shiny = Math.random() < SHINY_CHANCE;
      const pet = createPet(p, m.type, startLvl, 0, false, { shiny });
      events.push({ t: 'fx', kind: shiny ? 'nova' : 'tame', at: [pet.x, pet.y] });
      info(p, shiny
        ? `✨🐾 UNGLAUBLICH! Du hast ein GLÄNZENDES ${def.name} gezähmt – eine seltene Farbe! (Stufe ${startLvl})`
        : `🐾 Du hast ${def.name} gezähmt${startLvl > 1 ? ` – dank Magie-Level ${ml} startet es auf Stufe ${startLvl}!` : '! Es kämpft jetzt für dich.'}`);
      p.targetId = null;
    } else {
      info(p, `${def.name} hat sich losgerissen! Versuch es nochmal.`);
    }

  } else if (spell.kind === 'petheal') {
    if (!p.pets.length) return info(p, 'Du hast kein Tier.');
    const heal = Math.round((30 + p.level * 5) * spell.power);
    for (const pet of p.pets) {
      pet.hp = Math.min(pet.maxHp, pet.hp + heal);
      events.push({ t: 'heal', id: pet.id, amount: heal });
      dirtyHp.set(pet.id, [pet.hp, pet.maxHp]);
    }
    dirtyPrivate.add(p.id);

  } else if (spell.kind === 'petbuff') {
    if (!p.pets.length) return info(p, 'Du hast kein Tier.');
    for (const pet of p.pets) {
      pet.buffUntil = now + spell.dur;
      events.push({ t: 'fx', kind: 'buff', at: [pet.x, pet.y], style: 'atk' });
    }
    info(p, `🐾 Deine Tiere sind wild entschlossen!`);
  }

  p.mp -= spell.mana;
  p.spellCds[spellId] = now + spell.cd;
  // Mana ausgeben trainiert das ✨ Magie-Level
  trainSkill(p, 'magic', spell.mana);
  // Nahkampf-Zauber trainieren zusätzlich den ⚔ Angriff
  if (spell.kind === 'strike' || spell.kind === 'aoe1') trainSkill(p, 'atk', 1);
  dirtyPrivate.add(p.id);
}

function usePotion(p, kind) {
  if (p.dead) return;
  const now = Date.now();
  if (p.potCd > now) return;
  if (kind === 'hp') {
    if (p.inv.potHp <= 0) return info(p, 'Keine Heiltränke mehr.');
    p.inv.potHp--;
    const heal = ITEMS.hp_potion.heal;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    events.push({ t: 'heal', id: p.id, amount: heal });
    dirtyHp.set(p.id, [p.hp, p.maxHp]);
  } else if (kind === 'mp') {
    if (p.inv.potMp <= 0) return info(p, 'Keine Manatränke mehr.');
    p.inv.potMp--;
    p.mp = Math.min(p.maxMp, p.mp + ITEMS.mp_potion.mana);
    events.push({ t: 'heal', id: p.id, amount: 0 });
  } else return;
  p.potCd = now + 1000;
  dirtyPrivate.add(p.id);
}

// Welche Waren kann der Spieler hier kaufen?
function allowedShopItems(p) {
  const set = new Set();
  for (const n of world.npcs) {
    if (n.role !== 'merchant' || cheb(p, n) > 4) continue;
    for (const it of (n.shop || SHOP_ITEMS)) set.add(it);
  }
  return set;
}

function buyItem(p, itemId) {
  if (p.dead) return;
  const allowed = allowedShopItems(p);
  if (allowed.size === 0) return info(p, 'Du bist zu weit vom Händler entfernt.');
  if (!allowed.has(itemId)) return;
  const item = ITEMS[itemId];
  if (p.gold < item.price) return info(p, 'Nicht genug Gold.');
  p.gold -= item.price;
  if (item.kind === 'potion') {
    if (itemId === 'hp_potion') p.inv.potHp++;
    else p.inv.potMp++;
  } else {
    p.inv.items.push(itemId);
  }
  info(p, `Gekauft: ${item.name} (-${item.price} Gold)`);
  dirtyPrivate.add(p.id);
}

function sellItem(p, invIndex) {
  if (p.dead) return;
  if (allowedShopItems(p).size === 0) return info(p, 'Du bist zu weit vom Händler entfernt.');
  const itemId = p.inv.items[invIndex];
  if (!itemId) return;
  const price = Math.floor(ITEMS[itemId].price / 2);
  p.inv.items.splice(invIndex, 1);
  p.gold += price;
  info(p, `Verkauft: ${ITEMS[itemId].name} (+${price} Gold)`);
  dirtyPrivate.add(p.id);
}

function equipItem(p, invIndex) {
  if (p.dead) return;
  const itemId = p.inv.items[invIndex];
  if (!itemId) return;
  const item = ITEMS[itemId];
  if (!EQUIP_SLOTS.includes(item.kind)) return;
  if (item.voc && !item.voc.includes(p.vocation)) {
    return info(p, `${item.name} ist nichts für einen ${VOCATIONS[p.vocation].name}.`);
  }
  p.inv.items.splice(invIndex, 1);
  if (p.eq[item.kind]) p.inv.items.push(p.eq[item.kind]);
  p.eq[item.kind] = itemId;
  recalcSpeed(p);
  info(p, `Ausgerüstet: ${item.name}`);
  dirtyPrivate.add(p.id);
}

function unequipItem(p, slot) {
  if (p.dead) return;
  if (!EQUIP_SLOTS.includes(slot) || !p.eq[slot]) return;
  p.inv.items.push(p.eq[slot]);
  p.eq[slot] = null;
  recalcSpeed(p);
  dirtyPrivate.add(p.id);
}

// ---------------- Quests ----------------
function nearNpcById(p, npcId) {
  const n = world.npcs.find((x) => x.id === npcId);
  return n && cheb(p, n) <= 4;
}

function questAccept(p, qid) {
  const q = QUESTS[qid];
  if (!q || p.dead) return;
  if (!nearNpcById(p, q.npc)) return info(p, 'Geh näher zum Questgeber.');
  if (p.level < q.lvl) return info(p, `Dafür brauchst du Level ${q.lvl}.`);
  if (q.prereq && (!p.quests[q.prereq] || p.quests[q.prereq].s !== 'done')) return info(p, 'Erledige zuerst die vorherige Aufgabe.');
  if (p.quests[qid]) return;
  p.quests[qid] = { n: 0, s: 'active' };
  info(p, `📜 Quest angenommen: „${q.name}" – ${q.desc}`);
  dirtyPrivate.add(p.id);
}

function questComplete(p, qid) {
  const q = QUESTS[qid];
  const state = p.quests[qid];
  if (!q || !state || state.s !== 'active' || state.n < q.count || p.dead) return;
  if (!nearNpcById(p, q.npc)) return info(p, 'Geh näher zum Questgeber.');
  state.s = 'done';
  p.gold += q.reward.gold;
  const rewards = [`${q.reward.gold} Gold`];
  if (q.reward.item) {
    p.inv.items.push(q.reward.item);
    rewards.push(ITEMS[q.reward.item].name);
  }
  info(p, `🏆 Quest „${q.name}" abgeschlossen! Belohnung: ${rewards.join(', ')}`);
  events.push({ t: 'fx', kind: 'buff', at: [p.x, p.y], style: 'atk' });
  giveXp(p, q.reward.xp);
  // Schaltet diese Quest ein Outfit frei?
  for (const o of OUTFITS) {
    if (o.unlock.quest === qid && !p.outfits.includes(o.id)) {
      p.outfits.push(o.id);
      info(p, `🎽 Neues Outfit freigeschaltet: „${o.name}"! (Charakter-Menü, Taste C)`);
    }
  }
  dirtyPrivate.add(p.id);
}

// ---------------- Chat (mit Zauberspruch-Erkennung) ----------------
const WORDS_TO_SPELL = {};
for (const [id, s] of Object.entries(SPELLS)) WORDS_TO_SPELL[s.words] = id;

function chat(p, text) {
  if (typeof text !== 'string') return;
  text = text.trim().slice(0, 200);
  if (!text) return;
  const now = Date.now();
  if (now - p.lastChat < 500) return;
  p.lastChat = now;
  io.emit('chat', { id: p.id, from: p.name, text });
  // Zauberspruch gesprochen? (wie in Tibia)
  const spellId = WORDS_TO_SPELL[text.toLowerCase()];
  if (spellId && VOCATIONS[p.vocation].spells.includes(spellId)) {
    castSpell(p, spellId);
  }
}

// ---------------- Monster-KI ----------------
function getMonsterVictim(id) {
  return players.get(id) || pets.get(id) || null;
}

// Schlaue Zielwahl: nah dran zählt, aber wer das Monster verletzt hat,
// wird gejagt (Rache!), und angeschlagene Ziele sind bevorzugte Beute.
function pickMonsterTarget(m, def) {
  let best = null, bestScore = Infinity;
  const consider = (v) => {
    if (v.dead || inTown(v.x, v.y)) return;
    const d = cheb(m, v);
    const attacked = m.damageBy[v.ownerId || v.id];
    const range = attacked ? def.aggro * 2 : def.aggro;
    if (d > range) return;
    let score = d;
    if (attacked) score -= 4;                 // Rache am Angreifer
    score += (v.hp / v.maxHp) * 2;            // Schwache zuerst
    if (v.id === m.targetId) score -= 1.5;    // nicht ständig wechseln
    if (score < bestScore) { bestScore = score; best = v; }
  };
  for (const p of players.values()) consider(p);
  for (const pet of pets.values()) consider(pet);
  return best;
}

// Kurze Wegfindung (BFS im Fenster um das Monster): führt um Felsen,
// Bäume und Mauern herum, statt stumpf dagegen zu laufen.
const PATH_R = 12;
function findMonsterPath(m, target) {
  const R = PATH_R;
  const x0 = m.x - R, y0 = m.y - R;
  const W = R * 2 + 1;
  const wi = (x, y) => (y - y0) * W + (x - x0);
  const inWin = (x, y) => x >= x0 && y >= y0 && x < x0 + W && y < y0 + W;
  const visited = new Uint8Array(W * W);
  const parent = new Int32Array(W * W).fill(-1);
  const qx = [m.x], qy = [m.y];
  visited[wi(m.x, m.y)] = 1;
  let head = 0, goal = -1;
  let best = -1, bestD = cheb(m, target);
  while (head < qx.length) {
    const x = qx[head], y = qy[head]; head++;
    const d = Math.max(Math.abs(x - target.x), Math.abs(y - target.y));
    if (d <= 1) { goal = wi(x, y); break; }
    if (d < bestD) { bestD = d; best = wi(x, y); }
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (!inWin(nx, ny)) continue;
      const ni = wi(nx, ny);
      if (visited[ni]) continue;
      visited[ni] = 1;
      if (!monsterCanStep(nx, ny)) continue;
      if (dx && dy && (!isWalkable(world, x + dx, y) || !isWalkable(world, x, y + dy))) continue;
      parent[ni] = wi(x, y);
      qx.push(nx); qy.push(ny);
    }
  }
  const end = goal !== -1 ? goal : best;
  if (end === -1) return null;
  const start = wi(m.x, m.y);
  const path = [];
  let cur = end;
  while (cur !== start && cur !== -1) {
    path.push([x0 + (cur % W), y0 + Math.floor(cur / W)]);
    cur = parent[cur];
  }
  path.reverse();
  return path.length ? path : null;
}

// Ein Schrittversuch Richtung Ziel: erst gierig (billig), dann per Pfad
function monsterStepToward(m, target, def, now) {
  const dx = Math.sign(target.x - m.x), dy = Math.sign(target.y - m.y);
  const cand = [];
  if (dx && dy && isWalkable(world, m.x + dx, m.y) && isWalkable(world, m.x, m.y + dy)) cand.push([dx, dy]);
  if (Math.abs(target.x - m.x) >= Math.abs(target.y - m.y)) cand.push([dx, 0], [0, dy]);
  else cand.push([0, dy], [dx, 0]);
  for (const [cx, cy] of cand) {
    if (!(cx || cy) || !monsterCanStep(m.x + cx, m.y + cy)) continue;
    // Nur gierig laufen, wenn es dem Ziel wirklich näher kommt
    const nd = Math.max(Math.abs(target.x - (m.x + cx)), Math.abs(target.y - (m.y + cy)));
    if (nd >= cheb(m, target)) continue;
    m.lastMove = now + (cx && cy ? def.moveMs * 0.45 : 0);
    m.path = null;
    place(m, m.x + cx, m.y + cy);
    return true;
  }
  // Gierig blockiert → Pfad um das Hindernis suchen
  if (m.pathGoal && cheb(m.pathGoal, target) > 3) m.path = null; // Ziel ist weitergezogen
  if ((!m.path || !m.path.length) && now >= m.nextPathAt) {
    m.nextPathAt = now + 900;
    m.path = findMonsterPath(m, target);
    m.pathGoal = { x: target.x, y: target.y };
  }
  if (m.path && m.path.length) {
    const [nx, ny] = m.path[0];
    const sx = nx - m.x, sy = ny - m.y;
    const validStep = Math.abs(sx) <= 1 && Math.abs(sy) <= 1 && (sx || sy)
      && monsterCanStep(nx, ny)
      && !(sx && sy && (!isWalkable(world, m.x + sx, m.y) || !isWalkable(world, m.x, m.y + sy)));
    if (validStep) {
      m.path.shift();
      m.lastMove = now + (sx && sy ? def.moveMs * 0.45 : 0);
      place(m, nx, ny);
      return true;
    }
    m.path = null;
  }
  return false;
}

function monsterAI(m, now) {
  const def = MONSTERS[m.type];

  let target = m.targetId ? getMonsterVictim(m.targetId) : null;
  if (target && (target.dead || cheb(m, target) > def.aggro * 2 + 4 || inTown(target.x, target.y))) {
    m.targetId = null; m.path = null; m.blockedSince = 0; target = null;
  }
  // Regelmäßig neu bewerten: Rache, Nähe, angeschlagene Ziele
  if (now >= m.retargetAt) {
    m.retargetAt = now + 1500 + Math.random() * 1000;
    const cand = pickMonsterTarget(m, def);
    if (cand && cand.id !== m.targetId) { m.targetId = cand.id; m.path = null; m.blockedSince = 0; target = cand; }
    else if (cand) target = cand;
  }

  // Feiglinge fliehen bei wenig Leben
  if (target && def.flee && m.hp < m.maxHp * 0.25) {
    if (now - m.lastMove > def.moveMs) {
      const dx = Math.sign(m.x - target.x), dy = Math.sign(m.y - target.y);
      for (const [cx, cy] of [[dx, dy], [dx, 0], [0, dy], [-dy, dx]]) {
        if ((cx || cy) && monsterCanStep(m.x + cx, m.y + cy)) {
          m.lastMove = now;
          place(m, m.x + cx, m.y + cy);
          break;
        }
      }
    }
    return;
  }

  if (target) {
    const isPet = !!target.ownerId;
    const d = cheb(m, target);
    if (def.ranged && d > 1 && d <= def.ranged.range && now - m.lastRanged > def.ranged.ms) {
      m.lastRanged = now;
      m.lastCombatAt = now;
      m.blockedSince = 0;
      events.push({ t: 'fx', kind: 'flam', from: [m.x, m.y], to: [target.x, target.y] });
      const raw = def.ranged.dmg * (0.6 + Math.random() * 0.4);
      if (isPet) damagePet(target, Math.max(1, Math.round(raw)), m);
      else applyDamageToPlayer(target, raw, m);
      return;
    }
    // Kluge Fernkämpfer halten Abstand
    if (def.kite && d <= 2 && now - m.lastMove > def.moveMs) {
      const dx = Math.sign(m.x - target.x), dy = Math.sign(m.y - target.y);
      for (const [cx, cy] of [[dx, dy], [dx, 0], [0, dy], [-dy, dx]]) {
        if ((cx || cy) && monsterCanStep(m.x + cx, m.y + cy)) {
          m.lastMove = now;
          place(m, m.x + cx, m.y + cy);
          return;
        }
      }
    }
    if (d <= 1) {
      m.blockedSince = 0;
      if (now - m.lastAtk > def.atkMs) {
        m.lastAtk = now;
        m.lastCombatAt = now;
        const raw = def.dmg * (0.5 + Math.random() * 0.5);
        if (isPet) damagePet(target, Math.max(1, Math.round(raw)), m);
        else applyDamageToPlayer(target, raw, m);
      }
      return;
    }
    if (now - m.lastMove > def.moveMs) {
      const stepped = monsterStepToward(m, target, def, now);
      if (stepped) {
        m.blockedSince = 0;
      } else {
        if (!m.blockedSince) m.blockedSince = now;
        // Unerreichbar (z. B. hinter Felsen beschossen) und lange kein
        // Kampfkontakt? Dann gibt das Monster auf und heilt sich voll –
        // gefahrloses Abschießen aus sicherer Distanz lohnt sich nicht.
        if (now - m.blockedSince > 8000 && now - m.lastCombatAt > 6000) {
          m.targetId = null;
          m.path = null;
          m.blockedSince = 0;
          if (m.hp < m.maxHp) {
            m.hp = m.maxHp;
            m.damageBy = {};
            dirtyHp.set(m.id, [m.hp, m.maxHp]);
          }
        }
      }
    }
    return;
  }

  const homeD = Math.hypot(m.x - m.home.x, m.y - m.home.y);
  if (homeD > (m.home.r || 8) + 6 && now - m.lastMove > def.moveMs) {
    if (!monsterStepToward(m, m.home, def, now)) m.lastMove = now;
    return;
  }

  // Freies Streunen: Monster wandern durch ihr Revier
  if (now - m.lastMove > def.moveMs * 3 && Math.random() < 0.3) {
    const [dx, dy] = DIRS8[randInt(0, 7)];
    if (monsterCanStep(m.x + dx, m.y + dy)
        && !(dx && dy && (!isWalkable(world, m.x + dx, m.y) || !isWalkable(world, m.x, m.y + dy)))) {
      m.lastMove = now;
      place(m, m.x + dx, m.y + dy);
    }
  }
}

// ---------------- Tier-KI ----------------
// Das Tier sucht sich SELBST ein Ziel: es unterstützt das Ziel seines
// Besitzers, verteidigt sich und den Besitzer gegen angreifende Monster
// und schlägt aggressive Monster in der Nähe – ohne dass man es lenkt.
function petAcquireTarget(pet, owner, now) {
  // Aktuelles Ziel behalten, solange gültig und in Reichweite
  if (pet.targetId) {
    const cur = monsters.get(pet.targetId) || players.get(pet.targetId) || pets.get(pet.targetId);
    if (cur && !cur.dead && !inTown(cur.x, cur.y) && cheb(pet, cur) <= 11) return pet.targetId;
    pet.targetId = null;
  }
  if (now < pet.retargetAt) return null;
  pet.retargetAt = now + 400;
  if (owner.dead || inTown(pet.x, pet.y)) return null;

  // 1. Das aktive Ziel des Besitzers unterstützen (auch feindl. Spieler/Tier)
  if (owner.targetId) {
    const om = monsters.get(owner.targetId);
    const oe = players.get(owner.targetId);
    const op = pets.get(owner.targetId);
    if (om && !om.dead && !inTown(om.x, om.y)) { pet.targetId = om.id; return om.id; }
    if (oe && !oe.dead && oe.id !== owner.id && !inTown(oe.x, oe.y)) { pet.targetId = oe.id; return oe.id; }
    if (op && op.ownerId !== owner.id && !inTown(op.x, op.y)) { pet.targetId = op.id; return op.id; }
  }

  // 2. Selbstständig: bevorzugt Monster, die Besitzer oder Tier angreifen,
  //    sonst ein aggressives Monster nahe beim Besitzer
  let best = null, bestScore = Infinity;
  for (const m of monsters.values()) {
    if (m.dead || inTown(m.x, m.y)) continue;
    const dPet = cheb(pet, m);
    if (dPet > 12) continue;
    const threatens = m.targetId === owner.id || pet.ownerId === (m.targetId && pets.get(m.targetId) ? pets.get(m.targetId).ownerId : null);
    const dOwner = cheb(owner, m);
    if (!threatens && dOwner > 8) continue; // sonst nur im Umkreis des Besitzers
    const score = dPet - (threatens ? 100 : 0);
    if (score < bestScore) { bestScore = score; best = m; }
  }
  if (best) { pet.targetId = best.id; return best.id; }
  return null;
}

function petAI(pet, now) {
  const owner = players.get(pet.ownerId);
  if (!owner) { removePet(pet); return; }

  const targetId = petAcquireTarget(pet, owner, now);
  let tgt = null, kind = null;
  if (targetId) {
    const m = monsters.get(targetId);
    const enemy = players.get(targetId);
    const enemyPet = pets.get(targetId);
    if (m && !m.dead) { tgt = m; kind = 'monster'; }
    else if (enemy && !enemy.dead && !inTown(enemy.x, enemy.y) && !inTown(pet.x, pet.y)) { tgt = enemy; kind = 'player'; }
    else if (enemyPet && enemyPet.ownerId !== owner.id && !inTown(enemyPet.x, enemyPet.y) && !inTown(pet.x, pet.y)) { tgt = enemyPet; kind = 'pet'; }
  }

  if (tgt) {
    const d = cheb(pet, tgt);
    if (d <= 1) {
      if (now - pet.lastAtk > 1300) {
        pet.lastAtk = now;
        const stats = petStats(pet.type, pet.level);
        let dmg = stats.dmg * (0.6 + Math.random() * 0.5);
        if (pet.buffUntil > now) dmg *= 1.5;
        dmg = Math.max(1, Math.round(dmg));
        events.push({ t: 'fx', kind: 'slash', from: [pet.x, pet.y], to: [tgt.x, tgt.y] });
        if (kind === 'monster') {
          damageMonster(tgt, dmg, owner, 'melee', pet.id);
        } else if (kind === 'player') {
          applyDamageToPlayer(tgt, dmg, owner);
          markSkull(owner); // Tier-Angriff zählt als PvP des Besitzers
        } else {
          damagePet(tgt, dmg, owner);
          markSkull(owner);
        }
      }
      return;
    }
    if (now - pet.lastMove > 400) {
      const dx = Math.sign(tgt.x - pet.x), dy = Math.sign(tgt.y - pet.y);
      const cand = Math.abs(tgt.x - pet.x) >= Math.abs(tgt.y - pet.y)
        ? [[dx, dy], [dx, 0], [0, dy]] : [[dx, dy], [0, dy], [dx, 0]];
      for (const [cx, cy] of cand) {
        if ((cx || cy) && isWalkable(world, pet.x + cx, pet.y + cy)) {
          pet.lastMove = now;
          placePet(pet, pet.x + cx, pet.y + cy);
          break;
        }
      }
    }
    return;
  }

  const d = cheb(pet, owner);
  if (d > 12) { placePet(pet, owner.x, owner.y); return; }
  if (d > 2 && now - pet.lastMove > 350) {
    const dx = Math.sign(owner.x - pet.x), dy = Math.sign(owner.y - pet.y);
    const cand = [[dx, dy], [dx, 0], [0, dy]];
    for (const [cx, cy] of cand) {
      if ((cx || cy) && isWalkable(world, pet.x + cx, pet.y + cy)) {
        pet.lastMove = now;
        placePet(pet, pet.x + cx, pet.y + cy);
        break;
      }
    }
  }
}

// ---------------- Auto-Angriff (auch PvP) ----------------
function playerAutoAttack(p, now) {
  if (p.dead || !p.targetId) return;
  const voc = VOCATIONS[p.vocation];
  const m = monsters.get(p.targetId);
  const enemy = players.get(p.targetId);
  const enemyPet = pets.get(p.targetId);

  if (m && !m.dead) {
    const d = cheb(p, m);
    if (d > voc.range) return;
    if (blockedBySafeZone(p, true)) return;
    if (now - p.lastAtk < BASE_ATK_MS) return;
    p.lastAtk = now;
    events.push({ t: 'fx', kind: d > 1 ? voc.atkFx : 'slash', from: [p.x, p.y], to: [m.x, m.y] });
    damageMonster(m, meleeDamage(p), p, 'melee');
    trainSkill(p, 'atk', 1);
  } else if (enemy && !enemy.dead) {
    // PvP: nur außerhalb der Städte, Angreifer bekommt Totenkopf
    if (inTown(p.x, p.y) || inTown(enemy.x, enemy.y)) return;
    const d = cheb(p, enemy);
    if (d > voc.range) return;
    if (now - p.lastAtk < BASE_ATK_MS) return;
    p.lastAtk = now;
    events.push({ t: 'fx', kind: d > 1 ? voc.atkFx : 'slash', from: [p.x, p.y], to: [enemy.x, enemy.y] });
    applyDamageToPlayer(enemy, meleeDamage(p), p);
    trainSkill(p, 'atk', 1);
    markSkull(p);
  } else if (enemyPet && enemyPet.ownerId !== p.id) {
    // Gegnerisches Tier angreifen = ebenfalls PvP
    if (inTown(p.x, p.y) || inTown(enemyPet.x, enemyPet.y)) return;
    const d = cheb(p, enemyPet);
    if (d > voc.range) return;
    if (now - p.lastAtk < BASE_ATK_MS) return;
    p.lastAtk = now;
    events.push({ t: 'fx', kind: d > 1 ? voc.atkFx : 'slash', from: [p.x, p.y], to: [enemyPet.x, enemyPet.y] });
    damagePet(enemyPet, meleeDamage(p), p);
    trainSkill(p, 'atk', 1);
    markSkull(p);
  } else {
    p.targetId = null;
  }
}

// ---------------- Spieltakt ----------------
let tickCount = 0;

function tick() {
  const now = Date.now();
  tickCount++;

  for (const m of monsters.values()) {
    if (m.dead) {
      if (now >= m.respawnAt) {
        const def = MONSTERS[m.type];
        const pos = findFreeNear(m.home.x, m.home.y, m.home.r, m.home.rMin || 0, true);
        if (pos) {
          m.dead = false; m.hp = def.hp;
          m.shiny = !def.boss && Math.random() < SHINY_CHANCE; // beim Respawn neu würfeln
          m.damageBy = {};
          m.path = null; m.blockedSince = 0; m.lastCombatAt = 0; m.retargetAt = 0;
          m.x = pos.x; m.y = pos.y;
          occ.set(key(m.x, m.y), m.id);
          events.push({ t: 'spawn', monster: publicMonster(m) });
        }
      }
      continue;
    }
    monsterAI(m, now);
  }

  for (const pet of pets.values()) petAI(pet, now);
  for (const p of players.values()) playerAutoAttack(p, now);

  // Bosse prüfen/spawnen (alle ~3 Sekunden)
  if (tickCount % 20 === 0) updateBosses(now);

  // Verfallene Leichen entfernen
  if (tickCount % 10 === 0) {
    for (const c of corpses.values()) {
      if (now > c.expires) {
        corpses.delete(c.id);
        events.push({ t: 'corpseGone', id: c.id });
      }
    }
  }

  // Regeneration + Hunger alle 3 Sekunden
  if (tickCount % 20 === 0) {
    for (const p of players.values()) {
      if (p.dead) continue;
      let changed = false;
      const hadFood = p.food > 0;
      p.food = Math.max(0, p.food - 3);
      if (hadFood !== (p.food > 0)) changed = true;
      const mult = p.food > 0 ? 1 : 0.25; // hungrig = kaum Regeneration
      if (p.hp < p.maxHp) {
        let heal = Math.round((3 + p.level * 0.5) * (p.vocation === 'knight' ? 1.6 : 1) * mult);
        if (p.buffs.regen > now) heal += Math.round(6 + p.level * 1.2); // Utura
        p.hp = Math.min(p.maxHp, p.hp + heal);
        dirtyHp.set(p.id, [p.hp, p.maxHp]);
        changed = true;
      }
      if (p.mp < p.maxMp) {
        p.mp = Math.min(p.maxMp, p.mp + Math.round((4 + p.level * 0.8) * (p.vocation === 'sorcerer' ? 1.5 : 1) * mult));
        changed = true;
      }
      // Ablaufende Buffs an den Client melden
      for (const b of ['atk', 'def', 'speed', 'light', 'regen']) {
        if (p.buffs[b] && p.buffs[b] <= now) { p.buffs[b] = 0; changed = true; }
      }
      // Totenkopf abgelaufen?
      if (p.skullUntil && p.skullUntil <= now) {
        p.skullUntil = 0;
        events.push({ t: 'skull', id: p.id, on: false });
        info(p, 'Dein Totenkopf ist verschwunden – die Städte lassen dich wieder rein.');
        changed = true;
      }
      if (tickCount % 100 === 0) changed = true; // Hunger-Anzeige aktuell halten
      if (changed) dirtyPrivate.add(p.id);
    }
    for (const pet of pets.values()) {
      if (pet.hp < pet.maxHp) {
        pet.hp = Math.min(pet.maxHp, pet.hp + Math.round(3 + pet.level));
        dirtyHp.set(pet.id, [pet.hp, pet.maxHp]);
      }
    }
  }

  if (dirtyMoves.size || dirtyHp.size || events.length) {
    io.emit('tick', {
      m: [...dirtyMoves.entries()].map(([id, [x, y]]) => [id, x, y]),
      hp: [...dirtyHp.entries()].map(([id, [hp, maxHp]]) => [id, hp, maxHp]),
      ev: events,
    });
  }
  for (const id of dirtyPrivate) {
    const p = players.get(id);
    if (p) p.socket.emit('you', privatePlayer(p));
  }
  dirtyMoves = new Map();
  dirtyHp = new Map();
  events = [];
  dirtyPrivate = new Set();
}

// ---------------- Konten-Speicherung (Datei oder Cloud) ----------------
let accounts = {};
let saving = false;

async function saveAccounts() {
  for (const p of players.values()) {
    const acc = accounts[p.accountKey];
    if (acc) acc.save = saveData(p);
  }
  if (saving) return; // nicht doppelt gleichzeitig speichern
  saving = true;
  try {
    await storage.save(accounts);
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e.message);
  } finally {
    saving = false;
  }
}

function start(ioServer) {
  io = ioServer;
  initMonsters();
  initBosses();
  setInterval(tick, TICK_MS);
  console.log(`Welt bereit: ${monsters.size} Monster, ${world.towns.length} Städte, Karte ${world.size}x${world.size}`);
  console.log(storage.cloud ? '☁ Speicher-Modus: Cloud (Upstash)' : '💾 Speicher-Modus: lokale Datei');
  // Spielstände laden – Logins warten bis dahin
  storage.load()
    .then((data) => {
      accounts = data;
      module.exports.accounts = accounts;
      module.exports.accountsReady = true;
      setInterval(saveAccounts, 60000);
      console.log(`Spielstände geladen: ${Object.keys(accounts).length} Konten.`);
    })
    .catch((e) => {
      console.error('Spielstände konnten nicht geladen werden:', e.message);
      // Notbetrieb ohne Persistenz, damit der Server nicht tot ist
      module.exports.accountsReady = true;
    });
}

module.exports = {
  world, players, monsters, pets, corpses, accounts,
  accountsReady: false,
  start, saveAccounts, createPlayer, removePlayer, respawnPlayer,
  publicPlayer, privatePlayer, publicMonster, publicPet, publicCorpse, saveData,
  tryMove, setTarget, castSpell, usePotion, buyItem, sellItem,
  equipItem, unequipItem, useItem, lootCorpse, mountToggle,
  dismissPet, petStash, petDeploy, petRelease, renamePet, chat, questAccept, questComplete,
  selectMount, selectOutfit, unlockAll,
  // für Tests:
  updateBosses, titanWindowOpen, bossStates, worldBoss,
};
