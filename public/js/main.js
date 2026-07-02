// ---------------------------------------------------------------
// Kiria Online 3D – Hauptmodul (v6)
// Netzwerk, Rendering mit Bloom, drehbare Kamera (Q/E),
// 8-Richtungs-Steuerung (diagonal!), Wegfindung, Quests,
// Tiere, NPC-Dialoge und die Spielschleife.
// ---------------------------------------------------------------
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { World3D } from './world3d.js';
import { Entity, OUTFITS } from './entities.js';
import * as fx from './effects.js';
import * as ui from './ui.js';

const socket = io();

const MONSTER_MOVE_MS = {
  rat: 650, snake: 700, spider: 480, wolf: 450, orc: 550, troll: 620,
  skeleton: 600, ghost: 480, zombie: 780, hunter: 520, bear: 560,
  ghoul: 520, orc_berserker: 480, banshee: 480, werewolf: 400,
  minotaur: 520, cyclops: 620, wyrm: 500, dragon: 520, demon: 540,
};

const FX_COLORS = {
  flam: 0xff7722, vis: 0x88ccff, san: 0xffee88,
  zap: 0xbb77ff, leaf: 0x77cc44, spear: 0xcccccc,
};

const VIEW_RADIUS = 42; // Entities weiter weg werden ausgeblendet

let renderer, composer, scene, camera, world;
let defs = null;
let selfId = null;
let you = null;
const entities = new Map();
const npcData = new Map();

const keys = new Set();
let nextMoveAt = 0;
let pathQueue = [];
let lastPathCalc = 0;
let targetId = null;
let selectRing = null;
let zoom = 0.8;
let camYaw = 0, camYawTarget = 0;
const predicted = [];
let lastFrame = performance.now();
let lastMini = 0;
let isDead = false;

// ================= LOGIN =================
const $ = (id) => document.getElementById(id);
let chosenVoc = 'knight';
let chosenOutfit = 0;

for (const el of document.querySelectorAll('.voc')) {
  el.addEventListener('click', () => {
    document.querySelectorAll('.voc').forEach((v) => v.classList.remove('sel'));
    el.classList.add('sel');
    chosenVoc = el.dataset.voc;
  });
}

const skinRow = $('skinRow');
OUTFITS.forEach((color, i) => {
  const el = document.createElement('div');
  el.className = 'skin' + (i === 0 ? ' sel' : '');
  el.style.background = '#' + color.toString(16).padStart(6, '0');
  el.addEventListener('click', () => {
    document.querySelectorAll('.skin').forEach((s) => s.classList.remove('sel'));
    el.classList.add('sel');
    chosenOutfit = i;
  });
  skinRow.appendChild(el);
});

function tryLogin() {
  const name = $('nameInput').value.trim();
  const pw = $('pwInput').value;
  $('loginErr').textContent = '';
  $('playBtn').disabled = true;
  socket.emit('login', { name, password: pw, vocation: chosenVoc, outfit: chosenOutfit });
  setTimeout(() => { $('playBtn').disabled = false; }, 1500);
}

$('playBtn').addEventListener('click', tryLogin);
$('pwInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('pwInput').focus(); });

socket.on('loginError', (d) => {
  $('playBtn').disabled = false;
  $('loginErr').textContent = d.msg;
});

socket.on('disconnect', () => {
  if (selfId) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#e8c165;font-family:Georgia,serif;font-size:22px;text-align:center">Verbindung zum Server verloren.<br><br><a href="" style="color:#fff">Neu verbinden</a></div>';
  }
});

