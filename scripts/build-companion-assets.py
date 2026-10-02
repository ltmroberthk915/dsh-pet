"""Pack ImageGen sheets and upstream Miku frames for the shared desktop renderer.

This build only slices/resizes supplied drawings and derives deterministic model
palettes. It never draws replacement poses. Original source pixels stay in artwork/.
"""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageOps
from miku_geometry import register_run, sheet_drawings, pack_standing, owned_sheet_cells

ROOT = Path(__file__).resolve().parents[1]
ORDER = ['idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review']
PALETTES = ['ds', 'gpt', 'claude', 'kimi', 'glm']


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def rgba(path):
    image = Image.open(path).convert('RGBA')
    alpha = np.asarray(image)[..., 3]
    if (alpha == 0).mean() < .12:
        raise ValueError(f'Image must have a real transparent background: {path}')
    return image


def cell(sheet, col, row, columns, rows):
    w, h = sheet.size
    return sheet.crop((round(col*w/columns), round(row*h/rows), round((col+1)*w/columns), round((row+1)*h/rows)))


def normalize(image, size):
    result = image.resize(size, Image.Resampling.LANCZOS)
    pixels = np.array(result)
    pixels[pixels[..., 3] == 0, :3] = 0
    return Image.fromarray(pixels)


def recolor(image, palette, family):
    if palette == 'ds':
        return image.copy()
    pixels = np.array(image)
    hsv = np.array(image.convert('RGB').convert('HSV')).astype(np.float32) / 255
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    low, high = (.34, .59) if family == 'miku' else (.54, .72)
    mask = (h >= low) & (h <= high) & (s > .16) & (pixels[..., 3] > 0)
    colored = hsv.copy()
    strength = np.clip((v - .12) / .35, 0, 1)
    if palette == 'gpt':
        colored[..., 0] = 128/360
        colored[..., 1] = .13 + .16*s
        colored[..., 2] = v + (1-v)*.35*strength
    elif palette == 'claude':
        colored[..., 0] = 22/360
        colored[..., 1] = np.clip(.12 + .85*s, 0, .9)
        colored[..., 2] = np.clip(v*1.06, 0, 1)
    elif palette == 'kimi':
        colored[..., 0] = 220/360
        colored[..., 1] = .04 + .06*s
        colored[..., 2] = v*.55 + .02*strength
    elif palette == 'glm':
        colored[..., 0] = 292.22/360
        colored[..., 1] = np.clip(.2 + .8*s, 0, .94)
        colored[..., 2] = v*.76
    rgb = np.array(Image.fromarray(np.rint(colored*255).astype(np.uint8), 'HSV').convert('RGB'))
    result = pixels.copy()
    result[..., :3][mask] = rgb[mask]
    assert np.array_equal(result[..., 3], pixels[..., 3])
    assert np.array_equal(result[..., :3][~mask], pixels[..., :3][~mask])
    return Image.fromarray(result)


