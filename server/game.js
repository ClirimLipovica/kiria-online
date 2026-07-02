// ---------------------------------------------------------------
// Kiria Online 3D – Spiellogik (v7)
// PvP (außerhalb der Städte), Zauber per Chat, Support-Zauber
// (Tempo/Licht), Leichen-Loot per Klick, Essen/Hunger, Mounts,
// Tier-Stall des Bestienzüchters, Berufs-Ausrüstung.
// ---------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const {
  MONSTERS, ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS, SHOP_ITEMS, QUESTS,
  MOUNT_SPEED, HASTE_SPEED, FOOD_MAX, SKULL_MS, xpForLevel, petXpForLevel,
} = require('./constants');
const { generateWorld, isWalkable } = require('./world');

const TICK_MS = 150;
const BASE_ATK_MS = 2000;
const MAP_VERSION = 4;
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
    lastMove: 0, lastAtk: 0, lastRanged: 0,
    dead: false, respawnAt: 0,
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
  return { id: m.id, type: m.type, name: MONSTERS[m.type].name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp };
}

// ---------------- Tiere (Bestienzüchter) ----------------
function petStats(type, level) {
  const def = MONSTERS[type];
  return {
    maxHp: Math.round(def.hp * 1.6 * (1 + 0.12 * (level - 1))),
    dmg: def.dmg * 1.2 * (1 + 0.10 * (level - 1)),
  };
}

function createPet(owner, type, level = 1, xp = 0, silent = false) {
  const stats = petStats(type, level);
  const pos = findFreeNear(owner.x, owner.y, 3) || { x: owner.x, y: owner.y };
  const pet = {
    id: 'p' + (nextPetId++),
    type, level, xp,
    name: MONSTERS[type].name,
    x: pos.x, y: pos.y,
    hp: stats.maxHp, maxHp: stats.maxHp,
    ownerId: owner.id, ownerName: owner.name,
    lastMove: 0, lastAtk: 0, buffUntil: 0,
  };
  pets.set(pet.id, pet);
  owner.pet = pet;
  if (!silent) events.push({ t: 'pet', pet: publicPet(pet) });
  dirtyPrivate.add(owner.id);
  return pet;
}

function publicPet(p) {
  return {
    id: p.id, type: p.type, name: p.name, level: p.level,
    x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
    ownerId: p.ownerId, ownerName: p.ownerName,
  };
}

