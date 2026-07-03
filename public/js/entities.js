// ---------------------------------------------------------------
// Kiria Online 3D – Spielfiguren (v9)
// 68 Monster + 6 Bosse, Helden mit Mounts und Fackellicht,
// Hoftiere, Leichen (Beute) und NPCs.
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
    cape = false, capeColor = null, robe = false, bowBack = false, staff = false, plume = false,
    shoulders = false, snout = null, earsUp = false, tail = false,
    armsForward = false, hunched = false, longArms = false, bird = false, bulky = false,
  } = opts;
  const g = new THREE.Group();
  const anim = {};
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const body = new THREE.Group();
  g.add(body);

  const legW = bulky ? 0.2 : 0.14;
  anim.lLeg = limb(legW, 0.34, legW, legs, -0.1, 0.34, 0);
  anim.rLeg = limb(legW, 0.34, legW, legs, 0.1, 0.34, 0);
  g.add(anim.lLeg, anim.rLeg);

  const torso = box(bulky ? 0.48 : 0.34, 0.4, bulky ? 0.3 : 0.2, shirtMat);
  torso.position.y = 0.54;
  body.add(torso);

  if (robe) {
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 8), shirtMat);
    skirt.position.y = 0.28;
    skirt.castShadow = true;
    body.add(skirt);
  }
  if (cape) {
    const capeMat = new THREE.MeshLambertMaterial({ color: capeColor ?? shirt, side: THREE.DoubleSide });
    anim.cape = new THREE.Group();
    anim.cape.position.set(0, 0.74, -0.12);
    const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), capeMat);
    cp.position.y = -0.24;
    anim.cape.add(cp);
    body.add(anim.cape);
    if (capeColor === null) anim.capeMat = capeMat;
  }
  if (shoulders) {
    const s1 = box(0.14, 0.08, 0.16, 0x9a9aa8);
    s1.position.set(-0.24, 0.76, 0);
    const s2 = s1.clone(); s2.position.x = 0.24;
    body.add(s1, s2);
  }

  const armW = bulky ? 0.16 : 0.1;
  const armH = longArms ? 0.48 : 0.36;
  anim.lArm = limb(armW, armH, armW, shirtMat, bulky ? -0.32 : -0.23, 0.72, 0);
  anim.rArm = limb(armW, armH, armW, shirtMat, bulky ? 0.32 : 0.23, 0.72, 0);
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
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0x99ddff }));
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

