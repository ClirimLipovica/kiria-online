// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Rendering (v9)
// Chunk-System (32x32-Kacheln, lädt nur die Umgebung des Spielers),
// Wasser, Himmel mit Sonne/Mond/Sternen, Tag/Nacht, schönere Städte
// (getönte Hauswände, Fenster, Türen, Schornsteine, Marktstände,
// Blumenbeete, Fackeln, Springbrunnen) und lebendige Natur.
// ---------------------------------------------------------------
import * as THREE from 'three';
import { makeAnimal } from './entities.js';

export const TILE = { WATER: 0, SAND: 1, GRASS: 2, TREE: 3, ROCK: 4, ROAD: 5, WALL: 6, LAVA: 7, DIRT: 8, GRAVE: 9, FOUNTAIN: 10, FLOOR: 11, STAIR_DOWN: 12, STAIR_UP: 13, VOID: 14 };
export const WALKABLE = new Set([TILE.SAND, TILE.GRASS, TILE.ROAD, TILE.DIRT, TILE.GRAVE, TILE.FLOOR, TILE.STAIR_DOWN, TILE.STAIR_UP]);
export const H_STEP = 0.45;

const CHUNK = 32;
const VIEW_CHUNKS = 3;   // Radius sichtbarer Chunks
const KEEP_CHUNKS = 8;   // darüber hinaus: Speicher freigeben

