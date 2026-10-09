"""Woodwork Empire Tycoon / order 3. Metre-grid reconstruction of approved equipment.
One mesh per item, two physical rotations. No bitmap extraction or screen-space warps.
"""
from __future__ import annotations
import json,math,sys,time
from pathlib import Path
import numpy as np
from renderer import Model,STEEL,ALU,CHROME,DARK,RUBBER,GLASS,RED,YELLOW,GREEN,PALETTE,roller_table,base_cabinet,merge,project
from build_assets import bezier,guard,monitor,light_curtain,controller,timber_bundle,timber_colour,build_line,build_rack,build_shelter
from render_pbr import Renderer

OUT=Path(__file__).resolve().parents[1]/'delivery'
USED=((96,126,99),.12,.52,3)
BUDGET=((177,187,190),.16,.43,0)
STANDARD=((42,102,65),.16,.36,0)
PRO=((24,72,48),.19,.33,0)
INDUSTRIAL=((34,92,157),.20,.32,0)
RACK_GREEN=((28,91,68),.15,.38,0)
RACK_RED=((169,32,28),.16,.36,0)
STEEL=((160,174,182),.78,.30,1)
ALU=((193,203,209),.75,.33,1)
CHROME=((184,194,204),.94,.19,1)
DARK=((33,41,47),.12,.56,0)
RUBBER=((20,26,29),.03,.75,0)
BELT=((102,52,42),.01,.90,6)
CREAM=((214,201,164),.04,.60,0)
WHITE=((191,196,186),.12,.40,0)
FOAM=((35,39,40),.01,.97,6)
WOOD=[((178,135,83),.04,.60,4),((192,150,98),.04,.58,4),((174,131,78),.04,.64,4),((199,158,108),.04,.57,4)]
ENVS={
 'framePress.used':(2,1,1),'framePress.budget':(3,1,1.25),'framePress.standard':(3,1,2.25),'framePress.pro':(4,1,2.5),'framePress.industrial':(5,2,2.75),
 'glueTable.standard':(3,1,1),
 'sander.used':(2,1,1),'sander.budget':(2,1,1.25),'sander.standard':(2,1,1.5),'sander.pro':(3,2,1.75),'sander.industrial':(6,2,2),
 'timberRack.40':(2,1,.5),'timberRack.80':(3,1,.75),'timberRack.120':(3,1,1.75),'timberRack.160':(3,2,2.25),'timberRack.200':(4,1,2.25),'timberRack.240':(4,2,2.5),'timberRack.300':(5,2,2.75),'timberRack.360':(6,2,3),
}

# ----------------------- common physical details --------------------------
def footplate(m,x,y,w,d,side=.11,paint=DARK):
    # Footplates touch the exact footprint corners; no extra floor polygon.
    xa=0 if x==0 else w-side;ya=0 if y==0 else d-side
    m.box((xa,ya,0),(xa+side,ya+side,.026),paint,.006)
    for dx,dy in [(.027,.027),(side-.026,side-.026)]:m.bolt(xa+dx,ya+dy,.027,'z',.010)
    return xa+side/2,ya+side/2

def corner_feet(m,w,d,z=.10,paint=DARK):
    pts=[]
    for x in [0,w]:
      for y in [0,d]:
        xx,yy=footplate(m,x,y,w,d,.12,paint)
        m.cyl((xx,yy,.026),(xx,yy,z),.017,CHROME,14)
        pts.append((xx,yy))
    return pts

def table_frame(m,w,d,top,paint,shelf=True,planks=False):
    pts=corner_feet(m,w,d,.095)
    for x,y in pts:
        m.box((x-.035,y-.035,.075),(x+.035,y+.035,top-.035),paint,.004)
        for zz in [.20,top-.14]:m.bolt(x,y+.037,zz,'y',.012)
    for y in [.06,d-.06]:
        m.box((.028,y-.035,top-.125),(w-.028,y+.035,top-.03),paint,.006)
        m.box((.047,y-.023,.175),(w-.047,y+.023,.225),paint,.003)
    for x in [.06,w-.06]:
        m.box((x-.032,.03,top-.125),(x+.032,d-.03,top-.03),paint,.006)
        m.box((x-.023,.05,.175),(x+.023,d-.05,.225),paint,.003)
    if shelf:
        m.box((.11,.11,.215),(w-.11,d-.11,.244),paint,.004)
    if planks:
        for i in range(5):
            y0=d*i/5+.003;y1=d*(i+1)/5-.003
            m.box((0,y0,top-.04),(w,y1,top+.015),WOOD[i%4],.004)
            for x in [.13,w-.13]:m.bolt(x,(y0+y1)/2,top+.015,'z',.007)
    return pts

def fasteners_panel(m,x0,x1,y,z0,z1):
    for x in [x0+.025,x1-.025]:
        for z in [z0+.026,z1-.026]:m.bolt(x,y,z,'y',.010)

def cap_rhs(m,x,y,z,s,paint):
    m.box((x-s/2,y-s/2,z-.006),(x+s/2,y+s/2,z),paint,.005)
    m.box((x-s*.33,y-s*.33,z-.002),(x+s*.33,y+s*.33,z),DARK,.002)

def hose(m,points,r=.021,mat=RUBBER):
    bezier(m,points,r,mat,22)

def hexnut(m,x,y,z,r=.028):
    m.cyl((x,y,z),(x,y,z+.035),r,STEEL,6)
    m.cyl((x,y,z+.035),(x,y,z+.039),r*.59,DARK,18)

