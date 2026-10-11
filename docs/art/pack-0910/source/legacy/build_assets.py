"""Asset production only: packages 3, 4 and the two approved timber stores.
Reconstructs the approved concepts on the contractual metre grid.
No lettering, ground planes, cast shadows, repo changes, or game dependencies.
"""
from __future__ import annotations
import json, math, sys, time
from pathlib import Path
import numpy as np
from PIL import Image
from renderer import (Model, STEEL, ALU, CHROME, DARK, RUBBER, GLASS, PANE,
                      RED, YELLOW, GREEN, PALETTE, roller_table, base_cabinet,
                      render, project, merge)
HERE=Path(__file__).resolve().parent
ROOT=HERE/'delivery'
PAINT_STD=(PALETTE[2],.19,.46,0)
PAINT_PRO=(PALETTE[3],.20,.43,0)
PAINT_IND=(PALETTE[4],.20,.43,0)
PAINT_GREY=(PALETTE[1],.20,.43,0)
OAK=((171,129,79),.06,.67,4)
BIRCH=((208,175,123),.06,.67,4)
WALNUT=((144,104,65),.06,.70,4)
PACKS={
 'pack3': {'folder':'Woodwork-Empire-Tycoon-Paczka-3','assets':{
  'sprayRobot.standard':(2,1,2.25),
  'cnc5.standard':(5,3,2.5), 'cnc5.pro':(6,3,2.75), 'cnc5.industrial':(8,4,3)}},
 'pack4': {'folder':'Woodwork-Empire-Tycoon-Paczka-4','assets':{f'windowLine.stage{i}':(6,3,2.5) for i in range(1,6)}},
 'storage': {'folder':'Woodwork-Empire-Tycoon-Sklady-Drewna','assets':{
  'timberStorage.rack':(4,1,2.5), 'timberStorage.shelter':(6,3,3)}}}


def tube_path(m, pts, r=.022, mat=RUBBER, n=10):
 for a,b in zip(pts[:-1],pts[1:]):m.cyl(a,b,r,mat,n)


def bezier(m, points, r=.02, mat=RUBBER, steps=16):
 p=np.array(points,float); n=len(p)-1; out=[]
 for t in np.linspace(0,1,steps):
  out.append(sum(math.comb(n,i)*(1-t)**(n-i)*t**i*p[i] for i in range(n+1)))
 tube_path(m,out,r,mat,10)


def ball(m,c,r,mat,nu=20,nv=10):
 x,y,z=c
 for j in range(nv):
  p1=-math.pi/2+math.pi*j/nv;p2=-math.pi/2+math.pi*(j+1)/nv
  for i in range(nu):
   a=2*math.pi*i/nu;b=2*math.pi*(i+1)/nu
   ns=[(math.cos(p)*math.cos(t),math.cos(p)*math.sin(t),math.sin(p)) for p,t in [(p1,a),(p1,b),(p2,b),(p2,a)]]
   vs=[(x+r*nx,y+r*ny,z+r*nz) for nx,ny,nz in ns]
   # Triangulate as two real triangles, including poles.
   m.polygon([vs[0],vs[1],vs[2]],mat,[ns[0],ns[1],ns[2]])
   m.polygon([vs[0],vs[2],vs[3]],mat,[ns[0],ns[2],ns[3]])


def post(m,x,y,z0,z1,paint=PAINT_STD,side=.10,base=True):
 m.box((x-side/2,y-side/2,z0),(x+side/2,y+side/2,z1),paint,.008)
 if base:
  m.box((x-side*.78,y-side*.78,0),(x+side*.78,y+side*.78,.030),DARK,.005)
  for dx,dy in [(-.047,-.047),(.047,.047)]:m.bolt(x+dx,y+dy,.031,'z',.010)


def guard(m, axis, pos, a,b,z0,z1,paint=PAINT_STD,spacing=.12):
 """Real open safety mesh, not a texture containing opaque background."""
 if axis=='x':
  conv=lambda s,z:(pos,s,z)
 else:conv=lambda s,z:(s,pos,z)
 for s in [a,b]:m.beam(conv(s,z0),conv(s,z1),.045,paint)
 for z in [z0,z1]:m.beam(conv(a,z),conv(b,z),.035,paint)
 for s in np.arange(a+.05,b-.03,spacing):m.cyl(conv(s,z0+.02),conv(s,z1-.02),.0036,STEEL,6)
 for z in np.arange(z0+.06,z1-.025,spacing):m.cyl(conv(a+.02,z),conv(b-.02,z),.0036,STEEL,6)


def light_curtain(m,x,y,h=1.60,paint=PAINT_IND):
 post(m,x,y,.035,h,paint,.064)
 m.box((x-.030,y+.034,.21),(x+.030,y+.046,h-.075),YELLOW,.003)
 for z in np.arange(.30,h-.09,.13):
  m.cyl((x,y+.046,z),(x,y+.050,z),.010,DARK,10)


def tower_light(m,x,y,z):
 m.cyl((x,y,z),(x,y,z+.13),.016,DARK,12)
 for k,col in enumerate([GREEN,YELLOW,RED]):
  m.cyl((x,y,z+.13+k*.045),(x,y,z+.171+k*.045),.024,col,16)
 m.cyl((x,y,z+.265),(x,y,z+.279),.026,DARK,16)


