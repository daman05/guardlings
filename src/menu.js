// Оболочка игры: главное меню и выбор карты.

function uiButton(scene, x, y, w, h, label, color, cb, depth = 1, size = '30px') {
  return UI.button(scene, x, y, w, h, label, color, cb, { depth, size });
}

// Окно настроек: музыка и звуки игры включаются отдельно. Общее для меню и игры.
function settingsOverlay(scene, onClose, withLang) {
  const o = [], D = 50, add = x => { o.push(x); return x; };
  add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(D).setInteractive());
  const top = withLang ? 380 : 420;               // с выбором языка окно выше
  add(UI.card(scene, W / 2, withLang ? 650 : 620, 580, withLang ? 680 : 520, 0xf3d27a).setDepth(D + 1));
  add(scene.add.text(W / 2, top, L('settings'), { fontFamily: FONT, fontSize: '50px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 2));
  const row = (y, onText, offText, get, set) => {
    let pair = null;
    const make = () => {
      if (pair) pair.forEach(x => x.destroy());
      pair = UI.button(scene, W / 2, y, 480, 96, get() ? onText : offText, get() ? 0x2e8b57 : 0x5a4f7a, () => { set(!get()); make(); }, { depth: D + 2, size: '32px' });
    };
    make(); o.push({ destroy: () => pair.forEach(x => x.destroy()) });
  };
  row(top + 120, L('musicOn'), L('musicOff'), () => Sfx.musicOn, v => Sfx.setMusicOn(v));
  row(top + 240, L('sfxOn'), L('sfxOff'), () => Sfx.sfxOn, v => Sfx.setSfxOn(v));
  // Язык меняется только из главного меню: экран перерисовывается целиком.
  if (withLang) {                                  // выбор языка: все языки видны сразу, текущий подсвечен
    add(scene.add.text(W / 2, top + 322, L('languageLabel'), { fontFamily: FONT, fontSize: '26px', color: '#b9b2cc' }).setOrigin(0.5).setDepth(D + 2));
    LANGS.forEach((code, i) => {
      const on = code === LANG, x = W / 2 + (i - (LANGS.length - 1) / 2) * 246;
      UI.button(scene, x, top + 392, 230, 88, (on ? '✓ ' : '') + STRINGS[code].languageName, on ? 0x2e8b57 : 0x5a4f7a,
        () => { if (!on) { setLang(code); scene.scene.restart(); } }, { depth: D + 2, size: '30px' }).forEach(b => o.push(b));
    });
  }
  UI.button(scene, W / 2, top + (withLang ? 520 : 380), 320, 88, L('done'), 0x2e6fd1, () => { o.forEach(x => x.destroy()); if (onClose) onClose(); }, { depth: D + 2, size: '36px' }).forEach(x => o.push(x));
}

// Рисует таблицу рекордов (до 10 строк) в список объектов o. hi — номер строки, которую нужно подсветить.
function drawBoard(scene, o, list, cx, top, depth, hi) {
  const add = x => { o.push(x); return x; }, st = (size, color, bold) => ({ fontFamily: FONT, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' });
  if (!list.length) { add(scene.add.text(cx, top + 150, L('lbEmpty'), { ...st('26px', '#b9b2cc'), align: 'center', lineSpacing: 8 }).setOrigin(0.5).setDepth(depth)); return; }
  list.slice(0, 10).forEach((e, i) => {
    const y = top + i * 44, mine = i === hi, color = mine ? '#ffe066' : i < 3 ? '#ffffff' : '#cfc8e0';
    if (mine) add(scene.add.rectangle(cx, y, 500, 40, 0xffe066, 0.16).setStrokeStyle(2, 0xffe066, 0.8).setDepth(depth));
    add(scene.add.text(cx - 232, y, (i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.'), st('26px', color, true)).setOrigin(0, 0.5).setDepth(depth + 1));
    add(scene.add.text(cx - 170, y, L('lbWave', e.score), st('28px', color, true)).setOrigin(0, 0.5).setDepth(depth + 1));
    const d = new Date(e.date), when = mine ? L('lbYou') : (e.name || `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`);
    add(scene.add.text(cx + 232, y, when, st('22px', mine ? '#ffe066' : '#9a93b0')).setOrigin(1, 0.5).setDepth(depth + 1));
  });
}

// Окно «Топ-10» бесконечного режима для карты.
function leaderboardOverlay(scene, map) {
  const o = [], D = 50, add = x => { o.push(x); return x; };
  add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(D).setInteractive());
  add(UI.card(scene, W / 2, 640, 600, 760, 0xf3d27a).setDepth(D + 1));
  add(scene.add.text(W / 2, 318, L('top10Title', L('m_' + map)), { fontFamily: FONT, fontSize: '26px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 2));
  if (Platform.leaderboard.local) add(scene.add.text(W / 2, 356, L('lbLocal'), { fontFamily: FONT, fontSize: '19px', color: '#9a93b0' }).setOrigin(0.5).setDepth(D + 2));
  Platform.leaderboard.top('endless_' + map).then(list => drawBoard(scene, o, list, W / 2, 412, D + 2, -1));
  UI.button(scene, W / 2, 940, 300, 84, L('close'), 0x2e6fd1, () => o.forEach(x => x.destroy()), { depth: D + 2, size: '34px' }).forEach(x => o.push(x));
}

// Рекорд (сколько волн пройдено) на карте и открыта ли она.
function mapBest(i) { return Platform.storage.get('best_' + i, i === 0 ? Platform.storage.get('bestWave', 0) : 0); }
function mapUnlocked(i) { return i === 0 || mapBest(i - 1) >= WAVES.length; }

// Загрузка: рисованные монстры из sprites.js превращаются в текстуры.
// Если какой-то картинки нет, Monsters.makeAll дорисует монстра кодом.
class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    this.add.text(W / 2, H / 2, L('loading'), { fontFamily: FONT, fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    const pics = Object.assign({}, SPRITES, ART);                 // спрайты монстров + киношные картинки
    const keys = Object.keys(pics).filter(k => !this.textures.exists(k));
    const sheets = Object.keys(ANIMS).filter(k => !this.textures.exists('a_' + k));
    const ports = Object.keys(PORTRAITS).filter(k => !this.textures.exists('p_' + k));
    let left = keys.length + sheets.length + ports.length;
    const done = () => { if (--left <= 0) this.scene.start('menu'); };
    if (!left) { this.scene.start('menu'); return; }
    this.textures.on('onerror', done);
    for (const k of keys) { this.textures.once('addtexture-' + k, done); this.textures.addBase64(k, pics[k]); }
    // Киношные портреты для витрины: один зацикленный ролик на стража.
    for (const k of ports) {
      const m = PORTRAITS[k], img = new Image();
      img.onerror = done;
      img.onload = () => {
        this.textures.addSpriteSheet('p_' + k, img, { frameWidth: m.fw, frameHeight: m.fh });
        this.anims.create({ key: 'p_' + k, frames: this.anims.generateFrameNumbers('p_' + k, { start: 0, end: m.frames - 1 }), frameRate: m.fps, repeat: -1 });
        done();
      };
      img.src = m.data;
    }
    // Листы кадров: покой крутится по кругу, атака проигрывается один раз.
    for (const k of sheets) {
      const m = ANIMS[k], img = new Image();
      img.onerror = done;
      img.onload = () => {
        this.textures.addSpriteSheet('a_' + k, img, { frameWidth: m.frame, frameHeight: m.frame });
        const fr = r => this.anims.generateFrameNumbers('a_' + k, { start: r[0], end: r[1] });
        this.anims.create({ key: k + '_idle', frames: fr(m.idle), frameRate: m.idleFps, repeat: -1 });
        this.anims.create({ key: k + '_attack', frames: fr(m.attack), frameRate: m.attackFps, repeat: 0 });
        done();
      };
      img.src = m.data;
    }
  }
}

const MENU_LIFT = 100;            // на сколько подняты картинка и кнопки главного меню (название остаётся на месте)

class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    this.tweens.resumeAll(); Sfx.setMusic('menu');
    Monsters.makeAll(this);
    this.input.on('pointerdown', () => Sfx.unlock());
    // Заставка: киношная картинка на весь экран (если её нет — прежний зелёный фон с фигурками).
    const g = this.add.graphics();
    if (this.textures.exists('menu_bg')) {
      // Картинка поднята на MENU_LIFT без увеличения; освободившийся низ закрыт тёмным фоном.
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d0a18).setDepth(-3);
      const bg = this.add.image(W / 2, H / 2 - MENU_LIFT, 'menu_bg').setDisplaySize(W, H).setDepth(-2);
      g.fillGradientStyle(0x0d0a18, 0x0d0a18, 0x0d0a18, 0x0d0a18, 0.55, 0.55, 0, 0); g.fillRect(0, 0, W, 430);       // затемнение под название
      g.fillGradientStyle(0x0d0a18, 0x0d0a18, 0x0d0a18, 0x0d0a18, 0, 0, 1, 1); g.fillRect(0, 860 - MENU_LIFT, W, 340);              // и под кнопки: картинка плавно уходит в тёмный фон
      g.fillStyle(0x0d0a18); g.fillRect(0, 1200 - MENU_LIFT, W, 80 + MENU_LIFT);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x2f6b3a).setDepth(-2); Scenery.ground(g);
      const bob = (img, d) => this.tweens.add({ targets: img, y: img.y - 10, duration: 700 + d, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      [['t_gun_3', 190], ['t_cannon_3', 360], ['t_frost_3', 530]].forEach(([k, x], i) => bob(this.add.image(x, 600, k).setScale(1.7 / TEX_S), i * 120));
    }

    // Логотип: название игры одно на всех языках, русский подзаголовок под ним.
    const logo = this.add.text(W / 2, 190, 'Guardlings', { fontFamily: FONT, fontSize: '118px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2a1450', strokeThickness: 18 }).setOrigin(0.5).setShadow(0, 8, 'rgba(0,0,0,0.55)', 10, true, false);
    logo.setTint(0xfff6b8, 0xfff6b8, 0xf5a623, 0xf5a623);
    this.tweens.add({ targets: logo, scale: 1.03, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, 286, L('subtitle'), { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#2a1450', strokeThickness: 8 }).setOrigin(0.5);

    uiButton(this, W / 2, 1076 - MENU_LIFT, 460, 108, L('play'), 0x2e8b57, () => this.scene.start('maps'), 1, '54px');
    uiButton(this, W / 2, 1190 - MENU_LIFT, 460, 70, L('settings'), 0x5a4f7a, () => settingsOverlay(this, null, true), 1, '32px');
    this.add.text(W - 14, 1262, L('version'), { fontFamily: FONT, fontSize: '18px', color: '#b9b2cc' }).setOrigin(1, 0.5);
  }
}

class MapScene extends Phaser.Scene {
  constructor() { super('maps'); }
  create() {
    this.input.on('pointerdown', () => Sfx.unlock());
    Sfx.setMusic('menu');
    this.add.rectangle(W / 2, H / 2, W, H, 0x24512c);
    this.add.text(W / 2, 110, L('chooseMap'), { fontFamily: FONT, fontSize: '56px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

    MAPS.forEach((m, i) => {
      const cy = 380 + i * 390, open = mapUnlocked(i), best = mapBest(i);
      const card = UI.card(this, W / 2, cy, 640, 350, open ? 0xf3d27a : 0x777777, !open);
      // Мини-схема карты
      const sc = 0.235, ox = 60, oy = cy - 150, g = this.add.graphics();
      g.fillStyle(0x2f6b3a); g.fillRect(ox, oy, W * sc, 1280 * sc);
      g.lineStyle(ROAD_W * sc, 0xc9a66b); g.fillStyle(0xc9a66b);
      for (let k = 0; k < m.path.length - 1; k++) {
        const [x1, y1] = m.path[k], [x2, y2] = m.path[k + 1];
        g.lineBetween(ox + x1 * sc, oy + Math.max(y1, 0) * sc, ox + x2 * sc, oy + y2 * sc);
        g.fillCircle(ox + x2 * sc, oy + y2 * sc, ROAD_W * sc / 2);
      }
      g.fillStyle(0xffffff, 0.6); for (const [x, y] of m.slots) g.fillCircle(ox + x * sc, oy + y * sc, 5);
      const [px, py] = m.path[m.path.length - 1];
      g.fillStyle(0xb07cf0); g.fillCircle(ox + px * sc, oy + py * sc, 12);
      if (!open) g.setAlpha(0.35);

      const tx = 260;
      this.add.text(tx, cy - 140, L('mapN', i + 1), { fontFamily: FONT, fontSize: '26px', color: '#aaa' });
      this.add.text(tx, cy - 105, L('m_' + i), { fontFamily: FONT, fontSize: '44px', color: open ? '#fff' : '#888', fontStyle: 'bold' });
      if (open) {
        const done = best >= WAVES.length;
        this.add.text(tx, cy - 40, done ? (best > WAVES.length ? L('clearedEndless', best) : L('cleared')) : L('best', best, WAVES.length),
          { fontFamily: FONT, fontSize: '28px', color: done ? '#ffe066' : '#ccc' });
        if (done) {                                     // карта пройдена: рядом с «Играть» кнопка таблицы рекордов
          uiButton(this, tx + 118, cy + 95, 236, 96, L('play'), 0x2e6fd1, () => this.scene.start('game', { map: i }), 1, '40px');
          uiButton(this, tx + 314, cy + 95, 132, 96, '🏆', 0x8a5a2e, () => leaderboardOverlay(this, i), 1, '42px');
        } else uiButton(this, tx + 190, cy + 95, 380, 96, L('play'), 0x2e6fd1, () => this.scene.start('game', { map: i }), 1, '40px');
      } else {
        this.add.text(tx, cy - 30, L('locked', i), { fontFamily: FONT, fontSize: '23px', color: '#999', lineSpacing: 8 });
      }
    });
    uiButton(this, W / 2, 1180, 360, 90, L('back'), 0x5a4f7a, () => this.scene.start('menu'), 1, '36px');
  }
}