def thread(m,p0,p1,r=.012,pitch=.018):
    p0=np.array(p0);p1=np.array(p1);v=p1-p0;le=np.linalg.norm(v);axis=v/le
    temp=np.array([0,0,1.]) if abs(axis[2])<.8 else np.array([1,0,0.])
    u=np.cross(axis,temp);u/=np.linalg.norm(u);vv=np.cross(axis,u)
    n=max(12,int(le/pitch*8));prev=None
    for j in range(n+1):
        t=j/n;phi=t*le/pitch*2*math.pi;p=p0+t*v+r*(u*math.cos(phi)+vv*math.sin(phi))
        if prev is not None:m.cyl(prev,p,.0024,CHROME,5)
        prev=p

def clamp_horizontal(m,x,y0,y1,z,paint=DARK):
    # Long rail and two jaws, oriented across the table.
    m.box((x-.022,y0,z),(x+.022,y1-.025,z+.024),STEEL,.003)
    m.box((x-.043,y0,z+.008),(x+.043,y0+.052,z+.12),paint,.005)
    m.box((x-.040,y1-.23,z+.008),(x+.040,y1-.174,z+.13),paint,.005)
    m.cyl((x,y1-.20,z+.079),(x,y1-.035,z+.079),.010,CHROME,12)
    m.cyl((x,y1-.195,z+.079),(x,y1-.178,z+.079),.036,RED,20)
    m.cyl((x,y1-.080,z+.079),(x,y1-.008,z+.079),.021,RED,20)
    thread(m,(x,y1-.17,z+.079),(x,y1-.085,z+.079),.011,.019)
    m.box((x-.040,y0+.045,z+.064),(x+.04,y0+.061,z+.118),RED,.003)

def spare_clamps(m,x,y0,y1,top,count=7,paint=DARK):
    m.box((x-.07,y0,top-.20),(x+.035,y1,top-.16),STEEL,.004)
    for j,y in enumerate(np.linspace(y0+.035,y1-.035,count)):
        zz=top-.035-.018*(j%2)
        m.box((x-.012,y-.010,.28),(x+.012,y+.010,zz-.12),STEEL,.002)
        m.box((x-.058,y-.026,zz-.155),(x+.038,y+.026,zz-.113),paint,.003)
        m.cyl((x-.035,y,zz-.11),(x-.035,y,zz),.014,RED,16)
        m.cyl((x-.035,y,zz),(x-.035,y,zz+.035),.012,RED,14)

def rim_can(m,x,y,z,r,h,mat=STEEL,handle=True):
    m.cyl((x,y,z),(x,y,z+h),r,mat,40)
    for zz in [z+.015,z+h-.018]:m.cyl((x,y,zz),(x,y,zz+.012),r*1.025,ALU,40)
    m.cyl((x,y,z+h),(x,y,z+h+.009),r*.98,ALU,36)
    m.box((x-.045,y-.013,z+h+.009),(x+.045,y+.013,z+h+.035),DARK,.005)
    if handle:
        pts=[(x-r,y,z+h*.65),(x-r*1.10,y,z+h*1.19),(x+r*1.10,y,z+h*1.19),(x+r,y,z+h*.65)]
        hose(m,pts,.008,STEEL)

def controls(m,x,y,z,screen=False):
    m.controls(x,y,z,screen,.20 if not screen else .26)
    m.bolt(x-.087,y+.012,z+.087,'y',.007)

def hydraulic(m,x,y,zbase,ztop,rod_end,paint):
    m.cyl((x,y,zbase),(x,y,ztop-.024),.075,paint,32)
    for zz in [zbase,ztop-.038]:
        m.box((x-.088,y-.088,zz),(x+.088,y+.088,zz+.035),STEEL,.008)
        for dx in [-.066,.066]:
            for dy in [-.066,.066]:m.cyl((x+dx,y+dy,zbase+.027),(x+dx,y+dy,ztop-.015),.009,CHROME,10)
    m.cyl((x,y,ztop-.024),(x,y,ztop),.057,STEEL,24)
    m.cyl((x,y,rod_end),(x,y,zbase),.026,CHROME,28)
    m.box((x-.08,y-.07,rod_end-.022),(x+.08,y+.07,rod_end+.03),STEEL,.006)
    hose(m,[(x+.067,y,zbase+.10),(x+.20,y-.02,ztop-.02),(x+.26,y-.14,zbase+.20),(x+.24,y-.12,rod_end-.35)],.013)

