"""Decode final production files and audit transparency, palettes and geometry."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image
from miku_geometry import head_anchor

ROOT = Path(__file__).resolve().parents[1]
target = ROOT/'assets/miku'
added = ['running-right','running-left','waving','jumping','waiting','review']
palettes = ['gpt','claude','kimi','glm']
checks = []
failures = []
for path in sorted((target/'thumb').rglob('*.webp')):
    base = np.array(Image.open(path).convert('RGBA'))
    assert base.shape == (512,512,4), str(path)
    assert (base[...,3] > 128).sum() > 5000, str(path)
    for palette in palettes:
        other = np.array(Image.open(target/'palettes'/palette/path.relative_to(target)).convert('RGBA'))
        assert other.shape == base.shape and np.array_equal(other[...,3],base[...,3]), str(path)+':'+palette
    if path.parent.name in added:
        alpha = base[...,3]
        edge = np.concatenate([alpha[:4,:].ravel(),alpha[-4:,:].ravel(),alpha[:,:4].ravel(),alpha[:,-4:].ravel()])
        touches = int((edge > 32).sum())
        check = {'track':path.parent.name,'frame':path.name,'edgePixels':touches}
        if touches: failures.append(check)
        checks.append(check)

measurements = []
for i in range(8):
    right = np.array(Image.open(target/'thumb/running-right'/f'frame-{i+1}.webp').convert('RGBA'))
    left = np.array(Image.open(target/'thumb/running-left'/f'frame-{i+1}.webp').convert('RGBA'))
    # Transparent WebP RGB is unspecified; compare visible pixels and alpha.
    mirror = right[:,::-1]
    assert np.array_equal(left[...,3],mirror[...,3])
    visible = left[...,3] > 0
    assert np.array_equal(left[visible],mirror[visible]), str(i)
    measurements.append(head_anchor(Image.fromarray(right)))
span = np.array([m['span'] for m in measurements])
centers = np.array([[m['x'],m['y']] for m in measurements])
assert span.std()/span.mean() < .01, span.tolist()
assert np.ptp(centers[:,0]) < 1.2 and np.ptp(centers[:,1]) < 5, centers.tolist()
source = json.loads((ROOT/'artwork/miku-v0.4.4/source-report.json').read_text(encoding='utf-8'))
for entry in source['files']:
    blob = (ROOT/entry['target']).read_bytes()
    assert hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest() == entry['sha'], entry['source']
report = {'status':'passed' if not failures else 'failed','originalGitBlobsVerified':len(source['files']),
          'runtimeFrames':len(list((target/'thumb').rglob('*.webp'))),'palettesCompared':palettes,
          'newFrames':checks,'edgeFailures':failures,'leftRunIsMirror':True,
          'runHeadsetSpan':{'target':90,'min':float(span.min()),'max':float(span.max()),'cvPercent':float(span.std()/span.mean()*100)},
          'runHeadsetCenter':{'xRange':float(np.ptp(centers[:,0])),'yRange':float(np.ptp(centers[:,1]))},
          'runMeasurements':measurements,'limits':'2D registration metrics; anatomy and smooth playback are inspected visually.'}
(target/'audit-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert not failures, failures

business = ROOT/'assets/blue-whale-business'
atlas = np.array(Image.open(business/'spritesheet.webp').convert('RGBA'))
assert atlas.shape == (1152,768,4)
for palette in ['ds']+palettes:
    sibling = np.array(Image.open(business/'palettes'/f'{palette}.png').convert('RGBA'))
    assert np.array_equal(sibling[...,3],atlas[...,3]), palette
for row in range(9):
    for col in range(4):
        alpha = atlas[row*128:(row+1)*128,col*192:(col+1)*192,3]
        assert (alpha > 128).sum() > 1200
        edge = np.concatenate([alpha[0,:],alpha[-1,:],alpha[:,0],alpha[:,-1]])
        assert not (edge > 32).any(), (row,col)
result = {'status':'passed','mikuRuntimeFrames':report['runtimeFrames'],'mikuNewFrames':len(checks),
          'mikuPaletteFrames':report['runtimeFrames']*4,'businessFrames':36,'businessPalettes':5,
          'upstreamGitBlobs':len(source['files']),'edgeFailures':0,'headsetSpanCvPercent':report['runHeadsetSpan']['cvPercent']}
(ROOT/'output/companion-verification/asset-results.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