function removePet(pet, deathEvent = true) {
  pets.delete(pet.id);
  const owner = players.get(pet.ownerId);
  if (owner && owner.pet === pet) { owner.pet = null; dirtyPrivate.add(owner.id); }
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

// Stall: aktives Tier deponieren
function petStash(p) {
  if (!p.pet) return info(p, 'Du hast kein aktives Tier.');
  if (p.petStable.length >= STABLE_MAX) return info(p, `Dein Stall ist voll (max. ${STABLE_MAX}).`);
  p.petStable.push({ type: p.pet.type, level: p.pet.level, xp: p.pet.xp });
  info(p, `${p.pet.name} wurde im Stall deponiert.`);
  removePet(p.pet);
  dirtyPrivate.add(p.id);
}

// Stall: Tier einsetzen
function petDeploy(p, index) {
  const entry = p.petStable[index];
  if (!entry) return;
  if (p.pet) return info(p, 'Du hast schon ein aktives Tier. Deponiere es zuerst.');
  p.petStable.splice(index, 1);
  createPet(p, entry.type, entry.level, entry.xp);
  info(p, `${MONSTERS[entry.type].name} (Stufe ${entry.level}) ist wieder an deiner Seite!`);
  dirtyPrivate.add(p.id);
}

function petRelease(p, index) {
  const entry = p.petStable[index];
  if (!entry) return;
  p.petStable.splice(index, 1);
  info(p, `Du entlässt ${MONSTERS[entry.type].name} in die Freiheit.`);
  dirtyPrivate.add(p.id);
}

function dismissPet(p) {
  if (!p.pet) return;
  info(p, `Du entlässt deinen ${p.pet.name} in die Freiheit.`);
  removePet(p.pet);
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
    buffs: {
      atk: Math.max(0, p.buffs.atk - now), def: Math.max(0, p.buffs.def - now),
      speed: Math.max(0, p.buffs.speed - now), light: Math.max(0, p.buffs.light - now),
    },
    skullMs: Math.max(0, p.skullUntil - now),
    torchLight: !!(p.eq.shield && ITEMS[p.eq.shield].light),
    pet: p.pet ? {
      type: p.pet.type, name: p.pet.name, level: p.pet.level,
      hp: p.pet.hp, maxHp: p.pet.maxHp, xp: p.pet.xp, xpNext: petXpForLevel(p.pet.level + 1),
    } : null,
    petStable: p.petStable,
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
    outfit: account.outfit,
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
    buffs: { atk: 0, def: 0, speed: 0, light: 0 },
    skullUntil: 0, skullMsgAt: 0,
    pet: null,
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
  players.set(p.id, p);
  occ.set(key(p.x, p.y), p.id);
  if (save && save.pet && account.vocation === 'tamer') {
    createPet(p, save.pet.type, save.pet.level, save.pet.xp || 0, true);
  }
  return p;
}

function saveData(p) {
  return {
    mapV: MAP_VERSION,
    x: p.x, y: p.y, level: p.level, xp: p.xp, gold: p.gold, food: p.food,
    hp: p.hp, mp: p.mp, inv: p.inv, eq: p.eq, quests: p.quests,
    mounts: p.mounts, petStable: p.petStable,
    pet: p.pet ? { type: p.pet.type, level: p.pet.level, xp: p.pet.xp } : null,
  };
}

function removePlayer(p) {
  removeFromMap(p);
  if (p.pet) removePet(p.pet);
  players.delete(p.id);
  for (const m of monsters.values()) if (m.targetId === p.id) m.targetId = null;
  for (const o of players.values()) if (o.targetId === p.id) o.targetId = null;
}

// ---------------- Kampfformeln ----------------
function meleeBase(p) {
  const voc = VOCATIONS[p.vocation];
  const wAtk = p.eq.weapon ? ITEMS[p.eq.weapon].atk : 0;
  let base = (12 + p.level * 1.8 + wAtk * 1.4) * voc.melee;
  if (p.buffs.atk > Date.now()) base *= 1.4;
  return base;
}

function armorDef(p) {
  let def = Math.floor(p.level * 0.3);
  for (const slot of ['armor', 'legs', 'helmet', 'shield', 'boots']) {
    if (p.eq[slot]) def += ITEMS[p.eq[slot]].def || 0;
  }
  return def;
}

function meleeDamage(p) {
  return Math.max(1, Math.round(meleeBase(p) * (0.5 + Math.random() * 0.5)));
}

function spellDamage(p, base, perLvl) {
  const voc = VOCATIONS[p.vocation];
  return Math.max(1, Math.round((base + p.level * perLvl) * voc.spell * (0.85 + Math.random() * 0.3)));
}

// Roh-Schaden auf Spieler anwenden (Rüstung + Schutzzauber)
function applyDamageToPlayer(target, raw, source) {
  let dmg = Math.max(1, Math.round(raw * (50 / (50 + armorDef(target)))));
  if (target.buffs.def > Date.now()) dmg = Math.max(1, Math.round(dmg * 0.6));
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
  if (p.pet) placePet(p.pet, spawn.x, spawn.y);
}

function damageMonster(m, dmg, attacker, kind, aggroId) {
  if (m.dead) return;
  m.hp = Math.max(0, m.hp - dmg);
  dirtyHp.set(m.id, [m.hp, m.maxHp]);
  events.push({ t: 'dmg', id: m.id, amount: dmg, kind: kind || 'melee' });
  if (!m.targetId) m.targetId = aggroId || attacker.id;
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

  if (killer && players.has(killer.id)) {
    giveXp(killer, def.xp);
    if (killer.pet) givePetXp(killer.pet, def.xp);
    for (const [qid, state] of Object.entries(killer.quests)) {
      const q = QUESTS[qid];
      if (!q || state.s !== 'active' || q.target !== m.type || state.n >= q.count) continue;
      state.n++;
      if (state.n >= q.count) info(killer, `📜 Quest „${q.name}" erfüllt! Kehre zum Questgeber zurück.`);
      else info(killer, `📜 ${q.name}: ${state.n}/${q.count}`);
    }
    dirtyPrivate.add(killer.id);
  }
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

// ---------------- Aktionen ----------------
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

function setOutfit(p, outfit) {
  outfit = Math.abs(parseInt(outfit, 10) || 0) % 12;
  p.outfit = outfit;
  const acc = accounts[p.accountKey];
  if (acc) acc.outfit = outfit;
  events.push({ t: 'outfit', id: p.id, outfit });
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
    info(p, `🐎 Du kannst jetzt ${name} reiten! (Taste R oder Inventar)`);
    events.push({ t: 'fx', kind: 'tame', at: [p.x, p.y] });
    dirtyPrivate.add(p.id);
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
    const heal = Math.round((30 + p.level * 5) * spell.power * voc.spell);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    events.push({ t: 'heal', id: p.id, amount: heal });
    dirtyHp.set(p.id, [p.hp, p.maxHp]);

  } else if (spell.kind === 'missile') {
    const m = monsters.get(p.targetId);
    const enemy = players.get(p.targetId);
    const enemyPet = pets.get(p.targetId);
    if (m && !m.dead) {
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

  } else if (spell.kind === 'aoe1') {
    let hit = 0;
    for (const m of monsters.values()) {
      if (!m.dead && cheb(p, m) <= 1) {
        damageMonster(m, Math.round(meleeDamage(p) * spell.power), p, 'melee');
        hit++;
      }
    }
    events.push({ t: 'fx', kind: 'exori', at: [p.x, p.y] });
    if (!hit) info(p, 'Kein Monster in Reichweite.');

  } else if (spell.kind === 'nova') {
    events.push({ t: 'fx', kind: 'nova', at: [p.x, p.y], style: spell.fx, radius: spell.radius });
    for (const m of monsters.values()) {
      if (!m.dead && cheb(p, m) <= spell.radius) {
        damageMonster(m, spellDamage(p, spell.base, spell.perLvl), p, 'fire');
      }
    }

  } else if (spell.kind === 'buff') {
    p.buffs[spell.buff] = now + spell.dur;
    events.push({ t: 'fx', kind: 'buff', at: [p.x, p.y], style: spell.buff });
    const msgs = { atk: '⚔ Dein Angriff ist verstärkt!', def: '🛡 Du bist geschützt!', speed: '💨 Du fühlst dich schnell wie der Wind!' };
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
    if (p.pet) return info(p, 'Du hast schon ein aktives Tier. Deponiere es im Stall (Inventar).');
    if (cheb(p, m) > spell.range) return info(p, 'Geh näher heran.');
    const hpPct = m.hp / m.maxHp;
    if (hpPct > 0.6) return info(p, 'Das Tier ist noch zu stark – schwäche es unter 60% Leben!');
    const chance = 0.35 + 0.6 * ((0.6 - hpPct) / 0.6);
    if (Math.random() < chance) {
      m.dead = true;
      m.targetId = null;
      m.respawnAt = now + 30000 + Math.random() * 20000;
      removeFromMap(m);
      events.push({ t: 'die', id: m.id });
      const pet = createPet(p, m.type);
      events.push({ t: 'fx', kind: 'tame', at: [pet.x, pet.y] });
      info(p, `🐾 Du hast eine ${def.name} gezähmt! Sie kämpft jetzt für dich.`);
      p.targetId = null;
    } else {
      info(p, `${def.name} hat sich losgerissen! Versuch es nochmal.`);
    }

  } else if (spell.kind === 'petheal') {
    if (!p.pet) return info(p, 'Du hast kein Tier.');
    const heal = Math.round((30 + p.level * 5) * spell.power);
    p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + heal);
    events.push({ t: 'heal', id: p.pet.id, amount: heal });
    dirtyHp.set(p.pet.id, [p.pet.hp, p.pet.maxHp]);
    dirtyPrivate.add(p.id);

  } else if (spell.kind === 'petbuff') {
    if (!p.pet) return info(p, 'Du hast kein Tier.');
    p.pet.buffUntil = now + spell.dur;
    events.push({ t: 'fx', kind: 'buff', at: [p.pet.x, p.pet.y], style: 'atk' });
    info(p, `🐾 Dein ${p.pet.name} ist wild entschlossen!`);
  }

  p.mp -= spell.mana;
  p.spellCds[spellId] = now + spell.cd;
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

function monsterAI(m, now) {
  const def = MONSTERS[m.type];

  let target = m.targetId ? getMonsterVictim(m.targetId) : null;
  if (target && (target.dead || cheb(m, target) > def.aggro * 2 || inTown(target.x, target.y))) {
    m.targetId = null; target = null;
  }
  if (!target) {
    let best = null, bestD = def.aggro + 1;
    for (const p of players.values()) {
      if (p.dead || inTown(p.x, p.y)) continue;
      const d = cheb(m, p);
      if (d < bestD) { best = p; bestD = d; }
    }
    for (const pet of pets.values()) {
      if (inTown(pet.x, pet.y)) continue;
      const d = cheb(m, pet);
      if (d < bestD) { best = pet; bestD = d; }
    }
    if (best) { m.targetId = best.id; target = best; }
  }

  if (target) {
    const isPet = !!target.ownerId;
    const d = cheb(m, target);
    if (def.ranged && d > 1 && d <= def.ranged.range && now - m.lastRanged > def.ranged.ms) {
      m.lastRanged = now;
      events.push({ t: 'fx', kind: 'flam', from: [m.x, m.y], to: [target.x, target.y] });
      const raw = def.ranged.dmg * (0.6 + Math.random() * 0.4);
      if (isPet) damagePet(target, Math.max(1, Math.round(raw)), m);
      else applyDamageToPlayer(target, raw, m);
      return;
    }
    if (d <= 1) {
      if (now - m.lastAtk > def.atkMs) {
        m.lastAtk = now;
        const raw = def.dmg * (0.5 + Math.random() * 0.5);
        if (isPet) damagePet(target, Math.max(1, Math.round(raw)), m);
        else applyDamageToPlayer(target, raw, m);
      }
      return;
    }
    if (now - m.lastMove > def.moveMs) {
      const dx = Math.sign(target.x - m.x), dy = Math.sign(target.y - m.y);
      const cand = [];
      if (dx && dy && isWalkable(world, m.x + dx, m.y) && isWalkable(world, m.x, m.y + dy)) cand.push([dx, dy]);
      if (Math.abs(target.x - m.x) >= Math.abs(target.y - m.y)) cand.push([dx, 0], [0, dy], [0, -dy], [-dx, 0]);
      else cand.push([0, dy], [dx, 0], [-dx, 0], [0, -dy]);
      for (const [cx, cy] of cand) {
        if ((cx || cy) && monsterCanStep(m.x + cx, m.y + cy)) {
          m.lastMove = now + (cx && cy ? def.moveMs * 0.45 : 0);
          place(m, m.x + cx, m.y + cy);
          break;
        }
      }
    }
    return;
  }

  const homeD = Math.hypot(m.x - m.home.x, m.y - m.home.y);
  if (homeD > (m.home.r || 8) + 6 && now - m.lastMove > def.moveMs) {
    const dx = Math.sign(m.home.x - m.x), dy = Math.sign(m.home.y - m.y);
    if (dx && monsterCanStep(m.x + dx, m.y)) { m.lastMove = now; place(m, m.x + dx, m.y); }
    else if (dy && monsterCanStep(m.x, m.y + dy)) { m.lastMove = now; place(m, m.x, m.y + dy); }
    return;
  }

  if (now - m.lastMove > def.moveMs * 3 && Math.random() < 0.25) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [dx, dy] = dirs[randInt(0, 3)];
    if (monsterCanStep(m.x + dx, m.y + dy)) { m.lastMove = now; place(m, m.x + dx, m.y + dy); }
  }
}

// ---------------- Tier-KI ----------------
function petAI(pet, now) {
  const owner = players.get(pet.ownerId);
  if (!owner) { removePet(pet); return; }

  // Ziel des Besitzers: Monster, feindlicher Spieler (PvP!) oder dessen Tier
  let tgt = null, kind = null;
  if (owner.targetId && !owner.dead) {
    const m = monsters.get(owner.targetId);
    const enemy = players.get(owner.targetId);
    const enemyPet = pets.get(owner.targetId);
    if (m && !m.dead) { tgt = m; kind = 'monster'; }
    else if (enemy && !enemy.dead && !inTown(enemy.x, enemy.y) && !inTown(pet.x, pet.y)) { tgt = enemy; kind = 'player'; }
    else if (enemyPet && enemyPet.ownerId !== owner.id && !inTown(enemyPet.x, enemyPet.y) && !inTown(pet.x, pet.y)) { tgt = enemyPet; kind = 'pet'; }
  }

  if (tgt) {
    const d = cheb(pet, tgt);
    if (d <= 1) {
      if (now - pet.lastAtk > 1500) {
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
    if (now - p.lastAtk < BASE_ATK_MS) return;
    p.lastAtk = now;
    events.push({ t: 'fx', kind: d > 1 ? voc.atkFx : 'slash', from: [p.x, p.y], to: [m.x, m.y] });
    damageMonster(m, meleeDamage(p), p, 'melee');
  } else if (enemy && !enemy.dead) {
    // PvP: nur außerhalb der Städte, Angreifer bekommt Totenkopf
    if (inTown(p.x, p.y) || inTown(enemy.x, enemy.y)) return;
    const d = cheb(p, enemy);
    if (d > voc.range) return;
    if (now - p.lastAtk < BASE_ATK_MS) return;
    p.lastAtk = now;
    events.push({ t: 'fx', kind: d > 1 ? voc.atkFx : 'slash', from: [p.x, p.y], to: [enemy.x, enemy.y] });
    applyDamageToPlayer(enemy, meleeDamage(p), p);
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
        p.hp = Math.min(p.maxHp, p.hp + Math.round((3 + p.level * 0.5) * (p.vocation === 'knight' ? 1.6 : 1) * mult));
        dirtyHp.set(p.id, [p.hp, p.maxHp]);
        changed = true;
      }
      if (p.mp < p.maxMp) {
        p.mp = Math.min(p.maxMp, p.mp + Math.round((4 + p.level * 0.8) * (p.vocation === 'sorcerer' ? 1.5 : 1) * mult));
        changed = true;
      }
      // Ablaufende Buffs an den Client melden
      for (const b of ['atk', 'def', 'speed', 'light']) {
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

// ---------------- Konten-Speicherung ----------------
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
let accounts = {};

function loadAccounts() {
  try {
    accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  } catch { accounts = {}; }
  module.exports.accounts = accounts;
}

function saveAccounts() {
  for (const p of players.values()) {
    const acc = accounts[p.accountKey];
    if (acc) acc.save = saveData(p);
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 1));
  } catch (e) { console.error('Speichern fehlgeschlagen:', e.message); }
}

function start(ioServer) {
  io = ioServer;
  loadAccounts();
  initMonsters();
  setInterval(tick, TICK_MS);
  setInterval(saveAccounts, 60000);
  console.log(`Welt bereit: ${monsters.size} Monster, ${world.towns.length} Städte, Karte ${world.size}x${world.size}`);
}

module.exports = {
  world, players, monsters, pets, corpses, accounts,
  start, saveAccounts, createPlayer, removePlayer, respawnPlayer,
  publicPlayer, privatePlayer, publicMonster, publicPet, publicCorpse, saveData,
  tryMove, setTarget, setOutfit, castSpell, usePotion, buyItem, sellItem,
  equipItem, unequipItem, useItem, lootCorpse, mountToggle,
  dismissPet, petStash, petDeploy, petRelease, chat, questAccept, questComplete,
};
