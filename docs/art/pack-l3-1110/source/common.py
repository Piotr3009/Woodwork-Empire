"""Shared metric geometry for the 10 October six-module window line."""
from pathlib import Path
import sys,math
import numpy as np
LEGACY=Path(__file__).resolve().parent/'legacy'
if str(LEGACY) not in sys.path:sys.path.append(str(LEGACY))
from renderer import Model,merge
from build_assets import (bezier,ball,post,guard,light_curtain,monitor,controller,
                          tower_light,robot_arm,spindle5,carousel)

BLUE=((42,99,162),.26,.32,0)
BLUE_DARK=((31,77,129),.22,.36,0)
STEEL=((156,173,182),.78,.30,1)
ALU=((195,205,213),.78,.28,1)
CHROME=((184,196,207),.94,.20,1)
DARK=((31,41,49),.12,.56,0)
RUBBER=((20,25,29),.03,.78,0)
PANE=((116,164,183),.35,.16,5)
GLASS_DARK=((23,49,63),.40,.18,2)
WOOD=((194,153,100),.04,.6,4)
WHITE=((225,228,220),.18,.34,0)
YELLOW=((225,176,39),.18,.4,0)
RED=((190,45,32),.15,.42,0)
GREY=((186,196,200),.2,.4,0)
BELT=((110,60,44),.02,.88,6)
GREEN=((54,154,77),.15,.4,0)
ENV=(6,3,3)
CONNECTORS={'conveyor':{'in':[0,1.5,.9],'out':[6,1.5,.9]},
            'overhead':{'in':[0,1.5,2.8],'out':[6,1.5,2.8]}}

def conveyor(m,x0=0,x1=6,y0=.79,y1=2.21,legs=True):
    """All roller tops and terminal transfer plates are exactly Z=.9 m."""
    start=len(m.tri)
    for y in [y0,y1-.065]:
        m.box((x0,y,.77),(x1,y+.065,.874),BLUE,.006)
        m.box((x0,y+.014,.874),(x1,y+.052,.889),STEEL,.003)
    n=max(2,int(round((x1-x0)/.20)))
    for x in np.linspace(x0+.06,x1-.06,n):
        m.cyl((x,y0+.063,.855),(x,y1-.063,.855),.045,CHROME,24)
        # Bearings outside the roller sleeves, never in the material path.
        for y in [y0+.047,y1-.060]:m.box((x-.025,y-.014,.828),(x+.025,y+.014,.879),ALU,.002)
    for a,b in [(x0,x0+.022),(x1-.022,x1)]:
        m.box((a,y0+.06,.882),(b,y1-.06,.9),ALU,0)
    if legs:
        for x in np.linspace(x0+.14,x1-.14,max(2,int((x1-x0)/1.5)+1)):
            for y in [y0+.035,y1-.035]:
                m.box((x-.03,y-.03,.055),(x+.03,y+.03,.78),BLUE,.004)
                m.feet(x,y,.09,.045)
            m.box((x-.03,y0+.035,.22),(x+.03,y1-.035,.268),BLUE,.004)
    if not hasattr(m,'conveyorTriangleRanges'):m.conveyorTriangleRanges=[]
    m.conveyorTriangleRanges.append([start,len(m.tri)])
    return m

def machine_base(m,a=.95,b=5.05,y0=.38,y1=2.55,top=.73):
    """Machine skids and side cabinets; no ground plane."""
    for ya,yb in [(y0,.75),(2.25,y1)]:
        if yb<=ya:continue
        m.box((a,ya,.13),(b,yb,top),BLUE,.015)
        for x in np.linspace(a+.25,b-.25,max(2,int(b-a))):
            m.vents(x-.10,yb+.004,.26,.20,3)
            m.bolt(x+.13,yb+.008,.24,'y',.012)
        for x in np.arange(a+1,b,.9):m.box((x-.003,yb+.001,.18),(x+.003,yb+.008,top-.05),DARK,.001)
    for x in [a+.09,b-.09]:
        m.box((x-.07,.16,.07),(x+.07,2.88,.18),BLUE,.008)
        for y in [.16,2.84]:m.feet(x,y,.10,.049)
    return m

