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
  ads: {
    // Заглушка: вернуть true, если игрок досмотрел рекламу за награду.
    showRewarded() { return Promise.resolve(false); }
  },
  purchases: {
    // Заглушка: вернуть true, если покупка прошла.
    buy(productId) { return Promise.resolve(false); }
  }
};
