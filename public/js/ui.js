// ---------------------------------------------------------------
// Kiria Online 3D – Benutzeroberfläche (HUD, v5)
// Statusbalken, Buffs, Tier-Anzeige, berufsabhängige Hotbar,
// Chat, Inventar mit 5 Ausrüstungs-Slots, Shop, NPC-Dialoge,
// Minimap und Todesbildschirm.
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);

let defs = null;
let you = null;
let handlers = {};
let shopOpen = false;
let buffExpiry = { atk: 0, def: 0 };

const TILE_MINI_COLORS = [
  '#1c4f7d', '#d8c07a', '#4d9040', '#2f6e2a', '#8d8d92',
  '#a39a83', '#6b5b4a', '#ff5a10', '#7d5f3a', '#6f5a40', '#9aa8b8',
];

const SPELL_ICONS = {
  exura: '💚', exura_gran: '💖',
  exori: '🌪️', exori_gran: '⚔️', utito: '💢',
  exori_san: '✨', exevo_san: '🌟', utamo: '🛡️',
  exori_flam: '🔥', exori_vis: '⚡', exevo_gran: '💥', exevo_mas: '☄️',
  utevo_bestia: '🐾', exura_bestia: '💗', utito_bestia: '🐺',
};

const SLOT_NAMES = { weapon: 'Waffe', armor: 'Rüstung', helmet: 'Helm', shield: 'Schild', boots: 'Stiefel' };

// ---------------- Init ----------------
export function initUI(gameDefs, h, vocation) {
  defs = gameDefs;
  handlers = h;

  buildHotbar(vocation);

  $('chatInput').addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = $('chatInput').value.trim();
      if (text) handlers.say(text);
      $('chatInput').value = '';
      $('chatInput').blur();
    } else if (e.key === 'Escape') {
      $('chatInput').blur();
    }
  });

  $('shopClose').addEventListener('click', closeShop);
  $('dlgClose').addEventListener('click', closeDialog);
  $('questClose').addEventListener('click', () => { $('questBox').style.display = 'none'; });
  $('respawnBtn').addEventListener('click', () => handlers.respawn());

  $('hud').style.display = 'block';
}

// ---------------- Quest-Helfer ----------------
export function questState(qid) { return you && you.quests ? you.quests[qid] : undefined; }

export function questAvailable(q, qid) {
  if (!you || questState(qid)) return false;
  if (you.level < q.lvl) return false;
  if (q.prereq) {
    const pre = questState(q.prereq);
    if (!pre || pre.s !== 'done') return false;
  }
  return true;
}

// Für NPC-Markierungen: '!' = Quest verfügbar, '✓' = abschließbar
export function npcQuestMark(npcId) {
  if (!defs) return null;
  let mark = null;
  for (const [qid, q] of Object.entries(defs.QUESTS)) {
    if (q.npc !== npcId) continue;
    const st = questState(qid);
    if (st && st.s === 'active' && st.n >= q.count) return '✓';
    if (questAvailable(q, qid)) mark = '!';
  }
  return mark;
}

export function isTyping() { return document.activeElement === $('chatInput'); }
export function focusChat() { $('chatInput').focus(); }

// ---------------- Statusanzeige ----------------
export function setYou(y) {
  you = y;
  const now = performance.now();
  buffExpiry.atk = y.buffs && y.buffs.atk > 0 ? now + y.buffs.atk : 0;
  buffExpiry.def = y.buffs && y.buffs.def > 0 ? now + y.buffs.def : 0;

  $('statName').textContent = `${y.name} — Level ${y.level} ${defs.VOCATIONS[y.vocation].name}`;
  const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100)) + '%';
  $('hpFill').style.width = pct(y.hp, y.maxHp);
  $('hpTxt').textContent = `${y.hp} / ${y.maxHp}`;
  $('mpFill').style.width = pct(y.mp, y.maxMp);
  $('mpTxt').textContent = `${y.mp} / ${y.maxMp}`;
  const prev = 100 * (y.level - 1) * (y.level - 1);
  $('xpFill').style.width = pct(y.xp - prev, y.xpNext - prev);
  $('xpTxt').textContent = `XP: ${y.xp} / ${y.xpNext}`;

  // Tier des Bestienzüchters
  if (y.pet) {
    $('petBar').style.display = 'block';
    $('petName').textContent = `🐾 ${y.pet.name} — Stufe ${y.pet.level}`;
    $('petFill').style.width = pct(y.pet.hp, y.pet.maxHp);
    $('petTxt').textContent = `${y.pet.hp} / ${y.pet.maxHp}`;
  } else {
    $('petBar').style.display = 'none';
  }

  renderInventory();
  if (shopOpen) renderShop();
  updateHotbarCounts();
  renderTracker();
  renderQuestLog();
}

