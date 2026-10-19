
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  init(data) { if (data && data.map !== undefined) useMap(data.map, data.hard === undefined ? HARD : data.hard); }

  create() {
    this.tweens.resumeAll(); this.anims.resumeAll(); this.paused = false;
    this.gold = BAL.startGold + (MAPS[MAP_INDEX].gold || 0) + Meta.bonus('gold'); this.endless = false; this.endItems = []; this.tipItems = []; this.tut = -1; this.wave = 0;
    this.maxLives = this.lives = START_LIVES + Meta.bonus('lives');
    this.cd = { meteor: 0, freeze: 0 }; this.aim = false; this.abText = {};
    this.waveActive = false; this.spawnQueue = []; this.spawnTimer = 0; this.leaks = {};
    this.enemies = []; this.towers = []; this.bullets = [];
    this.selected = null; this.over = false; this.panelItems = []; this.panelTweens = []; this.panelTimers = []; this.panelKey = null; this.speed = 1;
    this.best = mapBest(MAP_INDEX, HARD);

    Monsters.makeAll(this);

    // Сегменты дороги
    // Дорог на карте может быть несколько (два входа или развилка): у каждой свои сегменты и длина.
    // flyLen — путь летуна: по прямой от входа этой дороги к порталу.
    this.routes = PATHS.map(pts => {
      const segs = []; let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1);
        segs.push({ x1, y1, x2, y2, len, start: total }); total += len;
      }
      const [ax, ay] = pts[0], [zx, zy] = pts[pts.length - 1];
      return { segs, len: total, from: pts[0], to: pts[pts.length - 1], flyLen: Math.hypot(zx - ax, zy - ay) };
    });
    this.segs = [].concat(...this.routes.map(r => r.segs));       // все сегменты сразу: для рисования и декораций
    this.pathLen = this.routes[0].len; this.spawnN = 0;
    const TH = THEMES[MAPS[MAP_INDEX].theme] || THEMES.meadow;

    // Поле и дорога
    const bg = this.add.rectangle(W / 2, H / 2, W, H, TH.bg).setInteractive();
    bg.on('pointerdown', () => this.select(null));
    this.input.on('pointerdown', () => Sfx.unlock());
    // Прицел метеора: круг ходит за пальцем, касание поля — удар.
    this.aimGfx = this.add.circle(W / 2, 600, ABILITIES.meteor.radius, 0xff7a1a, 0.18).setStrokeStyle(4, 0xffb060, 0.9).setDepth(16).setVisible(false);
    this.input.on('pointermove', p => { if (this.aim) this.aimGfx.setPosition(p.worldX, Phaser.Math.Clamp(p.worldY, 100, 1070)); });
    this.input.on('pointerdown', p => { if (this.aim && !this.paused && !this.over && p.worldY > 92 && p.worldY < 1078) this.meteor(p.worldX, p.worldY); });
    const g = this.add.graphics();
    Scenery.ground(g);
    const road = (w, c) => {
      g.fillStyle(c);
      for (const s of this.segs) {
        g.fillRect(Math.min(s.x1, s.x2) - w / 2, Math.min(s.y1, s.y2) - w / 2,
          Math.abs(s.x2 - s.x1) + w, Math.abs(s.y2 - s.y1) + w);
      }
    };
    road(ROAD_W + 12, TH.edge); road(ROAD_W, TH.road);
    Scenery.props(g, this.segs);
    const [bx, by] = PATH[PATH.length - 1];
    Scenery.portal(this, bx, by);
    this.add.text(bx, by + 67, L('portal'), { fontFamily: FONT, fontSize: '16px', color: '#f0dcff', fontStyle: 'bold', stroke: '#2a0a5e', strokeThickness: 4 }).setOrigin(0.5).setDepth(3);

    // Площадки
    this.slots = SLOTS.map(([x, y]) => {
      const s = { x, y, tower: null };
      s.gfx = this.add.circle(x, y, 34, 0x000000, 0.25).setStrokeStyle(3, 0xffffff, 0.5).setInteractive();
      s.gfx.on('pointerdown', () => this.select(s));
      return s;
    });
    this.rangeGfx = this.add.circle(0, 0, 10, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.7)
      .setVisible(false).setDepth(5);
    this.selGfx = this.add.circle(0, 0, 38).setStrokeStyle(4, 0xffe066).setVisible(false).setDepth(6);
    // Дальность после эволюции: золотой мерцающий круг поверх нынешнего белого.
    this.nextRangeGfx = this.add.circle(0, 0, 10, 0xffe066, 0.08).setStrokeStyle(4, 0xffe066, 0.95).setVisible(false).setDepth(5);
    this.tweens.add({ targets: this.nextRangeGfx, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });

    // Верхняя панель
    UI.bar(this, W / 2, 45, W, 90, 'bottom').setDepth(20).setInteractive();
    // Показатели разными цветами: жизни красные, золото жёлтое, волна голубая.
    const hudText = (x, color) => this.add.text(x, 45, '', { fontFamily: FONT, fontSize: '30px', color, fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(21);
    this.heart = this.add.text(36, 45, '♥', { fontFamily: FONT, fontSize: '40px', color: '#ff4d4d' }).setOrigin(0.5).setDepth(21);
    this.livesText = hudText(60, '#ff8a8a');
    this.coin(150, 45, 15, 21);
    this.goldText = hudText(174, '#ffe066');
    this.waveText = hudText(292, '#8fd0ff');
    if (HARD) this.waveText.setFontSize(24).setColor('#ff9d8a');     // тяжёлый режим: череп перед номером волны
    this.shownLives = this.lives;

    // Красная вспышка по краям поля при потере жизни (градиент от края к центру).
    const v = this.vignette = this.add.graphics().setDepth(19).setAlpha(0);
    const R = 0xff1a1a, top = 90, bot = 1080, e = 130;
    v.fillGradientStyle(R, R, R, R, 0.85, 0.85, 0, 0); v.fillRect(0, top, W, e);
    v.fillGradientStyle(R, R, R, R, 0, 0, 0.85, 0.85); v.fillRect(0, bot - e, W, e);
    v.fillGradientStyle(R, R, R, R, 0.85, 0, 0.85, 0); v.fillRect(0, top, e, bot - top);
    v.fillGradientStyle(R, R, R, R, 0, 0.85, 0, 0.85); v.fillRect(W - e, top, e, bot - top);
    const topBtn = (x, label, size, cb) => {
      return UI.button(this, x, 43, 68, 56, label, 0x5a4f7a, cb, { depth: 21, size, silent: true })[1];
    };
    // ♪ выключает и включает звук одним нажатием (то же, что в «Настройках»).
    const mt = topBtn(522, '♪', '34px', () => { Sfx.unlock(); Sfx.toggleAll(); this.showMute(); Sfx.play('tap'); });
    const cross = this.add.line(522, 43, -20, 16, 20, -16, 0xff5555).setOrigin(0).setLineWidth(4).setDepth(23);
    this.showMute = () => { const off = !Sfx.sfxOn; mt.setAlpha(off ? 0.35 : 1); cross.setVisible(off); };
    this.showMute();
    this.speedText = topBtn(600, 'x1', '28px', () => { this.speed = this.speed % 3 + 1; this.speedText.setText('x' + this.speed); Sfx.play('tap'); });
    topBtn(678, 'II', '30px', () => { Sfx.play('tap'); this.pauseGame(); });

    // Esc на компьютере и кнопка «Назад» в браузере телефона, если она шлёт Esc, закрывают панель.
    this.input.keyboard && this.input.keyboard.on('keydown-ESC', () => { if (this.aim) { this.aim = false; this.aimGfx.setVisible(false); this.refresh(); } else if (this.selected) this.select(null); });

    // Сворачивание приложения во время игры ставит паузу.
    const onHide = () => this.pauseGame();
    this.game.events.on('hidden', onHide); window.addEventListener('blur', onHide);
    this.events.once('shutdown', () => { this.game.events.off('hidden', onHide); window.removeEventListener('blur', onHide); });

    // Нижняя панель
    UI.bar(this, W / 2, 1180, W, 200, 'top').setDepth(20).setInteractive();

    // Стражи на поле иногда моргают.
    this.time.addEvent({ delay: 450, loop: true, callback: () => {
      const t = Phaser.Utils.Array.GetRandom(this.towers);
      if (!t || this.paused || t.anim || t.pending || t.poseT > 0 || !this.pose(t, 'b')) return;
      this.time.delayedCall(130, () => { if (t.gfx.active && !t.pending && !(t.poseT > 0)) this.pose(t, ''); });
    } });

    // Обучение показывается один раз: при первом запуске первой карты.
    if (MAP_INDEX === 0 && !Platform.storage.get('tutorialDone', false)) this.tutorial(1);
    this.refresh();
  }

  // ---------- вспомогательное ----------
  posAt(dist, route = this.routes[0]) {
    for (const s of route.segs) {
      if (dist <= s.start + s.len) {
        const t = (dist - s.start) / s.len;
        return [s.x1 + (s.x2 - s.x1) * t, s.y1 + (s.y2 - s.y1) * t];
      }
    }
    return PATH[PATH.length - 1];
  }

  stats(t) { return guardStats(t.type, t.level); }
  // Ставит стражу кадр позы: '' обычный, 'b' моргание, 'w' замах, 'a' атака.
  // Возвращает false, если такого кадра у монстра нет.
  pose(t, suffix) {
    const key = `t_${t.type}_${t.level}` + (suffix ? '_' + suffix : '');
    if (!this.textures.exists(key)) return false;
    t.gfx.setTexture(key); return true;
  }

  upgradeCost(t) { return Math.round(TOWERS[t.type].cost * 0.8 * t.level * (1 - Meta.bonus('evo') / 100)); }

  // ---------- действия игрока ----------
  select(slot) {
    if (this.over || this.aim) return;             // пока выбирается цель метеора, поле не реагирует
    if (slot && slot === this.selected) slot = null;   // повторное нажатие на ту же площадку или стража закрывает панель
    if (slot) Sfx.play('tap');
    this.selected = slot;
    if (this.tut === 1 && slot && !slot.tower) this.tutorial(2);
    else if (this.tut === 2 && !(slot && !slot.tower)) this.tutorial(1);
    else if (this.tut === 4 && slot && slot.tower) this.tutorial(-1);
    this.refresh();
  }

  // ---------- обучение ----------
  // Подсказки для первого запуска на первой карте. step: 1 — поставить стража, 2 — выбрать в витрине,
  // 3 — запустить волну, 4 — эволюция (после первой волны), 0 — ждать, -1 — обучение пройдено.
  tutorial(step) {
    this.tipItems.forEach(o => o.destroy()); this.tipItems = [];
    this.tut = step;
    if (step === -1) { Platform.storage.set('tutorialDone', true); return; }
    if (!step) return;
    const add = o => { this.tipItems.push(o); return o; };
    const slot = this.slots[4], t = this.towers[0];
    // куда показывает подсказка: [x цели, y цели, y подсказки]
    const at = { 1: [slot.x, slot.y, slot.y - 130], 2: [W / 2, 930, 850], 3: [W / 2, 1192, 1105], 4: t ? [t.x, t.y - 40, t.y - 170] : [W / 2, 600, 500] }[step];
    const [tx, ty, by] = at, bx = Math.min(W - 250, Math.max(250, tx));
    if (step === 1 || step === 4) {                 // пульсирующее кольцо вокруг цели
      const ring = add(this.add.circle(tx, step === 1 ? ty : ty + 40, 40).setStrokeStyle(6, 0xffe066).setDepth(17));
      this.tweens.add({ targets: ring, scale: 1.35, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    }
    const text = add(this.add.text(bx, by, L('tut' + step), { fontFamily: FONT, fontSize: '26px', color: '#2a1450', fontStyle: 'bold', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(29));
    const skip = add(this.add.text(bx, by + text.height / 2 + 14, L('tutSkip'), { fontFamily: FONT, fontSize: '16px', color: '#7a6a9a' }).setOrigin(0.5).setDepth(29));
    const w = Math.max(text.width, skip.width) + 44, h = text.height + 52, g = add(this.add.graphics().setDepth(28));   // ниже окон паузы и конца игры
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(bx - w / 2 + 3, by - text.height / 2 - 16 + 5, w, h, 16);
    g.fillStyle(0xfff3c4); g.fillRoundedRect(bx - w / 2, by - text.height / 2 - 16, w, h, 16);
    g.fillTriangle(tx - 16, by - text.height / 2 - 16 + h - 1, tx + 16, by - text.height / 2 - 16 + h - 1, tx, by - text.height / 2 - 16 + h + 20);
    g.lineStyle(3, 0x2a1450); g.strokeRoundedRect(bx - w / 2, by - text.height / 2 - 16, w, h, 16);
    this.tweens.add({ targets: [g, text, skip], y: '-=8', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // нажатие на подсказку скрывает обучение насовсем
    const hit = add(this.add.zone(bx, by + 8, w, h).setInteractive().setDepth(29));
    hit.on('pointerdown', () => this.tutorial(-1));
  }

  build(slot, type) {
    const d = TOWERS[type];
    if (slot.tower || this.gold < d.cost) return;
    this.gold -= d.cost;
    const t = { type, slot, level: 1, cd: 0, spent: d.cost, x: slot.x, y: slot.y };
    t.gfx = this.add.sprite(slot.x, slot.y, `t_${type}_1`).setOrigin(0.5, 0.85).setDepth(8);
    this.towerLook(t);
    t.label = this.add.text(slot.x, slot.y + 40, '★', { fontFamily: FONT, fontSize: '16px', color: '#ffe066' }).setOrigin(0.5).setDepth(9);
    slot.tower = t; this.towers.push(t); Sfx.play('build');
    this.selected = null;                          // после покупки панель возвращается к кнопке волны
    if (this.tut === 2 || this.tut === 1) this.tutorial(this.waveActive ? 0 : 3);
    this.refresh();
  }

  // Внешний вид стража по стадии эволюции + «дыхание».
  towerLook(t) {
    if (t.idle) { t.idle.stop(); t.idle = null; }
    const sc = 1.15 * (1 + 0.1 * (t.level - 1)) / TEX_S;
    const key = `t_${t.type}_${t.level}`;
    // На поле покадровая анимация включается только пометкой field (сейчас она используется лишь в витрине).
    t.anim = ANIMS[key] && ANIMS[key].field && this.anims.exists(key + '_idle') ? ANIMS[key] : null;
    t.gfx.off('animationcomplete');
    if (t.anim) {
      // Покадровая анимация: лист кадров вместо картинки, без «дыхания» твином.
      const staticH = 92 * TEX_S * sc;                                  // высота обычного спрайта на экране
      t.gfx.play(key + '_idle').setOrigin(0.5, t.anim.feet).setScale(sc * t.anim.scale).setAngle(0);
      t.gfx.setPosition(t.x, t.y + 0.36 * staticH);
      t.gfx.on('animationcomplete', () => { if (t.gfx.active) t.gfx.play(key + '_idle'); });
      return;
    }
    t.gfx.anims.stop(); t.gfx.setOrigin(0.5, 0.85);
    t.gfx.setTexture(`t_${t.type}_${t.level}`).setScale(sc);
    t.gfx.setPosition(t.x, t.y + 0.35 * t.gfx.displayHeight);
    t.idle = this.tweens.add({ targets: t.gfx, scaleY: sc * 0.93, scaleX: sc * 1.04, duration: 650 + Math.random() * 200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  upgrade(t) {
    const c = this.upgradeCost(t);
    if (t.level >= MAX_LEVEL || this.gold < c) return;
    this.gold -= c; t.spent += c; t.level++;
    t.label.setText('★'.repeat(t.level)); this.towerLook(t); Sfx.play('evolve');
    const puff = this.add.circle(t.x, t.y, 20, 0xffffff, 0.8).setDepth(9);
    this.tweens.add({ targets: puff, scale: 3, alpha: 0, duration: 350, onComplete: () => puff.destroy() });
    this.refresh();
  }

  sell(t) {
    this.gold += Math.round(t.spent * SELL_RATE); Sfx.play('sell');
    if (t.idle) t.idle.stop();
    t.gfx.destroy(); t.label.destroy(); t.slot.tower = null;
    this.towers = this.towers.filter(x => x !== t);
    this.selected = null; this.refresh();
  }

  startWave() {
    if (this.over || (!this.endless && this.wave >= WAVES.length)) return;
    if (this.waveActive) {
      // Следующая волна раньше срока: можно, когда все монстры текущей волны уже вышли.
      // Игрок сразу получает награду за текущую волну и доплату за смелость.
      if (this.spawnQueue.length) return;
      const pay = this.waveReward(this.wave) + this.earlyBonus();
      this.gold += pay; this.floatText(W / 2, 560, L('earlyDone', pay), '#ffe066', '38px');
      if (this.wave > this.best) { this.best = this.wave; Platform.storage.set(mk('best'), this.best); }
    }
    this.wave++; this.waveActive = true; this.spawnQueue = [];
    if (this.tut === 3) this.tutorial(0);
    for (const [type, count, gap] of (this.wave <= WAVES.length ? WAVES[this.wave - 1] : endlessWave(this.wave)))
      for (let i = 0; i < count; i++) this.spawnQueue.push({ type, gap });
    this.spawnTimer = 0.5; Sfx.play('wave'); this.refresh(); Platform.gameplay(true);
    if (this.wave === 2 && this.tut <= 0 && !Platform.storage.get('abTipDone', false)) this.showAbTip();
    // Новый вид монстра: один раз за всю игру показываем подсказку, чем он опасен.
    const fresh = [...new Set(this.spawnQueue.map(q => q.type))].filter(k => L('n_' + k) !== 'n_' + k && !Platform.storage.get('seen_' + k, false));
    fresh.forEach((k, i) => { Platform.storage.set('seen_' + k, true); this.enemyTip(k, i); });
  }

  // Табличка «Новый монстр» под верхней панелью: картинка, имя и чем он опасен. Через несколько секунд исчезает.
  enemyTip(type, row) {
    const y = 170 + row * 130, o = [];
    const g = this.add.graphics().setDepth(26); o.push(g);
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(23, y - 50 + 5, W - 40, 112, 16);
    g.fillStyle(0x2a1f45, 0.96); g.fillRoundedRect(20, y - 50, W - 40, 112, 16);
    g.lineStyle(3, 0xffe066); g.strokeRoundedRect(20, y - 50, W - 40, 112, 16);
    o.push(this.add.image(84, y + 8, 'e_' + type).setDisplaySize(84, 84).setDepth(27));
    o.push(this.add.text(150, y - 26, `${L('newEnemy')}: ${L('e_' + type)}`, { fontFamily: FONT, fontSize: '24px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(27));
    o.push(this.add.text(150, y + 22, L('n_' + type), { fontFamily: FONT, fontSize: '20px', color: '#ffffff', lineSpacing: 4 }).setOrigin(0, 0.5).setDepth(27));
    this.tweens.add({ targets: o, alpha: { from: 0, to: 1 }, duration: 250 });
    this.tweens.add({ targets: o, alpha: 0, delay: 6500, duration: 500, onComplete: () => o.forEach(x => x.destroy()) });
  }

  waveReward(n) { return BAL.waveBonus[0] + BAL.waveBonus[1] * n; }
  earlyBonus() { return Math.round(this.waveReward(this.wave) * BAL.earlyBonus); }
  canCallEarly() { return this.waveActive && !this.spawnQueue.length && this.enemies.length > 0 && (this.endless || this.wave < WAVES.length); }

  // ---------- интерфейс ----------
  btn(x, y, w, h, label, color, enabled, cb) {
    const [r, t] = UI.button(this, x, y - 3, w, h - 8, label, color, cb, { depth: 22, size: '26px', enabled, silent: true });
    this.panelItems.push(r, t);
  }

  // Монета — та же, что в верхней панели. Возвращает нарисованные объекты.
  coin(x, y, r, depth, dim) {
    return [this.add.circle(x, y, r, dim ? 0x8a7430 : 0xffc933).setStrokeStyle(Math.max(2, r / 5), dim ? 0x5a4a10 : 0x9a6b00).setDepth(depth),
      this.add.circle(x - r * 0.27, y - r * 0.27, r * 0.27, dim ? 0xb3a060 : 0xfff0a8).setDepth(depth)];
  }
  // Цена в панели: «подпись + монета + число», всё вместе по центру (x, y).
  price(x, y, label, amount, depth, size, labelColor, numColor, dim) {
    const st = { fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold' }, r = size * 0.5, gap = size * 0.4;
    const a = this.add.text(0, y, label, { ...st, color: labelColor }).setOrigin(0, 0.5).setDepth(depth);
    const b = this.add.text(0, y, String(amount), { ...st, color: numColor }).setOrigin(0, 0.5).setDepth(depth);
    const total = a.width + gap + r * 2 + gap * 0.6 + b.width, x0 = x - total / 2;
    a.x = x0; b.x = x0 + a.width + gap + r * 2 + gap * 0.6;
    this.panelItems.push(a, b, ...this.coin(x0 + a.width + gap + r, y, r, depth, dim));
  }

  clearPanel() {
    this.panelTweens.forEach(t => t.remove()); this.panelTimers.forEach(t => t.remove());
    this.panelItems.forEach(o => o.destroy());
    this.panelItems = []; this.panelTweens = []; this.panelTimers = [];
  }
  ptween(cfg) { const t = this.tweens.add(cfg); this.panelTweens.push(t); return t; }

  refresh() {
    this.livesText.setText(String(this.lives)); this.goldText.setText(String(this.gold));
    this.waveText.setText((HARD ? '☠ ' : '') + (this.endless ? L('waveEndless', this.wave) : L('wave', this.wave, WAVES.length)));
    if (this.lives < this.shownLives) {                        // потеря жизни: сердце вздрагивает
      this.tweens.add({ targets: [this.heart, this.livesText], scale: { from: 1.6, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    }
    this.shownLives = this.lives;
    const s = this.selected, t = s && s.tower;
    this.selGfx.setVisible(!!s); if (s) this.selGfx.setPosition(s.x, s.y);
    this.rangeGfx.setVisible(!!t);
    if (t) this.rangeGfx.setPosition(t.x, t.y).setRadius(this.stats(t).range);
    const evo = t && t.level < MAX_LEVEL && !this.over;
    this.nextRangeGfx.setVisible(!!evo);
    if (evo) this.nextRangeGfx.setPosition(t.x, t.y).setRadius(this.stats({ type: t.type, level: t.level + 1 }).range);

    // Панель перестраивается только когда реально что-то изменилось,
    // иначе анимация витрины сбрасывалась бы при каждом убитом враге.
    const key = [this.slots.indexOf(s), t ? t.type + t.level + (this.gold >= this.upgradeCost(t)) : '',
      TOWER_ORDER.map(k => this.gold >= TOWERS[k].cost).join(), this.waveActive, this.wave, this.over, this.endless, this.canCallEarly(), this.cd.meteor <= 0, this.cd.freeze <= 0, this.aim, this.enemies.length > 0].join('|');
    if (key === this.panelKey) return;
    this.panelKey = key; this.clearPanel();

    if (s) {                                         // витрина или экран эволюции занимают всю нижнюю панель
      if (t) this.evoPanel(t); else this.shop(s);
      // Ярлык «✕» над правым краем панели закрывает её (как и нажатие на поле или повторное нажатие на площадку).
      const [cb, ct] = UI.button(this, W - 52, 894, 84, 62, '✕', 0xa33a3a, () => this.select(null), { depth: 23, size: '34px' });
      this.panelItems.push(cb, ct);
      return;
    }

    // Способности игрока: метеор и заморозка. Пока идёт перезарядка, на кнопке тикают секунды.
    this.abText = {};
    const abil = (id, x, icon, cb) => {
      const ready = this.cd[id] <= 0, on = ready && this.enemies.length > 0, aiming = id === 'meteor' && this.aim;
      const [r, t] = UI.button(this, x, 1130, 336, 62, '', aiming ? 0xd9541a : ABILITIES[id].color === 0xff7a1a ? 0xa8521c : 0x2c7f96, cb, { depth: 22, size: '25px', enabled: on, silent: true });
      this.panelItems.push(r, t); this.abText[id] = t; t.setData('label', `${icon} ${aiming ? L('abAim') : L('ab_' + id)}`);
      t.setText(ready ? t.getData('label') : `${icon} ${Math.ceil(this.cd[id])}`);
    };
    abil('meteor', 185, '☄', () => { this.aim = !this.aim; this.aimGfx.setVisible(this.aim); Sfx.play('tap'); this.refresh(); });
    abil('freeze', 535, '❄', () => this.freezeAll());
    if (this.canCallEarly()) {
      this.btn(W / 2, 1230, 690, 76, '', 0x8a5a2e, true, () => this.startWave());
      this.price(W / 2, 1227, L('earlyWave', this.wave + 1), '+' + this.earlyBonus(), 24, 26, '#fff', '#ffe066');
    } else if (this.waveActive) this.btn(W / 2, 1230, 690, 76, this.endless ? L('waveEndless', this.wave) : L('waveGoing', this.wave, WAVES.length), 0x5a4f7a, false);
    else if (this.endless || this.wave < WAVES.length) this.btn(W / 2, 1230, 690, 76, L('startWave', this.wave + 1), 0x2e6fd1, true, () => this.startWave());
  }

  // ---------- экран эволюции ----------
  // Портрет стража: киношная картинка стадии, для первой стадии — живой ролик из витрины,
  // а если картинок нет — рисованный спрайт на тёмном фоне.
  portrait(x, y, w, h, type, level, frame, depth) {
    const add = o => { this.panelItems.push(o); return o; };
    add(this.add.rectangle(x, y, w, h, 0x0e0b16).setDepth(depth));
    if (level === 1 && this.anims.exists('p_' + type)) add(this.add.sprite(x, y, 'p_' + type).setDisplaySize(w, h).setDepth(depth + 1)).play('p_' + type);
    else if (level > 1 && this.anims.exists(`p_${type}_${level}`)) add(this.add.sprite(x, y, `p_${type}_${level}`).setDisplaySize(w, h).setDepth(depth + 1)).play(`p_${type}_${level}`);
    else if (this.textures.exists(`evo_${type}_${level}`)) {
      add(this.add.image(x, y, `evo_${type}_${level}`).setDisplaySize(w, h).setDepth(depth + 1));
      // Живой портрет стадии догружается по требованию; когда он готов, панель перерисовывается.
      loadPortrait(this, `${type}_${level}`, PORTRAITS_EVO[`${type}_${level}`], () => {
        if (this.scene.isActive() && !this.over && this.selected && this.selected.tower) { this.panelKey = null; this.refresh(); }
      });
    }
    else add(this.add.image(x, y + h * 0.36, `t_${type}_${level}`).setOrigin(0.5, 0.86).setScale(h / 110 / TEX_S).setDepth(depth + 1));
    return add(this.add.rectangle(x, y, w, h).setStrokeStyle(4, frame).setDepth(depth + 2));
  }

  // Карточка стража: кто он, что умеет и чем хорош — напоминание, как при покупке.
  // Нажатие на любую из трёх стадий показывает её характеристики; выбранная стадия подсвечена.
  guardInfo(t, lvl = t.level) {
    const o = [], D = 40, add = x => { o.push(x); return x; }, d = TOWERS[t.type], st = this.stats({ type: t.type, level: lvl });
    const close = () => o.forEach(x => x.destroy());
    add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setDepth(D).setInteractive()).on('pointerdown', close);
    add(UI.card(this, W / 2, 570, 620, 720, d.color).setDepth(D + 1).setInteractive());
    const tx = (y, s, size, color, bold) => add(this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal', align: 'center', wordWrap: { width: 540 }, lineSpacing: 6 }).setOrigin(0.5).setDepth(D + 2));
    tx(262, `${L('t_' + t.type)}  ${'★'.repeat(lvl)}`, '40px', '#ffe066', true);
    tx(310, L('d_' + t.type), '24px', '#e8e4f2');
    // три стадии в ряд с равными промежутками
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const x = W / 2 + (l - 2) * 170, on = l === lvl;
      const plate = add(this.add.rectangle(x, 420, 156, 176, on ? d.color : 0x000000, on ? 0.3 : 0.18).setStrokeStyle(on ? 5 : 2, on ? 0xffe066 : 0x6a6480).setDepth(D + 2).setInteractive());
      add(this.add.image(x, 492, `t_${t.type}_${l}`).setOrigin(0.5, 1).setDisplaySize(104 + l * 14, 104 + l * 14).setAlpha(on ? 1 : 0.5).setDepth(D + 3));
      add(this.add.text(x, 524, '★'.repeat(l) + (l === t.level ? '  ' + L('stageNow') : ''), { fontFamily: FONT, fontSize: '18px', color: on ? '#ffe066' : '#9a93b0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(D + 3));
      if (!on) plate.on('pointerdown', () => { Sfx.play('tap'); close(); this.guardInfo(t, l); });
    }
    tx(612, statRows(t.type, lvl).map(r => r.label + '  ' + r.value).join('\n'), '24px', '#9fd3ff', true);   // каждая характеристика с новой строки
    tx(746, L('g_' + t.type), '23px', '#ffffff');
    UI.button(this, W / 2, 864, 300, 80, L('close'), 0x2e6fd1, close, { depth: D + 2, size: '32px' }).forEach(x => o.push(x));
  }

  evoPanel(t) {
    const D = 22, add = o => { this.panelItems.push(o); return o; }, d = TOWERS[t.type];
    const txt = (x, y, str, size, color, bold, ox = 0.5) => add(this.add.text(x, y, str, { fontFamily: FONT, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' }).setOrigin(ox, 0.5).setDepth(D + 5));
    add(UI.bar(this, W / 2, (928 + H) / 2, W, H - 928, 'top').setDepth(D - 1).setInteractive());
    const PW = 232, PH = 196, py = 1068, max = t.level >= MAX_LEVEL, cur = this.stats(t);
    const stars = n => '★'.repeat(n);

    txt(134, 952, `${L('t_' + t.type)}  ${stars(t.level)}`, '22px', '#ffffff', true);
    this.portrait(134, py, PW, PH, t.type, t.level, d.color, D);
    // Кто это и что умеет: кнопка «i» поверх портрета открывает карточку стража (как в справочнике).
    const [ib, it] = UI.button(this, 134 + PW / 2 - 24, py - PH / 2 + 24, 40, 40, 'i', 0x2e6fd1, () => this.guardInfo(t), { depth: D + 4, size: '24px' });
    this.panelItems.push(ib, it);

    if (!max) {
      const c = this.upgradeCost(t), ok = this.gold >= c;
      const nx = this.stats({ type: t.type, level: t.level + 1 });
      const arrow = txt(268, py, '➜', '44px', '#ffe066', true);
      this.ptween({ targets: arrow, x: 274, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      txt(402, 952, `${L('evolution')}  ${stars(t.level + 1)}`, '22px', '#ffe066', true);
      const fr = this.portrait(402, py, PW, PH, t.type, t.level + 1, 0xffe066, D);
      this.ptween({ targets: fr, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });      // золотая рамка мерцает
      // Что изменится: те же три характеристики и в том же порядке, что в витрине и карточке «i».
      // Новое значение: урон зелёный, дальность золотая (как круг на поле), скорость не меняется.
      const now = statRows(t.type, t.level), next = statRows(t.type, t.level + 1);
      now.forEach((r, i) => {
        const y = 976 + i * 64, n = next[i];
        txt(530, y, r.label, '17px', '#b9b2cc', false, 0);
        const a = txt(530, y + 24, r.value === n.value ? r.value : r.value + ' → ', '22px', '#ffffff', true, 0);
        if (r.value !== n.value) txt(530 + a.width, y + 24, n.value, '22px', r.id === 'range' ? '#ffe066' : '#7CFC8A', true, 0);
      });
      this.btn(190, 1228, 340, 80, '', 0x2e8b57, ok, () => this.upgrade(t));
      this.price(190, 1225, L('evolve'), c, 24, 26, ok ? '#fff' : '#a09ca8', ok ? '#ffe066' : '#ff7777', !ok);
      this.btn(540, 1228, 320, 80, '', 0xa33a3a, true, () => this.sell(t));
      this.price(540, 1225, L('release'), '+' + Math.round(t.spent * SELL_RATE), 24, 26, '#fff', '#ffe066');
    } else {
      txt(480, 972, L('maxEvo'), '24px', '#ffe066', true);
      statRows(t.type, t.level).forEach((r, i) => {
        const y = 1024 + i * 46, a = txt(300, y, r.label + '  ', '21px', '#b9b2cc', false, 0);
        txt(300 + a.width, y, r.value, '23px', '#ffffff', true, 0);
      });
      this.btn(W / 2, 1228, 680, 80, '', 0xa33a3a, true, () => this.sell(t));
      this.price(W / 2, 1225, L('release'), '+' + Math.round(t.spent * SELL_RATE), 24, 26, '#fff', '#ffe066');
    }
  }

  // ---------- витрина стражей ----------
  // Окно найма в духе «Героев»: четыре высокие карточки с живым портретом, характеристиками и ценой.
  // Если для стража есть лист кадров (src/anims.js), портрет проигрывает покой и время от времени атаку;
  // иначе показывается картинка с «дыханием» и условным показом атаки.
  shop(slot) {
    const D = 22, add = o => { this.panelItems.push(o); return o; };
    const T = 938, CH = 334;                                    // верх и высота карточек
    add(UI.bar(this, W / 2, (928 + H) / 2, W, H - 928, 'top').setDepth(D - 1).setInteractive());
    TOWER_ORDER.forEach((type, i) => {
      const d = TOWERS[type], ok = this.gold >= d.cost, cx = 92 + i * 178.5, key = `t_${type}_1`;
      const PW = 152, PH = 128;                                 // размер портрета
      const card = add(UI.card(this, cx, T + CH / 2, 170, CH, ok ? d.color : 0x666666, !ok).setDepth(D).setInteractive());
      if (ok) card.on('pointerdown', () => this.build(slot, type));

      // Портрет
      const py = T + 76, feet = T + 132;
      add(this.add.rectangle(cx, py, PW, PH, 0x0e0e0e).setStrokeStyle(2, 0x000000).setDepth(D + 1));
      const cine = this.anims.exists('p_' + type);
      if (cine) {                                               // киношный портрет: ролик в рамке целиком
        const v = add(this.add.sprite(cx, py, 'p_' + type).setDisplaySize(PW, PH).setDepth(D + 2));
        if (ok) v.play({ key: 'p_' + type, startFrame: (i * 9) % PORTRAITS[type].frames }); else v.setAlpha(0.35);
        add(this.add.rectangle(cx, py, PW, PH).setStrokeStyle(3, ok ? d.color : 0x555555).setDepth(D + 3));
      }
      if (!cine) {
      add(this.add.ellipse(cx, feet - 2, 116, 26, d.color, ok ? 0.28 : 0.1).setDepth(D + 1));
      const rays = add(this.add.graphics().setDepth(D + 1).setPosition(cx, py + 6).setAlpha(ok ? 1 : 0.3));
      rays.fillStyle(d.color, 0.22);
      for (let k = 0; k < 10; k++) {
        const a = k * Math.PI / 5;
        rays.fillTriangle(0, 0, Math.cos(a - 0.16) * 60, Math.sin(a - 0.16) * 60, Math.cos(a + 0.16) * 60, Math.sin(a + 0.16) * 60);
      }
      this.ptween({ targets: rays, angle: 360, duration: 12000, repeat: -1 });

      const meta = ANIMS[key] && this.anims.exists(key + '_idle') ? ANIMS[key] : null;
      let m;
      if (meta) {                                               // живой портрет из листа кадров
        const sc = Math.min(132 / meta.restH, 176 / meta.restW);
        m = add(this.add.sprite(cx, feet, 'a_' + key).setOrigin(0.5, meta.feet).setScale(sc).setDepth(D + 3).setAlpha(ok ? 1 : 0.45));
        m.play(key + '_idle');
        m.on('animationcomplete', () => { if (m.active) m.play(key + '_idle'); });
        if (ok) this.panelTimers.push(this.time.addEvent({ delay: 3600, startAt: 3600 - 900 - i * 1100, loop: true,
          callback: () => { if (m.active) m.play({ key: key + '_attack', frameRate: meta.shopAttackFps || 14 }); } }));
      } else {                                                  // картинка с «дыханием»
        const base = 1.3 / TEX_S;
        m = add(this.add.image(cx, feet, key).setOrigin(0.5, 0.86).setScale(base).setDepth(D + 3).setAlpha(ok ? 1 : 0.45));
        this.ptween({ targets: m, scaleY: base * 0.93, scaleX: base * 1.04, duration: 560 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (ok) this.panelTimers.push(this.time.addEvent({ delay: 2400, startAt: 2400 - 400 - i * 650, loop: true, callback: () => {
          if (!m.active) return;
          if (type === 'gun') {
            this.ptween({ targets: m, angle: { from: -14, to: 0 }, duration: 300, ease: 'Back.easeOut' });
            const ball = add(this.add.circle(cx + 8, feet - 70, 9, d.color).setStrokeStyle(2, 0x000000).setDepth(D + 4));
            this.ptween({ targets: ball, x: cx + 96, y: py - 70, scale: 0.5, duration: 380, onComplete: () => ball.destroy() });
          } else if (type === 'cannon') {
            this.ptween({ targets: m, y: feet - 26, duration: 170, yoyo: true, ease: 'Quad.easeOut', onComplete: () => {
              if (!m.active) return;
              const ring = add(this.add.circle(cx, feet - 4, 18, 0xffa040, 0.7).setDepth(D + 2));
              this.ptween({ targets: ring, scaleX: 4.6, scaleY: 1.5, alpha: 0, duration: 320, onComplete: () => ring.destroy() });
            } });
          } else {
            this.ptween({ targets: m, x: cx + 4, duration: 45, yoyo: true, repeat: 4 });
            for (let k = 0; k < 5; k++) {
              const st = add(this.add.star(cx - 48 + k * 24, feet - 80 - (k % 2) * 22, 4, 3, 8, type === 'poison' ? 0x7fe04a : 0xffffff).setDepth(D + 4));
              this.ptween({ targets: st, y: st.y - 36, angle: 180, alpha: 0, duration: 650, delay: k * 60, onComplete: () => st.destroy() });
            }
          }
        } }));
      }

      }

      // Подписи и характеристики
      const txt = (y, str, size, color, bold) => add(this.add.text(cx, y, str, { fontFamily: FONT, fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' }).setOrigin(0.5).setDepth(D + 5));
      txt(T + 164, L('t_' + type), '25px', ok ? '#fff' : '#888', true);
      txt(T + 190, L('d_' + type), '15px', ok ? '#bbb' : '#666');
      statRows(type, 1).forEach((r, k) => txt(T + 214 + k * 21, r.label + ' ' + r.value, '15px', ok ? '#9fd3ff' : '#555'));
      add(UI.plate(this, cx, T + 297, 156, 44, ok ? 0x2e8b57 : 0x5a2626).setDepth(D + 4));
      this.price(cx, T + 296, ok ? L('summon') : L('need'), d.cost, D + 5, 19, ok ? '#fff' : '#b88', ok ? '#ffe066' : '#ff7777', !ok);
    });
  }

  finish(win) {
    Platform.gameplay(false); this.hideAbTip();
    this.over = true; this.aim = false; this.aimGfx.setVisible(false); this.selected = null; this.tutorial(this.tut > 0 ? -1 : this.tut); this.refresh(); Sfx.play(win ? 'win' : 'lose');
    const o = this.endItems = [], add = x => { o.push(x); return x; };
    add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(30).setInteractive());
    let y = 720;
    if (this.endless) {
      // Конец бесконечного забега: результат попадает в таблицу, топ-10 показывается сразу.
      const score = this.wave - 1;
      const got = Math.max(0, score - WAVES.length) * REWARD.endlessWave * (HARD ? HARD_MODE.reward : 1); Meta.add(got);
      add(this.add.text(W / 2, 200, L('lose'), { fontFamily: FONT, fontSize: '54px', color: '#ff6b6b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31));
      add(this.add.text(W / 2, 266, L('survived', score) + (got ? '    ' + L('crystalsGot', got) : ''), { fontFamily: FONT, fontSize: '30px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31));
      add(UI.card(this, W / 2, 586, 600, 530, 0xf3d27a).setDepth(31));
      add(this.add.text(W / 2, 352, L('top10Title', L('m_' + MAP_INDEX)), { fontFamily: FONT, fontSize: '26px', color: '#ffe066', fontStyle: 'bold' }).setOrigin(0.5).setDepth(32));
      const board = mk('endless');
      Platform.leaderboard.submit(board, score).then(rank => Platform.leaderboard.top(board).then(list => { if (this.over) drawBoard(this, o, list, W / 2, 410, 32, rank); }));
      y = 920;
    } else {
      // Обычное прохождение: звёзды за победу и кристаллы за пройденные волны и новые звёзды.
      const cleared = win ? this.wave : this.wave - 1, stars = win ? Meta.starsFor(this.lives, this.maxLives) : 0;
      const earned = cleared * REWARD.wave * (HARD ? HARD_MODE.reward : 1) + (win ? Meta.win(MAP_INDEX, stars) * REWARD.star : 0);
      Meta.add(earned);
      add(this.add.text(W / 2, 330, win ? L('win') : L('lose'), { fontFamily: FONT, fontSize: win ? '72px' : '56px', color: win ? '#7CFC8A' : '#ff6b6b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31));
      if (win) for (let k = 0; k < 3; k++) {
        const st = add(this.add.text(W / 2 + (k - 1) * 120, 450 - (k === 1 ? 14 : 0), '★', { fontFamily: FONT, fontSize: '110px', color: k < stars ? '#ffd23d' : '#4a4460', stroke: '#1a1228', strokeThickness: 8 }).setOrigin(0.5).setDepth(31).setScale(0));
        this.tweens.add({ targets: st, scale: 1, delay: 250 + k * 220, duration: 380, ease: 'Back.easeOut', onStart: () => { if (k < stars) Sfx.play('build'); } });
      }
      add(this.add.text(W / 2, win ? 566 : 450, L('result', cleared, this.best),
        { fontFamily: FONT, fontSize: '32px', color: '#fff', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(31));
      if (earned) {
        const ct = add(this.add.text(W / 2, win ? 652 : 540, L('crystalsGot', earned), { fontFamily: FONT, fontSize: '34px', color: '#7fe9ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31));
        if (Platform.ads.rewarded) {                 // удвоение кристаллов за просмотр ролика
          ct.x = W / 2 - 150;
          const x2 = uiButton(this, W / 2 + 130, win ? 652 : 540, 250, 60, L('adDouble'), 0x8a5a2e, () => {
            x2.forEach(q => q.destroy());
            Platform.ads.showRewarded().then(ok => { if (ok && ct.active) { Meta.add(earned); ct.setText(L('crystalsGot', earned * 2)).setX(W / 2); Sfx.play('evolve'); } else if (ct.active) ct.setX(W / 2); });
          }, 31, '24px');
          o.push(...x2);
        }
      }
      y = win ? 760 : 680;
    }
    const b = (label, color, cb) => { o.push(...uiButton(this, W / 2, y, 460, 92, label, color, cb, 31, '36px')); y += 112; };
    const leave = go => Platform.ads.showInterstitial().then(go);     // между забегами площадка может показать рекламу
    if (win && MAP_INDEX + 1 < MAPS.length && mapUnlocked(MAP_INDEX + 1, HARD)) b(L('nextMap'), 0x2e8b57, () => leave(() => this.scene.restart({ map: MAP_INDEX + 1 })));
    // После победы можно остаться на карте: волны идут дальше, пока портал держится.
    if (win) b(L('endless'), 0x8a5a2e, () => { o.forEach(x => x.destroy()); this.endItems = []; this.over = false; this.endless = true; this.panelKey = null; this.refresh(); });
    b(L('retry'), 0x2e6fd1, () => leave(() => this.scene.restart()));
    b(L('toMenu'), 0x5a4f7a, () => leave(() => this.scene.start('menu')));
  }

  // ---------- пауза ----------
  pauseGame() {
    if (this.over || this.paused) return;
    this.paused = true; this.tweens.pauseAll(); this.anims.pauseAll(); Platform.gameplay(false);
    const o = [this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(30).setInteractive(),
      this.add.text(W / 2, 400, L('pause'), { fontFamily: FONT, fontSize: '80px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(31),
      this.add.text(W / 2, 480, L('pauseInfo', L('m_' + MAP_INDEX), this.wave, WAVES.length), { fontFamily: FONT, fontSize: '28px', color: '#ccc' }).setOrigin(0.5).setDepth(31)];
    o.push(...uiButton(this, W / 2, 620, 440, 96, L('resume'), 0x2e8b57, () => this.resumeGame(), 31, '38px'));
    o.push(...uiButton(this, W / 2, 740, 440, 96, L('retry'), 0x2e6fd1, () => { this.tweens.resumeAll(); this.anims.resumeAll(); this.scene.restart(); }, 31, '38px'));
    o.push(...uiButton(this, W / 2, 860, 440, 96, L('settings'), 0x5a4f7a, () => settingsOverlay(this, () => this.showMute()), 31, '38px'));
    o.push(...uiButton(this, W / 2, 980, 440, 96, L('toMenu'), 0x5a4f7a, () => { this.tweens.resumeAll(); this.anims.resumeAll(); this.scene.start('menu'); }, 31, '38px'));
    this.pauseItems = o;
  }
  resumeGame() {
    this.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); if (this.waveActive) Platform.gameplay(true);
    this.pauseItems.forEach(x => x.destroy()); this.pauseItems = [];
  }

  // ---------- игровой цикл ----------
  spawn(type) {
    const d = ENEMIES[type];
    const endlessK = this.wave > WAVES.length ? Math.pow(BAL.endlessHp, this.wave - WAVES.length) : 1;
    const hp = Math.round(d.hp * (1 + BAL.hpGrowth * (this.wave - 1)) * (MAPS[MAP_INDEX].hpMul || 1) * (d.boss ? MAPS[MAP_INDEX].bossMul || 1 : 1) * (HARD ? HARD_MODE.hp : 1) * endlessK);
    const bw = d.boss ? 90 : 36;                                   // ширина полоски здоровья
    const route = this.routes[this.spawnN++ % this.routes.length];   // дороги по очереди
    const e = { hp, maxHp: hp, speed: d.speed, gold: d.gold, r: d.r, dist: 0, slow: 0, dead: false, x: route.from[0], y: route.from[1], route,
      boss: !!d.boss, leak: d.leak || 1, slowK: d.slowK || 0.5, bw, type,
      fly: !!d.fly, len: d.fly ? route.flyLen : route.len, heal: d.heal || null, healT: 1,
      armor: d.armor ? Math.round(d.armor * (1 + BAL.armorGrowth * (this.wave - 1))) : 0, poison: null };
    if (e.fly) e.shadow = this.add.ellipse(e.x, e.y, 30, 10, 0x000000, 0.25).setDepth(7);
    e.gfx = this.add.image(e.x, e.y, 'e_' + type).setScale(1.25 / TEX_S).setDepth(d.boss ? 11 : e.fly ? 12 : 10);
    e.barBg = this.add.rectangle(e.x, e.y, bw + 2, d.boss ? 10 : 6, 0x000000).setDepth(12);
    e.bar = this.add.rectangle(e.x, e.y, bw, d.boss ? 8 : 6, d.boss ? 0xff5a3c : e.armor ? 0xc9d3e6 : 0x5cff5c).setOrigin(0, 0.5).setDepth(13);
    this.enemies.push(e);
    if (d.boss) { this.floatText(W / 2, 420, L('bossComing'), '#ff5a3c', '64px'); this.cameras.main.shake(300, 0.008); Sfx.play('lose'); }
  }

  shoot(t, target) {
    const st = this.stats(t);
    Sfx.play(t.type);
    if (!t.anim) this.tweens.add({ targets: t.gfx, angle: { from: target.x < t.x ? -10 : 10, to: 0 }, duration: 160 });
    const b = { x: t.x, y: t.y, target, tx: target.x, ty: target.y, dmg: st.dmg, splash: st.splash, slow: st.slow, poison: st.poison, ptime: st.ptime };
    b.gfx = this.add.circle(t.x, t.y, st.splash ? 9 : 6, TOWERS[t.type].color).setStrokeStyle(2, 0x000000).setDepth(13);
    this.bullets.push(b);
  }

  // Подсказка про способности: один раз за всю игру, в начале второй волны.
  showAbTip() {
    const o = this.abTip = [], add = x => { o.push(x); return x; }, cx = W / 2, by = 965;
    const text = add(this.add.text(cx, by, L('tutAb'), { fontFamily: FONT, fontSize: '25px', color: '#2a1450', fontStyle: 'bold', align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(29));
    const skip = add(this.add.text(cx, by + text.height / 2 + 14, L('tutSkip'), { fontFamily: FONT, fontSize: '16px', color: '#7a6a9a' }).setOrigin(0.5).setDepth(29));
    const w = text.width + 44, h = text.height + 52, top = by - text.height / 2 - 16, g = add(this.add.graphics().setDepth(28));
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(cx - w / 2 + 3, top + 5, w, h, 16);
    g.fillStyle(0xfff3c4); g.fillRoundedRect(cx - w / 2, top, w, h, 16);
    for (const tx of [185, 535]) g.fillTriangle(tx - 16, top + h - 1, tx + 16, top + h - 1, tx, top + h + 20);     // стрелки к обеим кнопкам
    g.lineStyle(3, 0x2a1450); g.strokeRoundedRect(cx - w / 2, top, w, h, 16);
    this.tweens.add({ targets: o, y: '-=8', duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    add(this.add.zone(cx, by + 8, w, h).setInteractive().setDepth(29)).on('pointerdown', () => this.hideAbTip());
  }
  hideAbTip() {
    if (!this.abTip) return;
    this.abTip.forEach(x => x.destroy()); this.abTip = null; Platform.storage.set('abTipDone', true);
  }

  // ---------- способности игрока ----------
  abilityCd(id) { return ABILITIES[id].cd * (1 - Meta.bonus('cd') / 100); }

  // Метеор: падает в точку и бьёт всех в радиусе мимо брони.
  meteor(x, y) {
    const a = ABILITIES.meteor;
    this.hideAbTip();
    this.aim = false; this.aimGfx.setVisible(false); this.cd.meteor = this.abilityCd('meteor'); this.panelKey = null; this.refresh();
    const dmg = a.dmg * (1 + BAL.hpGrowth * (Math.max(1, this.wave) - 1)) * (MAPS[MAP_INDEX].hpMul || 1) * (HARD ? HARD_MODE.hp : 1);
    const rock = this.add.circle(x + 260, y - 620, 26, 0xff7a1a).setStrokeStyle(5, 0x5a1c00).setDepth(17);
    const tail = this.add.triangle(0, 0, 0, 0, 34, 12, 120, -280, 0xffc04a, 0.7).setDepth(16).setPosition(x + 260, y - 620);
    this.tweens.add({ targets: [rock, tail], x, y, duration: 380, ease: 'Quad.easeIn', onComplete: () => {
      rock.destroy(); tail.destroy();
      if (this.over) return;
      for (const e of this.enemies) if (Math.hypot(e.x - x, e.y - y) <= a.radius) this.damage(e, dmg, 0, true);
      Sfx.play('boom'); this.cameras.main.shake(220, 0.012);
      const flash = this.add.circle(x, y, a.radius, 0xffe9a0, 0.85).setDepth(15), ring = this.add.circle(x, y, a.radius * 0.5).setStrokeStyle(8, 0xff7a1a).setDepth(15);
      this.tweens.add({ targets: flash, alpha: 0, scale: 1.15, duration: 320, onComplete: () => flash.destroy() });
      this.tweens.add({ targets: ring, alpha: 0, scale: 2.6, duration: 420, onComplete: () => ring.destroy() });
      const scorch = this.add.ellipse(x, y, a.radius * 1.3, a.radius * 0.8, 0x1a0d05, 0.4).setDepth(4);
      this.tweens.add({ targets: scorch, alpha: 0, delay: 1500, duration: 2500, onComplete: () => scorch.destroy() });
      this.refresh();
    } });
  }

  // Заморозка: все враги на поле замирают.
  freezeAll() {
    if (this.cd.freeze > 0 || !this.enemies.length) return;
    const a = ABILITIES.freeze;
    this.hideAbTip();
    this.cd.freeze = this.abilityCd('freeze'); this.panelKey = null;
    for (const e of this.enemies) if (!e.dead) e.frozen = e.boss ? a.bossTime : a.time;
    Sfx.play('frost'); Sfx.play('evolve');
    const veil = this.add.rectangle(W / 2, 585, W, 990, 0xbfefff, 0.45).setDepth(15);
    this.tweens.add({ targets: veil, alpha: 0, duration: 600, onComplete: () => veil.destroy() });
    this.refresh();
  }

  // Всплывающая надпись: «+6» над убитым врагом, «−1» у портала и т. п.
  floatText(x, y, str, color, size = '26px') {
    const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: size, color, fontStyle: 'bold', stroke: '#1a1a1a', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(18);
    this.tweens.add({ targets: t, y: y - 46, duration: 750, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 400, duration: 350, onComplete: () => t.destroy() });
  }

  // pierce — урон мимо брони (яд). Броня вычитается из каждого удара, но хотя бы 1 урона проходит.
  damage(e, dmg, slow, pierce) {
    if (e.dead) return;
    if (e.armor && !pierce) dmg = Math.max(1, dmg - e.armor);
    e.hp -= dmg; if (slow) e.slow = Math.max(e.slow, slow);
    if (e.hp <= 0) { e.dead = true; this.gold += e.gold; this.dirty = true; Sfx.play('kill'); this.floatText(e.x, e.y - e.r, '+' + e.gold, '#ffe066'); }
  }

  // Ускорение x2 и x3 — это несколько обычных шагов игры за кадр, а не один большой:
  // так снаряды и монстры не «перепрыгивают» друг друга на высокой скорости.
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    for (let i = 0; i < this.speed && !this.over && !this.paused; i++) this.step(dt);
  }

  step(dt) {
    this.dirty = false;
    for (const id in this.cd) if (this.cd[id] > 0) {             // перезарядка способностей
      this.cd[id] -= dt;
      if (this.cd[id] <= 0) this.dirty = true;
      else if (this.abText[id] && this.abText[id].active) this.abText[id].setText(this.abText[id].getData('label').split(' ')[0] + ' ' + Math.ceil(this.cd[id]));
    }

    // Появление врагов
    if (this.spawnQueue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { const q = this.spawnQueue.shift(); this.spawn(q.type); this.spawnTimer = q.gap; if (!this.spawnQueue.length) this.dirty = true; }
    }

    // Движение врагов
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.slow > 0) e.slow -= dt;
      if (e.healCd > 0) e.healCd -= dt;
      if (e.frozen > 0) e.frozen -= dt;
      e.dist += (e.frozen > 0 ? 0 : e.speed * (e.slow > 0 ? e.slowK : 1)) * dt;
      if (e.poison) {                                 // яд: урон каждую секунду мимо брони
        this.damage(e, e.poison.dps * dt, 0, true); e.poison.t -= dt;
        if (e.poison.t <= 0) e.poison = null;
        if (e.dead) continue;
      }
      if (e.heal && (e.healT -= dt) <= 0) {           // лекарь подлечивает соседей
        e.healT = 1; let any = false;
        for (const o of this.enemies) {
          if (o === e || o.dead || o.healCd > 0 || o.hp >= o.maxHp || Math.hypot(o.x - e.x, o.y - e.y) > e.heal[1]) continue;
          o.hp = Math.min(o.maxHp, o.hp + o.maxHp * e.heal[0] * (o.boss ? 0.3 : 1)); o.healCd = 0.95; any = true;
          const plus = this.add.text(o.x, o.y - o.r, '+', { fontFamily: FONT, fontSize: '26px', color: '#7CFC8A', fontStyle: 'bold', stroke: '#0c3a16', strokeThickness: 4 }).setOrigin(0.5).setDepth(14);
          this.tweens.add({ targets: plus, y: o.y - o.r - 30, alpha: 0, duration: 500, onComplete: () => plus.destroy() });
        }
        if (any) {
          Sfx.play('heal');
          const ring = this.add.circle(e.x, e.y, e.heal[1], 0x7CFC8A, 0.16).setStrokeStyle(3, 0x7CFC8A, 0.7).setDepth(9).setScale(0.2);
          this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        }
      }
      if (e.dist >= e.len) {
        e.dead = true; this.lives -= e.leak; this.dirty = true; Sfx.play('leak');
        this.leaks[e.type] = (this.leaks[e.type] || 0) + 1;   // кто прорвался (для отладки баланса) this.cameras.main.shake(e.boss ? 400 : 120, e.boss ? 0.015 : 0.006);
        const [px, py] = PATH[PATH.length - 1];
        this.floatText(px, py - 50, `−${e.leak} ♥`, '#ff6b6b', e.boss ? '44px' : '30px');
        this.tweens.killTweensOf(this.vignette);
        this.tweens.add({ targets: this.vignette, alpha: { from: 0.8, to: 0 }, duration: 600, ease: 'Quad.easeOut' });
        continue;
      }
      if (e.fly) {                                    // летун: по прямой над полем, под ним тень
        const k = e.dist / e.len, [ax, ay] = e.route.from, [zx, zy] = e.route.to;
        e.x = ax + (zx - ax) * k; e.y = ay + (zy - ay) * k;
        e.shadow.setPosition(e.x, e.y + 14);
        e.gfx.setPosition(e.x, e.y - 22 - Math.sin(e.dist / 9) * 6).setAngle(Math.sin(e.dist / 9) * 5).setScale(1.25 / TEX_S * (1 + Math.sin(e.dist / 4.5) * 0.06), 1.25 / TEX_S);
      } else {
        [e.x, e.y] = this.posAt(e.dist, e.route);
        e.gfx.setPosition(e.x, e.y - Math.abs(Math.sin(e.dist / 8)) * 4).setAngle(Math.sin(e.dist / 8) * 7);
      }
      e.prog = e.dist / e.len;                        // доля пройденного пути: по ней стражи выбирают цель
      const cold = e.slow > 0, sick = !!e.poison;
      if (e.frozen > 0) e.gfx.setTint(0x9fe8ff);
      else if (cold || sick) e.gfx.setTint(cold && sick ? 0x7fd9c0 : cold ? 0x88ccff : 0xcdf2a8); else e.gfx.clearTint();
      const barY = e.y - e.r * 1.6 - 8 - (e.fly ? 26 : 0);
      e.barBg.setPosition(e.x, barY);
      e.bar.setPosition(e.x - e.bw / 2, barY).setScale(Math.max(e.hp / e.maxHp, 0), 1);
    }

    // Стражи: цель → замах → выстрел → возврат в обычную позу
    for (const t of this.towers) {
      if (t.poseT > 0) { t.poseT -= dt; if (t.poseT <= 0 && !t.pending) this.pose(t, ''); }
      if (t.pending) {
        t.pending.time -= dt;
        if (t.pending.time <= 0) {
          const target = t.pending.target; t.pending = null;
          if (!target.dead) this.shoot(t, target);
          if (!t.anim) { if (this.pose(t, 'a')) t.poseT = 0.16; else this.pose(t, ''); }
        }
        continue;
      }
      t.cd -= dt; if (t.cd > 0) continue;
      const st = this.stats(t); let target = null;
      for (const e of this.enemies) {
        if (e.dead || e.dist <= 0) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
        // Ближе всех к порталу; Ядозуб сначала кусает тех, кто ещё не отравлен.
        const better = !target || (st.poison && !!e.poison !== !!target.poison ? !e.poison : e.prog > target.prog);
        if (better) target = e;
      }
      if (!target) continue;
      t.cd = st.rate;
      // Если у монстра есть кадр замаха, выстрел происходит чуть позже, после замаха.
      if (t.anim) {                                  // атака кадрами: выстрел на нужном кадре
        t.gfx.play(`t_${t.type}_${t.level}_attack`); t.gfx.anims.timeScale = this.speed;
        t.gfx.setFlipX(target.x < t.x);            // в видео монстр плюёт вправо; для цели слева зеркалим
        t.pending = { target, time: t.anim.fire / t.anim.attackFps };
      } else if (this.pose(t, 'w')) t.pending = { target, time: 0.1 };
      else { this.shoot(t, target); if (this.pose(t, 'a')) t.poseT = 0.16; }
    }

    // Снаряды
    for (const b of this.bullets) {
      if (!b.target.dead) { b.tx = b.target.x; b.ty = b.target.y; }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy), step = 700 * dt;
      if (d <= step) {
        b.done = true;
        if (b.splash) {
          for (const e of this.enemies) if (Math.hypot(e.x - b.tx, e.y - b.ty) <= b.splash) this.damage(e, b.dmg, 0);
          Sfx.play('boom');
          const boom = this.add.circle(b.tx, b.ty, b.splash, 0xffa040, 0.45).setDepth(14);
          this.tweens.add({ targets: boom, alpha: 0, duration: 200, onComplete: () => boom.destroy() });
        } else {
          this.damage(b.target, b.dmg, b.slow);
          if (b.poison && !b.target.dead) {
            const p = b.target.poison;
            b.target.poison = { dps: Math.max(b.poison, p ? p.dps : 0), t: b.ptime };
          }
        }
        b.gfx.destroy();
      } else { b.x += dx / d * step; b.y += dy / d * step; b.gfx.setPosition(b.x, b.y); }
    }
    this.bullets = this.bullets.filter(b => !b.done);

    // Уборка
    for (const e of this.enemies) if (e.dead) { e.gfx.destroy(); e.barBg.destroy(); e.bar.destroy(); if (e.shadow) e.shadow.destroy(); }
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.lives <= 0) { this.lives = 0; this.finish(false); return; }

    // Конец волны
    if (this.waveActive && !this.spawnQueue.length && !this.enemies.length) {
      const bonus = this.waveReward(this.wave);
      this.waveActive = false; this.gold += bonus; this.dirty = true;
      this.floatText(W / 2, 560, L('waveDone', bonus), '#ffe066', '38px');
      if (this.tut === 0 && this.wave === 1 && this.towers.length) this.tutorial(4);
      if (this.wave > this.best) { this.best = this.wave; Platform.storage.set(mk('best'), this.best); }
      Platform.gameplay(false);
      if (!this.endless && this.wave >= WAVES.length) { this.finish(true); return; }
    }
    if (this.dirty) this.refresh();
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, backgroundColor: '#111111',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MenuScene, MapScene, BookScene, UpgradeScene, GameScene]
});
window.game = game;
