"""L3 metric forklift model, matching the earlier muted-green standard asset.

Canonical travel/fork direction is +X. Vehicle and load share the fixed floor
origin (0,0,0); only the renderer rotates complete geometry for each heading.
"""
from __future__ import annotations
import math
import numpy as np
from common import Model,STEEL,ALU,CHROME,DARK,RUBBER,RED,YELLOW,cleanup

PAINT=((59,102,78),.27,.29,0)
PAINT_EDGE=((67,116,88),.26,.31,0)
GUARD=((64,72,77),.48,.29,1)
CAST=((91,101,105),.65,.30,1)
TYRE=((26,30,31),.03,.78,0)
TREAD=((34,39,40),.035,.70,0)
SEAT=((34,40,42),.06,.59,0)
AMBER=((227,149,40),.14,.27,0)
LOAD_SHIFT=np.array([.225,-.5,.18],float)
LOAD_TRANSFORM=np.eye(4);LOAD_TRANSFORM[:3,3]=LOAD_SHIFT


def _phase(phase):
    p=float(phase)%1.0
    return 0.0 if abs(p)<1e-12 or abs(p-1)<1e-12 else p


def _tag(m,name,start,dynamic=False):
    if not hasattr(m,'componentTriangleRanges'):m.componentTriangleRanges={}
    m.componentTriangleRanges.setdefault(name,[]).append([start,len(m.tri)])
    if dynamic:
        if not hasattr(m,'dynamicTriangleRanges'):m.dynamicTriangleRanges=[]
        m.dynamicTriangleRanges.append([start,len(m.tri)])


def _smooth_triangle(m,vertices,normals,mat):
    v=np.asarray(vertices);n=np.asarray(normals)
    if np.dot(np.cross(v[1]-v[0],v[2]-v[0]),n.mean(0))<0:v=v[::-1];n=n[::-1]
    m.polygon(v,mat,n)


def rounded_box(m,c,size,r,mat,n=8):
    """Analytic rounded cast shell, with continuous normals on every corner."""
    c=np.asarray(c,float);h=np.asarray(size,float)/2;r=min(r,float(h.min())*.95);inner=h-r
    for axis in range(3):
        uv=[a for a in range(3) if a!=axis]
        for sign in [-1,1]:
            pts={};norms={}
            for i in range(n+1):
                for j in range(n+1):
                    p=np.zeros(3);p[axis]=sign*h[axis]
                    p[uv[0]]=-h[uv[0]]+2*h[uv[0]]*i/n;p[uv[1]]=-h[uv[1]]+2*h[uv[1]]*j/n
                    core=np.clip(p,-inner,inner);q=p-core;normal=q/np.linalg.norm(q)
                    pts[i,j]=c+core+normal*r;norms[i,j]=normal
            for i in range(n):
                for j in range(n):
                    for ids in [[(i,j),(i+1,j),(i+1,j+1)],[(i,j),(i+1,j+1),(i,j+1)]]:
                        _smooth_triangle(m,[pts[k] for k in ids],[norms[k] for k in ids],mat)
    m.boxes.append(np.array([c-h,c+h]))


def profile_extrusion(m,points,y0,y1,mat):
    """Extrude a convex XZ outline, used for genuine tapered steel forks."""
    p=np.asarray(points,float)
    for y,n in [(y0,(0,-1,0)),(y1,(0,1,0))]:m.quad([(x,y,z) for x,z in p],n,mat)
    center=p.mean(0)
    for i in range(len(p)):
        a=p[i];b=p[(i+1)%len(p)];normal=np.array([b[1]-a[1],0,a[0]-b[0]])
        if np.dot(normal[[0,2]],(a+b)/2-center)<0:normal=-normal
        normal/=np.linalg.norm(normal)
        m.quad([(a[0],y0,a[1]),(b[0],y0,b[1]),(b[0],y1,b[1]),(a[0],y1,a[1])],normal,mat)
    m.boxes.append(np.array([[p[:,0].min(),y0,p[:,1].min()],[p[:,0].max(),y1,p[:,1].max()]]))


def torus_path(m,center,u,v,r,tube,mat,n=48):
    c=np.asarray(center);u=np.asarray(u);v=np.asarray(v)
    points=[c+r*(u*math.cos(math.tau*j/n)+v*math.sin(math.tau*j/n)) for j in range(n+1)]
    for a,b in zip(points[:-1],points[1:]):m.cyl(a,b,tube,mat,8)


