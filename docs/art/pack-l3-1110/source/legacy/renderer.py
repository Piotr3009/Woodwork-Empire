"""Deterministic 2:1 orthographic asset-production renderer.
Adapted from the delivered package-1 renderer. No game or repository code.
Units: metres; camera and lighting fixed; rotations apply to geometry, not PNGs.
"""
from __future__ import annotations
import math
from pathlib import Path
import numpy as np
from numba import njit
from PIL import Image
STEEL=((153,168,179),.44,.29,1)
ALU=((187,198,204),.32,.34,1)
CHROME=((180,191,196),.57,.20,1)
DARK=((38,48,53),.10,.55,0)
RUBBER=((25,31,34),.04,.78,0)
GLASS=((25,47,52),.32,.20,2)
PANE=((106,160,166),.17,.22,5)
RED=((197,46,30),.15,.42,0)
YELLOW=((227,174,31),.13,.44,0)
GREEN=((45,146,62),.13,.4,0)
PALETTE=[(111,144,113),(196,205,205),(65,126,88),(31,87,59),(44,102,167)]
class Model:
 def __init__(self):
  self.tri=[]; self.norm=[]; self.mat=[]; self.parts=[]; self.boxes=[]
 def polygon(self,vs,mat,norms=None):
  v=np.array(vs,float)
  n=np.cross(v[1]-v[0],v[2]-v[0]); mag=np.linalg.norm(n)
  if mag<1e-10:return
  n/=mag
  ns=np.tile(n,(len(v),1)) if norms is None else np.asarray(norms,float)
  for i in range(1,len(v)-1):
   ids=[0,i,i+1]; self.tri.append(v[ids]);self.norm.append(ns[ids]);self.mat.append(mat)
 def quad(self,vs,n,mat):
  v=np.asarray(vs,float)
  if np.dot(np.cross(v[1]-v[0],v[2]-v[0]),n)<0:v=v[::-1]
  self.polygon(v,mat,np.tile(n,(len(v),1)))
 def box(self,lo,hi,mat,bevel=.006,name=''):
  lo=np.asarray(lo,float);hi=np.asarray(hi,float); c=(hi+lo)*.5; h=(hi-lo)*.5
  if np.any(h<=0):return
  self.boxes.append(np.array([lo,hi]))
  b=min(float(bevel),float(h.min())*.28)
  if name:self.parts.append({'part':name,'min':lo.tolist(),'max':hi.tolist()})
  for ax in range(3):
   uv=[k for k in range(3) if k!=ax]
   for s in [-1,1]:
    pts=[]
    for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]:
     p=c.copy();p[ax]+=s*h[ax];p[uv[0]]+=u*(h[uv[0]]-b);p[uv[1]]+=v*(h[uv[1]]-b);pts.append(p)
    n=np.zeros(3);n[ax]=s; self.quad(pts,n,mat)
  if b<=0:return
  for ax in range(3):
   for bx in range(ax+1,3):
    cx=3-ax-bx
    for sa in [-1,1]:
     for sb in [-1,1]:
      pts=[]
      for k,t in [(0,-1),(1,-1),(1,1),(0,1)]:
       p=c.copy();p[ax]+=sa*(h[ax]-(b if k else 0));p[bx]+=sb*(h[bx]-(0 if k else b));p[cx]+=t*(h[cx]-b);pts.append(p)
      n=np.zeros(3);n[ax]=sa/math.sqrt(2);n[bx]=sb/math.sqrt(2);self.quad(pts,n,mat)
  for sx in [-1,1]:
   for sy in [-1,1]:
    for sz in [-1,1]:
     signs=np.array([sx,sy,sz]);pts=[]
     for i in range(3):
      p=c+signs*(h-b);p[i]+=signs[i]*b;pts.append(p)
     self.quad(pts,signs/math.sqrt(3),mat)
 def cyl(self,p0,p1,r,mat,n=20,cap=True):
  p0=np.array(p0,float);p1=np.array(p1,float);axis=p1-p0; length=np.linalg.norm(axis)
  if length<1e-8:return
  axis/=length; seed=np.array([1,0,0]) if abs(axis[0])<.8 else np.array([0,1,0])
  u=np.cross(axis,seed);u/=np.linalg.norm(u);v=np.cross(axis,u)
  radial=[u*math.cos(2*math.pi*i/n)+v*math.sin(2*math.pi*i/n) for i in range(n)]
  for i in range(n):
   j=(i+1)%n; a=radial[i];b=radial[j]
   self.polygon([p0+r*a,p0+r*b,p1+r*b,p1+r*a],mat,[a,b,b,a])
  if cap:
   self.polygon([p0+r*q for q in radial][::-1],mat,np.tile(-axis,(n,1)))
   self.polygon([p1+r*q for q in radial],mat,np.tile(axis,(n,1)))
 def tube(self,x,y,z,h,r,mat=STEEL):
  n=24; ri=r*.79
  self.cyl((x,y,z),(x,y,z+h),r,mat,n,False)
  self.cyl((x,y,z+.01),(x,y,z+.014),ri,DARK,n,True)
  for i in range(n):
   a=2*math.pi*i/n;b=2*math.pi*(i+1)/n
   vs=[(x+r*math.cos(a),y+r*math.sin(a),z+h),(x+r*math.cos(b),y+r*math.sin(b),z+h),(x+ri*math.cos(b),y+ri*math.sin(b),z+h),(x+ri*math.cos(a),y+ri*math.sin(a),z+h)]
   self.quad(vs,[0,0,1],ALU)
   self.quad([(x+ri*math.cos(a),y+ri*math.sin(a),z+h),(x+ri*math.cos(b),y+ri*math.sin(b),z+h),(x+ri*math.cos(b),y+ri*math.sin(b),z+.02),(x+ri*math.cos(a),y+ri*math.sin(a),z+.02)],[-math.cos((a+b)/2),-math.sin((a+b)/2),0],DARK)
  self.cyl((x,y,z-.012),(x,y,z+.018),r*1.18,DARK,n)
 def beam(self,p0,p1,width,mat):
  # Square beam along arbitrary line, with correctly oriented end faces.
  a=np.asarray(p0,float);b=np.asarray(p1,float);t=b-a;t/=np.linalg.norm(t)
  e=np.array([0.,0.,1.]) if abs(t[2])<.9 else np.array([0.,1.,0.])
  u=np.cross(t,e);u/=np.linalg.norm(u);v=np.cross(t,u)
  ring=[(u*s+v*q)*width*.5 for s,q in [(-1,-1),(1,-1),(1,1),(-1,1)]]
  self.quad([a+p for p in ring],-t,mat);self.quad([b+p for p in ring],t,mat)
  for i in range(4):
   j=(i+1)%4;n=ring[i]+ring[j];n/=np.linalg.norm(n);self.quad([a+ring[i],a+ring[j],b+ring[j],b+ring[i]],n,mat)
 def bolt(self,x,y,z,axis='y',r=.015):
  vec=np.array([0,1,0]) if axis=='y' else (np.array([1,0,0]) if axis=='x' else np.array([0,0,1]))
  a=np.array([x,y,z]);self.cyl(a,a+vec*.011,r,CHROME,6)
 def wheel(self,x,y,z,r=.064):
  n=24
  for i in range(n):
   a=2*math.pi*i/n;b=2*math.pi*(i+1)/n
   self.cyl((x+r*math.cos(a),y,z+r*math.sin(a)),(x+r*math.cos(b),y,z+r*math.sin(b)),r*.115,RUBBER,8)
  self.cyl((x,y-.02,z),(x,y+.035,z),r*.24,CHROME,12)
  for a in [0,2*math.pi/3,4*math.pi/3]:
   self.cyl((x,y,z),(x+r*.88*math.cos(a),y,z+r*.88*math.sin(a)),r*.065,STEEL,8)
 def feet(self,x,y,h=.085,r=.035):
  self.cyl((x,y,0.),(x,y,.023),r,RUBBER,16)
  self.cyl((x,y,.023),(x,y,h),r*.34,CHROME,12)
 def controls(self,x,y,z,monitor=False,w=.18):
  self.box((x-w*.5,y-.055,z),(x+w*.5,y,z+.16 if monitor else z+.10),DARK,.008)
  if monitor:
   self.box((x-w*.40,y+.001,z+.055),(x+w*.40,y+.008,z+.144),GLASS,.002)
  self.box((x-w*.34,y+.004,z+.012),(x-w*.12,y+.018,z+.046),YELLOW,.002)
  self.cyl((x-w*.23,y+.016,z+.03),(x-w*.23,y+.034,z+.03),.018,RED,16)
  self.cyl((x+w*.20,y+.007,z+.03),(x+w*.20,y+.024,z+.03),.010,GREEN,12)
 def vents(self,x,y,z,w=.20,count=4):
  for i in range(count): self.box((x,y,z+i*.026),(x+w,y+.006,z+i*.026+.008),DARK,.001)


