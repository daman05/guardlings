"""Ставит новый номер сборки в version.json — запускать перед каждой публикацией.
После этого браузеры игроков скачают свежие файлы, а не возьмут старые из кеша."""
import json, os, time
v = time.strftime('%Y%m%d%H%M%S')
open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'version.json'), 'w').write(json.dumps({'v': v}) + '\n')
print('сборка', v)
