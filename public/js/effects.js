// ---------------------------------------------------------------
// Kiria Online 3D – Effekte + Sound
// Schwebende Schadenszahlen, Projektile, Partikel-Explosionen,
// Ringe (Nova/Level-Up) und per WebAudio erzeugte Geräusche.
// ---------------------------------------------------------------
import * as THREE from 'three';

let scene = null;
const floats = [];      // schwebende Texte
const projectiles = []; // fliegende Geschosse
const bursts = [];      // Partikelwolken
const rings = [];       // expandierende Ringe

export function initEffects(s) { scene = s; }

// ---------------- Schwebender Text ----------------
export function floatText(text, pos, color = '#ff5544', size = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${Math.round(34 * size)}px Verdana`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.strokeText(text, 96, 42);
  ctx.fillStyle = color;
  ctx.fillText(text, 96, 42);

  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true,
  }));
  sp.scale.set(1.35 * size, 0.45 * size, 1);
  sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.3, 0));
  sp.renderOrder = 950;
  scene.add(sp);
  floats.push({ sp, born: performance.now(), life: 1000 });
}

// ---------------- Projektil ----------------
export function projectile(from, to, { color = 0xff7722, size = 0.16, dur = 260, onArrive = null } = {}) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  m.position.copy(from);
  scene.add(m);
  projectiles.push({ m, from: from.clone(), to: to.clone(), born: performance.now(), dur, onArrive, color });
}

// ---------------- Partikel-Explosion ----------------
export function burst(pos, color = 0xff7722, count = 22, speed = 2.6) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const vels = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y + 0.5; positions[i * 3 + 2] = pos.z;
    const a = Math.random() * Math.PI * 2;
    const up = Math.random() * 2.2;
    vels.push(new THREE.Vector3(Math.cos(a) * speed * Math.random(), up, Math.sin(a) * speed * Math.random()));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.14, transparent: true, opacity: 1, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  bursts.push({ pts, vels, born: performance.now(), life: 650 });
}

// ---------------- Expandierender Ring ----------------
export function ring(pos, color = 0xffaa22, maxR = 3.2, dur = 500) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.55, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
  scene.add(m);
  rings.push({ m, born: performance.now(), dur, maxR });
}

export function updateEffects(now, dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    const t = (now - f.born) / f.life;
    if (t >= 1) { scene.remove(f.sp); f.sp.material.map.dispose(); f.sp.material.dispose(); floats.splice(i, 1); continue; }
    f.sp.position.y += dt * 1.1;
    f.sp.material.opacity = 1 - t * t;
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const t = (now - p.born) / p.dur;
    if (t >= 1) {
      scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose();
      if (p.onArrive) p.onArrive(); else burst(p.to, p.color, 16);
      projectiles.splice(i, 1); continue;
    }
    p.m.position.lerpVectors(p.from, p.to, t);
    p.m.position.y += Math.sin(t * Math.PI) * 0.6 + 0.6;
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    const t = (now - b.born) / b.life;
    if (t >= 1) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); continue; }
    const pos = b.pts.geometry.attributes.position;
    for (let j = 0; j < b.vels.length; j++) {
      b.vels[j].y -= dt * 5;
      pos.array[j * 3] += b.vels[j].x * dt;
      pos.array[j * 3 + 1] += b.vels[j].y * dt;
      pos.array[j * 3 + 2] += b.vels[j].z * dt;
    }
    pos.needsUpdate = true;
    b.pts.material.opacity = 1 - t;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    const t = (now - r.born) / r.dur;
    if (t >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); continue; }
    const s = 1 + t * r.maxR;
    r.m.scale.set(s, s, 1);
    r.m.material.opacity = 0.9 * (1 - t);
  }
}

// ================= SOUND (WebAudio, synthetisch) =================
let actx = null;
let muted = false;

function ctx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

export function toggleMute() { muted = !muted; return muted; }

function tone(freq, dur, { type = 'square', vol = 0.12, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* Audio nicht verfügbar */ }
}

export const sfx = {
  hit:    () => tone(160, 0.12, { type: 'square', slide: -80 }),
  hurt:   () => tone(110, 0.18, { type: 'sawtooth', slide: -60 }),
  fire:   () => { tone(500, 0.25, { type: 'sawtooth', slide: -350, vol: 0.09 }); tone(900, 0.18, { type: 'triangle', slide: -500, vol: 0.06 }); },
  heal:   () => { tone(520, 0.12, { type: 'sine', vol: 0.1 }); tone(720, 0.16, { type: 'sine', vol: 0.1, delay: 0.09 }); },
  level:  () => { [440, 550, 660, 880].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.11 })); },
  die:    () => tone(220, 0.7, { type: 'sawtooth', slide: -180, vol: 0.14 }),
  coin:   () => { tone(900, 0.07, { type: 'square', vol: 0.07 }); tone(1250, 0.1, { type: 'square', vol: 0.07, delay: 0.06 }); },
  step:   () => tone(90, 0.04, { type: 'triangle', vol: 0.025 }),
};