def wheel(m,x,y,r,width,phase):
    start=len(m.tri);box_start=len(m.boxes);z=r
    profile=[(-.50,.78),(-.46,.91),(-.35,.978),(-.24,.987),(.24,.987),(.35,.978),(.46,.91),(.50,.78)]
    n=60
    for i in range(len(profile)-1):
        t0,rr0=profile[i];t1,rr1=profile[i+1]
        slopes=[]
        for k in [i,i+1]:
            a=profile[max(k-1,0)];b=profile[min(k+1,len(profile)-1)]
            slopes.append((b[1]-a[1])*r/((b[0]-a[0])*width))
        for j in range(n):
            a=math.tau*j/n;b=math.tau*(j+1)/n
            vertices=[];normals=[]
            for t,rr,angle,slope in [(t0,rr0,a,slopes[0]),(t0,rr0,b,slopes[0]),(t1,rr1,b,slopes[1]),(t1,rr1,a,slopes[1])]:
                vertices.append((x+r*rr*math.cos(angle),y+t*width,z+r*rr*math.sin(angle)))
                normal=np.array([math.cos(angle),-slope,math.sin(angle)]);normals.append(normal/np.linalg.norm(normal))
            _smooth_triangle(m,[vertices[k] for k in [0,1,2]],[normals[k] for k in [0,1,2]],TYRE)
            _smooth_triangle(m,[vertices[k] for k in [0,2,3]],[normals[k] for k in [0,2,3]],TYRE)
    # Twenty-three moulded tread blocks avoid six-frame rotational aliasing.
    for j in range(23):
        a=math.tau*j/23;b=a+.118
        for ya,yb,shift in [(y-width*.35,y,.018),(y,y+width*.35,-.018)]:
            vs=[]
            for rr in [r*.979,r]:
                vs.append([(x+rr*math.cos(t),yy,z+rr*math.sin(t)) for t,yy in [(a,ya),(b,ya),(b+shift,yb),(a+shift,yb)]])
            m.polygon(vs[1],TREAD)
            for k in range(4):m.polygon([vs[0][k],vs[0][(k+1)%4],vs[1][(k+1)%4],vs[1][k]],TREAD)
    for side in [-1,1]:
        yy=y+side*width*.5
        m.cyl((x,yy-side*.012,z),(x,yy+side*.010,z),r*.77,CAST,48)
        m.cyl((x,yy+side*.011,z),(x,yy+side*.020,z),r*.60,DARK,48)
        m.cyl((x,yy+side*.021,z),(x,yy+side*.029,z),r*.48,STEEL,40)
        m.cyl((x,yy+side*.030,z),(x,yy+side*.053,z),r*.22,CAST,32)
        torus_path(m,(x,yy+side*.030,z),(1,0,0),(0,0,1),r*.625,.005,ALU,40)
        for a in np.linspace(0,math.tau,5,endpoint=False):
            xx=x+r*.35*math.cos(a);zz=z+r*.35*math.sin(a)
            m.cyl((xx,yy+side*.03,zz),(xx,yy+side*.040,zz),.013,CHROME,6)
        # A single small valve gives each wheel an unambiguous rotation cue.
        a=.37;xx=x+r*.65*math.cos(a);zz=z+r*.65*math.sin(a)
        m.cyl((xx,yy+side*.024,zz),(xx,yy+side*.063,zz),.010,RUBBER,10)
    # Rotation around +Y, consistent with forward travel +X at floor contact.
    angle=math.tau*phase;c=math.cos(angle);s=math.sin(angle)
    matrix=np.array([[c,0,s],[0,1,0],[-s,0,c]]);center=np.array([x,y,z])
    if phase:
        for i in range(start,len(m.tri)):
            m.tri[i]=(np.asarray(m.tri[i])-center)@matrix.T+center
            m.norm[i]=np.asarray(m.norm[i])@matrix.T
        # Cylinders do not register boxes; any primitive boxes would rotate here.
        for i in range(box_start,len(m.boxes)):
            box=m.boxes[i];points=np.array([[xx,yy,zz] for xx in box[:,0] for yy in box[:,1] for zz in box[:,2]])
            points=(points-center)@matrix.T+center;m.boxes[i]=np.array([points.min(0),points.max(0)])
    _tag(m,'wheels',start,True)


