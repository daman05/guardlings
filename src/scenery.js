// Оформление карты, нарисованное кодом: трава, цветы, камни, деревья, камешки на дороге.
// Случайность с фиксированным зерном, поэтому карта каждый раз выглядит одинаково.
const Scenery = {
  rng(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  },
  distToPath(segs, x, y) {
    let best = 1e9;
    for (const s of segs) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (y - s.y1) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - (s.x1 + dx * t), y - (s.y1 + dy * t)));
    }
    return best;
  },
  // Свободное место: не на дороге, не на площадке, не у портала.
  free(segs, x, y, roadGap, slotGap) {
    if (this.distToPath(segs, x, y) < ROAD_W / 2 + roadGap) return false;
    for (const [sx, sy] of SLOTS) if (Math.hypot(x - sx, y - sy) < slotGap) return false;
    const [bx, by] = PATH[PATH.length - 1];
    return Math.hypot(x - bx, y - by) > 80;
  },

  // Под дорогой: пятна травы разного оттенка.
  ground(g) {
    const r = this.rng(7 + MAP_INDEX * 100);
    for (let i = 0; i < 46; i++) {
      g.fillStyle(r() < 0.5 ? 0x3a7d45 : 0x27592f, 0.45);
      g.fillEllipse(r() * W, 90 + r() * 990, 70 + r() * 150, 50 + r() * 90);
    }
  },

  // Поверх дороги: камешки на дороге, трава, цветы, камни, деревья.
  props(g, segs) {
    const r = this.rng(21 + MAP_INDEX * 100), top = 105, bottom = 1065;
    for (const s of segs) {
      const n = Math.round(s.len / 22);
      for (let i = 0; i < n; i++) {
        const t = r(), off = (r() - 0.5) * (ROAD_W - 16);
        const horiz = s.y1 === s.y2;
        const x = s.x1 + (s.x2 - s.x1) * t + (horiz ? 0 : off), y = s.y1 + (s.y2 - s.y1) * t + (horiz ? off : 0);
        if (y < top - 10) continue;
        g.fillStyle(r() < 0.5 ? 0xb39258 : 0xdcc08a, 0.9); g.fillEllipse(x, y, 5 + r() * 6, 3 + r() * 3);
      }
    }
    for (let i = 0; i < 170; i++) {
      const x = 8 + r() * (W - 16), y = top + r() * (bottom - top);
      if (!this.free(segs, x, y, 8, 40)) continue;
      g.lineStyle(2, r() < 0.5 ? 0x58a862 : 0x1f4d28, 0.9);
      g.lineBetween(x, y, x - 4, y - 8); g.lineBetween(x, y, x, y - 10); g.lineBetween(x, y, x + 4, y - 8);
    }
    const petals = [0xffffff, 0xffe066, 0xff9ad1, 0xa9c8ff];
    for (let i = 0; i < 46; i++) {
      const x = 10 + r() * (W - 20), y = top + r() * (bottom - top);
      if (!this.free(segs, x, y, 10, 42)) continue;
      g.fillStyle(petals[Math.floor(r() * 4)]); g.fillCircle(x, y, 3.5);
      g.fillStyle(0xf2a600); g.fillCircle(x, y, 1.4);
    }
    for (let i = 0; i < 16; i++) {
      const x = 16 + r() * (W - 32), y = top + 10 + r() * (bottom - top - 20);
      if (!this.free(segs, x, y, 16, 52)) continue;
      const w = 16 + r() * 16, h = w * 0.7;
      g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 2, y + h * 0.4, w + 6, h * 0.5);
      g.fillStyle(0x2b2f33); g.fillEllipse(x, y, w + 4, h + 4);
      g.fillStyle(0x8d939c); g.fillEllipse(x, y, w, h);
      g.fillStyle(0xbfc5cc); g.fillEllipse(x - w * 0.15, y - h * 0.18, w * 0.45, h * 0.3);
    }
    const trees = [];
    for (let i = 0; i < 400 && trees.length < 13; i++) {
      const x = 30 + r() * (W - 60), y = top + 40 + r() * (bottom - top - 60);
      if (!this.free(segs, x, y, 38, 76)) continue;
      if (trees.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < 70)) continue;
      trees.push([x, y, 17 + r() * 8]);
    }
    trees.sort((a, b) => a[1] - b[1]);
    for (const [x, y, R] of trees) {
      g.fillStyle(0x000000, 0.22); g.fillEllipse(x + 3, y + 6, R * 2.2, R * 0.7);
      g.fillStyle(0x3b2715); g.fillRect(x - 5, y - R * 0.9, 10, R * 0.9 + 6);
      g.fillStyle(0x7a5230); g.fillRect(x - 3, y - R * 0.9, 6, R * 0.9 + 4);
      const blobs = [[-R * 0.6, -R * 1.1, R * 0.8], [R * 0.6, -R * 1.1, R * 0.8], [0, -R * 1.7, R]];
      g.fillStyle(0x143619); for (const [dx, dy, br] of blobs) g.fillCircle(x + dx, y + dy, br + 2.5);
      g.fillStyle(0x2e8b45); for (const [dx, dy, br] of blobs) g.fillCircle(x + dx, y + dy, br);
      g.fillStyle(0x52b765); g.fillCircle(x - R * 0.25, y - R * 1.95, R * 0.42);
    }
  },

  // Портал: спокойная фиолетовая воронка в кольце, медленно вращается. Рисуется в текстуры.
  portalTex(scene) {
    if (scene.textures.exists('portal_swirl')) return;
    const S = 256, mk = (key, draw) => { const t = scene.textures.createCanvas(key, S, S), c = t.getContext(); c.translate(S / 2, S / 2); draw(c); t.refresh(); };
    mk('portal_swirl', c => {
      c.beginPath(); c.arc(0, 0, 120, 0, Math.PI * 2); c.clip();
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 120);
      g.addColorStop(0, '#e2c4ff'); g.addColorStop(0.3, '#a866e8'); g.addColorStop(0.75, '#5b2a9c'); g.addColorStop(1, '#3a1870');
      c.fillStyle = g; c.fillRect(-128, -128, 256, 256);
      c.lineCap = 'round';
      for (let arm = 0; arm < 5; arm++) {                  // рукава спирали: светлые и тёмные через один
        const a0 = arm * Math.PI * 2 / 5;
        for (let r = 10; r < 118; r += 3) {
          const a = a0 + r * 0.05, a2 = a0 + (r + 3.5) * 0.05;
          c.strokeStyle = arm % 2 ? `rgba(40,8,90,${0.3 * r / 118})` : `rgba(240,220,255,${0.4 - 0.25 * r / 118})`;
          c.lineWidth = 3 + 9 * r / 118;
          c.beginPath(); c.moveTo(Math.cos(a) * r, Math.sin(a) * r); c.lineTo(Math.cos(a2) * (r + 3.5), Math.sin(a2) * (r + 3.5)); c.stroke();
        }
      }
    });
    mk('portal_ring', c => {
      c.lineWidth = 16; c.strokeStyle = '#2a0a5e'; c.beginPath(); c.arc(0, 0, 112, 0, Math.PI * 2); c.stroke();
      const g = c.createLinearGradient(0, -120, 0, 120); g.addColorStop(0, '#e6d0ff'); g.addColorStop(0.5, '#b98ae8'); g.addColorStop(1, '#8250c8');
      c.lineWidth = 10; c.strokeStyle = g; c.beginPath(); c.arc(0, 0, 112, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(0, 0, 116, Math.PI * 1.1, Math.PI * 1.7); c.stroke();
    });
  },
  portal(scene, x, y) {
    this.portalTex(scene);
    const R = 46, k = R * 2 / 240;                         // радиус портала на поле
    scene.add.ellipse(x + 3, y + 8, R * 2.2, R * 2.0, 0x000000, 0.22).setDepth(1);          // мягкая тень вместо сияния
    const a = scene.add.image(x, y, 'portal_swirl').setScale(k).setDepth(2);
    scene.tweens.add({ targets: a, angle: -360, duration: 14000, repeat: -1 });               // медленное спокойное вращение
    scene.add.image(x, y, 'portal_ring').setScale(k * 1.04).setDepth(3);
  }
};

