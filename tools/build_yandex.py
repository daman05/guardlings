"""Собирает архив игры для Яндекс Игр: dist/yandex/ (папка) и dist/guardlings-yandex.zip.

Использование: python3 tools/build_yandex.py
В архив попадает только то, что нужно игре в интернете: код, картинки-файлы, музыка, иконки.
index.html для Яндекса отличается от обычного: подключает SDK площадки (/sdk.js) и сначала ждёт его,
а потом загружает игру — так язык и сохранения площадки известны с первой секунды.
"""
import os, re, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist', 'yandex')
# Порядок важен: так же, как в обычном index.html, но без встроенных картинок (sprites, art, portraits).
SCRIPTS = ['vendor/phaser.min.js', 'src/i18n.js', 'src/config.js', 'src/audio.js', 'src/ui.js', 'src/scenery.js', 'src/images.js',
           'src/anims.js', 'src/portraits_evo.js', 'src/monsters.js', 'src/meta.js', 'src/menu.js', 'src/main.js']
FIRST = ['src/platform.js', 'src/platform_yandex.js']
AUDIO = ['music_1.mp3', 'music_2.mp3', 'menu.mp3', 'battle_1.mp3']

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Guardlings</title>
<link rel="icon" type="image/png" sizes="32x32" href="assets/icon-32.png">
<style>
  html, body { margin: 0; height: 100%; background: #111; overflow: hidden;
    touch-action: none; -webkit-user-select: none; user-select: none;
    -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
</style>
<!-- Yandex Games SDK -->
<script src="/sdk.js"></script>
</head>
<body>
__FIRST__
<script>
  // Сначала площадка (язык, сохранения, реклама), потом игра — файлы подключаются по очереди.
  document.addEventListener('contextmenu', e => e.preventDefault());
  const files = __SCRIPTS__;
  const next = () => { if (!files.length) return; const s = document.createElement('script'); s.src = files.shift(); s.onload = next; document.body.appendChild(s); };
  PlatformYandex.init().catch(() => {}).then(next);
</script>
</body>
</html>
"""

def main():
    shutil.rmtree(OUT, ignore_errors=True)       # там, где удалять нельзя, файлы просто перезаписываются
    for f in FIRST + SCRIPTS:
        os.makedirs(os.path.dirname(os.path.join(OUT, f)), exist_ok=True); shutil.copy(os.path.join(ROOT, f), os.path.join(OUT, f))
    shutil.copytree(os.path.join(ROOT, 'assets', 'img'), os.path.join(OUT, 'assets', 'img'), dirs_exist_ok=True)
    os.makedirs(os.path.join(OUT, 'assets', 'audio'), exist_ok=True)
    for a in AUDIO: shutil.copy(os.path.join(ROOT, 'assets', 'audio', a), os.path.join(OUT, 'assets', 'audio', a))
    for f in os.listdir(os.path.join(ROOT, 'assets')):
        if f.startswith('icon-'): shutil.copy(os.path.join(ROOT, 'assets', f), os.path.join(OUT, 'assets', f))
    html = HTML.replace('__FIRST__', '\n'.join(f'<script src="{f}"></script>' for f in FIRST)).replace('__SCRIPTS__', repr(SCRIPTS))
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
    # проверки требований площадки
    total, bad = 0, []
    for d, _, fs in os.walk(OUT):
        for f in fs:
            p = os.path.join(d, f); total += os.path.getsize(p)
            if re.search(r'[^A-Za-z0-9._/\-]', os.path.relpath(p, OUT).replace(os.sep, '/')): bad.append(os.path.relpath(p, OUT))
    used = set(re.findall(r"assets/audio/[\w.\-]+", open(os.path.join(ROOT, 'src', 'audio.js'), encoding='utf-8').read()))
    missing = [u for u in used if not os.path.exists(os.path.join(OUT, u))]
    z = os.path.join(ROOT, 'dist', 'guardlings-yandex.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for d, _, fs in os.walk(OUT):
            for f in fs: p = os.path.join(d, f); zf.write(p, os.path.relpath(p, OUT))
    print('файлов на %.1f МБ (лимит 100), архив %.1f МБ' % (total / 1e6, os.path.getsize(z) / 1e6))
    print('плохие имена:', bad or 'нет', '| не хватает музыки:', missing or 'нет')

main()
