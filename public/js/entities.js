// ---------------------------------------------------------------
// Kiria Online 3D – Spielfiguren (v6)
// Schönere Helden (Umhänge, Roben, Berufs-Ausrüstung, 12 Skins),
// 20 Monstertypen, Tiere und NPCs – mit Animationen.
// Labels werden erst erzeugt, wenn die Figur sichtbar wird.
// ---------------------------------------------------------------
import * as THREE from 'three';

export const OUTFITS = [
  0xc23b3b, 0x3b6cc2, 0x2fae4e, 0xd8a93a, 0x8a3bc2, 0x2fb5b5,
  0xd8558e, 0xe8e4da, 0x37393f, 0xb05c22, 0x5c8a2a, 0x7a5230,
];

function box(w, h, d, colorOrMat) {
  const mat = colorOrMat instanceof THREE.Material
    ? colorOrMat
    : new THREE.MeshLambertMaterial({ color: colorOrMat });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

function limb(w, h, d, colorOrMat, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const part = box(w, h, d, colorOrMat);
  part.position.y = -h / 2;
  pivot.add(part);
  return pivot;
}

// ---------------- Menschen-Modell ----------------
function makeHumanoid(opts) {
  const {
    skin = 0xd8a878, shirt = 0x3b6cc2, legs = 0x4a3a2a, hat = null,
    scale = 1, oneEye = false, horns = false, hornsSide = false, wings = false,
    cape = false, robe = false, bowBack = false, staff = false, plume = false,
    shoulders = false, snout = null, earsUp = false, tail = false,
    armsForward = false, hunched = false, longArms = false, bird = false,
  } = opts;
  const g = new THREE.Group();
  const anim = {};
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const body = new THREE.Group(); // für gebückte Haltung
  g.add(body);

  anim.lLeg = limb(0.14, 0.34, 0.14, legs, -0.09, 0.34, 0);
  anim.rLeg = limb(0.14, 0.34, 0.14, legs, 0.09, 0.34, 0);
  g.add(anim.lLeg, anim.rLeg);

  const torso = box(0.34, 0.4, 0.2, shirtMat);
  torso.position.y = 0.54;
  body.add(torso);

  if (robe) {
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 8), shirtMat);
    skirt.position.y = 0.28;
    skirt.castShadow = true;
    body.add(skirt);
  }
  if (cape) {
    const capeMat = new THREE.MeshLambertMaterial({ color: shirt, side: THREE.DoubleSide });
    anim.cape = new THREE.Group();
    anim.cape.position.set(0, 0.74, -0.12);
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), capeMat);
    cp.position.y = -0.24;
    anim.cape.add(cp);
    body.add(anim.cape);
    anim.capeMat = capeMat;
  }
  if (shoulders) {
    const s1 = box(0.14, 0.08, 0.16, 0x9a9aa8);
    s1.position.set(-0.24, 0.76, 0);
    const s2 = s1.clone();
    s2.position.x = 0.24;
    body.add(s1, s2);
  }

  const armH = longArms ? 0.48 : 0.36;
  anim.lArm = limb(0.1, armH, 0.1, shirtMat, -0.23, 0.72, 0);
  anim.rArm = limb(0.1, armH, 0.1, shirtMat, 0.23, 0.72, 0);
  body.add(anim.lArm, anim.rArm);
  if (armsForward) { anim.lArm.rotation.x = -1.25; anim.rArm.rotation.x = -1.25; anim.zombie = true; }

  const head = box(0.24, 0.24, 0.22, skin);
  head.position.y = 0.88;
  body.add(head);

  if (snout) {
    const sn = box(0.12, 0.1, 0.14, snout);
    sn.position.set(0, 0.85, 0.16);
    body.add(sn);
  }
  if (earsUp) {
    const e1 = box(0.05, 0.1, 0.04, skin);
    e1.position.set(-0.09, 1.05, 0);
    const e2 = e1.clone(); e2.position.x = 0.09;
    body.add(e1, e2);
  }
  if (tail) {
    const t = box(0.06, 0.06, 0.3, skin);
    t.position.set(0, 0.42, -0.22);
    t.rotation.x = 0.6;
    g.add(t);
  }
  if (oneEye) {
    const eye = box(0.09, 0.09, 0.03, 0xffdd22);
    eye.position.set(0, 0.9, 0.12);
    body.add(eye);
  }
  if (horns) {
    const h1 = box(0.05, 0.16, 0.05, 0xe8e0d0);
    h1.position.set(-0.1, 1.08, 0);
    const h2 = h1.clone(); h2.position.x = 0.1;
    body.add(h1, h2);
  }
  if (hornsSide) {
    const h1 = box(0.18, 0.06, 0.06, 0xe8e0d0);
    h1.position.set(-0.2, 0.98, 0);
    h1.rotation.z = 0.5;
    const h2 = h1.clone(); h2.position.x = 0.2; h2.rotation.z = -0.5;
    body.add(h1, h2);
  }
  if (wings) {
    anim.lWing = limb(0.5, 0.04, 0.3, 0x33222a, -0.18, 0.72, -0.14);
    anim.lWing.children[0].position.set(-0.25, 0, 0);
    anim.rWing = limb(0.5, 0.04, 0.3, 0x33222a, 0.18, 0.72, -0.14);
    anim.rWing.children[0].position.set(0.25, 0, 0);
    body.add(anim.lWing, anim.rWing);
  }
  if (bowBack) {
    const bw = box(0.05, 0.55, 0.05, 0x6a4a26);
    bw.position.set(0, 0.6, -0.16);
    bw.rotation.z = 0.5;
    body.add(bw);
  }
  if (staff) {
    const st = box(0.05, 0.7, 0.05, 0x6a4a26);
    st.position.set(0.3, 0.5, 0.08);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x99ddff }),
    );
    orb.position.set(0.3, 0.88, 0.08);
    body.add(st, orb);
  }
  if (bird) {
    const b = box(0.09, 0.09, 0.11, 0xe8b53a);
    b.position.set(-0.26, 0.86, 0);
    const bk = box(0.03, 0.03, 0.05, 0xd86a2a);
    bk.position.set(-0.26, 0.86, 0.07);
    body.add(b, bk);
  }

  if (hat === 'helmet') {
    const h = box(0.27, 0.14, 0.25, 0x9a9aa8);
    h.position.y = 1.02;
    body.add(h);
    if (plume) {
      const p = box(0.05, 0.16, 0.14, 0xc23b3b);
      p.position.y = 1.14;
      body.add(p);
    }
  } else if (hat === 'wizard') {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 7), new THREE.MeshLambertMaterial({ color: 0x5a3baa }));
    h.position.y = 1.14; h.castShadow = true;
    body.add(h);
  } else if (hat === 'hood') {
    const h = box(0.28, 0.12, 0.26, 0x2a6e3a);
    h.position.y = 1.02;
    body.add(h);
  } else if (hat === 'feather') {
    const h = box(0.28, 0.1, 0.26, 0x6a4a2a);
    h.position.y = 1.01;
    const f = box(0.04, 0.18, 0.04, 0xe84a3a);
    f.position.set(0.12, 1.12, 0);
    body.add(h, f);
  } else if (!oneEye && !hornsSide && !snout && hat !== 'none') {
    const hair = box(0.26, 0.08, 0.24, 0x3a2a18);
    hair.position.y = 1.03;
    body.add(hair);
  }

  if (hunched) body.rotation.x = 0.35;

  g.scale.setScalar(scale);
  g.userData.anim = anim;
  g.userData.animType = 'biped';
  g.userData.outfitMat = shirtMat;
  return g;
}

