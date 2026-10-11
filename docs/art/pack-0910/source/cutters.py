"""Three real 3D cutter sets for the Woodwork Empire catalog.

The case is shared geometry, uniformly framed in the catalog canvas. The
projection lives in the renderer; no screen-space transformations are applied.
Design follows the existing Order 3 wood-rimmed case and four-insert cutterheads.
"""
from __future__ import annotations
import math
import sys
from pathlib import Path
import numpy as np

OLD = Path(__file__).resolve().parent / 'legacy'
if str(OLD) not in sys.path:
    sys.path.append(str(OLD))
from renderer import Model

STEEL=((160,174,182),.78,.30,1)
CHROME=((184,194,204),.94,.19,1)
DARK=((33,41,47),.12,.56,0)
RUBBER=((20,26,29),.03,.75,0)
FOAM=((35,39,40),.01,.97,6)
FOAM_WALL=((22,26,27),.01,.95,6)
WOOD=((192,150,98),.04,.58,4)


def annulus(m,cx,cy,z,outer,inner,mat):
    n=48
    for j in range(n):
        a=math.tau*j/n;b=math.tau*(j+1)/n
        m.quad([(cx+outer*math.cos(a),cy+outer*math.sin(a),z),
                (cx+outer*math.cos(b),cy+outer*math.sin(b),z),
                (cx+inner*math.cos(b),cy+inner*math.sin(b),z),
                (cx+inner*math.cos(a),cy+inner*math.sin(a),z)],(0,0,1),mat)


def cutter_ring(m,cx,cy,z,r,h,profile=False,body=STEEL,top=CHROME):
    """Existing Order 3 open-arbor head, with optional stepped profile knives."""
    n=40;ri=r*.29
    for j in range(n):
        a=math.tau*j/n;b=math.tau*(j+1)/n
        outer=[(cx+r*math.cos(t),cy+r*math.sin(t),zz) for zz in [z,z+h] for t in [a,b]]
        m.quad([outer[0],outer[1],outer[3],outer[2]],(math.cos((a+b)/2),math.sin((a+b)/2),0),body)
        m.quad([(cx+ri*math.cos(a),cy+ri*math.sin(a),z+h),(cx+r*math.cos(a),cy+r*math.sin(a),z+h),(cx+r*math.cos(b),cy+r*math.sin(b),z+h),(cx+ri*math.cos(b),cy+ri*math.sin(b),z+h)],(0,0,1),top)
        m.quad([(cx+ri*math.cos(a),cy+ri*math.sin(a),z),(cx+ri*math.cos(b),cy+ri*math.sin(b),z),(cx+ri*math.cos(b),cy+ri*math.sin(b),z+h),(cx+ri*math.cos(a),cy+ri*math.sin(a),z+h)],(-math.cos((a+b)/2),-math.sin((a+b)/2),0),DARK)
    for a in [0,math.pi/2,math.pi,3*math.pi/2]:
        v=np.array([math.cos(a),math.sin(a),0]);u=np.array([-math.sin(a),math.cos(a),0]);c=np.array([cx,cy,z+h*.5])+v*r*.91
        if profile:
            # Two actual steps in each radial cutting knife.
            for zz,rr in [(-h*.42,.31),(-h*.08,.20),(h*.20,.36)]:
                vs=[c+v*vv+u*uu+np.array([0,0,dz]) for vv,uu,dz in [(0,-r*.24,zz),(r*rr,-r*.19,zz),(r*rr,r*.19,zz+h*.28),(0,r*.24,zz+h*.28)]]
                m.polygon(vs,CHROME)
        else:
            vs=[c+v*vv+u*uu+np.array([0,0,zz]) for vv,uu,zz in [(0,-r*.31,-h*.4),(r*.25,-r*.21,-h*.4),(r*.25,r*.22,h*.35),(0,r*.31,h*.35)]]
            m.polygon(vs,CHROME)
        m.bolt(cx+v[0]*r*.80,cy+v[1]*r*.80,z+h+.002,'z',r*.095)


