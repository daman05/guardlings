# Выносит картинки из кода в отдельные файлы для версии в интернете.
# Читает src/sprites.js, src/art.js, src/portraits.js (картинки внутри кода — нужны, чтобы игра
# открывалась двойным щелчком с диска), пишет файлы в assets/img/ и список src/images.js.
# Запускать после любого изменения картинок:  python3 tools/export_images.py
import re, base64, json, os
root = os.path.join(os.path.dirname(__file__), '..')
out = os.path.join(root, 'assets', 'img'); os.makedirs(out, exist_ok=True)
rd = lambda n: open(os.path.join(root, 'src', n), encoding='utf-8').read()
def save(name, uri):
    path = f'assets/img/{name}.webp'
    open(os.path.join(root, path), 'wb').write(base64.b64decode(uri.split(',', 1)[1]))
    return path
pic = re.compile(r"^\s*(\w+): '(data:[^']+)'", re.M)
tables = {}
for var, f in (('SPRITES', 'sprites.js'), ('ART', 'art.js')):
    tables[var] = {k: save(k, v) for k, v in pic.findall(rd(f))}
ports = {}
for k, body in re.findall(r"^\s*(\w+): (\{.*\}),?\s*$", rd('portraits.js'), re.M):
    m = json.loads(body); m['data'] = save('p_' + k, m['data']); ports[k] = m
js = "// Список картинок-файлов для версии в интернете. Собирается скриптом tools/export_images.py — руками не править.\n"
for var, t in tables.items(): js += f"const {var} = {json.dumps(t, indent=1)};\n"
js += f"const PORTRAITS = {json.dumps(ports, indent=1)};\n"
open(os.path.join(root, 'src', 'images.js'), 'w', encoding='utf-8').write(js)
print({k: len(v) for k, v in tables.items()}, 'portraits', len(ports))
