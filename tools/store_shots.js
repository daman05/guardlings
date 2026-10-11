// Снимает скриншоты для карточки игры в магазине (русские и английские) в store/yandex/.
// Запуск: node tools/store_shots.js   (нужен playwright)
const { chromium } = require(process.env.PW || 'playwright');
const path = require('path'), root = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  for (const lang of ['ru', 'en']) {
    const p = await b.newPage({ viewport: { width: 720, height: 1280 }, deviceScaleFactor: 1.5 });
    p.on('pageerror', e => console.log('PAGEERROR', String(e)));
    const shot = n => p.screenshot({ path: path.join(root, 'store', 'yandex', 'screen_' + lang + '_' + n + '.png') });
    await p.goto('file://' + root + '/index.html');
    await p.waitForFunction(() => window.game && game.scene.isActive('menu'));
    await p.evaluate(lang => { localStorage.clear(); const set = (k, v) => localStorage.setItem('td_' + k, JSON.stringify(v));
      set('lang', lang); set('tutorialDone', true); set('abTipDone', true); set('crystals', 85); [10, 10, 12, 7].forEach((n, i) => set('best_' + i, n)); [3, 2, 2].forEach((n, i) => set('stars_' + i, n));
      ['fly', 'heal', 'armor'].forEach(k => set('seen_' + k, true)); }, lang);
    await p.reload(); await p.waitForFunction(() => window.game && game.scene.isActive('menu') && game.anims.exists('p_poison')); await p.waitForTimeout(600);
    await shot(1);                                                       // главное меню
    const battle = async (map, wave, towers, secs) => {
      await p.evaluate(m => game.scene.getScenes(true)[0].scene.start('game', { map: m, hard: false }), map); await p.waitForTimeout(600);
      await p.evaluate(([wave, towers, secs]) => { const s = game.scene.getScene('game'); s.gold = 9999;
        towers.forEach(([i, t, l]) => { s.build(s.slots[i], t); for (let k = 1; k < l; k++) s.upgrade(s.slots[i].tower); });
        s.gold = 345; s.wave = wave - 1; game.loop.sleep(); s.startWave(); for (let i = 0; i < 60 * secs; i++) s.update(0, 1000 / 60); s.lives = Math.max(s.lives, 16); s.refresh(); game.loop.wake(); }, [wave, towers, secs]);
      await p.waitForTimeout(350);
    };
    await battle(0, 7, [[3, 'gun', 3], [4, 'cannon', 2], [5, 'poison', 2], [8, 'frost', 2], [9, 'gun', 2], [10, 'cannon', 3], [12, 'poison', 1], [0, 'gun', 1], [13, 'frost', 1]], 13);
    await shot(2);                                                       // бой на первой карте
    await p.evaluate(() => { const s = game.scene.getScene('game'); s.gold = 240; s.select(s.slots[1]); }); await p.waitForTimeout(900);
    await shot(3);                                                       // витрина стражей
    await p.evaluate(() => { const s = game.scene.getScene('game'); s.select(null); s.gold = 400; s.select(s.slots[5]); });
    await p.waitForTimeout(700); await shot(4);                          // эволюция
    await battle(4, 6, [[2, 'gun', 2], [4, 'poison', 3], [5, 'cannon', 2], [7, 'frost', 2], [8, 'gun', 3], [10, 'cannon', 2], [15, 'poison', 2], [16, 'gun', 2], [11, 'frost', 1], [13, 'gun', 1]], 16);
    await shot(5);                                                       // пятая карта, две дороги, босс
    await p.evaluate(() => game.scene.getScene('game').scene.start('maps')); await p.waitForTimeout(500);
    await shot(6);                                                       // выбор карт
    await p.close();
  }
  await b.close();
})();
