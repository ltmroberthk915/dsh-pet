"""Rigid registration of Miku drawings; no body-part warping or new poses."""
import numpy as np
from PIL import Image
from scipy import ndimage


def owned_sheet_cells(sheet, columns, rows):
    """Keep the cell's own sprite and nearby effects, exclude neighbouring bodies."""
    pixels = np.array(sheet)
    labels, _ = ndimage.label(pixels[...,3] > 128)
    sizes = np.bincount(labels.ravel())
    ids = np.argsort(sizes[1:])[-columns*rows:] + 1
    assert sizes[ids].min() > 5000
    bodies = np.isin(labels,ids)
    centers = []
    for component in ids:
        yy,xx = np.where(labels == component)
        centers.append((component,float(xx.mean()),float(yy.mean())))
    centers.sort(key=lambda body:body[2])
    centers = [body for start in range(0,len(centers),columns)
               for body in sorted(centers[start:start+columns],key=lambda body:body[1])]
    frames = []
    for i,(component,_,_) in enumerate(centers):
        col,row = i%columns,i//columns
        x0,x1 = round(col*sheet.width/columns),round((col+1)*sheet.width/columns)
        y0,y1 = round(row*sheet.height/rows),round((row+1)*sheet.height/rows)
        frame = pixels[y0:y1,x0:x1].copy()
        # Reject neighbouring solid drawings and their antialias fringe.
        # Leave this sprite's soft trail/rings intact; a nearest-body Voronoi
        # mask would visibly cut a diagonal line through a diffuse glow.
        foreign = bodies & (labels != component)
        reject = ndimage.binary_dilation(foreign,iterations=3)
        frame[...,3][reject[y0:y1,x0:x1]] = 0
        frame[frame[...,3] == 0,:3] = 0
        frames.append(Image.fromarray(frame))
    return frames


def sheet_drawings(sheet, columns, rows):
    """Crop each complete sprite component instead of cutting through grid lines.

    Drawings can cross a nominal grid boundary while remaining disconnected
    from their neighbours. Masking by their own component prevents importing
    a neighbouring tail into the output cell and preserves full silhouettes.
    """
    pixels = np.array(sheet)
    labels, _ = ndimage.label(pixels[...,3] > 128)
    sizes = np.bincount(labels.ravel())
    ids = np.argsort(sizes[1:])[-columns*rows:] + 1
    regions = []
    for component in ids:
        yy, xx = np.where(labels == component)
        assert len(xx) > 10000, (component,len(xx))
        regions.append((component,int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())))
    regions.sort(key=lambda region:(region[2]+region[4])/2)
    regions = [region for start in range(0,len(regions),columns)
               for region in sorted(regions[start:start+columns],key=lambda region:region[1])]
    result = []
    for component,left,top,right,bottom in regions:
        x0,y0 = max(0,left-3),max(0,top-3)
        x1,y1 = min(sheet.width,right+4),min(sheet.height,bottom+4)
        drawing = pixels[y0:y1,x0:x1].copy()
        own = ndimage.binary_dilation(labels[y0:y1,x0:x1] == component,iterations=2)
        drawing[...,3][~own] = 0
        drawing[drawing[...,3] == 0,:3] = 0
        result.append(Image.fromarray(drawing))
    assert len(result) == columns*rows
    return result


def pack_standing(image, scale, lift=0):
    resized = image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.LANCZOS)
    assert resized.width <= 476 and resized.height <= 456, resized.size
    frame = Image.new('RGBA',(512,512))
    frame.paste(resized,((512-resized.width)//2,478-lift-resized.height))
    return frame


def head_anchor(image):
    pixels = np.asarray(image)
    rgb = pixels[..., :3].astype(float) / 255
    alpha = pixels[..., 3] > 128
    yy, xx = np.where(alpha)
    top, bottom = int(yy.min()), int(yy.max())
    y, x = np.indices(alpha.shape)
    r, g, b = rgb.transpose(2, 0, 1)
    red = alpha & (r > .25) & (r-g > .10) & (r-b > .08) & (y < top+.32*(bottom-top+1))
    labels, count = ndimage.label(red)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    headset = labels == np.argmax(sizes)
    hy, hx = np.where(headset)
    assert len(hx) > 50, 'Missing red headset landmark'
    points = np.column_stack([hx,hy]).astype(float)
    center = points.mean(axis=0)
    centered = points-center
    _, axes = np.linalg.eigh(np.cov(centered.T))
    projected = centered @ axes[:,-1]
    return {'span':float(projected.max()-projected.min()+1), 'x':float(center[0]), 'y':float(center[1]),
            'opaqueArea':int(alpha.sum()), 'bounds':[int(xx.min()),top,int(xx.max()+1),bottom+1]}


def register_run(image, span=90, anchor=(256,86), bob=0):
    reference = head_anchor(image)
    scale = span / reference['span']
    resized = image.resize((round(image.width*scale),round(image.height*scale)),Image.Resampling.LANCZOS)
    measured = head_anchor(resized)
    x = round(anchor[0]-measured['x'])
    y = round(anchor[1]+bob-measured['y'])
    bounds = measured['bounds']
    assert x+bounds[0] >= 10 and y+bounds[1] >= 10 and x+bounds[2] <= 502 and y+bounds[3] <= 502, (bounds,x,y)
    frame = Image.new('RGBA',(512,512))
    frame.paste(resized,(x,y))
    return frame
