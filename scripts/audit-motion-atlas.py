"""Check actual decoded production pixels, not just declared frame metadata."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from motion_geometry import landmarks
from importlib.util import spec_from_file_location, module_from_spec

ROOT=Path(__file__).resolve().parents[1]
spec=spec_from_file_location('build_motion',ROOT/'scripts/build-motion-atlas.py')
build=module_from_spec(spec); spec.loader.exec_module(build)
ART=build.ART; DEST=build.DEST
manifest=json.loads((DEST/'pet.json').read_text(encoding='utf8'))['sprite2d']
report=json.loads((DEST/'motion-build-report.json').read_text(encoding='utf8'))
base=np.asarray(Image.open(DEST/'palettes/ds.png').convert('RGBA'))
assert base.shape==(1872,3072,4)
checks=[]
overview=Image.new('RGB',(192*7,232*5),'#202329')
draw=ImageDraw.Draw(overview)
actions=[a for a in build.ORDER if not a.startswith('running-')]
palettes=['ds','gpt','claude','kimi','glm']
for row,action in enumerate(build.ORDER):
    count=manifest['frames'][row]
    assert not base[row*208:(row+1)*208,count*192:,3].any(),action+' trailing cells'
    if action.startswith('running-'): continue
    measurements=[]
    for i in range(count):
        frame=base[row*208:(row+1)*208,i*192:(i+1)*192]
        assert not frame[0,:,3].any() and not frame[-1,:,3].any()
        assert not frame[:,0,3].any() and not frame[:,-1,3].any()
        m=landmarks(Image.fromarray(frame)); measurements.append(m)
        assert abs(m['headbandSpan']-report['baseline']['headbandSpan'])<=1.6,(action,i,m)
        expected=202-(build.JUMP_LIFT[i] if action=='jumping' else 0)
        assert m['footY']==expected,(action,i,m['footY'])
        assert abs(m['footCenterX']-84)<=.5,(action,i,m['footCenterX'])
    stats=build.summary(measurements)
    assert stats['headbandSpan']['cvPercent']<1.0,(action,stats)
    if action not in ['jumping','failed']:
        assert stats['opaqueArea']['cvPercent']<2.5,(action,stats)
        assert stats['apronWidth']['max']-stats['apronWidth']['min']<=3,(action,stats)
    checks.append({'action':action,'frames':count,'measurements':stats})
for p,palette in enumerate(palettes):
    image=Image.open(DEST/'palettes'/(palette+'.png')).convert('RGBA'); a=np.asarray(image)
    assert np.array_equal(a[...,3],base[...,3]),palette+' changed geometry'
    original=np.asarray(Image.open(build.ORIGINAL/'reference-palettes'/(palette+'.png')))
    assert np.array_equal(a[208:624,:1536],original[208:624]),palette+' changed runs'
    for c,action in enumerate(actions):
        row=build.ORDER.index(action)
        frame=image.crop((0,row*208,192,(row+1)*208))
        if p%2: draw.rectangle((c*192,p*232,(c+1)*192,(p+1)*232),fill='#dadbdc')
        draw.text((c*192+5,p*232+5),palette+' / '+action,fill='black' if p%2 else 'white')
        overview.paste(frame,(c*192,p*232+24),frame)
overview.save(ART/'all-actions-five-palettes.png')
result={'status':'passed','decodedAnimationSlots':sum(c['frames'] for c in checks),
        'paletteAnimationSlots':sum(c['frames'] for c in checks)*5,
        'paletteGeometryIdentical':True,'runPixelsUnchangedInAllPalettes':True,
        'stationaryFootBaseline':202,'headbandTargetPx':report['baseline']['headbandSpan'],
        'actions':checks,
        'limits':'Metrics describe projected 2D shapes. Bow/hop may change projected area and height. Skin-color face width is expression-sensitive; it is diagnostic only. No automated anatomical correctness claim.'}
(DEST/'motion-audit-report.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in result.items() if k!='actions'},indent=2))
