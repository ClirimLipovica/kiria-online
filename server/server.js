// ============================================================
//  KIRIA ONLINE 3D – SERVER
//  Node.js + Express + Socket.io  (autoritativer Spielserver)
//  Start:   npm install   dann   npm start
//  Browser: http://localhost:3000
// ============================================================
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { Server } = require('socket.io');

const { ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS, MONSTERS, SHOP_ITEMS, QUESTS } = require('./constants');
const game = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });

app.use(express.static(path.join(__dirname, '../public')));
// three.js aus node_modules ausliefern (Kern + Addons für Bloom)
app.use('/vendor/jsm', express.static(path.join(__dirname, '../node_modules/three/examples/jsm')));
app.use('/vendor', express.static(path.join(__dirname, '../node_modules/three/build')));

const NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß _-]{3,16}$/;

function hashPw(pw, salt) {
  return crypto.createHash('sha256').update(salt + '::' + pw).digest('hex');
}

io.on('connection', (socket) => {
  let player = null;

  socket.on('login', (data) => {
    try {
      if (player) return;
      if (!data || typeof data !== 'object') return;
      const name = String(data.name || '').trim();
      const password = String(data.password || '');
      const vocation = String(data.vocation || 'knight');
      const outfit = Math.abs(parseInt(data.outfit, 10) || 0) % 8;

      if (!NAME_RE.test(name)) return socket.emit('loginError', { msg: 'Name: 3-16 Zeichen (Buchstaben/Zahlen).' });
      if (password.length < 3) return socket.emit('loginError', { msg: 'Passwort: mindestens 3 Zeichen.' });
      if (!VOCATIONS[vocation]) return socket.emit('loginError', { msg: 'Ungültiger Beruf.' });

      const accKey = name.toLowerCase();
      let account = game.accounts[accKey];

      if (account) {
        if (hashPw(password, account.salt) !== account.hash) {
          return socket.emit('loginError', { msg: 'Falsches Passwort für diesen Charakter.' });
        }
        // Bereits online?
        for (const p of game.players.values()) {
          if (p.accountKey === accKey) return socket.emit('loginError', { msg: 'Dieser Charakter ist bereits online.' });
        }
      } else {
        const salt = crypto.randomBytes(8).toString('hex');
        account = { name, salt, hash: hashPw(password, salt), vocation, outfit, save: null };
        game.accounts[accKey] = account;
      }

      player = game.createPlayer(socket, account);

      const w = game.world;
      socket.emit('welcome', {
        id: player.id,
        world: {
          size: w.size,
          tiles: Buffer.from(w.tiles),     // binär – spart Bandbreite
          heights: Buffer.from(w.heights),
          buildings: w.buildings,
          npcs: w.npcs,
          towns: w.towns,
          fountains: w.fountains,
          farm: w.farm,
        },
        defs: { ITEMS, EQUIP_SLOTS, SPELLS, VOCATIONS, SHOP_ITEMS, QUESTS },
        you: game.privatePlayer(player),
        players: [...game.players.values()].filter((p) => p.id !== player.id).map(game.publicPlayer),
        monsters: [...game.monsters.values()].filter((m) => !m.dead).map(game.publicMonster),
        pets: [...game.pets.values()].map(game.publicPet),
        corpses: [...game.corpses.values()].map(game.publicCorpse),
      });
      socket.broadcast.emit('playerJoined', game.publicPlayer(player));
      io.emit('chat', { id: 'system', from: '⚔ Kiria', text: `${player.name} hat die Welt betreten. (${io.engine.clientsCount} online)` });
      console.log(`+ ${player.name} (${vocation}) eingeloggt – ${game.players.size} Spieler online`);
    } catch (e) {
      console.error('Login-Fehler:', e);
      socket.emit('loginError', { msg: 'Serverfehler beim Login.' });
    }
  });

  socket.on('move', (d) => { if (player && d) game.tryMove(player, d.dx | 0, d.dy | 0); });
  socket.on('setTarget', (d) => { if (player) game.setTarget(player, d ? d.id : null); });
  socket.on('cast', (d) => { if (player && d) game.castSpell(player, String(d.spell)); });
  socket.on('potion', (d) => { if (player && d) game.usePotion(player, String(d.kind)); });
  socket.on('buy', (d) => { if (player && d) game.buyItem(player, String(d.item)); });
  socket.on('sell', (d) => { if (player && d) game.sellItem(player, parseInt(d.index, 10)); });
  socket.on('equip', (d) => { if (player && d) game.equipItem(player, parseInt(d.index, 10)); });
  socket.on('unequip', (d) => { if (player && d) game.unequipItem(player, String(d.slot)); });
  socket.on('outfit', (d) => { if (player && d) game.setOutfit(player, d.outfit); });
  socket.on('dismissPet', () => { if (player) game.dismissPet(player); });
  socket.on('petStash', () => { if (player) game.petStash(player); });
  socket.on('petDeploy', (d) => { if (player && d) game.petDeploy(player, parseInt(d.index, 10)); });
  socket.on('petRelease', (d) => { if (player && d) game.petRelease(player, parseInt(d.index, 10)); });
  socket.on('use', (d) => { if (player && d) game.useItem(player, parseInt(d.index, 10)); });
  socket.on('loot', (d) => { if (player && d) game.lootCorpse(player, String(d.id)); });
  socket.on('mountToggle', (d) => { if (player) game.mountToggle(player, d ? d.type : null); });
  socket.on('questAccept', (d) => { if (player && d) game.questAccept(player, String(d.id)); });
  socket.on('questComplete', (d) => { if (player && d) game.questComplete(player, String(d.id)); });
  socket.on('say', (d) => { if (player && d) game.chat(player, d.text); });
  socket.on('respawn', () => { if (player) game.respawnPlayer(player); });

  socket.on('disconnect', () => {
    if (!player) return;
    const acc = game.accounts[player.accountKey];
    if (acc) acc.save = game.saveData(player);
    game.removePlayer(player);
    socket.broadcast.emit('playerLeft', { id: player.id });
    io.emit('chat', { id: 'system', from: '⚔ Kiria', text: `${player.name} hat die Welt verlassen.` });
    console.log(`- ${player.name} ausgeloggt – ${game.players.size} Spieler online`);
    player = null;
  });
});

process.on('SIGINT', () => { game.saveAccounts(); process.exit(0); });
process.on('SIGTERM', () => { game.saveAccounts(); process.exit(0); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log('  KIRIA ONLINE 3D – Server läuft');
  console.log(`  Lokal:    http://localhost:${PORT}`);
  console.log('====================================');
  game.start(io);
});
