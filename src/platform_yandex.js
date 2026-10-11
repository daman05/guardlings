// Слой площадки «Яндекс Игры». Подключается только в сборке для Яндекса (tools/build_yandex.py),
// после platform.js и до остальных файлов игры. Заменяет в объекте Platform язык, сохранения,
// рекламу и таблицу рекордов на то, что даёт SDK Яндекса. Если SDK недоступен, игра работает как обычно.
const PlatformYandex = {
  ysdk: null,
  async init() {
    if (typeof YaGames === 'undefined') return;
    const ysdk = this.ysdk = await YaGames.init();
    Platform.store = true;
    Platform.lang = (ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang) || null;
    // Языки, где привычнее русский интерфейс
    if (['ru', 'be', 'kk', 'uk', 'uz'].includes(Platform.lang)) Platform.lang = 'ru';

    // Сохранения: «безопасное хранилище» площадки (не теряется в браузерах, которые чистят localStorage).
    try {
      const st = await ysdk.getStorage();
      Platform.storage.get = (key, fallback) => { try { const v = st.getItem('td_' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } };
      Platform.storage.set = (key, value) => { try { st.setItem('td_' + key, JSON.stringify(value)); } catch (e) {} };
    } catch (e) {}

    Platform.ready = () => { if (!this.readySent) { this.readySent = true; try { ysdk.features.LoadingAPI && ysdk.features.LoadingAPI.ready(); } catch (e) {} } };
    Platform.gameplay = on => { if (this.playing === on) return; this.playing = on; try { const g = ysdk.features.GameplayAPI; if (g) on ? g.start() : g.stop(); } catch (e) {} };

    // Реклама. На время показа звук и игра останавливаются.
    const hold = on => { if (typeof Sfx !== 'undefined') Sfx.hold(on); };
    Platform.ads.rewarded = true;
    Platform.ads.showInterstitial = () => new Promise(resolve => {
      let done = false, open = false; const end = () => { if (!done) { done = true; hold(false); resolve(); } };
      try { ysdk.adv.showFullscreenAdv({ callbacks: { onOpen: () => { open = true; hold(true); }, onClose: end, onError: end, onOffline: end } }); } catch (e) { end(); }
      setTimeout(() => { if (!open) end(); }, 4000);          // если площадка не ответила, не держим игрока
    });
    Platform.ads.showRewarded = () => new Promise(resolve => {
      let got = false, done = false; const end = () => { if (!done) { done = true; hold(false); resolve(got); } };
      try { ysdk.adv.showRewardedVideo({ callbacks: { onOpen: () => hold(true), onRewarded: () => { got = true; }, onClose: end, onError: end } }); } catch (e) { end(); }
    });

    // Таблица рекордов площадки. Названия таблиц в консоли разработчика должны совпадать с именами из игры:
    // endless_0 … endless_4 (обычный режим) и endlessh_0 … endlessh_4 (тяжёлый).
    // Если таблицы нет или игрок не вошёл в аккаунт, остаётся локальная таблица.
    const local = { submit: Platform.leaderboard.submit.bind(Platform.leaderboard), top: Platform.leaderboard.top.bind(Platform.leaderboard) };
    const fetchTop = async board => {
      const res = await ysdk.leaderboards.getEntries(board, { quantityTop: 10, includeUser: true, quantityAround: 1 });
      const list = res.entries.filter(e => e.rank <= 10).map(e => ({ score: e.score, name: (e.player && e.player.publicName) || '—', date: 0, rank: e.rank }));
      return { list, userRank: res.userRank };
    };
    Platform.leaderboard.submit = async (board, score) => {
      const rankLocal = await local.submit(board, score);
      try {
        if (!(await ysdk.isAvailableMethod('leaderboards.setScore'))) throw 0;
        const mine = await ysdk.leaderboards.getPlayerEntry(board).catch(() => null);
        if (!mine || score > mine.score) await ysdk.leaderboards.setScore(board, score);
        const { userRank } = await fetchTop(board);
        Platform.leaderboard.local = false;
        return userRank >= 1 && userRank <= 10 ? userRank - 1 : -1;
      } catch (e) { Platform.leaderboard.local = true; return rankLocal; }
    };
    Platform.leaderboard.top = async board => {
      try { const { list } = await fetchTop(board); Platform.leaderboard.local = false; return list; }
      catch (e) { Platform.leaderboard.local = true; return local.top(board); }
    };
  }
};
