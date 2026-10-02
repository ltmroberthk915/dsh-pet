"""Preserve the shipped keyframes and make reference contact sheets for in-between art."""
import json
import math
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artwork/motion-v1.3.0'
baseline = json.loads((OUT / 'baseline.json').read_text('utf-8'))
groups = []
for entry in baseline:
    pet = entry['definition']
    pet_id = pet['id']
    if pet_id == 'blue-whale-business':
        continue  # Reference uses the complete original, not the clipped shipped atlas.
    directory = ROOT / 'assets' / ('whale-refined' if pet_id == 'whale-girl-refined' else pet_id)
    keys = OUT / 'keyframes' / pet_id
    keys.mkdir(parents=True, exist_ok=True)
    is_frames = pet['renderer'] == 'frames2d'
    tracks = pet['frames2d']['tracks'] if is_frames else pet['tracks']
    if not is_frames:
        atlas = Image.open(directory / 'spritesheet.webp').convert('RGBA')
    pending = []
    for row, (track, data) in enumerate(tracks.items()):
        images = []
        for index, frame in enumerate(data['frames']):
            if is_frames:
                image = Image.open(directory / frame.removeprefix('/pet/' + pet_id + '/')).convert('RGBA')
            else:
                w, h = pet['cell']['width'], pet['cell']['height']
                image = atlas.crop((frame*w, row*h, (frame+1)*w, (row+1)*h))
            name = f'{track}-{index:02d}.png'
            image.save(keys / name)
            images.append({'track': track, 'index': index, 'key': name})
        if is_frames:
            pending.extend(images)
        else:
            groups.append({'id': f'whale-{track}', 'pet': pet_id, 'cells': images})
    if is_frames:
        for i in range(0, len(pending), 16):
            groups.append({'id': f'miku-{i//16+1:02d}', 'pet': pet_id, 'cells': pending[i:i+16]})

for group in groups:
    cells = group['cells']
    columns, rows = 4, math.ceil(len(cells)/4)
    size = (384, 416) if group['pet'] == 'whale-girl-refined' else (384, 384)
    sheet = Image.new('RGBA', (size[0]*columns, size[1]*rows))
    for i, cell in enumerate(cells):
        image = Image.open(OUT / 'keyframes' / group['pet'] / cell['key'])
        factor = min(size[0]*.88/image.width, size[1]*.88/image.height)
        image = image.resize((round(image.width*factor), round(image.height*factor)), Image.Resampling.LANCZOS)
        sheet.paste(image, ((i%columns)*size[0]+(size[0]-image.width)//2,
                           (i//columns)*size[1]+(size[1]-image.height)//2))
    group.update({'columns': columns, 'rows': rows})
    sheet.save(OUT / (group['id'] + '-reference.png'))
(OUT / 'groups.json').write_text(json.dumps(groups, ensure_ascii=False, indent=2)+'\n', 'utf-8')
print([(group['id'], len(group['cells'])) for group in groups])