# ------------------------------ presses ----------------------------------
def build_press(tier):
    name='framePress.'+tier;w,d,h=ENVS[name];m=Model()
    if tier in ['used','budget']:
        p=USED if tier=='used' else BUDGET
        top=.79 if tier=='used' else .94
        table_frame(m,w,d,top,p,shelf=False,planks=tier=='used')
        if tier=='budget':
            for y in np.linspace(.026,d-.13,7):
                m.box((.01,y,top-.04),(w-.11,y+.096,top+.018),ALU,.005)
                m.box((.03,y+.048,top+.018),(w-.13,y+.057,top+.020),DARK,.001)
                for x in [.14,w-.25]:m.bolt(x,y+.021,top+.020,'z',.008)
            spare_clamps(m,w-.049,.10,.90,1.25,8)
        for x in np.linspace(.22,w-(.40 if tier=='budget' else .19),4 if tier=='used' else 5):
            clamp_horizontal(m,x,.04,.965,top+.026)
        if tier=='used':
            # One stored clamp reaches the one-metre envelope, no artificial high point.
            spare_clamps(m,w-.043,.23,.75,1.,4)
        return m
    p={'standard':STANDARD,'pro':PRO,'industrial':INDUSTRIAL}[tier]
    industrial=tier=='industrial';pro=tier=='pro'
    corner_feet(m,w,d,.085)
    if industrial:
        xL,xR=1.12,3.85;yp=1.10;top=2.31
        for a,b in [(0,1.12),(3.85,5)]:roller_table(m,a,b,.04,d-.04,.91,p,True,.15)
        # Tie the end feet to the conveyor frames and the broad machine base.
        for y in [.06,d-.06]:
            m.box((.05,y-.023,.08),(w-.05,y+.023,.12),p,.004)
        for x in [xL,xR]:
            m.box((x-.16,.07,.026),(x+.16,d-.05,.155),p,.01)
    else:
        xL,xR=(.22,w-.22) if not pro else (.58,w-.58);yp=.39;top=h-.27 if not pro else 2.10
        for x in [xL,xR]:
            xx0=0 if x==xL else w-.38
            m.box((xx0,.02,.027),(xx0+.38,d-.02,.14),p,.010)
            m.beam((x,.83,.13),(x,yp,.46),.064,p)
        # Structural low tie between the two full-depth bases.
        m.box((.06,d-.10,.08),(w-.06,d-.045,.145),p,.005)
    for x in [xL,xR]:
        m.box((x-.105,yp-.12,.13),(x+.105,yp+.14,top),p,.009)
        m.box((x-.068,yp+.142,.35),(x+.068,yp+.152,top-.12),STEEL,.002)
        for z in np.arange(.44,top-.12,.145):
            m.cyl((x,yp+.153,z),(x,yp+.157,z),.013,DARK,12)
        fasteners_panel(m,x-.104,x+.104,yp+.16,.26,top-.10)
    # Beam gaps remain empty; no boards or window frames in this equipment.
    m.box((xL-.105,yp-.13,top-.14),(xR+.105,yp+.18,top+.01),p,.01)
    m.box((xL,yp-.08,.23),(xR,yp+.17,.37),p,.008)
    for z in [.61,1.43 if industrial else 1.16]:
        m.box((xL+.04,yp+.025,z),(xR-.04,yp+.185,z+.10),ALU,.006)
        m.box((xL+.06,yp+.186,z+.020),(xR-.06,yp+.199,z+.065),STEEL,.002)
        for x in [xL+.02,xR-.02]:
            m.box((x-.14,yp-.13,z-.032),(x+.14,yp+.20,z+.144),p,.008)
            m.bolt(x,yp+.205,z+.05,'y',.020)
    if tier=='standard':
        for x in [.63,1.5,2.37]:
            m.cyl((x,yp+.06,1.51),(x,yp+.06,h-.034),.019,CHROME,20)
            thread(m,(x,yp+.06,1.90),(x,yp+.06,h-.05),.021,.03)
            hexnut(m,x,yp+.06,top+.009,.039)
            m.cyl((x-.15,yp+.06,h-.022),(x+.15,yp+.06,h-.022),.022,DARK,18)
            m.box((x-.07,yp-.014,1.49),(x+.07,yp+.132,1.545),STEEL,.006)
        for x,sgn in [(xL,-1),(xR,1)]:
            a=x+sgn*.06;b=x+sgn*.16
            m.cyl((a,yp+.27,.94),(b,yp+.27,.94),.016,CHROME,16)
            m.cyl((b,yp+.20,.94),(b,yp+.34,.94),.019,DARK,14)
    else:
        xs=[1.59,2.48,3.38] if industrial else [1.18,2.82]
        for x in xs:hydraulic(m,x,yp,top+.005,h,1.54 if industrial else 1.40,p)
        if pro:
            for x in [.035,3.61]:
                m.box((x,.26,.15),(x+.35,.87,1.27),p,.009)
                m.box((x+.020,.872,.22),(x+.33,.890,1.23),p,.003)
                controls(m,x+.18,.905,.96)
                m.vents(x+.06,.897,.30,.22,6)
                fasteners_panel(m,x+.02,x+.33,.90,.23,1.22)
        else:
            for x in [.94,4.055]:
                guard(m,'x',x,.13,1.47,.91,2.06,p,.10)
                light_curtain(m,x,1.72,2.13,p)
            # Separate full-height console, not painted lettering.
            controller(m,4.18,1.55,.44,.39,1.58,BUDGET,False)
            monitor(m,4.40,1.949,1.21,.34)
            m.box((1.32,.10,.15),(1.82,.43,.87),p,.01)
            m.cyl((1.58,.28,.87),(1.58,.28,1.01),.083,DARK,24)
    return m

# ------------------------------ glue table --------------------------------
def build_glue():
    m=Model();w,d,h=ENVS['glueTable.standard'];table_frame(m,w,d,.745,STANDARD,True)
    m.box((0,0,.726),(w,d,.767),STEEL,.009)
    for x in [.13,2.86]:
        for y in [.1,.90]:m.bolt(x,y,.768,'z',.009)
    # Tray, side cheeks, drive handle and cream application roller.
    m.box((1.01,.20,.769),(1.93,.69,.81),DARK,.005)
    m.box((1.035,.224,.81),(1.905,.666,.822),STEEL,.003)
    for x in [1.06,1.86]:
        m.box((x-.03,.25,.82),(x+.03,.62,.92),STANDARD,.007)
    m.cyl((1.082,.443,.882),(1.838,.443,.882),.068,CREAM,48)
    m.cyl((1.01,.443,.882),(1.93,.443,.882),.016,CHROME,18)
    m.cyl((1.944,.443,.882),(1.944,.55,.948),.010,STEEL,12)
    m.cyl((1.945,.55,.948),(2.035,.55,.948),.018,DARK,16)
    rim_can(m,2.39,.40,.772,.155,.19,STEEL,False)
    rim_can(m,1.04,.57,.249,.19,.32,WHITE,True)
    spare_clamps(m,.075,.11,.89,1.0,8)
    return m