// ---------------- Vierbeiner ----------------
function makeQuadruped({ color, scale = 1, tail = true, earColor = null }) {
  const g = new THREE.Group();
  const anim = {};
  const body = box(0.3 * scale, 0.22 * scale, 0.55 * scale, color);
  body.position.y = 0.28 * scale;
  g.add(body);
  const head = box(0.2 * scale, 0.18 * scale, 0.22 * scale, color);
  head.position.set(0, 0.36 * scale, 0.32 * scale);
  g.add(head);
  if (earColor !== null) {
    const e1 = box(0.05 * scale, 0.09 * scale, 0.03 * scale, earColor);
    e1.position.set(-0.06 * scale, 0.5 * scale, 0.3 * scale);
    const e2 = e1.clone(); e2.position.x = 0.06 * scale;
    g.add(e1, e2);
  }
  anim.legs = [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.2], [0.1, -0.2]].map(([lx, lz]) => {
    const l = limb(0.07 * scale, 0.18 * scale, 0.07 * scale, color, lx * scale, 0.18 * scale, lz * scale);
    g.add(l);
    return l;
  });
  if (tail) {
    const t = box(0.05 * scale, 0.05 * scale, 0.3 * scale, color);
    t.position.set(0, 0.32 * scale, -0.4 * scale);
    g.add(t);
  }
  g.userData.anim = anim;
  g.userData.animType = 'quad';
  return g;
}

