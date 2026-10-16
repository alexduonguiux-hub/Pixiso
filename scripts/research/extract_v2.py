"""Extract all 12 mannequin frames of 6.png at 1:1, clean JPEG noise, enforce symmetry, write ASCII (our legend)."""
import json
from PIL import Image
import numpy as np
SRC='/tmp/claude-0/-home-user-Pixiso/37864554-9dbd-50e2-8db0-13ed242a10c5/images/6.png'
rgb=np.array(Image.open(SRC).convert('RGB')).astype(float)
P={'.':(255,255,255),'o':(93,54,33),'S':(200,143,111),'s':(249,209,173),'$':(253,233,200),'e':(40,95,110),'x':(215,230,235)}
names=list(P); C=np.array([P[k] for k in names])
def classify(px): return names[int(((C-px)**2).sum(axis=1).argmin())]
def fit(sig,lo,hi,step,phstep):
    n=len(sig); best=(-1,0,0)
    for p in np.arange(lo,hi,step):
        for ph in np.arange(0,p,phstep):
            idx=np.floor(np.arange(ph,n,p)).astype(int); idx=idx[idx<n]
            sc=sig[idx].sum()/len(idx)
            if sc>best[0]: best=(sc,p,ph)
    return best
def resample(y0,y1,x0,x1,lo,hi,step,phstep,block):
    reg=rgb[y0:y1,x0:x1]; gray=reg.mean(axis=2)
    gx=np.abs(np.diff(gray,axis=1)).sum(axis=0); gy=np.abs(np.diff(gray,axis=0)).sum(axis=1)
    _,px,phx=fit(gx,lo,hi,step,phstep); _,py,phy=fit(gy,lo,hi,step,phstep)
    cols=np.arange(phx+px/2,reg.shape[1],px); rows=np.arange(phy+py/2,reg.shape[0],py)
    out=np.zeros((len(rows),len(cols),3))
    r=block/2
    for j,cy in enumerate(rows):
        for i,cx in enumerate(cols):
            ya,yb=int(round(cy-r)),int(round(cy+r)); xa,xb=int(round(cx-r)),int(round(cx+r))
            out[j,i]=reg[max(ya,0):max(yb,ya+1),max(xa,0):max(xb,xa+1)].reshape(-1,3).mean(axis=0)
    return out
def to_grid(small): return [''.join(classify(small[y,x]) for x in range(small.shape[1])) for y in range(small.shape[0])]
def bbox(grid):
    nb=np.array([[c!='.' for c in r] for r in grid]); ys=np.where(nb.any(axis=1))[0]; xs=np.where(nb.any(axis=0))[0]
    return xs.min(),ys.min(),xs.max(),ys.max()
def crop(grid,b): x0,y0,x1,y1=b; return [r[x0:x1+1] for r in grid[y0:y1+1]]
# ground truth: big S
big=to_grid(resample(20,515,100,320,10,13,0.01,0.25,0)); BIG=crop(big,bbox(big))
def diffcount(a,b):
    if len(a)!=len(b) or len(a[0])!=len(b[0]): return 999
    return sum(1 for y in range(len(a)) for x in range(len(a[0])) if a[y][x]!=b[y][x])
def clean_outside(g):
    H,W=len(g),len(g[0]); g=[list(r) for r in g]
    seen=[[False]*W for _ in range(H)]; st=[]
    for y in range(H):
        for x in range(W):
            if (y in (0,H-1) or x in (0,W-1)) and g[y][x] not in 'oSe': st.append((y,x))
    while st:
        y,x=st.pop()
        if y<0 or x<0 or y>=H or x>=W or seen[y][x] or g[y][x] in 'oSe': continue
        seen[y][x]=True; st+= [(y+1,x),(y-1,x),(y,x+1),(y,x-1)]
    for y in range(H):
        for x in range(W):
            if seen[y][x]: g[y][x]='.'
    return [''.join(r) for r in g]
DARK={'.':0,'x':1,'$':2,'s':3,'S':4,'e':5,'o':6}
def merge(a,b):
    """Two samples of the same pixels: darker wins for skin tones, else keep a."""
    out=[]
    for ra,rb in zip(a,b):
        row=''
        for ca,cb in zip(ra,rb):
            if ca==cb: row+=ca
            elif {ca,cb}<= {'$','s','S'}: row+= ca if DARK[ca]>=DARK[cb] else cb
            elif ca=='.' or cb=='.': row+= ca if ca!='.' else cb  # fill a hole from the other sample
            else: row+=ca
        out.append(row)
    return out
def mirror(g): return [r[::-1] for r in g]
def pad_to(g,w,h,align):
    """Pad a frame to w×h; align 'c' centre, 'l' left, 'r' right; bottom aligned."""
    H,W=len(g),len(g[0]); out=[]
    top=h-H
    for y in range(h):
        if y<top: out.append('.'*w); continue
        r=g[y-top]
        if align=='c': l=(w-W)//2
        elif align=='l': l=0
        else: l=w-W
        out.append('.'*l+r+'.'*(w-W-l))
    return out
best=None
for block in (0,1,1.5,2):
    small=resample(525,1015,95,330,2.2,2.4,0.0025,0.05,block)
    grid=to_grid(small)
    # frame 1 = S stand: find by bands
    nb=np.array([[c!='.' for c in r] for r in grid])
    def bands(m,minlen):
        out=[];s=None
        for i,v in enumerate(m):
            if v and s is None: s=i
            if not v and s is not None: out.append((s,i-1)); s=None
        if s is not None: out.append((s,len(m)-1))
        return [b for b in out if b[1]-b[0]+1>=minlen]
    rb=bands(nb.any(axis=1),10)
    frames=[]
    for (ra,rbb) in rb:
        for (ca,cb) in bands(nb[ra:rbb+1].any(axis=0),5):
            sub=[r[ca:cb+1] for r in grid[ra:rbb+1]]
            sub=clean_outside(sub); b=bbox(sub); frames.append(crop(sub,b))
    d=diffcount(frames[1],BIG)
    print('block',block,'S-stand errors vs big:',d, 'sizes', [(len(f[0]),len(f)) for f in frames])
    if best is None or d<best[0]: best=(d,block,frames)
d,block,frames=best
print('using block',block,'errors',d)
# show residual errors for S stand
for y in range(len(BIG)):
    for x in range(len(BIG[0])):
        if frames[1][y][x]!=BIG[y][x]: print('  S err',x,y,'small',frames[1][y][x],'big',BIG[y][x])
# assemble views
S=[frames[0],BIG,frames[2]]              # step, stand, step
N=[frames[3],frames[4],frames[5]]
W=[frames[6],frames[7],frames[8]]
E=[frames[9],frames[10],frames[11]]
# symmetric standing N: mirror-merge
N[1]=merge(N[1],mirror(N[1]))
# W/E pairs: merge W with mirrored E when same size
for i in range(3):
    me=mirror(E[i])
    if len(me)==len(W[i]) and len(me[0])==len(W[i][0]):
        W[i]=merge(W[i],me); print('W',i,'merged with E')
    else: print('W',i,'size',len(W[i][0]),len(W[i]),'E',len(me[0]),len(me))
out={'S':S,'N':N,'W':W}
json.dump(out,open('hero_frames.json','w'),ensure_ascii=False,indent=0)
for v,fr in out.items():
    for i,f in enumerate(fr):
        print(f'\n## {v}{i} {len(f[0])}x{len(f)}')
        print('\n'.join(f))
