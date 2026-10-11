// Звуки игры синтезируются кодом (Web Audio), музыка играет из файлов assets/audio.
// Позже любой звук можно заменить файлом из assets/audio.
const Sfx = {
  ctx: null, last: {},
  // Музыка и звуки игры включаются отдельно (экран «Настройки»). Выбор сохраняется.
  musicOn: !Platform.storage.get('musicOff', Platform.storage.get('muted', false)),
  sfxOn: !Platform.storage.get('sfxOff', Platform.storage.get('muted', false)),
  get muted() { return !this.musicOn; },             // для кода музыки ниже

  // Вызывается при первом касании: браузеры не дают звук без действия игрока.
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      const echo = this.ctx.createDelay(0.5), echoGain = this.ctx.createGain(), echoCut = this.ctx.createBiquadFilter();   // лёгкое эхо: звуки не такие «сухие»
      echo.delayTime.value = 0.11; echoGain.gain.value = 0.2; echoCut.type = 'lowpass'; echoCut.frequency.value = 2400;
      this.sfxBus.connect(echo); echo.connect(echoCut); echoCut.connect(echoGain); echoGain.connect(this.master); echoGain.connect(echo);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.55 : 0; this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Сворачивание приложения: звук замолкает, при возврате продолжается.
      // То же при потере фокуса окном (другая вкладка, другое окно) и на время рекламы (Sfx.hold).
      const sync = () => this.applyHold();
      document.addEventListener('visibilitychange', sync);
      window.addEventListener('blur', () => { this.blurred = true; sync(); });
      window.addEventListener('focus', () => { this.blurred = false; sync(); });
      this.startMusic();
    }
    if (this.blurred && document.hasFocus()) this.blurred = false;
    if (document.hidden || this.blurred || this.held) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Музыка могла не запуститься с первой попытки (браузер ещё не разрешил звук) — пробуем снова.
    if (this.musicEl && this.musicEl.paused && this.musicEl.getAttribute('src') && !this.muted && !document.hidden) this.musicEl.play().catch(() => {});
  },
  // Звук молчит, пока игра свёрнута, окно без фокуса или идёт реклама.
  held: false, blurred: false,
  hold(on) { this.held = on; this.applyHold(); },
  applyHold() {
    if (!this.ctx) return;
    if (document.hidden || this.blurred || this.held) { this.ctx.suspend(); if (this.musicEl) this.musicEl.pause(); }
    else { this.ctx.resume(); if (this.musicEl && !this.muted) this.musicEl.play().catch(() => {}); }
  },
  setMusicOn(on) {
    this.musicOn = on; Platform.storage.set('musicOff', !on);
    if (this.musicBus) this.musicBus.gain.value = on ? 0.55 : 0;
    if (this.musicEl) { if (on) this.musicEl.play().catch(() => {}); else this.musicEl.pause(); }
  },
  setSfxOn(on) { this.sfxOn = on; Platform.storage.set('sfxOff', !on); },
  // Быстрый выключатель: если что-то звучит — глушит всё, иначе возвращает то, что было включено.
  toggleAll() {
    if (this.musicOn || this.sfxOn) {
      Platform.storage.set('soundBefore', { m: this.musicOn, s: this.sfxOn });
      this.setMusicOn(false); this.setSfxOn(false);
    } else {
      const p = Platform.storage.get('soundBefore', { m: true, s: true });
      this.setMusicOn(p.m || !p.s); this.setSfxOn(p.s || !p.m);
    }
  },

  // Один тон. to — куда уезжает высота к концу, delay — задержка, att — время нарастания.
  tone(f, dur, type, vol, to, delay, bus, att) {
    const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.03);
  },
  // Шум через фильтр. o: delay — задержка, type — вид фильтра (lowpass / bandpass / highpass),
  // to — куда уезжает частота фильтра, q — резкость фильтра.
  noise(dur, vol, cut, o = {}) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = o.type || 'lowpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(o.to || 100, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.03);
  },
  // Колокольчик: основной тон и тихая октава сверху.
  bell(f, dur, vol, delay) {
    this.tone(f, dur, 'triangle', vol, null, delay); this.tone(f * 2, dur * 0.6, 'sine', vol * 0.4, null, delay);
  },

  // Все звуки игры собраны из тонов и шума (файлов нет). Каждый — несколько слоёв.
  defs: {
    tap()    { this.noise(0.02, 0.05, 5000, { type: 'highpass', to: 3000 }); this.tone(880, 0.05, 'sine', 0.05, 520); },
    // Плевок: влажное «пфт» и хлопок
    gun()    { this.noise(0.09, 0.09, 2200, { type: 'bandpass', to: 500, q: 2 }); this.tone(720, 0.07, 'sine', 0.06, 230); },
    // Бросок бомбы: глухой «тум»
    cannon() { this.tone(190, 0.18, 'sine', 0.2, 55); this.noise(0.09, 0.1, 700); this.tone(95, 0.12, 'triangle', 0.08, 50); },
    // Лёд: звонкие искры и шипение
    frost()  { [1900, 2500, 3200].forEach((f, i) => this.tone(f, 0.16, 'sine', 0.035, f * 1.25, i * 0.025)); this.noise(0.14, 0.03, 7000, { type: 'highpass', to: 4000 }); },
    // Яд: чавканье и пузырёк
    poison() { this.noise(0.12, 0.08, 900, { type: 'bandpass', to: 300, q: 4 }); this.tone(230, 0.12, 'sawtooth', 0.03, 90); this.tone(420, 0.09, 'sine', 0.05, 900, 0.07); },
    // Взрыв: низкий удар, раскат и треск
    boom()   { this.tone(120, 0.4, 'sine', 0.3, 32); this.noise(0.5, 0.28, 1600, { to: 70 }); this.noise(0.12, 0.1, 5000, { type: 'highpass', to: 2000, delay: 0.03 }); },
    // Монстр побеждён: хлопок и звон монетки
    kill()   { this.tone(480, 0.1, 'sine', 0.07, 130); this.noise(0.04, 0.05, 3000, { type: 'bandpass', to: 800 }); this.bell(1568, 0.14, 0.035, 0.05); this.bell(2093, 0.2, 0.03, 0.1); },
    // Монстр прорвался в портал: тревожный гул
    leak()   { this.tone(210, 0.45, 'sawtooth', 0.09, 62); this.tone(157, 0.45, 'square', 0.05, 47); this.noise(0.3, 0.1, 500, { to: 80 }); },
    // Страж призван: удар о землю и два восходящих звона
    build()  { this.tone(150, 0.12, 'sine', 0.16, 60); this.noise(0.06, 0.06, 900); this.bell(523, 0.16, 0.1, 0.05); this.bell(784, 0.28, 0.1, 0.14); },
    // Страж отпущен: монетки сыплются
    sell()   { [1568, 1319, 1047, 1568].forEach((f, i) => this.bell(f, 0.12, 0.05, i * 0.055)); },
    // Эволюция: восходящий перезвон с искрами
    evolve() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.bell(f, 0.3, 0.09, i * 0.065)); this.noise(0.5, 0.03, 8000, { type: 'highpass', to: 5000, delay: 0.2 }); this.tone(130, 0.5, 'sine', 0.1, 260, 0, null, 0.2); },
    // Начало волны: рог и барабан
    wave()   { [[196, 0], [294, 0.22]].forEach(([f, d]) => { this.tone(f, 0.42, 'sawtooth', 0.05, null, d, null, 0.05); this.tone(f * 1.005, 0.42, 'sawtooth', 0.05, null, d, null, 0.05); this.tone(f / 2, 0.42, 'triangle', 0.08, null, d, null, 0.05); });
               this.tone(90, 0.2, 'sine', 0.2, 45); this.noise(0.12, 0.08, 400); },
    // Победа: фанфары с аккордом в конце
    win()    { [523, 659, 784, 1047].forEach((f, i) => this.bell(f, 0.3, 0.12, i * 0.13)); [1047, 1319, 1568].forEach(f => this.bell(f, 0.9, 0.09, 0.56)); this.tone(131, 0.9, 'triangle', 0.14, null, 0.56); },
    // Поражение (и появление босса): тяжёлые нисходящие ноты
    lose()   { [392, 330, 262, 196].forEach((f, i) => { this.tone(f, 0.45, 'sawtooth', 0.07, f * 0.94, i * 0.2); this.tone(f / 2, 0.45, 'triangle', 0.1, null, i * 0.2); }); this.noise(0.9, 0.06, 300, { to: 60 }); },
    // Лекарь лечит: мягкий двойной колокольчик
    heal()   { this.bell(880, 0.18, 0.03); this.bell(1320, 0.24, 0.03, 0.07); }
  },
  play(name) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < 70) return;      // не даём одному звуку слипаться
    this.last[name] = now; this.defs[name].call(this);
  },

  // Музыка: у меню и у боя свои списки треков из assets/audio. Треки списка играют по очереди
  // и по кругу, с плавным началом и концом. Чтобы добавить трек, положите файл в assets/audio
  // и впишите его в нужный список.
  playlists: {
    menu: ['assets/audio/music_1.mp3', 'assets/audio/music_2.mp3', 'assets/audio/menu.mp3'],
    battle: ['assets/audio/battle_1.mp3']
  },
  musicMode: 'menu', musicVol: 0.4,

  // Переключает музыку: 'menu' — меню и выбор карты, 'battle' — игра на карте.
  setMusic(mode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.musicNext) this.musicNext();
  },

  startMusic() {
    if (this.musicEl) return;
    let i = 0, failed = 0, leaving = false;
    const el = this.musicEl = new Audio(); el.preload = 'auto';
    const list = () => this.playlists[this.musicMode];
    const play = (shuffle) => {
      if (shuffle) i = Math.floor(Math.random() * list().length);
      leaving = false; el.volume = 0;
      const next = list()[i % list().length];
      if (el.getAttribute('src') === next) el.currentTime = 0;   // тот же трек: перематываем без повторной загрузки
      else el.src = next;
      if (!this.muted && !document.hidden && !this.blurred && !this.held) el.play().catch(() => {});
    };
    // Смена списка: текущий трек быстро затухает, затем начинается трек нового списка.
    this.musicNext = () => { if (el.paused) play(true); else leaving = true; };
    el.addEventListener('ended', () => { i++; play(); });
    el.addEventListener('playing', () => { failed = 0; });
    el.addEventListener('error', () => {                       // файл не найден или не читается
      if (++failed >= 4) { el.pause(); this.musicEl = null; this.musicNext = null; this.startSynthMusic(); } else { i++; play(); }
    });
    setInterval(() => {
      if (this.musicEl !== el || el.paused || !el.duration) return;
      if (leaving) {
        el.volume = Math.max(0, el.volume - this.musicVol / 6);
        if (el.volume <= 0.01) play(true);
        return;
      }
      const k = Math.min(1, el.currentTime / 1.5, (el.duration - el.currentTime) / 2);   // плавные края трека
      el.volume = Math.max(0, Math.min(1, this.musicVol * k));
    }, 100);
    play(true);
  },

  // Запасная музыка, если файлов нет: петля из четырёх аккордов, синтезированная кодом.
  startSynthMusic() {
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const stepDur = 0.3, order = [0, 1, 2, 1, 0, 2, 1, 2];
    let step = 0, next = this.ctx.currentTime + 0.1;
    setInterval(() => {
      if (this.ctx.state !== 'running') return;
      if (next < this.ctx.currentTime) next = this.ctx.currentTime + 0.05;
      while (next < this.ctx.currentTime + 0.4) {
        const ch = chords[Math.floor(step / 8) % 4], i = step % 8, d = next - this.ctx.currentTime;
        this.tone(hz(ch[order[i]] + 12), 0.28, 'triangle', 0.05, null, d, this.musicBus);
        if (i === 0 || i === 4) this.tone(hz(ch[0] - 12), 0.55, 'sine', 0.11, null, d, this.musicBus);
        step++; next += stepDur;
      }
    }, 100);
  }
};

// Телефонные браузеры разрешают звук только по завершённому касанию (отпускание пальца), а игра ловит
// начало касания — поэтому музыка могла молчать до похода в настройки. Слушаем касания напрямую.
['pointerup', 'touchend', 'click', 'keydown'].forEach(e => window.addEventListener(e, () => Sfx.unlock(), true));
