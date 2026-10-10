// Звук и музыка, синтезированные кодом (Web Audio), без файлов.
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
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicOn ? 0.55 : 0; this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // Сворачивание приложения: звук замолкает, при возврате продолжается.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { this.ctx.suspend(); if (this.musicEl) this.musicEl.pause(); }
        else { this.ctx.resume(); if (this.musicEl && !this.muted) this.musicEl.play().catch(() => {}); }
      });
      this.startMusic();
    }
    if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
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

  tone(f, dur, type, vol, to, delay, bus) {
    const c = this.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, cut) {
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(cut, t);
    f.frequency.exponentialRampToValueAtTime(100, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t); s.stop(t + dur + 0.03);
  },

  defs: {
    tap()    { this.tone(700, 0.04, 'square', 0.03); },
    gun()    { this.tone(560, 0.07, 'square', 0.04, 240); },
    cannon() { this.tone(170, 0.14, 'triangle', 0.12, 80); },
    frost()  { this.tone(1300, 0.12, 'sine', 0.05, 2300); },
    boom()   { this.noise(0.3, 0.22, 1000); this.tone(95, 0.25, 'sine', 0.2, 40); },
    kill()   { this.tone(320, 0.09, 'square', 0.045, 110); },
    leak()   { this.tone(220, 0.35, 'sawtooth', 0.1, 70); },
    build()  { this.tone(440, 0.08, 'triangle', 0.14); this.tone(660, 0.14, 'triangle', 0.14, null, 0.08); },
    sell()   { this.tone(520, 0.12, 'triangle', 0.12, 240); },
    evolve() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.13, null, i * 0.07)); },
    wave()   { this.tone(196, 0.22, 'sawtooth', 0.07); this.tone(294, 0.4, 'sawtooth', 0.07, null, 0.2); },
    win()    { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, null, i * 0.13)); },
    lose()   { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.09, null, i * 0.2)); }
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
    menu: ['assets/audio/music_1.mp3', 'assets/audio/music_2.mp3'],
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
      if (!this.muted && !document.hidden) el.play().catch(() => {});
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