# ----------------------------- sanders ------------------------------------
def perforated_deck(m,x0,x1,y0,y1,z,th=.025):
    nx=17;ny=8;dx=(x1-x0)/nx;dy=(y1-y0)/ny;r=min(dx,dy)*.26
    for ix in range(nx):
      for iy in range(ny):
        cx=x0+(ix+.5)*dx;cy=y0+(iy+.5)*dy
        for j in range(16):
            a=j*math.tau/16;b=(j+1)*math.tau/16
            def outer(t):
                cs,sn=math.cos(t),math.sin(t);s=min(dx*.5/max(abs(cs),1e-12),dy*.5/max(abs(sn),1e-12))
                return (cx+s*cs,cy+s*sn,z)
            ia=(cx+r*math.cos(a),cy+r*math.sin(a),z);ib=(cx+r*math.cos(b),cy+r*math.sin(b),z)
            m.quad([outer(a),outer(b),ib,ia],[0,0,1],ALU)
            m.quad([ia,ib,(ib[0],ib[1],z-th),(ia[0],ia[1],z-th)],[-math.cos((a+b)/2),-math.sin((a+b)/2),0],DARK)

def build_sander(tier):
    w,d,h=ENVS['sander.'+tier];m=Model();p={'used':USED,'budget':BUDGET,'standard':STANDARD,'pro':PRO,'industrial':INDUSTRIAL}[tier]
    if tier=='used':
        table_frame(m,w,d,.71,p,True,True)
        rim_can(m,1.49,.55,.25,.175,.31,STEEL,False)
        m.cyl((1.49,.55,.55),(1.49,.55,.61),.193,DARK,28)
        # Compact hand-held belt sander on its sanding shoe.
        m.box((.63,.30,.73),(1.12,.64,.771),BELT,.015)
        m.box((.665,.32,.77),(1.09,.62,.862),p,.018)
        m.cyl((.69,.29,.785),(.69,.655,.785),.046,DARK,24)
        m.box((.86,.34,.86),(1.06,.60,.92),p,.012)
        hose(m,[(.70,.50,.84),(.70,.51,.984),(1.0,.51,.984),(1.0,.50,.90)],.016,DARK)
        hose(m,[(1.073,.57,.852),(1.81,.48,1.07),(1.87,.32,.66),(1.50,.47,.585)],.028)
        # The actual hose connector, not a synthetic anchor, reaches z = 1 metre.
        m.tube(1.57,.28,.84,.16,.043,STEEL)
        return m
    if tier=='budget':
        corner_feet(m,w,d,.11)
        m.box((.026,.026,.11),(w-.026,d-.026,.872),p,.010)
        m.box((.09,.08,.872),(1.91,.92,.928),DARK,.006)
        m.box((0,0,.891),(2,.045,.985),ALU,.004)
        m.box((0,.955,.891),(2,1,.985),ALU,.004)
        for x in [0,1.965]:m.box((x,.045,.891),(x+.035,.955,.985),ALU,.004)
        perforated_deck(m,.037,1.963,.047,.953,.985)
        m.box((.13,.978,.21),(1.86,.997,.81),p,.003)
        m.box((1.69,.998,.48),(1.717,1.,.60),DARK,.001)
        controls(m,1.38,.965,.45)
        m.vents(.19,.992,.27,.41,5)
        for x in [.16,1.83]:
            for z in [.26,.77]:m.bolt(x,.986,z,'y',.010)
        m.tube(1.66,.225,.985,.265,.108,STEEL)
        # Side discharge collar confined to the prescribed footprint.
        m.cyl((1.89,.45,.50),(1.997,.45,.50),.117,STEEL,28,False)
        m.cyl((1.995,.45,.50),(1.999,.45,.50),.093,DARK,28)
        return m
    if tier=='standard':
        corner_feet(m,w,d,.13)
        base_cabinet(m,.055,1.80,.10,.88,.12,.78,p,2,False)
        for y in [.09,.91]:m.box((.06,y-.03,.09),(1.94,y+.03,.16),p,.004)
        # A long vertical abrasive belt with protected end rollers.
        m.box((.08,.19,.76),(1.79,.39,1.283),p,.01)
        m.box((.16,.394,.915),(1.70,.408,1.227),BELT,.010)
        for x in [.16,1.70]:
            m.cyl((x,.26,1.073),(x,.397,1.073),.155,DARK,28)
        m.box((.16,.400,.917),(1.70,.407,1.23),BELT,.002)
        m.box((.0,.430,.888),(1.842,1.0,.931),STEEL,.009)
        for x in [.35,1.44]:
            m.beam((x,.49,.73),(x,.79,.887),.035,STEEL)
            m.wheel(x,.908,.64,.069)
        m.box((1.76,.22,.70),(1.971,.65,1.15),p,.013)
        for x in np.arange(1.80,1.94,.023):m.box((x,.24,.84),(x+.008,.62,1.08),STEEL,.002)
        m.tube(1.786,.216,1.195,.305,.103,STEEL)
        hose(m,[(1.67,.25,1.17),(1.52,.24,1.44),(1.82,.24,1.49),(1.80,.25,1.315)],.036)
        controls(m,1.68,.952,.63)
        return m
    # Enclosed through-feed machines, same family in both views.
    industrial=tier=='industrial';xa=.75 if industrial else .59;xb=w-xa
    roof=1.73 if industrial else 1.48;deck=.905 if industrial else .815
    corner_feet(m,w,d,.11)
    for a,b in [(0,xa+.015),(xb-.015,w)]:roller_table(m,a,b,.037,d-.037,deck,p,True,.14)
    # The final support pads hit the near corner exactly, keeping the ground datum.
    for y in [.06,d-.06]:m.box((.05,y-.025,.082),(w-.05,y+.025,.12),p,.004)
    base_cabinet(m,xa,xb,.085,1.82,.10,deck-.08,p,4 if industrial else 2,True)
    n=4 if industrial else 1;L=(xb-xa)/n
    for i in range(n):
        a=xa+i*L+.005;b=xa+(i+1)*L-.005
        # Side and front shell. The ends are pierced, not closed with a solid cuboid.
        m.box((a,.08,deck),(b,.155,roof-.058),p,.009)
        m.box((a,.080,roof-.07),(b,1.815,roof),p,.012)
        m.box((a,1.74,deck),(b,1.824,roof-.064),p,.009)
        if industrial:
            m.box((a+.075,1.826,1.13),(b-.075,1.846,1.522),DARK,.008)
            m.box((a+.103,1.848,1.158),(b-.103,1.855,1.492),GLASS,.005)
            m.box((b-.049,1.830,.971),(b-.032,1.88,1.089),DARK,.004)
            for z in [1.022,1.583]:m.box((a+.026,1.83,z),(a+.05,1.867,z+.068),ALU,.003)
        else:
            m.box((a+.03,1.83,.89),(b-.035,1.842,1.398),p,.004)
            m.box((b-.12,1.843,.994),(b-.10,1.873,1.165),DARK,.004)
            m.vents(a+.12,1.846,.98,.35,5)
        portX=(a+b)/2;portY=.69
        m.tube(portX,portY,roof,.27 if industrial else .27,.107 if industrial else .119,STEEL)
    for x in [xa,xb-.055]:
        for ya,yb in [(.085,.25),(1.61,1.822)]:m.box((x,ya,deck-.015),(x+.055,yb,roof-.07),p,.007)
        m.box((x,.18,1.39 if industrial else 1.20),(x+.06,1.73,roof-.04),p,.007)
        # Flexible curtain strips at the opening; clear material path below.
        for y in np.arange(.265,1.585,.095):
            m.box((x-.004,y,1.115 if industrial else 1.04),(x+.007,y+.078,1.387 if industrial else 1.205),RUBBER,.001)
    for x in np.linspace(xa+.14,xb-.14,4 if industrial else 2):
        m.cyl((x,.27,deck+.31),(x,1.60,deck+.31),.109,BELT,32)
    m.box((xa+.035,1.89,deck-.15),(xb-.03,1.929,deck-.105),ALU,.006)
    for x in [xa+.14,xb-.14]:m.box((x-.04,1.78,deck-.2),(x+.04,1.93,deck-.085),p,.005)
    controls(m,xb-.20,1.891,1.03,screen=industrial)
    return m

