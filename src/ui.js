// Оформление интерфейса: объёмные кнопки, панели и карточки.
// Всё рисуется один раз в текстуру (в двойном разрешении) и дальше используется как картинка.
// Цвета кнопок по смыслу — одинаковые на всех экранах (пауза, конец забега, меню).
const BTN = {
  resume: 0x2e8b57,    // ▶ продолжить — зелёный
  next: 0x2e8b57,      // ➜ следующая карта — зелёный
  retry: 0x2e6fd1,     // ↻ заново — синий
  settings: 0x5a4f7a,  // ⚙ настройки — фиолетовый
  endless: 0x8a5a2e,   // ∞ бесконечный режим — коричневый
  menu: 0x9a3e4a       // ⌂ в меню — бордовый: выход из забега
};

const UI = {
  shade(c, k) {                                   // k < 0 темнее, k > 0 светлее
    const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
    return `rgb(${f(c >> 16 & 255)},${f(c >> 8 & 255)},${f(c & 255)})`;
  },
  rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  },
  tex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const S = 2, t = scene.textures.createCanvas(key, Math.ceil(w * S), Math.ceil(h * S)), c = t.getContext();
    c.scale(S, S); draw(c); t.refresh(); return key;
  },

  // Кнопка: тень, тёмная «толщина» снизу, градиент, блик сверху, обводка.
  buttonTex(scene, w, h, color, enabled) {
    const col = enabled ? color : 0x55525c;
    return this.tex(scene, `ui_b_${w}_${h}_${col}`, w + 8, h + 12, c => {
      const x = 4, y = 2, r = Math.min(18, h / 2.6);
      c.fillStyle = 'rgba(0,0,0,0.38)'; this.rr(c, x, y + 8, w, h, r); c.fill();
      c.fillStyle = this.shade(col, -0.5); this.rr(c, x, y + 5, w, h, r); c.fill();
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, this.shade(col, 0.3)); g.addColorStop(0.5, this.shade(col, 0)); g.addColorStop(1, this.shade(col, -0.2));
      c.fillStyle = g; this.rr(c, x, y, w, h, r); c.fill();
      const g2 = c.createLinearGradient(0, y, 0, y + h * 0.5);
      g2.addColorStop(0, `rgba(255,255,255,${enabled ? 0.38 : 0.12})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g2; this.rr(c, x + 3, y + 3, w - 6, h * 0.48, Math.max(2, r - 3)); c.fill();
      c.lineWidth = 2.5; c.strokeStyle = this.shade(col, -0.65); this.rr(c, x, y, w, h, r); c.stroke();
    });
  },
  // Плашка без нажатия (та же форма, что у кнопки).
  plate(scene, x, y, w, h, color, enabled = true) {
    return scene.add.image(x, y, this.buttonTex(scene, w, h, color, enabled)).setDisplaySize(w + 8, h + 12).setOrigin(0.5, (2 + h / 2) / (h + 12));
  },
  // Мягкое золотистое свечение вокруг кнопки «можно купить»: ореол плавно разгорается и гаснет, как дыхание.
  // Рисуется снаружи кнопки и не закрывает надпись. Возвращает { objs, tween } — удалить вместе с кнопкой.
  shine(scene, x, y, w, h, depth) {
    const g = scene.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD), r = Math.min(18, h / 2.6);
    for (let k = 1; k <= 7; k++) {                   // несколько контуров: ближние ярче, дальние прозрачнее
      g.lineStyle(3, 0xffd86b, 0.45 * (1 - k / 8));
      g.strokeRoundedRect(x - w / 2 - k * 2, y - h / 2 - k * 2 + 2, w + k * 4, h + k * 4, r + k * 2);
    }
    g.setAlpha(0.25);
    const tween = scene.tweens.add({ targets: g, alpha: 1, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return { objs: [g], tween };
  },
  // Кнопка с подписью. Возвращает [картинка, текст]. opts: depth, size, enabled, silent.
  button(scene, x, y, w, h, label, color, cb, opts = {}) {
    const { depth = 1, size = '30px', enabled = true, silent = false } = opts;
    const img = this.plate(scene, x, y, w, h, color, enabled).setDepth(depth).setInteractive();
    const text = scene.add.text(x, y - 1, label, { fontFamily: FONT, fontSize: size, color: enabled ? '#fff' : '#a09ca8', fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5).setDepth(depth + 1);
    if (enabled) text.setShadow(0, 2, 'rgba(0,0,0,0.6)', 3);
    if (enabled && cb) img.on('pointerdown', () => {
      Sfx.unlock(); if (!silent) Sfx.play('tap');
      cb();
      if (img.active) scene.tweens.add({ targets: [img, text], y: '+=3', duration: 60, yoyo: true });   // нажатие «проваливается»
    });
    return [img, text];
  },

  // Полоса панели (верхняя или нижняя) с золотой кромкой со стороны поля.
  bar(scene, x, y, w, h, edge) {                  // edge: 'bottom' | 'top'
    const key = this.tex(scene, `ui_bar_${w}_${h}_${edge}`, w, h, c => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#30264a'); g.addColorStop(1, '#17121f'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const ey = edge === 'bottom' ? h - 5 : 0;
      c.fillStyle = '#0d0a12'; c.fillRect(0, edge === 'bottom' ? h - 7 : 5, w, 2);
      const gg = c.createLinearGradient(0, ey, 0, ey + 5);
      gg.addColorStop(0, '#f3d27a'); gg.addColorStop(1, '#9a7426'); c.fillStyle = gg; c.fillRect(0, ey, w, 5);
    });
    return scene.add.image(x, y, key).setDisplaySize(w, h);
  },

  // Карточка: скруглённая тёмная плитка с цветной рамкой.
  card(scene, x, y, w, h, border, dim) {
    const key = this.tex(scene, `ui_c_${w}_${h}_${border}_${dim ? 1 : 0}`, w + 8, h + 12, c => {
      const X = 4, Y = 2, r = 16;
      c.fillStyle = 'rgba(0,0,0,0.45)'; this.rr(c, X, Y + 7, w, h, r); c.fill();
      const g = c.createLinearGradient(0, Y, 0, Y + h);
      g.addColorStop(0, dim ? '#2a2830' : '#352c4f'); g.addColorStop(1, dim ? '#19181d' : '#1a1528'); c.fillStyle = g; this.rr(c, X, Y, w, h, r); c.fill();
      c.lineWidth = 4; c.strokeStyle = this.shade(border, dim ? -0.3 : 0); this.rr(c, X + 2, Y + 2, w - 4, h - 4, r - 2); c.stroke();
      c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,0.25)'; this.rr(c, X + 5, Y + 5, w - 10, h - 10, r - 5); c.stroke();
      c.lineWidth = 2; c.strokeStyle = '#0b0910'; this.rr(c, X, Y, w, h, r); c.stroke();
    });
    return scene.add.image(x, y, key).setDisplaySize(w + 8, h + 12).setOrigin(0.5, (2 + h / 2) / (h + 12));
  }
};