def fender(m,x,y,r,width):
    z=r;inner=r+.028;outer=r+.072;n=32
    for rr,sgn in [(inner,-1),(outer,1)]:
        for j in range(n):
            a=math.pi*j/n;b=math.pi*(j+1)/n
            v=[(x+rr*math.cos(t),yy,z+rr*math.sin(t)) for yy,t in [(y-width/2,a),(y-width/2,b),(y+width/2,b),(y+width/2,a)]]
            norms=[(sgn*math.cos(t),0,sgn*math.sin(t)) for t in [a,b,b,a]]
            _smooth_triangle(m,[v[k] for k in [0,1,2]],[norms[k] for k in [0,1,2]],PAINT)
            _smooth_triangle(m,[v[k] for k in [0,2,3]],[norms[k] for k in [0,2,3]],PAINT)
    for yy,sgn in [(y-width/2,-1),(y+width/2,1)]:
        for j in range(n):
            a=math.pi*j/n;b=math.pi*(j+1)/n
            m.quad([(x+rr*math.cos(t),yy,z+rr*math.sin(t)) for rr,t in [(inner,a),(outer,a),(outer,b),(inner,b)]],(0,sgn,0),PAINT_EDGE)


def chassis(m):
    start=len(m.tri)
    # Rounded counterweight and sculpted low body preserve the standard's silhouette.
    rounded_box(m,(-1.47,0,.87),(.93,1.02,.79),.16,PAINT,10)
    rounded_box(m,(-.61,0,.40),(1.75,.98,.42),.075,PAINT,8)
    rounded_box(m,(-.99,0,.78),(.63,.96,.38),.070,PAINT,8)
    rounded_box(m,(-1.45,0,1.255),(.79,.88,.042),.019,PAINT_EDGE,6)
    # Genuine dark engine-cover seam follows the curved rear body.
    m.box((-1.88,-.40,1.224),(-1.10,.40,1.238),DARK,.005)
    rounded_box(m,(-1.49,0,1.252),(.78,.89,.035),.016,PAINT,6)
    rounded_box(m,(-1.903,0,.64),(.055,.83,.17),.022,GUARD,6)
    m.box((-1.40,-.40,.52),(.21,.40,.582),GUARD,.008)
    # Lower footsteps and real stamped non-slip strips.
    for side in [-1,1]:
        y=side*.50
        m.box((-.71,y-.11,.36),(-.25,y+.11,.414),GUARD,.007)
        for x in np.arange(-.67,-.29,.068):m.box((x,y-.083,.415),(x+.025,y+.083,.423),STEEL,.002)
        m.box((-.95,y-side*.025,.56),(-.46,y+side*.025,.87),PAINT,.008) if side==1 else m.box((-.95,y-.025,.56),(-.46,y+.025,.87),PAINT,.008)
        for x in [-1.26,-.97,-.43]:m.cyl((x,y,.51),(x,y+side*.015,.51),.012,CHROME,8)
        # Unlettered rear grille vents and lamps.
        for x in np.linspace(-1.73,-1.38,6):m.box((x-.009,side*.506-.006,.89),(x+.009,side*.506+.006,1.075),DARK,.002)
        rounded_box(m,(-1.922,side*.33,.90),(.025,.145,.070),.012,RED,4)
        rounded_box(m,(-1.927,side*.33,1.01),(.025,.145,.055),.010,AMBER,4)
        fender(m,-.055,side*.49,.385,.285)
        fender(m,-1.50,side*.475,.31,.25)
    # Rear tow pin and small central service cover.
    m.box((-1.950,-.11,.31),(-1.883,.11,.415),GUARD,.012)
    m.cyl((-1.914,0,.335),(-1.914,0,.445),.020,CHROME,20)
    _tag(m,'body',start)


