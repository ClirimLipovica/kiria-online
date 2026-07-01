// ---------------------------------------------------------------
// Kiria Online 3D – Spielfiguren (v5)
// Low-Poly-Modelle für Spieler (4 Berufe, 8 Skins), 12 Monster,
// Tiere des Bestienzüchters und NPCs – mit Animationen.
// ---------------------------------------------------------------
import * as THREE from 'three';

export const OUTFITS = [0xc23b3b, 0x3b6cc2, 0x3bc25a, 0xc2a43b, 0x8a3bc2, 0x3bbec2, 0xc23b8e, 0xe8e8e8];

function box(w, h, d, colorOrMat, opts = {}) {
  const mat = colorOrMat instanceof THREE.Material
    ? colorOrMat
    : new THREE.MeshLambertMaterial({ color: colorOrMat, ...opts });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

// Gliedmaße mit Drehpunkt oben (für Schwing-Animation)
function limb(w, h, d, colorOrMat, x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const part = box(w, h, d, colorOrMat);
  part.position.y = -h / 2;
  pivot.add(part);
  return pivot;
}

// ---------------- Menschen-Modell ----------------
function makeHumanoid({
  skin = 0xd8a878, shirt = 0x3b6cc2, legs = 0x4a3a2a, hat = null,
  scale = 1, oneEye = false, horns = false, wings = false,
}) {
  const g = new THREE.Group();
  const anim = {};
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });

  anim.lLeg = limb(0.14, 0.34, 0.14, legs, -0.09, 0.34, 0);
  anim.rLeg = limb(0.14, 0.34, 0.14, legs, 0.09, 0.34, 0);
  g.add(anim.lLeg, anim.rLeg);

  const torso = box(0.34, 0.4, 0.2, shirtMat);
  torso.position.y = 0.54;
  g.add(torso);

  anim.lArm = limb(0.1, 0.36, 0.1, shirtMat, -0.23, 0.72, 0);
  anim.rArm = limb(0.1, 0.36, 0.1, shirtMat, 0.23, 0.72, 0);
  g.add(anim.lArm, anim.rArm);

  const head = box(0.24, 0.24, 0.22, skin);
  head.position.y = 0.88;
  g.add(head);

  if (oneEye) {
    const eye = box(0.09, 0.09, 0.03, 0xffdd22);
    eye.position.set(0, 0.9, 0.12);
    g.add(eye);
  }
  if (horns) {
    const h1 = box(0.05, 0.16, 0.05, 0xe8e0d0);
    h1.position.set(-0.1, 1.08, 0);
    const h2 = h1.clone();
    h2.position.x = 0.1;
    g.add(h1, h2);
  }
  if (wings) {
    anim.lWing = limb(0.5, 0.04, 0.3, 0x33222a, -0.18, 0.72, -0.14);
    anim.lWing.children[0].position.set(-0.25, 0, 0);
    anim.rWing = limb(0.5, 0.04, 0.3, 0x33222a, 0.18, 0.72, -0.14);
    anim.rWing.children[0].position.set(0.25, 0, 0);
    g.add(anim.lWing, anim.rWing);
  }

  if (hat === 'helmet') {
    const h = box(0.27, 0.14, 0.25, 0x9a9aa8);
    h.position.y = 1.02;
    g.add(h);
  } else if (hat === 'wizard') {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 7), new THREE.MeshLambertMaterial({ color: 0x5a3baa }));
    h.position.y = 1.14; h.castShadow = true;
    g.add(h);
  } else if (hat === 'hood') {
    const h = box(0.28, 0.12, 0.26, 0x2a6e3a);
    h.position.y = 1.02;
    g.add(h);
  } else if (hat === 'feather') {
    const h = box(0.28, 0.1, 0.26, 0x6a4a2a);
    h.position.y = 1.01;
    const f = box(0.04, 0.18, 0.04, 0xe84a3a);
    f.position.set(0.12, 1.12, 0);
    g.add(h, f);
  } else if (!oneEye && !horns) {
    const hair = box(0.26, 0.08, 0.24, 0x3a2a18);
    hair.position.y = 1.03;
    g.add(hair);
  }

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
    const e2 = e1.clone();
    e2.position.x = 0.06 * scale;
    g.add(e1, e2);
  }

  const legPos = [[-0.1, 0.18], [0.1, 0.18], [-0.1, -0.2], [0.1, -0.2]];
  anim.legs = legPos.map(([lx, lz]) => {
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

// ---------------- Geist ----------------
function makeGhost() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.55 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), mat);
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat);
  head.position.y = 0.95;
  const e1 = box(0.05, 0.07, 0.03, 0x111122);
  e1.position.set(-0.07, 0.98, 0.17);
  const e2 = e1.clone(); e2.position.x = 0.07;
  g.add(body, head, e1, e2);
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
  g.add(body);

  const neck = box(0.3, 0.5, 0.3, red);
  neck.position.set(0, 1.05, 0.5);
  g.add(neck);

  const head = box(0.4, 0.3, 0.55, red);
  head.position.set(0, 1.3, 0.75);
  g.add(head);
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

  const legPos = [[-0.25, 0.35], [0.25, 0.35], [-0.25, -0.35], [0.25, -0.35]];
  anim.legs = legPos.map(([lx, lz]) => {
    const l = limb(0.14, 0.35, 0.14, dark, lx, 0.38, lz);
    g.add(l);
    return l;
  });

  g.userData.anim = anim;
  g.userData.animType = 'dragon';
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
    case 'troll':    return makeHumanoid({ skin: 0x7a8a6a, shirt: 0x5a4a38, legs: 0x3a3028, scale: 1.3 });
    case 'skeleton': return makeHumanoid({ skin: 0xd8d8cc, shirt: 0xb8b8ac, legs: 0xa8a89c });
    case 'ghost':    return makeGhost();
    case 'cyclops':  return makeHumanoid({ skin: 0xc09a6a, shirt: 0x6a5038, legs: 0x4a3828, scale: 1.6, oneEye: true });
    case 'dragon':   return makeDragon();
    case 'demon':    return makeHumanoid({ skin: 0x8a2020, shirt: 0x5a1414, legs: 0x3a0e0e, scale: 1.5, horns: true, wings: true });
    default:         return makeQuadruped({ color: 0x999999, scale: 0.8 });
  }
}

