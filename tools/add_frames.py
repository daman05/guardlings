"""Добавляет кадры анимации стража в игру.

Использование:
  python3 tools/add_frames.py <ключ> <базовая картинка> <суффикс>=<картинка кадра> ...
Пример:
  python3 tools/add_frames.py t_gun_3 raw/base.png b=raw/blink.png w=raw/windup.png a=raw/attack.png

Суффиксы: b — моргание, w — замах, a — атака.
Кадр вырезается с белого/серого фона и ставится в тот же масштаб и то же место,
что и базовый спрайт, чтобы монстр не прыгал при смене кадров.
Результат: assets/images/monsters/<ключ>_<суффикс>.png и запись в src/sprites.js.
"""
import sys, io, base64, re, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEX, MAG = 4, (255, 0, 255)

def cut(path):
    im = Image.open(path).convert('RGB'); w, h = im.size; fl = im.copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if fl.getpixel((x, y)) != MAG: ImageDraw.floodfill(fl, (x, y), MAG, thresh=40)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if fl.getpixel((x, y)) != MAG: ImageDraw.floodfill(fl, (x, y), MAG, thresh=40)
    r, g, b = fl.split()
    bg = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0),
         g.point(lambda v: 255 if v == 0 else 0)), b.point(lambda v: 255 if v == 255 else 0))
    alpha = ImageChops.invert(bg).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    rgba = im.convert('RGBA'); rgba.putalpha(alpha)
    return rgba, alpha.point(lambda v: 255 if v > 20 else 0).getbbox()

def main():
    key, base = sys.argv[1], sys.argv[2]
    lvl = int(key[-1]); k = {1: 0.80, 2: 0.90, 3: 1.0}[lvl]; S = 92 * TEX
    _, bb = cut(base)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    sc = min(0.84 * S * k / bw, 0.80 * S * k / bh)
    bx, by = (S - round(bw * sc)) // 2, round(0.86 * S) - round(bh * sc)
    p = os.path.join(ROOT, 'src', 'sprites.js'); js = open(p, encoding='utf-8').read()
    for arg in sys.argv[3:]:
        suf, path = arg.split('=', 1); name = f'{key}_{suf}'
        rgba, fb = cut(path); c = rgba.crop(fb)
        c = c.resize((round(c.width * sc), round(c.height * sc)), Image.LANCZOS)
        out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        # низ кадра ставим на ту же линию, что у базового спрайта; по горизонтали — как в исходнике
        out.alpha_composite(c, (max(0, bx + round((fb[0] - bb[0]) * sc)), max(0, round(0.86 * S) - c.height)))
        out.save(os.path.join(ROOT, 'assets', 'images', 'monsters', name + '.png'), optimize=True)
        buf = io.BytesIO(); out.save(buf, 'WEBP', quality=90, method=6)
        line = f"  {name}: 'data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}'"
        if re.search(rf"^  {name}: '", js, re.M): js = re.sub(rf"^  {name}: '[^']*'", line, js, flags=re.M)
        else: js = js.replace('const SPRITES = {\n', 'const SPRITES = {\n' + line + ',\n', 1)
        print('ok', name)
    open(p, 'w', encoding='utf-8').write(js)

main()