// ---------------- Vierbeiner (auch Hoftiere) ----------------
function makeQuadruped({ color, scale = 1, tail = true, earColor = null, mane = null, hornsUp = false, patches = null, snoutColor = null, tusks = false }) {
  const g = new THREE.Group();
  const anim = {};
  const body = box(0.3 * scale, 0.22 * scale, 0.55 * scale, color);
  body.position.y = 0.28 * scale;
  g.add(body);
  if (patches) {
    const p1 = box(0.31 * scale, 0.12 * scale, 0.18 * scale, patches);
    p1.position.set(0, 0.3 * scale, 0.08 * scale);
    g.add(p1);
  }
  const head = box(0.2 * scale, 0.18 * scale, 0.22 * scale, color);
  head.position.set(0, 0.36 * scale, 0.32 * scale);
  g.add(head);
  if (snoutColor) {
    const sn = box(0.12 * scale, 0.1 * scale, 0.1 * scale, snoutColor);
    sn.position.set(0, 0.32 * scale, 0.44 * scale);
    g.add(sn);
  }
  if (mane) {
    const mn = box(0.08 * scale, 0.22 * scale, 0.3 * scale, mane);
    mn.position.set(0, 0.48 * scale, 0.12 * scale);
    g.add(mn);
  }
  if (tusks) {
    const t1 = box(0.03 * scale, 0.08 * scale, 0.03 * scale, 0xf0e8d8);
    t1.position.set(-0.07 * scale, 0.28 * scale, 0.44 * scale);
    t1.rotation.x = -0.5;
    const t2 = t1.clone(); t2.position.x = 0.07 * scale;
    g.add(t1, t2);
  }
  if (hornsUp) {
    const h1 = box(0.04 * scale, 0.12 * scale, 0.04 * scale, 0xe8e0d0);
    h1.position.set(-0.07 * scale, 0.5 * scale, 0.3 * scale);
    const h2 = h1.clone(); h2.position.x = 0.07 * scale;
    g.add(h1, h2);
  }
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

// Hoftiere & Haustiere für die lebendige Welt
export function makeAnimal(type) {
  switch (type) {
    case 'horse': return makeQuadruped({ color: 0x8a5c30, scale: 1.35, mane: 0x4a2e14, snoutColor: 0x6a4522 });
    case 'cow':   return makeQuadruped({ color: 0xe8e0d0, scale: 1.25, patches: 0x4a3a2e, hornsUp: true, snoutColor: 0xd8a8a0 });
    case 'goat':  return makeQuadruped({ color: 0xcac2b2, scale: 0.8, hornsUp: true, earColor: 0xa89a88 });
    case 'cat':   return makeQuadruped({ color: [0x8a8078, 0x37393f, 0xb05c22][Math.floor(Math.random() * 3)], scale: 0.42, earColor: 0x5a5048 });
    case 'dog':   return makeQuadruped({ color: [0x7a5230, 0x9a8a70][Math.floor(Math.random() * 2)], scale: 0.6, earColor: 0x4a3218, snoutColor: 0x3a2a18 });
    default:      return makeQuadruped({ color: 0x999999, scale: 0.8 });
  }
}

// ---------------- Spezielle Monster ----------------
function makeSnake(scale = 1, color = 0x4a9a3a, dark = 0x3a7a2e) {
  const g = new THREE.Group();
  const b1 = box(0.16, 0.12, 0.5, color);
  b1.position.set(0, 0.07, -0.1);
  const b2 = box(0.14, 0.1, 0.3, dark);
  b2.position.set(0.1, 0.06, -0.35);
  const head = box(0.18, 0.14, 0.2, color);
  head.position.set(0, 0.1, 0.2);
  const eye1 = box(0.03, 0.03, 0.03, 0xffdd00);
  eye1.position.set(-0.05, 0.14, 0.29);
  const eye2 = eye1.clone(); eye2.position.x = 0.05;
  g.add(b1, b2, head, eye1, eye2);
  g.scale.setScalar(scale);
  g.userData.anim = {};
  g.userData.animType = 'snake';
  return g;
}

// Huhn: kleiner Flattervogel für die Höfe und Wiesen
function makeChicken() {
  const g = new THREE.Group();
  const body = box(0.16, 0.14, 0.2, 0xe8e4da);
  body.position.y = 0.16;
  const head = box(0.09, 0.09, 0.09, 0xe8e4da);
  head.position.set(0, 0.3, 0.1);
  const beak = box(0.03, 0.03, 0.05, 0xd8862a);
  beak.position.set(0, 0.29, 0.17);
  const comb = box(0.03, 0.05, 0.06, 0xd83a2a);
  comb.position.set(0, 0.37, 0.09);
  g.add(body, head, beak, comb);
  const anim = { legs: [] };
  for (const lx of [-0.05, 0.05]) {
    const l = limb(0.025, 0.1, 0.025, 0xd8862a, lx, 0.1, 0);
    g.add(l);
    anim.legs.push(l);
  }
  g.userData.anim = anim;
  g.userData.animType = 'quad';
  return g;
}

// Schleim: wabernder Glibberklumpen
function makeSlime(color = 0x4ad84a) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.78 });
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), mat);
  blob.position.y = 0.24;
  blob.scale.y = 0.72;
  blob.castShadow = true;
  const e1 = box(0.05, 0.07, 0.03, 0x113311);
  e1.position.set(-0.09, 0.3, 0.26);
  const e2 = e1.clone(); e2.position.x = 0.09;
  g.add(blob, e1, e2);
  g.userData.anim = { blob };
  g.userData.animType = 'slime';
  return g;
}

function makeSpider(scale = 1, bodyColor = 0x2a2a30, legColor = 0x1e1e24) {
  const g = new THREE.Group();
  const anim = {};
  const body = box(0.34, 0.2, 0.4, bodyColor);
  body.position.set(0, 0.26, -0.05);
  const head = box(0.2, 0.16, 0.18, bodyColor);
  head.position.set(0, 0.24, 0.22);
  const e1 = box(0.04, 0.04, 0.03, 0xff3322);
  e1.position.set(-0.05, 0.28, 0.32);
  const e2 = e1.clone(); e2.position.x = 0.05;
  g.add(body, head, e1, e2);
  anim.legs = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const l = limb(0.035, 0.3, 0.035, legColor, side * 0.2, 0.32, -0.18 + i * 0.12);
      l.rotation.z = side * 0.7;
      l.userData.baseZ = side * 0.7;
      g.add(l);
      anim.legs.push(l);
    }
  }
  g.scale.setScalar(scale);
  g.userData.anim = anim;
  g.userData.animType = 'spider';
  return g;
}

function makeCrab() {
  const g = new THREE.Group();
  const c = 0xd8683a;
  const body = box(0.4, 0.16, 0.3, c);
  body.position.y = 0.14;
  const e1 = box(0.04, 0.08, 0.04, 0x33222a);
  e1.position.set(-0.08, 0.28, 0.1);
  const e2 = e1.clone(); e2.position.x = 0.08;
  const c1 = box(0.12, 0.1, 0.14, c);
  c1.position.set(-0.26, 0.14, 0.14);
  const c2 = c1.clone(); c2.position.x = 0.26;
  g.add(body, e1, e2, c1, c2);
  const anim = { legs: [] };
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const l = limb(0.03, 0.14, 0.03, 0xb0522e, side * 0.22, 0.14, -0.1 + i * 0.09);
      l.rotation.z = side * 0.8;
      l.userData.baseZ = side * 0.8;
      g.add(l);
      anim.legs.push(l);
    }
  }
  g.userData.anim = anim;
  g.userData.animType = 'spider';
  return g;
}

