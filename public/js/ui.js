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
let shopNpc = null;
let buffExpiry = { atk: 0, def: 0, speed: 0, light: 0 };
let skullExpiry = 0;

const TILE_MINI_COLORS = [
  '#1c4f7d', '#d8c07a', '#4d9040', '#2f6e2a', '#8d8d92',
  '#a39a83', '#6b5b4a', '#ff5a10', '#7d5f3a', '#6f5a40', '#9aa8b8', '#a8814e',
];

const SPELL_ICONS = {
  exura: '💚', exura_gran: '💖', utani_hur: '💨', utevo_lux: '🔆',
  exori_ico: '🗡️', exori: '🌪️', exori_gran: '⚔️', exori_mas: '🌀', utito: '💢',
  exori_san: '✨', exori_con: '🏹', exevo_san: '🌟', exevo_mas_san: '🌞', utamo: '🛡️', utura: '💞',
  exori_flam: '🔥', exori_vis: '⚡', exori_frigo: '❄️', exevo_gran: '💥', exevo_mas: '☄️', exevo_ultra: '🌩️',
  utevo_bestia: '🐾', exori_bestia: '🐻', exura_bestia: '💗', exori_natura: '🌿', utito_bestia: '🐺', exevo_natura: '🍃',
};

const SLOT_NAMES = { weapon: 'Waffe', armor: 'Rüstung', legs: 'Hose', helmet: 'Helm', shield: 'Hand', boots: 'Stiefel' };
const VOC_SHORT = { knight: 'Ritter', paladin: 'Paladin', sorcerer: 'Magier', tamer: 'Züchter' };

function itemStat(item) {
  if (item.atk) return `Atk ${item.atk}`;
  if (item.kind === 'food') return `+${Math.floor(item.food / 60)} Min. satt`;
  if (item.kind === 'mount') return 'Mount';
  if (item.def !== undefined) return `Def ${item.def}${item.speed ? ', +Tempo' : ''}${item.light ? ', Licht' : ''}`;
  if (item.heal) return `+${item.heal} HP`;
  if (item.mana) return `+${item.mana} MP`;
  return '';
}