// ---------------- Schlange ----------------
function makeSnake() {
  const g = new THREE.Group();
  const color = 0x4a9a3a;
  const b1 = box(0.16, 0.12, 0.5, color);
  b1.position.set(0, 0.07, -0.1);
  const b2 = box(0.14, 0.1, 0.3, 0x3a7a2e);
  b2.position.set(0.1, 0.06, -0.35);
  const head = box(0.18, 0.14, 0.2, color);
  head.position.set(0, 0.1, 0.2);
  const eye1 = box(0.03, 0.03, 0.03, 0xffdd00);
  eye1.position.set(-0.05, 0.14, 0.29);
  const eye2 = eye1.clone(); eye2.position.x = 0.05;
  g.add(b1, b2, head, eye1, eye2);
  g.userData.anim = {};
  g.userData.animType = 'snake';
  return g;
}

// ---------------- Spinne ----------------
function makeSpider() {
  const g = new THREE.Group();
  const anim = {};
  const body = box(0.34, 0.2, 0.4, 0x2a2a30);
  body.position.set(0, 0.26, -0.05);
  const head = box(0.2, 0.16, 0.18, 0x3a3a42);
  head.position.set(0, 0.24, 0.22);
  const e1 = box(0.04, 0.04, 0.03, 0xff3322);
  e1.position.set(-0.05, 0.28, 0.32);
  const e2 = e1.clone(); e2.position.x = 0.05;
  g.add(body, head, e1, e2);
  anim.legs = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const l = limb(0.035, 0.3, 0.035, 0x1e1e24, side * 0.2, 0.32, -0.18 + i * 0.12);
      l.rotation.z = side * 0.7;
      l.userData.baseZ = side * 0.7;
      g.add(l);
      anim.legs.push(l);
    }
  }
  g.userData.anim = anim;
  g.userData.animType = 'spider';
  return g;
}

// ---------------- Geist / Todesfee ----------------
function makeGhost(color = 0xd8e8f0, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), mat);
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
  head.position.y = 0.95;
  const e1 = box(0.05, 0.07, 0.03, 0x111122);
  e1.position.set(-0.07, 0.98, 0.17);
  const e2 = e1.clone(); e2.position.x = 0.07;
  g.add(body, head, e1, e2);
  g.scale.setScalar(scale);
  g.userData.anim = {};
  g.userData.animType = 'ghost';
  return g;
}

// ---------------- Drache ----------------
function makeDragon() {
  const g = new THREE.Group();
  const anim = {};
  const red = 0xa82818, dark = 0x781a10;
  const body = box(0.7, 0.55, 1.1, red);
  body.position.y = 0.65;
  const neck = box(0.3, 0.5, 0.3, red);
  neck.position.set(0, 1.05, 0.5);
  const head = box(0.4, 0.3, 0.55, red);
  head.position.set(0, 1.3, 0.75);
  g.add(body, neck, head);
  const eye1 = box(0.06, 0.06, 0.06, 0xffcc00);
  eye1.position.set(-0.14, 1.38, 0.95);
  const eye2 = eye1.clone(); eye2.position.x = 0.14;
  g.add(eye1, eye2);
  anim.lWing = limb(0.9, 0.06, 0.5, dark, -0.35, 0.95, -0.1);
  anim.lWing.children[0].position.set(-0.45, 0, 0);
  anim.rWing = limb(0.9, 0.06, 0.5, dark, 0.35, 0.95, -0.1);
  anim.rWing.children[0].position.set(0.45, 0, 0);
  g.add(anim.lWing, anim.rWing);
  const tail = box(0.18, 0.16, 0.8, dark);
  tail.position.set(0, 0.6, -0.85);
  g.add(tail);
  anim.legs = [[-0.25, 0.35], [0.25, 0.35], [-0.25, -0.35], [0.25, -0.35]].map(([lx, lz]) => {
    const l = limb(0.14, 0.35, 0.14, dark, lx, 0.38, lz);
    g.add(l);
    return l;
  });
  g.userData.anim = anim;
  g.userData.animType = 'dragon';
  return g;
}

