"""v3: classify small frames with centroids calibrated on the clean big S; fill eye holes; pair W/E correctly; emit JSON with offsets."""
import json
from PIL import Image
import numpy as np
exec(open('extract_v2.py').read().split('best=None')[0])  # reuse helpers: resample, to_grid, bbox, crop, clean_outside, merge, mirror, BIG, names, C, classify
small=resample(525,1015,95,330,2.2,2.4,0.0025,0.05,0)
nb0=np.array([[classify(small[y,x])!='.' for x in range(small.shape[1])] for y in range(small.shape[0])])
def bands(m,minlen):
    out=[];s=None
    for i,v in enumerate(m):
        if v and s is None: s=i
        if not v and s is not None: out.append((s,i-1)); s=None
    if s is not None: out.append((s,len(m)-1))
    return [b for b in out if b[1]-b[0]+1>=minlen]
rb=bands(nb0.any(axis=1),10)
boxes=[]
for (ra,rbb) in rb:
    for (ca,cb) in bands(nb0[ra:rbb+1].any(axis=0),5):
        sub=[''.join(classify(small[y,x]) for x in range(ca,cb+1)) for y in range(ra,rbb+1)]
        sub=clean_outside(sub); x0,y0,x1,y1=bbox(sub); boxes.append((ra+y0,ra+y1,ca+x0,ca+x1))
# calibrate centroids on frame 1 vs BIG
fy0,fy1,fx0,fx1=boxes[1]
assert (fx1-fx0+1,fy1-fy0+1)==(17,40), boxes[1]
samples={k:[] for k in names}
for y in range(40):
    for x in range(17):
        samples[BIG[y][x]].append(small[fy0+y,fx0+x])
cent={k:(np.mean(v,axis=0) if v else np.array(P[k],float)) for k,v in samples.items()}
for k,v in cent.items(): print(k,len(samples[k]),v.astype(int))
C2=np.array([cent[k] for k in names])
def classify2(px): return names[int(((C2-px)**2).sum(axis=1).argmin())]
def frame(i):
    y0,y1,x0,x1=boxes[i]
    g=[''.join(classify2(small[y,x]) for x in range(x0,x1+1)) for y in range(y0,y1+1)]
    g=clean_outside(g)
    # enclosed '.' next to an eye cell -> eye light
    H,W=len(g),len(g[0]); g=[list(r) for r in g]
    for y in range(H):
        for x in range(W):
            if g[y][x]=='.' and any(0<=y+dy<H and 0<=x+dx<W and g[y+dy][x+dx]=='e' for dy,dx in ((0,1),(0,-1),(1,0),(-1,0))):
                # enclosed? not reachable from border: approximate by requiring an 'o' or 'S' somewhere left and right in the row
                row=''.join(g[y])
                if 'o' in row[:x] and 'o' in row[x+1:]: g[y][x]='x'
    return [''.join(r) for r in g]
F=[frame(i) for i in range(12)]
print('S-stand errors vs big (calibrated):', diffcount(F[1],BIG))
for y in range(40):
    for x in range(17):
        if F[1][y][x]!=BIG[y][x]: print('  err',x,y,F[1][y][x],BIG[y][x])
S=[F[0],BIG,F[2]]; N=[F[3],F[4],F[5]]; W=[F[6],F[7],F[8]]; E=[F[9],F[10],F[11]]
N[1]=merge(N[1],mirror(N[1]))
pairs=[(0,2),(1,1),(2,0)]
for wi,ei in pairs:
    me=mirror(E[ei])
    if len(me)==len(W[wi]) and len(me[0])==len(W[wi][0]): W[wi]=merge(W[wi],me); print('W',wi,'merged with mirrored E',ei)
    else: print('W',wi,'unpaired', len(W[wi][0]),len(W[wi]), len(me[0]),len(me))
# offsets relative to the stand frame of the same band: (dtop, dbottom, dcentre)
def offs(i,stand):
    y0,y1,x0,x1=boxes[i]; sy0,sy1,sx0,sx1=boxes[stand]
    # cells are laid out with a pitch; estimate pitch from band 1 stand/steps centres
    return {'dtop':int(y0-sy0),'dbottom':int(y1-sy1),'w':int(x1-x0+1),'h':int(y1-y0+1),'cx':float((x0+x1)/2)}
meta={'S':[offs(0,1),offs(1,1),offs(2,1)],'N':[offs(3,4),offs(4,4),offs(5,4)],'W':[offs(6,7),offs(7,7),offs(8,7)],'E':[offs(9,10),offs(10,10),offs(11,10)]}
print(json.dumps(meta))
json.dump({'frames':{'S':S,'N':N,'W':W},'meta':meta},open('hero_frames.json','w'),ensure_ascii=False)
for v,fr in (('S',S),('N',N),('W',W)):
    for i,f in enumerate(fr):
        print(f'\n## {v}{i} {len(f[0])}x{len(f)}'); print('\n'.join(f))