def build_miku(runs_only=False, new_only=False):
    art = ROOT / 'artwork/miku-v0.4.4'
    target = ROOT / 'assets/miku'
    manifest = json.loads((art/'original-pet.json').read_text(encoding='utf-8'))
    # Runtime originals use the same square canvas at half resolution. Source
    # PNG/WebP files are retained byte-for-byte and Git-hash checked separately.
    for source in ([] if runs_only or new_only else sorted((art/'original').rglob('*.webp'))):
        dest = target / source.relative_to(art/'original')
        dest.parent.mkdir(parents=True, exist_ok=True)
        image = Image.open(source).convert('RGBA')
        normalize(image, (512, 512)).save(dest, lossless=True)
    run_a = rgba(art/'run-a-clean-source.png')
    run_b = rgba(art/'run-b-source.png')
    wave = rgba(art/'wave-source.png')
    action = rgba(art/'action-source.png')
    poses_a = sheet_drawings(run_a,4,2)
    poses_b = sheet_drawings(run_b,2,2)
    waves = sheet_drawings(wave,4,3)
    actions = sheet_drawings(action,4,3)
    standing_scale = 512/(action.width/4)*.85
    # These drawings visibly exchange the near/far arms. Earlier generated
    # sheets kept the near arm behind the waist throughout and were rejected.
    # Exclude the straight, outstretched fist in a0: it reads as a sudden punch.
    # Register whole drawings to the rigid headset; don't warp body parts.
    selected = [poses_a[2], poses_a[1], poses_b[0], poses_b[1], poses_b[2], poses_b[3], poses_a[5], poses_a[6]]
    right = [register_run(frame,bob=[0,-2,-3,-2,0,-2,-3,-2][i]) for i,frame in enumerate(selected)]
    new = {
        'running-right': right,
        'running-left': [ImageOps.mirror(frame) for frame in right],
        'waving': [pack_standing(frame,standing_scale) for frame in waves[8:12]],
        'jumping': [pack_standing(frame,standing_scale,lift=[0,24,30,0][i]) for i,frame in enumerate(actions[:4])],
        'waiting': [pack_standing(frame,standing_scale) for frame in actions[4:8]],
        'review': [pack_standing(frame,standing_scale) for frame in actions[8:12]],
    }
    tracks = manifest['frames2d']['tracks']
    for name, frames in new.items():
        folder = target/'thumb'/name
        folder.mkdir(parents=True, exist_ok=True)
        names = []
        for index, frame in enumerate(frames):
            file = f'frame-{index+1}.webp'
            if not runs_only or name.startswith('running-'):
                normalize(frame, (512,512)).save(folder/file, lossless=True, method=1)
            names.append(file)
        ms = 125 if name.startswith('running-') else 220 if name == 'jumping' else 350
        tracks[name] = {'frames': names, 'frameMs': [ms]*len(names), 'loop': name not in ['waving','jumping']}
        if not tracks[name]['loop']:
            tracks[name]['fallback'] = 'idle'
    for name, original in [('running','work'), ('failed','fail')]:
        folder = target/'thumb'/name
        folder.mkdir(parents=True, exist_ok=True)
        source = sorted((target/'thumb'/original).glob('*.webp'))
        names = []
        for i, file in enumerate(source):
            name_out = f'frame-{i+1}.webp'
            if not runs_only and not new_only:
                (folder/name_out).write_bytes(file.read_bytes())
            names.append(name_out)
        tracks[name] = {'frames': names, 'frameMs': [200]*len(names), 'loop': name == 'running'}
        if name == 'failed':
            tracks[name]['fallback'] = 'idle'
    tracks['idle']['frames'] = [file.name for file in sorted((target/'thumb/idle').glob('*.webp'))]
    tracks['idle']['frameMs'] = [1500,280,120,480]
    manifest['displayName'] = 'MIKU（会话版）'
    manifest['version'] = '1.1.0'
    manifest['description'] = '原作者 v0.4.4 Miku 素材与玩法，补齐九种会话动作、左右跑、多会话配色与 tok/s 调速。'
    manifest['frames2d']['phases'] = {'idle':'idle','waiting':'waiting','thinking':'running-right','tool':'running','review':'review','done':'jumping','failed':'failed'}
    # The upstream narrow hit box preceded this square frame contribution.
    manifest['gameplay']['hitBox'] = {'x0': .05, 'y0': .07, 'x1': .95, 'y1': .95}
    save_json(target/'pet.json', manifest)
    voice = json.loads((ROOT/'assets/whale-refined/voice.json').read_text(encoding='utf-8'))
    voice['remarks'] = {
        'pet': ['摸摸收到啦，继续陪你', '今天也一起加油', 'MIKU 在这里'],
        'petCooldown': ['刚刚摸过啦', '先陪你把这一步做完', '待会儿再摸摸'],
        'feed': ['零食收到啦，谢谢你', '补充能量，继续加油', '吃饱啦'],
        'feedCooldown': ['刚吃过，先消化一下', '等会儿再吃', '能量还够哦'],
        'noTreats': ['零食暂时用完啦', '下一轮再攒一点吧', '现在没有零食了'],
    }
    voice['panel'] = {'labels': {'feed': '喂零食'}, 'stats': {'treats': '零食 ×{n}'}}
    save_json(target/'voice.json', voice)
    frames = sorted((target/'thumb').rglob('*.webp'))
    for palette in PALETTES[1:]:
        changed = (f for f in frames if (not runs_only and not new_only)
                   or (runs_only and f.parent.name.startswith('running-'))
                   or (new_only and f.parent.name in new))
        for frame in changed:
            dest = target/'palettes'/palette/frame.relative_to(target)
            dest.parent.mkdir(parents=True, exist_ok=True)
            recolor(Image.open(frame).convert('RGBA'), palette, 'miku').save(dest, lossless=True, method=1)
    save_json(target/'build-report.json', {'version':'1.1.0','runtimeFrameSize':[512,512], 'tracks':list(tracks),
        'newFrames':sum(map(len,new.values())), 'runtimeFrames':len(frames), 'palettes':PALETTES,
        'source':'artwork/miku-v0.4.4/source-report.json', 'originalGameplayRetained':True,
        'runSources':['run-a-clean-source.png','run-b-source.png'], 'runPoseSelection':['a2','a1','b0','b1','b2','b3','a5','a6'],
        'armsExchangeForeground':True, 'straightPunchPoseExcluded':True,
        'registration':{'landmark':'red headset strip PCA span','targetSpanPx':90,'anchor':[256,86], 'wholeDrawingOnly':True},
        'extraction':'complete sprite components; transparent gutters; no neighbouring-cell pixels'})
    preview = [Image.open(target/'thumb/running-right'/f'frame-{i+1}.webp').convert('RGBA') for i in range(8)]
    preview[0].save(art/'running-preview.webp',save_all=True,append_images=preview[1:],duration=125,loop=0,lossless=True)
    contact = Image.new('RGBA',(4*512,2*512),(245,247,250,255))
    for i, frame in enumerate(preview):
        contact.alpha_composite(frame,((i%4)*512,(i//4)*512))
    contact.convert('RGB').save(art/'running-contact.png')


def build_business():
    art = ROOT/'artwork/blue-whale-business'
    target = ROOT/'assets/blue-whale-business'
    target.mkdir(parents=True, exist_ok=True)
    source = rgba(art/'frames-source.png')
    owned = owned_sheet_cells(source,4,9)
    size = (192,128)
    atlas = Image.new('RGBA',(4*size[0],9*size[1]))
    audit = []
    for row, name in enumerate(ORDER):
        for col in range(4):
            # Reserve real transparent gutters around the source cell,
            # including the subtle motion-trail glow at the left edge.
            drawing = normalize(owned[row*4+col],(172,114))
            frame = Image.new('RGBA',size)
            frame.paste(drawing,(10,7))
            alpha = np.asarray(frame)[...,3]
            assert (alpha > 32).sum() > 1200, f'Empty whale frame: {name}:{col}'
            # Every frame has breathing room on all four edges.
            edge = np.concatenate([alpha[0,:],alpha[-1,:],alpha[:,0],alpha[:,-1]])
            audit.append({'track':name,'frame':col,'bounds':frame.getbbox(),'edgePixels':int((edge>32).sum())})
            atlas.alpha_composite(frame,(col*size[0],row*size[1]))
    atlas.save(target/'spritesheet.webp',lossless=True)
    preview = [atlas.crop((i*192,0,(i+1)*192,128)).resize((384,256),Image.Resampling.LANCZOS) for i in range(4)]
    preview[0].save(art/'idle-preview.webp',save_all=True,append_images=preview[1:],duration=[900,300,350,350],loop=0,lossless=True)
    (target/'palettes').mkdir(exist_ok=True)
    for palette in PALETTES:
        recolor(atlas,palette,'whale').save(target/'palettes'/f'{palette}.png',optimize=True)
    tracks = {name: {'durations':[300]*4,'loop':True} for name in ORDER}
    tracks['idle']['durations'] = [900,300,350,350]
    for name in ['jumping','failed']:
        tracks[name] = {'durations':[250,300,350,400], 'loop':False,'fallback':'idle'}
    tracks['waving']['durations'] = [300,350,350,400]
    manifest = {'petManifestVersion':2,'id':'blue-whale-business','displayName':'小蓝鲸（商务版）',
        'version':'1.1.0','author':'ltmroberthk915 · AI-assisted artwork','license':'MIT','renderer':'sprite2d',
        'description':'现代商务小蓝鲸：陶瓷蓝与银白工业设计，轻微科幻质感，九种克制动作与简洁状态提示。',
        'sprite2d':{'spritesheetPath':'spritesheet.webp','cell':{'width':192,'height':128},'columns':4,'frames':[4]*9,'tracks':tracks}}
    save_json(target/'pet.json',manifest)
    voice = json.loads((ROOT/'assets/whale-refined/voice.json').read_text(encoding='utf-8'))
    status = {'prepare':'准备就绪','waiting':'等待响应','thinking':'分析中','review':'整理结果','toolResult':'核对结果',
        'done':'处理完成','failed':'处理异常，请查看会话','toolFailed':'工具执行异常','maxTokens':'达到本轮输出上限','interrupted':'处理已中断','blocked':'等待确认'}
    voice['status'] = {key:[value] for key,value in status.items()}
    voice['tools'] = {key:[lines[0]] for key,lines in voice['tools'].items()}
    voice['tools']['subagent'] = ['安排协作任务']
    voice['toolRemaining'] = ['等待 {n} 项任务返回']
    voice['whispers'] = {kind:{key:[] for key in pools} for kind,pools in voice['whispers'].items()}
    voice['remarks'] = {'pet':['已收到互动','继续协作'],'petCooldown':['保持待命'],
        'feed':['能量已补充'],'feedCooldown':['能量充足'],'noTreats':['暂无可用能量']}
    voice['panel'] = {'labels':{'feed':'补充能量','rename':'命名','hide':'隐藏','confirm':'保存'},
        'stats':{'rank':'协作等级 {rank}','treats':'能量 ×{n}','points':'协作积分 {points}'}}
    ranks = ['幼鲸','伙伴','挚友','深海羁绊','心有灵犀','传说羁绊','神话羁绊','永恒之契','鲸生共渡']
    voice['ranks'] = dict(zip(ranks,['初识','伙伴','协作','默契','可靠','资深','专家','长期协作','卓越伙伴']))
    save_json(target/'voice.json',voice)
    save_json(target/'build-report.json',{'version':'1.1.0','sourceSha256':hashlib.sha256((art/'frames-source.png').read_bytes()).hexdigest(),
        'sourceSize':list(source.size),'atlasSize':list(atlas.size),'frames':audit,'palettes':PALETTES,'quietWhispers':True})


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--pet', choices=['miku','business','all'],default='all')
    parser.add_argument('--runs-only',action='store_true')
    parser.add_argument('--new-only',action='store_true')
    args = parser.parse_args()
    if args.pet in ['miku','all']:
        build_miku(args.runs_only,args.new_only)
    if args.pet in ['business','all']:
        build_business()
    print('Built companion assets:',args.pet)