def roller_table(m,x0,x1,y0,y1,z,paint,legs=True,spacing=.14,powered=False):
 if x1-x0<.04:return
 for y in [y0,y1-.055]:m.box((x0,y,z-.055),(x1,y+.055,z+.015),paint,.007)
 for x in [x0,x1-.045]:m.box((x,y0,z-.055),(x+.045,y1,z-.014),ALU,.004)
 n=max(2,int((x1-x0-.08)/spacing))
 for x in np.linspace(x0+.06,x1-.06,n):m.cyl((x,y0+.049,z),(x,y1-.049,z),.032 if not powered else .047,CHROME if not powered else RUBBER,18)
 if legs:
  for x in [x0+.045,x1-.045]:
   for y in [y0+.035,y1-.035]:
    m.box((x-.024,y-.024,.075),(x+.024,y+.024,z-.055),paint,.003)
    m.feet(x,y,.10,.035)
   m.box((x-.023,y0+.01,.22),(x+.023,y1-.01,.258),paint,.003)
  for y in [y0+.03,y1-.03]:m.box((x0+.04,y-.015,.22),(x1-.04,y+.015,.25),paint,.003)

def base_cabinet(m,x0,x1,y0,y1,z0,z1,paint,panels=3,feet=True):
 m.box((x0,y0,z0),(x1,y1,z1),paint,.015)
 m.box((x0-.006,y0-.006,z0),(x1+.006,y1+.006,z0+.047),DARK,.006)
 for i in range(1,panels):
  x=x0+(x1-x0)*i/panels
  m.box((x-.004,y1+.001,z0+.055),(x+.004,y1+.006,z1-.025),DARK,.001)
 for i in range(panels):
  x=x0+(x1-x0)*(i+.5)/panels
  m.vents(x-.075,y1+.006,z0+.13,.15,3)
  m.bolt(x+.10,y1+.007,z0+.11)
 if feet:
  for x in [x0+.06,x1-.06]:
   for y in [y0+.05,y1-.05]:m.feet(x,y,z0+.01,.04)