# ------------------------- rack family (metres provisional) ----------------
def rack_base(m,w,d,paint):
    corner_feet(m,w,d,.06,paint)
    for x in [.06,w-.06]:m.box((x-.045,.04,.05),(x+.045,d-.04,.145),paint,.006)
    for y in [.08,d-.08]:m.box((.06,y-.038,.061),(w-.06,y+.038,.13),paint,.006)

def rack_post(m,x,y,h,paint):
    m.box((x-.058,y-.058,.035),(x+.058,y+.058,h),paint,.006)
    cap_rhs(m,x,y,h,.112,paint)
    for z in np.arange(.24,h-.04,.18):
        m.box((x-.012,y+.059,z),(x+.012,y+.062,z+.042),DARK,.001)
    for z in [.14,h-.1]:m.bolt(x,y+.064,z,'y',.012)

def support(m,x,y0,y1,z,paint):
    m.box((x-.041,y0,z),(x+.041,y1,z+.067),paint,.005)
    m.box((x-.048,y1-.04,z),(x+.048,y1,z+.116),paint,.005)
    for y in [y0+.07,y1-.1]:m.bolt(x,y,z+.069,'z',.012)

def stored_bundle(m,x0,x1,y0,y1,z0,height,ny=6,seed=0):
    nz=max(1,round(height/.105))
    timber_bundle(m,x0,x1,y0,y1,z0,nz,ny,height/nz-.008,seed,True)
    # A row of very fine end-grain indicators only on the exposed end faces.
    # Individual planks are actual meshes, not painted stacks.