// ================= SPIELSTART =================
socket.on('welcome', (data) => {
  selfId = data.id;
  defs = data.defs;
  you = data.you;

  $('login').style.display = 'none';

  initThree();
  world = new World3D(scene, data.world);
  world.ensureChunks(you.x, you.y);
  fx.initEffects(scene);
  ui.initMinimap(world);

  ui.initUI(defs, {
    say: (text) => socket.emit('say', { text }),
    cast: (spell) => socket.emit('cast', { spell }),
    potion: (kind) => socket.emit('potion', { kind }),
    buy: (item) => socket.emit('buy', { item }),
    sell: (index) => socket.emit('sell', { index }),
    equip: (index) => socket.emit('equip', { index }),
    unequip: (slot) => socket.emit('unequip', { slot }),
    dismissPet: () => socket.emit('dismissPet'),
    outfit: () => socket.emit('outfit', { outfit: ((you.outfit || 0) + 1) % OUTFITS.length }),
    respawn: () => socket.emit('respawn'),
    questAccept: (id) => socket.emit('questAccept', { id }),
    questComplete: (id) => socket.emit('questComplete', { id }),
  }, you.vocation);
  ui.setYou(you);

  addEntity(data.you, 'player');
  for (const p of data.players) addEntity(p, 'player');
  for (const m of data.monsters) addEntity(m, 'monster');
  for (const pet of data.pets) addEntity(pet, 'pet');
  for (const n of data.world.npcs) {
    npcData.set(n.id, n);
    addEntity({ ...n, hp: 1, maxHp: 1 }, 'npc');
  }
  updateNpcMarks();
  updateVisibility();

  ui.chatMsg('⚔ Kiria', `Willkommen, ${you.name}! Sprich mit den Stadtbewohnern – das gelbe ! bedeutet: neue Quest!`, 'sys');

  initInput();
  requestAnimationFrame(loop);

  window.KIRIA = { entities, npcData, camera, self: () => entities.get(selfId) };
});

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  $('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 250);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.55, 0.85);
  composer.addPass(bloom);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ================= ENTITIES =================
function addEntity(data, kind) {
  removeEntity(data.id);
  const e = new Entity(data, kind, world);
  if (kind === 'monster') e.moveMs = MONSTER_MOVE_MS[data.type] || 550;
  if (kind === 'pet') e.moveMs = 400;
  entities.set(data.id, e);
  scene.add(e.group);
  return e;
}

function removeEntity(id) {
  const e = entities.get(id);
  if (!e) return;
  scene.remove(e.group);
  entities.delete(id);
  if (targetId === id) clearTarget();
}

function entityBlockedAt(x, y, ignoreId) {
  for (const e of entities.values()) {
    if (e.id === ignoreId || e.dead || e.kind === 'npc' || e.kind === 'pet') continue;
    if (e.tx === x && e.ty === y) return true;
  }
  return false;
}

const self = () => entities.get(selfId);

// Nur Figuren in Sichtweite rendern (wichtig bei 500+ Monstern)
function updateVisibility() {
  const me = self();
  if (!me) return;
  for (const e of entities.values()) {
    if (e.id === selfId) { e.group.visible = true; continue; }
    const d = Math.max(Math.abs(e.tx - me.tx), Math.abs(e.ty - me.ty));
    e.group.visible = !e.dead && d <= VIEW_RADIUS;
  }
}

// Quest-Markierungen (!/✓) über den NPCs aktualisieren
function updateNpcMarks() {
  for (const [id] of npcData) {
    const e = entities.get(id);
    if (!e) continue;
    const mark = ui.npcQuestMark(id);
    e.setMark(mark, mark === '✓' ? '#7ee87a' : '#ffd700');
  }
}

// ================= NETZWERK-EREIGNISSE =================
socket.on('playerJoined', (p) => addEntity(p, 'player'));
socket.on('playerLeft', (d) => removeEntity(d.id));

socket.on('you', (y) => {
  you = y;
  ui.setYou(y);
  const e = self();
  if (e) e.setHp(y.hp, y.maxHp);
  updateNpcMarks();
});

socket.on('chat', (d) => {
  if (d.id === 'system') {
    ui.chatMsg(d.from, d.text, 'sys');
    const m = d.text.match(/\((\d+) online\)/);
    if (m) ui.setOnlineCount(parseInt(m[1], 10));
  } else {
    ui.chatMsg(d.from, d.text);
    const e = entities.get(d.id);
    if (e && d.id !== selfId) fx.floatText(d.text.slice(0, 26), e.group.position, '#cfe8ff', 0.8);
  }
});

socket.on('info', (d) => {
  ui.chatMsg('', d.msg, 'info');
  if (d.msg.includes('erbeutet')) fx.sfx.coin();
  if (d.msg.includes('Quest')) fx.sfx.heal();
});

socket.on('tick', (data) => {
  for (const [id, x, y] of data.m) {
    const e = entities.get(id);
    if (!e) continue;
    if (id === selfId) {
      const match = (e.tx === x && e.ty === y) || predicted.some(([px, py]) => px === x && py === y);
      if (!match) { e.snapTo(x, y); pathQueue = []; }
    } else {
      e.walkTo(x, y, e.kind === 'monster' || e.kind === 'pet' ? e.moveMs : 300);
    }
  }
  for (const [id, hp, maxHp] of data.hp) {
    const e = entities.get(id);
    if (e) e.setHp(hp, maxHp);
    if (id === targetId && e) ui.setTargetDisplay(e);
  }
  for (const ev of data.ev) handleEvent(ev);
});

function handleEvent(ev) {
  const e = ev.id ? entities.get(ev.id) : null;

  switch (ev.t) {
    case 'dmg': {
      if (!e || !e.group.visible) break;
      const color = ev.kind === 'fire' ? '#ff9922' : ev.id === selfId ? '#ff4433' : '#ffdd44';
      fx.floatText('-' + ev.amount, e.group.position, color);
      if (ev.id === selfId) fx.sfx.hurt();
      break;
    }
    case 'heal': {
      if (!e || !ev.amount || !e.group.visible) break;
      fx.floatText('+' + ev.amount, e.group.position, '#66ee66');
      fx.burst(e.group.position.clone(), 0x55ee55, 12, 1.4);
      if (ev.id === selfId) fx.sfx.heal();
      break;
    }
    case 'die': {
      if (!e) break;
      e.dead = true;
      if (e.group.visible) fx.burst(e.group.position.clone(), 0x882222, 18);
      if (ev.id === selfId) {
        isDead = true;
        ui.showDeath(true);
        fx.sfx.die();
        clearTarget();
        pathQueue = [];
      } else {
        if (e.group.visible) fx.sfx.hit();
        if (e.kind === 'monster' || e.kind === 'pet') {
          const dead = e;
          setTimeout(() => { if (entities.get(dead.id) === dead && dead.dead) removeEntity(dead.id); }, 700);
        } else {
          e.group.visible = false;
        }
        if (ev.id === targetId) clearTarget();
      }
      break;
    }
    case 'respawn': {
      if (ev.id === selfId) { isDead = false; ui.showDeath(false); }
      if (e) { e.dead = false; e.group.visible = true; }
      break;
    }
    case 'spawn': addEntity(ev.monster, 'monster'); break;
    case 'pet': addEntity(ev.pet, 'pet'); break;
    case 'outfit': {
      if (e) e.setOutfit(ev.outfit);
      if (ev.id === selfId && you) you.outfit = ev.outfit;
      break;
    }
    case 'levelup': {
      if (!e) break;
      if (e.group.visible) {
        fx.ring(e.group.position.clone(), 0xffd700, 2.2, 700);
        fx.burst(e.group.position.clone(), 0xffd700, 30, 2);
      }
      if (e.kind === 'pet') e.setLevel(ev.level);
      if (ev.id === selfId) fx.sfx.level();
      break;
    }
    case 'pos': {
      if (e) e.snapTo(ev.x, ev.y);
      if (ev.id === selfId) pathQueue = [];
      break;
    }
    case 'fx': {
      const me = self();
      const near = (p) => me && Math.max(Math.abs(p[0] - me.tx), Math.abs(p[1] - me.ty)) <= VIEW_RADIUS;
      const anchor = ev.at || ev.from;
      if (!near(anchor)) break;
      const v = (p) => new THREE.Vector3(p[0], world.groundY(p[0], p[1]) + 0.4, p[1]);
      const k = ev.kind;
      if (FX_COLORS[k] !== undefined) {
        fx.projectile(v(ev.from), v(ev.to), {
          color: FX_COLORS[k],
          size: k === 'spear' ? 0.09 : 0.16,
          dur: k === 'spear' ? 180 : 260,
        });
        if (k === 'flam' || k === 'vis') fx.sfx.fire(); else fx.sfx.hit();
      } else if (k === 'slash') {
        fx.burst(v(ev.to), 0xffffff, 8, 1.6);
        fx.sfx.hit();
      } else if (k === 'exori') {
        fx.ring(v(ev.at), 0xdddddd, 1.5, 350);
        fx.sfx.hit();
      } else if (k === 'nova') {
        const color = ev.style === 'san' ? 0xffee66 : 0xff6600;
        fx.ring(v(ev.at), color, (ev.radius || 3) + 0.6, 600);
        fx.burst(v(ev.at), color, 40, 3.4);
        fx.sfx.fire();
      } else if (k === 'buff') {
        fx.ring(v(ev.at), ev.style === 'def' ? 0x66aaff : 0xffcc44, 1.4, 500);
        fx.sfx.heal();
      } else if (k === 'tame') {
        fx.ring(v(ev.at), 0xff88aa, 1.8, 600);
        fx.burst(v(ev.at), 0xff88aa, 26, 2);
        fx.sfx.level();
      }
      break;
    }
  }
}

// ================= ZIEL / KAMPF =================
function setTarget(id) {
  clearTarget();
  const e = entities.get(id);
  if (!e || e.kind !== 'monster' || e.dead) return;
  targetId = id;
  socket.emit('setTarget', { id });
  ui.setTargetDisplay(e);
  selectRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3322, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  selectRing.rotation.x = -Math.PI / 2;
  selectRing.position.y = 0.06;
  e.group.add(selectRing);
}

function clearTarget() {
  if (selectRing && selectRing.parent) selectRing.parent.remove(selectRing);
  selectRing = null;
  if (targetId) socket.emit('setTarget', null);
  targetId = null;
  ui.setTargetDisplay(null);
}

// ================= EINGABE =================
const KEYMAP = {
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0], arrowright: [1, 0],
};