function makeScorpion() {
  const g = new THREE.Group();
  const c = 0x6a5218;
  const body = box(0.34, 0.14, 0.5, c);
  body.position.y = 0.12;
  const tail1 = box(0.1, 0.1, 0.2, c);
  tail1.position.set(0, 0.25, -0.32);
  tail1.rotation.x = -0.7;
  const sting = box(0.07, 0.16, 0.07, 0x3a2c0e);
  sting.position.set(0, 0.42, -0.38);
  const c1 = box(0.12, 0.08, 0.16, c);
  c1.position.set(-0.24, 0.1, 0.24);
  const c2 = c1.clone(); c2.position.x = 0.24;
  g.add(body, tail1, sting, c1, c2);
  const anim = { legs: [] };
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const l = limb(0.03, 0.12, 0.03, 0x4a3a10, side * 0.2, 0.12, -0.14 + i * 0.12);
      l.rotation.z = side * 0.8;
      l.userData.baseZ = side * 0.8;
      g.add(l);
      anim.legs.push(l);
    }
  }
  g.userData.anim = anim;
  g.userData.animType = 'spider';
  return g;
}

function makeGhost(color = 0xd8e8f0, scale = 1, emissive = false) {
  const g = new THREE.Group();
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    : new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 });
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

function makeDragon(red = 0xa82818, dark = 0x781a10, scale = 1) {
  const g = new THREE.Group();
  const anim = {};
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
  g.scale.setScalar(scale);
  g.userData.anim = anim;
  g.userData.animType = 'dragon';
  return g;
}

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

// Fledermaus (und Riesenwespe): kleiner Flatterer
function makeBat(bodyColor = 0x3a3240, wingColor = 0x2a2430, eyeColor = 0xff4433, scale = 1, stripes = null) {
  const g = new THREE.Group();
  const anim = {};
  const body = box(0.14, 0.14, 0.16, bodyColor);
  body.position.y = 0.75;
  const e1 = box(0.03, 0.06, 0.02, bodyColor);
  e1.position.set(-0.04, 0.86, 0);
  const e2 = e1.clone(); e2.position.x = 0.04;
  const eye1 = box(0.025, 0.025, 0.02, eyeColor);
  eye1.position.set(-0.035, 0.78, 0.08);
  const eye2 = eye1.clone(); eye2.position.x = 0.035;
  g.add(body, e1, e2, eye1, eye2);
  if (stripes) {
    const s1 = box(0.15, 0.15, 0.03, stripes);
    s1.position.set(0, 0.75, -0.05);
    const tail = box(0.05, 0.05, 0.12, stripes);
    tail.position.set(0, 0.72, -0.13);
    g.add(s1, tail);
  }
  anim.lWing = limb(0.3, 0.03, 0.16, wingColor, -0.08, 0.78, 0);
  anim.lWing.children[0].position.set(-0.15, 0, 0);
  anim.rWing = limb(0.3, 0.03, 0.16, wingColor, 0.08, 0.78, 0);
  anim.rWing.children[0].position.set(0.15, 0, 0);
  g.add(anim.lWing, anim.rWing);
  g.scale.setScalar(scale);
  g.userData.anim = anim;
  g.userData.animType = 'bat';
  return g;
}

