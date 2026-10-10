// Графика монстров, нарисованная кодом.
// Каждая функция рисует монстра вокруг точки (0,0). Позже любую из них
// можно заменить картинкой из assets/images с тем же ключом текстуры.
const TEX_S = 4;                 // текстуры вчетверо крупнее логического размера, чтобы не мылились на телефоне
const INK = 0x1a1a1a;

const Monsters = {
  OUT: 2.5,

  // Силуэт из частей одним цветом с общим контуром.
  // Части: ['e',x,y,ш,в] эллипс, ['c',x,y,r] круг, ['t',x1,y1,x2,y2,x3,y3] треугольник, ['r',x,y,ш,в,скругление]
  shape(g, color, parts) {
    for (const pass of [0, 1]) {
      const o = pass ? 0 : this.OUT;
      g.fillStyle(pass ? color : INK);
      for (const p of parts) {
        if (p[0] === 'e') g.fillEllipse(p[1], p[2], p[3] + o * 2, p[4] + o * 2);
        else if (p[0] === 'c') g.fillCircle(p[1], p[2], p[3] + o);
        else if (p[0] === 'r') g.fillRoundedRect(p[1] - o, p[2] - o, p[3] + o * 2, p[4] + o * 2, p[5] + o);
        else if (p[0] === 't') {
          if (!pass) { g.lineStyle(o * 2, INK); g.strokeTriangle(p[1], p[2], p[3], p[4], p[5], p[6]); }
          g.fillTriangle(p[1], p[2], p[3], p[4], p[5], p[6]);
        }
      }
    }
  },
  eye(g, x, y, r, angry) {
    if (this.blink && !angry) {                   // закрытый глаз (кадр моргания)
      g.fillStyle(INK); g.fillCircle(x, y, r + 1.5);
      g.fillStyle(this.lid); g.fillCircle(x, y, r);
      g.lineStyle(2.2, INK); g.lineBetween(x - r, y + 1, x + r, y + 1);
      return;
    }
    g.fillStyle(INK); g.fillCircle(x, y, r + 1.5);
    g.fillStyle(0xffffff); g.fillCircle(x, y, r);
    g.fillStyle(angry ? 0x8a0000 : INK); g.fillCircle(x, y + r * 0.15, r * 0.55);
    g.fillStyle(0xffffff); g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.2);
  },
  brows(g, x, y, r) {
    g.lineStyle(3, INK);
    g.lineBetween(-x - r - 1, y - r - 4, -x + r, y - r + 1);
    g.lineBetween(x + r + 1, y - r - 4, x - r, y - r + 1);
  },
  smile(g, x, y, r) {
    g.lineStyle(2.5, INK); g.beginPath(); g.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); g.strokePath();
  },
  shadow(g, y, w) { g.fillStyle(0x000000, 0.22); g.fillEllipse(0, y, w, w * 0.22); },

  // ---------- стражи (lvl = стадия эволюции 1..3) ----------
  gun(g, lvl) {                                   // Плевун
    this.lid = 0x4fc36a;
    this.shadow(g, 31, 48);
    if (lvl >= 3) this.shape(g, 0xffe066, [['t', 0, -40, -7, -14, 7, -14]]);
    const parts = [['e', -14, 28, 16, 8], ['e', 14, 28, 16, 8], ['c', -12, -22, 9], ['c', 12, -22, 9], ['e', 0, 6, 50, 46]];
    if (lvl >= 2) parts.unshift(['t', -33, -2, -20, -12, -18, 8], ['t', 33, -2, 20, -12, 18, 8]);
    this.shape(g, 0x4fc36a, parts);
    g.fillStyle(0xb8f0a0); g.fillEllipse(0, 16, 30, 20);
    if (lvl >= 3) { g.fillStyle(0x2f9a4c); g.fillCircle(-19, 4, 3); g.fillCircle(19, 6, 3); g.fillCircle(-15, -6, 2); }
    this.eye(g, -12, -22, 6, false); this.eye(g, 12, -22, 6, false);
    g.fillStyle(INK); g.fillCircle(0, 2, 7 + lvl); g.fillStyle(0x14401f); g.fillCircle(0, 2, 5 + lvl);
  },
  cannon(g, lvl) {                                // Бомбожаб
    this.lid = 0xe08a3c;
    this.shadow(g, 31, 58);
    this.shape(g, 0xe08a3c, [['e', -22, 27, 18, 9], ['e', 22, 27, 18, 9], ['c', -16, -10, 10], ['c', 16, -10, 10], ['e', 0, 8, 60, 40]]);
    g.fillStyle(0xffd9a0); g.fillEllipse(0, 18, 40, 18);
    g.fillStyle(0xb5651d); g.fillCircle(-25, 8, 3); g.fillCircle(26, 5, 2.5);
    this.eye(g, -16, -11, 6, false); this.eye(g, 16, -11, 6, false);
    g.lineStyle(2.5, INK); g.beginPath(); g.arc(0, 0, 20, 0.15 * Math.PI, 0.85 * Math.PI); g.strokePath();
    const bomb = (x, y, r) => {
      this.shape(g, 0x2e2e2e, [['c', x, y, r]]);
      g.fillStyle(0x777777); g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.25);
      g.lineStyle(2.5, 0x8a6f43); g.lineBetween(x, y - r, x + 5, y - r - 6);
      g.fillStyle(0xff7a1a); g.fillCircle(x + 6, y - r - 7, 3.5); g.fillStyle(0xffe066); g.fillCircle(x + 6, y - r - 7, 1.8);
    };
    if (lvl === 2) bomb(0, -24, 9);
    if (lvl >= 3) { bomb(-9, -26, 8); bomb(9, -26, 8); bomb(0, -33, 7); }
  },
  frost(g, lvl) {                                 // Ледыш
    this.lid = 0x6fd3e8;
    this.shadow(g, 33, 46);
    const sp = [['t', 0, -42, -8, -16, 8, -16]];
    if (lvl >= 2) sp.push(['t', -19, -34, -23, -10, -8, -14], ['t', 19, -34, 23, -10, 8, -14]);
    if (lvl >= 3) sp.push(['t', -37, -12, -22, -6, -22, 8], ['t', 37, -12, 22, -6, 22, 8]);
    this.shape(g, 0xdff7ff, sp);
    this.shape(g, 0x6fd3e8, [['e', -12, 30, 16, 8], ['e', 12, 30, 16, 8], ['c', -26, 10, 7], ['c', 26, 10, 7], ['e', 0, 6, 48, 50]]);
    g.fillStyle(0xdff7ff); g.fillEllipse(0, 4, 34, 28);
    this.eye(g, -9, 0, 6, false); this.eye(g, 9, 0, 6, false);
    this.smile(g, 0, 7, 6);
    if (lvl >= 3) { g.fillStyle(0xffffff); g.fillTriangle(-12, 19, -2, 19, -7, 29); g.fillTriangle(2, 19, 12, 19, 7, 29); g.fillTriangle(-5, 20, 5, 20, 0, 32); }
  },

  poison(g, lvl) {                                // Ядозуб: фиолетовая змейка-гриб с ядовитыми клыками
    this.lid = 0xc05ae0;
    this.shadow(g, 31, 50);
    const parts = [['e', 20, 24, 30, 12], ['e', -6, 26, 40, 14], ['e', 0, 2, 44, 48]];
    if (lvl >= 2) parts.unshift(['t', -30, -14, -18, -22, -17, -2], ['t', 30, -14, 18, -22, 17, -2]);
    if (lvl >= 3) parts.unshift(['t', 0, -44, -9, -18, 9, -18], ['t', -16, -38, -20, -14, -6, -18], ['t', 16, -38, 20, -14, 6, -18]);
    this.shape(g, 0xc05ae0, parts);
    g.fillStyle(0xe9b8ff); g.fillEllipse(0, 14, 28, 22);
    g.fillStyle(0x7fe04a); g.fillCircle(-14, -12, 3.5); g.fillCircle(15, -8, 3); g.fillCircle(-17, 6, 2.5);
    if (lvl >= 2) { g.fillCircle(12, 8, 2.5); g.fillCircle(-6, -18, 2.5); }
    this.eye(g, -9, -6, 6, false); this.eye(g, 9, -6, 6, false);
    g.fillStyle(INK); g.fillRoundedRect(-9, 4, 18, 7, 3);
    g.fillStyle(0xffffff); g.fillTriangle(-8, 9, -3, 9, -5.5, 16 + lvl * 2); g.fillTriangle(3, 9, 8, 9, 5.5, 16 + lvl * 2);
    g.fillStyle(0x7fe04a); g.fillCircle(-5.5, 19 + lvl * 2, 2.2); if (lvl >= 3) g.fillCircle(5.5, 19 + lvl * 2, 2.2);
  },

  // ---------- дикие монстры ----------
  normal(g) {                                     // Слизень
    this.shadow(g, 20, 44);
    this.shape(g, 0xd94040, [['t', 0, -27, -6, -13, 6, -13], ['e', 0, 12, 46, 18], ['e', 0, 0, 36, 36]]);
    g.fillStyle(0xff9a9a); g.fillEllipse(-9, -10, 8, 5);
    this.eye(g, -7, -1, 5, true); this.eye(g, 7, -1, 5, true); this.brows(g, 7, -1, 5);
    g.fillStyle(0x4a0d0d); g.fillEllipse(0, 12, 14, 7);
    g.fillStyle(0xffffff); g.fillTriangle(-4, 9, -1, 9, -2.5, 13); g.fillTriangle(1, 9, 4, 9, 2.5, 13);
  },
  fast(g) {                                       // Шустрик
    this.shadow(g, 22, 34);
    this.shape(g, 0xe8d23d, [['t', -17, -32, -18, -8, -4, -14], ['t', 17, -32, 18, -8, 4, -14], ['t', 29, -8, 14, 0, 16, 10],
      ['e', -9, 19, 12, 7], ['e', 9, 19, 12, 7], ['e', 0, 2, 34, 32]]);
    g.fillStyle(0xf08a5d); g.fillTriangle(-15, -25, -15, -12, -8, -15); g.fillTriangle(15, -25, 15, -12, 8, -15);
    this.eye(g, -7, -1, 5.5, true); this.eye(g, 7, -1, 5.5, true); this.brows(g, 7, -1, 5.5);
    g.lineStyle(2.5, INK); g.lineBetween(-5, 10, 5, 10);
    g.fillStyle(0xffffff); g.fillTriangle(-2, 10, 2, 10, 0, 15);
  },
  tank(g) {                                       // Громила
    this.shadow(g, 30, 52);
    this.shape(g, 0xf2e9d0, [['t', -23, -36, -24, -12, -10, -18], ['t', 23, -36, 24, -12, 10, -18]]);
    this.shape(g, 0x8a4fd1, [['e', -11, 25, 16, 8], ['e', 11, 25, 16, 8], ['c', -27, 8, 8], ['c', 27, 8, 8], ['r', -21, -20, 42, 43, 12]]);
    g.fillStyle(0xa877e6); g.fillEllipse(0, 12, 28, 16);
    this.eye(g, -8, -7, 4.5, true); this.eye(g, 8, -7, 4.5, true); this.brows(g, 8, -7, 5);
    g.fillStyle(0x2a0f4a); g.fillRoundedRect(-11, 4, 22, 8, 3);
    g.fillStyle(0xffffff); g.fillTriangle(-9, 12, -4, 12, -6.5, 4); g.fillTriangle(4, 12, 9, 12, 6.5, 4);
  },

  fly(g) {                                        // Летун: синяя летучая мышка
    this.shape(g, 0x3f6cb8, [['t', -40, -20, -12, -2, -16, 12], ['t', -30, 8, -12, -2, -14, 14], ['t', 40, -20, 12, -2, 16, 12], ['t', 30, 8, 12, -2, 14, 14]]);
    this.shape(g, 0x5b8fd9, [['t', -13, -30, -15, -10, -3, -14], ['t', 13, -30, 15, -10, 3, -14], ['e', 0, 2, 32, 34]]);
    g.fillStyle(0xbfd8ff); g.fillEllipse(0, 9, 18, 14);
    this.eye(g, -7, -3, 5, true); this.eye(g, 7, -3, 5, true); this.brows(g, 7, -3, 5);
    g.fillStyle(0xffffff); g.fillTriangle(-5, 8, -1, 8, -3, 14); g.fillTriangle(1, 8, 5, 8, 3, 14);
  },
  heal(g) {                                       // Лекарь: зелёный дух с листком и крестом
    this.shadow(g, 24, 40);
    this.shape(g, 0x3fae5c, [['t', 0, -40, -10, -20, 6, -22], ['e', 10, -30, 16, 9]]);
    this.shape(g, 0x6fdc8c, [['e', -12, 20, 14, 10], ['e', 12, 20, 14, 10], ['e', 0, 0, 40, 42]]);
    g.fillStyle(0xe6ffe9); g.fillEllipse(0, 8, 26, 22);
    this.eye(g, -8, -9, 5, true); this.eye(g, 8, -9, 5, true); this.brows(g, 8, -9, 5);
    g.fillStyle(INK); g.fillRect(-9, 4, 18, 9); g.fillRect(-4.5, -1, 9, 19);
    g.fillStyle(0xff4d6a); g.fillRect(-7, 6, 14, 5); g.fillRect(-2.5, 1, 5, 15);
  },
  armor(g) {                                      // Броненосец: жук в стальном панцире
    this.shadow(g, 26, 52);
    this.shape(g, 0x6b4a2e, [['e', -18, 20, 14, 9], ['e', 18, 20, 14, 9], ['e', 0, 12, 44, 26]]);
    this.shape(g, 0x9aa7bd, [['e', 0, -4, 52, 44]]);
    g.fillStyle(0xd6deeb); g.fillEllipse(-9, -14, 20, 10);
    g.lineStyle(2.5, INK); g.lineBetween(0, -26, 0, 4); g.lineBetween(-24, -6, 24, -6);
    g.fillStyle(0x5d6880); [[-14, -16], [14, -16], [-16, 2], [16, 2]].forEach(([x, y]) => g.fillCircle(x, y, 2.6));
    g.fillStyle(0x6b4a2e); g.fillRoundedRect(-13, 6, 26, 14, 5);
    this.eye(g, -6, 12, 4, true); this.eye(g, 6, 12, 4, true); this.brows(g, 6, 12, 4);
  },

  boss(g) {                                       // Босс (запасной рисунок): громила с короной
    this.tank(g);
    this.shape(g, 0xffd23d, [['t', -16, -22, -12, -40, -6, -24], ['t', -5, -24, 0, -44, 5, -24], ['t', 6, -24, 12, -40, 16, -22], ['r', -16, -26, 32, 8, 2]]);
  },

  make(scene, key, fn, k, arg, blink) {
    if (scene.textures.exists(key)) return;
    this.blink = !!blink;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    const half = 46 * k * TEX_S;
    g.translateCanvas(half, half); g.scaleCanvas(k * TEX_S, k * TEX_S);
    fn.call(this, g, arg);
    g.generateTexture(key, Math.ceil(half * 2), Math.ceil(half * 2)); g.destroy();
  },
  makeAll(scene) {
    for (const type in TOWERS) for (let l = 1; l <= MAX_LEVEL; l++) {
      this.make(scene, `t_${type}_${l}`, this[type], 1, l);
      // Кадр с закрытыми глазами есть только у монстров, нарисованных кодом.
      if (!SPRITES[`t_${type}_${l}`]) this.make(scene, `t_${type}_${l}_b`, this[type], 1, l, true);
    }
    for (const type in ENEMIES) this.make(scene, 'e_' + type, this[type], ENEMIES[type].r / 18);
  }
};