def monitor(m,x,y,z,w=.36):
 # Front faces +Y in the unrotated object. The same object rotates for view 90.
 m.box((x-w/2,y-.065,z),(x+w/2,y+.013,z+.31),PAINT_GREY,.012)
 m.box((x-w*.425,y+.015,z+.088),(x+w*.425,y+.025,z+.275),DARK,.003)
 m.box((x-w*.385,y+.026,z+.105),(x+w*.385,y+.029,z+.256),GLASS,.002)
 m.box((x-w/2+.035,y+.010,z+.018),(x-w/2+.100,y+.03,z+.072),YELLOW,.003)
 m.cyl((x-w/2+.068,y+.03,z+.044),(x-w/2+.068,y+.050,z+.044),.020,RED,16)
 for dx in [.08,.135]:m.cyl((x+dx,y+.024,z+.044),(x+dx,y+.043,z+.044),.010,DARK if dx==.135 else GREEN,12)


def controller(m,x,y,w=.48,d=.38,h=1.40,paint=PAINT_GREY,tower=False):
 # x,y denotes lower back corner. Includes feet and an unlettered door.
 m.box((x,y,.06),(x+w,y+d,h),paint,.016)
 m.box((x-.004,y-.004,.035),(x+w+.004,y+d+.004,.10),DARK,.007)
 for xx in [x+.055,x+w-.055]:
  for yy in [y+.05,y+d-.05]:m.feet(xx,yy,.07,.028)
 m.box((x+.025,y+d+.002,.13),(x+w-.025,y+d+.013,h-.033),paint,.004)
 m.box((x+w-.075,y+d+.014,h*.52),(x+w-.061,y+d+.041,h*.65),DARK,.003)
 m.vents(x+.045,y+d+.014,.20,w-.10,5)
 for zz in [.24,h-.17]:m.bolt(x+.045,y+d+.019,zz)
 if tower:tower_light(m,x+w*.76,y+d*.6,h+.005)


def operator_console(m,x,y,z=1.05,paint=PAINT_STD):
 m.box((x-.16,y-.16,0),(x+.16,y+.13,.05),DARK,.008)
 m.box((x-.045,y-.075,.05),(x+.045,y+.015,z+.03),paint,.009)
 m.beam((x,y-.025,z),(x,y+.07,z+.08),.048,STEEL)
 monitor(m,x,y+.07,z+.015,.40)


def chain(m,x0,x1,y,z):
 # Energy chain: two parallel runs plus a real return arc.
 if x1-x0<.25:return
 r=.135
 for xx in np.arange(x0,x1-.015,.068):
  for zz in [z,z+2*r]:
   m.box((xx,y-.049,zz-.027),(min(xx+.059,x1),y+.049,zz+.027),DARK,.005)
   m.bolt(xx+.026,y+.051,zz,r=.009)
 for j in range(12):
  a=-math.pi/2+math.pi*j/12;b=-math.pi/2+math.pi*(j+1)/12
  p=(x1+r*math.cos(a),y,z+r+r*math.sin(a));q=(x1+r*math.cos(b),y,z+r+r*math.sin(b))
  m.beam(p,q,.059,DARK)
  m.cyl((p[0],y+.035,p[2]),(p[0],y+.045,p[2]),.010,YELLOW,8)


def spindle5(m,x,y,z,paint=PAINT_STD,scale=1.):
 # gimbal axis A across X, tilting B pivot and downward spindle / collet.
 s=scale
 m.box((x-.15*s,y-.13*s,z+.34*s),(x+.15*s,y+.13*s,z+.66*s),paint,.014*s)
 for xx in [x-.18*s,x+.18*s]:
  m.box((xx-.027*s,y-.10*s,z+.14*s),(xx+.027*s,y+.10*s,z+.46*s),ALU,.008*s)
 m.cyl((x-.215*s,y,z+.22*s),(x+.215*s,y,z+.22*s),.095*s,paint,24)
 m.cyl((x+.218*s,y,z+.22*s),(x+.235*s,y,z+.22*s),.062*s,DARK,24)
 m.cyl((x,y-.15*s,z+.14*s),(x,y+.14*s,z+.14*s),.083*s,DARK,24)
 m.cyl((x,y,z-.15*s),(x,y,z+.12*s),.070*s,CHROME,24)
 m.cyl((x,y,z-.205*s),(x,y,z-.14*s),.044*s,DARK,20)
 m.cyl((x,y,z-.28*s),(x,y,z-.204*s),.015*s,STEEL,12)
 m.bolt(x,y+.15*s,z+.14*s,'y',.024*s)


def bed(m,x0,x1,y0,y1,z=.91,paint=PAINT_STD,clamps=7):
 base_cabinet(m,x0,x1,y0,y1,.12,z-.16,paint,max(2,int(x1-x0)),True)
 for yy in [y0+.15,y1-.15]:
  m.box((x0+.035,yy-.050,z-.15),(x1-.035,yy+.05,z-.077),STEEL,.006)
  m.box((x0+.04,yy-.029,z-.077),(x1-.04,yy+.029,z-.042),CHROME,.003)
 for xx in np.linspace(x0+.18,x1-.18,clamps):
  m.box((xx-.085,y0+.07,z-.036),(xx+.085,y1-.07,z+.038),ALU,.008)
  for yy in [y0+.28,y1-.28]:
   m.box((xx-.091,yy-.10,z+.035),(xx+.091,yy+.10,z+.09),DARK,.006)
   m.box((xx-.078,yy-.08,z+.090),(xx+.078,yy+.08,z+.12),ALU,.003)
   m.cyl((xx+.043,yy,z+.13),(xx+.043,yy,z+.27),.017,CHROME,12)
   m.box((xx-.075,yy-.031,z+.237),(xx+.065,yy+.031,z+.279),DARK,.004)
   m.bolt(xx+.01,yy+.003,z+.28,'z',.013)


