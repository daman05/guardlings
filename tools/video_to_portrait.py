"""Превращает киношный ролик со стражем в живой портрет для витрины.

Использование:
  python3 tools/video_to_portrait.py <тип стража: gun | cannon | frost | poison, либо тип_стадия для экрана эволюции: gun_2, gun_3 ...> <видео.mp4> [кадров на плавный стык, по умолчанию 0]

Что делает: режет видео на кадры (10 в секунду), обрезает под рамку портрета, находит в конце
ролика кадр, самый похожий на первый (чтобы петля замыкалась без рывка), собирает лист кадров.
Фон не вырезается: портрет показывается в рамке целиком.
Результат: assets/images/portraits/<тип>.webp и запись в src/portraits.js. Нужны ffmpeg и Pillow.
"""
import sys, os, io, re, json, base64, subprocess, tempfile, glob
from PIL import Image, ImageChops, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW, FH, FPS, COLS = 330, 278, 10, 8       # размер кадра (рамка 206x174 с запасом по чёткости), частота, колонок в листе

def main():
    kind, video = sys.argv[1], sys.argv[2]
    XF = int(sys.argv[3]) if len(sys.argv) > 3 else 0     # кадров на плавный стык; 0 — ролик как есть
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={FPS}', os.path.join(tmp, 'f_%03d.png')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, 'f_*.png')))
    frames = []
    for f in files:
        im = Image.open(f).convert('RGB'); w, h = im.size
        ch = round(w * FH / FW); top = max(0, min(h - ch, round((h - ch) * 0.45)))   # обрезка под пропорции рамки
        frames.append(im.crop((0, top, w, top + ch)).resize((FW, FH), Image.LANCZOS))
    # конец петли: кадр из последней трети, самый похожий на первый
    small = [f.resize((64, 54)) for f in frames]
    diff = lambda i: sum(ImageStat.Stat(ImageChops.difference(small[0], small[i])).mean)
    start = len(frames) * 2 // 3
    end = min(range(start, len(frames)), key=diff)
    frames = frames[:end]
    # бесшовная петля: последние XF кадров плавно перетекают в начало ролика
    if XF and len(frames) > XF * 4:
        n = len(frames) - XF
        frames = [Image.blend(frames[n + k], frames[k], (k + 1) / (XF + 1)) for k in range(XF)] + frames[XF:n]
    rows = (len(frames) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * FW, rows * FH))
    for i, f in enumerate(frames): sheet.paste(f, ((i % COLS) * FW, (i // COLS) * FH))
    os.makedirs(os.path.join(ROOT, 'assets', 'images', 'portraits'), exist_ok=True)
    buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=80, method=6)
    open(os.path.join(ROOT, 'assets', 'images', 'portraits', kind + '.webp'), 'wb').write(buf.getvalue())
    meta = {'fw': FW, 'fh': FH, 'frames': len(frames), 'fps': FPS}
    if '_' in kind:
        # Портрет стадии 2 или 3 (экран эволюции): только файл, в код не встраивается — грузится по требованию.
        os.makedirs(os.path.join(ROOT, 'assets', 'img'), exist_ok=True)
        open(os.path.join(ROOT, 'assets', 'img', f'p_{kind}.webp'), 'wb').write(buf.getvalue())
        meta['data'] = f'assets/img/p_{kind}.webp'; name, var = 'portraits_evo.js', 'PORTRAITS_EVO'
    else:
        meta['data'] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(); name, var = 'portraits.js', 'PORTRAITS'
    p = os.path.join(ROOT, 'src', name); js = open(p, encoding='utf-8').read()
    line = f"  {kind}: {json.dumps(meta)},"
    if re.search(rf"^  {kind}: ", js, re.M): js = re.sub(rf"^  {kind}: .*$", lambda m: line, js, flags=re.M)
    else: js = js.replace('const %s = {\n' % var, 'const %s = {\n' % var + line + '\n', 1)
    open(p, 'w', encoding='utf-8').write(js)
    print(kind, len(frames), 'кадров из', len(files), '| лист', sheet.size, len(buf.getvalue()) // 1024, 'КБ')

main()