export function makeMonsterVisual(type) {
  switch (type) {
    case 'rat':      return makeQuadruped({ color: 0x8a8078, scale: 0.55, earColor: 0xc0a8a0 });
    case 'bat':      return makeBat();
    case 'boar':     return makeQuadruped({ color: 0x5a4430, scale: 0.9, earColor: 0x3a2c1e, snoutColor: 0xc09a8a, tusks: true });
    case 'crab':     return makeCrab();
    case 'snake':    return makeSnake();
    case 'spider':   return makeSpider();
    case 'giant_spider': return makeSpider(1.9, 0x3a2a3a, 0x2a1a2a);
    case 'wolf':     return makeQuadruped({ color: 0x5a5a62, scale: 1.0, earColor: 0x3a3a40 });
    case 'bear':     return makeQuadruped({ color: 0x6a4a2a, scale: 1.4, earColor: 0x4a3018, tail: false });
    case 'horse':    return makeAnimal('horse');
    case 'goblin':   return makeHumanoid({ skin: 0x7aa04a, shirt: 0x5a4a30, legs: 0x3a3020, scale: 0.8, earsUp: true, hat: 'none' });
    case 'scorpion': return makeScorpion();
    case 'orc':      return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x4a3a28, legs: 0x33281c });
    case 'orc_berserker': return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x8a2626, legs: 0x33281c, scale: 1.15, hat: 'helmet' });
    case 'bandit':   return makeHumanoid({ skin: 0xc89a72, shirt: 0x6a3a2a, legs: 0x3a3028, hat: 'hood' });
    case 'dark_elf': return makeHumanoid({ skin: 0x9a8ab0, shirt: 0x3a2a52, legs: 0x2a2040, hat: 'none', bowBack: true });
    case 'lizardman': return makeHumanoid({ skin: 0x4a8a5a, shirt: 0x3a6a48, legs: 0x2a5038, snout: 0x3a7a4a, tail: true, hat: 'none' });
    case 'harpy':    return makeHumanoid({ skin: 0xd8b088, shirt: 0x8a6a3a, legs: 0x6a5230, wings: true, earsUp: true, hat: 'none', scale: 0.95 });
    case 'ogre':     return makeHumanoid({ skin: 0xb0885a, shirt: 0x6a5038, legs: 0x4a3828, scale: 1.5, bulky: true });
    case 'yeti':     return makeHumanoid({ skin: 0xe8ecf0, shirt: 0xdce4ea, legs: 0xc8d4dc, scale: 1.6, bulky: true, hat: 'none' });
    case 'dark_knight': return makeHumanoid({ skin: 0x8a8a92, shirt: 0x24262e, legs: 0x1a1c22, hat: 'helmet', shoulders: true, cape: true, capeColor: 0x5a1020, scale: 1.15 });
    case 'lich':     return makeHumanoid({ skin: 0xb8c0b0, shirt: 0x2a2a3a, legs: 0x20202e, robe: true, staff: true, horns: true, hat: 'none', scale: 1.2 });
    case 'troll':    return makeHumanoid({ skin: 0x7a8a6a, shirt: 0x5a4a38, legs: 0x3a3028, scale: 1.3 });
    case 'skeleton': return makeHumanoid({ skin: 0xd8d8cc, shirt: 0xb8b8ac, legs: 0xa8a89c });
    case 'zombie':   return makeHumanoid({ skin: 0x84a06a, shirt: 0x4a4a38, legs: 0x3a3a30, armsForward: true, hat: 'none' });
    case 'mummy':    return makeHumanoid({ skin: 0xcabf9e, shirt: 0xbab098, legs: 0xa89e86, armsForward: true, hat: 'none' });
    case 'ghoul':    return makeHumanoid({ skin: 0xb8c89a, shirt: 0x6a705a, legs: 0x4a5040, hunched: true, longArms: true, scale: 1.1, hat: 'none' });
    case 'hunter':   return makeHumanoid({ skin: 0xd8a878, shirt: 0x3a5a2e, legs: 0x4a3a2a, hat: 'hood', bowBack: true });
    case 'werewolf': return makeHumanoid({ skin: 0x5a5258, shirt: 0x4a4248, legs: 0x3a3238, scale: 1.25, snout: 0x3a3238, earsUp: true, tail: true, hunched: true, hat: 'none' });
    case 'vampire':  return makeHumanoid({ skin: 0xd8ccc8, shirt: 0x2a1a22, legs: 0x1e1218, cape: true, capeColor: 0x6a1020, hat: 'none' });
    case 'minotaur': return makeHumanoid({ skin: 0x7a4e2a, shirt: 0x5a3a20, legs: 0x4a3018, scale: 1.7, snout: 0x9a6a42, hornsSide: true, hat: 'none' });
    case 'ghost':    return makeGhost();
    case 'banshee':  return makeGhost(0xc8b0e8, 1.25);
    case 'fire_elemental': return makeGhost(0xff7a1a, 1.4, true);
    case 'cyclops':  return makeHumanoid({ skin: 0xc09a6a, shirt: 0x6a5038, legs: 0x4a3828, scale: 1.6, oneEye: true, hat: 'none' });
    case 'golem':    return makeHumanoid({ skin: 0x8a8a90, shirt: 0x74747c, legs: 0x64646c, scale: 1.55, bulky: true, oneEye: true, hat: 'none' });
    case 'wyrm':     return makeWyrm();
    case 'dragon':   return makeDragon();
    case 'demon':    return makeHumanoid({ skin: 0x8a2020, shirt: 0x5a1414, legs: 0x3a0e0e, scale: 1.5, horns: true, wings: true, hat: 'none' });
    // ---- Neue Arten (v9) ----
    case 'chicken':  return makeChicken();
    case 'fox':      return makeQuadruped({ color: 0xc86a2a, scale: 0.7, earColor: 0x8a4218, snoutColor: 0xe8d8c8 });
    case 'slime':    return makeSlime();
    case 'kobold':   return makeHumanoid({ skin: 0xb08a5a, shirt: 0x5a4a3a, legs: 0x3a3020, scale: 0.7, earsUp: true, hat: 'none' });
    case 'giant_wasp': return makeBat(0xd8b02a, 0xc8c8b0, 0x33222a, 1.1, 0x3a3220);
    case 'hyena':    return makeQuadruped({ color: 0x9a8a5a, scale: 0.95, earColor: 0x5a4a2a, patches: 0x6a5a3a, snoutColor: 0x4a3a20 });
    case 'gnoll':    return makeHumanoid({ skin: 0x9a8a4a, shirt: 0x6a5a38, legs: 0x4a3e26, snout: 0x7a6a3a, earsUp: true, hat: 'none', scale: 1.05 });
    case 'crocodile': return makeQuadruped({ color: 0x4a7a3a, scale: 1.15, snoutColor: 0x3a6a2e, tail: true });
    case 'pirate':   return makeHumanoid({ skin: 0xc89a72, shirt: 0x8a2a2a, legs: 0x2a2a33, hat: 'feather' });
    case 'witch':    return makeHumanoid({ skin: 0xb8c89a, shirt: 0x4a2a5a, legs: 0x33203f, hat: 'wizard', robe: true, staff: true });
    case 'orc_shaman': return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x3a4a5c, legs: 0x2a3542, robe: true, staff: true, hat: 'none' });
    case 'panther':  return makeQuadruped({ color: 0x22262e, scale: 1.05, earColor: 0x1a1c22 });
    case 'frost_wolf': return makeQuadruped({ color: 0xbcd8e8, scale: 1.1, earColor: 0x8ab0c8, mane: 0xe8f4fa });
    case 'gargoyle': return makeHumanoid({ skin: 0x8a8a92, shirt: 0x74747c, legs: 0x64646c, wings: true, horns: true, hunched: true, hat: 'none', scale: 1.1 });
    case 'basilisk': return makeSnake(1.9, 0x6a9a2a, 0x4a7a1e);
    case 'treant':   return makeHumanoid({ skin: 0x6a8a3a, shirt: 0x5a4326, legs: 0x4a3520, scale: 1.55, bulky: true, longArms: true, hat: 'none' });
    case 'sabertooth': return makeQuadruped({ color: 0xd8a04a, scale: 1.3, earColor: 0xb0802a, snoutColor: 0xe8d0a8, tusks: true });
    case 'necromancer': return makeHumanoid({ skin: 0xc8c8b8, shirt: 0x2a3326, legs: 0x1e261c, robe: true, staff: true, hat: 'hood' });
    case 'medusa':   return makeHumanoid({ skin: 0x8aba7a, shirt: 0x3a6a4a, legs: 0x2a5038, robe: true, earsUp: true, hat: 'none' });
    case 'unicorn':  return makeQuadruped({ color: 0xf0f0f8, scale: 1.35, mane: 0xd8c8f0, hornsUp: true, snoutColor: 0xe0d8e8 });
    case 'ice_golem': return makeHumanoid({ skin: 0xa8d0e8, shirt: 0x8ab8d8, legs: 0x6a98b8, scale: 1.55, bulky: true, oneEye: true, hat: 'none' });
    case 'shadow_assassin': return makeHumanoid({ skin: 0x5a5a6a, shirt: 0x1e1e2a, legs: 0x16161f, hat: 'hood', cape: true, capeColor: 0x26263a });
    case 'lava_hound': return makeQuadruped({ color: 0x8a2a10, scale: 1.2, earColor: 0x5a1a0a, mane: 0xff6a1a, snoutColor: 0x3a120a });
    case 'griffin':  return makeDragon(0xc8a03a, 0x8a6a2a, 0.9);
    case 'frost_giant': return makeHumanoid({ skin: 0xc8dce8, shirt: 0x5a7a92, legs: 0x44607a, scale: 1.9, bulky: true, hat: 'none' });
    case 'frost_dragon': return makeDragon(0x4a9ad8, 0x2a6aa8);
    case 'phoenix':  return makeDragon(0xe86a1a, 0xc83a0a, 0.95);
    case 'shadow_demon': return makeHumanoid({ skin: 0x3a2a4a, shirt: 0x261a33, legs: 0x1a1224, scale: 1.5, horns: true, wings: true, hat: 'none' });
    case 'reaper':   return makeGhost(0x2a2a35, 1.5);
    case 'obsidian_golem': return makeHumanoid({ skin: 0x26262e, shirt: 0x1e1e26, legs: 0x16161c, scale: 1.8, bulky: true, oneEye: true, hat: 'none' });
    // ---- Neue Arten (v10) ----
    case 'sheep':    return makeQuadruped({ color: 0xe8e8e0, scale: 0.8, earColor: 0x9a9088, snoutColor: 0x8a8078 });
    case 'giant_beetle': return makeSpider(0.85, 0x4a3a1a, 0x33280f);
    case 'king_cobra': return makeSnake(1.6, 0xc8a03a, 0x8a6a1e);
    case 'swamp_lurker': return makeHumanoid({ skin: 0x5a7a4a, shirt: 0x44603a, legs: 0x33482c, hunched: true, longArms: true, hat: 'none', scale: 1.15 });
    case 'forest_spirit': return makeGhost(0x7ad87a, 1.2, true);
    case 'cave_bear': return makeQuadruped({ color: 0x44342a, scale: 1.7, earColor: 0x2e221c, tail: false });
    case 'storm_eagle': return makeDragon(0x9a7a4a, 0xd8d0c0, 0.75);
    case 'mammoth':  return makeQuadruped({ color: 0x8a6a4a, scale: 2.0, tusks: true, snoutColor: 0x6a4a30, mane: 0x6a4a30 });
    case 'dire_wolf': return makeQuadruped({ color: 0x2e2e38, scale: 1.5, earColor: 0x1e1e26, mane: 0x44444f });
    case 'spectral_dragon': return makeDragon(0x8ad8d0, 0x4aa89a, 1.1);
    // ---- Bosse ----
    case 'boss_spider_queen': return makeSpider(2.9, 0x5a1a2a, 0x3a0a1a);
    case 'boss_orc_warlord':  return makeHumanoid({ skin: 0x5a8a3a, shirt: 0x6a1a1a, legs: 0x33281c, scale: 1.9, bulky: true, hat: 'helmet', plume: true, shoulders: true, cape: true, capeColor: 0x8a2020 });
    case 'boss_yeti_king':    return makeHumanoid({ skin: 0xe8ecf0, shirt: 0xdce4ea, legs: 0xc8d4dc, scale: 2.3, bulky: true, horns: true, hat: 'none' });
    case 'boss_lich_king':    return makeHumanoid({ skin: 0xb8c0b0, shirt: 0x2a2a3a, legs: 0x20202e, robe: true, staff: true, horns: true, hat: 'none', scale: 1.9 });
    case 'boss_dragon_lord':  return makeDragon(0x6a1a4a, 0x44102f, 1.7);
    case 'world_titan':       return makeHumanoid({ skin: 0x8a7a5a, shirt: 0x5a4a30, legs: 0x44381f, scale: 2.8, bulky: true, oneEye: true, hornsSide: true, hat: 'none' });
    default:         return makeQuadruped({ color: 0x999999, scale: 0.8 });
  }
}