def build_capacity(cap):
    name=f'timberRack.{cap}';w,d,h=ENVS[name];m=Model();p=RACK_RED if cap==360 else RACK_GREEN
    rack_base(m,w,d,p)
    if cap<=80:
        for x in [.061,w-.061]:
            for y in [.09,d-.09]:rack_post(m,x,y,h,p)
        for y in [.075,d-.075]:m.box((.04,y-.025,.23),(w-.04,y+.025,.29),p,.005)
        stored_bundle(m,.13,w-.13,.16,d-.16,.155,.28 if cap==40 else .53,6,cap)
        return m
    if cap in (120,200):
        xs=[.09,w-.09] if cap==120 else [.09,w/2,w-.09]
        levels=[.25,1.03] if cap==120 else [.24,.92,1.62]
        for x in xs:
            rack_post(m,x,.13,h,p)
            m.box((x-.059,.04,.039),(x+.059,d-.025,.15),p,.006)
            for z in levels:
                support(m,x,.13,d-.05,z,p)
                m.beam((x,.145,z-.13),(x,.43,z+.03),.031,p)
        for a,b in zip(xs[:-1],xs[1:]):
            for z in [.19,h-.11]:m.beam((a,.12,z),(b,.12,z),.038,p)
            m.beam((a,.11,.19),(b,.11,h-.11),.023,p)
            m.beam((a,.105,h-.11),(b,.105,.19),.023,p)
        for i,z in enumerate(levels):stored_bundle(m,.16,w-.16,.24,d-.10,z+.072,.33,5,cap+i*11)
        return m
    if cap==160:
        # Real double-sided rack: the reverse view must still have three levels.
        xs=[.08,w-.08];y=d/2;levels=[.24,.91,1.58]
        for x in xs:
            rack_post(m,x,y,h,p)
            m.box((x-.05,.026,.04),(x+.05,d-.026,.14),p,.006)
            for z in levels:
                for a,b in [(.10,y-.10),(y+.1,d-.10)]:support(m,x,a,b,z,p)
        for z in [.23,h-.12]:m.beam((.08,y,z),(w-.08,y,z),.055,p)
        for a,b in [(.10,.88),(1.12,1.90)]:
            for i,z in enumerate(levels):stored_bundle(m,.16,w-.16,a,b,z+.072,.33,5,cap+i)
        return m
    # Box-framed pallet racks: 240 single bay, 300/360 two actual bays.
    bays=1 if cap==240 else 2;xs=np.linspace(.075,w-.075,bays+1)
    levels=([.20,.96,1.73] if cap==240 else ([.20,1.04,1.90] if cap==300 else [.17,.85,1.53,2.21]))
    for x in xs:
        for y in [.075,d-.075]:rack_post(m,x,y,h,p)
        for z in levels+[h-.07]:
            m.box((x-.04,.08,z),(x+.04,d-.08,z+.06),p,.005)
        m.beam((x+.015,.12,.25),(x+.015,d-.12,h-.15),.028,p)
        m.beam((x+.015,d-.12,.25),(x+.015,.12,h-.15),.028,p)
    for a,b in zip(xs[:-1],xs[1:]):
        for z in levels:
            for y in [.08,d-.08]:m.box((a,y-.025,z),(b,y+.025,z+.076),p,.005)
            # Real three rail pallet support under each stack.
            for x in np.linspace(a+.20,b-.20,3):m.box((x-.029,.11,z+.03),(x+.029,d-.11,z+.075),STEEL,.003)
        for i,z in enumerate(levels):stored_bundle(m,a+.105,b-.105,.14,d-.14,z+.083,.50 if cap==240 else .46,8,cap+i*3)
    return m

# --------------------------- cutter cases ---------------------------------
def cutter_ring(m,cx,cy,z,r,h,profile=False):
    # Steel cutters with genuine open arbor and removable profiled knives.
    n=40;ri=r*.29
    for j in range(n):
        a=math.tau*j/n;b=math.tau*(j+1)/n
        outer=[(cx+r*math.cos(t),cy+r*math.sin(t),zz) for zz in [z,z+h] for t in [a,b]]
        m.quad([outer[0],outer[1],outer[3],outer[2]],[math.cos((a+b)/2),math.sin((a+b)/2),0],STEEL)
        m.quad([(cx+ri*math.cos(a),cy+ri*math.sin(a),z+h),(cx+r*math.cos(a),cy+r*math.sin(a),z+h),(cx+r*math.cos(b),cy+r*math.sin(b),z+h),(cx+ri*math.cos(b),cy+ri*math.sin(b),z+h)],[0,0,1],CHROME)
        m.quad([(cx+ri*math.cos(a),cy+ri*math.sin(a),z),(cx+ri*math.cos(b),cy+ri*math.sin(b),z),(cx+ri*math.cos(b),cy+ri*math.sin(b),z+h),(cx+ri*math.cos(a),cy+ri*math.sin(a),z+h)],[-math.cos((a+b)/2),-math.sin((a+b)/2),0],DARK)
    for a in [0,math.pi/2,math.pi,3*math.pi/2]:
        # Cutting insert projected outward, tangential edge and retaining screw.
        v=np.array([math.cos(a),math.sin(a),0]);u=np.array([-math.sin(a),math.cos(a),0]);c=np.array([cx,cy,z+h*.5])+v*r*.91
        vs=[c+v*vv+u*uu+np.array([0,0,zz]) for vv,uu,zz in [(0,-r*.31,-h*.4),(r*.25,-r*.21,-h*.4),(r*.25,r*.22,h*.35),(0,r*.31,h*.35)]]
        m.polygon(vs,CHROME)
        m.bolt(cx+v[0]*r*.82,cy+v[1]*r*.82,z+h+.002,'z',r*.10)

def build_cutters(kind):
    m=Model();w=1.0;d=.72;top=.13
    # Same case, handle, hinges and foam for all three sets.
    m.box((0,0,.0),(w,d,top),DARK,.018)
    m.box((.018,.017,.075),(.982,.703,.144),WOOD[1],.010)
    m.box((.045,.045,.132),(.955,.674,.15),FOAM,.01)
    # Upright lid at the rear, leaving the cutter sets clearly visible.
    m.box((0,.005,.13),(1,.055,.72),WOOD[1],.013)
    m.box((.030,.056,.17),(.970,.065,.686),FOAM,.005)
    for x in [.11,.84]:
        m.box((x,.010,.095),(x+.055,.069,.175),STEEL,.004)
        m.box((x,.702,.048),(x+.055,.733,.112),STEEL,.005)
    hose(m,[(.34,.722,.064),(.36,.845,.064),(.64,.845,.064),(.66,.722,.064)],.024,DARK)
    if kind=='Sash':
        for j in range(2):
            for i in range(4):cutter_ring(m,.155+i*.228,.20+j*.21,.151,.072,.082)
    elif kind=='Casement':
        for y in [.23,.46]:
            for x in [.27,.70]:
                cutter_ring(m,x,y,.151,.112,.10)
                cutter_ring(m,x,y,.245,.071,.025)
    else:
        cutter_ring(m,.70,.345,.151,.185,.043)
        cutter_ring(m,.70,.345,.196,.090,.10)
        for y in [.235,.45]:cutter_ring(m,.24,y,.151,.090,.088)
    for x in [.16,.26,.36,.47]:cutter_ring(m,x,.594,.151,.031,.022)
    # Flat spanner across the front of the case, never floating text or labels.
    m.box((.56,.588,.152),(.87,.616,.164),STEEL,.003)
    m.cyl((.875,.602,.151),(.875,.602,.165),.040,STEEL,8)
    return m