// ---------------- Wyrm (Schlangendrache) ----------------
function makeWyrm() {
  const g = new THREE.Group();
  const anim = {};
  const teal = 0x2e8a72, dark = 0x1e6a56;
  const b1 = box(0.5, 0.4, 0.9, teal);
  b1.position.set(0, 0.45, 0);
  const b2 = box(0.4, 0.32, 0.6, dark);
  b2.position.set(0, 0.35, -0.7);
  const b3 = box(0.28, 0.22, 0.5, teal);
  b3.position.set(0, 0.28, -1.2);
  const neck = box(0.26, 0.5, 0.26, teal);
  neck.position.set(0, 0.85, 0.4);
  const head = box(0.34, 0.26, 0.5, dark);
  head.position.set(0, 1.1, 0.62);
  g.add(b1, b2, b3, neck, head);
  const eye1 = box(0.05, 0.05, 0.05, 0xffee44);
  eye1.position.set(-0.12, 1.17, 0.8);
  const eye2 = eye1.clone(); eye2.position.x = 0.12;
  g.add(eye1, eye2);
  anim.lWing = limb(0.6, 0.05, 0.35, dark, -0.25, 0.72, -0.1);
  anim.lWing.children[0].position.set(-0.3, 0, 0);
  anim.rWing = limb(0.6, 0.05, 0.35, dark, 0.25, 0.72, -0.1);
  anim.rWing.children[0].position.set(0.3, 0, 0);
  g.add(anim.lWing, anim.rWing);
  g.userData.anim = anim;
  g.userData.animType = 'wyrm';
  return g;
}

function makeMonsterVisual(type) {
  switch (type) {
    case 'rat':      return makeQuadruped({ color: 0x8a8078, scale: 0.55, earColor: 0xc0a8a0 });
    case 'snake':    return makeSnake();
    case 'spider':   return makeSpider();
    case 'wolf':     return makeQuadruped({ color: 0x5a5a62, scale: 1.0, earColor: 0x3a3a40 });
    case 'bear':     return makeQuadruped({ color: 0x6a4a2a, scale: 1.4, earColor: 0x4a3018, tail: false });
    case 'orc':      return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x4a3a28, legs: 0x33281c });
    case 'orc_berserker': return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x8a2626, legs: 0x33281c, scale: 1.15, hat: 'helmet' });
    case 'troll':    return makeHumanoid({ skin: 0x7a8a6a, shirt: 0x5a4a38, legs: 0x3a3028, scale: 1.3 });
    case 'skeleton': return makeHumanoid({ skin: 0xd8d8cc, shirt: 0xb8b8ac, legs: 0xa8a89c });
    case 'zombie':   return makeHumanoid({ skin: 0x84a06a, shirt: 0x4a4a38, legs: 0x3a3a30, armsForward: true, hat: 'none' });
    case 'ghoul':    return makeHumanoid({ skin: 0xb8c89a, shirt: 0x6a705a, legs: 0x4a5040, hunched: true, longArms: true, scale: 1.1, hat: 'none' });
    case 'hunter':   return makeHumanoid({ skin: 0xd8a878, shirt: 0x3a5a2e, legs: 0x4a3a2a, hat: 'hood', bowBack: true });
    case 'werewolf': return makeHumanoid({ skin: 0x5a5258, shirt: 0x4a4248, legs: 0x3a3238, scale: 1.25, snout: 0x3a3238, earsUp: true, tail: true, hunched: true, hat: 'none' });
    case 'minotaur': return makeHumanoid({ skin: 0x7a4e2a, shirt: 0x5a3a20, legs: 0x4a3018, scale: 1.7, snout: 0x9a6a42, hornsSide: true, hat: 'none' });
    case 'ghost':    return makeGhost();
    case 'banshee':  return makeGhost(0xc8b0e8, 1.25);
    case 'cyclops':  return makeHumanoid({ skin: 0xc09a6a, shirt: 0x6a5038, legs: 0x4a3828, scale: 1.6, oneEye: true, hat: 'none' });
    case 'wyrm':     return makeWyrm();
    case 'dragon':   return makeDragon();
    case 'demon':    return makeHumanoid({ skin: 0x8a2020, shirt: 0x5a1414, legs: 0x3a0e0e, scale: 1.5, horns: true, wings: true, hat: 'none' });
    default:         return makeQuadruped({ color: 0x999999, scale: 0.8 });
  }
}

function makePlayerVisual(vocation, outfit) {
  const shirt = OUTFITS[outfit % OUTFITS.length];
  if (vocation === 'knight')   return makeHumanoid({ shirt, hat: 'helmet', plume: true, shoulders: true, cape: true });
  if (vocation === 'sorcerer') return makeHumanoid({ shirt, hat: 'wizard', robe: true, staff: true });
  if (vocation === 'tamer')    return makeHumanoid({ shirt, hat: 'feather', cape: true, bird: true });
  return makeHumanoid({ shirt, hat: 'hood', cape: true, bowBack: true }); // Paladin
}

