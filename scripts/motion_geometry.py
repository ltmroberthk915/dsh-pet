"""Offline silhouette/landmark measurements; no runtime image processing.

Face width uses the connected skin region in the head, not the whole bounding
box (hands can touch the chin). It is a 2-D projection, not a 3-D volume claim.
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def landmarks(image):
    a = np.asarray(image)
    rgb = a[..., :3].astype(float) / 255
    alpha = a[..., 3] > 128
    yy, xx = np.where(alpha)
    left, top, right, bottom = int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())
    h = bottom - top + 1
    r, g, b = rgb.transpose(2, 0, 1)
    y, x = np.indices(alpha.shape)
    skin = (r > .60) & (r-g > .015) & (r-b > .06) & (g-b > .01) & (g > .35) & alpha
    head = skin & (y > top+.2*h) & (y < top+.59*h)
    labels, _ = ndimage.label(head)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    face = labels == np.argmax(sizes)
    fy, fx = np.where(face)
    # Cheek-to-cheek width: touching chin/hands cannot extend this horizontally.
    row_widths = []
    for row in np.unique(fy):
        xs = np.where(face[row])[0]
        if len(xs) > 3:
            row_widths.append((int(xs.max()-xs.min()+1), int(row)))
    row_widths.sort(reverse=True)
    face_width = float(np.median([v[0] for v in row_widths[:3]]))
    cheek_y = float(np.median([v[1] for v in row_widths[:3]]))
    face_x = (float(fx.min())+float(fx.max()))/2
    white = (rgb.min(axis=2) > .59) & (rgb.max(axis=2)-rgb.min(axis=2) < .15) & alpha
    band = white & (y > top+.025*h) & (y < top+.31*h)
    by,bx = np.where(band)
    # The headband follows the rigid skull and is unaffected by blinking,
    # cheek shading or a hand touching the chin. Ignore isolated bright specks.
    band = ndimage.binary_opening(band, iterations=max(1,round(h/170)))
    band_labels,_ = ndimage.label(ndimage.binary_dilation(band,iterations=max(1,round(h/110))))
    band_sizes = np.bincount(band_labels.ravel()); band_sizes[0] = 0
    candidates = np.unique(band_labels[(y < top+.18*h) & band])
    candidates = [c for c in candidates if c and band_sizes[c] > .002*h*h]
    band &= np.isin(band_labels,candidates)
    by,bx = np.where(band)
    band_width = int(bx.max()-bx.min()+1)
    points = np.column_stack([bx,by]).astype(float)
    points -= points.mean(axis=0)
    _,axes = np.linalg.eigh(np.cov(points.T))
    projected = points @ axes[:,-1]
    band_span = float(projected.max()-projected.min()+1)
    apron_roi = white & (y > top+.59*h) & (y < top+.85*h) & (abs(x-face_x) < face_width*.83)
    apron_roi = ndimage.binary_opening(apron_roi,iterations=max(1,round(h/180)))
    labels, _ = ndimage.label(apron_roi)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    ay, ax = np.where(labels == np.argmax(sizes))
    # A fixed head-level cross section independent of the arm and tail outline.
    head_rows = range(round(top+.23*h), round(top+.31*h))
    widths = []
    for row in head_rows:
        xs = np.where(alpha[row])[0]
        if len(xs): widths.append(int(xs.max()-xs.min()+1))
    foot = alpha & (y >= bottom-max(3,round(.025*h)))
    _, foot_xs = np.where(foot)
    return {'faceWidth': face_width, 'faceCenterX': face_x, 'cheekY': cheek_y,
            'headSectionWidth': float(np.median(widths)), 'headbandWidth': band_width,
            'headbandSpan': round(band_span,3),
            # Deep bows can join the white apron and white skirt hem. Report
            # unavailable rather than pretending the merged skirt is an apron.
            'apronWidth': int(ax.max()-ax.min()+1) if ax.max()-ax.min()+1 < band_span*.75 else None,
            'apronHeight': int(ay.max()-ay.min()+1),
            'footCenterX': (float(foot_xs.min())+float(foot_xs.max()))/2,
            'footY': bottom, 'height': h, 'bounds': [left,top,right+1,bottom+1],
            'opaqueArea': int(alpha.sum())}


def extract_drawings(path):
    rgba = np.array(Image.open(path).convert('RGBA'))
    rgb = rgba[..., :3].astype(np.int16)
    spill = (rgb[..., 2] > 175) & (rgb[..., 0] < 35) & (rgb[..., 1] < 70)
    rgba[..., 3][spill] = 0
    labels, _ = ndimage.label(rgba[..., 3] > 180)
    sizes = np.bincount(labels.ravel())
    ids = np.argsort(sizes[1:])[-16:] + 1
    regions=[]
    for component in ids:
        yy,xx = np.where(labels==component)
        assert len(xx)>18000, (path,component,len(xx))
        regions.append((component, int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())))
    # Row grouping by vertical center avoids off-by-one rows after a bow/jump.
    regions.sort(key=lambda r: (r[2]+r[4])/2)
    regions=[r for start in range(0,16,4) for r in sorted(regions[start:start+4],key=lambda r:r[1])]
    result=[]
    for component,left,top,right,bottom in regions:
        bounds=(max(0,left-2),max(0,top-2),min(rgba.shape[1],right+3),min(rgba.shape[0],bottom+3))
        l,t,r,b=bounds
        cleaned=rgba[t:b,l:r].copy()
        retained=ndimage.binary_dilation(labels[t:b,l:r]==component,iterations=2)
        cleaned[...,3][~retained]=0
        cleaned[cleaned[...,3]==0,:3]=0
        im=Image.fromarray(cleaned)
        result.append({'image':im,'metrics':landmarks(im),'bounds':list(bounds)})
    return result
