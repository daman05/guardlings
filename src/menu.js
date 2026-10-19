// Оболочка игры: главное меню и выбор карты.

// Белый силуэт эмодзи (цветной значок становится белым, как текстовые ⚙ и ▶ на соседних кнопках).
function whiteIcon(scene, emoji, size) {
  const key = 'wi_' + emoji + size;
  if (scene.textures.exists(key)) return key;
  const S = Math.ceil(size * 1.4), t = scene.textures.createCanvas(key, S, S), c = t.getContext();
  c.font = size + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, S / 2, S / 2 + size * 0.06);
  const d = c.getImageData(0, 0, S, S); for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; }
  c.putImageData(d, 0, 0); t.refresh(); return key;
}

function uiButton(scene, x, y, w, h, label, color, cb, depth = 1, size = '30px') {
  return UI.button(scene, x, y, w, h, label, color, cb, { depth, size });
}

// Окно настроек: звуки игры и (в главном меню) язык. Общее для меню и игры.
function settingsOverlay(scene, onClose, withLang) {
  const o = [], D = 50, add = x => { o.push(x); return x; };
  add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(D).setInteractive());
  const top = withLang ? 440 : 480;               // с выбором языка окно выше
  add(UI.card(scene, W / 2, withLang ? 650 : 620, 580, withLang ? 560 : 400, 0xf3d27a).setDepth(D + 1));
  add(scene.add.text(W / 2, top, L('settings'), { fontFamily: FONT, fontSize: '50px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 2));
  const row = (y, onText, offText, get, set) => {
    let pair = null;
    const make = () => {
      if (pair) pair.forEach(x => x.destroy());
      pair = UI.button(scene, W / 2, y, 480, 96, get() ? onText : offText, get() ? 0x2e8b57 : 0x5a4f7a, () => { set(!get()); make(); }, { depth: D + 2, size: '32px' });
    };
    make(); o.push({ destroy: () => pair.forEach(x => x.destroy()) });
  };
  row(top + 120, L('sfxOn'), L('sfxOff'), () => Sfx.sfxOn, v => Sfx.setSfxOn(v));
  // Язык меняется только из главного меню: экран перерисовывается целиком.
  if (withLang) {                                  // выбор языка: все языки видны сразу, текущий подсвечен
    add(scene.add.text(W / 2, top + 202, L('languageLabel'), { fontFamily: FONT, fontSize: '26px', color: '#b9b2cc' }).setOrigin(0.5).setDepth(D + 2));
    LANGS.forEach((code, i) => {
      const on = code === LANG, x = W / 2 + (i - (LANGS.length - 1) / 2) * 246;
      UI.button(scene, x, top + 272, 230, 88, (on ? '✓ ' : '') + STRINGS[code].languageName, on ? 0x2e8b57 : 0x5a4f7a,
        () => { if (!on) { setLang(code); scene.scene.restart(); } }, { depth: D + 2, size: '30px' }).forEach(b => o.push(b));
    });
  }
  UI.button(scene, W / 2, top + (withLang ? 400 : 260), 320, 88, L('done'), 0x2e6fd1, () => { o.forEach(x => x.destroy()); if (onClose) onClose(); }, { depth: D + 2, size: '36px' }).forEach(x => o.push(x));
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
function leaderboardOverlay(scene, map, hard = false) {
  const o = [], D = 50, add = x => { o.push(x); return x; };
  add(scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(D).setInteractive());
  add(UI.card(scene, W / 2, 640, 600, 760, 0xf3d27a).setDepth(D + 1));
  add(scene.add.text(W / 2, 318, L('top10Title', L('m_' + map) + (hard ? ' ☠' : '')), { fontFamily: FONT, fontSize: '26px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 2));
  if (Platform.leaderboard.local) add(scene.add.text(W / 2, 356, L('lbLocal'), { fontFamily: FONT, fontSize: '19px', color: '#9a93b0' }).setOrigin(0.5).setDepth(D + 2));
  Platform.leaderboard.top(mk('endless', map, hard)).then(list => drawBoard(scene, o, list, W / 2, 412, D + 2, -1));
  UI.button(scene, W / 2, 940, 300, 84, L('close'), 0x2e6fd1, () => o.forEach(x => x.destroy()), { depth: D + 2, size: '34px' }).forEach(x => o.push(x));
}

// Рекорд (сколько волн пройдено) на карте и открыта ли она.
function mapBest(i, hard = false) { return Platform.storage.get(mk('best', i, hard), i === 0 && !hard ? Platform.storage.get('bestWave', 0) : 0); }
// Режим разработчика: открывает все карты, не трогая рекорды. Включается адресом с ?dev=1
// или пятью быстрыми нажатиями на номер версии в главном меню (так же выключается); выбор запоминается.
if (/[?&]dev=1/.test(location.search)) Platform.storage.set('dev', true);
if (/[?&]dev=0/.test(location.search)) Platform.storage.set('dev', false);
function devMode() { return !Platform.store && Platform.storage.get('dev', false); }
// Обычный режим: карта открывается после прохождения предыдущей. Тяжёлый: после прохождения этой же карты в обычном.
function mapUnlocked(i, hard = false) { return devMode() || (hard ? mapBest(i) >= MAPS[i].waves.length : i === 0 || mapBest(i - 1) >= MAPS[i - 1].waves.length); }

// Загрузка: рисованные монстры из sprites.js превращаются в текстуры.
// Если какой-то картинки нет, Monsters.makeAll дорисует монстра кодом.
class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    // Полоса загрузки
    this.add.text(W / 2, H / 2 - 50, L('loading'), { fontFamily: FONT, fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    const BW = 420, BH = 22;
    this.add.rectangle(W / 2, H / 2 + 20, BW + 8, BH + 8, 0x000000).setStrokeStyle(3, 0x6b5a9e);
    const bar = this.add.rectangle(W / 2 - BW / 2, H / 2 + 20, 0, BH, 0xffc94a).setOrigin(0, 0.5);

    // Картинка — файл (в интернете) или строка, встроенная в код (при запуске с диска).
    const load = (src, ok, fail) => { const img = new Image(); img.onload = () => ok(img); img.onerror = fail; img.src = withBuild(src); };
    const pics = Object.assign({}, SPRITES, ART);                 // спрайты монстров + киношные картинки
    const keys = Object.keys(pics).filter(k => !this.textures.exists(k));
    const sheets = Object.keys(ANIMS).filter(k => !this.textures.exists('a_' + k));
    const total = keys.length + sheets.length;
    let left = total, started = false;
    const start = () => { if (started) return; started = true; this.loadPortraits(); this.scene.start('menu'); };
    const done = () => { left--; bar.width = BW * (1 - left / total); if (left <= 0) start(); };
    if (!left) { start(); return; }
    for (const k of keys) load(pics[k], img => { this.textures.addImage(k, img); done(); }, done);
    // Листы кадров: покой крутится по кругу, атака проигрывается один раз.
    for (const k of sheets) {
      const m = ANIMS[k];
      load(m.data, img => {
        this.textures.addSpriteSheet('a_' + k, img, { frameWidth: m.frame, frameHeight: m.frame });
        const fr = r => this.anims.generateFrameNumbers('a_' + k, { start: r[0], end: r[1] });
        this.anims.create({ key: k + '_idle', frames: fr(m.idle), frameRate: m.idleFps, repeat: -1 });
        this.anims.create({ key: k + '_attack', frames: fr(m.attack), frameRate: m.attackFps, repeat: 0 });
        done();
      }, done);
    }
  }
  // Киношные портреты для витрины тяжёлые, поэтому грузятся в фоне, уже после входа в меню.
  // Пока портрета нет, витрина показывает обычную картинку стража.
  loadPortraits() { for (const k of Object.keys(PORTRAITS)) loadPortrait(this, k, PORTRAITS[k]); }
}

// Адрес файла с номером сборки (?v=…), чтобы после обновления браузер не брал старую картинку из кеша.
function withBuild(src) { return !window.BUILD || src.startsWith('data:') ? src : src + (src.includes('?') ? '&' : '?') + 'v=' + BUILD; }

// Загружает один живой портрет (лист кадров) и заводит для него анимацию 'p_<ключ>'.
// Повторные вызовы для того же ключа ничего не делают. cb вызывается, когда портрет готов.
const portraitsLoading = {};
function loadPortrait(scene, key, m, cb) {
  const tex = scene.textures, anims = scene.anims, name = 'p_' + key;
  if (!m || portraitsLoading[key] || tex.exists(name)) return;
  // Файл картинки нельзя прочитать при запуске с диска — там остаётся неподвижный портрет.
  if (location.protocol === 'file:' && !m.data.startsWith('data:')) return;
  portraitsLoading[key] = true;
  const img = new Image();
  img.onload = () => {
    tex.addSpriteSheet(name, img, { frameWidth: m.fw, frameHeight: m.fh });
    anims.create({ key: name, frames: anims.generateFrameNumbers(name, { start: 0, end: m.frames - 1 }), frameRate: m.fps, repeat: -1 });
    if (cb) cb();
  };
  img.onerror = () => { portraitsLoading[key] = false; };
  img.src = withBuild(m.data);
}

const MENU_LIFT = 100;            // на сколько подняты картинка и кнопки главного меню (название остаётся на месте)

class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    this.tweens.resumeAll();
    Platform.ready();                              // площадке: игра загрузилась, можно играть
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

    // Кнопки меню: одинаковая высота (MB_H) и одинаковые промежутки (MB_GAP) между рядами.
    const MB_H = 84, MB_GAP = 20, row = k => 1076 - MENU_LIFT + k * (MB_H + MB_GAP);
    // Значок слева от надписи, отдельным объектом: так его размер одинаковый на всех кнопках меню.
    const withIcon = (txt, icon, gap = 12) => {
      const w = icon.displayWidth + gap; txt.x += w / 2; icon.setPosition(txt.x - txt.width / 2 - w / 2, txt.y).setDepth(txt.depth + 0.1);
      // тень под значком-картинкой — такая же, как у надписей на кнопках
      if (icon.type === 'Image') this.add.image(icon.x, icon.y + 2, icon.texture.key).setTintFill(0x000000).setAlpha(0.55).setDepth(txt.depth);
    };
    withIcon(uiButton(this, W / 2, row(0), 460, MB_H, L('play'), 0x2e8b57, () => this.scene.start('maps'), 1, '42px')[1],
      this.add.text(0, 0, '▶', { fontFamily: FONT, fontSize: '27px', color: '#ffffff' }).setOrigin(0.5).setShadow(0, 2, 'rgba(0,0,0,0.6)', 3), 22);
    uiButton(this, W / 2 - 118, row(1), 224, MB_H, '⚙ ' + L('settings'), BTN.settings, () => settingsOverlay(this, null, true), 1, '27px');
    withIcon(uiButton(this, W / 2 + 118, row(1), 224, MB_H, L('book'), 0x8a5a2e, () => this.scene.start('book'), 1, '27px')[1], this.add.image(0, 0, whiteIcon(this, '👾', 26)));
    withIcon(uiButton(this, W / 2, row(2), 460, MB_H, `${L('upgrades')}   ◆ ${Meta.crystals}`, 0x2c7f96, () => this.scene.start('upgrades'), 1, '27px')[1],
      this.add.image(0, 0, whiteIcon(this, '💪', 30)));
    if (UP_ORDER.some(id => !Meta.maxed(id) && Meta.crystals >= Meta.cost(id))) UI.shine(this, W / 2, row(2), 460, MB_H, 3);   // есть на что потратить кристаллы
    const ver = this.add.text(W - 14, 1262, L('version') + (devMode() ? '  ·  DEV' : ''), { fontFamily: FONT, fontSize: '18px', color: devMode() ? '#ffe066' : '#b9b2cc' }).setOrigin(1, 0.5);
    let taps = 0, last = 0;                          // пять быстрых нажатий на версию переключают режим разработчика
    this.add.zone(W - 90, 1250, 180, 60).setInteractive().on('pointerdown', () => {
      const now = Date.now(); taps = now - last < 600 ? taps + 1 : 1; last = now;
      if (taps >= 5) { Platform.storage.set('dev', !devMode()); Sfx.play('evolve'); this.scene.restart(); }
    });
  }
}

class MapScene extends Phaser.Scene {
  constructor() { super('maps'); }
  init(data) { this.hard = !!(data && data.hard); }
  create() {
    this.input.on('pointerdown', () => Sfx.unlock());
    this.add.rectangle(W / 2, H / 2, W, H, 0x24512c);
    this.add.text(W / 2, 58, L('chooseMap'), { fontFamily: FONT, fontSize: '44px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const hard = this.hard;
    const tab = (x, on, label, to) => uiButton(this, x, 126, 330, 54, label, on ? (to ? 0xa33a3a : 0x2e6fd1) : 0x5a4f7a, () => { if (!on) this.scene.restart({ hard: to }); }, 1, '25px');
    tab(W / 2 - 172, !hard, L('modeNormal'), false); tab(W / 2 + 172, hard, '☠ ' + L('modeHard'), true);

    MAPS.forEach((m, i) => {
      const cy = 262 + i * 190, open = mapUnlocked(i, hard), best = mapBest(i, hard), NW = m.waves.length, TH = THEMES[m.theme] || THEMES.meadow;
      UI.card(this, W / 2, cy, 680, 178, open ? (hard ? 0xe0705a : 0xf3d27a) : 0x777777, !open);
      // Мини-схема карты в цветах её оформления
      const sc = 0.128, ox = 36, oy = cy - 82, g = this.add.graphics();
      g.fillStyle(TH.bg); g.fillRect(ox, oy, W * sc, 1280 * sc);
      g.lineStyle(ROAD_W * sc, TH.road); g.fillStyle(TH.road);
      for (const path of m.paths) for (let k = 0; k < path.length - 1; k++) {
        const [x1, y1] = path[k], [x2, y2] = path[k + 1];
        g.lineBetween(ox + x1 * sc, oy + Math.max(y1, 0) * sc, ox + x2 * sc, oy + y2 * sc);
        g.fillCircle(ox + x2 * sc, oy + y2 * sc, ROAD_W * sc / 2);
      }
      g.fillStyle(0xffffff, 0.75); for (const [x, y] of m.slots) g.fillCircle(ox + x * sc, oy + y * sc, 3);
      const [px, py] = m.path[m.path.length - 1];
      g.fillStyle(0xb07cf0); g.fillCircle(ox + px * sc, oy + py * sc, 8);
      if (!open) g.setAlpha(0.35);

      const tx = 150;
      this.add.text(tx, cy - 82, L('mapN', i + 1), { fontFamily: FONT, fontSize: '20px', color: '#aaa' });
      this.add.text(tx, cy - 60, L('m_' + i), { fontFamily: FONT, fontSize: '38px', color: open ? '#fff' : '#888', fontStyle: 'bold' });
      if (open) {
        const n = Meta.stars(i, hard), done = best >= NW;
        this.add.text(680, cy - 60, '★'.repeat(n) + '☆'.repeat(3 - n), { fontFamily: FONT, fontSize: '36px', color: n ? '#ffd23d' : '#6a6480' }).setOrigin(1, 0.5).setDepth(3);
        this.add.text(tx, cy - 8, done ? (best > NW ? L('clearedEndless', best) : L('cleared')) : L('best', best, NW),
          { fontFamily: FONT, fontSize: '22px', color: done ? '#ffe066' : '#ccc' });
        // «Играть» на всех карточках стоит одинаково; у пройденных карт справа добавляется кнопка таблицы рекордов.
        uiButton(this, 440, cy + 48, 280, 62, L('play'), 0x2e6fd1, () => this.scene.start('game', { map: i, hard }), 1, '30px');
        if (done) uiButton(this, 634, cy + 48, 76, 62, '🏆', 0x8a5a2e, () => leaderboardOverlay(this, i, hard), 1, '30px');
      } else {
        this.add.text(tx, cy - 6, hard ? L('lockedHard') : L('locked', i), { fontFamily: FONT, fontSize: '21px', color: '#999', lineSpacing: 6 });
      }
    });
    uiButton(this, W / 2, 1226, 360, 70, L('back'), 0x5a4f7a, () => this.scene.start('menu'), 1, '32px');
  }
}

// Список, который листается пальцем (или колёсиком) между шапкой top и низом bottom.
// items — объекты списка; state[key] хранит положение, чтобы после перезапуска сцены список не прыгал наверх.
// Шапку и низ сцена рисует сама поверх (depth ≥ 10), закрывая уехавшие карточки.
function scrollList(scene, items, top, bottom, contentBottom, state, key, bg) {
  items.forEach(o => o.setData('y0', o.y));
  const maxScroll = Math.max(0, contentBottom - bottom);
  const bar = scene.add.rectangle(W - 8, 0, 6, 0, 0xffffff, 0.35).setOrigin(0.5, 0).setDepth(11);
  const apply = v => {
    state[key] = Phaser.Math.Clamp(v, 0, maxScroll);
    items.forEach(o => { o.y = o.getData('y0') - state[key]; });
    const vis = bottom - top, h = vis * vis / (vis + maxScroll);
    bar.setVisible(maxScroll > 0).setSize(6, h); bar.y = top + (vis - h) * (maxScroll ? state[key] / maxScroll : 0);
  };
  apply(state[key] || 0);
  let downY = 0, start = 0;
  scene.input.on('pointerdown', p => { downY = p.y; start = state[key] || 0; scene.dragged = false; });
  scene.input.on('pointermove', p => { if (!p.isDown) return; if (Math.abs(p.y - downY) > 10) scene.dragged = true; if (scene.dragged) apply(start - (p.y - downY)); });
  scene.input.on('wheel', (p, objs, dx, dy) => apply((state[key] || 0) + dy * 0.6));
  scene.add.rectangle(W / 2, top / 2, W, top, bg).setDepth(10).setInteractive();
  scene.add.rectangle(W / 2, (bottom + H) / 2, W, H - bottom, bg).setDepth(10).setInteractive();
}

// Справочник: кто из диких монстров чем опасен и какой страж для чего нужен.
// Карточки полного размера; если не влезают — список листается.
class BookScene extends Phaser.Scene {
  constructor() { super('book'); }
  init(data) { this.tab = (data && data.tab) || 'enemies'; }
  create() {
    this.input.on('pointerdown', () => Sfx.unlock());
    Monsters.makeAll(this);
    const BG = 0x1b1530, TOP = 198, BOTTOM = 1170, items = [];
    this.add.rectangle(W / 2, H / 2, W, H, BG);
    const put = o => { items.push(o); return o; };
    const txt = (x, y, str, size, color, bold) => put(this.add.text(x, y, str, { fontFamily: FONT, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: 690 - x }, lineSpacing: 4 }).setDepth(3));
    let end = TOP;
    if (this.tab === 'enemies') {
      const ROW = 170;
      Object.keys(ENEMIES).forEach((k, i) => {
        const e = ENEMIES[k], y = TOP + 14 + 80 + i * ROW;
        put(UI.card(this, W / 2, y, 690, 160, e.color));
        put(this.add.image(92, y, 'e_' + k).setDisplaySize(124, 124).setDepth(3));
        txt(170, y - 66, L('e_' + k), '29px', '#ffe066', true);
        txt(170, y - 26, L('bkEnemy', e.hp, e.speed, e.gold), '19px', '#9fd3ff');
        txt(170, y + 4, L('b_' + k), '21px', '#e8e4f2');
        end = y + 80 + 14;
      });
    } else {
      const ROW = 244;
      TOWER_ORDER.forEach((k, i) => {
        const d = TOWERS[k], y = TOP + 14 + 117 + i * ROW;
        put(UI.card(this, W / 2, y, 690, 234, d.color));
        // три стадии: одинаковые промежутки между картинками, все стоят на одной линии
        for (let l = 1, x = 22; l <= MAX_LEVEL; l++) { const sz = 56 + l * 10; put(this.add.image(x + sz / 2, y + 92, `t_${k}_${l}`).setOrigin(0.5, 1).setDisplaySize(sz, sz).setDepth(3)); x += sz - 4; }
        txt(30, y - 104, L('t_' + k), '29px', '#ffe066', true);
        put(this.add.text(676, y - 86, L('bkCost', d.cost), { fontFamily: FONT, fontSize: '22px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(1, 0.5).setDepth(3));
        txt(250, y - 56, statRows(k, 1).map(r => r.label + ' ' + r.value).join('\n'), '19px', '#9fd3ff');
        txt(250, y + 26, L('g_' + k), '20px', '#e8e4f2');
        end = y + 117 + 14;
      });
    }
    scrollList(this, items, TOP, BOTTOM, end, BookScene.scroll, this.tab, BG);
    this.add.text(W / 2, 70, L('book'), { fontFamily: FONT, fontSize: '52px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    const tabBtn = (x, id, label) => uiButton(this, x, 150, 330, 64, label, this.tab === id ? 0x2e6fd1 : 0x5a4f7a, () => { if (this.tab !== id) this.scene.restart({ tab: id }); }, 11, '26px');
    tabBtn(W / 2 - 172, 'enemies', L('bookWild')); tabBtn(W / 2 + 172, 'towers', L('bookGuards'));
    uiButton(this, W / 2, 1220, 360, 76, L('back'), 0x5a4f7a, () => { BookScene.scroll = {}; this.scene.start('menu'); }, 11, '32px');
  }
}
BookScene.scroll = {};

// Постоянные улучшения за кристаллы (кнопка «Улучшения» в главном меню).
class UpgradeScene extends Phaser.Scene {
  constructor() { super('upgrades'); }
  create() {
    this.input.on('pointerdown', () => Sfx.unlock());
    this.add.rectangle(W / 2, H / 2, W, H, 0x1b1530);
    // Список улучшений листается пальцем между шапкой и кнопкой «Назад».
    const TOP = 224, BOTTOM = 1182, ROW = 172, items = [];
    const put = o => { o.setData('y0', o.y); items.push(o); return o; };
    UP_ORDER.forEach((id, i) => {
      const u = UPGRADES[id], y = TOP + 86 + i * ROW, lvl = Meta.level(id), max = Meta.maxed(id), ok = !max && Meta.crystals >= Meta.cost(id);
      put(UI.card(this, W / 2, y, 690, 160, u.color));
      put(this.add.text(34, y - 62, UP_ICON[id] + ' ' + L('up_' + id), { fontFamily: FONT, fontSize: '27px', color: '#ffe066', fontStyle: 'bold' }).setDepth(3));
      // сейчас и (зелёным) — что даст следующий уровень
      put(this.add.text(34, y - 20, upgradeText(id, lvl), { fontFamily: FONT, fontSize: '20px', color: '#e8e4f2' }).setDepth(3));
      if (!max) put(this.add.text(34, y + 10, '→ ' + upgradeText(id, lvl + 1), { fontFamily: FONT, fontSize: '18px', color: '#7CFC8A' }).setDepth(3));
      for (let k = 0; k < UP_COST.length; k++) put(this.add.rectangle(46 + k * 44, y + 52, 36, 14, k < lvl ? u.color : 0x3a3352).setStrokeStyle(2, 0x000000).setDepth(3));
      if (max) put(this.add.text(566, y + 4, L('upMax'), { fontFamily: FONT, fontSize: '26px', color: '#7CFC8A', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3));
      else {
        const [img, txt] = UI.button(this, 566, y + 4, 196, 76, `◆ ${Meta.cost(id)}`, 0x2c7f96, null, { depth: 3, size: '30px', enabled: ok, silent: true });
        put(img); put(txt);
        // покупка по отпусканию пальца, и только если список не листали
        if (ok) img.on('pointerup', p => { if (!this.dragged && p.y > TOP && p.y < BOTTOM && Meta.buy(id)) { Sfx.play('evolve'); this.scene.restart(); } });
        if (ok) UI.shine(this, 566, y + 4, 196, 76, 4).objs.forEach(put);
      }
    });
    // Прокрутка: тянем пальцем; положение запоминается, чтобы после покупки список не прыгал наверх.
    const maxScroll = Math.max(0, TOP + 86 + (UP_ORDER.length - 1) * ROW + 90 - BOTTOM);
    const bar = this.add.rectangle(W - 8, 0, 6, 0, 0xffffff, 0.35).setOrigin(0.5, 0).setDepth(11);
    const apply = v => {
      UpgradeScene.scroll = Phaser.Math.Clamp(v, 0, maxScroll);
      items.forEach(o => { o.y = o.getData('y0') - UpgradeScene.scroll; });
      const vis = BOTTOM - TOP, h = vis * vis / (vis + maxScroll);
      bar.setVisible(maxScroll > 0).setSize(6, h); bar.y = TOP + (vis - h) * (maxScroll ? UpgradeScene.scroll / maxScroll : 0);
    };
    apply(UpgradeScene.scroll || 0);
    let downY = 0, start = 0;
    this.input.on('pointerdown', p => { downY = p.y; start = UpgradeScene.scroll; this.dragged = false; });
    this.input.on('pointermove', p => { if (!p.isDown) return; if (Math.abs(p.y - downY) > 10) this.dragged = true; if (this.dragged) apply(start - (p.y - downY)); });
    this.input.on('wheel', (p, objs, dx, dy) => apply(UpgradeScene.scroll + dy * 0.6));
    // Шапка и низ поверх списка: закрывают уехавшие карточки и не пропускают нажатия к ним.
    this.add.rectangle(W / 2, TOP / 2, W, TOP, 0x1b1530).setDepth(10).setInteractive();
    this.add.rectangle(W / 2, (BOTTOM + H) / 2, W, H - BOTTOM, 0x1b1530).setDepth(10).setInteractive();
    this.add.text(W / 2, 64, L('upgrades'), { fontFamily: FONT, fontSize: '52px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    this.add.text(W / 2, 132, `◆ ${Meta.crystals}`, { fontFamily: FONT, fontSize: '44px', color: '#7fe9ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    this.add.text(W / 2, 186, L('upHint'), { fontFamily: FONT, fontSize: '19px', color: '#b9b2cc', align: 'center' }).setOrigin(0.5).setDepth(11);
    // Кристаллы за просмотр ролика — только там, где площадка умеет показывать рекламу за награду.
    if (Platform.ads.rewarded) uiButton(this, W / 2 - 130, 1232, 230, 64, L('adCrystals', REWARD.ad), 0x8a5a2e, () => Platform.ads.showRewarded().then(ok => { if (ok) { Meta.add(REWARD.ad); Sfx.play('evolve'); } this.scene.restart(); }), 11, '20px');
    uiButton(this, Platform.ads.rewarded ? W / 2 + 160 : W / 2, 1232, Platform.ads.rewarded ? 260 : 360, 66, L('back'), 0x5a4f7a, () => { UpgradeScene.scroll = 0; this.scene.start('menu'); }, 11, '30px');
  }
}