@njit(cache=True)
def raster(tris,normals,cols,props,aos,W,H,S,ox,oy,angle,w,d):
 HH=H*S;WW=W*S
 rgb=np.zeros((HH,WW,3),np.uint8); alpha=np.zeros((HH,WW),np.uint8);depth=np.full((HH,WW),-1e15)
 L=np.array([-0.33,0.48,0.812]); L=L/np.sqrt((L*L).sum())
 V=np.array([1.,1.,1.]);V=V/np.sqrt(3.)
 halfv=L+V;halfv=halfv/np.sqrt((halfv*halfv).sum())
 for ti in range(tris.shape[0]):
  P=tris[ti].copy();N=normals[ti].copy(); local=tris[ti]
  if angle==90:
   for k in range(3):
    x=P[k,0];y=P[k,1];P[k,0]=y;P[k,1]=w-x
    nx=N[k,0];ny=N[k,1];N[k,0]=ny;N[k,1]=-nx
  nav=(N[0]+N[1]+N[2])/3.
  if nav[0]+nav[1]+nav[2]<-1e-6:continue
  xy=np.empty((3,2));zz=np.empty(3)
  for k in range(3):
   xy[k,0]=(ox+48.*(P[k,0]-P[k,1]))*S
   xy[k,1]=(oy+24.*(P[k,0]+P[k,1])-48.*P[k,2])*S
   zz[k]=P[k,0]+P[k,1]+P[k,2]
  x0,y0=xy[0,0],xy[0,1];x1,y1=xy[1,0],xy[1,1];x2,y2=xy[2,0],xy[2,1]
  den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
  if abs(den)<1e-12:continue
  xmin=max(0,int(math.floor(min(x0,x1,x2))));xmax=min(WW-1,int(math.ceil(max(x0,x1,x2))))
  ymin=max(0,int(math.floor(min(y0,y1,y2))));ymax=min(HH-1,int(math.ceil(max(y0,y1,y2))))
  spec=props[ti,0];rough=props[ti,1];tex=int(props[ti,2]);shininess=18.+(1.-rough)*90.
  for iy in range(ymin,ymax+1):
   py=iy+.5
   for ix in range(xmin,xmax+1):
    px=ix+.5
    a=((y1-y2)*(px-x2)+(x2-x1)*(py-y2))/den
    if a<-.000001 or a>1.000001:continue
    b=((y2-y0)*(px-x2)+(x0-x2)*(py-y2))/den
    c=1.-a-b
    if b<-.000001 or c<-.000001:continue
    dep=a*zz[0]+b*zz[1]+c*zz[2]
    if dep<=depth[iy,ix]:continue
    if int(props[ti,2])!=5: depth[iy,ix]=dep
    n=a*N[0]+b*N[1]+c*N[2];n=n/(np.sqrt((n*n).sum())+1e-14)
    lam=max(0.,(n*L).sum());facing=max(0.,(n*V).sum());sh=max(0.,(n*halfv).sum())**shininess
    illum=.49+.57*lam+.07*max(0.,n[2])
    q=a*local[0]+b*local[1]+c*local[2]
    noise=math.sin(q[0]*190.17+math.sin(q[1]*242.13+q[2]*307.31)*4.13)*math.sin(q[2]*210.53+q[1]*149.79)
    texture=1.+noise*.010
    if tex==1:
     texture=1.+.026*math.sin((q[1]+q[2]*.731)*1470.)+.010*noise
     illum=.55+.51*lam+.08*max(0.,n[2])
    elif tex==2:
     illum=.7+.3*lam+.2*max(0.,n[2]);texture=1.
    elif tex==3:
     texture=1.+noise*.023+.018*math.sin(q[0]*6.23+q[2]*13.2)
     # Restrained paint rub, never rust or grime.
     scratch=math.sin(q[0]*273.+q[1]*142.)
     if abs(math.sin(q[2]*197.+q[1]*44.))>.993 and scratch>.94:texture+=.23
    elif tex==4:
     # Timber grain follows world X; the pattern is in model space and rotates with the object.
     grain=math.sin(q[1]*235.+3.5*math.sin(q[0]*2.7)+2.0*math.sin(q[2]*39.))
     fine=math.sin(q[1]*710.+q[2]*94.+math.sin(q[0]*5.0)*2.)
     texture=1.+.052*grain+.018*fine+.012*noise
    occ=a*aos[ti,0]+b*aos[ti,1]+c*aos[ti,2]
    illum*=1.-.34*occ
    highlight=spec*(sh*.82+.018*((1.-facing)**4))
    if tex==5:
     # A separate final glazing pass. Panes remain translucent instead of painting
     # fake machinery on a dark rectangle. Preserve straight-alpha output.
     ga=.24 + .07*(1.-facing)**3
     olda=alpha[iy,ix]/255.
     newa=ga+olda*(1.-ga)
     for ch in range(3):
      tint=min(255.,max(0.,cols[ti,ch]*(.78+.22*lam)+highlight*120.))
      val=(tint*ga+rgb[iy,ix,ch]*olda*(1.-ga))/max(newa,1e-9)
      rgb[iy,ix,ch]=int(min(255.,max(0.,val)))
     alpha[iy,ix]=int(round(255.*newa))
    else:
     for ch in range(3):
      val=cols[ti,ch]*illum*texture+highlight*255.
      rgb[iy,ix,ch]=int(min(255.,max(0.,val)))
     alpha[iy,ix]=255
 return rgb,alpha