// Bildschirmrichtung → Weltrichtung, gerundet auf 8 Richtungen
function remapDir8(dx, dy) {
  const c = Math.cos(camYawTarget), s = Math.sin(camYawTarget);
  const wx = dx * c + dy * s;
  const wy = -dx * s + dy * c;
  const a = Math.atan2(wy, wx);
  const a8 = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
  return [Math.round(Math.cos(a8)), Math.round(Math.sin(a8))];
}

function initInput() {
  window.addEventListener('keydown', (e) => {
    if (ui.isTyping()) return;
    const k = e.key.toLowerCase();
    if (k === 'enter') { ui.focusChat(); e.preventDefault(); return; }
    if (k === 'i') { ui.toggleInventory(); return; }
    if (k === 'l') { ui.toggleQuestLog(); return; }
    if (k === 'm') { fx.toggleMute(); ui.chatMsg('', 'Sound umgeschaltet.', 'info'); return; }
    if (k === 'q') { camYawTarget += Math.PI / 4; return; }
    if (k === 'e') { camYawTarget -= Math.PI / 4; return; }
    if (k === 'escape') { clearTarget(); ui.closeShop(); ui.closeDialog(); return; }
    if (['1', '2', '3', '4', '5', '6', '7'].includes(k)) { ui.activateSlotByKey(k); return; }
    if (KEYMAP[k]) { keys.add(k); pathQueue = []; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('wheel', (e) => {
    zoom = Math.max(0.5, Math.min(2.1, zoom + e.deltaY * 0.001));
  }, { passive: true });

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hits = ray.intersectObjects(scene.children, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.entityId && o.parent) o = o.parent;
      if (o && o.userData.entityId) {
        const ent = entities.get(o.userData.entityId);
        if (!ent || ent.dead || !ent.group.visible) continue;
        if (ent.kind === 'monster') { setTarget(ent.id); return; }
        if (ent.kind === 'npc') {
          const me = self();
          const d = Math.max(Math.abs(me.tx - ent.tx), Math.abs(me.ty - ent.ty));
          const npc = npcData.get(ent.id);
          if (d <= 4 && npc) ui.openDialog(npc);
          else {
            ui.chatMsg('', 'Geh näher heran, um zu reden.', 'info');
            walkTowards(ent.tx, ent.ty + 1);
          }
          return;
        }
        continue;
      }
      if (h.object.name === 'ground') {
        const tx = Math.round(h.point.x), ty = Math.round(h.point.z);
        walkTowards(tx, ty);
        return;
      }
    }
  });
}