function vocTag(item) {
  if (!item.voc) return '';
  return ` <small style="color:#c88a4a">[${item.voc.map((v) => VOC_SHORT[v]).join('/')}]</small>`;
}

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
  $('battleClose').addEventListener('click', () => { $('battleBox').style.display = 'none'; });
  $('spellClose').addEventListener('click', () => { $('spellBox').style.display = 'none'; });
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
  for (const b of ['atk', 'def', 'speed', 'light']) {
    buffExpiry[b] = y.buffs && y.buffs[b] > 0 ? now + y.buffs[b] : 0;
  }
  skullExpiry = y.skullMs > 0 ? now + y.skullMs : 0;

  $('statName').textContent = `${y.name} — Level ${y.level} ${defs.VOCATIONS[y.vocation].name}`;
  const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100)) + '%';
  $('hpFill').style.width = pct(y.hp, y.maxHp);
  $('hpTxt').textContent = `${y.hp} / ${y.maxHp}`;
  $('mpFill').style.width = pct(y.mp, y.maxMp);
  $('mpTxt').textContent = `${y.mp} / ${y.maxMp}`;
  const prev = 100 * (y.level - 1) * (y.level - 1);
  $('xpFill').style.width = pct(y.xp - prev, y.xpNext - prev);
  $('xpTxt').textContent = `XP: ${y.xp} / ${y.xpNext}`;

  // Hunger
  const f = $('foodTxt');
  if (y.food > 0) {
    const min = Math.floor(y.food / 60), sec = y.food % 60;
    f.textContent = `🍗 Satt: ${min}:${String(sec).padStart(2, '0')}`;
    f.style.color = y.food < 60 ? '#e8a53a' : '#8fd18a';
  } else {
    f.textContent = '🍗 HUNGRIG! Kaum Regeneration – iss etwas!';
    f.style.color = '#ff7a6e';
  }

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
  // Die ersten 7 Zauber auf der Hotbar – ALLE stehen im Zauberbuch (Taste Z)
  const spells = defs.VOCATIONS[vocation].spells.slice(0, 7);
  spells.forEach((sp, i) => HOTBAR.push({ key: String(i + 1), spell: sp, ico: SPELL_ICONS[sp] || '✴️' }));
  HOTBAR.push({ key: '8', potion: 'hp', ico: '🧪', lbl: 'Heiltrank' });
  HOTBAR.push({ key: '9', potion: 'mp', ico: '🔷', lbl: 'Manatrank' });

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
  if (buffExpiry.atk > now) parts.push(`⚔ Angriff (${Math.ceil((buffExpiry.atk - now) / 1000)}s)`);
  if (buffExpiry.def > now) parts.push(`🛡 Schutz (${Math.ceil((buffExpiry.def - now) / 1000)}s)`);
  if (buffExpiry.speed > now) parts.push(`💨 Tempo (${Math.ceil((buffExpiry.speed - now) / 1000)}s)`);
  if (buffExpiry.light > now) parts.push(`🔆 Licht (${Math.ceil((buffExpiry.light - now) / 1000)}s)`);
  if (skullExpiry > now) parts.push(`💀 Totenkopf – Stadtverbot! (${Math.ceil((skullExpiry - now) / 1000)}s)`);
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
    div.innerHTML = `<span>${item.name}${vocTag(item)} <small style="color:#a89878">(${itemStat(item)})</small></span>`;
    const btns = document.createElement('span');
    if (SLOT_NAMES[item.kind]) {
      const eq = document.createElement('button');
      eq.textContent = 'Anlegen';
      const wrongVoc = item.voc && !item.voc.includes(you.vocation);
      if (wrongVoc) { eq.disabled = true; eq.style.opacity = 0.4; eq.title = 'Nicht für deinen Beruf'; }
      eq.onclick = () => handlers.equip(i);
      btns.appendChild(eq);
    } else if (item.kind === 'food') {
      const eat = document.createElement('button');
      eat.textContent = '🍴 Essen';
      eat.onclick = () => handlers.use(i);
      btns.appendChild(eat);
    } else if (item.kind === 'mount') {
      const learn = document.createElement('button');
      learn.textContent = '🐎 Lernen';
      learn.onclick = () => handlers.use(i);
      btns.appendChild(learn);
    }
    if (shopOpen) {
      const sell = document.createElement('button');
      sell.textContent = `Verkauf ${Math.floor(item.price / 2)}g`;
      sell.onclick = () => handlers.sell(i);
      btns.appendChild(sell);
    }
    div.appendChild(btns);
    b.appendChild(div);
  });

  // Mounts (Reittiere)
  if (you.mounts && you.mounts.length) {
    const mDiv = document.createElement('div');
    mDiv.innerHTML = `<h3 style="margin-top:10px">🐎 Reittiere (Taste R)</h3>`;
    b.appendChild(mDiv);
    const MOUNT_NAMES = { horse: 'Pferd', wolf: 'Wolf', bear: 'Bär', giant_spider: 'Riesenspinne', minotaur: 'Minotaurus', golem: 'Steingolem', wyrm: 'Wyrm', dragon: 'Drache' };
    for (const mt of you.mounts) {
      const div = document.createElement('div');
      div.className = 'invItem';
      const riding = you.mounted === mt;
      div.innerHTML = `<span>${riding ? '▶ ' : ''}${MOUNT_NAMES[mt] || mt}</span>`;
      const btn = document.createElement('button');
      btn.textContent = riding ? 'Absteigen' : 'Reiten';
      btn.onclick = () => handlers.mount(riding ? null : mt);
      div.appendChild(btn);
      b.appendChild(div);
    }
  }

  // Tiere des Bestienzüchters (aktiv + Stall)
  if (you.vocation === 'tamer') {
    const petDiv = document.createElement('div');
    if (you.pet) {
      petDiv.innerHTML = `<h3 style="margin-top:10px">🐾 Aktives Tier</h3>
        <div class="row"><span>${you.pet.name}</span><b>Stufe ${you.pet.level}</b></div>
        <div class="row"><span>Leben</span><b>${you.pet.hp} / ${you.pet.maxHp}</b></div>
        <div class="row"><span>XP</span><b>${you.pet.xp} / ${you.pet.xpNext}</b></div>`;
      const stash = document.createElement('button');
      stash.textContent = '🏠 In den Stall';
      stash.style.cssText = 'margin-top:4px;margin-right:4px;font-size:11px;padding:3px 10px;cursor:pointer;background:#33281a;border:1px solid #5a4326;color:#e8c165;border-radius:4px';
      stash.onclick = () => handlers.petStash();
      const free = document.createElement('button');
      free.textContent = 'Freilassen';
      free.style.cssText = stash.style.cssText;
      free.onclick = () => { if (confirm('Tier wirklich freilassen?')) handlers.dismissPet(); };
      petDiv.appendChild(stash);
      petDiv.appendChild(free);
    } else {
      petDiv.innerHTML = `<h3 style="margin-top:10px">🐾 Aktives Tier</h3>
        <div class="row" style="color:#776a55">Kein aktives Tier. Schwäche eine Bestie unter 60% und sprich Utevo Bestia (Taste 2)!</div>`;
    }
    b.appendChild(petDiv);

    const stableDiv = document.createElement('div');
    stableDiv.innerHTML = `<h3 style="margin-top:10px">🏠 Stall (${(you.petStable || []).length}/6)</h3>`;
    b.appendChild(stableDiv);
    (you.petStable || []).forEach((entry, i) => {
      const div = document.createElement('div');
      div.className = 'invItem';
      const MOUNT_NAMES2 = { rat: 'Ratte', snake: 'Schlange', spider: 'Spinne', wolf: 'Wolf', bear: 'Bär', giant_spider: 'Riesenspinne' };
      div.innerHTML = `<span>${MOUNT_NAMES2[entry.type] || entry.type} <small style="color:#a89878">Stufe ${entry.level}</small></span>`;
      const btns = document.createElement('span');
      const dep = document.createElement('button');
      dep.textContent = 'Einsetzen';
      dep.disabled = !!you.pet;
      if (dep.disabled) dep.style.opacity = 0.4;
      dep.onclick = () => handlers.petDeploy(i);
      const rel = document.createElement('button');
      rel.textContent = 'Freilassen';
      rel.onclick = () => { if (confirm('Tier wirklich freilassen?')) handlers.petRelease(i); };
      btns.appendChild(dep);
      btns.appendChild(rel);
      div.appendChild(btns);
      b.appendChild(div);
    });
  }

  // Skin ändern
  const skinBtn = document.createElement('button');
  skinBtn.textContent = '🎨 Skin ändern';
  skinBtn.style.cssText = 'margin-top:10px;width:100%;font-size:12px;padding:6px;cursor:pointer;background:#33281a;border:1px solid #5a4326;color:#e8c165;border-radius:5px';
  skinBtn.onclick = () => handlers.outfit();
  b.appendChild(skinBtn);
}