function makePlayerVisual(vocation, outfit) {
  const shirt = OUTFITS[outfit % OUTFITS.length];
  if (vocation === 'knight')   return makeHumanoid({ shirt, hat: 'helmet', plume: true, shoulders: true, cape: true });
  if (vocation === 'sorcerer') return makeHumanoid({ shirt, hat: 'wizard', robe: true, staff: true });
  if (vocation === 'tamer')    return makeHumanoid({ shirt, hat: 'feather', cape: true, bird: true });
  return makeHumanoid({ shirt, hat: 'hood', cape: true, bowBack: true });
}

function makeNpcVisual() {
  return makeHumanoid({ shirt: 0xc2a43b, legs: 0x5a4328 });
}

// Leiche mit Beute
function makeCorpseVisual() {
  const g = new THREE.Group();
  const pile = box(0.5, 0.1, 0.42, 0x5a3a2a);
  pile.position.y = 0.05;
  const b1 = box(0.28, 0.05, 0.07, 0xe0dcc8);
  b1.position.set(0, 0.12, 0);
  b1.rotation.y = 0.6;
  const b2 = b1.clone();
  b2.rotation.y = -0.6;
  const coin = box(0.09, 0.03, 0.09, 0xe8c33a);
  coin.position.set(0.12, 0.13, 0.1);
  g.add(pile, b1, b2, coin);
  g.userData.anim = {};
  g.userData.animType = 'corpse';
  return g;
}