def gantry(m,x0,x1,y,z,headxs,paint=PAINT_STD,heady=None):
 if heady is None:heady=y+.80
 for xx in [x0+.14,x1-.14]:
  m.box((xx-.11,y-.10,.78),(xx+.11,y+.12,z+.08),paint,.014)
  m.box((xx-.16,y-.14,.75),(xx+.16,y+.16,.88),ALU,.007)
 m.box((x0,y-.095,z-.12),(x1,y+.16,z+.08),paint,.018)
 m.box((x0+.055,y+.166,z-.092),(x1-.055,y+.19,z+.026),STEEL,.006)
 for zz in [z-.067,z+.006]:m.cyl((x0+.07,y+.195,zz),(x1-.07,y+.195,zz),.012,CHROME,12)
 for i,hx in enumerate(headxs):
  m.box((hx-.21,y+.184,z-.12),(hx+.21,y+.23,z+.17),ALU,.008)
  m.box((hx-.12,y+.14,z+.04),(hx+.12,heady+.10,z+.22),paint,.012)
  m.box((hx-.075,heady-.14,z-.43),(hx+.075,heady+.05,z+.16),STEEL,.008)
  spindle5(m,hx,heady,z-.58,paint)
  # Local cable loop and flexible extraction attached to the head.
  chain(m,hx-.37,hx+.10,y-.017,z+.03)
  bezier(m,[(hx+.18,heady,z-.12),(hx+.32,heady,z+.31),(hx+.28,y+.06,z+.29),(hx+.23,y-.02,z+.15)],.032,RUBBER,18)


def carousel(m,cx,cy,z,r=.34,paint=PAINT_PRO):
 m.box((cx-r*.85,cy-r*.75,.10),(cx+r*.85,cy+r*.75,z-.10),paint,.012)
 m.cyl((cx,cy,z-.16),(cx,cy,z-.045),r*.8,DARK,36)
 m.cyl((cx,cy,z-.045),(cx,cy,z+.02),r,STEEL,40)
 for a in np.linspace(0,2*math.pi,14,endpoint=False):
  xx=cx+r*.82*math.cos(a);yy=cy+r*.82*math.sin(a)
  m.cyl((xx,yy,z+.021),(xx,yy,z+.071),.044,DARK,16)
  m.cyl((xx,yy,z+.07),(xx,yy,z+.16),.027,CHROME,14)
  m.cyl((xx,yy,z+.16),(xx,yy,z+.20),.015,STEEL,12)


def enclosure(m,x0,x1,y0,y1,z0,ztop,paint,sections=3):
 # Opaque rear, two pierced end walls and framed glazed front doors.
 th=.07
 m.box((x0,y0,z0),(x1,y0+th,ztop),paint,.012)
 m.box((x0,y0,ztop-.075),(x1,y1,ztop),paint,.012)
 for xx in [x0,x1-.09]:
  # Side jambs retain a through opening above the bed.
  for ya,yb in [(y0,y0+.19),(y1-.15,y1)]:
   m.box((xx,ya,z0),(xx+.09,yb,ztop),paint,.008)
  m.box((xx,y0,z0),(xx+.09,y1,.79),paint,.008)
  m.box((xx,y0,1.68),(xx+.09,y1,ztop),paint,.008)
 # Continuous top and lower outer fascia.
 m.box((x0,y1,ztop-.18),(x1,y1+.048,ztop),ALU,.008)
 m.box((x0,y1,.68),(x1,y1+.042,.84),paint,.008)
 for i in range(sections):
  xa=x0+(x1-x0)*i/sections+.025;xb=x0+(x1-x0)*(i+1)/sections-.025
  ya=y1+.047;zlo=.84;zhi=ztop-.18
  for xj in [xa,xb-.055]:m.box((xj,ya,zlo),(xj+.055,ya+.044,zhi),ALU,.005)
  for zj in [zlo,zhi-.055]:m.box((xa,ya,zj),(xb,ya+.044,zj+.055),ALU,.005)
  # Separate clear aperture with slight glass tint.
  m.quad([(xa+.055,ya+.048,zlo+.055),(xb-.055,ya+.048,zlo+.055),(xb-.055,ya+.048,zhi-.055),(xa+.055,ya+.048,zhi-.055)],[0,1,0],PANE)
  hx=xb-.11
  m.box((hx,ya+.050,zlo+.35),(hx+.021,ya+.09,zlo+.54),DARK,.004)
  m.bolt(xa+.025,ya+.047,zlo+.12)
 # Roof seams, latches, and a low steel sill.
 for i in range(1,sections):
  xx=x0+(x1-x0)*i/sections
  m.box((xx-.003,y0+.06,ztop+.001),(xx+.003,y1-.04,ztop+.006),DARK,.001)
 m.box((x0+.04,y1+.05,.78),(x1-.04,y1+.09,.83),STEEL,.004)


