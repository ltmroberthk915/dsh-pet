"""Package reviewed ImageGen in-betweens with rigid registration only.

No optical flow, blending, duplicated timing frames, or body-part deformation.
The v1.2 keyframes and every generated source remain in artwork/motion-v1.3.0.
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import math
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from dense_geometry import complete_drawings, alpha_bounds, fit_frame
from miku_geometry import head_anchor, register_run
from motion_geometry import landmarks

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'artwork/motion-v1.3.0'
OUT = ROOT / 'output/motion-v1.3.0'
OUT.mkdir(parents=True, exist_ok=True)
BASE = {e['definition']['id']:e['definition'] for e in json.loads((ART/'baseline.json').read_text('utf-8'))}
GROUPS = json.loads((ART/'groups.json').read_text('utf-8'))
ORDER = ['idle','running-right','running-left','waving','jumping','failed','waiting','running','review']
PALETTES = ['ds','gpt','claude','kimi','glm']
spec = importlib.util.spec_from_file_location('companion_build', ROOT/'scripts/build-companion-assets.py')
palette_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(palette_module)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', 'utf-8')


def manifest(directory):
    backup = ART/(directory.name+'-manifest-before.json')
    if not backup.exists():
        backup.write_bytes((directory/'pet.json').read_bytes())
    return json.loads(backup.read_text('utf-8'))


def extracted(name, columns, rows, count=None):
    return complete_drawings(ART/(name+'.png'), columns, rows, count)


def split_durations(values):
    return [part for value in values for part in (value//2, value-value//2)]


def next_index(track, index):
    return (index+1)%len(track['frames']) if track['loop'] else min(index+1,len(track['frames'])-1)


def key(pet, track, index):
    return Image.open(ART/'keyframes'/pet/f'{track}-{index:02d}.png').convert('RGBA')


def place(image, size, scale, anchor_source, anchor_target, gutter=3):
    """Whole-drawing similarity transform, with a safe canvas margin."""
    bounds = alpha_bounds(image, 16)
    max_scale = min((size[0]-2*gutter)/(bounds[2]-bounds[0]), (size[1]-2*gutter)/(bounds[3]-bounds[1]))
    scale = min(scale, max_scale)
    resized = image.resize((max(1,round(image.width*scale)),max(1,round(image.height*scale))),Image.Resampling.LANCZOS)
    b = alpha_bounds(resized,16)
    x = round(anchor_target[0]-anchor_source[0]*scale)
    y = round(anchor_target[1]-anchor_source[1]*scale)
    x = max(gutter-b[0],min(size[0]-gutter-b[2],x))
    y = max(gutter-b[1],min(size[1]-gutter-b[3],y))
    result = Image.new('RGBA',size)
    result.paste(resized,(x,y))
    return result


def contact(name, rows, size):
    cols=8
    width,height=size
    canvas=Image.new('RGB',(cols*width,len(rows)*(height+23)), '#edf2f7')
    draw=ImageDraw.Draw(canvas)
    for row,(label,frames) in enumerate(rows):
        draw.text((5,row*(height+23)+4),label,fill='#172b43')
        for col,frame in enumerate(frames[:cols]):
            thumb=frame.copy(); thumb.thumbnail(size,Image.Resampling.LANCZOS)
            x=col*width+(width-thumb.width)//2; y=row*(height+23)+23+(height-thumb.height)//2
            canvas.paste(thumb,(x,y),thumb)
    canvas.save(OUT/(name+'-contact.png'))


def report(pet, before, tracks, durations):
    measurements={}
    for name,frames in tracks.items():
        hashes=[hashlib.sha256(f.tobytes()).hexdigest() for f in frames]
        measurements[name]={'frames':len(frames),'uniqueImages':len(set(hashes)),
                            'cycleMs':sum(durations[name]),'beforeCycleMs':sum(before[name]['durations']),
                            'bounds':[list(alpha_bounds(f)) for f in frames]}
        assert len(frames)==2*len(before[name]['frames']), (pet,name)
        assert sum(durations[name])==sum(before[name]['durations']), (pet,name,'changed rhythm')
    result={'pet':pet,'version':'1.3.0','beforeFrames':sum(len(t['frames']) for t in before.values()),
            'afterFrames':sum(len(f) for f in tracks.values()),'frameDensity':2,
            'generation':'Built-in ImageGen; original source sheets and prompts retained under artwork/motion-v1.3.0',
            'extraction':'Complete connected drawings; all solid body pixels preserved before resizing',
            'registration':'Uniform scale and translation; reviewed direction fixes use horizontal mirroring',
            'tracks':measurements}
    write_json(OUT/(pet+'-build.json'),result)
    return result


def build_business():
    pet='blue-whale-business'; directory=ROOT/'assets'/pet
    before=BASE[pet]['tracks']; m=manifest(directory)
    original=complete_drawings(ROOT/'artwork/blue-whale-business/frames-source.png',4,9)
    mid=extracted('blue-whale-mid',4,9)
    wait=extracted('blue-waiting-mid',4,1)
    swim=extracted('blue-swim',4,2)
    def packed(drawing):
        image=drawing['image']; l,t,r,b=alpha_bounds(image,16)
        # Equal silhouette area across source resolutions, with generous padding.
        scale=min(math.sqrt(5800/drawing['bodyPixels']),156/(r-l),98/(b-t))
        return place(image,(192,128),scale,((l+r)/2,(t+b)/2),(96,64),gutter=16)
    right=[packed(d) for d in swim]
    tracks={}; durations={}
    for row,name in enumerate(ORDER):
        if name=='running-right': frames=right
        elif name=='running-left': frames=[ImageOps.mirror(f) for f in right]
        else:
            frames=[]
            for i in range(4):
                frames.extend([packed(original[row*4+i]),packed(wait[i] if name=='waiting' else mid[row*4+i])])
        tracks[name]=frames
        durations[name]=split_durations(before[name]['durations'])
        m['sprite2d']['tracks'][name]['durations']=durations[name]
    atlas=Image.new('RGBA',(192*8,128*9))
    for row,name in enumerate(ORDER):
        for col,frame in enumerate(tracks[name]): atlas.paste(frame,(col*192,row*128))
    atlas.save(directory/'spritesheet.webp',lossless=True,method=4)
    for palette in PALETTES:
        palette_module.recolor(atlas,palette,'business').save(directory/'palettes'/(palette+'.png'),optimize=True)
    m.update(version='1.3.0',frameDensity=2)
    m['sprite2d'].update(columns=8,frames=[8]*9)
    m['description']='商务小蓝鲸：完整轮廓与安全留白，尾鳍上下摆动、胸鳍配合划水的八帧游泳循环，九种加密动作。'
    write_json(directory/'pet.json',m)
    result=report(pet,before,tracks,durations)
    result['rejectedGeneratedCells']=['blue-whale-mid rows 2/3: replaced by whale swimming','blue-whale-mid row 7: wrong prop, regenerated with cyan ring']
    write_json(directory/'dense-animation-report.json',result)
    contact('blue-whale',[(n,tracks[n]) for n in ORDER],(192,128))
    return tracks


def build_whale():
    pet='whale-girl-refined'; directory=ROOT/'assets/whale-refined'
    before=BASE[pet]['tracks']; m=manifest(directory); mids={}
    for group in GROUPS:
        if group['pet']!=pet or group['id']=='whale-running-left': continue
        draws=extracted(group['id']+'-mid',group['columns'],group['rows'],len(group['cells']))
        for cell,draw in zip(group['cells'],draws): mids[(cell['track'],cell['index'])]=draw['image']
    for i in range(8): mids[('running-left',i)]=ImageOps.mirror(mids[('running-right',i)])
    tracks={}; durations={}; tops={}
    for name,data in before.items():
        frames=[]
        for i in range(len(data['frames'])):
            original=key(pet,name,i); following=key(pet,name,next_index(data,i))
            drawing=mids[(name,i)]
            a,b,c=landmarks(original),landmarks(following),landmarks(drawing)
            scale=(a['headbandSpan']+b['headbandSpan'])/2/c['headbandSpan']
            if name.startswith('running-'):
                source=(c['faceCenterX'],c['cheekY'])
                dest=((a['faceCenterX']+b['faceCenterX'])/2,(a['cheekY']+b['cheekY'])/2)
            else:
                source=(c['footCenterX'],c['footY'])
                dest=((a['footCenterX']+b['footCenterX'])/2,(a['footY']+b['footY'])/2)
            dense=place(drawing,(192,208),scale,source,dest,gutter=3)
            frames.extend([original,dense])
        tracks[name]=frames
        durations[name]=split_durations(data['durations'])
        m['sprite2d']['tracks'][name]['durations']=durations[name]
        tops[name]=[alpha_bounds(f)[1] for f in frames]
    atlas=Image.new('RGBA',(192*32,208*9))
    for row,name in enumerate(ORDER):
        for col,frame in enumerate(tracks[name]): atlas.paste(frame,(col*192,row*208))
    atlas.save(directory/'spritesheet.webp',lossless=True,method=4)
    m.update(version='1.3.0',frameDensity=2)
    m['sprite2d'].update(columns=32,frames=[len(tracks[n]) for n in ORDER])
    write_json(directory/'pet.json',m)
    module='// Generated by scripts/build-dense-animation.py from packaged alpha > 128.\n'
    module+='import type { PetAnimation } from \'../state.ts\'\n\n'
    module+='export const denseWhaleTops: Record<PetAnimation, readonly number[]> = '+json.dumps(tops,indent=2)+'\n'
    (ROOT/'src/client/whale-dense-geometry.ts').write_text(module,'utf-8')
    write_json(directory/'dense-animation-report.json',report(pet,before,tracks,durations))
    contact('whale-girl',[(n,tracks[n]) for n in ORDER],(192,208))
    return tracks


def build_miku():
    pet='miku'; directory=ROOT/'assets/miku'
    before=BASE[pet]['frames2d']['tracks']; m=manifest(directory); mids={}; groups={}
    for group in GROUPS:
        if group['pet']!=pet: continue
        draws=extracted(group['id']+'-mid',group['columns'],group['rows'],len(group['cells']))
        groups[group['id']]=[d['image'] for d in draws]
        for cell,draw in zip(group['cells'],draws): mids[(cell['track'],cell['index'])]=draw['image']
    # Reviewed semantic corrections. Original work/running and fail/failed are
    # aliases of identical drawings; share their corresponding NEW drawings too.
    for name,alias in [('work','running'),('fail','failed')]:
        for i in range(len(before[name]['frames'])): mids[(name,i)]=mids[(alias,i)]
    mids[('success',4)]=groups['miku-03'][6]
    for i,d in enumerate(extracted('miku-shy-mid',3,1)): mids[('shy',i)]=d['image']
    for i in [6,7]: mids[('running-right',i)]=ImageOps.mirror(mids[('running-right',i)])
    for i in range(8): mids[('running-left',i)]=ImageOps.mirror(mids[('running-right',i)])
    for i in [1,2,3]: mids[('waving',i)]=ImageOps.mirror(mids[('waving',i)])
    tracks={}; durations={}; packed_mids={}; corrections=[]
    for name,data in before.items():
        frames=[]; files=[]
        for i,url in enumerate(data['frames']):
            original=key(pet,name,i); following=key(pet,name,next_index(data,i)); drawing=mids[(name,i)]
            a,b=alpha_bounds(original),alpha_bounds(following)
            bounds=tuple((x+y)/2 for x,y in zip(a,b))
            dense=fit_frame(drawing,(512,512),bounds)
            if name!='shop':
                try:
                    ka,kb,km=head_anchor(original),head_anchor(following),head_anchor(drawing)
                    target=((ka['x']+kb['x'])/2,(ka['y']+kb['y'])/2)
                    scale=(ka['span']+kb['span'])/2/km['span']
                    # Landmark failure on prone/tiny headset poses can produce
                    # implausible scale. Those keep the uniformly fitted bounds.
                    fit_scale=min((bounds[2]-bounds[0])/drawing.width,(bounds[3]-bounds[1])/drawing.height)
                    if .7 < scale/fit_scale < 1.4:
                        dense=place(drawing,(512,512),scale,(km['x'],km['y']),target,gutter=8)
                    else: corrections.append([name,i,'pose-bound fit (headset not comparable)'])
                except (AssertionError,ValueError): corrections.append([name,i,'pose-bound fit (headset unavailable)'])
            if name=='running-right':
                ka,kb=head_anchor(original),head_anchor(following)
                dense=register_run(drawing,span=90,anchor=(256,(ka['y']+kb['y'])/2))
            if name=='running-left': dense=ImageOps.mirror(packed_mids[('running-right',i)])
            file='mid-'+str(i+1).zfill(2)+'.webp'
            relative=Path(url.removeprefix('/pet/miku/'))
            path=directory/relative.parent/file
            dense.save(path,lossless=True,method=4)
            for palette in PALETTES[1:]:
                dest=directory/'palettes'/palette/relative.parent/file
                dest.parent.mkdir(parents=True,exist_ok=True)
                palette_module.recolor(dense,palette,'miku').save(dest,lossless=True,method=1)
            packed_mids[(name,i)]=dense
            frames.extend([original,dense]); files.extend([relative.name,file])
        tracks[name]=frames; durations[name]=split_durations(data['durations'])
        config=m['frames2d']['tracks'][name]
        config.update(frames=files,frameMs=durations[name])
    m.update(version='1.3.0',frameDensity=2)
    m['description']='MIKU 会话桌宠：保留原作者动作与玩法，25 组动作共 256 帧，左右跑与会话动作加密、长按抓取稳定。'
    write_json(directory/'pet.json',m)
    result=report(pet,before,tracks,durations)
    result['registrationFallbacks']=corrections
    result['reviewedCorrections']=['work/fail share new drawings with matching running/failed aliases','shy regenerated separately','wrong-way run and waving drawings mirrored','success final pose selected from correct celebration drawing']
    write_json(directory/'dense-animation-report.json',result)
    contact('miku',[(n,tracks[n]) for n in tracks],(192,192))
    return tracks


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--pet',choices=['business','whale','miku','all'],default='all')
    args=parser.parse_args()
    for name,fn in [('business',build_business),('whale',build_whale),('miku',build_miku)]:
        if args.pet in [name,'all']:
            result=fn(); print(name, sum(map(len,result.values())), 'frames',flush=True)
