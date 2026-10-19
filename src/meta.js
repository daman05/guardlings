// То, что остаётся у игрока между забегами: звёзды за карты, кристаллы и купленные за них улучшения.
// Цифры улучшений и наград — здесь же.

// Улучшения: step — прибавка за уровень (для evo, dmg и способностей — в процентах), всего UP_COST.length уровней.
// Способности прокачиваются отдельно: у метеора step — ускорение перезарядки (%), power — прибавка урона (%) за уровень;
// у заморозки step — ускорение перезарядки (%), power — прибавка времени заморозки (с) за уровень.
const UPGRADES = {
  gold:  { step: 15, color: 0xffc933 },   // стартовое золото
  lives: { step: 2,  color: 0xff4d4d },   // жизни портала
  dmg:   { step: 4,  color: 0x4fc36a },   // урон всех стражей, %
  evo:   { step: 5,  color: 0xc05ae0 },   // скидка на эволюцию, %
  meteor: { step: 6, power: 10, color: 0xff7a1a },   // метеор: перезарядка −6 % и урон +10 % за уровень
  freeze: { step: 6, power: 0.3, color: 0x6fd3e8 }   // заморозка: перезарядка −6 % и +0,3 с заморозки за уровень
};
const UP_ORDER = ['gold', 'lives', 'dmg', 'evo', 'meteor', 'freeze'];
const UP_COST = [15, 25, 40, 60, 90];     // цена каждого следующего уровня в кристаллах

// Награды кристаллами.
const REWARD = { wave: 1, star: 15, endlessWave: 2, ad: 20 };   // за пройденную волну, за каждую новую звезду, за волну бесконечного режима
// Звёзды за победу: доля сохранённых жизней портала.
const STAR_AT = [0.9, 0.5];               // от 90 % жизней — три звезды, от 50 % — две, иначе одна

const Meta = {
  get crystals() { return Platform.storage.get('crystals', 0); },
  add(n) { Platform.storage.set('crystals', this.crystals + n); },
  level(id) { return Platform.storage.get('up_' + id, 0); },
  bonus(id) { return this.level(id) * UPGRADES[id].step; },
  power(id) { return this.level(id) * (UPGRADES[id].power || 0); },
  maxed(id) { return this.level(id) >= UP_COST.length; },
  cost(id) { return UP_COST[this.level(id)]; },
  buy(id) {
    if (this.maxed(id) || this.crystals < this.cost(id)) return false;
    this.add(-this.cost(id)); Platform.storage.set('up_' + id, this.level(id) + 1); return true;
  },
  // Звёзды карты. Карты, пройденные до появления звёзд, считаются пройденными на одну.
  stars(i, hard = HARD) { return Platform.storage.get(mk('stars', i, hard), mapBest(i, hard) >= MAPS[i].waves.length ? 1 : 0); },
  starsFor(lives, maxLives) { const k = lives / maxLives; return k >= STAR_AT[0] ? 3 : k >= STAR_AT[1] ? 2 : 1; },
  // Записывает результат победы; возвращает, сколько звёзд добавилось к рекорду карты.
  win(i, n) { const had = Platform.storage.get(mk('stars', i), 0); if (n > had) Platform.storage.set(mk('stars', i), n); return Math.max(0, n - had); }
};

// Характеристики стража на стадии level (с учётом купленных улучшений).
function guardStats(type, level) {
  const d = TOWERS[type], up = LEVEL_UP, n = level - 1, bonus = 1 + Meta.bonus('dmg') / 100;
  return { dmg: d.dmg * Math.pow(up.dmg, n) * bonus, range: d.range * (1 + up.range * n), rate: d.rate / Math.pow(up.speed, n),
           splash: d.splash || 0, slow: d.slow || 0, poison: (d.poison || 0) * Math.pow(up.poison, n) * bonus, ptime: d.ptime || 0 };
}
// Три характеристики стража в одном виде для всех экранов (витрина, эволюция, карточка «i», справочник):
// всегда в этом порядке — урон (у Ядозуба яд), дальность, скорость атаки.
// Иконки характеристик (эмодзи — на телефонах они цветные).
const STAT_ICON = { dmg: '💥', poison: '🧪', range: '🎯', speed: '⚡' };
function statRows(type, level) {
  const s = guardStats(type, level), p = !!TOWERS[type].poison;
  return [
    { id: 'dmg', label: STAT_ICON[p ? 'poison' : 'dmg'] + ' ' + L(p ? 'stPoison' : 'stDmg'), value: p ? L('perSec', Math.round(s.poison)) : String(Math.round(s.dmg)) },
    { id: 'range', label: STAT_ICON.range + ' ' + L('stRange'), value: String(Math.round(s.range)) },
    { id: 'speed', label: STAT_ICON.speed + ' ' + L('stSpeed'), value: L('perSec', (1 / s.rate).toFixed(1)) }
  ];
}
// Строка «Урон 12 · Дальность 170 · Скорость 2.2/с».
function statLine(type, level) { return statRows(type, level).map(r => r.label + ' ' + r.value).join('   '); }

// Раньше было общее улучшение «Быстрые способности» (up_cd). Его уровни переходят в оба новых, чтобы прокачка не пропала.
(function migrate() {
  const old = Platform.storage.get('up_cd', 0);
  if (!old) return;
  for (const id of ['meteor', 'freeze']) Platform.storage.set('up_' + id, Math.max(Platform.storage.get('up_' + id, 0), old));
  Platform.storage.set('up_cd', 0);
})();
// Текст улучшения на уровне lvl («Золото в начале карты: +30», «Перезарядка −12 %, урон +20 %»).
function upgradeText(id, lvl) {
  const u = UPGRADES[id], s = Math.round(lvl * u.step * 10) / 10, p = Math.round(lvl * (u.power || 0) * 10) / 10;
  const num = v => LANG === 'ru' ? String(v).replace('.', ',') : String(v);
  return L('upd_' + id, num(s), num(p));
}
