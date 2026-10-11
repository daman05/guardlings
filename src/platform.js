// Слой платформы: сохранения, реклама, покупки.
// Игра обращается только к этому объекту. При упаковке в приложение
// (Capacitor) или публикации на площадке (Яндекс Игры, Telegram)
// меняется только этот файл.
const Platform = {
  storage: {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('td_' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('td_' + key, JSON.stringify(value)); } catch (e) {}
    }
  },
  // Таблица рекордов. Сейчас — лучшие забеги на этом устройстве. При публикации этот блок заменяется
  // таблицей площадки (Яндекс Игры, Game Center, Google Play Games), и в ней появятся другие игроки.
  // submit добавляет результат и возвращает его место (с нуля) или -1, если он не вошёл в список;
  // top возвращает список записей { score, name, date }, лучшие первыми.
  leaderboard: {
    local: true,                                   // true — в таблице только свои результаты
    size: 10,
    submit(board, score) {
      const list = Platform.storage.get('lb_' + board, []);
      const entry = { score, name: Platform.storage.get('playerName', ''), date: Date.now() };
      list.push(entry); list.sort((a, b) => b.score - a.score || a.date - b.date);
      const top = list.slice(0, this.size); Platform.storage.set('lb_' + board, top);
      return Promise.resolve(top.indexOf(entry));
    },
    top(board) { return Promise.resolve(Platform.storage.get('lb_' + board, [])); }
  },
  store: false,                                    // true — игра запущена на площадке (Яндекс Игры и т. п.)
  lang: null,                                      // язык, который сообщила площадка (иначе берётся язык браузера)
  ready() {},                                      // игра загрузилась и готова — площадка убирает свою заставку
  gameplay(on) {},                                 // начался / остановился активный игровой процесс
  ads: {
    rewarded: false,                               // есть ли реклама за награду (кнопки с ней показываются только тогда)
    // Реклама между забегами. Обещание выполняется, когда можно продолжать (и если рекламы не было).
    showInterstitial() { return Promise.resolve(); },
    // Реклама за награду: true, если игрок досмотрел.
    showRewarded() { return Promise.resolve(false); }
  },
  purchases: {
    // Заглушка: вернуть true, если покупка прошла.
    buy(productId) { return Promise.resolve(false); }
  }
};