// ---------------- Label ----------------
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

// Animations-Helfer (für Figur UND Mount)
function animateModel(visual, moving, swing, walkPhase, now) {
  const a = visual.userData.anim;
  const type = visual.userData.animType;
  if (type === 'biped' && a.lArm) {
    if (a.zombie) {
      a.lArm.rotation.x = -1.25 + Math.sin(walkPhase) * 0.1;
      a.rArm.rotation.x = -1.25 - Math.sin(walkPhase) * 0.1;
    } else {
      a.lArm.rotation.x = swing;
      a.rArm.rotation.x = -swing;
    }
    a.lLeg.rotation.x = -swing;
    a.rLeg.rotation.x = swing;
    if (a.cape) a.cape.rotation.x = 0.15 + (moving ? Math.abs(Math.sin(walkPhase)) * 0.35 : Math.sin(now * 0.002) * 0.05);
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
    visual.rotation.z = moving ? Math.sin(walkPhase) * 0.06 : 0;
  } else if (type === 'spider' && a.legs) {
    a.legs.forEach((l, i) => {
      l.rotation.x = moving ? Math.sin(walkPhase * 1.6 + i) * 0.35 : 0;
      l.rotation.z = l.userData.baseZ;
    });
  } else if (type === 'bat') {
    const flap = Math.sin(now * 0.02) * 0.9;
    a.lWing.rotation.z = flap;
    a.rWing.rotation.z = -flap;
    visual.position.y = 0.2 + Math.sin(now * 0.004) * 0.12;
  } else if (type === 'snake') {
    visual.rotation.z = moving ? Math.sin(walkPhase * 1.5) * 0.12 : 0;
  } else if (type === 'slime') {
    const squish = 1 + Math.sin(now * 0.006 + walkPhase) * 0.14;
    a.blob.scale.set(2 - squish, 0.72 * squish, 2 - squish);
  } else if (type === 'ghost') {
    visual.position.y = 0.15 + Math.sin(now * 0.0025 + walkPhase) * 0.09;
    visual.rotation.z = Math.sin(now * 0.0018) * 0.06;
  }
}

