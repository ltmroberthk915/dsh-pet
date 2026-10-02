"""Pack anatomically reviewed image_gen frames using a rigid head-size baseline.

Only uniform resizing, registration, edge cleanup and precise recoloring happen
offline. No body-part warping, invented in-between frames or runtime pixel work.
Requires Pillow, NumPy and SciPy. Prompts/artwork: artwork/motion-v1.0.5.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from motion_geometry import extract_drawings, landmarks

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artwork/motion-v1.0.5'
ORIGINAL = ROOT / 'artwork/motion-v1.0.4'
DEST = ROOT / 'assets/whale-refined'
CELL = (192, 208)
ORDER = ['idle', 'running-right', 'running-left', 'waving', 'jumping',
         'failed', 'waiting', 'running', 'review']
# Reject the shortened body in clasp frames 13-16, the shortened later chin-rest
# poses and unrequested extra closed-eye waiting/chin-rest poses. Revisit the
# approved drawings on recovery; never fabricate frames with pixel blending.
SELECT = {
    'waving': [0,1,2,3,4,5,6,7,8,9,10,12,14,15],
    'running': [0,1,2,3,4,5,6,7,8,9,10,11,3,2,1,0],
    'review': [0,1,2,3,4,6,7,6,4,3,2,1,0,1,2,1],
    'waiting': [0,2,3,4,6,7,8,10,11,12,14,15,14,12,4,0],
    # Follow the gradual descent in reverse; the generated recovery jumped
    # upright and changed torso proportions after its final bowed pose.
    'failed': [0,1,2,3,4,5,6,7,6,5,4,3,2,1,0,0],
    'jumping': [0,1,3,4,5,6,7,8,9,10,4,3,2,1,0,0],
}
DURATIONS = {
    'idle': [520,180,180,180,180,180,65,65,65,65,180,180,180,180,180,520],
    'waving': [150]+[115]*12+[180],
    'jumping': [120,100,90,90,90,110,100,90,90,90,100,110,90,100,110,150],
    'failed': [200]+[130]*6+[240]+[130]*6+[180,180],
    'waiting': [150]*16,
    'running': [230,160,150,150,80,80,65,65,65,80,150,150,150,150,150,230],
    'review': [170]*16,
}
# A shallow hop translated as a whole. It does not grow/shrink with its height.
JUMP_LIFT = [0,0,0,0,0,3,8,5,1,0,0,0,0,0,0,0]


def summary(frames):
    result={}
    for key in ['headbandSpan','faceWidth','apronWidth','height','opaqueArea','footY']:
        values=np.array([f[key] for f in frames if f[key] is not None],dtype=float)
        result[key]={'min':round(float(values.min()),3),'max':round(float(values.max()),3),
                     'mean':round(float(values.mean()),3),
                     'cvPercent':round(float(values.std()/values.mean()*100),3),
                     'measurableFrames':len(values)}
    return result


def contact_sheet(frames, action):
    sheet=Image.new('RGB',(192*4,232*4),'#202329')
    draw=ImageDraw.Draw(sheet)
    for i,frame in enumerate(frames):
        x,y=i%4*192,i//4*232
        draw.text((x+8,y+5),f'{action} {i+1:02}',fill='white')
        sheet.paste(frame,(x,y+24),frame)
    sheet.save(ART / (action+'-audit-after.png'))


def build():
    original=Image.open(ORIGINAL/'reference.webp').convert('RGBA')
    baseline=landmarks(Image.open(ART/'standing-reference.png').convert('RGBA'))
    atlas=Image.new('RGBA',(CELL[0]*16,CELL[1]*9))
    manifest=json.loads((DEST/'pet.json').read_text(encoding='utf8'))
    sprite=manifest['sprite2d']; sprite['columns']=16
    sprite['cell']={'width':CELL[0],'height':CELL[1]}
    report={'generator':'built-in image_gen','artwork':'artwork/motion-v1.0.5',
            'cell':CELL,'columns':16,'originalRunFrames':True,'baseline':baseline,
            'calibration':'uniform scale by headband PCA span; foot registration; no body warping',
            'measurementLimits':'2D projection, not true volume. Bow/hop/arm overlap naturally change height and area. Anatomy is visually reviewed separately.',
            'actions':{}}
    counts=[]
    for row,action in enumerate(ORDER):
        if action.startswith('running-'):
            atlas.paste(original.crop((0,row*208,original.width,(row+1)*208)),(0,row*208))
            counts.append(8); continue
        sources=extract_drawings(ART/(action+'.png'))
        selected=SELECT.get(action,list(range(16)))
        packed=[]; images=[]
        for column,index in enumerate(selected):
            source=sources[index]; metrics=source['metrics']
            scale=baseline['headbandSpan']/metrics['headbandSpan']
            drawing=source['image'].resize((round(source['image'].width*scale),round(source['image'].height*scale)),Image.Resampling.LANCZOS)
            scaled=landmarks(drawing)
            lift=JUMP_LIFT[column] if action=='jumping' else 0
            x=round(84-scaled['footCenterX']); y=202-lift-scaled['footY']
            assert x>=0 and y>=0 and x+drawing.width<=192 and y+drawing.height<=208,(action,index,x,y,drawing.size)
            frame=Image.new('RGBA',CELL); frame.paste(drawing,(x,y))
            atlas.paste(frame,(column*192,row*208)); images.append(frame)
            measured=landmarks(frame)
            packed.append({'sourceFrame':index+1,'sourceBounds':source['bounds'],
                           'scale':round(scale,6),'anchor':[84,202-lift],
                           'sha256':hashlib.sha256(frame.tobytes()).hexdigest(),'metrics':measured})
        counts.append(len(selected)); assert len(DURATIONS[action])==len(selected)
        sprite['tracks'][action]['durations']=DURATIONS[action]
        report['actions'][action]={'frames':len(selected),'uniqueSourceFrames':len(set(selected)),
                                   'durationMs':sum(DURATIONS[action]),'packed':packed,
                                   'measurements':summary([p['metrics'] for p in packed])}
        contact_sheet(images,action)
    sprite['frames']=counts
    atlas.save(DEST/'spritesheet.webp',lossless=True,quality=100,method=6)
    (DEST/'pet.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    subprocess.run([sys.executable,str(ROOT/'scripts/build-palettes.py')],check=True,stdout=subprocess.DEVNULL)
    for palette in ['ds','gpt','claude','kimi','glm']:
        before=np.array(Image.open(ORIGINAL/'reference-palettes'/(palette+'.png')))
        after=np.array(Image.open(DEST/'palettes'/(palette+'.png')))
        assert np.array_equal(before[208:624],after[208:624,:1536]),palette
    report['allPaletteRunPixelsUnchanged']=True
    report['atlasBytes']=(DEST/'spritesheet.webp').stat().st_size
    (DEST/'motion-build-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps({a:r['measurements'] for a,r in report['actions'].items()},indent=2))


if __name__=='__main__':
    build()
