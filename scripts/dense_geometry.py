"""Extract complete supplied drawings, including detached effects, without grid cuts."""
import numpy as np
from PIL import Image
from scipy import ndimage


def complete_drawings(path, columns, rows, count=None):
    image = Image.open(path).convert('RGBA')
    pixels = np.array(image)
    labels, total = ndimage.label(pixels[..., 3] > 32)
    sizes = np.bincount(labels.ravel())
    count = count or columns*rows
    bodies = np.argsort(sizes[1:])[-count:] + 1
    assert len(bodies) == count and sizes[bodies].min() > 1000, (path, sizes[bodies])
    centers = np.array(ndimage.center_of_mass(np.ones(labels.shape), labels, range(1,total+1)))
    body_centers = centers[bodies-1]
    order = sorted(range(count), key=lambda i: body_centers[i,0])
    order = [i for start in range(0,count,columns)
             for i in sorted(order[start:start+columns], key=lambda i:body_centers[i,1])]
    bodies = bodies[order]
    body_centers = centers[bodies-1]
    # Assign WHOLE connected details to their nearest body. A pixel Voronoi
    # cut would sever soft rings/tails; nominal rows sever the whale's crown.
    scale = np.array([image.height/rows, image.width/columns])
    distance = ((centers[:,None,:]-body_centers[None,:,:])/scale)**2
    owners = np.zeros(total+1, dtype=np.int32)
    owners[1:] = distance.sum(axis=2).argmin(axis=1)+1
    owners[np.flatnonzero(sizes < 8)] = 0
    owners[bodies] = np.arange(count)+1
    nearest = ndimage.distance_transform_edt(labels == 0, return_distances=False, return_indices=True)
    ownership = owners[labels[nearest[0],nearest[1]]]
    result=[]
    for i,body in enumerate(bodies):
        own = (ownership == i+1) & (pixels[...,3] > 0)
        yy,xx = np.where(own & (pixels[...,3] > 16))
        bounds = (max(0,int(xx.min())-2),max(0,int(yy.min())-2),
                  min(image.width,int(xx.max())+3),min(image.height,int(yy.max())+3))
        l,t,r,b=bounds
        drawing=pixels[t:b,l:r].copy()
        drawing[...,3][~own[t:b,l:r]]=0
        drawing[drawing[...,3]==0,:3]=0
        # This asserts the exact failure missed by old edge-only cell audits:
        # every opaque body pixel survived extraction, even outside its grid.
        assert int((labels[t:b,l:r]==body).sum()) == int(sizes[body]), (path,i,'clipped body')
        result.append({'image':Image.fromarray(drawing),'bounds':bounds,
                       'bodyPixels':int(sizes[body]),'bodyCenter':body_centers[i].tolist()})
    return result


def alpha_bounds(image, threshold=128):
    yy,xx=np.where(np.asarray(image)[...,3]>threshold)
    return (int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1))


def fit_frame(drawing, size, bounds):
    """Rigid uniform scale and translation only; never deform body parts."""
    bounds_source=alpha_bounds(drawing,16)
    image=drawing.crop((max(0,bounds_source[0]-2),max(0,bounds_source[1]-2),
                        min(drawing.width,bounds_source[2]+2),min(drawing.height,bounds_source[3]+2)))
    left,top,right,bottom=bounds
    factor=min((right-left)/image.width,(bottom-top)/image.height)
    resized=image.resize((max(1,round(image.width*factor)),max(1,round(image.height*factor))),Image.Resampling.LANCZOS)
    output=Image.new('RGBA',size)
    output.paste(resized,(round((left+right-resized.width)/2),round((top+bottom-resized.height)/2)))
    return output
