"""Pack reviewed image_gen drawings; no synthesized or blended animation frames.

The user approved programmatic edge cleanup and precise palette derivation.
Raw generated artwork and prompts live under artwork/motion-v1.0.4. Connected
components locate whole drawings because the generator's grid is not exact.
All work is offline: the runtime only changes a CSS background position.
Requires Pillow, NumPy and SciPy.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artwork/motion-v1.0.4'
DEST = ROOT / 'assets/whale-refined'
CELL = (192, 208)
ORDER = ['idle', 'running-right', 'running-left', 'waving', 'jumping',
         'failed', 'waiting', 'running', 'review']
# Reject two generated poses that change the waving hand. Reverse the bow's
# descent for a gradual recovery; its generated recovery jumped upright.
# The hop's last two poses stood up abruptly, so use its existing intermediate
# crouch poses for the landing recovery. These are selections, not new drawings.
SELECT = {
    'waving': [i for i in range(16) if i not in (7, 10)],
    'failed': [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 15],
    'jumping': [0, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 11, 10, 3, 2],
}
DURATIONS = {
    # Sleep on the open-eye holds. The blink itself remains brief.
    'idle': [520, 180, 180, 180, 180, 180, 65, 65, 65, 65, 180, 180, 180, 180, 180, 520],
    'waving': [150] + [115] * 12 + [180],
    'jumping': [120, 100, 90, 90, 90, 110, 100, 90, 90, 90, 100, 110, 90, 100, 110, 150],
    'failed': [200] + [130] * 6 + [240] + [130] * 6 + [180, 180],
    'waiting': [150] * 16,
    'running': [230, 160, 150, 150, 80, 80, 65, 65, 65, 80, 150, 150, 150, 150, 150, 230],
    'review': [170] * 16,
}


def drawings(action):
    rgba = np.array(Image.open(ART / (action + '.png')).convert('RGBA'))
    rgb = rgba[..., :3].astype(np.int16)
    # Saturated pure-blue specks are segmentation spill, not the painted navy
    # and cyan hair. Keep the latter's substantially higher red/green channels.
    spill = ((rgb[..., 2] > 175) & (rgb[..., 0] < 35) & (rgb[..., 1] < 70))
    rgba[..., 3][spill] = 0
    labels, _ = ndimage.label(rgba[..., 3] > 180)
    sizes = np.bincount(labels.ravel())
    components = np.argsort(sizes[1:])[-16:] + 1
    regions = []
    for component in components:
        yy, xx = np.where(labels == component)
        assert len(xx) > 20000, (action, component, len(xx))
        regions.append((component, int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())))
    regions.sort(key=lambda r: (round(r[2] / (rgba.shape[0] / 4)), r[1]))
    result = []
    for component, left, top, right, bottom in regions:
        core = labels == component
        # Preserve antialiased edge pixels touching the main silhouette; remove
        # disconnected flecks without eroding the character or blurring detail.
        retained = ndimage.binary_dilation(core, iterations=2)
        cleaned = rgba.copy()
        cleaned[..., 3][~retained] = 0
        cleaned[..., :3][cleaned[..., 3] == 0] = 0
        fy, fx = np.where(core & (np.indices(core.shape)[0] > bottom - 20))
        anchor_x = (int(fx.min()) + int(fx.max())) / 2
        bounds = (max(0, left - 2), max(0, top - 2), min(rgba.shape[1], right + 3), min(rgba.shape[0], bottom + 3))
        image = Image.fromarray(cleaned).crop(bounds)
        result.append({'image': image, 'anchor': (anchor_x - bounds[0], bottom - bounds[1]),
                       'height': bottom - top + 1, 'bottom': bottom,
                       'sourceBounds': list(bounds)})
    return result


def build():
    original = Image.open(ART / 'reference.webp').convert('RGBA')
    atlas = Image.new('RGBA', (CELL[0] * 16, CELL[1] * 9))
    manifest = json.loads((DEST / 'pet.json').read_text(encoding='utf8'))
    sprite = manifest['sprite2d']
    sprite['columns'] = 16
    sprite['cell'] = {'width': CELL[0], 'height': CELL[1]}
    counts = []
    report = {'generator': 'built-in image_gen', 'cell': CELL, 'columns': 16,
              'originalRunFrames': True, 'actions': {}}
    for row, action in enumerate(ORDER):
        if action.startswith('running-'):
            strip = original.crop((0, row * CELL[1], original.width, (row + 1) * CELL[1]))
            atlas.paste(strip, (0, row * CELL[1]))
            counts.append(8)
            continue
        frames = drawings(action)
        selected = SELECT.get(action, list(range(16)))
        # Match the original visual size. The small hop gets enough transparent
        # headroom; feet remain anchored except for its generated lift.
        target_height = 184 if action == 'jumping' else 190
        neutral_height = max(frames[i]['height'] for i in [0, 1, 14, 15])
        scale = target_height / neutral_height
        packed = []
        for column, index in enumerate(selected):
            source = frames[index]
            drawing = source['image']
            size = (round(drawing.width * scale), round(drawing.height * scale))
            drawing = drawing.resize(size, Image.Resampling.LANCZOS)
            anchor_x, anchor_y = source['anchor']
            # Correct the generator's grid drift using its foot baseline. For
            # the hop, preserve the drawn airborne lift, within the cell margin;
            # the last row is the landed recovery and shares the ground baseline.
            lift = 0
            if action == 'jumping' and 3 < index < 12:
                ground = frames[0]['bottom']
                local_bottom = source['bottom'] - round((index // 4) * 1254 / 4)
                lift = round(max(0, ground - local_bottom) * scale * .6)
            x = round(84 - anchor_x * scale)
            y = round(202 - lift - anchor_y * scale)
            frame = Image.new('RGBA', CELL)
            # No clipping is silently accepted during packing.
            assert x >= 0 and y >= 0 and x + size[0] <= CELL[0] and y + size[1] <= CELL[1], (action, index, x, y, size)
            frame.paste(drawing, (x, y))
            atlas.paste(frame, (column * CELL[0], row * CELL[1]))
            packed.append({'sourceFrame': index + 1, 'sourceBounds': source['sourceBounds'],
                           'anchor': [84, 202 - lift], 'sha256': hashlib.sha256(frame.tobytes()).hexdigest()})
        counts.append(len(selected))
        assert len(DURATIONS[action]) == len(selected)
        sprite['tracks'][action]['durations'] = DURATIONS[action]
        report['actions'][action] = {'frames': len(selected), 'durationMs': sum(DURATIONS[action]), 'packed': packed}
    sprite['frames'] = counts
    atlas.save(DEST / 'spritesheet.webp', lossless=True, quality=100, method=6)
    (DEST / 'pet.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    subprocess.run([sys.executable, str(ROOT / 'scripts/build-palettes.py')], check=True, stdout=subprocess.DEVNULL)
    # Existing runs must remain exact RGBA copies in all five color families.
    for palette in ['ds', 'gpt', 'claude', 'kimi', 'glm']:
        before = np.array(Image.open(ART / 'reference-palettes' / (palette + '.png')))
        after = np.array(Image.open(DEST / 'palettes' / (palette + '.png')))
        assert np.array_equal(before[208:624], after[208:624, :1536]), palette
    report['allPaletteRunPixelsUnchanged'] = True
    report['atlasBytes'] = (DEST / 'spritesheet.webp').stat().st_size
    (DEST / 'motion-build-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'frames': counts, 'durationMs': {k: v['durationMs'] for k, v in report['actions'].items()},
                      'atlasBytes': report['atlasBytes'], 'allPaletteRunPixelsUnchanged': True}))


if __name__ == '__main__':
    build()