@njit(cache=True)
def ambient_occlusion(points,normals,boxes):
    result=np.zeros(len(points),np.float64)
    for k in range(len(points)):
        N=normals[k].copy(); N/=math.sqrt((N*N).sum())+1e-14
        seed=np.array([1.,0.,0.]) if abs(N[0])<.8 else np.array([0.,1.,0.])
        U=np.cross(N,seed);U/=math.sqrt((U*U).sum())+1e-14; V=np.cross(N,U)
        origin=points[k]+N*.025
        occ=0.
        for j in range(8):
            a=2.*math.pi*j/8.; D=N*.63+.7766*(math.cos(a)*U+math.sin(a)*V)
            best=.46
            for bi in range(len(boxes)):
                if (origin[0]<boxes[bi,0,0]-.46 or origin[0]>boxes[bi,1,0]+.46 or
                    origin[1]<boxes[bi,0,1]-.46 or origin[1]>boxes[bi,1,1]+.46 or
                    origin[2]<boxes[bi,0,2]-.46 or origin[2]>boxes[bi,1,2]+.46):
                    continue
                tmin=0.;tmax=.46
                for ax in range(3):
                    if abs(D[ax])<1e-9:
                        if origin[ax]<boxes[bi,0,ax] or origin[ax]>boxes[bi,1,ax]:
                            tmin=2.;break
                    else:
                        ta=(boxes[bi,0,ax]-origin[ax])/D[ax];tb=(boxes[bi,1,ax]-origin[ax])/D[ax]
                        if ta>tb: ta,tb=tb,ta
                        tmin=max(tmin,ta);tmax=min(tmax,tb)
                if tmin<=tmax and tmax>=.012 and tmin<best:best=max(.012,tmin)
            occ+=max(0.,1.-best/.46)
        result[k]=occ/8.
    return result