def robot_arm(m,base,shoulder,elbow,wrist,tool,paint,kind='spray'):
 b=np.array(base,float);sh=np.array(shoulder,float);el=np.array(elbow,float);wr=np.array(wrist,float);tl=np.array(tool,float)
 m.cyl((b[0],b[1],b[2]),(b[0],b[1],b[2]+.15),.20,paint,32)
 m.cyl((b[0],b[1],b[2]+.15),(b[0],b[1],b[2]+.19),.172,DARK,32)
 m.beam((b[0],b[1],b[2]+.17),sh,.22,paint)
 for p,r in [(sh,.14),(el,.125),(wr,.10)]:
  m.cyl((p[0],p[1]-.16,p[2]),(p[0],p[1]+.14,p[2]),r,paint,28)
  m.cyl((p[0],p[1]+.142,p[2]),(p[0],p[1]+.156,p[2]),r*.68,DARK,24)
  m.bolt(p[0],p[1]+.157,p[2],r=r*.21)
 m.beam(sh,el,.17,paint);m.beam(el,wr,.135,paint)
 # Slender raised arm plates and metal connector flanges.
 m.cyl(sh+np.array([0,.103,0]),el+np.array([0,.103,0]),.030,STEEL,14)
 m.cyl(wr,tl,.072,paint,22)
 if kind=='spray':
  m.cyl(tl,tl+np.array([0,0,-.065]),.049,CHROME,20)
  end=tl+np.array([0,0,-.065])
  m.box(tuple(end+[-.026,-.025,-.07]),tuple(end+[.026,.04,0]),ALU,.006)
  m.cyl(end+[0,0,-.072],end+[0,0,-.13],.017,STEEL,14)
  m.cyl(end+[0,.035,-.024],end+[0,.078,-.024],.022,ALU,14)
 else:
  m.box(tuple(tl+[-.30,-.25,-.05]),tuple(tl+[.30,.25,.015]),ALU,.008)
  for dx in [-.22,0,.22]:
   for dy in [-.17,.17]:
    m.cyl(tl+[dx,dy,-.11],tl+[dx,dy,-.049],.028,CHROME,12)
    m.cyl(tl+[dx,dy,-.13],tl+[dx,dy,-.108],.060,RUBBER,18)
 # Curved hose follows the back of the articulated arm, not a detached object.
 points=[b+[-.03,-.20,.10],sh+[.09,-.18,0],el+[.08,-.15,.10],wr+[.03,-.13,.07],tl+[.04,-.08,.04]]
 bezier(m,points,.023,RUBBER,30)


def build_spray():
 m=Model();paint=PAINT_STD
 m.box((.16,.15,0),(.71,.73,.035),DARK,.009)
 m.box((.20,.19,.035),(.67,.69,.51),paint,.016)
 for xx in [.22,.65]:
  for yy in [.22,.66]:m.bolt(xx,yy,.515,'z',.020)
 robot_arm(m,(.43,.43,.52),(.43,.44,.91),(.60,.46,1.76),(.21,.46,1.96),(.16,.46,1.72),paint)
 # Stainless pressure pot with lid, plumbing and wheels.
 cx,cy=1.08,.51
 for xx in [cx-.12,cx+.12]:
  for yy in [cy-.11,cy+.11]:
   m.cyl((xx-.018,yy,.047),(xx+.018,yy,.047),.040,RUBBER,14)
 m.box((cx-.17,cy-.16,.077),(cx+.17,cy+.16,.11),STEEL,.008)
 m.cyl((cx,cy,.11),(cx,cy,.84),.154,CHROME,40)
 m.cyl((cx,cy,.825),(cx,cy,.871),.170,STEEL,36)
 m.cyl((cx,cy,.871),(cx,cy,.895),.160,ALU,36)
 for dx in [-.145,.145]:
  m.box((cx+dx-.013,cy-.025,.74),(cx+dx+.013,cy+.025,.93),STEEL,.005)
 m.cyl((cx,cy,.89),(cx,cy,1.035),.018,STEEL,12)
 m.cyl((cx-.063,cy,1.01),(cx+.08,cy,1.01),.020,STEEL,14)
 m.wheel(cx+.088,cy,1.011,.037)
 m.cyl((cx-.045,cy+.019,.987),(cx-.045,cy+.048,.987),.048,DARK,20)
 m.cyl((cx-.045,cy+.049,.987),(cx-.045,cy+.052,.987),.040,ALU,20)
 bezier(m,[(.61,.65,1.82),(.90,.78,2.17),(.78,.89,.35),(1.10,.81,.12),(1.24,.61,.91)],.019,RUBBER,36)
 controller(m,1.46,.21,.46,.49,1.37,PAINT_GREY,True)
 m.controls(1.78,.73,1.05,False,.13)
 bezier(m,[(.66,.55,.17),(.96,.89,.09),(1.52,.83,.15),(1.51,.69,.35)],.022,RUBBER,18)
 return m


