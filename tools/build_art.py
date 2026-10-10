"""Собирает киношные картинки (портреты эволюции, заставку меню, иконку) в src/art.js и готовит файлы иконок.

Использование: python3 tools/build_art.py
Исходники берутся из assets/images/raw/evo, raw/menu, raw/icon (см. словарь EVO ниже).
Нужен Pillow.
"""
import os, io, base64, json
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'images', 'raw')
B = 'The-second-reference-image-shows-a-baby'
EVO = {'gun_2': B + '.png', 'gun_3': B + '2.png', 'cannon_2': B + '22.png', 'cannon_3': B + '222.png',
       'frost_2': B + '33.png', 'frost_3': B + '333.png'}
PW, PH = 480, 404                         # портрет: те же пропорции, что у рамки в витрине

def uri(im, q=82):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

def main():
    art, total = {}, 0
    os.makedirs(os.path.join(ROOT, 'assets', 'images', 'portraits'), exist_ok=True)
    for key, name in EVO.items():
        im = Image.open(os.path.join(RAW, 'evo', name)).convert('RGB'); w, h = im.size
        ch = round(w * PH / PW); top = round((h - ch) * 0.45)
        im = im.crop((0, top, w, top + ch)).resize((PW, PH), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'assets', 'images', 'portraits', f'evo_{key}.webp'), 'WEBP', quality=82)
        art['evo_' + key], n = uri(im); total += n
    menu = [f for f in os.listdir(os.path.join(RAW, 'menu')) if f.lower().endswith('.png')][0]
    im = Image.open(os.path.join(RAW, 'menu', menu)).convert('RGB')
    w, h = im.size; cw = round(h * 9 / 16); left = max(0, (w - cw) // 2)
    im = im.crop((left, 0, left + min(cw, w), h)).resize((1080, 1920), Image.LANCZOS)
    im.save(os.path.join(ROOT, 'assets', 'images', 'menu_bg.webp'), 'WEBP', quality=84)
    art['menu_bg'], n = uri(im, 84); total += n
    icon = [f for f in os.listdir(os.path.join(RAW, 'icon')) if f.lower().endswith('.png')][0]
    ic = Image.open(os.path.join(RAW, 'icon', icon)).convert('RGB')
    for size in (512, 192, 180, 32):
        ic.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, 'assets', f'icon-{size}.png'), optimize=True)
    js = ("// Киношные картинки, встроенные в код (собирается скриптом tools/build_art.py).\n"
          "// evo_<тип>_<стадия> — портреты для экрана эволюции, menu_bg — заставка главного меню.\n"
          "const ART = {\n" + ",\n".join(f"  {k}: '{v}'" for k, v in art.items()) + "\n};\n")
    open(os.path.join(ROOT, 'src', 'art.js'), 'w', encoding='utf-8').write(js)
    print('art.js', len(js) // 1024, 'КБ; картинок', len(art))

main()