def pocket_cell(m,rect,cx,cy,r):
    """Raised foam rectangle with a real circular recess, no black painted disc."""
    x0,y0,x1,y1=rect;n=64;z0=.148;zt=.184
    def boundary(a):
        dx,dy=math.cos(a),math.sin(a)
        tx=(x1-cx)/dx if dx>1e-9 else ((x0-cx)/dx if dx<-1e-9 else 1e9)
        ty=(y1-cy)/dy if dy>1e-9 else ((y0-cy)/dy if dy<-1e-9 else 1e9)
        t=min(tx,ty)
        return cx+dx*t,cy+dy*t
    # Include corner angles so adjacent foam rectangles join without missing wedges.
    angles=sorted(set([math.tau*j/n for j in range(n)]+[math.atan2(y-cy,x-cx)%math.tau for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]]))
    for j,a in enumerate(angles):
        b=angles[(j+1)%len(angles)]
        aa=(cx+r*math.cos(a),cy+r*math.sin(a));bb=(cx+r*math.cos(b),cy+r*math.sin(b))
        oa=boundary(a);ob=boundary(b)
        m.quad([(*oa,zt),(*ob,zt),(*bb,zt),(*aa,zt)],(0,0,1),FOAM)
        normal=(-math.cos((a+b)/2),-math.sin((a+b)/2),0)
        if j==len(angles)-1:normal=(-math.cos((a+b+math.tau)/2),-math.sin((a+b+math.tau)/2),0)
        m.quad([(*aa,z0),(*aa,zt),(*bb,zt),(*bb,z0)],normal,FOAM_WALL)


def case():
    m=Model()
    m.box((0,0,0),(1,.72,.13),DARK,.018)
    m.box((.018,.017,.075),(.982,.703,.144),WOOD,.010)
    m.box((.045,.045,.132),(.955,.674,.148),FOAM_WALL,.008)
    m.box((0,.005,.13),(1,.055,.72),WOOD,.013)
    m.box((.030,.056,.17),(.970,.068,.686),FOAM,.005)
    # Padded raised edge around the inside of the same lid on all three cases.
    for x in [.048,.929]:m.box((x,.068,.190),(x+.023,.086,.665),FOAM,.005)
    for z in [.190,.642]:m.box((.048,.068,z),(.952,.086,z+.023),FOAM,.005)
    for x in [.11,.84]:
        m.box((x,.010,.095),(x+.055,.069,.175),STEEL,.004)
        m.box((x,.702,.048),(x+.055,.737,.112),STEEL,.005)
        m.box((x+.010,.738,.067),(x+.045,.746,.101),CHROME,.003)
        m.bolt(x+.0275,.747,.085,'y',.007)
    # Solid rounded grip joined to the front of the case.
    for a,b in [((.34,.722,.064),(.36,.837,.064)),((.36,.837,.064),(.64,.837,.064)),((.64,.837,.064),(.66,.722,.064))]:
        m.cyl(a,b,.022,DARK,18)
    m.cyl((.398,.837,.064),(.602,.837,.064),.030,RUBBER,24)
    for x in [.023,.93]:
        for y in [.02,.665]:
            m.box((x,y,.018),(x+.044,y+.037,.047),RUBBER,.007)
    return m


def panel_raiser(m,cx,cy,z):
    """Broad shallow cutter disc with three long, visibly swept knives."""
    cutter_ring(m,cx,cy,z,.184,.032,body=((106,122,131),.65,.38,1),top=((103,120,132),.65,.40,1))
    # Central steel boss has the same genuine arbor opening.
    cutter_ring(m,cx,cy,z+.032,.063,.042)
    for a in [math.radians(25),math.radians(145),math.radians(265)]:
        v=np.array([math.cos(a),math.sin(a),0]);u=np.array([-math.sin(a),math.cos(a),0]);c=np.array([cx,cy,z])
        # A long skew blade lies on a sloping seat from the inner boss to rim.
        points=[c+v*rr+u*tt+np.array([0,0,zz]) for rr,tt,zz in [(.071,-.024,.078),(.196,.008,.045),(.196,.044,.054),(.078,.011,.089)]]
        m.quad(points,(0,0,1),CHROME)
        for rr,tt,zz in [(.10,-.001,.081),(.164,.022,.064)]:
            p=c+v*rr+u*tt+np.array([0,0,zz]);m.bolt(*p,'z',.007)


def spacer(m,x,y,r):
    cutter_ring(m,x,y,.151,r,.014)