def build_cnc(tier):
 m=Model()
 if tier=='standard':
  paint=PAINT_STD;bed(m,.30,4.55,.50,2.20,.89,paint,7)
  gantry(m,.33,4.53,.34,1.98,[2.35],paint,1.30)
  for xx in [.18,4.78]:guard(m,'x',xx,.34,2.29,.72,1.99,paint,.13)
  for xx in [.12,4.83]:light_curtain(m,xx,2.38,1.67,paint)
  operator_console(m,4.55,2.73,1.12,paint)
  # Broad end feet link protective screen and the actual table footprint.
  for xx in [.18,4.75]:
   m.box((xx-.085,.22,.030),(xx+.085,2.46,.10),paint,.008)
   for yy in [.20,2.48]:m.feet(xx,yy,.12,.040)
 elif tier=='pro':
  paint=PAINT_PRO
  bed(m,1.10,5.28,.48,2.18,.90,paint,8)
  gantry(m,1.10,5.21,.38,1.91,[3.43],paint,2.10)
  enclosure(m,1.03,5.30,.19,2.43,.12,2.48,paint,3)
  carousel(m,.56,1.31,1.32,.34,paint)
  # Anchored tool changer housing at the closed end, not a separate loose tool stand.
  m.box((.16,.65,.095),(1.08,1.92,.74),paint,.014)
  m.box((.16,.67,.74),(.30,1.90,1.42),paint,.01)
  for xx in [.20,.95]:
   for yy in [.72,1.85]:m.feet(xx,yy,.12,.04)
  m.beam((5.22,2.43,1.25),(5.62,2.57,1.38),.060,STEEL)
  monitor(m,5.60,2.66,1.37,.40)
  controller(m,5.38,.20,.44,.62,1.42,paint,False)
  # Roof-mounted silent extraction / service channel.
  m.box((1.44,.51,2.48),(4.94,.67,2.57),paint,.008)
  m.tube(2.1,.91,2.493,.196,.083)
  tower_light(m,5.03,.42,2.455)
  # Exposed Z-axis motor cover and cable carrier above the enclosed work zone.
  m.box((3.29,1.52,2.48),(3.57,1.91,2.69),paint,.012)
  m.box((3.35,1.919,2.50),(3.51,1.939,2.66),ALU,.004)
  bezier(m,[(3.50,1.64,2.68),(3.55,1.48,2.77),(3.72,1.41,2.71),(3.77,1.40,2.50)],.023,RUBBER,16)
 else:
  paint=PAINT_IND
  bed(m,1.64,6.34,.69,2.77,.93,paint,9)
  gantry(m,1.68,6.30,.44,2.07,[3.06,4.84],paint,2.55)
  enclosure(m,1.54,6.46,.24,3.01,.12,2.77,paint,4)
  roller_table(m,.055,1.54,.64,2.64,.90,paint,True,.19)
  roller_table(m,6.46,7.945,.64,2.64,.90,paint,True,.19)
  for xx in [1.33,6.68]:
   guard(m,'x',xx,.36,.60,.68,2.24,paint,.13)
   guard(m,'x',xx,2.67,3.15,.68,2.24,paint,.13)
   light_curtain(m,xx,2.72,2.16,paint)
  controller(m,7.15,3.22,.72,.52,1.87,PAINT_GREY,True)
  operator_console(m,6.85,3.56,1.20,paint)
  # Automatic infeed pusher running on a rail alongside the stock path.
  m.box((.08,.45,.98),(1.51,.54,1.065),STEEL,.006)
  m.box((.34,.42,1.067),(.57,.63,1.23),paint,.012)
  m.box((.40,.55,1.10),(.52,.98,1.20),ALU,.006)
  carousel(m,6.97,.34,1.10,.225,paint)
  for x in [2.3,5.8]:m.tube(x,.78,2.78,.165,.086)
  for hx in [3.06,4.84]:
   m.box((hx-.14,1.70,2.77),(hx+.14,2.04,2.955),paint,.011)
   m.box((hx-.080,2.047,2.79),(hx+.080,2.06,2.925),STEEL,.004)
   bezier(m,[(hx+.11,1.78,2.92),(hx+.24,1.69,3.00),(hx+.33,1.62,2.92),(hx+.32,1.61,2.80)],.021,RUBBER,14)
 return m


# All five modules share this exact conveyor at height 0.9 metres.
# The pitch remains .25 m across module boundaries; rails meet at x=0 and x=6.
def line_conveyor(m,paint=PAINT_IND):
 y0,y1=.79,2.21
 for yy in [y0,y1-.065]:
  m.box((0,yy,.79),(6,yy+.065,.89),paint,.006)
  m.box((0,yy+.012,.891),(6,yy+.053,.906),STEEL,.003)
 for xx in np.arange(.125,6,.25):
  m.cyl((xx,y0+.063,.855),(xx,y1-.063,.855),.045,CHROME,22)
 # Open underside with identical support stations in each module.
 for xx in [.20,1.6,3.0,4.4,5.80]:
  for yy in [y0+.036,y1-.036]:
   m.box((xx-.027,yy-.027,.075),(xx+.027,yy+.027,.805),paint,.004)
   m.feet(xx,yy,.10,.040)
  m.box((xx-.025,y0,.29),(xx+.025,y1,.335),paint,.005)
 for yy in [y0+.04,y1-.04]:m.box((.20,yy-.02,.29),(5.80,yy+.02,.325),paint,.004)


def hood_section(m,xa,xb,y0,y1,z0,z1,paint,port=True):
 # Three-sided tunnel, empty in the middle, with a dark inspection window.
 m.box((xa,y0,z0),(xb,y0+.12,z1),paint,.009)
 m.box((xa,y1-.12,z0),(xb,y1,z1),paint,.009)
 m.box((xa,y0,z1-.09),(xb,y1,z1),paint,.012)
 # Window on the operator face: real transparent aperture in a framed panel inset.
 winz0=z0+.23;winz1=z1-.19
 if winz1>winz0:
  wx0=xa+.09;wx1=xb-.09
  m.box((wx0,y1+.002,winz0),(wx1,y1+.024,winz1),DARK,.006)
  m.box((wx0+.025,y1+.026,winz0+.025),(wx1-.025,y1+.031,winz1-.025),GLASS,.003)
 m.box((xb-.06,y1+.02,z0+.075),(xb-.04,y1+.05,z0+.21),DARK,.003)
 m.bolt(xa+.045,y1+.015,z0+.08)
 if port:m.tube((xa+xb)*.5,(y0+y1)*.5,z1+.007,.230,.09)


