// ---------------------------------------------------------------
// Kiria Online 3D – Welt-Rendering
// Baut aus den Kacheldaten des Servers die 3D-Landschaft:
// Terrain mit Höhenstufen, Wasser, Bäume, Felsen, Gebäude,
// Lava, Gräber sowie Licht + Tag/Nacht-Zyklus.
// ---------------------------------------------------------------
import * as THREE from 'three';

export const TILE = { WATER: 0, SAND: 1, GRASS: 2, TREE: 3, ROCK: 4, ROAD: 5, WALL: 6, LAVA: 7, DIRT: 8, GRAVE: 9 };
export const WALKABLE = new Set([TILE.SAND, TILE.GRASS, TILE.ROAD, TILE.DIRT, TILE.GRAVE]);
export const H_STEP = 0.45;

const TILE_COLORS = {
  [TILE.WATER]: 0x1c4f7d, [TILE.SAND]: 0xd8c07a, [TILE.GRASS]: 0x4d9040,
  [TILE.TREE]: 0x3f7a35,  [TILE.ROCK]: 0x8d8d92, [TILE.ROAD]: 0xa39a83,
  [TILE.WALL]: 0x6b5b4a,  [TILE.LAVA]: 0x2a1a12, [TILE.DIRT]: 0x7d5f3a,
  [TILE.GRAVE]: 0x6f5a40,
};

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
    this.tiles = data.tiles;
    this.heights = data.heights;
    this.buildings = data.buildings;
    this.towns = data.towns || [];
    this.time = 100; // Start am Vormittag (Tag/Nacht-Zyklus: 480 s)

    this._buildTerrain();
    this._buildWater();
    this._buildVegetation();
    this._buildDecor();
    this._buildBuildings();
    this._buildTownLabels();
    this._buildAmbient();
    this._buildLights();
  }

  idx(x, y) { return y * this.size + x; }
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

  // ---------- Terrain als ein großes Mesh mit Vertexfarben ----------
  _buildTerrain() {
    const rand = mulberry32(7);
    const pos = [], col = [], idxArr = [];
    const c = new THREE.Color();
    let v = 0;

    const pushQuad = (p1, p2, p3, p4, color, shade) => {
      pos.push(...p1, ...p2, ...p3, ...p4);
      c.setHex(color).multiplyScalar(shade);
      for (let i = 0; i < 4; i++) col.push(c.r, c.g, c.b);
      idxArr.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    };

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const t = this.tiles[this.idx(x, y)];
        const h = this.heights[this.idx(x, y)] * H_STEP;
        const base = TILE_COLORS[t];
        const vary = 0.92 + rand() * 0.16;
        // Deckfläche
        pushQuad(
          [x - 0.5, h, y - 0.5], [x - 0.5, h, y + 0.5],
          [x + 0.5, h, y + 0.5], [x + 0.5, h, y - 0.5],
          base, vary,
        );
        // Seitenwände zu niedrigeren Nachbarn (Klippen-Optik)
        const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of nbs) {
          const nh = this.heightAt(x + dx, y + dy) * H_STEP;
          if (nh < h) {
            const sx = dx !== 0 ? x + dx * 0.5 : null;
            const sy = dy !== 0 ? y + dy * 0.5 : null;
            const shade = 0.5 + rand() * 0.08;
            const cliffCol = t === TILE.ROCK ? 0x6a6a70 : 0x6e5638;
            if (dx !== 0) {
              pushQuad([sx, h, y - 0.5], [sx, h, y + 0.5], [sx, nh, y + 0.5], [sx, nh, y - 0.5], cliffCol, shade);
            } else {
              pushQuad([x - 0.5, h, sy], [x + 0.5, h, sy], [x + 0.5, nh, sy], [x - 0.5, nh, sy], cliffCol, shade);
            }
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.ground = new THREE.Mesh(geo, mat);
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    // Lava-Glühen als separates Overlay
    const lavaPos = [], lavaIdx = [];
    let lv = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.tiles[this.idx(x, y)] !== TILE.LAVA) continue;
        const h = this.heights[this.idx(x, y)] * H_STEP + 0.03;
        lavaPos.push(x - 0.5, h, y - 0.5, x - 0.5, h, y + 0.5, x + 0.5, h, y + 0.5, x + 0.5, h, y - 0.5);
        lavaIdx.push(lv, lv + 1, lv + 2, lv, lv + 2, lv + 3);
        lv += 4;
      }
    }
    if (lv > 0) {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(lavaPos, 3));
      lg.setIndex(lavaIdx);
      this.lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.85 });
      this.scene.add(new THREE.Mesh(lg, this.lavaMat));
    }
  }

  // ---------- Wasser (animierte Fläche) ----------
  _buildWater() {
    const geo = new THREE.PlaneGeometry(this.size + 40, this.size + 40, 48, 48);
    geo.rotateX(-Math.PI / 2);
    this.waterGeo = geo;
    this.waterBase = Float32Array.from(geo.attributes.position.array);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2b6b9e, transparent: true, opacity: 0.78 });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(this.size / 2 - 0.5, 0.3, this.size / 2 - 0.5);
    this.scene.add(this.water);
  }

  // ---------- Bäume, Felsen, Gräber (instanziert) ----------
  _buildVegetation() {
    const rand = mulberry32(99);
    const trees = [], rocks = [], graves = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const t = this.tiles[this.idx(x, y)];
        if (t === TILE.TREE) trees.push([x, y]);
        else if (t === TILE.ROCK && rand() < 0.3) rocks.push([x, y]);
        else if (t === TILE.GRAVE) graves.push([x, y]);
      }
    }

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    // Baumstämme
    const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.8, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3d22 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
    // Baumkronen
    const crownGeo = new THREE.ConeGeometry(0.55, 1.5, 6);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0x2f6e2a });
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, trees.length);
    const crownColor = new THREE.Color();

    trees.forEach(([x, y], i) => {
      const gy = this.groundY(x, y);
      const ox = (rand() - 0.5) * 0.4, oz = (rand() - 0.5) * 0.4;
      const s = 0.85 + rand() * 0.5;
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      m4.compose(new THREE.Vector3(x + ox, gy + 0.4 * s, y + oz), q, new THREE.Vector3(s, s, s));
      trunks.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x + ox, gy + (0.8 + 0.75) * s, y + oz), q, new THREE.Vector3(s, s, s));
      crowns.setMatrixAt(i, m4);
      crownColor.setHSL(0.29 + rand() * 0.06, 0.45 + rand() * 0.2, 0.26 + rand() * 0.1);
      crowns.setColorAt(i, crownColor);
    });
    trunks.castShadow = crowns.castShadow = true;
    this.scene.add(trunks, crowns);

    // Felsbrocken
    if (rocks.length) {
      const rockGeo = new THREE.DodecahedronGeometry(0.4, 0);
      const rockMat = new THREE.MeshLambertMaterial({ color: 0x77777d });
      const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
      rocks.forEach(([x, y], i) => {
        const s = 0.6 + rand() * 0.9;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        m4.compose(new THREE.Vector3(x, this.groundY(x, y) + 0.15 * s, y), q, new THREE.Vector3(s, s * 0.7, s));
        rocksMesh.setMatrixAt(i, m4);
      });
      rocksMesh.castShadow = true;
      this.scene.add(rocksMesh);
    }

    // Grabsteine
    if (graves.length) {
      const gGeo = new THREE.BoxGeometry(0.34, 0.55, 0.12);
      const gMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa0 });
      const gMesh = new THREE.InstancedMesh(gGeo, gMat, graves.length);
      graves.forEach(([x, y], i) => {
        q.setFromAxisAngle(up, (rand() - 0.5) * 0.5);
        m4.compose(new THREE.Vector3(x, this.groundY(x, y) + 0.27, y), q, new THREE.Vector3(1, 1, 1));
        gMesh.setMatrixAt(i, m4);
      });
      gMesh.castShadow = true;
      this.scene.add(gMesh);
    }
  }

  // ---------- Grasbüschel + Blumen ----------
  _buildDecor() {
    const rand = mulberry32(4242);
    const tufts = [], flowers = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.tiles[this.idx(x, y)] !== TILE.GRASS) continue;
        const r = rand();
        if (r < 0.10) tufts.push([x, y]);
        else if (r < 0.125) flowers.push([x, y]);
      }
    }
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    if (tufts.length) {
      const geo = new THREE.ConeGeometry(0.07, 0.28, 4);
      const mat = new THREE.MeshLambertMaterial({ color: 0x3f8a34 });
      const mesh = new THREE.InstancedMesh(geo, mat, tufts.length);
      const c = new THREE.Color();
      tufts.forEach(([x, y], i) => {
        const s = 0.7 + rand() * 0.8;
        q.setFromAxisAngle(up, rand() * Math.PI);
        m4.compose(
          new THREE.Vector3(x + (rand() - 0.5) * 0.7, this.groundY(x, y) + 0.12 * s, y + (rand() - 0.5) * 0.7),
          q, new THREE.Vector3(s, s, s),
        );
        mesh.setMatrixAt(i, m4);
        c.setHSL(0.3, 0.5, 0.24 + rand() * 0.12);
        mesh.setColorAt(i, c);
      });
      this.scene.add(mesh);
    }

    if (flowers.length) {
      const geo = new THREE.SphereGeometry(0.05, 5, 4);
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new THREE.InstancedMesh(geo, mat, flowers.length);
      const palette = [0xe84a5a, 0xe8d24a, 0xa85ae8, 0xffffff, 0xff9a3a];
      const c = new THREE.Color();
      flowers.forEach(([x, y], i) => {
        m4.compose(
          new THREE.Vector3(x + (rand() - 0.5) * 0.6, this.groundY(x, y) + 0.12, y + (rand() - 0.5) * 0.6),
          q.identity(), new THREE.Vector3(1, 1, 1),
        );
        mesh.setMatrixAt(i, m4);
        c.setHex(palette[Math.floor(rand() * palette.length)]);
        mesh.setColorAt(i, c);
      });
      this.scene.add(mesh);
    }
  }

  // ---------- Stadtnamen ----------
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
      this.scene.add(sp);
    }
  }

  // ---------- Lebendige Welt: Schmetterlinge, Vögel, Wolken, Glühwürmchen ----------
  _buildAmbient() {
    const rand = mulberry32(777);

    // Schmetterlinge
    this.butterflies = [];
    const bColors = [0xe8a53a, 0x5ab4e8, 0xe85a8a, 0xd8e85a];
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        color: bColors[i % bColors.length], side: THREE.DoubleSide, transparent: true, opacity: 0.95,
      });
      const wingGeo = new THREE.PlaneGeometry(0.14, 0.1);
      const l = new THREE.Mesh(wingGeo, mat); l.position.x = -0.07;
      const r = new THREE.Mesh(wingGeo, mat); r.position.x = 0.07;
      const lp = new THREE.Group(); lp.add(l);
      const rp = new THREE.Group(); rp.add(r);
      g.add(lp, rp);
      g.position.set(rand() * this.size, 1.5, rand() * this.size);
      this.scene.add(g);
      this.butterflies.push({
        g, lp, rp,
        angle: rand() * Math.PI * 2,
        speed: 0.6 + rand() * 0.8,
        phase: rand() * 10,
      });
    }

    // Vögel (hoch am Himmel kreisend)
    this.birds = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0x2a2a33, side: THREE.DoubleSide });
      const w1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), mat);
      w1.position.x = -0.24; w1.rotation.z = 0.4;
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), mat);
      w2.position.x = 0.24; w2.rotation.z = -0.4;
      g.add(w1, w2);
      g.rotation.x = -Math.PI / 2;
      this.scene.add(g);
      this.birds.push({
        g, cx: rand() * this.size, cy: rand() * this.size,
        r: 6 + rand() * 10, angle: rand() * Math.PI * 2,
        h: 13 + rand() * 5, speed: 0.25 + rand() * 0.3, w1, w2,
      });
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
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.8, depthWrite: false,
      }));
      const s = 10 + rand() * 14;
      sp.scale.set(s, s * 0.45, 1);
      sp.position.set(rand() * this.size, 26 + rand() * 8, rand() * this.size);
      this.scene.add(sp);
      this.clouds.push({ sp, speed: 0.3 + rand() * 0.5 });
    }

    // Glühwürmchen (nachts, um den Spieler herum)
    const N = 50;
    const pos = new Float32Array(N * 3);
    this.fireflyData = [];
    for (let i = 0; i < N; i++) {
      this.fireflyData.push({ a: rand() * Math.PI * 2, r: 2 + rand() * 12, h: 0.4 + rand() * 1.4, sp: 0.2 + rand() * 0.6 });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflyMat = new THREE.PointsMaterial({
      color: 0xc8e858, size: 0.09, transparent: true, opacity: 0, depthWrite: false,
    });
    this.fireflies = new THREE.Points(geo, this.fireflyMat);
    this.scene.add(this.fireflies);

    // Fackellicht des Spielers (nachts)
    this.torch = new THREE.PointLight(0xffaa55, 0, 9, 1.6);
    this.scene.add(this.torch);
  }

  // ---------- Gebäude mit Dächern ----------
  _buildBuildings() {
    const wallMats = {
      temple: new THREE.MeshLambertMaterial({ color: 0xcfc8b8 }),
      shop: new THREE.MeshLambertMaterial({ color: 0xb89a6a }),
      house: new THREE.MeshLambertMaterial({ color: 0xa8886a }),
    };
    const roofMats = {
      temple: new THREE.MeshLambertMaterial({ color: 0x3a6ea8 }),
      shop: new THREE.MeshLambertMaterial({ color: 0x8a4a2a }),
      house: new THREE.MeshLambertMaterial({ color: 0x9a3f2f }),
    };
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x3a2a18 });

    for (const b of this.buildings) {
      const cx = b.x + b.w / 2 - 0.5;
      const cz = b.y + b.h / 2 - 0.5;
      const gy = this.groundY(b.x, b.y);
      const wallH = b.kind === 'temple' ? 2.6 : 1.8;

      const walls = new THREE.Mesh(new THREE.BoxGeometry(b.w, wallH, b.h), wallMats[b.kind]);
      walls.position.set(cx, gy + wallH / 2, cz);
      walls.castShadow = walls.receiveShadow = true;
      this.scene.add(walls);

      // Pyramiden-Dach (4-seitiger Kegel), knapper Überstand
      const roofH = b.kind === 'temple' ? 1.6 : 1.1;
      const roofR = Math.sqrt(b.w * b.w + b.h * b.h) / 2;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(roofR, roofH, 4), roofMats[b.kind]);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set((b.w + 0.7) / (roofR * Math.SQRT2), 1, (b.h + 0.7) / (roofR * Math.SQRT2));
      roof.position.set(cx, gy + wallH + roofH / 2, cz);
      roof.castShadow = true;
      this.scene.add(roof);

      // Tür an der Südseite
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), doorMat);
      door.position.set(cx, gy + 0.55, b.y + b.h - 0.5 + 0.51);
      this.scene.add(door);
    }
  }

  // ---------- Licht + Tag/Nacht ----------
  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xcfe5ff, 0x5a4a35, 0.9);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 5;
    this.sun.shadow.camera.far = 90;
    const s = 22;
    this.sun.shadow.camera.left = -s; this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s; this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.scene.fog = new THREE.FogExp2(0xbfd8e8, 0.016);
    this.scene.background = new THREE.Color(0x9ec8e8);
    this._skyDay = new THREE.Color(0x9ec8e8);
    this._skyNight = new THREE.Color(0x0a0f22);
    this._skyDawn = new THREE.Color(0xd8996a);
  }

  // dt in Sekunden; center = Spielerposition (Vector3)
  update(dt, center) {
    this.time += dt;

    // Wasserwellen
    const p = this.waterGeo.attributes.position;
    const base = this.waterBase;
    const t = this.time * 1.4;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.array[i * 3 + 1] = Math.sin(x * 0.5 + t) * 0.045 + Math.cos(z * 0.4 + t * 0.8) * 0.045;
    }
    p.needsUpdate = true;

    // Lava pulsieren
    if (this.lavaMat) this.lavaMat.opacity = 0.7 + Math.sin(this.time * 3) * 0.2;

    // Tag/Nacht-Zyklus (8 Minuten)
    const cyc = (this.time % 480) / 480;          // 0..1
    const sunAngle = cyc * Math.PI * 2 - Math.PI / 2;
    const dayness = Math.max(0, Math.sin(cyc * Math.PI * 2)); // 1 = Mittag, 0 = Nacht
    const dawn = Math.max(0, 1 - Math.abs(dayness - 0.15) * 6) * (dayness > 0.01 ? 1 : 0);

    this.sun.intensity = 0.15 + dayness * 1.5;
    this.hemi.intensity = 0.25 + dayness * 0.75;
    const sky = this._skyNight.clone().lerp(this._skyDay, dayness);
    if (dawn > 0) sky.lerp(this._skyDawn, dawn * 0.5);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);

    if (center) {
      this.sun.position.set(
        center.x + Math.cos(sunAngle) * 30,
        18 + Math.sin(sunAngle) * 14,
        center.z + 14,
      );
      this.sun.target.position.copy(center);

      // Schmetterlinge flattern umher
      for (const b of this.butterflies) {
        b.angle += (Math.sin(this.time * 0.7 + b.phase) * 0.9 + (Math.random() - 0.5)) * dt * 2;
        b.g.position.x += Math.cos(b.angle) * b.speed * dt;
        b.g.position.z += Math.sin(b.angle) * b.speed * dt;
        const gx = Math.round(b.g.position.x), gz = Math.round(b.g.position.z);
        b.g.position.y = this.groundY(gx, gz) + 0.7 + Math.sin(this.time * 2.2 + b.phase) * 0.25;
        b.g.rotation.y = -b.angle + Math.PI / 2;
        const flap = Math.sin(this.time * 18 + b.phase) * 0.9;
        b.lp.rotation.z = flap;
        b.rp.rotation.z = -flap;
        // Zu weit weg? In Spielernähe neu erscheinen
        if (b.g.position.distanceTo(center) > 45) {
          const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 18;
          b.g.position.set(center.x + Math.cos(a) * r, 1.5, center.z + Math.sin(a) * r);
        }
      }

      // Vögel kreisen am Himmel
      for (const bd of this.birds) {
        bd.angle += bd.speed * dt;
        bd.g.position.set(
          bd.cx + Math.cos(bd.angle) * bd.r,
          bd.h,
          bd.cy + Math.sin(bd.angle) * bd.r,
        );
        const flap = Math.sin(this.time * 6 + bd.r) * 0.5;
        bd.w1.rotation.z = 0.4 + flap;
        bd.w2.rotation.z = -0.4 - flap;
        if (bd.g.position.distanceTo(center) > 70) {
          bd.cx = center.x + (Math.random() - 0.5) * 50;
          bd.cy = center.z + (Math.random() - 0.5) * 50;
        }
      }

      // Wolken ziehen
      for (const c of this.clouds) {
        c.sp.position.x += c.speed * dt;
        if (c.sp.position.x > center.x + 90) c.sp.position.x = center.x - 90;
        if (Math.abs(c.sp.position.z - center.z) > 90) c.sp.position.z = center.z + (Math.random() - 0.5) * 120;
      }

      // Glühwürmchen + Fackel bei Nacht
      const night = Math.max(0, 1 - dayness * 2.5);
      this.fireflyMat.opacity = night * (0.6 + Math.sin(this.time * 3) * 0.3);
      if (night > 0.01) {
        const pos = this.fireflies.geometry.attributes.position;
        for (let i = 0; i < this.fireflyData.length; i++) {
          const f = this.fireflyData[i];
          const a = f.a + this.time * f.sp;
          pos.array[i * 3] = center.x + Math.cos(a) * f.r;
          pos.array[i * 3 + 1] = center.y + f.h + Math.sin(this.time * 1.5 + i) * 0.3;
          pos.array[i * 3 + 2] = center.z + Math.sin(a * 0.9) * f.r;
        }
        pos.needsUpdate = true;
      }
      this.torch.intensity = night * 1.6;
      this.torch.position.set(center.x, center.y + 1.7, center.z);
    }
  }
}
