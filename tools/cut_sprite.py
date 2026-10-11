"""Вырезает монстра с белого фона и ставит его в игру.

Использование:
  python3 tools/cut_sprite.py <ключ> <картинка.png> [заполнение холста, по умолчанию 0.74 — для врагов]
Ключ: e_<тип врага> (e_fly, e_heal, ...) или t_<тип стража>_<стадия 1..3> (t_poison_2).
Что делает: убирает белый фон (заливкой от краёв, белое внутри рисунка остаётся), обрезает,
вписывает в квадрат нужного размера (как у остальных монстров), сохраняет
assets/images/monsters/<ключ>.png и вписывает картинку в src/sprites.js.
После этого запустите tools/export_images.py. Нужны Pillow и numpy.
"""
import sys, os, io, re, base64
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX = 368                                   # холст стража; у врага = 368 * радиус / 18
TOWER_H = {1: 0.64, 2: 0.72, 3: 0.80}       # высота стража на холсте по стадиям
FEET = 0.86                                 # где у стража «пол»

def cutout(path):
    im = Image.open(path).convert('RGB')
    # фон: всё почти белое, до чего можно дойти от краёв картинки
    g = im.convert('L').point(lambda v: 255 if v > 238 else 0)
    w, h = im.size
    pad = Image.new('L', (w + 2, h + 2), 255); pad.paste(g, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    bg = np.array(pad.crop((1, 1, w + 1, h + 1))) == 128
    alpha = Image.fromarray(np.where(bg, 0, 255).astype('uint8'))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # срезаем белую кайму
    out = im.convert('RGBA'); out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 16 else 0).getbbox())

def radius(kind):
    cfg = open(os.path.join(ROOT, 'src', 'config.js'), encoding='utf-8').read()
    return float(re.search(r"^\s*%s:\s*\{[^}]*\br: (\d+)" % kind, cfg, re.M).group(1))

def main():
    key, src = sys.argv[1], sys.argv[2]
    art = cutout(src)
    if key.startswith('e_'):
        size = round(TEX * radius(key[2:]) / 18); k = (float(sys.argv[3]) if len(sys.argv) > 3 else 0.74) * size / max(art.size)
        art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
        pos = ((size - art.width) // 2, (size - art.height) // 2)
    else:
        size = TEX; stage = int(key[-1])
        k = min(TOWER_H[stage] * size / art.height, 0.9 * size / art.width)
        art = art.resize((round(art.width * k), round(art.height * k)), Image.LANCZOS)
        pos = ((size - art.width) // 2, round(FEET * size) - art.height)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0)); canvas.paste(art, pos, art)
    canvas.save(os.path.join(ROOT, 'assets', 'images', 'monsters', key + '.png'), optimize=True)
    buf = io.BytesIO(); canvas.save(buf, 'WEBP', quality=88, method=6)
    line = f"  {key}: 'data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}',"
    p = os.path.join(ROOT, 'src', 'sprites.js'); js = open(p, encoding='utf-8').read()
    if re.search(r"^  %s: '.*$" % key, js, re.M): js = re.sub(r"^  %s: '.*$" % key, lambda m: line, js, flags=re.M)
    else: js = js.replace('const SPRITES = {\n', 'const SPRITES = {\n' + line + '\n', 1)
    open(p, 'w', encoding='utf-8').write(js)
    print(key, canvas.size, len(buf.getvalue()) // 1024, 'КБ')

main()