// ================= WEGFINDUNG (BFS, 8 Richtungen) =================
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function findPath(sx, sy, tx, ty, allowDest = false) {
  const S = world.size;
  if (tx < 0 || ty < 0 || tx >= S || ty >= S) return null;
  if (!allowDest && !world.isWalkable(tx, ty)) return null;

  const blocked = new Set();
  for (const e of entities.values()) {
    if (e.id === selfId || e.dead || e.kind === 'npc' || e.kind === 'pet') continue;
    blocked.add(e.tx + ',' + e.ty);
  }

  const visited = new Uint8Array(S * S);
  const parent = new Int32Array(S * S).fill(-1);
  const qx = [sx], qy = [sy];
  visited[sy * S + sx] = 1;
  let head = 0, found = false, expanded = 0;

  while (head < qx.length && expanded < 30000) {
    const x = qx[head], y = qy[head]; head++; expanded++;
    if (x === tx && y === ty) { found = true; break; }
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
      const ni = ny * S + nx;
      if (visited[ni]) continue;
      const isDest = nx === tx && ny === ty;
      if (!world.isWalkable(nx, ny) && !(isDest && allowDest)) continue;
      // diagonal nicht durch blockierte Ecken
      if (dx && dy && (!world.isWalkable(x + dx, y) || !world.isWalkable(x, y + dy))) continue;
      if (blocked.has(nx + ',' + ny) && !isDest) continue;
      visited[ni] = 1;
      parent[ni] = y * S + x;
      qx.push(nx); qy.push(ny);
    }
  }
  if (!found) return null;
  const path = [];
  let cur = ty * S + tx;
  while (cur !== sy * S + sx && cur !== -1) {
    path.push([cur % S, Math.floor(cur / S)]);
    cur = parent[cur];
  }
  path.reverse();
  return path;
}