def common_accessories(m):
    # Spacer rings have a smooth perimeter, unlike cutterheads.
    for x,r in [(.16,.028),(.245,.031),(.335,.028),(.425,.032)]:
        pocket_cell(m,(x-.042,.570,x+.042,.666),x,.613,r+.008)
        n=40
        m.cyl((x,.613,.151),(x,.613,.165),r,STEEL,n,False)
        annulus(m,x,.613,.165,r,r*.45,CHROME)
        m.cyl((x,.613,.150),(x,.613,.166),r*.45,FOAM_WALL,n,False)
    # Fitted slender rectangular wrench channel at the front.
    m.box((.514,.574,.148),(.934,.667,.174),FOAM,.003)
    m.box((.549,.593,.174),(.902,.637,.177),FOAM_WALL,.003)
    m.box((.57,.602,.178),(.85,.624,.188),STEEL,.003)
    # Open ended wrench jaw, actual missing central segment.
    m.box((.840,.590,.178),(.867,.637,.188),STEEL,.002)
    for y in [.583,.630]:m.box((.850,y,.178),(.914,y+.016,.188),CHROME,.002)
    m.cyl((.569,.613,.178),(.569,.613,.188),.031,STEEL,8)
    m.cyl((.569,.613,.187),(.569,.613,.189),.014,DARK,6)


def transform(m,scale,off):
    dst=Model();off=np.asarray(off)
    dst.tri=[np.asarray(t)*scale+off for t in m.tri]
    dst.norm=[np.asarray(n).copy() for n in m.norm]
    dst.mat=m.mat.copy();dst.boxes=[np.asarray(b)*scale+off for b in m.boxes]
    return dst


def framing():
    """One uniform model-space transform calculated from the shared case."""
    pts=np.asarray(case().tri).reshape(-1,3)
    raw=np.column_stack([48*(pts[:,0]-pts[:,1]),24*(pts[:,0]+pts[:,1])-48*pts[:,2]])
    lo,hi=raw.min(0),raw.max(0)
    scale=min(64/(hi[0]-lo[0]),62/(hi[1]-lo[1]))
    center=scale*(lo+hi)/2
    # At this camera ox=oy=56. Keep the object centred about x=y=.5 in 3D.
    xy=(pts[:,:2].min(0)+pts[:,:2].max(0))/2
    off=np.array([.5-scale*xy[0],.5-scale*xy[1],0.])
    delta=55-(56+center[0]+48*(off[0]-off[1]))
    off[0]+=delta/96;off[1]-=delta/96
    off[2]=(56+center[1]+24*(off[0]+off[1])-57)/48
    return scale,off


def build_cutters(kind):
    kind=kind.removeprefix('cutters').split('.')[0].capitalize()
    if kind not in ('Sash','Casement','Door'):raise ValueError(kind)
    m=case()
    if kind=='Sash':
        for j in range(2):
            for i in range(4):
                x=.159+i*.226;y=.213+j*.222;r=.061 if i<2 else .067
                pocket_cell(m,(.046+i*.226,.102+j*.222,.272+i*.226,.324+j*.222),x,y,r*1.29)
                cutter_ring(m,x,y,.151,r,.100+.015*(i%2),profile=i>=2)
    elif kind=='Casement':
        for j in range(2):
            for i in range(2):
                x=.274+i*.448;y=.200+j*.250
                pocket_cell(m,(.046+i*.448,.075+j*.250,.494+i*.448,.325+j*.250),x,y,.121)
                cutter_ring(m,x,y,.151,.090,.077,profile=True)
                cutter_ring(m,x,y,.226,.070,.043,profile=bool(j))
    else:
        for j in range(2):
            y=.205+j*.240
            # Leave a real foam web at the cell edge: an exactly tangent circle
            # collapses three corner fan triangles to zero area.
            pocket_cell(m,(.046,.080 if j==0 else .325,.423,.325 if j==0 else .565),.234,y,.118)
            cutter_ring(m,.234,y,.151,.090,.104,profile=True)
        pocket_cell(m,(.424,.093,.955,.555),.706,.320,.209)
        panel_raiser(m,.706,.320,.151)
    common_accessories(m)
    scale,off=framing();m=transform(m,scale,off)
    m.parts=[{'part':'shared fitted cutter case','set':kind,'uniformModelScale':float(scale),'modelOffsetM':off.tolist(),'longAngledPanelRaisingKnives':3 if kind=='Door' else 0}]
    return m


if __name__=='__main__':
    import json
    for kind in ['Sash','Casement','Door']:
        model=build_cutters(kind);pts=np.asarray(model.tri).reshape(-1,3)
        pix=np.column_stack([56+48*(pts[:,0]-pts[:,1]),56+24*(pts[:,0]+pts[:,1])-48*pts[:,2]])
        print(json.dumps({'kind':kind,'triangles':len(model.tri),'boundsM':[pts.min(0).tolist(),pts.max(0).tolist()],'projectedBounds':[pix.min(0).tolist(),pix.max(0).tolist()],'framing':model.parts}))
