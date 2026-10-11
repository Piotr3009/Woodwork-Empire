"""A seated 3D forklift driver facing +X, in the shared vehicle coordinates.

Seat top: (-.80, 0, 1.055).  Steering wheel: (-.08, 0, 1.27).
The pelvis and shoes stay put.  A small periodic upper-body motion changes
real geometry; both hands keep their grip on the steering wheel.
"""
from __future__ import annotations
import math
import numpy as np
from common import Model

NAVY = ((41,56,70),.05,.74,0)
NAVY_LIGHT = ((52,68,80),.045,.76,0)
SEAM = ((30,42,53),.035,.79,0)
VEST = ((179,196,65),.07,.64,0)
REFLECTOR = ((199,215,205),.39,.29,0)
SKIN = ((185,137,105),.065,.67,0)
SKIN_SHADE = ((169,117,89),.05,.71,0)
HAIR = ((51,43,37),.035,.85,0)
FEATURE = ((78,59,49),.03,.75,0)
BOOT = ((48,47,44),.055,.73,0)
SOLE = ((27,29,29),.035,.84,0)

HIP=np.array([-.78,0.,1.105])
HEAD=np.array([-.775,0.,1.875])
HANDS={side:np.array([-.080,side*.155,1.300]) for side in [-1,1]}


def _unit(a):
    a=np.asarray(a,float)
    return a/max(float(np.linalg.norm(a)),1e-14)


def _rotation(axis,angle):
    a=_unit(axis);x,y,z=a
    skew=np.array([[0.,-z,y],[z,0.,-x],[-y,x,0.]])
    return np.eye(3)*math.cos(angle)+(1.-math.cos(angle))*np.outer(a,a)+math.sin(angle)*skew


def _triangle(m,vertices,normals,mat):
    vertices=np.asarray(vertices,float);normals=np.asarray(normals,float)
    cross=np.cross(vertices[1]-vertices[0],vertices[2]-vertices[0])
    if np.linalg.norm(cross)<1e-13:return
    if np.dot(cross,normals.sum(0))<0:
        vertices=vertices[[0,2,1]];normals=normals[[0,2,1]]
    m.tri.append(vertices);m.norm.append(normals);m.mat.append(mat)


def _ellipsoid(m,center,radii,mat,rotation=None,nu=24,nv=12,hair=False):
    c=np.asarray(center,float);r=np.asarray(radii,float)
    rotation=np.eye(3) if rotation is None else np.asarray(rotation,float)
    for j in range(nv):
        for i in range(nu):
            vertices=[];normals=[]
            for row,col in [(j,i),(j,i+1),(j+1,i+1),(j+1,i)]:
                theta=math.tau*(col%nu)/nu
                # A shaped short-hair cap: higher at the forehead, lower behind.
                limit=1.45-.34*math.cos(theta) if hair else math.pi
                phi=limit*row/nv
                unit=np.array([math.sin(phi)*math.cos(theta),math.sin(phi)*math.sin(theta),math.cos(phi)])
                vertices.append(c+rotation@(unit*r))
                normals.append(rotation@_unit(unit/r))
            for ids in [(0,1,2),(0,2,3)]:
                _triangle(m,[vertices[k] for k in ids],[normals[k] for k in ids],mat)


def _limb(m,a,b,r0,r1,mat,nu=20):
    """Tapered elliptical limb, with smooth vertex normals and rounded ends."""
    a=np.asarray(a,float);b=np.asarray(b,float);axis=_unit(b-a)
    seed=np.array([0.,1.,0.]) if abs(axis[1])<.85 else np.array([0.,0.,1.])
    u=_unit(np.cross(axis,seed));v=np.cross(axis,u)
    taper=(r0-r1)/max(np.linalg.norm(b-a),1e-10)
    for i in range(nu):
        a0=math.tau*i/nu;a1=math.tau*(i+1)/nu
        rads=[u*math.cos(t)+v*math.sin(t) for t in [a0,a1]]
        normals=[_unit(rad+axis*taper) for rad in rads]
        pts=[a+rads[0]*r0,a+rads[1]*r0,b+rads[1]*r1,b+rads[0]*r1]
        ns=[normals[0],normals[1],normals[1],normals[0]]
        for ids in [(0,1,2),(0,2,3)]:_triangle(m,[pts[k] for k in ids],[ns[k] for k in ids],mat)
    _ellipsoid(m,a,(r0,r0,r0),mat,nu=16,nv=8)
    _ellipsoid(m,b,(r1,r1,r1),mat,nu=16,nv=8)