def cab(m):
    start=len(m.tri)
    # Seat cushion and padded back, distinct from the body and the seated driver.
    rounded_box(m,(-.80,0,1.015),(.49,.55,.080),.035,SEAT,8)
    rounded_box(m,(-1.07,0,1.345),(.115,.53,.57),.052,SEAT,8)
    m.box((-.99,-.20,.77),(-.61,.20,.97),GUARD,.015)
    for y in [-.19,.19]:
        m.box((-1.088,y-.009,1.12),(-1.010,y+.009,1.55),DARK,.003)
        m.cyl((-1.01,y,.985),(-.65,y,.985),.019,STEEL,16)
    # Slanted dark-gray overhead guard, with individual open roof slats.
    for side in [-1,1]:
        y=side*.50
        m.beam((-1.45,y,1.08),(-1.54,y,2.14),.078,GUARD)
        m.beam((.16,y,.70),(-.075,y,2.14),.085,GUARD)
        m.box((-1.595,y-.055,2.13),(-.01,y+.055,2.225),GUARD,.017)
        for x,z in [(-1.448,1.105),(.146,.746)]:m.cyl((x,y-side*.035,z),(x,y+side*.048,z),.014,CHROME,8)
        rounded_box(m,(-.018,side*.55,1.78),(.082,.035,.14),.010,GUARD,6)
        rounded_box(m,(.029,side*.55,1.78),(.013,.029,.114),.005,AMBER,4)
    for x in [-1.56,-.045]:m.box((x-.042,-.552,2.13),(x+.042,.552,2.225),GUARD,.013)
    for x in np.linspace(-1.38,-.24,6):m.box((x-.028,-.485,2.155),(x+.028,.485,2.205),GUARD,.007)
    # Tilted steering column; wheel ring and spokes are real 3D geometry.
    center=np.array([-.08,0,1.27]);normal=np.array([.75,0,.66]);normal/=np.linalg.norm(normal)
    u=np.array([0,1,0]);v=np.cross(normal,u)
    m.cyl((.10,0,.615),center-normal*.05,.028,GUARD,24)
    torus_path(m,center,u,v,.18,.018,SEAT,48)
    m.cyl(center-normal*.027,center+normal*.026,.041,GUARD,24)
    for a in [0,math.tau/3,2*math.tau/3]:m.cyl(center,center+.164*(u*math.cos(a)+v*math.sin(a)),.009,GUARD,14)
    # Two hydraulic control levers, pedals and dashboard housing without text.
    rounded_box(m,(-.265,.32,.955),(.32,.18,.105),.022,GUARD,6)
    for y in [.28,.36]:
        m.cyl((-.21,y,.99),(-.12,y,1.19),.011,CHROME,16)
        rounded_box(m,(-.12,y,1.20),(.051,.048,.069),.022,SEAT,6)
    for y in [-.15,.15]:
        m.box((-.08,y-.055,.574),(.04,y+.055,.604),GUARD,.004)
        for x in [-.055,-.012,.021]:m.box((x,y-.045,.605),(x+.012,y+.045,.612),STEEL,.002)
    rounded_box(m,(.08,0,1.035),(.22,.37,.19),.033,GUARD,8)
    m.box((-.041,-.092,1.07),(-.033,.092,1.145),DARK,.004)
    _tag(m,'cab',start)


def mast_and_forks(m):
    start=len(m.tri)
    for y in [-.385,.385]:
        m.box((.315,y-.068,.22),(.435,y+.068,2.08),GUARD,.012)
        m.box((.438,y-.035,.30),(.454,y+.035,2.025),CAST,.004)
        m.box((.455,y-.018,.41),(.466,y+.018,1.995),CHROME,.002)
        for z in [.32,1.93]:m.cyl((.434,y,z),(.475,y,z),.034,CAST,24)
    for z in [.265,1.975]:m.box((.302,-.455,z),(.445,.455,z+.093),GUARD,.013)
    # Lift cylinder, piston, chain pulley and a pair of visible lifting chains.
    m.cyl((.375,0,.32),(.375,0,1.28),.061,GUARD,40)
    for z in [.35,1.22]:m.cyl((.375,0,z),(.375,0,z+.032),.071,CAST,32)
    m.cyl((.375,0,1.28),(.375,0,1.89),.026,CHROME,28)
    m.cyl((.341,0,1.845),(.445,0,1.845),.105,GUARD,40)
    m.cyl((.446,0,1.845),(.458,0,1.845),.078,CAST,32)
    for y in [-.088,.088]:
        for j,z in enumerate(np.arange(.41,1.79,.034)):
            m.box((.398,y-.014,z),(.419,y+.014,z+.023),CAST,.003)
            m.cyl((.391,y,z+.010),(.429,y,z+.010),.007,CHROME,10)
    for y in [-.32,.32]:
        m.cyl((.035,y,.405),(.245,y,.515),.039,GUARD,24)
        m.cyl((.23,y,.507),(.36,y,.575),.016,CHROME,20)
    # Load backrest and transverse carriage stay behind the pallet's X=.50 edge.
    for z in [.345,.66,1.155]:m.box((.450,-.48,z),(.495,.48,z+.063),GUARD,.009)
    for y in [-.457,.457]:m.box((.45,y-.024,.35),(.495,y+.024,1.21),GUARD,.007)
    for y in np.linspace(-.34,.34,7):m.box((.458,y-.011,.41),(.485,y+.011,1.17),GUARD,.004)
    for y in [-.2,.2]:
        m.box((.425,y-.061,.605),(.495,y+.061,.715),CAST,.008)
        m.cyl((.442,y,.712),(.442,y,.746),.011,CHROME,14)
    _tag(m,'mast',start)
    start=len(m.tri)
    for y in [-.20,.20]:
        m.box((.373,y-.0525,.282),(.447,y+.0525,1.02),CAST,.012)
        # Flat upper bearing surface Z=.33 contacts the pallet pocket roof.
        profile_extrusion(m,[(.435,.275),(1.82,.275),(1.94,.305),(1.94,.330),(.435,.330)],y-.0525,y+.0525,CAST)
        m.box((.428,y-.0525,.305),(.485,y+.0525,.365),CAST,.012)
        m.box((.372,y-.059,.96),(.468,y+.059,1.025),GUARD,.006)
    _tag(m,'forks',start)
    m.forkRootM=[.53,.20,.330];m.forkTipM=[1.90,.20,.330]
    m.forkBearingSurfaceZM=.33;m.forkCentersYM=[-.20,.20]
    m.forkSurfaceBoundsM=[[[.50,-.2525,.33],[1.82,-.1475,.33]],[[.50,.1475,.33],[1.82,.2525,.33]]]


