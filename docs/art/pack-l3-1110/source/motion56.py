"""Metric, cyclic motion helpers for finishing modules 5 and 6."""
import math
import numpy as np
from common import Model


def phase01(p):
    p=float(p)%1.0
    return 0.0 if abs(p)<1e-12 or abs(p-1)<1e-12 else p


def keys(p, values):
    """Keyframes indexed 0..12, with a repeated boundary key at 12."""
    f=phase01(p)*12.; i=int(math.floor(f)); u=f-i
    a=np.asarray(values[i],float);b=np.asarray(values[i+1],float)
    return a*(1-u)+b*u


def tag(m,start):
    if not hasattr(m,'dynamicTriangleRanges'):m.dynamicTriangleRanges=[]
    if len(m.tri)>start:m.dynamicTriangleRanges.append([start,len(m.tri)])


def transform(m,R=None,offset=None,pivot=None):
    R=np.eye(3) if R is None else np.asarray(R,float)
    offset=np.zeros(3) if offset is None else np.asarray(offset,float)
    pivot=np.zeros(3) if pivot is None else np.asarray(pivot,float)
    m.tri=[(t-pivot)@R.T+pivot+offset for t in m.tri]
    m.norm=[n@R.T for n in m.norm]
    boxes=[]
    for b in m.boxes:
        v=np.array([[x,y,z] for x in b[:,0] for y in b[:,1] for z in b[:,2]])
        v=(v-pivot)@R.T+pivot+offset;boxes.append(np.array([v.min(0),v.max(0)]))
    m.boxes=boxes
    return m


def append(m,q,dynamic=True):
    start=len(m.tri)
    m.tri.extend(q.tri);m.norm.extend(q.norm);m.mat.extend(q.mat);m.boxes.extend(q.boxes)
    if dynamic:tag(m,start)


def clipped_x(m,lo=0.,hi=6.):
    """Clip actual mesh polygons at module/booth portals, never output pixels."""
    q=Model()
    for tri,norm,mat in zip(m.tri,m.norm,m.mat):
        v=[(p.copy(),n.copy()) for p,n in zip(tri,norm)]
        for edge,sign in [(lo,1),(hi,-1)]:
            out=[]
            for j,(b,nb) in enumerate(v):
                a,na=v[j-1];ina=sign*(a[0]-edge)>=-1e-10;inb=sign*(b[0]-edge)>=-1e-10
                if ina!=inb:
                    t=(edge-a[0])/(b[0]-a[0]);p=a+t*(b-a);n=na+t*(nb-na)
                    n/=max(1e-12,np.linalg.norm(n));p[0]=edge;out.append((p,n))
                if inb:out.append((b,nb))
            v=out
            if not v:break
        for j in range(1,len(v)-1):
            ids=[0,j,j+1];pts=np.array([v[k][0] for k in ids]);ns=np.array([v[k][1] for k in ids])
            if np.linalg.norm(np.cross(pts[1]-pts[0],pts[2]-pts[0]))>1e-12:
                q.tri.append(pts);q.norm.append(ns);q.mat.append(mat)
    return q


def window_rotation(amount):
    """0=original upright XZ frame; 1=flat with its 1.44 m axis along X."""
    a=float(amount)*math.pi/2;c=math.cos(a);s=math.sin(a)
    rx=np.array([[1,0,0],[0,c,-s],[0,s,c]])
    ry=np.array([[c,0,s],[0,1,0],[-s,0,c]])
    return rx@ry


def solve_elbow(shoulder,wrist,baseline_elbow,baseline_wrist,reference=None):
    """Two-link inverse kinematics: arm segment lengths never stretch."""
    S=np.asarray(shoulder,float);W=np.asarray(wrist,float);E=np.asarray(baseline_elbow,float)
    l1=np.linalg.norm(E-S);l2=np.linalg.norm(np.asarray(baseline_wrist)-E)
    D=W-S;d=np.linalg.norm(D);U=D/d
    if d>l1+l2+1e-7 or d<abs(l1-l2)-1e-7:raise ValueError(('Unreachable robot wrist',d,l1,l2,W.tolist()))
    a=(l1*l1-l2*l2+d*d)/(2*d);h=math.sqrt(max(0,l1*l1-a*a))
    ref=E if reference is None else np.asarray(reference,float)
    v=ref-S-np.dot(ref-S,U)*U;v/=np.linalg.norm(v)
    return S+a*U+h*v