def audit(m,env):
    pts=np.array(m.tri).reshape(-1,3);lo=pts.min(0);hi=pts.max(0)
    return {'triangles':len(m.tri),'boundsMinM':lo.tolist(),'boundsMaxM':hi.tolist(),'insideEnvelope':bool((lo>=-1e-7).all() and (hi<=np.array(env)+1e-7).all()),'actualHeightM':float(hi[2]-lo[2]),'heightMatches':bool(abs(hi[2]-env[2])<1e-6),'grounded':bool(abs(lo[2])<1e-8)}

def build(name):
    if name.startswith('framePress.'):return build_press(name.split('.')[1])
    if name.startswith('sander.'):return build_sander(name.split('.')[1])
    if name=='glueTable.standard':return build_glue()
    if name.startswith('timberRack.'):return build_capacity(int(name.split('.')[1]))
    if name.startswith('cutters'):return build_cutters(name[7:].split('.')[0])
    raise ValueError(name)

def main():
    names=[a for a in sys.argv[1:] if not a.startswith('--')] or list(ENVS)
    dry='--audit' in sys.argv
    r=None if dry else Renderer();reports={}
    for name in names:
        t=time.time();m=build(name);env=ENVS[name]
        report=audit(m,env);reports[name]=report;print(name,json.dumps(report),flush=True)
        if not report['insideEnvelope'] or not report['heightMatches']:
            print('NOT RENDERED: geometry requires adjustment',flush=True);continue
        if dry:continue
        for ang in [0,90]:
            sm,hi=r.render(m,env,ang,4)
            for folder,im in [('sprites-2x',sm),('masters-4x',hi)]:
                path=OUT/folder/str(ang)/f'{name}.png';path.parent.mkdir(exist_ok=True,parents=True);im.save(path)
        print('rendered both',name,'seconds',round(time.time()-t,2),flush=True)
    (OUT/'reports').mkdir(parents=True,exist_ok=True)
    for name,re in reports.items():(OUT/'reports'/f'{name}.json').write_text(json.dumps(re,indent=2))


def finish(name,m):
    """Assembly details are part of the model and rotate with it."""
    if name.startswith('framePress.') and name not in ['framePress.used','framePress.budget']:
        tier=name.split('.')[1];w,d,h=ENVS[name]
        yp=1.10 if tier=='industrial' else .39
        xL,xR=(1.12,3.85) if tier=='industrial' else ((.58,w-.58) if tier=='pro' else (.22,w-.22))
        top=2.31 if tier=='industrial' else (2.1 if tier=='pro' else h-.27)
        for x in [xL,xR]:
            # Replaceable guide pads and bolted reinforcement plates.
            m.box((x-.12,yp+.161,top-.29),(x+.12,yp+.191,top-.15),STEEL,.005)
            for dx in [-.083,.083]:
                for z in [top-.26,top-.18]:m.bolt(x+dx,yp+.194,z,'y',.017)
            for z in [.63,1.19 if tier!='industrial' else 1.45]:
                m.cyl((x,yp+.205,z),(x,yp+.231,z),.035,CHROME,22)
        if tier in ['pro','industrial']:
            for x in ([1.59,2.48,3.38] if tier=='industrial' else [1.18,2.82]):
                for dx in [-.066,.066]:
                    for dy in [-.066,.066]:m.bolt(x+dx,yp+dy,h-.016,'z',.012)
                m.box((x-.115,yp+.205,1.51),(x+.115,yp+.235,1.63),ALU,.005)
                for dx in [-.072,.072]:m.bolt(x+dx,yp+.237,1.57,'y',.012)
            # Small metal hose couplings at the hydraulic body, not loose floating pipes.
            for x in ([1.59,2.48,3.38] if tier=='industrial' else [1.18,2.82]):
                m.cyl((x+.063,yp,top+.095),(x+.11,yp,top+.095),.022,STEEL,6)
        for x in np.linspace(xL+.22,xR-.22,9):
            # Unnumbered settings ruler, only engraved strokes.
            m.box((x-.003,yp+.182,top-.115),(x+.003,yp+.185,top-.076),ALU,.001)
    if name in ['sander.pro','sander.industrial']:
        w,d,h=ENVS[name];xa=.75 if name.endswith('industrial') else .59;xb=w-xa
        n=4 if name.endswith('industrial') else 1;L=(xb-xa)/n
        for i in range(n):
            a=xa+i*L;b=a+L
            for x in [a+.07,b-.07]:
                for z in [.22,.67]:m.bolt(x,1.839,z,'y',.012)
            # Raised handles with end brackets and grip span.
            for z in [.975,1.105]:m.box((b-.069,1.856,z),(b-.035,1.89,z+.018),DARK,.003)
            m.cyl((b-.052,1.901,.99),(b-.052,1.901,1.112),.011,STEEL,16)
        for x in [xa,xb]:
            for y in [.23,1.67]:
                m.box((x-.034,y-.034,.73),(x+.034,y+.034,.80),p if (p:=INDUSTRIAL if n==4 else PRO) else PRO,.005)
    # Endgrain on the X-end faces, longitudinal timber grain elsewhere.
    for i,mat in enumerate(m.mat):
        if mat[3]==4:
            nav=np.abs(np.asarray(m.norm[i]).mean(0))
            if nav[0]>.90:m.mat[i]=(mat[0],mat[1],mat[2],7)
    return m

