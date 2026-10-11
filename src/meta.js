// То, что остаётся у игрока между забегами: звёзды за карты, кристаллы и купленные за них улучшения.
// Цифры улучшений и наград — здесь же.

// Улучшения: step — прибавка за уровень (для evo, dmg, cd — в процентах), всего UP_COST.length уровней.
const UPGRADES = {
  gold:  { step: 15, color: 0xffc933 },   // стартовое золото
  lives: { step: 2,  color: 0xff4d4d },   // жизни портала
  dmg:   { step: 4,  color: 0x4fc36a },   // урон всех стражей, %
  evo:   { step: 5,  color: 0xc05ae0 },   // скидка на эволюцию, %
  cd:    { step: 6,  color: 0x6fd3e8 }    // перезарядка способностей быстрее, %
};
const UP_ORDER = ['gold', 'lives', 'dmg', 'evo', 'cd'];
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