const TILE_COLORS = {
  [TILE.WATER]: 0x1d5585, [TILE.SAND]: 0xe0c887, [TILE.GRASS]: 0x58a34c,
  [TILE.TREE]: 0x4a8a3e,  [TILE.ROCK]: 0x8d8d92, [TILE.ROAD]: 0xaaa189,
  [TILE.WALL]: 0x8a7a66,  [TILE.LAVA]: 0x2a1a12, [TILE.DIRT]: 0x86663e,
  [TILE.GRAVE]: 0x6f5a40, [TILE.FOUNTAIN]: 0x9aa8b8, [TILE.FLOOR]: 0xa8814e,
  [TILE.STAIR_DOWN]: 0x14100c, [TILE.STAIR_UP]: 0xcdbb92,
};
// Höhlen-Farbton: unter Tage wirken dieselben Kacheln nur leicht gedämpft
const CAVE_TINT = 0.9;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World3D {
  constructor(scene, data) {
    this.scene = scene;
    this.size = data.size;
    // 6 Ebenen (z = -3..+2); data.floors = [{tiles, heights}, ...]
    this.floors = data.floors;
    this.z = 0;
    this.tiles = this.floors[3].tiles;     // Zeiger auf die AKTUELLE Ebene
    this.heights = this.floors[3].heights;
    // Alles, was nur zur Oberwelt gehört (Wasser, Dächer, Stadt-Deko …),
    // wandert in diese Gruppe und wird unter Tage einfach ausgeblendet.
    this.surfaceGroup = new THREE.Group();
    scene.add(this.surfaceGroup);
    this.buildings = data.buildings;
    this.towns = data.towns || [];
    this.fountainList = data.fountains || [];
    this.farm = data.farm || null;
    this.playerLightBoost = false; // Fackel / Utevo Lux des eigenen Helden
    this.time = 100;
    this.chunks = new Map();
    this._lastChunkAt = 0;
    this.wallGeo = new THREE.BoxGeometry(1, 1.9, 1);
    this.wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

    // Wandfarbe je Gebäudeart: Tempel = heller Stein, Laden = warmes
    // Holz, Wohnhaus = Fachwerk-Creme, Rest (Festung/Ruine) = Fels
    this.wallKindColor = { temple: 0xd8d8e2, shop: 0xc09468, house: 0xd8ccb0 };
    this.wallKind = new Map();
    for (const b of this.buildings) {
      for (let yy = b.y; yy < b.y + b.h; yy++) {
        for (let xx = b.x; xx < b.x + b.w; xx++) {
          if (xx === b.x || xx === b.x + b.w - 1 || yy === b.y || yy === b.y + b.h - 1) {
            this.wallKind.set(xx + ',' + yy, b.kind);
          }
        }
      }
    }

    // geteilte Materialien/Geometrien für Chunks
    this.groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.85 });
    this.trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.8, 5);
    this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3d22 });
    this.crownGeo = new THREE.ConeGeometry(0.55, 1.5, 6);
    this.crownGeo2 = new THREE.SphereGeometry(0.55, 6, 5);
    this.crownMat = new THREE.MeshLambertMaterial({ color: 0x2f6e2a });
    this.rockGeo = new THREE.DodecahedronGeometry(0.4, 0);
    this.rockMat = new THREE.MeshLambertMaterial({ color: 0x77777d });
    this.graveGeo = new THREE.BoxGeometry(0.34, 0.55, 0.12);
    this.graveMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa0 });
    this.tuftGeo = new THREE.ConeGeometry(0.07, 0.28, 4);
    this.tuftMat = new THREE.MeshLambertMaterial({ color: 0x3f8a34 });
    this.flowerGeo = new THREE.SphereGeometry(0.05, 5, 4);
    this.flowerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    // Straßenlaternen (Pfahl + geteiltes Glüh-Sprite, das nachts leuchtet)
    this.lanternPoleGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.5, 5);
    this.lanternPoleMat = new THREE.MeshLambertMaterial({ color: 0x2c2620 });
    this.lanternGlowTex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 48;
      const g = cv.getContext('2d');
      const rg = g.createRadialGradient(24, 24, 1, 24, 24, 22);
      rg.addColorStop(0, 'rgba(255,240,190,1)');
      rg.addColorStop(0.4, 'rgba(255,190,90,0.85)');
      rg.addColorStop(1, 'rgba(255,150,40,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 48, 48);
      return new THREE.CanvasTexture(cv);
    })();
    this.lanternGlowMat = new THREE.SpriteMaterial({
      map: this.lanternGlowTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.25,
    });
    // Treppenstufen (Ebenenwechsel)
    this.stairGeo = new THREE.BoxGeometry(0.84, 0.1, 0.3);
    this.stairDownMat = new THREE.MeshLambertMaterial({ color: 0x4a3a26 });
    this.stairUpMat = new THREE.MeshLambertMaterial({ color: 0xd8c8a0 });
    // Wandfackeln in den Höhlen (Stab + geteiltes Glüh-Sprite, immer an)
    this.caveTorchGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.55, 5);
    this.caveTorchMat = new THREE.MeshLambertMaterial({ color: 0x4a3018 });
    this.caveFlameMat = new THREE.SpriteMaterial({
      map: this.lanternGlowTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 1,
    });
    // 3 echte Lichter, die zu den nächstgelegenen Fackeln wandern –
    // so werfen die Fackeln um den Spieler herum echtes, warmes Licht
    this.torchLights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffc078, 0, 9, 1.8);
      l.visible = false;
      scene.add(l);
      this.torchLights.push(l);
    }
    this._torchLightAt = 0;

    this._buildWater();
    this._buildBuildings();
    this._buildTownDeco();
    this._buildTownLabels();
    this._buildSky();
    this._buildAmbient();
    this._buildLights();
  }

  idx(x, y) { return y * this.size + x; }

  // Ebene wechseln: Chunks der alten Ebene entsorgen, Zeiger umschalten,
  // Oberwelt-Deko ein-/ausblenden. Licht regelt update() je nach Ebene.
  setFloor(z) {
    if (z === this.z) return;
    this.z = z;
    const f = this.floors[z + 3];
    this.tiles = f.tiles;
    this.heights = f.heights;
    for (const [key, chunk] of this.chunks) {
      this.scene.remove(chunk.group);
      chunk.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      this.chunks.delete(key);
    }
    this.surfaceGroup.visible = (z === 0);
    this.water.visible = (z === 0);
    // Himmel nur über der Erde
    const sky = z >= 0;
    if (this.skyDome) this.skyDome.visible = sky;
    if (this.sunSprite) this.sunSprite.visible = sky;
    if (this.moonSprite) this.moonSprite.visible = sky;
    if (this.stars) this.stars.visible = sky;
    // etwas dichterer, warmer Höhlennebel unter Tage
    if (this.scene.fog) this.scene.fog.density = z < 0 ? 0.015 : 0.013;
  }

  tileAt(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return TILE.WATER;
    return this.tiles[this.idx(x, y)];
  }
  heightAt(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return 0;
    return this.heights[this.idx(x, y)];
  }
  groundY(x, y) { return this.heightAt(x, y) * H_STEP; }
  isWalkable(x, y) { return WALKABLE.has(this.tileAt(x, y)); }

  // ================= CHUNKS =================
  // Baut pro Aufruf höchstens EINEN neuen Chunk (den nächstgelegenen
  // fehlenden). So verteilt sich die Last über viele Frames → kein Ruckeln.
  ensureChunks(px, py) {
    const ccx = Math.floor(px / CHUNK), ccy = Math.floor(py / CHUNK);
    const maxC = Math.ceil(this.size / CHUNK) - 1;
    // Sichtbarkeit setzen + weit entfernte Chunks freigeben
    for (const [key, chunk] of this.chunks) {
      const d = Math.max(Math.abs(chunk.cx - ccx), Math.abs(chunk.cy - ccy));
      if (d > VIEW_CHUNKS) chunk.group.visible = false;
      else chunk.group.visible = true;
      if (d > KEEP_CHUNKS) {
        this.scene.remove(chunk.group);
        chunk.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        this.chunks.delete(key);
      }
    }
    // Den nächstgelegenen noch fehlenden sichtbaren Chunk finden und NUR den bauen
    let best = null, bestD = Infinity;
    for (let dy = -VIEW_CHUNKS; dy <= VIEW_CHUNKS; dy++) {
      for (let dx = -VIEW_CHUNKS; dx <= VIEW_CHUNKS; dx++) {
        const cx = ccx + dx, cy = ccy + dy;
        if (cx < 0 || cy < 0 || cx > maxC || cy > maxC) continue;
        if (this.chunks.has(cx + '_' + cy)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = [cx, cy]; }
      }
    }
    if (best) {
      const [cx, cy] = best;
      const chunk = this._buildChunk(cx, cy);
      this.chunks.set(cx + '_' + cy, chunk);
      this.scene.add(chunk.group);
      return true; // es gibt evtl. noch mehr zu bauen
    }
    return false;
  }

  _buildChunk(cx, cy) {
    const group = new THREE.Group();
    const rand = mulberry32(cx * 7919 + cy * 104729 + 13);
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const x1 = Math.min(this.size, x0 + CHUNK), y1 = Math.min(this.size, y0 + CHUNK);

    const pos = [], col = [], idxArr = [];
    const lavaPos = [], lavaIdx = [];
    const trees = [], rocks = [], graves = [], tufts = [], flowers = [], walls = [], lanterns = [];
    const stairsDown = [], stairsUp = [], caveTorches = [];
    const c = new THREE.Color();
    let v = 0, lv = 0;
    const underground = this.z < 0;

    const pushQuad = (p1, p2, p3, p4, color, shade) => {
      pos.push(...p1, ...p2, ...p3, ...p4);
      c.setHex(color).multiplyScalar(shade);
      for (let i = 0; i < 4; i++) col.push(c.r, c.g, c.b);
      idxArr.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    };

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const t = this.tiles[this.idx(x, y)];
        if (t === TILE.VOID) continue; // Leere (Ränder der Obergeschosse)
        const h = this.heights[this.idx(x, y)] * H_STEP;
        const base = TILE_COLORS[t];
        // dezentes Schachbrett + Zufallston = Tibia-Kachel-Look;
        // unter Tage wirken die Kacheln dunkler und kälter
        let vary = (0.94 + rand() * 0.12) * ((x + y) % 2 ? 1.0 : 0.96);
        if (underground && t !== TILE.LAVA && t !== TILE.STAIR_UP && t !== TILE.STAIR_DOWN) vary *= CAVE_TINT;
        pushQuad(
          [x - 0.5, h, y - 0.5], [x - 0.5, h, y + 0.5],
          [x + 0.5, h, y + 0.5], [x + 0.5, h, y - 0.5],
          base, vary,
        );
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nt = this.tileAt(x + dx, y + dy);
          if (nt === TILE.VOID) continue;
          const nh = this.heightAt(x + dx, y + dy) * H_STEP;
          if (nh < h) {
            const shade = (0.5 + rand() * 0.08) * (underground ? 0.72 : 1);
            const cliffCol = t === TILE.ROCK ? 0x6a6a70 : 0x6e5638;
            if (dx !== 0) {
              const sx = x + dx * 0.5;
              pushQuad([sx, h, y - 0.5], [sx, h, y + 0.5], [sx, nh, y + 0.5], [sx, nh, y - 0.5], cliffCol, shade);
            } else {
              const sy = y + dy * 0.5;
              pushQuad([x - 0.5, h, sy], [x + 0.5, h, sy], [x + 0.5, nh, sy], [x - 0.5, nh, sy], cliffCol, shade);
            }
          }
        }
        if (t === TILE.LAVA) {
          const lh = h + 0.03;
          lavaPos.push(x - 0.5, lh, y - 0.5, x - 0.5, lh, y + 0.5, x + 0.5, lh, y + 0.5, x + 0.5, lh, y - 0.5);
          lavaIdx.push(lv, lv + 1, lv + 2, lv, lv + 2, lv + 3);
          lv += 4;
        } else if (t === TILE.TREE) trees.push([x, y]);
        else if (t === TILE.WALL) walls.push([x, y]);
        else if (t === TILE.ROCK && rand() < (underground ? 0.12 : 0.3)) rocks.push([x, y]);
        // Wandfackeln: an Fels-Wänden neben begehbarem Höhlenboden (dichtes Raster)
        if (underground && t === TILE.ROCK && (x * 5 + y * 3) % 4 === 0) {
          for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
            const nt = this.tileAt(x + dx, y + dy);
            if (nt === TILE.DIRT || nt === TILE.FLOOR || nt === TILE.LAVA) { caveTorches.push([x, y, dx, dy]); break; }
          }
        }
        if (t === TILE.STAIR_DOWN) stairsDown.push([x, y]);
        else if (t === TILE.STAIR_UP) stairsUp.push([x, y]);
        // Laternen im Raster entlang der Straßen (nur Oberwelt)
        if (this.z === 0 && t === TILE.ROAD && x % 7 === 0 && y % 7 === 0) lanterns.push([x, y]);
        else if (t === TILE.GRAVE) graves.push([x, y]);
        else if (t === TILE.GRASS) {
          const r = rand();
          if (r < 0.10) tufts.push([x, y]);
          else if (r < 0.125) flowers.push([x, y]);
        }
        // Stalagmiten in den Höhlen (auf Erdboden, dezent)
        if (underground && t === TILE.DIRT && rand() < 0.02) rocks.push([x, y]);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, this.groundMat);
    ground.receiveShadow = true;
    ground.name = 'ground';
    group.add(ground);

    if (lv > 0) {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lavaPos, 3));
      lg.setIndex(lavaIdx);
      group.add(new THREE.Mesh(lg, this.lavaMat));
    }

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const cc = new THREE.Color();

    // 3D-Mauern (Häuser, Festungen, Ruinen) – getönt je Gebäudeart
    if (walls.length) {
      const mesh = new THREE.InstancedMesh(this.wallGeo, this.wallMat, walls.length);
      walls.forEach(([x, y], i) => {
        m4.compose(new THREE.Vector3(x, this.groundY(x, y) + 0.95, y), q.identity(), new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m4);
        const kind = this.wallKind.get(x + ',' + y);
        cc.setHex(this.wallKindColor[kind] || 0x9a8a76).multiplyScalar(0.9 + rand() * 0.18);
        mesh.setColorAt(i, cc);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }

    if (trees.length) {
      const trunks = new THREE.InstancedMesh(this.trunkGeo, this.trunkMat, trees.length);
      const round = trees.filter(() => rand() < 0.35);
      const cones = trees.length - round.length;
      const crowns = new THREE.InstancedMesh(this.crownGeo, this.crownMat, trees.length);
      let ci = 0;
      trees.forEach(([x, y], i) => {
        const gy = this.groundY(x, y);
        const ox = (rand() - 0.5) * 0.4, oz = (rand() - 0.5) * 0.4;
        const s = 0.85 + rand() * 0.5;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        m4.compose(new THREE.Vector3(x + ox, gy + 0.4 * s, y + oz), q, new THREE.Vector3(s, s, s));
        trunks.setMatrixAt(i, m4);
        m4.compose(new THREE.Vector3(x + ox, gy + 1.55 * s, y + oz), q, new THREE.Vector3(s, s, s));
        crowns.setMatrixAt(ci, m4);
        cc.setHSL(0.29 + rand() * 0.07, 0.45 + rand() * 0.25, 0.24 + rand() * 0.12);
        crowns.setColorAt(ci, cc);
        ci++;
      });
      void cones;
      trunks.castShadow = crowns.castShadow = true;
      group.add(trunks, crowns);
    }
    if (rocks.length) {
      const mesh = new THREE.InstancedMesh(this.rockGeo, this.rockMat, rocks.length);
      rocks.forEach(([x, y], i) => {
        const s = 0.6 + rand() * 0.9;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        m4.compose(new THREE.Vector3(x, this.groundY(x, y) + 0.15 * s, y), q, new THREE.Vector3(s, s * 0.7, s));
        mesh.setMatrixAt(i, m4);
      });
      mesh.castShadow = true;
      group.add(mesh);
    }
    if (graves.length) {
      const mesh = new THREE.InstancedMesh(this.graveGeo, this.graveMat, graves.length);
      graves.forEach(([x, y], i) => {
        q.setFromAxisAngle(up, (rand() - 0.5) * 0.5);
        m4.compose(new THREE.Vector3(x, this.groundY(x, y) + 0.27, y), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m4);
      });
      mesh.castShadow = true;
      group.add(mesh);
    }
    if (tufts.length) {
      const mesh = new THREE.InstancedMesh(this.tuftGeo, this.tuftMat, tufts.length);
      tufts.forEach(([x, y], i) => {
        const s = 0.7 + rand() * 0.8;
        q.setFromAxisAngle(up, rand() * Math.PI);
        m4.compose(new THREE.Vector3(x + (rand() - 0.5) * 0.7, this.groundY(x, y) + 0.12 * s, y + (rand() - 0.5) * 0.7), q, new THREE.Vector3(s, s, s));
        mesh.setMatrixAt(i, m4);
        cc.setHSL(0.3, 0.5, 0.24 + rand() * 0.12);
        mesh.setColorAt(i, cc);
      });
      group.add(mesh);
    }
    if (flowers.length) {
      const mesh = new THREE.InstancedMesh(this.flowerGeo, this.flowerMat, flowers.length);
      const palette = [0xe84a5a, 0xe8d24a, 0xa85ae8, 0xffffff, 0xff9a3a];
      flowers.forEach(([x, y], i) => {
        m4.compose(new THREE.Vector3(x + (rand() - 0.5) * 0.6, this.groundY(x, y) + 0.12, y + (rand() - 0.5) * 0.6), q.identity(), new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m4);
        cc.setHex(palette[Math.floor(rand() * palette.length)]);
        mesh.setColorAt(i, cc);
      });
      group.add(mesh);
    }

    // Straßenlaternen: Pfahl + Glüh-Sprite (teilen sich das Nacht-Material)
    for (const [x, y] of lanterns) {
      const gy = this.groundY(x, y);
      const pole = new THREE.Mesh(this.lanternPoleGeo, this.lanternPoleMat);
      pole.position.set(x, gy + 0.75, y);
      pole.castShadow = true;
      const glow = new THREE.Sprite(this.lanternGlowMat);
      glow.position.set(x, gy + 1.55, y);
      glow.scale.set(1.6, 1.6, 1);
      group.add(pole, glow);
    }

    // Treppen: sichtbare Stufen (runter = dunkle Stufen in die Grube,
    // rauf = helle, ansteigende Stufen)
    for (const [x, y] of stairsDown) {
      const gy = this.groundY(x, y);
      for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(this.stairGeo, this.stairDownMat);
        step.position.set(x, gy + 0.05 - i * 0.045, y - 0.28 + i * 0.28);
        group.add(step);
      }
    }
    for (const [x, y] of stairsUp) {
      const gy = this.groundY(x, y);
      for (let i = 0; i < 3; i++) {
        const step = new THREE.Mesh(this.stairGeo, this.stairUpMat);
        step.position.set(x, gy + 0.06 + i * 0.09, y - 0.28 + i * 0.28);
        group.add(step);
      }
    }

    // Wandfackeln in den Höhlen: schräger Stab an der Felswand + warmes
    // Glüh-Sprite (geteiltes Material, leuchtet dauerhaft)
    const torchSpots = [];
    for (const [x, y, dx, dy] of caveTorches) {
      const floorY = this.heightAt(x + dx, y + dy) * H_STEP;
      const px = x + dx * 0.58, pz = y + dy * 0.58;
      const stick = new THREE.Mesh(this.caveTorchGeo, this.caveTorchMat);
      stick.position.set(px, floorY + 1.0, pz);
      stick.rotation.z = dx * 0.45;
      stick.rotation.x = -dy * 0.45;
      const flame = new THREE.Sprite(this.caveFlameMat);
      flame.position.set(px + dx * 0.12, floorY + 1.38, pz + dy * 0.12);
      flame.scale.set(2.2, 2.2, 1);
      group.add(stick, flame);
      torchSpots.push([px, floorY + 1.3, pz]);
    }

    return { cx, cy, group, torchSpots };
  }

  // ================= WASSER (folgt dem Spieler) =================
  _buildWater() {
    const geo = new THREE.PlaneGeometry(140, 140, 48, 48);
    geo.rotateX(-Math.PI / 2);
    this.waterGeo = geo;
    this.waterBase = Float32Array.from(geo.attributes.position.array);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x2e78ac, transparent: true, opacity: 0.78, shininess: 140, specular: 0xaad4ee,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(0, 0.3, 0);
    this.surfaceGroup.add(this.water);
  }

  // ================= GEBÄUDE-DÄCHER + DETAILS =================
  // Wände kommen aus den Kacheln (begehbar!), hier Dächer, Fenster,
  // Türen und Schornsteine. Steht der eigene Held im Haus, wird das
  // Dach ausgeblendet.
  _buildBuildings() {
    const roofMats = {
      temple: new THREE.MeshLambertMaterial({ color: 0x3a6ea8 }),
      shop: new THREE.MeshLambertMaterial({ color: 0x8a4a2a }),
    };
    // Wohnhäuser bekommen abwechslungsreiche Dachfarben
    const housePalette = [0x9a3f2f, 0x7a5a2f, 0x4a6a8a, 0x8a4a6a].map(
      (c) => new THREE.MeshLambertMaterial({ color: c }),
    );
    this.roofs = [];
    const windowT = []; // Transformationen für Instanzen sammeln
    const doorT = [];
    const chimneyT = [];
    let houseIdx = 0;
    for (const b of this.buildings) {
      const cx = b.x + b.w / 2 - 0.5;
      const cz = b.y + b.h / 2 - 0.5;
      const gy = this.groundY(b.doorX ?? b.x, b.y + b.h - 1);
      const wallH = 1.9;
      const roofH = b.kind === 'temple' ? 1.6 : 1.1;
      const roofR = Math.sqrt(b.w * b.w + b.h * b.h) / 2;
      const roofMat = roofMats[b.kind] || housePalette[houseIdx++ % housePalette.length];
      const roof = new THREE.Mesh(new THREE.ConeGeometry(roofR, roofH, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((b.w + 0.7) / (roofR * Math.SQRT2), 1, (b.h + 0.7) / (roofR * Math.SQRT2));
      roof.position.set(cx, gy + wallH + roofH / 2, cz);
      roof.castShadow = true;
      this.surfaceGroup.add(roof);
      this.roofs.push({ roof, b });

      // Fenster an Süd- und Nordwand (jede zweite Kachel, Tür ausgespart)
      const wy = gy + 1.15;
      for (let x = b.x + 1; x < b.x + b.w - 1; x += 2) {
        if (x !== b.doorX) windowT.push([x, wy, b.y + b.h - 1 + 0.52, 0]);
        windowT.push([x, wy, b.y - 0.52, Math.PI]);
      }
      // Fenster an Ost/West bei größeren Gebäuden
      if (b.h > 4) {
        for (let y = b.y + 1; y < b.y + b.h - 1; y += 2) {
          windowT.push([b.x - 0.52, wy, y, -Math.PI / 2]);
          windowT.push([b.x + b.w - 1 + 0.52, wy, y, Math.PI / 2]);
        }
      }
      // Holztür am Eingang
      if (b.doorX !== undefined) doorT.push([b.doorX, gy + 0.8, b.y + b.h - 1 + 0.53, 0]);
      // Schornstein auf Häusern und Läden
      if (b.kind !== 'temple') chimneyT.push([b.x + 1, gy + wallH + roofH * 0.55, b.y + 1]);

      // Wehende Fahne auf jedem Tempel
      if (b.kind === 'temple') {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5),
          new THREE.MeshLambertMaterial({ color: 0x8a7a5a }),
        );
        pole.position.set(cx, gy + wallH + roofH + 0.7, cz);
        const flagGeo = new THREE.PlaneGeometry(1.0, 0.55, 8, 1);
        const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: 0xc8a030, side: THREE.DoubleSide }));
        flag.position.set(cx + 0.52, gy + wallH + roofH + 1.2, cz);
        this.surfaceGroup.add(pole, flag);
        if (!this.flagsList) this.flagsList = [];
        this.flagsList.push({ flag, base: Float32Array.from(flagGeo.attributes.position.array) });
      }
    }

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    // Warm leuchtende Fenster (wirken abends bewohnt)
    if (windowT.length) {
      const winMesh = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.42, 0.52),
        new THREE.MeshBasicMaterial({ color: 0xffd98a, side: THREE.DoubleSide }),
        windowT.length,
      );
      windowT.forEach(([x, y, z, rot], i) => {
        q.setFromAxisAngle(up, rot);
        m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
        winMesh.setMatrixAt(i, m4);
      });
      this.surfaceGroup.add(winMesh);
    }
    if (doorT.length) {
      const doorMesh = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(0.75, 1.5),
        new THREE.MeshLambertMaterial({ color: 0x5a3a1c, side: THREE.DoubleSide }),
        doorT.length,
      );
      doorT.forEach(([x, y, z, rot], i) => {
        q.setFromAxisAngle(up, rot);
        m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
        doorMesh.setMatrixAt(i, m4);
      });
      this.surfaceGroup.add(doorMesh);
    }
    if (chimneyT.length) {
      const chimMesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.36, 1.0, 0.36),
        new THREE.MeshLambertMaterial({ color: 0x8a7264 }),
        chimneyT.length,
      );
      chimneyT.forEach(([x, y, z], i) => {
        m4.compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(1, 1, 1));
        chimMesh.setMatrixAt(i, m4);
      });
      chimMesh.castShadow = true;
      this.surfaceGroup.add(chimMesh);
    }
  }

  // Dach des Gebäudes ausblenden, in dem der Spieler steht
  updateRoofs(px, py) {
    for (const { roof, b } of this.roofs) {
      const inside = px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
      roof.visible = !inside;
    }
  }

  // ================= STADT-DEKO: Fackeln + Springbrunnen =================
  _buildTownDeco() {
    this.flames = [];
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.4, 5);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 });
    const mkFlame = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const g = ctx.createRadialGradient(16, 18, 2, 16, 16, 15);
      g.addColorStop(0, 'rgba(255,240,180,1)');
      g.addColorStop(0.4, 'rgba(255,150,40,0.9)');
      g.addColorStop(1, 'rgba(255,80,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      return new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
    };
    for (const t of this.towns) {
      for (const [ox, oy] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
        const x = t.cx + ox, y = t.cy + oy;
        const gy = this.groundY(x, y);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, gy + 0.7, y);
        pole.castShadow = true;
        this.surfaceGroup.add(pole);
        const fl = mkFlame();
        fl.position.set(x, gy + 1.55, y);
        fl.scale.set(0.5, 0.6, 1);
        this.surfaceGroup.add(fl);
        this.flames.push({ sp: fl, seed: Math.random() * 10 });
      }
    }
    // Springbrunnen
    this.fountainJets = [];
    for (const f of this.fountainList) {
      const gy = this.groundY(f.x, f.y) + H_STEP; // FOUNTAIN-Kachel
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.6, 0.3, 10),
        new THREE.MeshLambertMaterial({ color: 0x9aa8b8 }),
      );
      basin.position.set(f.x, gy + 0.15 - H_STEP, f.y);
      basin.castShadow = true;
      const waterDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.48, 0.06, 10),
        new THREE.MeshPhongMaterial({ color: 0x4a9ad8, transparent: true, opacity: 0.85, shininess: 100 }),
      );
      waterDisc.position.set(f.x, gy + 0.28 - H_STEP, f.y);
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6),
        new THREE.MeshLambertMaterial({ color: 0x8a98a8 }),
      );
      column.position.set(f.x, gy + 0.5 - H_STEP, f.y);
      this.surfaceGroup.add(basin, waterDisc, column);
      // Wasserstrahl-Partikel
      const N = 40;
      const posArr = new Float32Array(N * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xbfe8ff, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false,
      }));
      this.surfaceGroup.add(pts);
      this.fountainJets.push({ pts, x: f.x, y: f.y, gy: gy - H_STEP, phases: Array.from({ length: N }, () => Math.random()) });
    }

    // Marktstände: bunte Dächer, Theke und Fässer auf jeder Plaza
    const stallColors = [0xc23b3b, 0x3b6cc2, 0x2fae4e, 0xd8a93a];
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 5);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x6a4a26 });
    const barrelGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.55, 8);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
    const crateGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0xa8814e });
    this.towns.forEach((t, ti) => {
      const sx = t.cx + 6, sy = t.cy - 1; // östlich der Plaza
      const gy = this.groundY(sx, sy);
      for (const [ox, oz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(sx + ox, gy + 0.65, sy + oz);
        post.castShadow = true;
        this.surfaceGroup.add(post);
      }
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 0.55, 4),
        new THREE.MeshLambertMaterial({ color: stallColors[ti % stallColors.length] }),
      );
      canopy.rotation.y = Math.PI / 4;
      canopy.position.set(sx, gy + 1.55, sy);
      canopy.castShadow = true;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.5), crateMat);
      counter.position.set(sx, gy + 0.25, sy + 0.7);
      counter.castShadow = true;
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(sx - 1.4, gy + 0.28, sy + 0.9);
      barrel.castShadow = true;
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(sx + 1.4, gy + 0.23, sy + 0.9);
      crate.castShadow = true;
      this.surfaceGroup.add(canopy, counter, barrel, crate);
    });

    // Blumenbeete rund um jeden Brunnen
    const bedFlowerGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const palette = [0xe84a5a, 0xe8d24a, 0xa85ae8, 0xffffff, 0xff9a3a];
    const total = this.fountainList.length * 10;
    if (total) {
      const beds = new THREE.InstancedMesh(bedFlowerGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), total);
      const m4 = new THREE.Matrix4();
      const cc = new THREE.Color();
      let i = 0;
      for (const f of this.fountainList) {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          const x = f.x + Math.cos(a) * 1.6;
          const z = f.y + Math.sin(a) * 1.6;
          m4.makeTranslation(x, this.groundY(Math.round(x), Math.round(z)) + 0.1, z);
          beds.setMatrixAt(i, m4);
          cc.setHex(palette[k % palette.length]);
          beds.setColorAt(i, cc);
          i++;
        }
      }
      this.surfaceGroup.add(beds);
    }
  }

  _buildTownLabels() {
    for (const t of this.towns) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 52px Georgia';
      ctx.textAlign = 'center';
      ctx.lineWidth = 9;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.name, 256, 62);
      ctx.fillStyle = '#e8c165';
      ctx.fillText(t.name, 256, 62);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, depthTest: false, opacity: 0.9,
      }));
      sp.scale.set(7, 1.3, 1);
      sp.position.set(t.cx, 6.5, t.cy);
      sp.renderOrder = 800;
      this.surfaceGroup.add(sp);
    }
  }

  // ================= HIMMEL: Kuppel, Sonne, Mond, Sterne =================
  _buildSky() {
    // Himmels-Kuppel mit weichem Farbverlauf (statt flacher Hintergrundfarbe)
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x6aa8e8) },
      horizonColor: { value: new THREE.Color(0xd8e8f4) },
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vPos;
        void main() {
          float h = clamp(normalize(vPos).y * 1.8 + 0.18, 0.0, 1.0);
          gl_FragColor = vec4(mix(horizonColor, topColor, pow(h, 0.8)), 1.0);
        }`,
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 14), skyMat);
    this.skyDome.frustumCulled = false;
    this.skyDome.renderOrder = -100;
    this.scene.add(this.skyDome);

    const disc = (color, glow) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
      g.addColorStop(0, color);
      g.addColorStop(0.5, glow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false, fog: false,
      }));
    };
    this.sunSprite = disc('rgba(255,250,220,1)', 'rgba(255,200,80,0.6)');
    this.sunSprite.scale.set(14, 14, 1);
    this.moonSprite = disc('rgba(230,235,255,1)', 'rgba(160,180,255,0.4)');
    this.moonSprite.scale.set(8, 8, 1);
    this.scene.add(this.sunSprite, this.moonSprite);

    const N = 350;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const el = Math.random() * Math.PI * 0.45 + 0.12;
      const r = 110;
      pos[i * 3] = Math.cos(a) * Math.cos(el) * r;
      pos[i * 3 + 1] = Math.sin(el) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.35, transparent: true, opacity: 0, depthWrite: false, fog: false,
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.scene.add(this.stars);
  }

  // ================= LEBENDIGE NATUR =================
  _buildAmbient() {
    const rand = mulberry32(777);

    // Schmetterlinge
    this.butterflies = [];
    const bColors = [0xe8a53a, 0x5ab4e8, 0xe85a8a, 0xd8e85a];
    for (let i = 0; i < 20; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: bColors[i % bColors.length], side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
      const wingGeo = new THREE.PlaneGeometry(0.14, 0.1);
      const l = new THREE.Mesh(wingGeo, mat); l.position.x = -0.07;
      const r = new THREE.Mesh(wingGeo, mat); r.position.x = 0.07;
      const lp = new THREE.Group(); lp.add(l);
      const rp = new THREE.Group(); rp.add(r);
      g.add(lp, rp);
      this.surfaceGroup.add(g);
      this.butterflies.push({ g, lp, rp, angle: rand() * Math.PI * 2, speed: 0.6 + rand() * 0.8, phase: rand() * 10 });
    }

    // Vögel
    this.birds = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a33, side: THREE.DoubleSide });
      const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), mat);
      w1.position.x = -0.24; w1.rotation.z = 0.4;
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), mat);
      w2.position.x = 0.24; w2.rotation.z = -0.4;
      g.add(w1, w2);
      g.rotation.x = -Math.PI / 2;
      this.surfaceGroup.add(g);
      this.birds.push({ g, cx: 0, cy: 0, r: 6 + rand() * 10, angle: rand() * Math.PI * 2, h: 13 + rand() * 5, speed: 0.25 + rand() * 0.3, w1, w2 });
    }

    // Wolken
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      for (let b = 0; b < 7; b++) {
        const gx = 20 + rand() * 88, gy = 22 + rand() * 20, gr = 10 + rand() * 14;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        grad.addColorStop(0, 'rgba(255,255,255,0.75)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 64);
      }
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.8, depthWrite: false }));
      const s = 10 + rand() * 14;
      sp.scale.set(s, s * 0.45, 1);
      sp.position.set(rand() * 100 - 50, 26 + rand() * 8, rand() * 100 - 50);
      this.surfaceGroup.add(sp);
      this.clouds.push({ sp, speed: 0.3 + rand() * 0.5 });
    }

    // Glühwürmchen
    const N = 50;
    this.fireflyData = [];
    for (let i = 0; i < N; i++) this.fireflyData.push({ a: rand() * Math.PI * 2, r: 2 + rand() * 12, h: 0.4 + rand() * 1.4, sp: 0.2 + rand() * 0.6 });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.fireflyMat = new THREE.PointsMaterial({ color: 0xd8f860, size: 0.1, transparent: true, opacity: 0, depthWrite: false });
    this.fireflies = new THREE.Points(geo, this.fireflyMat);
    this.surfaceGroup.add(this.fireflies);

    // Fallende Blätter
    this.leaves = [];
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: [0xd8a03a, 0xb8742a, 0x8aa03a][i % 3], side: THREE.DoubleSide, transparent: true, opacity: 0.9,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.12), mat);
      m.visible = false;
      this.surfaceGroup.add(m);
      this.leaves.push({ m, y: 0, phase: rand() * 10, active: false });
    }

    // Kaninchen + Rehe (rein dekorativ, laufen vor Spielern weg)
    this.critters = [];
    const mkRabbit = () => {
      const g = new THREE.Group();
      const c = rand() < 0.5 ? 0xd8d0c0 : 0x9a7e5e;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.24), new THREE.MeshLambertMaterial({ color: c }));
      body.position.y = 0.1; body.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshLambertMaterial({ color: c }));
      head.position.set(0, 0.19, 0.15);
      const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.02), new THREE.MeshLambertMaterial({ color: c }));
      e1.position.set(-0.03, 0.31, 0.14);
      const e2 = e1.clone(); e2.position.x = 0.03;
      g.add(body, head, e1, e2);
      return g;
    };
    const mkDeer = () => {
      const g = new THREE.Group();
      const c = 0xb0824e;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.5), new THREE.MeshLambertMaterial({ color: c }));
      body.position.y = 0.42; body.castShadow = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.2), new THREE.MeshLambertMaterial({ color: c }));
      head.position.set(0, 0.62, 0.3);
      g.add(body, head);
      for (const [lx, lz] of [[-0.08, 0.16], [0.08, 0.16], [-0.08, -0.18], [0.08, -0.18]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.05), new THREE.MeshLambertMaterial({ color: 0x8a6238 }));
        leg.position.set(lx, 0.16, lz);
        g.add(leg);
      }
      const a1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), new THREE.MeshLambertMaterial({ color: 0x6a4a28 }));
      a1.position.set(-0.05, 0.76, 0.28); a1.rotation.z = 0.4;
      const a2 = a1.clone(); a2.position.x = 0.05; a2.rotation.z = -0.4;
      g.add(a1, a2);
      return g;
    };
    for (let i = 0; i < 9; i++) {
      const deer = i >= 6;
      const g = deer ? mkDeer() : mkRabbit();
      g.visible = false;
      this.surfaceGroup.add(g);
      this.critters.push({ g, deer, x: 0, y: 0, tx: 0, ty: 0, timer: 0, hop: rand() * 10, placed: false });
    }

    // Hoftiere (bleiben auf der Koppel) + Katzen/Hunde in den Städten
    this.farmAnimals = [];
    const addFarmAnimal = (type, bounds) => {
      const g = makeAnimal(type);
      const x = bounds.x + 1 + rand() * (bounds.w - 2);
      const y = bounds.y + 1 + rand() * (bounds.h - 2);
      g.position.set(x, this.groundY(Math.round(x), Math.round(y)), y);
      this.surfaceGroup.add(g);
      this.farmAnimals.push({ g, type, bounds, x, y, tx: x, ty: y, timer: rand() * 4, hop: rand() * 10 });
    };
    if (this.farm) {
      const inner = { x: this.farm.x + 1, y: this.farm.y + 1, w: this.farm.w - 2, h: this.farm.h - 8 };
      for (let i = 0; i < 3; i++) addFarmAnimal('horse', inner);
      for (let i = 0; i < 3; i++) addFarmAnimal('cow', inner);
      for (let i = 0; i < 2; i++) addFarmAnimal('goat', inner);
    }
    for (const t of this.towns) {
      const around = { x: t.cx - 8, y: t.cy - 8, w: 16, h: 16 };
      addFarmAnimal('cat', around);
      addFarmAnimal('dog', around);
    }

    this.torch = new THREE.PointLight(0xffaa55, 0, 9, 1.6);
    this.surfaceGroup.add(this.torch);
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xd8e8ff, 0x6a5840, 1.0);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffedc8, 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 90;
    const s = 22;
    this.sun.shadow.camera.left = -s; this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s; this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.scene.fog = new THREE.FogExp2(0xbfd8e8, 0.013);
    this.scene.background = new THREE.Color(0x9ec8e8);
    this._skyDay = new THREE.Color(0x5a9ae0);      // sattes Himmelblau (Zenit)
    this._skyNight = new THREE.Color(0x070b1c);
    this._skyDawn = new THREE.Color(0xd8895a);
    this._horDay = new THREE.Color(0xcfe6f4);      // heller Horizont
    this._horNight = new THREE.Color(0x141a30);
    this._horDawn = new THREE.Color(0xf0b070);
  }

  // ================= UPDATE =================
  update(dt, center) {
    this.time += dt;
    const t = this.time;

    // Chunks nachladen: jeden Frame höchstens 1 neuer Chunk (kein Ruckeln)
    this.ensureChunks(Math.round(center.x), Math.round(center.z));

    // Wasser folgt dem Spieler + Wellen (nur Oberwelt)
    if (this.water.visible) {
      this.water.position.x = center.x;
      this.water.position.z = center.z;
      const p = this.waterGeo.attributes.position;
      const base = this.waterBase;
      const wt = t * 1.4;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3] + center.x, z = base[i * 3 + 2] + center.z;
        p.array[i * 3 + 1] = Math.sin(x * 0.5 + wt) * 0.045 + Math.cos(z * 0.4 + wt * 0.8) * 0.045;
      }
      p.needsUpdate = true;
    }

    this.lavaMat.opacity = 0.7 + Math.sin(t * 3) * 0.2;

    // Tag/Nacht (8 Minuten)
    const cyc = (t % 480) / 480;
    const sunAngle = cyc * Math.PI * 2 - Math.PI / 2;
    let dayness = Math.max(0, Math.sin(cyc * Math.PI * 2));
    const dawn = Math.max(0, 1 - Math.abs(dayness - 0.15) * 6) * (dayness > 0.01 ? 1 : 0);
    let night = Math.max(0, 1 - dayness * 2.5);
    const underground = this.z < 0;

    if (underground) {
      // Unter Tage: konstantes, warmes Fackel-Dämmerlicht – deutlich hell
      // genug zum Spielen, die Stimmung machen Fackeln und Nebel.
      this.sun.intensity = 0.7;
      this.hemi.intensity = 1.5;
      this.hemi.color.setHex(0xe0c4a0);   // warmes Fackel-Licht statt Himmelsblau
      this.scene.background.setHex(0x241d16);
      this.scene.fog.color.setHex(0x2a2318);
      night = 1; dayness = 0;
    } else {
      this.hemi.color.setHex(0xd8e8ff);
      // Nacht deutlich heller (Mondlicht + blaues Ambiente), damit man gut sieht
      this.sun.intensity = 0.5 + dayness * 1.45;
      this.hemi.intensity = 0.72 + dayness * 0.6;
      const sky = this._skyNight.clone().lerp(this._skyDay, dayness);
      if (dawn > 0) sky.lerp(this._skyDawn, dawn * 0.45);
      const horizon = this._horNight.clone().lerp(this._horDay, dayness);
      if (dawn > 0) horizon.lerp(this._horDawn, dawn * 0.7);
      this.scene.background.copy(sky);
      this.scene.fog.color.copy(horizon);
      this.skyUniforms.topColor.value.copy(sky);
      this.skyUniforms.horizonColor.value.copy(horizon);
    }
    this.skyDome.position.set(center.x, 0, center.z);
    this.starMat.opacity = underground ? 0 : night * 0.9;

    const sunX = Math.cos(sunAngle), sunY = Math.sin(sunAngle);
    this.sun.position.set(center.x + sunX * 30, 18 + sunY * 14, center.z + 14);
    this.sun.target.position.copy(center);
    this.sunSprite.position.set(center.x + sunX * 90, 10 + sunY * 60, center.z + 30);
    this.sunSprite.material.opacity = Math.max(0, dayness + 0.15);
    this.moonSprite.position.set(center.x - sunX * 85, 10 - sunY * 55, center.z + 25);
    this.moonSprite.material.opacity = night;
    this.stars.position.set(center.x, 0, center.z);
    this.stars.rotation.y = t * 0.004;

    // Schmetterlinge (tagsüber)
    for (const b of this.butterflies) {
      b.g.visible = dayness > 0.15;
      if (!b.g.visible) continue;
      b.angle += (Math.sin(t * 0.7 + b.phase) * 0.9 + (Math.random() - 0.5)) * dt * 2;
      b.g.position.x += Math.cos(b.angle) * b.speed * dt;
      b.g.position.z += Math.sin(b.angle) * b.speed * dt;
      const gx = Math.round(b.g.position.x), gz = Math.round(b.g.position.z);
      b.g.position.y = this.groundY(gx, gz) + 0.7 + Math.sin(t * 2.2 + b.phase) * 0.25;
      b.g.rotation.y = -b.angle + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.phase) * 0.9;
      b.lp.rotation.z = flap;
      b.rp.rotation.z = -flap;
      if (b.g.position.distanceTo(center) > 45) {
        const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 18;
        b.g.position.set(center.x + Math.cos(a) * r, 1.5, center.z + Math.sin(a) * r);
      }
    }

    // Vögel
    for (const bd of this.birds) {
      bd.angle += bd.speed * dt;
      bd.g.position.set(bd.cx + Math.cos(bd.angle) * bd.r, bd.h, bd.cy + Math.sin(bd.angle) * bd.r);
      const flap = Math.sin(t * 6 + bd.r) * 0.5;
      bd.w1.rotation.z = 0.4 + flap;
      bd.w2.rotation.z = -0.4 - flap;
      if (bd.g.position.distanceTo(center) > 70) {
        bd.cx = center.x + (Math.random() - 0.5) * 50;
        bd.cy = center.z + (Math.random() - 0.5) * 50;
      }
    }

    // Wolken
    for (const c of this.clouds) {
      c.sp.position.x += c.speed * dt;
      if (c.sp.position.x > center.x + 90) c.sp.position.x = center.x - 90;
      if (Math.abs(c.sp.position.z - center.z) > 90) c.sp.position.z = center.z + (Math.random() - 0.5) * 120;
    }

    // Glühwürmchen + Fackel-Licht
    this.fireflyMat.opacity = night * (0.6 + Math.sin(t * 3) * 0.3);
    if (night > 0.01) {
      const fp = this.fireflies.geometry.attributes.position;
      for (let i = 0; i < this.fireflyData.length; i++) {
        const f = this.fireflyData[i];
        const a = f.a + t * f.sp;
        fp.array[i * 3] = center.x + Math.cos(a) * f.r;
        fp.array[i * 3 + 1] = center.y + f.h + Math.sin(t * 1.5 + i) * 0.3;
        fp.array[i * 3 + 2] = center.z + Math.sin(a * 0.9) * f.r;
      }
      fp.needsUpdate = true;
    }
    // Straßenlaternen leuchten nachts (geteiltes Material)
    this.lanternGlowMat.opacity = 0.12 + night * 0.85;

    // Fackel = hell, Utevo Lux = sehr hell und weit.
    // Unter Tage leuchtet die Fackel IMMER (dort ist es ewig dunkel).
    const lb = this.playerLightBoost || 0;
    const lightNeed = underground ? 1.25 : night;
    this.torch.intensity = lightNeed * (lb === 2 ? 5 : lb === 1 ? 3 : 1.2);
    this.torch.distance = lb === 2 ? 24 : lb === 1 ? 14 : 8;
    this.torch.position.set(center.x, center.y + 1.7, center.z);

    // Wandernde Fackel-Lichter: die 3 nächsten Wandfackeln leuchten echt
    // (alle ~0,3 s neu bestimmt, flackern leicht)
    if (underground) {
      this._torchLightAt -= dt;
      if (this._torchLightAt <= 0) {
        this._torchLightAt = 0.3;
        const spots = [];
        for (const [, chunk] of this.chunks) {
          if (!chunk.group.visible || !chunk.torchSpots) continue;
          for (const s of chunk.torchSpots) {
            const d = (s[0] - center.x) * (s[0] - center.x) + (s[2] - center.z) * (s[2] - center.z);
            if (d < 500) spots.push([d, s]);
          }
        }
        spots.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < this.torchLights.length; i++) {
          const l = this.torchLights[i];
          if (spots[i]) {
            const [, s] = spots[i];
            l.position.set(s[0], s[1], s[2]);
            l.visible = true;
          } else l.visible = false;
        }
      }
      for (let i = 0; i < this.torchLights.length; i++) {
        const l = this.torchLights[i];
        if (l.visible) l.intensity = 2.1 + Math.sin(t * 9 + i * 2.1) * 0.4;
      }
    } else {
      for (const l of this.torchLights) l.visible = false;
    }

    // Hoftiere, Katzen und Hunde
    for (const fa of this.farmAnimals) {
      if (Math.abs(fa.x - center.x) > 70 || Math.abs(fa.y - center.z) > 70) { fa.g.visible = false; continue; }
      fa.g.visible = true;
      fa.timer -= dt;
      if (fa.timer <= 0) {
        fa.timer = 2.5 + Math.random() * 5;
        fa.tx = fa.bounds.x + 1 + Math.random() * (fa.bounds.w - 2);
        fa.ty = fa.bounds.y + 1 + Math.random() * (fa.bounds.h - 2);
      }
      const dx = fa.tx - fa.x, dy = fa.ty - fa.y;
      const d = Math.hypot(dx, dy);
      const spd = fa.type === 'cat' || fa.type === 'dog' ? 1.4 : 0.7;
      if (d > 0.1) {
        fa.x += (dx / d) * Math.min(d, spd * dt);
        fa.y += (dy / d) * Math.min(d, spd * dt);
        fa.g.rotation.y = Math.atan2(dx, dy);
        fa.hop += dt * 8;
        const a = fa.g.userData.anim;
        if (a && a.legs) {
          const swing = Math.sin(fa.hop) * 0.5;
          a.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? swing : -swing); });
        }
      }
      fa.g.position.set(fa.x, this.groundY(Math.round(fa.x), Math.round(fa.y)), fa.y);
    }

    // Fackel-Flammen flackern
    for (const f of this.flames) {
      const s = 0.45 + Math.sin(t * 11 + f.seed * 7) * 0.08 + Math.sin(t * 23 + f.seed) * 0.04;
      f.sp.scale.set(s, s * 1.25, 1);
    }

    // Tempel-Fahnen wehen im Wind
    if (this.flagsList) {
      for (const fl of this.flagsList) {
        const pos = fl.flag.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const bx = fl.base[i * 3];
          pos.array[i * 3 + 2] = Math.sin(t * 4 + (bx + 0.5) * 4) * 0.12 * (bx + 0.5);
        }
        pos.needsUpdate = true;
      }
    }

    // Springbrunnen-Strahlen
    for (const j of this.fountainJets) {
      if (Math.abs(j.x - center.x) > 60 || Math.abs(j.y - center.z) > 60) continue;
      const pos = j.pts.geometry.attributes.position;
      for (let i = 0; i < j.phases.length; i++) {
        const ph = (j.phases[i] + t * 0.7) % 1;
        const a = j.phases[i] * Math.PI * 2;
        pos.array[i * 3] = j.x + Math.cos(a) * ph * 0.35;
        pos.array[i * 3 + 1] = j.gy + 0.85 + Math.sin(ph * Math.PI) * 0.5 - ph * 0.3;
        pos.array[i * 3 + 2] = j.y + Math.sin(a) * ph * 0.35;
      }
      pos.needsUpdate = true;
    }

    // Fallende Blätter (nur in Waldnähe)
    for (const lf of this.leaves) {
      if (!lf.active) {
        // neu spawnen: zufällige Position nahe Spieler, wenn dort Bäume sind
        const rx = Math.round(center.x + (Math.random() - 0.5) * 22);
        const rz = Math.round(center.z + (Math.random() - 0.5) * 22);
        if (this.tileAt(rx, rz) === TILE.TREE) {
          lf.active = true;
          lf.m.visible = true;
          lf.y = this.groundY(rx, rz) + 1.8 + Math.random();
          lf.m.position.set(rx + (Math.random() - 0.5), lf.y, rz + (Math.random() - 0.5));
        }
        continue;
      }
      lf.y -= dt * 0.45;
      lf.m.position.y = lf.y;
      lf.m.position.x += Math.sin(t * 2 + lf.phase) * dt * 0.5;
      lf.m.rotation.x = t * 2 + lf.phase;
      lf.m.rotation.y = t * 1.5 + lf.phase;
      const gy = this.groundY(Math.round(lf.m.position.x), Math.round(lf.m.position.z));
      if (lf.y <= gy + 0.05 || lf.m.position.distanceTo(center) > 30) {
        lf.active = false;
        lf.m.visible = false;
      }
    }

    // Kaninchen & Rehe
    for (const cr of this.critters) {
      if (!cr.placed || Math.hypot(cr.x - center.x, cr.y - center.z) > 38) {
        // in Spielernähe auf begehbarer Wiese platzieren
        for (let tries = 0; tries < 6; tries++) {
          const rx = Math.round(center.x + (Math.random() - 0.5) * 50);
          const rz = Math.round(center.z + (Math.random() - 0.5) * 50);
          if (this.tileAt(rx, rz) === TILE.GRASS && Math.hypot(rx - center.x, rz - center.z) > 12) {
            cr.x = rx; cr.y = rz; cr.tx = rx; cr.ty = rz;
            cr.placed = true;
            cr.g.visible = true;
            break;
          }
        }
        if (!cr.placed) { cr.g.visible = false; continue; }
      }
      cr.timer -= dt;
      const distP = Math.hypot(cr.x - center.x, cr.y - center.z);
      if (distP < 4) {
        // Flucht!
        const a = Math.atan2(cr.y - center.z, cr.x - center.x);
        cr.tx = cr.x + Math.cos(a) * 7;
        cr.ty = cr.y + Math.sin(a) * 7;
        cr.timer = 1.5;
      } else if (cr.timer <= 0) {
        cr.timer = 2 + Math.random() * 4;
        const nx = cr.x + (Math.random() - 0.5) * 6;
        const ny = cr.y + (Math.random() - 0.5) * 6;
        if (this.isWalkable(Math.round(nx), Math.round(ny))) { cr.tx = nx; cr.ty = ny; }
      }
      const dx = cr.tx - cr.x, dy = cr.ty - cr.y;
      const d = Math.hypot(dx, dy);
      const speed = distP < 5 ? 3.4 : 1.1;
      if (d > 0.1) {
        cr.x += (dx / d) * Math.min(d, speed * dt);
        cr.y += (dy / d) * Math.min(d, speed * dt);
        cr.g.rotation.y = Math.atan2(dx, dy);
        cr.hop += dt * (cr.deer ? 6 : 12);
      }
      const gy = this.groundY(Math.round(cr.x), Math.round(cr.y));
      const hopY = d > 0.1 && !cr.deer ? Math.abs(Math.sin(cr.hop)) * 0.12 : 0;
      cr.g.position.set(cr.x, gy + hopY, cr.y);
    }
  }
}
