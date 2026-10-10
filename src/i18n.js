// Язык игры. По умолчанию берётся язык устройства (русский — для русскоязычных, иначе английский);
// игрок может переключить его в настройках главного меню, выбор сохраняется.
// Чтобы добавить язык, скопируйте блок en, переведите строки и добавьте код языка в LANGS.
const STRINGS = {
  en: {
    subtitle: 'Monster Defense', play: 'Play', settings: 'Settings', version: 'version 0.5', loading: 'Loading…',
    languageLabel: 'Language', languageName: 'English', musicOn: '♪  Music: on', musicOff: '♪  Music: off',
    sfxOn: 'Sound effects: on', sfxOff: 'Sound effects: off', done: 'Done',
    chooseMap: 'Choose a map', mapN: 'Map {0}', cleared: '★ Cleared', best: 'Best: {0} of {1} waves',
    locked: 'Locked.\nClear map {0} to unlock.', back: 'Back',
    portal: 'PORTAL', wave: 'Wave {0}/{1}', hint: 'Tap a spot to summon a guardian',
    waveGoing: 'Wave {0} of {1} in progress', startWave: 'Start wave {0}', waveDone: 'Wave cleared!  +{0}',
    summon: 'Summon', need: 'Need', shopStats: 'Damage {0}   Range {1}', aps: 'Attacks per second: {0}',
    evolution: 'Evolution', evolve: 'Evolve', release: 'Release', maxEvo: 'Fully evolved',
    damage: 'Damage', range: 'Range', damageN: 'Damage {0}', rangeN: 'Range {0}',
    win: 'VICTORY!', lose: 'PORTAL LOST', result: 'Waves cleared: {0}\nBest: {1}',
    nextMap: 'Next map', retry: 'Restart', toMenu: 'Menu', pause: 'PAUSED', pauseInfo: '{0} · wave {1} of {2}', resume: 'Resume',
    t_gun: 'Spitty', t_cannon: 'Boomtoad', t_frost: 'Frostling',
    d_gun: 'rapid spit', d_cannon: 'area blast', d_frost: 'slows enemies',
    e_normal: 'Slime', e_fast: 'Dasher', e_tank: 'Brute', e_boss: 'Boss', m_0: 'Snake', m_1: 'Hook',
    bossComing: 'BOSS!', waveEndless: 'Wave {0} ∞', endless: 'Endless mode', clearedEndless: '★ Cleared · ∞ wave {0}',
    resultEndless: 'Endless mode\nWaves survived: {0}\nBest: {1}',
    top10: 'Top 10', top10Title: 'Top 10 · {0} · endless', lbWave: 'wave {0}', lbEmpty: 'No runs yet.\nWin the map and try endless mode!',
    lbLocal: 'your best runs on this device', lbYou: 'this run', close: 'Close', survived: 'Waves survived: {0}',
    tut1: 'Tap the glowing spot\nto place a guardian', tut2: 'Pick a guardian.\nSpitty is cheap and shoots fast',
    tut3: 'Now start the wave.\nDon\'t let monsters reach the portal!', tut4: 'You earned gold!\nTap a guardian to evolve it', tutSkip: 'tap to hide'
  },
  ru: {
    subtitle: 'Монстры-стражи', play: 'Играть', settings: 'Настройки', version: 'версия 0.5', loading: 'Загрузка…',
    languageLabel: 'Язык', languageName: 'Русский', musicOn: '♪  Музыка: включена', musicOff: '♪  Музыка: выключена',
    sfxOn: 'Звуки игры: включены', sfxOff: 'Звуки игры: выключены', done: 'Готово',
    chooseMap: 'Выбор карты', mapN: 'Карта {0}', cleared: '★ Пройдена', best: 'Рекорд: {0} из {1} волн',
    locked: 'Закрыта.\nПройдите карту {0}, чтобы открыть.', back: 'Назад',
    portal: 'ПОРТАЛ', wave: 'Волна {0}/{1}', hint: 'Нажмите на площадку, чтобы призвать стража',
    waveGoing: 'Идёт волна {0} из {1}', startWave: 'Начать волну {0}', waveDone: 'Волна пройдена!  +{0}',
    summon: 'Призвать', need: 'Нужно', shopStats: 'Урон {0}   Дальность {1}', aps: 'Атак в секунду: {0}',
    evolution: 'Эволюция', evolve: 'Эволюция', release: 'Отпустить', maxEvo: 'Максимальная эволюция',
    damage: 'Урон', range: 'Дальность', damageN: 'Урон {0}', rangeN: 'Дальность {0}',
    win: 'ПОБЕДА!', lose: 'ПОРТАЛ ЗАХВАЧЕН', result: 'Пройдено волн: {0}\nРекорд: {1}',
    nextMap: 'Следующая карта', retry: 'Заново', toMenu: 'В меню', pause: 'ПАУЗА', pauseInfo: '{0} · волна {1} из {2}', resume: 'Продолжить',
    t_gun: 'Плевун', t_cannon: 'Бомбожаб', t_frost: 'Ледыш',
    d_gun: 'быстрые плевки', d_cannon: 'взрыв по площади', d_frost: 'замедляет врагов',
    e_normal: 'Слизень', e_fast: 'Шустрик', e_tank: 'Громила', e_boss: 'Босс', m_0: 'Змейка', m_1: 'Крюк',
    bossComing: 'БОСС!', waveEndless: 'Волна {0} ∞', endless: 'Бесконечный режим', clearedEndless: '★ Пройдена · ∞ волна {0}',
    resultEndless: 'Бесконечный режим\nВыдержано волн: {0}\nРекорд: {1}',
    top10: 'Топ-10', top10Title: 'Топ-10 · {0} · бесконечный режим', lbWave: 'волна {0}', lbEmpty: 'Пока нет забегов.\nПройдите карту и попробуйте бесконечный режим!',
    lbLocal: 'ваши лучшие забеги на этом устройстве', lbYou: 'этот забег', close: 'Закрыть', survived: 'Выдержано волн: {0}',
    tut1: 'Нажмите на светящуюся площадку,\nчтобы поставить стража', tut2: 'Выберите стража.\nПлевун дешёвый и быстро стреляет',
    tut3: 'Теперь запустите волну.\nНе дайте монстрам дойти до портала!', tut4: 'Вы заработали золото!\nНажмите на стража, чтобы он эволюционировал', tutSkip: 'нажмите, чтобы скрыть'
  }
};
const LANGS = ['en', 'ru'];
let LANG = Platform.storage.get('lang', null);
if (!LANGS.includes(LANG)) LANG = String(navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
document.documentElement.lang = LANG;

// Строка на текущем языке: L('wave', 3, 10) → «Волна 3/10».
function L(key, ...args) {
  let s = STRINGS[LANG][key]; if (s === undefined) s = STRINGS.en[key]; if (s === undefined) return key;
  args.forEach((v, i) => { s = s.replace('{' + i + '}', v); });
  return s;
}
function setLang(code) { LANG = code; Platform.storage.set('lang', code); document.documentElement.lang = code; }
function nextLang() { return LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]; }