def line_base(m,a,b,paint=PAINT_IND):
 # No solid floor: cabinets and crossmembers have open spaces underneath.
 for ya,yb in [(.39,.74),(2.24,2.56)]:
  base_cabinet(m,a,b,ya,yb,.12,.75,paint,4,True)
 for xx in [a+.07,b-.07]:
  m.box((xx-.07,.16,.05),(xx+.07,2.89,.16),paint,.008)
  for yy in [.13,2.90]:m.feet(xx,yy,.10,.035)


def line_panel(m,x,paint=PAINT_IND,large=False):
 y=2.65
 if large:
  controller(m,x-.22,y-.02,.44,.28,1.47,PAINT_GREY,False)
  monitor(m,x,y+.283,1.15,.34)
 else:
  m.box((x-.13,y-.08,.03),(x+.13,y+.11,.08),DARK,.006)
  m.box((x-.045,y-.027,.08),(x+.045,y+.039,1.17),paint,.004)
  monitor(m,x,y+.06,1.16,.32)


def line_press(m):
 p=PAINT_IND
 # Two anchored columns and a movable beam; hydraulic drives are readily visible.
 for xx in [1.44,4.59]:
  m.box((xx-.16,.35,.045),(xx+.16,2.67,.17),p,.008)
  m.box((xx-.15,.45,.16),(xx+.15,.71,2.17),p,.012)
  m.box((xx-.125,2.26,.16),(xx+.125,2.51,2.19),p,.012)
  for yy in [.50,2.38]:
   m.cyl((xx,yy,.45),(xx,yy,2.06),.032,CHROME,18)
  m.box((xx-.11,.53,2.04),(xx+.11,2.43,2.22),p,.01)
 m.box((1.30,.49,2.08),(4.74,.69,2.27),p,.011)
 m.box((1.31,2.29,2.08),(4.74,2.51,2.27),p,.011)
 for xx in [1.71,3.03,4.31]:
  for yy in [.61,2.37]:
   m.cyl((xx,yy,1.89),(xx,yy,2.38),.063,DARK,22)
   m.cyl((xx,yy,1.48),(xx,yy,1.91),.026,CHROME,18)
   m.box((xx-.078,yy-.07,1.47),(xx+.078,yy+.07,1.56),STEEL,.006)
   bezier(m,[(xx,yy-.035,2.39),(xx+.14,yy-.035,2.46),(xx+.18,yy-.035,2.32),(xx+.16,yy-.035,1.84)],.012,RUBBER,16)
 m.box((1.46,.48,1.39),(4.60,.75,1.55),ALU,.009)
 m.box((1.46,2.27,1.39),(4.60,2.52,1.55),ALU,.009)
 m.box((1.44,2.31,.95),(4.60,2.51,1.07),STEEL,.007)
 for xx in [1.08,4.99]:
  light_curtain(m,xx,2.55,2.11,p)
  guard(m,'x',xx,.15,.70,.42,2.04,p,.13)


def build_line(stage):
 m=Model();p=PAINT_IND;line_conveyor(m,p)
 if stage==1:
  line_base(m,1.0,4.85,p)
  for i in range(4):
   xa=1.08+i*.88;hood_section(m,xa,xa+.86,.49,2.53,1.01,2.15,p,True)
  for xx in [.48,.77]:
   m.cyl((xx,.99,1.12),(xx,2.02,1.12),.065,RUBBER,22)
  m.box((.36,.58,.95),(.88,.75,1.38),p,.007)
  for xx in [.96,4.96]:guard(m,'x',xx,.19,.69,.58,1.69,p,.14)
  line_panel(m,4.82,p,True)
 elif stage==2:
  line_base(m,1.03,4.91,p)
  # Internal two-head CNC machinery over the same conveyor centre.
  gantry(m,1.09,4.83,.47,1.88,[2.04,3.92],p,2.14)
  enclosure(m,1.04,4.91,.38,2.53,.12,2.19,p,3)
  for xx in [2.01,3.92]:
   m.box((xx-.145,.70,2.192),(xx+.145,.93,2.414),p,.009)
   m.box((xx-.068,.938,2.21),(xx+.068,.954,2.37),ALU,.003)
  line_panel(m,4.84,p,False)
 elif stage==3:
  line_base(m,.99,4.94,p)
  for i in range(4):
   xa=1.025+i*.95;hood_section(m,xa,xa+.93,.45,2.55,1.0,2.16,p,True)
  for xx in [1.02,4.93]:
   # Flexible curtains inside the open entrance and exit.
   for yy in np.arange(.95,2.10,.09):
    m.box((xx-.018,yy,1.05),(xx+.018,yy+.073,1.53),RUBBER,.002)
  line_panel(m,4.83,p,False)
 elif stage==4:
  line_base(m,1.16,4.90,p);line_press(m);line_panel(m,5.23,p,True)
 else:
  # Robot on the offside with a vacuum gripper above the line, empty output racks.
  m.box((2.94,.045,.025),(4.15,.79,.105),DARK,.01)
  m.box((3.34,.115,.105),(3.94,.715,.53),p,.012)
  robot_arm(m,(3.64,.415,.53),(3.62,.42,.98),(3.05,.46,1.89),(2.68,1.43,1.92),(2.68,1.48,1.59),p,'vacuum')
  for xx in [4.35,5.05,5.68]:
   post(m,xx,2.59,.045,1.58,p,.074)
   m.box((xx-.05,2.41,.15),(xx+.05,2.92,.20),p,.005)
   m.box((xx-.040,2.53,.30),(xx+.040,2.91,.35),ALU,.004)
  guard(m,'x',2.65,.085,.68,.25,1.96,p,.13)
  guard(m,'y',.09,2.62,4.20,.32,1.97,p,.13)
  light_curtain(m,4.26,2.59,1.89,p)
  line_panel(m,1.81,p,True)
 return m


