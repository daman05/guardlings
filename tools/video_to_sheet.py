"""Превращает видео с анимацией монстра (на белом фоне) в лист кадров для игры.

Использование:
  python3 tools/video_to_sheet.py <ключ> <видео.mp4> <покой: от-до> <атака: кадры через запятую> <номер кадра выстрела>
Пример (номера кадров считаются при 12 кадрах в секунду):
  python3 tools/video_to_sheet.py t_gun_3 raw/plevun.mp4 0-26 30,33,36,39,42,44,45,46,47,48,49,51,53,55 9

Что делает: режет видео на кадры, вырезает фон, убирает всё, кроме самого монстра
(например, нарисованный в видео плевок), ставит все кадры в один масштаб и собирает лист.
Результат: assets/images/anim/<ключ>.png и запись в src/anims.js.
Нужны ffmpeg и Pillow. Обычный спрайт assets/images/monsters/<ключ>.png используется
как образец размера.
"""
import sys, os, io, re, json, base64, subprocess, tempfile, glob
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S, FPS, MAG = 288, 12, (255, 0, 255)      # размер кадра в листе, частота нарезки
REST_H, REST_W, FEET = 0.62, 0.66, 0.88   # предельные высота и ширина монстра в покое, линия ног (доли кадра)

def matte(im):
    w, h = im.size; fl = im.copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if fl.getpixel((x, y)) != MAG: ImageDraw.floodfill(fl, (x, y), MAG, thresh=40)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if fl.getpixel((x, y)) != MAG: ImageDraw.floodfill(fl, (x, y), MAG, thresh=40)
    r, g, b = fl.split()
    bg = ImageChops.multiply(ImageChops.multiply(r.point(lambda v: 255 if v == 255 else 0),
         g.point(lambda v: 255 if v == 0 else 0)), b.point(lambda v: 255 if v == 255 else 0))
    return ImageChops.invert(bg)

def main():
    key, video, idle_s, attack_s, fire = sys.argv[1:6]
    a, b = map(int, idle_s.split('-')); idle = list(range(a, b + 1))
    attack = [int(x) for x in attack_s.split(',')]
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={FPS}', os.path.join(tmp, 'f_%03d.png')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, 'f_*.png')))
    first = Image.open(files[idle[0]]).convert('RGB')
    bb = matte(first).point(lambda v: 255 if v > 128 else 0).getbbox()
    sc = min(REST_H * S / (bb[3] - bb[1]), REST_W * S / (bb[2] - bb[0]))
    rest_h, rest_w = (bb[3] - bb[1]) * sc, (bb[2] - bb[0]) * sc
    cx, feet = (bb[0] + bb[2]) / 2, bb[3]
    seed = (round(cx), round((bb[1] + bb[3]) / 2 + (bb[3] - bb[1]) * 0.15))   # точка внутри тела
    frames = []
    for i in idle + attack:
        im = Image.open(files[i]).convert('RGB')
        m = matte(im).point(lambda v: 255 if v > 128 else 0)
        keep = m.copy()
        if keep.getpixel(seed) == 255:                       # оставляем только сам монстр
            ImageDraw.floodfill(keep, seed, 128); keep = keep.point(lambda v: 255 if v == 128 else 0)
        alpha = keep.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.0))
        rgba = im.convert('RGBA'); rgba.putalpha(alpha)
        # одно и то же преобразование для всех кадров: движение сохраняется как в видео
        w = round(im.width * sc); small = rgba.resize((w, round(im.height * sc)), Image.LANCZOS)
        ox, oy = round(S / 2 - cx * sc), round(FEET * S - feet * sc)
        canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        src = small.crop((max(0, -ox), max(0, -oy), min(small.width, S - ox), min(small.height, S - oy)))
        canvas.alpha_composite(src, (max(0, ox), max(0, oy)))
        frames.append(canvas)
    cols = 8; rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * S, rows * S), (0, 0, 0, 0))
    for i, f in enumerate(frames): sheet.paste(f, ((i % cols) * S, (i // cols) * S))
    os.makedirs(os.path.join(ROOT, 'assets', 'images', 'anim'), exist_ok=True)
    sheet.save(os.path.join(ROOT, 'assets', 'images', 'anim', key + '.png'), optimize=True)
    buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=88, method=6)
    # масштаб относительно обычного спрайта: монстр в покое должен быть того же роста
    st = Image.open(os.path.join(ROOT, 'assets', 'images', 'monsters', key + '.png'))
    sb = st.split()[3].point(lambda v: 255 if v > 20 else 0).getbbox()
    meta = {'frame': S, 'idle': [0, len(idle) - 1], 'attack': [len(idle), len(frames) - 1], 'fire': int(fire),
            'idleFps': FPS, 'attackFps': 30, 'feet': FEET,
            'scale': round((sb[3] - sb[1]) / rest_h, 4), 'restH': round(rest_h), 'restW': round(rest_w),
            'field': False,   # True — использовать анимацию и на поле, а не только в витрине
            'data': 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()}
    p = os.path.join(ROOT, 'src', 'anims.js')
    head = "// Покадровая анимация монстров (листы кадров, нарезанные из видео скриптом tools/video_to_sheet.py).\n// Если для монстра здесь нет записи, он показывается обычной картинкой.\nconst ANIMS = {\n"
    js = open(p, encoding='utf-8').read() if os.path.exists(p) else head + "};\n"
    line = f"  {key}: {json.dumps(meta)}"
    if re.search(rf"^  {key}: ", js, re.M): js = re.sub(rf"^  {key}: .*$", line + ',', js, flags=re.M)
    else: js = js.replace('const ANIMS = {\n', 'const ANIMS = {\n' + line + ',\n', 1)
    open(p, 'w', encoding='utf-8').write(js)
    print(key, len(frames), 'кадров', sheet.size, len(buf.getvalue()) // 1024, 'КБ', 'scale', meta['scale'])

main()