def console(m,x=5.25,y=2.58,large=True):
    if large:
        controller(m,x-.22,y,.44,.26,1.42,GREY,False)
        monitor(m,x,y+.278,1.14,.35)
    else:
        m.box((x-.17,y-.08,.02),(x+.17,y+.15,.07),DARK,.006)
        m.box((x-.045,y-.01,.07),(x+.045,y+.06,1.18),BLUE,.005)
        monitor(m,x,y+.09,1.10,.36)

def window_frame(m,center,width=1.1,height=1.55,orientation='vertical',material=WHITE,glazing=False,bar=.075):
    """Frame in XZ (vertical), YZ (cross), or XY (flat); center is geometric center."""
    cx,cy,cz=center;t=.085
    q=Model()
    for x0,x1,y0,y1 in [(-width/2,-width/2+bar,-height/2,height/2),
                        (width/2-bar,width/2,-height/2,height/2),
                        (-width/2+bar,width/2-bar,-height/2,-height/2+bar),
                        (-width/2+bar,width/2-bar,height/2-bar,height/2)]:
        q.box((x0,y0,-t/2),(x1,y1,t/2),material,.007)
    if glazing:q.box((-width/2+bar,-height/2+bar,-.008),(width/2-bar,height/2-bar,.008),PANE,.001)
    if orientation=='flat':matrix=np.eye(3)
    elif orientation=='vertical':matrix=np.array([[1,0,0],[0,0,-1],[0,1,0]],float)
    elif orientation=='cross':matrix=np.array([[0,0,1],[1,0,0],[0,1,0]],float)
    else:raise ValueError(orientation)
    c=np.array(center,float)
    for tri,norm,mat in zip(q.tri,q.norm,q.mat):
        m.tri.append(tri@matrix.T+c);m.norm.append(norm@matrix.T);m.mat.append(mat)
    for box in q.boxes:
        pts=np.array([[x,y,z] for x in box[:,0] for y in box[:,1] for z in box[:,2]])@matrix.T+c
        m.boxes.append(np.array([pts.min(0),pts.max(0)]))
    return m

def overhead_rail(m,x0=0,x1=6,supports=(.30,5.70),y=1.5,z=2.8):
    """Shared I-track centre at Z2.8. Exact connections on both module ends."""
    start=len(m.tri)
    m.box((x0,y-.075,z-.05),(x1,y+.075,z-.03),ALU,.003)
    m.box((x0,y-.021,z-.03),(x1,y+.021,z+.063),STEEL,.003)
    m.box((x0,y-.075,z+.063),(x1,y+.075,z+.083),ALU,.003)
    if not hasattr(m,'railTriangleRanges'):m.railTriangleRanges=[]
    m.railTriangleRanges.append([start,len(m.tri)])
    for x in supports:
        for yy in [.30,2.70]:
            post(m,x,yy,.03,2.955,BLUE,.085)
        m.box((x-.055,.28,2.90),(x+.055,2.72,2.99),BLUE,.008)
        for yy in [.31,2.69]:m.bolt(x,yy,2.985,'z',.009)
    return m

def cleanup(m):
    # Exclude exact-zero pole triangles created by smooth sphere primitives.
    keep=[]
    for i,t in enumerate(m.tri):
        if np.linalg.norm(np.cross(t[1]-t[0],t[2]-t[0]))>1e-12:keep.append(i)
    m.tri=[m.tri[i] for i in keep];m.norm=[m.norm[i] for i in keep];m.mat=[m.mat[i] for i in keep]
    for attr in ['conveyorTriangleRanges','railTriangleRanges','dynamicTriangleRanges']:
        if hasattr(m,attr):setattr(m,attr,[[int(np.searchsorted(keep,a)),int(np.searchsorted(keep,b))] for a,b in getattr(m,attr)])
    if hasattr(m,'componentTriangleRanges'):
        m.componentTriangleRanges={key:[[int(np.searchsorted(keep,a)),int(np.searchsorted(keep,b))] for a,b in ranges]
            for key,ranges in m.componentTriangleRanges.items()}
    if hasattr(m,'windowGroups'):
        m.windowGroups=[dict(group,triangleRanges=[[int(np.searchsorted(keep,a)),int(np.searchsorted(keep,b))]
            for a,b in group.get('triangleRanges',[])]) for group in m.windowGroups]
    return m