def timber_colour(i):
 shades=[(184,144,95),(197,159,110),(163,120,73),(210,177,126),(180,136,86),(202,166,115)]
 return (shades[i%len(shades)],.06,.68,4)


def timber_bundle(m,x0,x1,y0,y1,z0,nz=3,ny=5,beam_h=.12,seed=0,straps=False):
 # Individual rectangular timbers, all stored with their long axis along X.
 dy=(y1-y0)/ny
 for iz in range(nz):
  for iy in range(ny):
   shortening=.015*((iy*7+iz*3+seed)%4)
   xa=x0+shortening;xb=x1-.015*((iy+iz*5+seed)%3)
   z=z0+iz*(beam_h+.008)
   m.box((xa,y0+iy*dy+.008,z),(xb,y0+(iy+1)*dy-.008,z+beam_h),timber_colour(seed+iz*ny+iy),.003)
 if straps:
  top=z0+nz*(beam_h+.008)-.008
  for xx in [x0+(x1-x0)*.18,x0+(x1-x0)*.79]:
   m.box((xx-.018,y0-.005,z0-.002),(xx+.018,y0+.004,top+.006),DARK,.001)
   m.box((xx-.018,y1-.004,z0-.002),(xx+.018,y1+.005,top+.006),DARK,.001)
   m.box((xx-.018,y0-.005,top+.002),(xx+.018,y1+.005,top+.010),DARK,.001)


def build_rack():
 m=Model();p=PAINT_STD
 for xx in [.14,2.0,3.86]:
  m.box((xx-.085,.06,0),(xx+.085,.96,.064),DARK,.008)
  m.box((xx-.060,.085,.064),(xx+.060,.93,.14),p,.007)
  post(m,xx,.19,.10,2.43,p,.11,False)
  for z in np.arange(.34,2.39,.13):
   m.box((xx-.011,.247,z),(xx+.011,.252,z+.039),DARK,.001)
  for z in [.52,1.17,1.87]:
   m.box((xx-.047,.25,z),(xx+.047,.945,z+.084),STEEL,.006)
   m.box((xx-.058,.920,z-.002),(xx+.058,.960,z+.111),DARK,.004)
   m.beam((xx,.20,z-.21),(xx,.51,z+.008),.041,p)
   m.bolt(xx,.25,z+.031)
 for xa,xb in [(.14,2.0),(2.,3.86)]:
  for z in [.35,2.16]:m.beam((xa,.15,z),(xb,.15,z),.05,p)
  m.beam((xa,.115,.35),(xb,.115,2.16),.026,p)
  m.beam((xa,.115,2.16),(xb,.115,.35),.026,p)
 timber_bundle(m,.20,3.80,.33,.89,.610,3,3,.135,1,True)
 timber_bundle(m,.16,3.81,.35,.89,1.265,2,4,.13,4,False)
 timber_bundle(m,.22,3.77,.35,.86,1.965,2,6,.053,7,False)
 return m


def corrugated_panel(m,x0,x1,y0,y1,z0,z1,vertical=True):
 mat=((155,170,181),.38,.31,1)
 if vertical:
  # Wall in the XZ plane at y0. Profile folds, not a striped image.
  for xa in np.arange(x0,x1-.001,.18):
   xb=min(xa+.18,x1)
   vsx=[xa,xa+(xb-xa)*.26,xa+(xb-xa)*.40,xa+(xb-xa)*.75,xb]
   offsets=[0,0,.025,.025,0]
   for k in range(4):
    m.polygon([(vsx[k],y0+offsets[k],z0),(vsx[k+1],y0+offsets[k+1],z0),(vsx[k+1],y0+offsets[k+1],z1),(vsx[k],y0+offsets[k],z1)],mat)
    m.polygon([(vsx[k],y0+offsets[k],z1),(vsx[k+1],y0+offsets[k+1],z1),(vsx[k+1],y0+offsets[k+1],z0),(vsx[k],y0+offsets[k],z0)],mat)
 else:
  # Mono-pitch roof slopes towards the open front; flutes follow Y.
  def zz(y):return z0+(z1-z0)*(y-y0)/(y1-y0)
  for xa in np.arange(x0,x1-.001,.185):
   xb=min(xa+.185,x1)
   vx=[xa,xa+(xb-xa)*.28,xa+(xb-xa)*.40,xa+(xb-xa)*.70,xa+(xb-xa)*.83,xb]
   offsets=[0,0,.029,.029,0,0]
   for k in range(5):
    a,b=vx[k],vx[k+1];za,zb=offsets[k],offsets[k+1]
    m.polygon([(a,y0,zz(y0)+za),(b,y0,zz(y0)+zb),(b,y1,zz(y1)+zb),(a,y1,zz(y1)+za)],mat)
  m.box((x0,y1-.03,z1-.027),(x1,y1,z1+.025),STEEL,.004)
  m.box((x0,y0,z0-.02),(x1,y0+.04,z0+.025),STEEL,.004)