def _transform_since(m,start,matrix,pivot,offset=None):
    pivot=np.asarray(pivot,float);offset=np.zeros(3) if offset is None else np.asarray(offset,float)
    for i in range(start,len(m.tri)):
        m.tri[i]=(np.asarray(m.tri[i])-pivot)@matrix.T+pivot+offset
        m.norm[i]=np.asarray(m.norm[i])@matrix.T


def _torso(m):
    # Cross-sections create a real tapered chest and shoulder silhouette.
    # Extra levels define two continuous reflective waist/chest bands.
    levels=[(1.175,-.782,.136,.143),(1.215,-.782,.140,.150),
            (1.285,-.780,.142,.158),(1.325,-.778,.143,.161),
            (1.425,-.769,.146,.174),(1.465,-.765,.148,.180),
            (1.535,-.756,.149,.191),(1.615,-.752,.138,.190),
            (1.665,-.758,.108,.147),(1.700,-.765,.067,.085)]
    nu=40
    for j in range(len(levels)-1):
        zmid=(levels[j][0]+levels[j+1][0])/2
        for i in range(nu):
            vertices=[];normals=[];tmid=math.tau*(i+.5)/nu
            for row,col in [(j,i),(j,i+1),(j+1,i+1),(j+1,i)]:
                z,x,rx,ry=levels[row];t=math.tau*(col%nu)/nu
                vertices.append((x+rx*math.cos(t),ry*math.sin(t),z))
                normals.append(_unit((math.cos(t)/rx,math.sin(t)/ry,0.)))
            # Open-front waistcoat, with a navy collar and small front opening.
            front=math.cos(tmid)>.88
            opening=(abs(math.sin(tmid))<.10 and math.cos(tmid)>0) or (front and zmid>1.61)
            material=NAVY if zmid<1.215 or zmid>1.665 or opening else VEST
            horizontal=(1.285<zmid<1.325) or (1.425<zmid<1.465)
            vertical=.40<abs(math.sin(tmid))<.65 and zmid>1.465
            if material==VEST and (horizontal or vertical):material=REFLECTOR
            for ids in [(0,1,2),(0,2,3)]:_triangle(m,[vertices[k] for k in ids],[normals[k] for k in ids],material)
    # A rounded shirt collar, not a flat coloured rectangle.
    _ellipsoid(m,(-.765,0.,1.687),(.080,.094,.043),NAVY_LIGHT,nu=24,nv=10)


def _head(m,phase,body_matrix):
    neck=np.array([-.765,0.,1.722])
    _limb(m,neck+np.array([0.,0.,-.025]),neck+np.array([0.,0.,.055]),.050,.046,SKIN,16)
    head_start=len(m.tri)
    _ellipsoid(m,HEAD,(.107,.092,.142),SKIN,nu=28,nv=16)
    _ellipsoid(m,HEAD+np.array([.0,.0,.003]),(.109,.094,.145),HAIR,nu=28,nv=12,hair=True)
    for side in [-1,1]:
        _ellipsoid(m,HEAD+np.array([-.008,side*.090,-.012]),(.020,.013,.031),SKIN,nu=16,nv=8)
        _ellipsoid(m,HEAD+np.array([.096,side*.038,.021]),(.004,.009,.0045),FEATURE,nu=12,nv=6)
        # Small eyebrow contour remains unobtrusive at sprite scale.
        m.cyl(HEAD+np.array([.094,side*.051,.037]),HEAD+np.array([.100,side*.027,.038]),.0035,HAIR,8)
    _ellipsoid(m,HEAD+np.array([.106,0.,-.013]),(.023,.021,.032),SKIN,nu=16,nv=10)
    _ellipsoid(m,HEAD+np.array([.102,0.,-.061]),(.006,.022,.0035),SKIN_SHADE,nu=12,nv=6)
    yaw=math.radians(1.7)*math.sin(math.tau*phase)
    nod=math.radians(.8)*math.sin(math.tau*phase+math.pi/3)-math.radians(.8)*math.sin(math.pi/3)
    rot=_rotation((0,0,1),yaw)@_rotation((0,1,0),nod)
    _transform_since(m,head_start,rot,HEAD)