def render(model, envelope, angle=0, scale=4):
    w,d,h=envelope
    W=int(round(48*(w+d)+16)); H=int(round(24*(w+d)+48*h+16))
    tris=np.asarray(model.tri,dtype=np.float64)
    normals=np.asarray(model.norm,dtype=np.float64)
    cols=np.array([mat[0] for mat in model.mat],float)
    props=np.array([[mat[1],mat[2],mat[3]] for mat in model.mat],float)
    if getattr(model,'_ao',None) is None:
        raw=np.concatenate([tris.reshape(-1,3),normals.reshape(-1,3)],axis=1)
        unique,inv=np.unique(np.round(raw,7),axis=0,return_inverse=True)
        ao=ambient_occlusion(unique[:,:3],unique[:,3:],np.asarray(model.boxes,float))
        model._ao=ao[inv].reshape(-1,3)
    aos=model._ao
    opaque=np.flatnonzero(props[:,2]!=5)
    panes=np.flatnonzero(props[:,2]==5)
    if len(panes):
        # Back to front glazing, after opaque geometry.
        ctr=tris[panes].mean(1)
        order=np.argsort(ctr[:,0]+ctr[:,1]+ctr[:,2] if angle==0 else ctr[:,1]-ctr[:,0]+ctr[:,2])
        order=np.concatenate([opaque,panes[order]])
        tris,normals,cols,props=tris[order],normals[order],cols[order],props[order]
        aos=aos[order]
    ox=8+48*(d if angle==0 else w); oy=8+48*h
    rgb,alpha=raster(tris,normals,cols,props,aos,W,H,scale,ox,oy,angle,w,d)
    master=Image.fromarray(np.dstack([rgb,alpha]))
    # Area sampling avoids ringing and white/black fringes beyond the geometry.
    small=master.resize((W,H),Image.Resampling.BOX)
    a=np.array(small); a[a[:,:,3]==0,:3]=0
    small=Image.fromarray(a)
    return small, master

def project(p,envelope,angle=0):
    w,d,h=envelope; x,y,z=map(float,p)
    if angle==90: x,y=y,w-x
    return [8+48*(d if angle==0 else w)+48*(x-y),8+48*h+24*(x+y)-48*z]

def merge(dst,src,offset=(0,0,0)):
    off=np.array(offset,float)
    dst.tri.extend([t+off for t in src.tri]); dst.norm.extend(src.norm); dst.mat.extend(src.mat)
    dst.boxes.extend([b+off for b in src.boxes])
    return dst