function walkTowards(tx, ty) {
  const me = self();
  if (!me) return;
  const p = findPath(me.tx, me.ty, tx, ty);
  if (p) pathQueue = p;
}

// ================= BEWEGUNG =================
function doStep(dx, dy, now) {
  const me = self();
  const nx = me.tx + dx, ny = me.ty + dy;
  me.faceToward(nx, ny);
  const diag = dx !== 0 && dy !== 0;
  if (diag && (!world.isWalkable(me.tx + dx, me.ty) || !world.isWalkable(me.tx, me.ty + dy))) return false;
  if (!world.isWalkable(nx, ny) || entityBlockedAt(nx, ny, selfId)) return false;
  socket.emit('move', { dx, dy });
  const dur = (you.speed || 300);
  me.walkTo(nx, ny, dur);
  predicted.push([nx, ny]);
  if (predicted.length > 5) predicted.shift();
  nextMoveAt = now + dur * (diag ? 1.45 : 1);
  fx.sfx.step();
  return true;
}

function processMovement(now) {
  const me = self();
  if (!me || isDead || ui.isTyping()) return;
  if (now < nextMoveAt) return;

  // Tastatur: gedrückte Richtungen kombinieren (diagonal möglich)
  if (keys.size) {
    let dx = 0, dy = 0;
    for (const k of keys) {
      const d = KEYMAP[k];
      if (d) { dx += d[0]; dy += d[1]; }
    }
    dx = Math.sign(dx); dy = Math.sign(dy);
    if (dx || dy) {
      const [wx, wy] = remapDir8(dx, dy);
      doStep(wx, wy, now);
      return;
    }
  }

  // Ziel automatisch verfolgen (Fernkämpfer bleiben auf Distanz)
  const t = targetId ? entities.get(targetId) : null;
  if (t && !t.dead) {
    const range = defs.VOCATIONS[you.vocation].range;
    const d = Math.max(Math.abs(me.tx - t.tx), Math.abs(me.ty - t.ty));
    if (d <= range) { me.faceToward(t.tx, t.ty); pathQueue = []; }
    else if (now - lastPathCalc > 450) {
      lastPathCalc = now;
      const p = findPath(me.tx, me.ty, t.tx, t.ty, true);
      if (p && p.length > 1) pathQueue = p.slice(0, -1);
    }
  }

  if (pathQueue.length) {
    const [nx, ny] = pathQueue[0];
    const dx = nx - me.tx, dy = ny - me.ty;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (!dx && !dy)) { pathQueue = []; return; }
    if (doStep(dx, dy, now)) pathQueue.shift();
    else {
      const dest = pathQueue[pathQueue.length - 1];
      const p = findPath(me.tx, me.ty, dest[0], dest[1]);
      pathQueue = p || [];
    }
  }
}

// ================= SPIELSCHLEIFE =================
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  processMovement(now);

  for (const e of entities.values()) e.update(now, dt);

  const me = self();
  if (me) {
    world.update(dt, me.group.position);

    camYaw += (camYawTarget - camYaw) * Math.min(1, dt * 6);
    const dist = 10 * zoom;
    camPos.set(
      me.group.position.x + Math.sin(camYaw) * dist * 0.62,
      me.group.position.y + dist * 1.3,
      me.group.position.z + Math.cos(camYaw) * dist * 0.62,
    );
    camera.position.lerp(camPos, Math.min(1, dt * 7));
    camLook.copy(me.group.position).add(new THREE.Vector3(0, 0.6, 0));
    camera.lookAt(camLook);

    if (now - lastMini > 250) {
      lastMini = now;
      updateVisibility();
      ui.updateMinimap(entities, selfId);
      let n = 0;
      for (const e of entities.values()) if (e.kind === 'player') n++;
      ui.setOnlineCount(n);
    }
  }

  fx.updateEffects(now, dt);
  ui.updateHotbar(now);
  composer.render();
}