def _hand(m,center,side):
    center=np.asarray(center,float)
    _ellipsoid(m,center,(.043,.033,.038),SKIN,nu=20,nv=10)
    _ellipsoid(m,center+np.array([-.014,-side*.026,.015]),(.022,.013,.024),SKIN,nu=16,nv=8)
    # Three grouped finger arcs curl over the rim, rather than a block fist.
    for k in range(3):
        yy=center[1]+(k-1)*.014
        points=[(center[0]-.012,yy,center[2]+.027),
                (center[0]+.027,yy,center[2]+.013),
                (center[0]+.030,yy,center[2]-.010)]
        for a,b in zip(points[:-1],points[1:]):m.cyl(a,b,.009,SKIN,10)


def build_driver(phase=0):
    """Return the seated driver only; the forklift owns seat and controls."""
    phase=float(phase)%1.
    if abs(phase)<1e-12 or abs(phase-1)<1e-12:phase=0.
    m=Model();m.dynamicTriangleRanges=[]
    # Pelvis, legs and boots stay planted on the seat and pedal area.
    _ellipsoid(m,HIP,(.175,.202,.103),NAVY,nu=28,nv=12)
    for side in [-1,1]:
        hip=np.array([-.754,side*.116,1.077]);knee=np.array([-.430,side*.155,.845])
        ankle=np.array([-.158,side*.149,.631])
        _limb(m,hip,knee,.102,.083,NAVY,24)
        _limb(m,knee,ankle,.081,.054,NAVY,24)
        _ellipsoid(m,knee+np.array([.017,0.,.020]),(.090,.083,.085),NAVY_LIGHT,nu=20,nv=10)
        _ellipsoid(m,(-.105,side*.148,.591),(.139,.068,.060),BOOT,nu=24,nv=12)
        _ellipsoid(m,(-.101,side*.148,.554),(.139,.069,.026),SOLE,nu=24,nv=10)
        # Boot tongue and one broad lacing seam, without text or logos.
        _ellipsoid(m,(-.114,side*.148,.633),(.072,.039,.021),BOOT,nu=16,nv=8)
    upper_start=len(m.tri)
    lean=math.radians(1.25)*math.sin(math.tau*phase)
    lateral=math.radians(.35)*math.sin(math.tau*phase)
    body_matrix=_rotation((1,0,0),lateral)@_rotation((0,1,0),lean)
    _torso(m);_head(m,phase,body_matrix)
    _transform_since(m,upper_start,body_matrix,HIP)
    for side in [-1,1]:
        shoulder0=np.array([-.752,side*.182,1.602])
        shoulder=HIP+body_matrix@(shoulder0-HIP)
        elbow0=np.array([-.414,side*.225,1.393])
        elbow=elbow0+.48*(shoulder-shoulder0)
        hand=HANDS[side]
        wrist=hand+np.array([-.049,side*.015,.008])
        _limb(m,shoulder,elbow,.079,.061,NAVY,22)
        _limb(m,elbow,wrist,.061,.043,NAVY_LIGHT,22)
        cuff=(wrist-elbow);cuff=_unit(cuff)*.034
        _limb(m,wrist-cuff,wrist,.046,.044,SEAM,16)
        _hand(m,hand,side)
    m.dynamicTriangleRanges.append([upper_start,len(m.tri)])
    m.animation={'driverPhase':phase,'bodyLeanDegrees':math.degrees(lean),
                 'headYawDegrees':1.7*math.sin(math.tau*phase),
                 'handsOnWheel':{str(k):v.tolist() for k,v in HANDS.items()},
                 'pelvisFixed':HIP.tolist(),'wheelCenter':[-.08,0.,1.27],
                 'wholeVehicleBob':False,'facing':'+X'}
    m.parts.append({'part':'seated forklift driver','facing':'+X','seatTop':[-.80,0.,1.055]})
    return m