export function getYou() { return you; }

// ---------------- Quest-Verfolgung (unter der Minimap) ----------------
function renderTracker() {
  const el = $('questTracker');
  const lines = [];
  if (you && you.quests) {
    for (const [qid, st] of Object.entries(you.quests)) {
      const q = defs.QUESTS[qid];
      if (!q || st.s !== 'active') continue;
      const complete = st.n >= q.count;
      lines.push(`<div style="color:${complete ? '#ffd700' : '#d8cdb8'}">${complete ? '✓' : '▸'} ${q.name}: ${st.n}/${q.count}</div>`);
      if (lines.length >= 5) break;
    }
  }
  el.style.display = lines.length ? 'block' : 'none';
  el.innerHTML = lines.length ? `<div style="color:#e8c165;font-weight:bold;margin-bottom:2px">📜 Quests (L)</div>` + lines.join('') : '';
}

// ---------------- Questlog (Taste L) ----------------
export function toggleQuestLog() {
  const b = $('questBox');
  b.style.display = b.style.display === 'block' ? 'none' : 'block';
  renderQuestLog();
}

function renderQuestLog() {
  const b = $('questBox');
  if (b.style.display !== 'block' || !you) return;
  const list = $('questList');
  list.innerHTML = '';
  let any = false;
  for (const [qid, q] of Object.entries(defs.QUESTS)) {
    const st = questState(qid);
    if (!st) continue;
    any = true;
    const div = document.createElement('div');
    div.style.cssText = 'padding:7px 9px;border-radius:6px;background:#1d1712;margin:5px 0;font-size:12px';
    const status = st.s === 'done' ? '<span style="color:#8fd18a">✓ Abgeschlossen</span>'
      : st.n >= q.count ? '<span style="color:#ffd700">★ Beim Questgeber abgeben!</span>'
      : `<span style="color:#d8cdb8">${st.n} / ${q.count}</span>`;
    const npcName = { npc_bruno: 'Wache Bruno (Kiria)', npc_lina: 'Lina (Porta)', npc_eira: 'Eira (Eichwald)', npc_grom: 'Grom (Steinfels)', npc_aldo: 'Priester Aldo (Kiria)', npc_mara: 'Mara (Porta)', npc_odo: 'Odo (Steinfels)', npc_alrik: 'Alrik (Eichwald)', npc_koenig: 'König Aldemar (Kiria)' }[q.npc] || q.npc;
    const rewards = [`${q.reward.gold} Gold`, `${q.reward.xp} XP`];
    if (q.reward.item) rewards.push(defs.ITEMS[q.reward.item].name);
    div.innerHTML = `<div style="color:#e8c165;font-weight:bold">${q.name} ${status}</div>
      <div style="color:#a89878;margin:3px 0">${q.desc}</div>
      <div style="color:#8a9a78;font-size:11px">Questgeber: ${npcName} • Belohnung: ${rewards.join(', ')}</div>`;
    list.appendChild(div);
  }
  if (!any) list.innerHTML = '<div style="color:#776a55;font-size:12px;padding:8px">Noch keine Quests. Sprich mit den Bewohnern der Städte — achte auf das gelbe „!"</div>';
}