// ---------------- Shop (Sortiment je Händler) ----------------
export function openShop(npc) {
  shopOpen = true;
  shopNpc = npc || null;
  $('shopTitle').textContent = `🏪 ${npc ? npc.name + 's' : ''} Laden`;
  $('shopBox').style.display = 'block';
  $('invBox').style.display = 'block';
  renderShop();
  renderInventory();
}

export function closeShop() {
  shopOpen = false;
  shopNpc = null;
  $('shopBox').style.display = 'none';
  renderInventory();
}

export function isShopOpen() { return shopOpen; }

function renderShop() {
  if (!you) return;
  $('shopGold').textContent = `Dein Gold: 💰 ${you.gold}`;
  const box = $('shopItems');
  box.innerHTML = '';
  const list = (shopNpc && shopNpc.shop) || defs.SHOP_ITEMS;
  for (const id of list) {
    const item = defs.ITEMS[id];
    const div = document.createElement('div');
    div.className = 'invItem';
    div.innerHTML = `<span>${item.name}${vocTag(item)} <small style="color:#a89878">(${itemStat(item)})</small></span>`;
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
    btn.onclick = () => { closeDialog(); openShop(npc); };
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

// ---------------- Kampfliste (Taste B, wie in Tibia) ----------------
export function toggleBattleList() {
  const b = $('battleBox');
  b.style.display = b.style.display === 'block' ? 'none' : 'block';
}

export function isBattleListOpen() { return $('battleBox').style.display === 'block'; }

export function renderBattleList(entities, selfId, currentTargetId) {
  const list = $('battleList');
  const self = entities.get(selfId);
  if (!self) return;
  const rows = [];
  for (const e of entities.values()) {
    if (e.id === selfId || e.dead || !e.group.visible) continue;
    if (e.kind !== 'monster' && e.kind !== 'player' && e.kind !== 'pet') continue;
    if (e.kind === 'pet' && e.ownerId === selfId) continue;
    const d = Math.max(Math.abs(e.tx - self.tx), Math.abs(e.ty - self.ty));
    if (d > 16) continue;
    rows.push({ e, d });
  }
  rows.sort((a, b) => a.d - b.d);
  list.innerHTML = '';
  if (!rows.length) {
    list.innerHTML = '<div style="color:#776a55;font-size:11px;padding:6px">Keine Gegner in der Nähe.</div>';
    return;
  }
  for (const { e, d } of rows.slice(0, 14)) {
    const div = document.createElement('div');
    const isTarget = e.id === currentTargetId;
    div.style.cssText = `display:flex;align-items:center;gap:6px;padding:4px 6px;margin:2px 0;border-radius:5px;cursor:pointer;background:${isTarget ? '#4a2018' : '#1d1712'};border:1px solid ${isTarget ? '#c8503a' : 'transparent'}`;
    const color = e.kind === 'player' ? '#8fd18a' : e.kind === 'pet' ? '#7ee8e0' : '#e8b0a0';
    const pct = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100));
    div.innerHTML = `
      <span style="flex:1;font-size:11px;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</span>
      <span style="width:52px;height:7px;background:#201a14;border-radius:3px;overflow:hidden;flex-shrink:0"><span style="display:block;height:100%;width:${pct}%;background:${pct > 50 ? '#4caf50' : pct > 25 ? '#e8b53a' : '#d9453a'}"></span></span>
      <span style="font-size:9px;color:#a89878;width:22px;text-align:right;flex-shrink:0">${d}m</span>`;
    div.onclick = () => handlers.target(e.id);
    list.appendChild(div);
  }
}