def state6(p):
    p=phase01(p)
    centers=[(.67,1.50,1.69),(1.06,1.50,1.69),(1.67,1.50,1.90),
      (2.42,1.54,1.044),(2.42,1.54,1.044),(2.42,1.54,1.044),
      (2.91,1.68,1.26),(3.72,1.95,1.85),(5.09,1.96,1.69),
      (5.225,2.01,.99),(5.225,2.01,.948),(5.225,2.01,.948),(.67,1.50,1.69)]
    rotations=[0,0,.50,1,1,1,1,.53,.08,0,0,0,0]
    zlift=[1.48,1.48,1.42,1.25,1.114,1.32,1.48,1.48,1.48,1.48,1.48,1.48,1.48]
    R=window_rotation(float(keys(p,rotations)));center=keys(p,centers)
    neutral=np.array([3.55,1.51,1.70])
    pick=np.array([2.42,1.54,1.214])
    if p<5/12:
        tool=keys(p,[neutral,neutral,(3.20,1.56,1.64),(2.93,1.55,1.49),(2.67,1.54,1.30),pick,
                     pick,pick,pick,pick,pick,neutral,neutral])
        grip=np.eye(3)
    elif p<=10/12:
        tool=center+R@np.array([0,.17,0]);grip=R@window_rotation(1).T
    else:
        release=np.array([5.225,2.18,.948]);u=min(1.,(p-10/12)/(1/12))
        tool=release*(1-u)+neutral*u;grip=window_rotation(u)@window_rotation(1).T if u<1 else np.eye(3)
    if p==0:
        wrist=np.array([3.66,1.18,2.04]);elbow=np.array([4.10,.69,1.90])
    else:
        S=np.array([3.80,.55,.91]);v=S-tool+np.array([0,0,.52]);v/=np.linalg.norm(v)
        baseline_offset=np.array([.11,-.33,.34]);length=np.linalg.norm(baseline_offset)
        # The spherical wrist changes orientation independently of the tool.
        blend=min(1.,p*6.) if p<10/12 else max(0.,(11/12-p)*12.)
        direction=(1-blend)*baseline_offset/length+blend*v;direction/=np.linalg.norm(direction)
        wrist=tool+direction*length
        l1=np.linalg.norm(np.array([4.10,.69,1.90])-S)
        l2=np.linalg.norm(np.array([3.66,1.18,2.04])-np.array([4.10,.69,1.90]))
        if np.linalg.norm(wrist-S)>l1+l2-.002:
            # At the distant edge of the pallet, straighten the wrist toward
            # the shoulder instead of stretching either rigid arm segment.
            direction=(S-tool)/np.linalg.norm(S-tool);wrist=tool+direction*length
        activity=min(1.,p*6.) if p<10/12 else max(0.,(11/12-p)*12.)
        ref=np.array([4.10,.69,1.90])*(1-activity)+np.array([4.15,1.10,2.25])*activity
        elbow=solve_elbow(S,wrist,(4.10,.69,1.90),(3.66,1.18,2.04),reference=ref)
    hook=float(keys(p,[.67,1.06,1.67,2.42,2.63,3.18,3.8,4.45,5.12,5.78,6.50,6.8,.67]))
    return dict(phase=p,frameCenter=center,frameRotation=R,liftZ=float(keys(p,zlift)),
                tool=tool,wrist=wrist,elbow=elbow,gripRotation=grip,hookX=hook,
                carriedVisible=p<11/12,glazed=p>=4/12)