// ---------------- Zielanzeige ----------------
export function setTargetDisplay(m) {
  if (!m) { $('targetBox').style.display = 'none'; return; }
  $('targetBox').style.display = 'block';
  $('targetName').textContent = m.name;
  const pct = Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100));
  $('targetFill').style.width = pct + '%';
  $('targetTxt').textContent = `${m.hp} / ${m.maxHp}`;
}

// ---------------- Chat ----------------
export function chatMsg(from, text, cls = '') {
  const log = $('chatLog');
  const div = document.createElement('div');
  if (cls) {
    div.className = cls;
    div.textContent = (from ? from + ': ' : '') + text;
  } else {
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = from + ': ';
    div.appendChild(nm);
    div.appendChild(document.createTextNode(text));
  }
  log.appendChild(div);
  while (log.children.length > 60) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

// ---------------- Hotbar (berufsabhängig) ----------------
let HOTBAR = [];
const slotEls = [];

function buildHotbar(vocation) {
  HOTBAR = [];
  const spells = defs.VOCATIONS[vocation].spells;
  spells.forEach((sp, i) => HOTBAR.push({ key: String(i + 1), spell: sp, ico: SPELL_ICONS[sp] || '✴️' }));
  HOTBAR.push({ key: '6', potion: 'hp', ico: '🧪', lbl: 'Heiltrank' });
  HOTBAR.push({ key: '7', potion: 'mp', ico: '🔷', lbl: 'Manatrank' });

  const bar = $('hotbar');
  bar.innerHTML = '';
  slotEls.length = 0;
  for (const s of HOTBAR) {
    const el = document.createElement('div');
    el.className = 'slot';
    const name = s.spell ? defs.SPELLS[s.spell].name : s.lbl;
    el.innerHTML = `<div class="key">${s.key}</div><div class="ico">${s.ico}</div><div class="lbl">${name}</div><div class="cd"></div><div class="cnt"></div>`;
    if (s.spell) {
      const sp = defs.SPELLS[s.spell];
      el.title = `${sp.name} (Level ${sp.lvl}, ${sp.mana} Mana) – ${sp.desc}`;
    } else el.title = name;
    el.addEventListener('click', () => activateSlot(s));
    bar.appendChild(el);
    slotEls.push({ el, def: s, cdUntil: 0 });
  }
}

export function activateSlotByKey(k) {
  const s = HOTBAR.find((x) => x.key === k);
  if (s) activateSlot(s);
}

function activateSlot(s) {
  if (s.spell) {
    handlers.cast(s.spell);
    const spell = defs.SPELLS[s.spell];
    if (you && you.level >= spell.lvl && you.mp >= spell.mana) startCooldown(s.spell, spell.cd);
  } else {
    handlers.potion(s.potion);
  }
}

export function startCooldown(spellId, ms) {
  const slot = slotEls.find((x) => x.def.spell === spellId);
  if (slot) slot.cdUntil = performance.now() + ms;
}

export function updateHotbar(now) {
  for (const s of slotEls) {
    const cdEl = s.el.querySelector('.cd');
    const remain = s.cdUntil - now;
    if (remain > 0) {
      cdEl.style.display = 'block';
      cdEl.textContent = (remain / 1000).toFixed(1);
    } else {
      cdEl.style.display = 'none';
    }
    if (you && s.def.spell) {
      s.el.classList.toggle('locked', you.level < defs.SPELLS[s.def.spell].lvl);
    }
  }
  // Buff-Anzeige
  const parts = [];
  if (buffExpiry.atk > now) parts.push(`⚔ +40% Angriff (${Math.ceil((buffExpiry.atk - now) / 1000)}s)`);
  if (buffExpiry.def > now) parts.push(`🛡 Schutz (${Math.ceil((buffExpiry.def - now) / 1000)}s)`);
  $('buffBar').textContent = parts.join('  ');
}

function updateHotbarCounts() {
  if (!you) return;
  for (const s of slotEls) {
    const cnt = s.el.querySelector('.cnt');
    if (s.def.potion === 'hp') cnt.textContent = you.inv.potHp;
    else if (s.def.potion === 'mp') cnt.textContent = you.inv.potMp;
  }
}

// ---------------- Inventar ----------------
export function toggleInventory() {
  const b = $('invBox');
  b.style.display = b.style.display === 'block' ? 'none' : 'block';
  renderInventory();
}

function renderInventory() {
  const b = $('invBox');
  if (b.style.display !== 'block' || !you) return;

  let html = `<h3>🎒 ${you.name}</h3>
    <div class="row"><span>Level</span><b>${you.level} (${defs.VOCATIONS[you.vocation].name})</b></div>
    <div class="row"><span>Gold</span><b>💰 ${you.gold}</b></div>
    <div class="row"><span>Angriff</span><b>⚔ ${you.atk}</b></div>
    <div class="row"><span>Verteidigung</span><b>🛡 ${you.def}</b></div>
    <h3 style="margin-top:10px">Ausrüstung</h3>`;
  b.innerHTML = html;

  // 5 Ausrüstungs-Slots
  for (const slot of defs.EQUIP_SLOTS) {
    const itemId = you.eq[slot];
    const div = document.createElement('div');
    div.className = 'invItem';
    if (itemId) {
      const item = defs.ITEMS[itemId];
      const stat = item.atk ? `Atk ${item.atk}` : `Def ${item.def}${item.speed ? ', +Tempo' : ''}`;
      div.innerHTML = `<span><small style="color:#a89878">${SLOT_NAMES[slot]}:</small> ${item.name} <small style="color:#a89878">(${stat})</small></span>`;
      const btn = document.createElement('button');
      btn.textContent = 'Ablegen';
      btn.onclick = () => handlers.unequip(slot);
      div.appendChild(btn);
    } else {
      div.innerHTML = `<span style="color:#776a55"><small>${SLOT_NAMES[slot]}:</small> —</span>`;
    }
    b.appendChild(div);
  }

  // Taschen
  const bag = document.createElement('div');
  bag.innerHTML = `<h3 style="margin-top:10px">Taschen</h3>
    <div class="row"><span>🧪 Heiltränke</span><b>${you.inv.potHp}</b></div>
    <div class="row"><span>🔷 Manatränke</span><b>${you.inv.potMp}</b></div>`;
  b.appendChild(bag);

  if (you.inv.items.length === 0) {
    const none = document.createElement('div');
    none.className = 'row';
    none.style.color = '#776a55';
    none.textContent = 'Keine Gegenstände';
    b.appendChild(none);
  }
  you.inv.items.forEach((id, i) => {
    const item = defs.ITEMS[id];
    const div = document.createElement('div');
    div.className = 'invItem';
    const stat = item.atk ? `Atk ${item.atk}` : `Def ${item.def}`;
    div.innerHTML = `<span>${item.name} <small style="color:#a89878">(${stat}, ${SLOT_NAMES[item.kind]})</small></span>`;
    const btns = document.createElement('span');
    const eq = document.createElement('button');
    eq.textContent = 'Anlegen';
    eq.onclick = () => handlers.equip(i);
    btns.appendChild(eq);
    if (shopOpen) {
      const sell = document.createElement('button');
      sell.textContent = `Verkauf ${Math.floor(item.price / 2)}g`;
      sell.onclick = () => handlers.sell(i);
      btns.appendChild(sell);
    }
    div.appendChild(btns);
    b.appendChild(div);
  });

  // Tier (Bestienzüchter)
  if (you.vocation === 'tamer') {
    const petDiv = document.createElement('div');
    if (you.pet) {
      petDiv.innerHTML = `<h3 style="margin-top:10px">🐾 Dein Tier</h3>
        <div class="row"><span>${you.pet.name}</span><b>Stufe ${you.pet.level}</b></div>
        <div class="row"><span>Leben</span><b>${you.pet.hp} / ${you.pet.maxHp}</b></div>
        <div class="row"><span>XP</span><b>${you.pet.xp} / ${you.pet.xpNext}</b></div>`;
      const btn = document.createElement('button');
      btn.textContent = 'Tier entlassen';
      btn.style.cssText = 'margin-top:4px;font-size:11px;padding:3px 10px;cursor:pointer;background:#33281a;border:1px solid #5a4326;color:#e8c165;border-radius:4px';
      btn.onclick = () => { if (confirm('Tier wirklich entlassen?')) handlers.dismissPet(); };
      petDiv.appendChild(btn);
    } else {
      petDiv.innerHTML = `<h3 style="margin-top:10px">🐾 Dein Tier</h3>
        <div class="row" style="color:#776a55">Kein Tier gezähmt. Schwäche eine Bestie unter 60% Leben und sprich Utevo Bestia (Taste 2)!</div>`;
    }
    b.appendChild(petDiv);
  }

  // Skin ändern
  const skinBtn = document.createElement('button');
  skinBtn.textContent = '🎨 Skin ändern';
  skinBtn.style.cssText = 'margin-top:10px;width:100%;font-size:12px;padding:6px;cursor:pointer;background:#33281a;border:1px solid #5a4326;color:#e8c165;border-radius:5px';
  skinBtn.onclick = () => handlers.outfit();
  b.appendChild(skinBtn);
}

// ---------------- Shop ----------------
export function openShop(npcName) {
  shopOpen = true;
  if (npcName) $('shopTitle').textContent = `🏪 ${npcName}s Laden`;
  $('shopBox').style.display = 'block';
  $('invBox').style.display = 'block';
  renderShop();
  renderInventory();
}

export function closeShop() {
  shopOpen = false;
  $('shopBox').style.display = 'none';
  renderInventory();
}

export function isShopOpen() { return shopOpen; }

function renderShop() {
  if (!you) return;
  $('shopGold').textContent = `Dein Gold: 💰 ${you.gold}`;
  const box = $('shopItems');
  box.innerHTML = '';
  for (const id of defs.SHOP_ITEMS) {
    const item = defs.ITEMS[id];
    const div = document.createElement('div');
    div.className = 'invItem';
    const stat = item.atk ? `Atk ${item.atk}` : item.def ? `Def ${item.def}` : (item.heal ? `+${item.heal} HP` : `+${item.mana} MP`);
    div.innerHTML = `<span>${item.name} <small style="color:#a89878">(${stat})</small></span>`;
    const buy = document.createElement('button');
    buy.textContent = `${item.price}g`;
    buy.disabled = you.gold < item.price;
    if (buy.disabled) buy.style.opacity = 0.45;
    buy.onclick = () => handlers.buy(id);
    div.appendChild(buy);
    box.appendChild(div);
  }
}

// ---------------- NPC-Dialog ----------------
export function openDialog(npc) {
  closeShop();
  $('dlgBox').style.display = 'block';
  $('dlgName').textContent = `💬 ${npc.name}`;
  $('dlgText').textContent = `„${npc.dialog.greeting}“`;
  const box = $('dlgTopics');
  box.innerHTML = '';
  for (const topic of npc.dialog.topics || []) {
    const btn = document.createElement('button');
    btn.textContent = topic.k;
    btn.style.cssText = 'font-size:12px;padding:5px 12px;cursor:pointer;background:#33281a;border:1px solid #5a4326;color:#e8c165;border-radius:5px';
    btn.onclick = () => { $('dlgText').textContent = `„${topic.text}“`; };
    box.appendChild(btn);
  }
  if (npc.role === 'merchant') {
    const btn = document.createElement('button');
    btn.textContent = '🏪 Handeln';
    btn.style.cssText = 'font-size:12px;padding:5px 12px;cursor:pointer;background:#2a3a1a;border:1px solid #5a7a26;color:#c8e865;border-radius:5px';
    btn.onclick = () => { closeDialog(); openShop(npc.name); };
    box.appendChild(btn);
  }

  // Quests dieses NPCs
  const qbox = $('dlgQuests');
  qbox.innerHTML = '';
  for (const [qid, q] of Object.entries(defs.QUESTS)) {
    if (q.npc !== npc.id) continue;
    const st = questState(qid);
    const row = document.createElement('div');
    row.style.cssText = 'margin-top:8px;padding:7px 9px;border-radius:6px;background:#1d1712;font-size:12px';
    const rewards = [`${q.reward.gold} Gold`, `${q.reward.xp} XP`];
    if (q.reward.item) rewards.push(defs.ITEMS[q.reward.item].name);

    if (st && st.s === 'done') {
      continue; // erledigt, nicht mehr anzeigen
    } else if (st && st.n >= q.count) {
      row.innerHTML = `<div style="color:#ffd700;font-weight:bold">★ ${q.name} – erfüllt!</div>`;
      const btn = document.createElement('button');
      btn.textContent = `✓ Abgeben (${rewards.join(', ')})`;
      btn.style.cssText = 'margin-top:5px;font-size:12px;padding:5px 12px;cursor:pointer;background:#3a3010;border:1px solid #c8a030;color:#ffd700;border-radius:5px';
      btn.onclick = () => { handlers.questComplete(qid); closeDialog(); };
      row.appendChild(btn);
    } else if (st) {
      row.innerHTML = `<div style="color:#d8cdb8">▸ ${q.name}: <b>${st.n} / ${q.count}</b></div><div style="color:#a89878;margin-top:2px">${q.desc}</div>`;
    } else if (questAvailable(q, qid)) {
      row.innerHTML = `<div style="color:#ffd700;font-weight:bold">! ${q.name}</div><div style="color:#a89878;margin:3px 0">${q.desc}</div><div style="color:#8a9a78;font-size:11px">Belohnung: ${rewards.join(', ')}</div>`;
      const btn = document.createElement('button');
      btn.textContent = '📜 Quest annehmen';
      btn.style.cssText = 'margin-top:5px;font-size:12px;padding:5px 12px;cursor:pointer;background:#2a3a1a;border:1px solid #5a7a26;color:#c8e865;border-radius:5px';
      btn.onclick = () => { handlers.questAccept(qid); closeDialog(); };
      row.appendChild(btn);
    } else if (you && you.level < q.lvl) {
      row.innerHTML = `<div style="color:#776a55">🔒 ${q.name} (ab Level ${q.lvl})</div>`;
    } else {
      continue; // Voraussetzung fehlt
    }
    qbox.appendChild(row);
  }
}

export function closeDialog() {
  $('dlgBox').style.display = 'none';
}

// ---------------- Todesbildschirm ----------------
export function showDeath(show) {
  $('deathBox').style.display = show ? 'flex' : 'none';
}

// ---------------- Minimap ----------------
let miniBase = null;
let miniWorld = null;

export function initMinimap(world) {
  miniWorld = world;
  miniBase = document.createElement('canvas');
  miniBase.width = world.size;
  miniBase.height = world.size;
  const ctx = miniBase.getContext('2d');
  for (let y = 0; y < world.size; y++) {
    for (let x = 0; x < world.size; x++) {
      ctx.fillStyle = TILE_MINI_COLORS[world.tiles[y * world.size + x]] || '#000';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function updateMinimap(entities, selfId) {
  if (!miniBase) return;
  const cv = $('minimap');
  const ctx = cv.getContext('2d');
  const self = entities.get(selfId);
  if (!self) return;
  const view = 56;
  const sx = Math.max(0, Math.min(miniWorld.size - view, self.tx - view / 2));
  const sy = Math.max(0, Math.min(miniWorld.size - view, self.ty - view / 2));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(miniBase, sx, sy, view, view, 0, 0, cv.width, cv.height);
  const scale = cv.width / view;
  for (const e of entities.values()) {
    if (e.dead) continue;
    const px = (e.tx - sx) * scale, py = (e.ty - sy) * scale;
    if (px < 0 || py < 0 || px > cv.width || py > cv.height) continue;
    ctx.fillStyle = e.id === selfId ? '#ffffff'
      : e.kind === 'player' ? '#4caf50'
      : e.kind === 'pet' ? '#4ae8e0'
      : e.kind === 'npc' ? '#e8c165' : '#ff4433';
    ctx.fillRect(px - 1.5, py - 1.5, e.id === selfId ? 4 : 3, e.id === selfId ? 4 : 3);
  }
}

export function setOnlineCount(n) {
  $('onlineCount').textContent = `${n} Spieler online`;
}