def transformed(src,scale,off):
    dst=Model();sc=np.asarray(scale if hasattr(scale,'__len__') else [scale]*3);off=np.asarray(off)
    dst.tri=[np.asarray(t)*sc+off for t in src.tri]
    dst.norm=[np.asarray(n)/sc for n in src.norm]
    dst.norm=[n/np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12) for n in dst.norm]
    dst.mat=src.mat.copy();dst.boxes=[np.asarray(b)*sc+off for b in src.boxes]
    return dst

def build_extra(name):
    import build_assets as old
    if name.startswith('cutters'):
        m=build_cutters(name[7:].split('.')[0]);m=transformed(m,.72,(.14,.185,.17));return finish(name,m)
    if name.endswith('.empty'):
        original=old.timber_bundle
        try:
            old.timber_bundle=lambda *args,**kwargs:None
            return old.build_rack() if '.rack.' in name else old.build_shelter()
        finally:old.timber_bundle=original
    if name=='windowLine.stage1':
        m=old.build_line(1);p=old.PAINT_IND
        # Crosscut saw added to the original module; its old conveyor and all parts stay.
        m.box((.40,.28,.16),(.59,.47,1.79),p,.011)
        m.box((.36,.26,1.72),(.64,1.66,1.87),p,.012)
        m.cyl((.395,1.47,1.58),(.605,1.47,1.58),.23,STEEL,64)
        m.cyl((.38,1.47,1.58),(.624,1.47,1.58),.049,CHROME,32)
        # Upper semicircular guard with a genuine circular contour.
        r=.262;rr=.237
        for j in range(32):
            a=math.pi*j/32;b=math.pi*(j+1)/32
            for x in [.366,.637]:
                m.polygon([(x,1.47+r*math.cos(a),1.58+r*math.sin(a)),(x,1.47+r*math.cos(b),1.58+r*math.sin(b)),(x,1.47+rr*math.cos(b),1.58+rr*math.sin(b)),(x,1.47+rr*math.cos(a),1.58+rr*math.sin(a))],p)
            m.polygon([(.366,1.47+r*math.cos(a),1.58+r*math.sin(a)),(.637,1.47+r*math.cos(a),1.58+r*math.sin(a)),(.637,1.47+r*math.cos(b),1.58+r*math.sin(b)),(.366,1.47+r*math.cos(b),1.58+r*math.sin(b))],p)
        m.cyl((.431,.93,1.847),(.571,.93,1.847),.16,DARK,36)
        m.box((.09,.69,1.01),(.95,.738,1.136),STEEL,.004)
        for x in [.17,.79]:
            m.box((x-.035,.70,1.06),(x+.035,.84,1.16),YELLOW,.005)
            m.cyl((x,.775,1.14),(x,.775,1.25),.014,DARK,16)
        return m
    raise ValueError(name)

EXTRAS={'cuttersSash.standard':(1,1,1),'cuttersCasement.standard':(1,1,1),'cuttersDoor.standard':(1,1,1),'windowLine.stage1':(6,3,2.5),'timberStorage.rack.empty':(4,1,2.5),'timberStorage.shelter.empty':(6,3,3)}

def deliver_main():
    names=[a for a in sys.argv[1:] if not a.startswith('--')] or list(ENVS)+list(EXTRAS)
    dry='--audit' in sys.argv;r=None if dry else Renderer()
    scale=6
    reports={}
    for name in names:
        t=time.time();extra=name in EXTRAS;env=(EXTRAS if extra else ENVS)[name]
        m=build_extra(name) if extra else finish(name,build(name))
        report=audit(m,env);report['category']='catalog' if name.startswith('cutters') else ('optional-preserved' if extra else 'metric')
        reports[name]=report
        print(name,json.dumps(report),flush=True)
        if not report['insideEnvelope'] or (not extra and not report['heightMatches']):
            print('GEOMETRY FAILED - NOT EXPORTED',flush=True);continue
        if dry:continue
        for ang in ([0] if name.startswith('cutters') else [0,90]):
            sm,hi=r.render(m,env,ang,scale)
            for folder,im in [('sprites-2x',sm),('masters-6x',hi)]:
                path=OUT/folder/str(ang)/f'{name}.png';path.parent.mkdir(exist_ok=True,parents=True);im.save(path)
        # Actual unrotated source mesh, in metres, with complete per-face material data.
        path=OUT/'meshes';path.mkdir(parents=True,exist_ok=True)
        mats=list(dict.fromkeys(m.mat));mi=[mats.index(mat) for mat in m.mat]
        np.savez_compressed(path/f'{name}.npz',triangles=np.asarray(m.tri,dtype=np.float32),normals=np.asarray(m.norm,dtype=np.float32),material_index=np.asarray(mi,dtype=np.uint16),material_rgb=np.asarray([m[0] for m in mats],np.uint8),material_parameters=np.asarray([m[1:] for m in mats],np.float32))
        print('EXPORTED',name,'seconds',round(time.time()-t,2),flush=True)
    (OUT/'reports').mkdir(parents=True,exist_ok=True)
    for name,re in reports.items():(OUT/'reports'/f'{name}.json').write_text(json.dumps(re,indent=2))
if __name__=='__main__':deliver_main()
