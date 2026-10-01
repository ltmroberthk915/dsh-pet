"""Offline palette derivation from the original atlas; no frames are moved.

Explicitly approved by the user after generated atlases failed edge/grid QA.
Requires Pillow and NumPy. Runtime loads the finished PNGs; it does no pixel work.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'assets/whale-refined/spritesheet.webp'
target = source.parent / 'palettes'
target.mkdir(exist_ok=True)
image = Image.open(source).convert('RGBA')
rgba = np.array(image)
hsv = np.array(image.convert('RGB').convert('HSV')).astype(np.float32) / 255
h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]

# The source has green chroma-key spill around the silhouettes. No character
# material is green. Remove only that hue family; preserve every other alpha.
spill = (h > 45 / 255) & (h < 135 / 255) & (s > 60 / 255) & (rgba[..., 3] > 0)
alpha = rgba[..., 3].copy()
alpha[spill] = 0
blue = (h >= 135 / 255) & (h <= 198 / 255) & (s > .14) & (alpha > 0)
strength = np.clip((v - .14) / .28, 0, 1)
strength = strength * strength * (3 - 2 * strength)
report = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'size': list(image.size), 'removedSpillPixels': int(spill.sum()),
          'changedColorPixels': int(blue.sum()), 'palettes': {}}

for palette in ['ds', 'gpt', 'claude', 'kimi', 'glm']:
    colored = hsv.copy()
    if palette == 'gpt':
        # Soft bean-paste green; keep shadows and white apron distinct.
        colored[..., 0] = 128 / 360
        colored[..., 1] = .12 + .15 * s
        colored[..., 2] = v + (1 - v) * .60 * strength
    elif palette == 'claude':
        colored[..., 0] = 22 / 360
        colored[..., 1] = np.clip(s * .9 + .13, 0, .88)
        colored[..., 2] = np.clip(v * 1.13 + .035 * strength, 0, 1)
    elif palette == 'kimi':
        colored[..., 0] = 220 / 360
        colored[..., 1] = .035 + s * .06
        colored[..., 2] = v * .58 + .02 * strength
    elif palette == 'glm':
        # Tsinghua purple reference RGB 102, 8, 116; preserve original shading.
        colored[..., 0] = 292.22 / 360
        colored[..., 1] = np.clip(s * .8 + .25, 0, .93)
        colored[..., 2] = v * .74
    result = rgba.copy()
    if palette != 'ds':
        rgb = np.array(Image.fromarray(np.rint(colored * 255).astype(np.uint8), 'HSV').convert('RGB'))
        result[..., :3][blue] = rgb[blue]
    result[..., 3] = alpha
    result[..., :3][alpha == 0] = 0
    file = target / (palette + '.png')
    Image.fromarray(result).save(file, optimize=True)
    # Skin, apron, and all pixels outside the blue selection are exact copies.
    fixed = (alpha > 0) & ~blue
    assert np.array_equal(result[..., :3][fixed], rgba[..., :3][fixed])
    assert np.array_equal(result[..., 3], alpha)
    report['palettes'][palette] = {'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                                  'bytes': file.stat().st_size, 'unalteredNonBluePixels': True,
                                  'identicalAlphaAndFrameCoordinates': True}
(target / 'build-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
print(json.dumps(report, indent=2))