def build_shelter():
 m=Model();p=PAINT_STD
 # Roof and all structure remain inside the 6 x 3 x 3 metre envelope.
 for xx in [.16,2.04,3.95,5.84]:
  for yy in [.17,2.82]:
   height=2.82 if yy<1 else 2.50
   post(m,xx,yy,.032,height,p,.105)
   # Foot plates are structural parts, not a ground plane.
  m.beam((xx,.17,2.82),(xx,2.82,2.50),.095,p)
 for yy,zz in [(.17,2.79),(2.82,2.49)]:m.beam((.15,yy,zz),(5.85,yy,zz),.095,p)
 # Closed rear and one side with galvanised cladding; open front.
 corrugated_panel(m,.11,5.89,.10,.10,.18,2.75,True)
 for xa,xb in [(.16,2.04),(2.04,3.95),(3.95,5.84)]:
  m.beam((xa,.19,.22),(xb,.19,2.59),.035,p)
  m.beam((xa,.19,2.59),(xb,.19,.22),.035,p)
 # Far end side wall. Individual flat folds in the YZ plane.
 mat=((153,168,179),.35,.32,1)
 for yy in np.arange(.14,2.82,.17):
  yb=min(yy+.17,2.82);zh=2.77-(yy-.14)*.116
  m.box((5.867,yy,.19),(5.886,yb,zh),mat,.002)
  m.box((5.887,yy+.02,.20),(5.902,min(yy+.055,yb),zh-.015),ALU,.002)
 m.box((5.88,.13,.12),(5.915,2.83,.57),PAINT_GREY,.005)
 m.beam((5.82,.19,.26),(5.82,2.77,2.44),.04,p)
 for xx in [.17,2.05,3.96,5.84]:
  # Two cantilever supports per bay; clear front opening.
  for z in [.82,1.55]:
   m.beam((xx,.20,z),(xx,2.32,z),.06,p)
 # The timber is intentionally baked into these two approved storage states.
 timber_bundle(m,.27,1.88,.34,2.36,.16,4,5,.135,0,True)
 timber_bundle(m,.30,1.87,.35,2.23,1.03,3,6,.105,7,True)
 timber_bundle(m,2.18,3.78,.33,2.37,.18,5,6,.11,14,False)
 timber_bundle(m,2.20,3.79,.35,2.20,1.025,3,5,.11,20,False)
 timber_bundle(m,4.09,5.68,.34,2.41,.16,3,5,.15,9,True)
 timber_bundle(m,4.11,5.67,.36,2.25,.86,3,5,.125,25,False)
 timber_bundle(m,4.16,5.66,.37,2.16,1.56,3,5,.096,5,False)
 corrugated_panel(m,.025,5.975,.035,2.965,2.91,2.56,False)
 return m


def build(name):
 if name=='sprayRobot.standard':return build_spray()
 if name.startswith('cnc5.'):return build_cnc(name.split('.')[1])
 if name.startswith('windowLine.'):return build_line(int(name[-1]))
 if name=='timberStorage.rack':return build_rack()
 if name=='timberStorage.shelter':return build_shelter()
 raise ValueError(name)


def audit_model(model,env):
 pts=np.asarray(model.tri).reshape(-1,3)
 lo=pts.min(0);hi=pts.max(0)
 return {'triangles':len(model.tri),'boundsM':{'min':lo.tolist(),'max':hi.tolist()},
         'insideEnvelope':bool(np.all(lo>=-1e-8) and np.all(hi<=np.array(env)+1e-8)),
         'groundContact':bool(abs(lo[2])<1e-7),
         'outsideLowByM':np.maximum(0,-lo).tolist(),
         'outsideHighByM':np.maximum(0,hi-np.array(env)).tolist()}


def main():
 selection=sys.argv[1:] or ['all'];test='--audit' in selection
 report={}
 for pk,pinfo in PACKS.items():
  for name,env in pinfo['assets'].items():
   if selection not in [['all'],['--audit']] and name not in selection and pk not in selection:continue
   m=build(name);data=audit_model(m,env);report[name]=data
   print(name,json.dumps(data),flush=True)
   if not data['insideEnvelope']:continue
   if test:continue
   for angle in [0,90]:
    t=time.time();small,master=render(m,env,angle,4)
    out=ROOT/pinfo['folder']
    for rel,im in [(f'sprites-2x/{angle}/{name}.png',small),(f'masters-4x/{angle}/{name}.png',master)]:
     p=out/rel;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
    print(' rendered',name,angle,small.size,'seconds',round(time.time()-t,2),flush=True)
   (HERE/'models-audit').mkdir(exist_ok=True)
   (HERE/'models-audit'/f'{name}.json').write_text(json.dumps(data,indent=2))
 (HERE/'last-build.json').write_text(json.dumps(report,indent=2))
if __name__=='__main__':main()