// ---------------- Entity ----------------
const TALL_TYPES = new Set([
  'dragon', 'demon', 'cyclops', 'minotaur', 'wyrm', 'golem',
  'frost_dragon', 'phoenix', 'griffin', 'frost_giant', 'treant',
  'ice_golem', 'obsidian_golem', 'shadow_demon', 'ogre', 'yeti',
  'mammoth', 'spectral_dragon',
]);

export class Entity {
  constructor(data, kind, world) {
    this.id = data.id;
    this.kind = kind; // 'player' | 'monster' | 'npc' | 'pet' | 'corpse'
    this.name = data.name;
    this.type = data.type || null;
    this.level = data.level || null;
    this.ownerName = data.ownerName || null;
    this.ownerId = data.ownerId || null;
    this.bubble = null;
    this.bubbleUntil = 0;
    this.world = world;
    this.hp = data.hp ?? 1;
    this.maxHp = data.maxHp ?? 1;
    this.dead = false;
    this.label = null;
    this.markSprite = null;
    this.mountType = null;
    this.mountG = null;
    this.lightUntil = 0;
    this.lightSprite = null;
    this.pointLight = null;

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
    } else if (kind === 'corpse') {
      visual = makeCorpseVisual();
      this.labelColor = '#d8c268';
      this.name = '💰 ' + (data.name || 'Beute');
    } else {
      visual = makeMonsterVisual(data.type);
      this.labelColor = data.boss ? '#ffd700' : '#ff8a7a';
    }
    this.boss = !!data.boss;
    this.worldBoss = !!data.worldBoss;
    this.visual = visual;
    this.group.add(visual);
    this.labelY = this.boss ? 3.4 : TALL_TYPES.has(data.type) ? 2.2 : kind === 'corpse' ? 0.7 : 1.5;

    this.group.traverse((o) => { o.userData.entityId = this.id; });
    const gy = world.groundY(data.x, data.y);
    this.group.position.set(data.x, gy, data.y);