function makeNpcVisual() {
  return makeHumanoid({ shirt: 0xc2a43b, legs: 0x5a4328 });
}

// ---------------- Name + Lebensbalken (Sprite, lazy) ----------------
function makeLabel(showHp) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 72;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true,
  }));
  sprite.scale.set(1.75, 0.49, 1);
  sprite.renderOrder = 900;
  const draw = (name, color, hp, maxHp) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 72);
    ctx.font = 'bold 22px Verdana';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(name, 128, 28);
    ctx.fillStyle = color;
    ctx.fillText(name, 128, 28);
    if (showHp) {
      const pct = maxHp > 0 ? hp / maxHp : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(63, 38, 130, 13);
      ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#e8b53a' : '#d9453a';
      ctx.fillRect(65, 40, 126 * Math.max(0, pct), 9);
    }
    sprite.material.map.needsUpdate = true;
  };
  return { sprite, draw };
}

// ---------------- Entity ----------------
const TALL_TYPES = new Set(['dragon', 'demon', 'cyclops', 'minotaur', 'wyrm']);

export class Entity {
  constructor(data, kind, world) {
    this.id = data.id;
    this.kind = kind; // 'player' | 'monster' | 'npc' | 'pet'
    this.name = data.name;
    this.type = data.type || null;
    this.level = data.level || null;
    this.ownerName = data.ownerName || null;
    this.world = world;
    this.hp = data.hp ?? 1;
    this.maxHp = data.maxHp ?? 1;
    this.dead = false;
    this.label = null;
    this.markSprite = null;

    this.tx = data.x; this.ty = data.y;
    this.fx = data.x; this.fy = data.y;
    this.moveStart = 0; this.moveDur = 300;
    this.facing = Math.PI;
    this.walkPhase = 0;

    this.group = new THREE.Group();
    let visual;
    if (kind === 'player') {
      visual = makePlayerVisual(data.vocation, data.outfit || 0);
      this.labelColor = '#8fd18a';
    } else if (kind === 'npc') {
      visual = makeNpcVisual();
      this.labelColor = '#e8c165';
    } else if (kind === 'pet') {
      visual = makeMonsterVisual(data.type);
      this.labelColor = '#7ee8e0';
    } else {
      visual = makeMonsterVisual(data.type);
      this.labelColor = '#ff8a7a';
    }
    this.visual = visual;
    this.group.add(visual);
    this.labelY = TALL_TYPES.has(data.type) ? 2.2 : 1.5;

    this.group.traverse((o) => { o.userData.entityId = this.id; });
    const gy = world.groundY(data.x, data.y);
    this.group.position.set(data.x, gy, data.y);
  }

  displayName() {
    if (this.kind === 'pet') return `🐾${this.name} [${this.level}] – ${this.ownerName}`;
    return this.name;
  }

  ensureLabel() {
    if (this.label) return;
    this.label = makeLabel(this.kind !== 'npc');
    this.label.sprite.position.y = this.labelY;
    this.label.sprite.userData.entityId = this.id;
    this.group.add(this.label.sprite);
    this.redrawLabel();
  }

  redrawLabel() {
    if (this.label) this.label.draw(this.displayName(), this.labelColor, this.hp, this.maxHp);
  }