function makePlayerVisual(vocation, outfit) {
  const shirt = OUTFITS[outfit % OUTFITS.length];
  const hat = vocation === 'knight' ? 'helmet'
    : vocation === 'sorcerer' ? 'wizard'
    : vocation === 'tamer' ? 'feather' : 'hood';
  return makeHumanoid({ shirt, hat });
}

function makeNpcVisual() {
  return makeHumanoid({ shirt: 0xc2a43b, legs: 0x5a4328 });
}

// ---------------- Name + Lebensbalken (Sprite) ----------------
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

    const label = makeLabel(kind !== 'npc');
    this.label = label;
    const tall = (data.type === 'dragon' || data.type === 'demon' || data.type === 'cyclops') ? 2.1 : 1.5;
    label.sprite.position.y = tall;
    this.group.add(label.sprite);
    this.redrawLabel();

    this.group.traverse((o) => { o.userData.entityId = this.id; });
    const gy = world.groundY(data.x, data.y);
    this.group.position.set(data.x, gy, data.y);
  }

  displayName() {
    if (this.kind === 'pet') return `🐾${this.name} [${this.level}] – ${this.ownerName}`;
    return this.name;
  }

  redrawLabel() {
    this.label.draw(this.displayName(), this.labelColor, this.hp, this.maxHp);
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
    this.tx = x; this.ty = y;
    this.moveStart = performance.now();
    this.moveDur = dur || 300;
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
      a.lArm.rotation.x = swing;
      a.rArm.rotation.x = -swing;
      a.lLeg.rotation.x = -swing;
      a.rLeg.rotation.x = swing;
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