    if (kind === 'player' && data.mounted) this.setMount(data.mounted);
    if (kind === 'player' && data.skull) this.setMark('💀', '#ffffff');
  }

  // Sprechblase über dem Kopf (Chat)
  say(text) {
    if (this.bubble) {
      this.group.remove(this.bubble);
      this.bubble.material.map.dispose();
      this.bubble.material.dispose();
      this.bubble = null;
    }
    // Text in Zeilen umbrechen (max. 3 Zeilen)
    const words = String(text).split(' ');
    const lines = [''];
    for (const w of words) {
      if ((lines[lines.length - 1] + ' ' + w).trim().length > 22) {
        if (lines.length >= 3) { lines[2] = lines[2].slice(0, 19) + '…'; break; }
        lines.push(w);
      } else {
        lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim();
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 40 + lines.length * 28;
    const ctx = canvas.getContext('2d');
    // abgerundete Blase – dunkel, damit der Bloom-Effekt sie nicht überstrahlt
    const r = 14, w2 = canvas.width - 4, h2 = canvas.height - 14;
    const drawShape = () => {
      ctx.beginPath();
      ctx.moveTo(2 + r, 2);
      ctx.lineTo(2 + w2 - r, 2);
      ctx.arcTo(2 + w2, 2, 2 + w2, 2 + r, r);
      ctx.lineTo(2 + w2, h2 - r);
      ctx.arcTo(2 + w2, h2, 2 + w2 - r, h2, r);
      ctx.lineTo(canvas.width / 2 + 10, h2);
      ctx.lineTo(canvas.width / 2, canvas.height - 2);   // Sprech-Zipfel
      ctx.lineTo(canvas.width / 2 - 10, h2);
      ctx.lineTo(2 + r, h2);
      ctx.arcTo(2, h2, 2, h2 - r, r);
      ctx.lineTo(2, 2 + r);
      ctx.arcTo(2, 2, 2 + r, 2, r);
      ctx.closePath();
    };
    ctx.fillStyle = 'rgba(20,15,10,0.88)';
    drawShape();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,165,90,0.9)';
    ctx.lineWidth = 3;
    drawShape();
    ctx.stroke();
    ctx.fillStyle = '#e8dfc8';
    ctx.font = '22px Verdana';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, canvas.width / 2, 30 + i * 27));

    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true,
    }));
    const scale = 2.0;
    this.bubble.scale.set(scale, scale * canvas.height / canvas.width, 1);
    this.bubble.position.y = this.labelY + 0.55 + (scale * canvas.height / canvas.width) / 2;
    this.bubble.renderOrder = 940;
    this.group.add(this.bubble);
    this.bubbleUntil = performance.now() + 3200 + lines.join(' ').length * 60;
  }

  displayName() {
    if (this.kind === 'pet') return `🐾${this.name} [${this.level}] – ${this.ownerName}`;
    return this.name;
  }

  ensureLabel() {
    if (this.label) return;
    this.label = makeLabel(this.kind !== 'npc' && this.kind !== 'corpse');
    this.label.sprite.position.y = this.labelY;
    this.label.sprite.userData.entityId = this.id;
    if (this.kind === 'corpse') this.label.sprite.scale.set(1.2, 0.34, 1);
    if (this.boss) this.label.sprite.scale.set(2.9, 0.81, 1);
    this.group.add(this.label.sprite);
    this.redrawLabel();
  }

  redrawLabel() {
    if (this.label) this.label.draw(this.displayName(), this.labelColor, this.hp, this.maxHp);
  }

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
    const capeMat = this.visual.userData.anim && this.visual.userData.anim.capeMat;
    if (capeMat) capeMat.color.setHex(OUTFITS[outfit % OUTFITS.length]);
  }

  // Aufsitzen/Absteigen: Mount-Modell unter der Figur
  setMount(type) {
    if (this.mountG) {
      this.group.remove(this.mountG);
      this.mountG = null;
    }
    this.mountType = type;
    if (type) {
      this.mountG = type === 'horse' ? makeAnimal('horse') : makeMonsterVisual(type);
      this.mountG.scale.multiplyScalar(0.9);
      this.mountG.traverse((o) => { o.userData.entityId = this.id; });
      this.group.add(this.mountG);
      this.visual.position.y = type === 'horse' || type === 'wolf' || type === 'bear' ? 0.5 : 0.62;
    } else {
      this.visual.position.y = 0;
    }
  }

  setLight(durMs) {
    this.lightUntil = performance.now() + durMs;
    // Echte Lichtquelle für Utevo Lux (hell und weit!)
    if (!this.pointLight) {
      this.pointLight = new THREE.PointLight(0xffd9a0, 0, 14, 1.4);
      this.pointLight.position.y = 1.6;
      this.group.add(this.pointLight);
    }
  }

  faceToward(x, y) {
    const dx = x - this.tx, dy = y - this.ty;
    if (dx || dy) this.targetFacing = Math.atan2(dx, dy);
  }

  // exact = true: dur ist bereits die echte Dauer (Netzwerk-Takt),
  // kein Diagonal-Aufschlag mehr – so laufen alle Figuren flüssig.
  walkTo(x, y, dur, exact = false) {
    if (x === this.tx && y === this.ty) return;
    this.fx = this.group.position.x; this.fy = this.group.position.z;
    const diag = x !== this.tx && y !== this.ty;
    this.tx = x; this.ty = y;
    this.moveStart = performance.now();
    this.moveDur = (dur || 300) * (!exact && diag ? 1.45 : 1);
    const dx = x - this.fx, dy = y - this.fy;
    if (dx || dy) this.targetFacing = Math.atan2(dx, dy);
  }

  snapTo(x, y) {
    this.tx = x; this.ty = y; this.fx = x; this.fy = y;
    this.group.position.x = x;
    this.group.position.z = y;
  }

  update(now, dt) {
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

    // Sprechblase auslaufen lassen
    if (this.bubble && now > this.bubbleUntil) {
      this.group.remove(this.bubble);
      this.bubble.material.map.dispose();
      this.bubble.material.dispose();
      this.bubble = null;
    }

    if (this.kind === 'corpse') return;

    const moving = t < 1;
    if (moving) this.walkPhase += dt * 11;

    if (this.targetFacing !== undefined) {
      let diff = this.targetFacing - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 12);
      this.visual.rotation.y = this.facing;
      if (this.mountG) this.mountG.rotation.y = this.facing;
    }

    const swing = moving ? Math.sin(this.walkPhase) * 0.65 : 0;
    animateModel(this.visual, moving, this.mountG ? swing * 0.3 : swing, this.walkPhase, now);
    if (this.mountG) animateModel(this.mountG, moving, swing, this.walkPhase, now);

    // Licht-Schein (Utevo Lux)
    if (this.lightUntil > now && !this.lightSprite) {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255,240,180,0.9)');
      grad.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      this.lightSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      this.lightSprite.scale.set(1.4, 1.4, 1);
      this.lightSprite.position.y = 1.1;
      this.group.add(this.lightSprite);
    } else if (this.lightUntil <= now && this.lightSprite) {
      this.group.remove(this.lightSprite);
      this.lightSprite.material.map.dispose();
      this.lightSprite.material.dispose();
      this.lightSprite = null;
      if (this.pointLight) { this.group.remove(this.pointLight); this.pointLight = null; }
    }
    if (this.lightSprite) {
      const s = 1.6 + Math.sin(now * 0.008) * 0.15;
      this.lightSprite.scale.set(s, s, 1);
      if (this.pointLight) this.pointLight.intensity = 2.2 + Math.sin(now * 0.01) * 0.3;
    }

    if (!moving && this.kind !== 'npc' && this.visual.userData.animType !== 'ghost') {
      this.visual.position.y = (this.mountG ? this.visual.position.y : 0) + (this.mountG ? 0 : Math.sin(now * 0.002 + this.walkPhase) * 0.015);
    }
  }
}