  // Quest-Markierung über NPCs: '!' (verfügbar) oder '✓' (abschließbar)
  setMark(txt, color = '#ffd700') {
    if (this.markSprite) {
      this.group.remove(this.markSprite);
      this.markSprite.material.map.dispose();
      this.markSprite.material.dispose();
      this.markSprite = null;
    }
    if (!txt) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 52px Georgia';
    ctx.textAlign = 'center';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(txt, 32, 50);
    ctx.fillStyle = color;
    ctx.fillText(txt, 32, 50);
    this.markSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true,
    }));
    this.markSprite.scale.set(0.5, 0.5, 1);
    this.markSprite.position.y = this.labelY + 0.5;
    this.markSprite.renderOrder = 920;
    this.group.add(this.markSprite);
  }

  setHp(hp, maxHp) {
    this.hp = hp;
    if (maxHp) this.maxHp = maxHp;
    this.redrawLabel();
  }

  setLevel(level) {
    this.level = level;
    this.redrawLabel();
  }

  setOutfit(outfit) {
    const mat = this.visual.userData.outfitMat;
    if (mat) mat.color.setHex(OUTFITS[outfit % OUTFITS.length]);
  }

  walkTo(x, y, dur) {
    if (x === this.tx && y === this.ty) return;
    this.fx = this.group.position.x; this.fy = this.group.position.z;
    const diag = x !== this.tx && y !== this.ty;
    this.tx = x; this.ty = y;
    this.moveStart = performance.now();
    this.moveDur = (dur || 300) * (diag ? 1.45 : 1);
    const dx = x - this.fx, dy = y - this.fy;
    if (dx || dy) this.targetFacing = Math.atan2(dx, dy);
  }

  snapTo(x, y) {
    this.tx = x; this.ty = y; this.fx = x; this.fy = y;
    this.group.position.x = x;
    this.group.position.z = y;
  }

  faceToward(x, y) {
    const dx = x - this.tx, dy = y - this.ty;
    if (dx || dy) this.targetFacing = Math.atan2(dx, dy);
  }

  update(now, dt) {
    // Weit entfernt / unsichtbar: nur Position setzen, keine Animation
    if (!this.group.visible) {
      this.group.position.set(this.tx, this.world.groundY(this.tx, this.ty), this.ty);
      this.fx = this.tx; this.fy = this.ty;
      return;
    }
    this.ensureLabel();

    const t = Math.min(1, (now - this.moveStart) / this.moveDur);
    const x = this.fx + (this.tx - this.fx) * t;
    const y = this.fy + (this.ty - this.fy) * t;
    this.group.position.x = x;
    this.group.position.z = y;
    const gy = this.world.groundY(Math.round(x), Math.round(y));
    this.group.position.y += (gy - this.group.position.y) * Math.min(1, dt * 14);

    const moving = t < 1;
    if (moving) this.walkPhase += dt * 11;

    if (this.targetFacing !== undefined) {
      let diff = this.targetFacing - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 12);
      this.visual.rotation.y = this.facing;
    }

    const a = this.visual.userData.anim;
    const type = this.visual.userData.animType;
    const swing = moving ? Math.sin(this.walkPhase) * 0.65 : 0;
    if (type === 'biped' && a.lArm) {
      if (a.zombie) {
        // Zombies schlurfen mit ausgestreckten Armen
        a.lArm.rotation.x = -1.25 + Math.sin(this.walkPhase) * 0.1;
        a.rArm.rotation.x = -1.25 - Math.sin(this.walkPhase) * 0.1;
      } else {
        a.lArm.rotation.x = swing;
        a.rArm.rotation.x = -swing;
      }
      a.lLeg.rotation.x = -swing;
      a.rLeg.rotation.x = swing;
      if (a.cape) a.cape.rotation.x = 0.15 + (moving ? Math.abs(Math.sin(this.walkPhase)) * 0.35 : Math.sin(now * 0.002) * 0.05);
      if (a.lWing) {
        const flap = Math.sin(now * 0.006) * 0.4;
        a.lWing.rotation.y = 0.5 + flap;
        a.rWing.rotation.y = -0.5 - flap;
      }
    } else if ((type === 'quad' || type === 'dragon') && a.legs) {
      a.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? swing : -swing); });
      if (type === 'dragon') {
        const flap = Math.sin(now * 0.004) * 0.5;
        a.lWing.rotation.z = 0.3 + flap;
        a.rWing.rotation.z = -0.3 - flap;
      }
    } else if (type === 'wyrm') {
      const flap = Math.sin(now * 0.005) * 0.45;
      a.lWing.rotation.z = 0.25 + flap;
      a.rWing.rotation.z = -0.25 - flap;
      this.visual.rotation.z = moving ? Math.sin(this.walkPhase) * 0.06 : 0;
    } else if (type === 'spider' && a.legs) {
      a.legs.forEach((l, i) => {
        l.rotation.x = moving ? Math.sin(this.walkPhase * 1.6 + i) * 0.35 : 0;
        l.rotation.z = l.userData.baseZ;
      });
    } else if (type === 'snake') {
      this.visual.rotation.z = moving ? Math.sin(this.walkPhase * 1.5) * 0.12 : 0;
    } else if (type === 'ghost') {
      this.visual.position.y = 0.15 + Math.sin(now * 0.0025 + this.walkPhase) * 0.09;
      this.visual.rotation.z = Math.sin(now * 0.0018) * 0.06;
    }

    if (!moving && this.kind !== 'npc' && type !== 'ghost') {
      this.visual.position.y = Math.sin(now * 0.002 + this.walkPhase) * 0.015;
    }
  }
}
