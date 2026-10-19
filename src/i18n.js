// Язык игры. По умолчанию берётся язык устройства (русский — для русскоязычных, иначе английский);
// игрок может переключить его в настройках главного меню, выбор сохраняется.
// Чтобы добавить язык, скопируйте блок en, переведите строки и добавьте код языка в LANGS.
const STRINGS = {
  en: {
    subtitle: 'Monster Defense', play: 'Play', settings: 'Settings', version: 'version 0.28', loading: 'Loading…',
    languageLabel: 'Language', languageName: 'English',
    sfxOn: '♪  Sound: on', sfxOff: '♪  Sound: off', done: 'Done',
    chooseMap: 'Choose a map', mapN: 'Map {0}', cleared: '★ Cleared', best: 'Best: {0} of {1} waves',
    locked: 'Locked.\nClear map {0} to unlock.', back: 'Back',
    portal: 'PORTAL', wave: 'Wave {0}/{1}', hint: 'Tap a spot to summon a guardian',
    waveGoing: '⚔ Wave {0} of {1} in progress', startWave: '⚔ Start wave {0}', waveDone: 'Wave cleared!  +{0}',
    summon: 'Summon', need: 'Need', shopStats: 'Damage {0}   Range {1}', aps: 'Attacks per second: {0}',
    evolution: 'Evolution', evolve: 'Evolve', release: 'Sell', maxEvo: 'Fully evolved',
    damage: 'Damage', range: 'Range', damageN: 'Damage {0}', rangeN: 'Range {0}',
    win: 'VICTORY!', lose: 'PORTAL LOST', result: 'Waves cleared: {0}\nBest: {1}',
    nextMap: 'Next map', retry: 'Restart', toMenu: 'Menu', pause: 'PAUSED', pauseInfo: '{0} · wave {1} of {2}', resume: 'Resume',
    t_gun: 'Spitty', t_cannon: 'Boomtoad', t_frost: 'Frostling', t_poison: 'Venomite', d_poison: 'poison, pierces armor', poisonPs: 'Poison/sec', poisonN: 'Poison {0}/sec',
    e_fly: 'Flapper', e_heal: 'Mender', e_armor: 'Shellback', m_2: 'Spiral', m_3: 'Pincers', m_4: 'Fork', newEnemy: 'New monster',
    n_fly: 'Flapper flies straight to the portal,\nignoring the road', n_heal: 'Mender heals monsters nearby.\nGroup your guardians to out-damage it', n_armor: 'Shellback shrugs off weak hits.\nPoison and big blasts work best',
    d_gun: 'rapid spit', d_cannon: 'area blast', d_frost: 'slows enemies',
    e_normal: 'Slime', e_fast: 'Dasher', e_tank: 'Brute', e_boss: 'Boss', m_0: 'Snake', m_1: 'Hook',
    bossComing: 'BOSS!', waveEndless: 'Wave {0} ∞', endless: 'Endless mode', clearedEndless: '★ Cleared · ∞ wave {0}',
    resultEndless: 'Endless mode\nWaves survived: {0}\nBest: {1}',
    top10: 'Top 10', top10Title: 'Top 10 · {0} · endless', lbWave: 'wave {0}', lbEmpty: 'No runs yet.\nWin the map and try endless mode!',
    lbLocal: 'your best runs on this device', lbYou: 'this run', close: 'Close', survived: 'Waves survived: {0}',
    earlyWave: '⚔ Call wave {0} now', earlyDone: 'Brave!  +{0}', book: 'Monsters', bookWild: 'Wild monsters', bookGuards: 'Guardians',
    bkEnemy: 'Health {0} · Speed {1} · Gold {2}', bkCost: 'Cost {0}',
    b_normal: 'A plain monster with no tricks. Any guardian will do.',
    b_fast: 'Weak but very fast. Slow it with Frostling, finish with Spitty.',
    b_tank: 'Slow and very tough. Needs evolved guardians and poison.',
    b_fly: 'Flies straight to the portal, ignoring the road. Place guardians on the line between the entrance and the portal.',
    b_heal: 'Heals monsters nearby. Group your guardians; blasts reach it inside a crowd.',
    b_armor: 'Every hit on it is weaker. Poison ignores armor, big blasts punch through.',
    b_boss: 'Huge health, barely slowed, costs 10 lives. Start poisoning it early.',
    g_gun: 'Cheap and fast. Great against Dashers and Flappers, weak against armor.',
    g_cannon: 'Hits an area. Best against crowds and Shellbacks.',
    g_frost: 'Barely hurts but slows enemies. Place it next to strong guardians.',
    g_poison: 'Poison ignores armor and works on several enemies at once. Best against Shellbacks, Brutes and the Boss.',
    upgrades: 'Upgrades', upHint: 'Crystals come from cleared waves, new stars and endless mode', upMax: 'MAX',
    up_gold: 'Starting gold', up_lives: 'Portal lives', up_dmg: 'Guardian damage', up_speed: 'Attack speed', up_evo: 'Cheaper evolution', up_meteor: 'Meteor', up_freeze: 'Freeze',
    upd_gold: 'Extra gold at the start: +{0}', upd_lives: 'Extra lives: +{0}', upd_dmg: 'Damage of all guardians: +{0}%', upd_speed: 'Attack speed of all guardians: +{0}%', upd_evo: 'Evolution discount: {0}%', upd_meteor: 'Recharge −{0}%, damage +{1}%', upd_freeze: 'Recharge −{0}%, freeze +{1} s',
    crystalsGot: '◆ +{0}', ab_meteor: 'Meteor', ab_freeze: 'Freeze', abAim: 'Tap the field',
    stageNow: '(now)', waveN: 'Wave {0}', stDmg: 'Damage', stPoison: 'Poison', stRange: 'Range', stSpeed: 'Speed', perSec: '{0}/s', modeNormal: 'Normal', modeHard: 'Hard', lockedHard: 'Locked.\nClear this map in normal mode first.',
    tutAb: 'In a tough spot use abilities:\n☄ Meteor — tap it, then tap the field\n❄ Freeze — stops every monster', adDouble: '▶ Double', adCrystals: '▶ Watch a video: ◆ +{0}',
    tut1: 'Tap the glowing spot\nto place a guardian', tut2: 'Pick a guardian.\nSpitty is cheap and shoots fast',
    tut3: 'Now start the wave.\nDon\'t let monsters reach the portal!', tut4: 'You earned gold!\nTap a guardian to evolve it', tutSkip: 'tap to hide'
  },
  ru: {
    subtitle: 'Монстры-стражи', play: 'Играть', settings: 'Настройки', version: 'версия 0.28', loading: 'Загрузка…',
    languageLabel: 'Язык', languageName: 'Русский',
    sfxOn: '♪  Звук: включён', sfxOff: '♪  Звук: выключен', done: 'Готово',
    chooseMap: 'Выбор карты', mapN: 'Карта {0}', cleared: '★ Пройдена', best: 'Рекорд: {0} из {1} волн',
    locked: 'Закрыта.\nПройдите карту {0}, чтобы открыть.', back: 'Назад',
    portal: 'ПОРТАЛ', wave: 'Волна {0}/{1}', hint: 'Нажмите на площадку, чтобы призвать стража',
    waveGoing: '⚔ Идёт волна {0} из {1}', startWave: '⚔ Начать волну {0}', waveDone: 'Волна пройдена!  +{0}',
    summon: 'Призвать', need: 'Нужно', shopStats: 'Урон {0}   Дальность {1}', aps: 'Атак в секунду: {0}',
    evolution: 'Эволюция', evolve: 'Эволюция', release: 'Продать', maxEvo: 'Максимальная эволюция',
    damage: 'Урон', range: 'Дальность', damageN: 'Урон {0}', rangeN: 'Дальность {0}',
    win: 'ПОБЕДА!', lose: 'ПОРТАЛ ЗАХВАЧЕН', result: 'Пройдено волн: {0}\nРекорд: {1}',
    nextMap: 'Следующая карта', retry: 'Заново', toMenu: 'В меню', pause: 'ПАУЗА', pauseInfo: '{0} · волна {1} из {2}', resume: 'Продолжить',
    t_gun: 'Плевун', t_cannon: 'Бомбожаб', t_frost: 'Ледыш', t_poison: 'Ядозуб', d_poison: 'яд сквозь броню', poisonPs: 'Яд в секунду', poisonN: 'Яд {0} в секунду',
    e_fly: 'Летун', e_heal: 'Лекарь', e_armor: 'Броненосец', m_2: 'Спираль', m_3: 'Клещи', m_4: 'Развилка', newEnemy: 'Новый монстр',
    n_fly: 'Летун летит к порталу напрямик,\nне по дороге', n_heal: 'Лекарь лечит монстров рядом.\nСтавьте стражей кучнее, чтобы перебить лечение', n_armor: 'Броненосец не замечает слабые удары.\nПомогут яд и сильные взрывы',
    d_gun: 'быстрые плевки', d_cannon: 'взрыв по площади', d_frost: 'замедляет врагов',
    e_normal: 'Слизень', e_fast: 'Шустрик', e_tank: 'Громила', e_boss: 'Босс', m_0: 'Змейка', m_1: 'Крюк',
    bossComing: 'БОСС!', waveEndless: 'Волна {0} ∞', endless: 'Бесконечный режим', clearedEndless: '★ Пройдена · ∞ волна {0}',
    resultEndless: 'Бесконечный режим\nВыдержано волн: {0}\nРекорд: {1}',
    top10: 'Топ-10', top10Title: 'Топ-10 · {0} · бесконечный режим', lbWave: 'волна {0}', lbEmpty: 'Пока нет забегов.\nПройдите карту и попробуйте бесконечный режим!',
    lbLocal: 'ваши лучшие забеги на этом устройстве', lbYou: 'этот забег', close: 'Закрыть', survived: 'Выдержано волн: {0}',
    earlyWave: '⚔ Волна {0} сейчас', earlyDone: 'Смело!  +{0}', book: 'Монстры', bookWild: 'Дикие монстры', bookGuards: 'Стражи',
    bkEnemy: 'Здоровье {0} · Скорость {1} · Золото {2}', bkCost: 'Цена {0}',
    b_normal: 'Обычный монстр без хитростей. Подойдёт любой страж.',
    b_fast: 'Слабый, но очень быстрый. Замедляйте Ледышом, добивайте Плевуном.',
    b_tank: 'Медленный и очень живучий. Нужны эволюции стражей и яд.',
    b_fly: 'Летит к порталу напрямик, не по дороге. Ставьте стражей на прямой между входом и порталом.',
    b_heal: 'Лечит монстров рядом. Ставьте стражей кучнее; взрывы достают его в толпе.',
    b_armor: 'Каждый удар по нему слабее. Яд не замечает броню, сильные взрывы её пробивают.',
    b_boss: 'Огромное здоровье, почти не замедляется, отнимает 10 жизней. Начинайте травить его заранее.',
    g_gun: 'Дешёвый и быстрый. Хорош против Шустриков и Летунов, слаб против брони.',
    g_cannon: 'Бьёт по площади. Лучший против толпы и Броненосцев.',
    g_frost: 'Почти не ранит, но замедляет. Ставьте рядом с сильными стражами.',
    g_poison: 'Яд не замечает броню и действует сразу на нескольких врагов. Лучший против Броненосцев, Громил и Босса.',
    upgrades: 'Улучшения', upHint: 'Кристаллы дают за пройденные волны, новые звёзды и бесконечный режим', upMax: 'МАКС',
    up_gold: 'Стартовое золото', up_lives: 'Жизни портала', up_dmg: 'Урон стражей', up_speed: 'Скорость атаки', up_evo: 'Дешёвая эволюция', up_meteor: 'Метеор', up_freeze: 'Заморозка',
    upd_gold: 'Золото в начале карты: +{0}', upd_lives: 'Дополнительные жизни: +{0}', upd_dmg: 'Урон всех стражей: +{0}%', upd_speed: 'Скорость атаки всех стражей: +{0}%', upd_evo: 'Скидка на эволюцию: {0}%', upd_meteor: 'Перезарядка −{0}%, урон +{1}%', upd_freeze: 'Перезарядка −{0}%, заморозка +{1} с',
    crystalsGot: '◆ +{0}', ab_meteor: 'Метеор', ab_freeze: 'Заморозка', abAim: 'Нажмите на поле',
    stageNow: '(сейчас)', waveN: 'Волна {0}', stDmg: 'Урон', stPoison: 'Яд', stRange: 'Дальность', stSpeed: 'Скорость', perSec: '{0}/с', modeNormal: 'Обычный', modeHard: 'Тяжёлый', lockedHard: 'Закрыта.\nСначала пройдите эту карту в обычном режиме.',
    tutAb: 'В трудный момент помогут способности:\n☄ Метеор — нажмите, затем на поле\n❄ Заморозка — останавливает всех', adDouble: '▶ Удвоить', adCrystals: '▶ Ролик за награду: ◆ +{0}',
    tut1: 'Нажмите на светящуюся площадку,\nчтобы поставить стража', tut2: 'Выберите стража.\nПлевун дешёвый и быстро стреляет',
    tut3: 'Теперь запустите волну.\nНе дайте монстрам дойти до портала!', tut4: 'Вы заработали золото!\nНажмите на стража, чтобы он эволюционировал', tutSkip: 'нажмите, чтобы скрыть'
  }
};
const LANGS = ['en', 'ru'];
let LANG = Platform.storage.get('lang', null);
if (!LANGS.includes(LANG)) LANG = String(Platform.lang || navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
document.documentElement.lang = LANG;

// Строка на текущем языке: L('wave', 3, 10) → «Волна 3/10».
function L(key, ...args) {
  let s = STRINGS[LANG][key]; if (s === undefined) s = STRINGS.en[key]; if (s === undefined) return key;
  args.forEach((v, i) => { s = s.replace('{' + i + '}', v); });
  return s;
}
function setLang(code) { LANG = code; Platform.storage.set('lang', code); document.documentElement.lang = code; }
function nextLang() { return LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]; }
