"""Fill interior holes in the extracted frames and emit the TS data module."""
import json, subprocess, sys
exec(open('extract_v3.py').read().split("for v,fr in (('S',S)")[0])  # runs extraction, defines S,N,W,meta
def fill_holes(g):
    H,W=len(g),len(g[0]); g=[list(r) for r in g]
    # outside = reachable from border through '.' cells
    seen=[[False]*W for _ in range(H)]; st=[(y,x) for y in range(H) for x in range(W) if (y in (0,H-1) or x in (0,W-1)) and g[y][x]=='.']
    while st:
        y,x=st.pop()
        if y<0 or x<0 or y>=H or x>=W or seen[y][x] or g[y][x]!='.': continue
        seen[y][x]=True; st+=[(y+1,x),(y-1,x),(y,x+1),(y,x-1)]
    changed=0
    for y in range(H):
        for x in range(W):
            if g[y][x]=='.' and not seen[y][x]:
                nb=[g[y+dy][x+dx] for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)) if 0<=y+dy<H and 0<=x+dx<W and g[y+dy][x+dx]!='.']
                if 'e' in nb: g[y][x]='x'
                else:
                    skin=[c for c in nb if c in '$sS'] or nb
                    g[y][x]=max(set(skin), key=skin.count) if skin else 's'
                changed+=1
    return [''.join(r) for r in g], changed
data={}
for v,fr in (('S',S),('N',N),('W',W)):
    data[v]=[]
    for i,f in enumerate(fr):
        f2,ch=fill_holes(f)
        if ch: print(v,i,'filled',ch,'holes')
        m=meta[v][i]; data[v].append({'rows':f2,'dtop':m['dtop'],'dbottom':m['dbottom']})
ts=['/**',' * Hero mannequin frames transcribed from the reference sheet (scripts/research/extract_hero_frames.py).',' * Generated: do not edit by hand. Index 0 and 2 are the two walk steps, 1 is standing.',' * `dtop`/`dbottom` are the frame\'s top and bottom rows relative to the standing frame of the same view.',' */','export interface HeroFrameData {','  rows: string[];','  dtop: number;','  dbottom: number;','}','','export const HERO_FRAME_DATA: Record<\'S\' | \'N\' | \'W\', [HeroFrameData, HeroFrameData, HeroFrameData]> = {']
for v in ('S','N','W'):
    ts.append(f'  {v}: [')
    for fr in data[v]:
        ts.append('    {'); ts.append('      rows: [')
        for r in fr['rows']: ts.append(f"        '{r}',")
        ts.append('      ],'); ts.append(f"      dtop: {fr['dtop']},"); ts.append(f"      dbottom: {fr['dbottom']},"); ts.append('    },')
    ts.append('  ],')
ts.append('};'); ts.append('')
open('/home/user/Pixiso/packages/sprite-kit/src/hero64.frames.ts','w').write('\n'.join(ts))
print('wrote hero64.frames.ts')
