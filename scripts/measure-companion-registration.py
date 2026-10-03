"""Measure rigid frame offsets. Reads images; never edits image pixels."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORDER = ['idle','running-right','running-left','waving','jumping','failed','waiting','running','review']
result = {}
report = {}
for directory in ['whale-refined','blue-whale-business']:
    manifest = json.loads((ROOT/'assets'/directory/'pet.json').read_text('utf-8'))
    whale = directory == 'whale-refined'
    w,h = (192,208) if whale else (192,128)
    atlas = np.array(Image.open(ROOT/'assets'/directory/'spritesheet.webp').convert('RGBA'))
    result[manifest['id']] = {}
    report[manifest['id']] = {}
    for row,name in enumerate(ORDER):
        columns = manifest['sprite2d']['tracks'][name]['frames']
        frames = [atlas[row*h:(row+1)*h,col*w:(col+1)*w] for col in columns]
        reference = frames[0].astype(float)
        # Register the solid torso/head, excluding expressive eyes, hands,
        # tail and fins. No per-frame scale or limb graft is permitted.
        yy,xx = np.indices((h,w))
        if whale:
            roi = (xx>62)&(xx<105)&(yy>117)&(yy<164)
            if name.startswith('running-'):
                roi = (xx>70)&(xx<134)&(yy>30)&(yy<79)
        else:
            roi = (xx>102)&(xx<157)&(yy>41)&(yy<85)
            if name == 'running-left': roi = (xx>35)&(xx<90)&(yy>41)&(yy<85)
        roi &= reference[:,:,3]>220
        offsets = [[0,0] for _ in range(manifest['sprite2d']['frames'][row])]
        scores=[]
        for col,frame in zip(columns,frames):
            best=(float('inf'),0,0)
            # Jump and bow retain their deliberate whole-character movement.
            shifts=[(0,0)] if name in ['jumping','failed'] else [(dx,dy) for dx in range(-6,7) for dy in range(-6,7)]
            for dx,dy in shifts:
                moved=np.roll(frame,(dy,dx),(0,1)).astype(float)
                mask=roi&(moved[:,:,3]>220)
                if mask.sum()<roi.sum()*.85: continue
                score=np.mean(np.abs(moved[:,:,:3][mask]-reference[:,:,:3][mask])) + .05*(dx*dx+dy*dy)
                if score<best[0]: best=(score,dx,dy)
            offsets[col]=[best[1],best[2]]
            scores.append(round(best[0],3))
        result[manifest['id']][name]=offsets
        report[manifest['id']][name]={'columns':columns,'offsets':[offsets[c] for c in columns],'coreError':scores}
text='// Measured by scripts/measure-companion-registration.py; translation only.\n'
text+='export const companionRegistration: Record<string, Record<string, readonly (readonly number[])[]>> = '
text+=json.dumps(result,separators=(',',':'))+'\n'
(ROOT/'src/client/companion-registration.ts').write_text(text,'utf-8')
(ROOT/'output/motion-stability/registration.json').write_text(json.dumps(report,indent=2),'utf-8')
print(json.dumps({pet:{track:value['offsets'] for track,value in data.items()} for pet,data in report.items()}))