// ---------------- Zauberbuch (Taste Z) ----------------
export function toggleSpellbook() {
  const b = $('spellBox');
  b.style.display = b.style.display === 'block' ? 'none' : 'block';
  renderSpellbook();
}

function renderSpellbook() {
  const b = $('spellList');
  if ($('spellBox').style.display !== 'block' || !you) return;
  b.innerHTML = '';
  for (const sid of defs.VOCATIONS[you.vocation].spells) {
    const s = defs.SPELLS[sid];
    const locked = you.level < s.lvl;
    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:8px;padding:6px 8px;margin:3px 0;border-radius:6px;background:#1d1712;cursor:${locked ? 'default' : 'pointer'};opacity:${locked ? 0.45 : 1}`;
    div.innerHTML = `
      <span style="font-size:18px">${SPELL_ICONS[sid] || '✴️'}</span>
      <span style="flex:1">
        <div style="font-size:12px;color:#e8c165;font-weight:bold">${s.name} <small style="color:#8a9a78;font-weight:normal">„${s.words}"</small></div>
        <div style="font-size:10px;color:#a89878">${s.desc}</div>
      </span>
      <span style="font-size:10px;color:${locked ? '#c86a5a' : '#8a9a78'};text-align:right;flex-shrink:0">Lvl ${s.lvl}<br>${s.mana} MP</span>`;
    if (!locked) div.onclick = () => { handlers.cast(sid); startCooldown(sid, s.cd); };
    b.appendChild(div);
  }
}

// ---------------- Todesbildschirm ----------------
export function showDeath(show) {
  $('deathBox').style.display = show ? 'flex' : 'none';
}

// ---------------- Minimap + große Karte ----------------
let miniBase = null;
let miniWorld = null;
let miniView = { sx: 0, sy: 0, scale: 1 };
let bigMapScale = 1;

// Klick auf die Minimap → dorthin laufen (wie in Tibia)
export function initMinimapClick(onWalk) {
  $('minimap').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    onWalk(Math.round(miniView.sx + px / miniView.scale), Math.round(miniView.sy + py / miniView.scale));
  });
  $('bigMapCanvas').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (e.currentTarget.width / rect.width);
    const py = (e.clientY - rect.top) * (e.currentTarget.height / rect.height);
    onWalk(Math.round(px / bigMapScale), Math.round(py / bigMapScale));
    toggleBigMap(null, true);
  });
  $('bigMapClose').addEventListener('click', () => toggleBigMap(null, true));
}

// Große Weltkarte (Taste M)
export function toggleBigMap(selfEntity, forceClose = false) {
  const box = $('bigMap');
  if (forceClose || box.style.display === 'flex') {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'flex';
  const cv = $('bigMapCanvas');
  const ctx = cv.getContext('2d');
  bigMapScale = cv.width / miniWorld.size;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(miniBase, 0, 0, cv.width, cv.height);
  // Städtenamen
  ctx.font = 'bold 15px Georgia';
  ctx.textAlign = 'center';
  for (const t of miniWorld.towns || []) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(t.name, t.cx * bigMapScale, t.cy * bigMapScale - 6);
    ctx.fillStyle = '#e8c165';
    ctx.fillText(t.name, t.cx * bigMapScale, t.cy * bigMapScale - 6);
  }
  // Eigene Position
  if (selfEntity) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(selfEntity.tx * bigMapScale, selfEntity.ty * bigMapScale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function initMinimap(world) {
  miniWorld = world;
  miniBase = document.createElement('canvas');
  miniBase.width = world.size;
  miniBase.height = world.size;
  const ctx = miniBase.getContext('2d');
  // Schnell per ImageData (1,3 Mio. Kacheln)
  const rgb = TILE_MINI_COLORS.map((c) => [
    parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16),
  ]);
  const img = ctx.createImageData(world.size, world.size);
  for (let i = 0; i < world.tiles.length; i++) {
    const col = rgb[world.tiles[i]] || [0, 0, 0];
    img.data[i * 4] = col[0];
    img.data[i * 4 + 1] = col[1];
    img.data[i * 4 + 2] = col[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
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
  miniView = { sx, sy, scale };
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
