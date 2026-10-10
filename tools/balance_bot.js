// Прогон ботов на всех картах. Аргумент JSON переопределяет баланс: {"BAL":{},"hpMul":[1,1.12,1.2],"E":{"fly":{"hp":30}},"T":{"poison":{}},"maps":[1,2]}
const { chromium } = require('playwright');
(async () => {
  const over = JSON.parse(process.argv[2] || '{}');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 700 } });
  p.on('pageerror', e => console.log('PAGEERROR', String(e)));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + ''); await p.waitForFunction(() => window.game && game.scene.isActive('menu'));
  for (const m of over.maps || [0, 1, 2]) for (const mode of ['good', 'mid', 'lazy']) {
    const res = await p.evaluate(([m, mode, over]) => { Object.assign(BAL, over.BAL || {}); (over.hpMul || []).forEach((v, i) => MAPS[i].hpMul = v);
      for (const k in over.E || {}) Object.assign(ENEMIES[k], over.E[k]); for (const k in over.T || {}) Object.assign(TOWERS[k], over.T[k]);
      localStorage.setItem('td_tutorialDone', 'true'); ['fly', 'heal', 'armor'].forEach(k => localStorage.setItem('td_seen_' + k, 'true'));
      game.scene.getScenes(true)[0].scene.start('game', { map: m });
      return new Promise(r => setTimeout(() => { game.loop.sleep(); const s = game.scene.getScene('game');
        const [ax, ay] = PATH[0], [zx, zy] = PATH[PATH.length - 1];
        const road = sl => { let c = 0; for (let d = 0; d < s.pathLen; d += 10) { const [x, y] = s.posAt(d); if (Math.hypot(x - sl.x, y - sl.y) < 150) c++; } return c; };
        const air = sl => { let c = 0; for (let k = 0; k <= 1; k += 0.02) if (Math.hypot(ax + (zx - ax) * k - sl.x, ay + (zy - ay) * k - sl.y) < 140) c++; return c; };
        const byRoad = s.slots.slice().sort((a, b) => road(b) - road(a)), byAir = s.slots.slice().sort((a, b) => air(b) * 10 + road(b) / 10 - air(a) * 10 - road(a) / 10);
        const order = { find: f => ((m > 0 && k % 4 === 2 ? byAir : byRoad).find(f)) };
        const types = (over.types || [['gun', 'cannon', 'gun', 'frost', 'gun', 'cannon'], ['gun', 'cannon', 'gun', 'frost', 'gun', 'cannon'], ['gun', 'cannon', 'poison', 'frost', 'gun', 'poison', 'cannon']])[m];
        const maxT = { good: 15, mid: 9, lazy: 6 }[mode]; let k = 0; const log = [];
        for (let i = 0; i < 400000 && !s.over; i++) { if (i % 12 === 0) {
            if (s.towers.length < maxT) { const sl = order.find(x => !x.tower), ty = types[k % types.length]; if (s.gold >= TOWERS[ty].cost) { s.build(sl, ty); k++; } }
            else if (mode !== 'lazy') for (const t of s.towers) s.upgrade(t);
            if (!s.waveActive) { log.push(s.lives + (Object.keys(s.leaks).length ? '(' + Object.entries(s.leaks).map(e => e[0][0] + e[1]).join('') + ')' : '')); s.leaks = {}; s.startWave(); } }
          s.update(0, 1000 / 60); }
        game.loop.wake(); r('map' + m + ' ' + mode.padEnd(4) + ' wave ' + String(s.wave).padStart(2) + '/' + WAVES.length + ' lives ' + String(s.lives).padStart(2) + ' | ' + log.join(' ') + ' end(' + JSON.stringify(s.leaks) + ') towers ' + s.towers.map(t => t.type[0] + t.level).join('')); }, 500)); }, [m, mode, over]);
    console.log(res);
  }
  await b.close();
})();