def _append_model(m,other,shift=None,name=None,dynamic=False):
    start=len(m.tri);offset=np.zeros(3) if shift is None else np.asarray(shift,float)
    m.tri.extend([np.asarray(t)+offset for t in other.tri]);m.norm.extend([np.asarray(n).copy() for n in other.norm]);m.mat.extend(other.mat)
    m.boxes.extend([np.asarray(b)+offset for b in other.boxes])
    if name:_tag(m,name,start,dynamic)
    return start


def build_forklift(phase=0,loaded=False):
    phase=_phase(phase);m=Model();m.dynamicTriangleRanges=[];m.componentTriangleRanges={}
    chassis(m)
    for x,r,width in [(-1.50,.31,.215),(-.055,.385,.255)]:
        for y in [-.49,.49]:wheel(m,x,y,r,width,phase)
    cab(m);mast_and_forks(m)
    from driver import build_driver
    driver=build_driver(phase);_append_model(m,driver,name='driver',dynamic=True)
    if loaded:
        from pallet import build_pallet
        load=build_pallet();start=_append_model(m,load,LOAD_SHIFT,'load')
        m.windowGroups=[dict(g,triangleRanges=[[a+start,b+start] for a,b in g.get('triangleRanges',[])],
                              centerMeters=(np.asarray(g['centerMeters'])+LOAD_SHIFT).tolist()) for g in load.windowGroups]
        m.loadTransform4=LOAD_TRANSFORM.tolist()
        m.loadTransform=m.loadTransform4
    m.anchorSourceM=[0.,0.,0.]
    m.animation={'kind':'forklift-drive','phase':phase,'loaded':bool(loaded),'frames':6,'fps':8,'loop':True,
                 'vehicleTranslationMeters':[0.,0.,0.],'anchorSourceM':[0.,0.,0.],
                 'forwardAxisSource':[1.,0.,0.],'wheelRotationAxis':[0.,1.,0.],
                 'wheelAngleRadians':math.tau*phase,'wheelTreadBlocks':23,'wheelHubBolts':5,
                 'wheelValveAsymmetry':True,'driverSubtleMotion':True,
                 'forkTopZ':.33,'palletBottomZ':.18 if loaded else None,
                 'loadTransform4':LOAD_TRANSFORM.tolist() if loaded else None}
    m.layout={'seatCenterM':[-.8,0,1.015],'steeringCenterM':[-.08,0,1.27],
              'roofTopZM':2.225,'palletLiftZM':.18,'combinedFloorOriginM':[0.,0.,0.],
              'referenceAppearance':'muted-green standard forklift, dark gray open overhead guard and mast'}
    return cleanup(m)


if __name__=='__main__':
    import json
    for loaded in [False,True]:
        m=build_forklift(0,loaded);p=np.asarray(m.tri).reshape(-1,3)
        print(json.dumps({'loaded':loaded,'triangles':len(m.tri),'boundsM':[p.min(0).tolist(),p.max(0).tolist()],
                          'forkRootM':m.forkRootM,'forkTipM':m.forkTipM,'loadTransform4':getattr(m,'loadTransform4',None)}))
