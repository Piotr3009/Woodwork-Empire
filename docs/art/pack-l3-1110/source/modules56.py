"""Finishing modules for the October 10 window-line order.

Every visible part is triangle geometry in metres. The renderer owns the fixed
2:1 camera; this module never paints, scales, mirrors or rotates output pixels.
The phase argument is reserved for the approved L2 animation work.
"""
from pathlib import Path
import sys
import math
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent/'legacy'))
from renderer import Model
from build_assets import robot_arm, bezier, post, controller, monitor, tower_light, base_cabinet
from common import (BLUE, BLUE_DARK, WHITE, WOOD, STEEL, ALU, CHROME, DARK,
                    RUBBER, PANE, YELLOW, RED)
from motion56 import (phase01,keys,tag,transform,append,clipped_x,
                      window_rotation,solve_elbow,state6)

ROBOT_WHITE=((190,204,207),.25,.29,0)
FILTER=((193,190,168),.04,.78,0)


def _flat_frame(m, x0, x1, y0, y1, z=.91, glass=False):
    """A real joinery frame resting horizontally on the common roller datum."""
    w=.105; t=.085
    for xa,xb,ya,yb in [(x0,x1,y0,y0+w),(x0,x1,y1-w,y1),
                       (x0,x0+w,y0+w,y1-w),(x1-w,x1,y0+w,y1-w)]:
        m.box((xa,ya,z),(xb,yb,z+t),WHITE,.007)
    if glass:
        m.quad([(x0+w,y0+w,z+.035),(x1-w,y0+w,z+.035),
                (x1-w,y1-w,z+.035),(x0+w,y1-w,z+.035)],[0,0,1],PANE)
        for ya in [y0+w,y1-w-.014]:
            m.box((x0+w,ya,z+.03),(x1-w,ya+.014,z+.05),ALU,.002)
    # Narrow glazing rebate on the inside edge catches a clean highlight.
    for ya in [y0+w-.02,y1-w]:
        m.box((x0+w,ya,z+.06),(x1-w,ya+.02,z+.085),WHITE,.002)


def _hanging_frame(m, x, y=1.5, z0=.94, width=1.08, height=1.47, glass=False,
                   frame=True,hook=True,depth=.080):
    """Upright white frame in the XZ plane on a travelling overhead hook."""
    start=len(m.tri)
    x0=x-width/2; x1=x+width/2; z1=z0+height; w=.085; d=depth
    frame_rects=[(x0,x1,z0,z0+w),(x0,x1,z1-w,z1),
                 (x0,x0+w,z0+w,z1-w),(x1-w,x1,z0+w,z1-w)]
    for a,b,c,e in (frame_rects if frame else []):
        m.box((a,y-d/2,c),(b,y+d/2,e),WHITE,.006)
    if glass and frame:
        m.quad([(x0+w,y,z0+w),(x1-w,y,z0+w),(x1-w,y,z1-w),
                (x0+w,y,z1-w)],[0,1,0],PANE)
    if not hook:
        tag(m,start);return
    # Trolley remains underneath the rail; hook actually meets the upper rail.
    for yy in [y-.057,y+.057]:
        m.cyl((x-.057,yy,2.74),(x+.057,yy,2.74),.038,DARK,18)
    m.box((x-.075,y-.052,2.665),(x+.075,y+.052,2.705),STEEL,.004)
    m.cyl((x,y,2.666),(x,y,2.53),.013,CHROME,12)
    bezier(m,[(x,y,2.54),(x-.08,y,2.50),(x-.07,y,z1-.025),
              (x+.065,y,z1-.005),(x+.065,y,z1+.05)],.013,CHROME,20)
    tag(m,start)


def _joint_details(m, wrist, tool, paint=BLUE):
    """Visible wrist roll and tool-axis flanges supplement the six-axis arm."""
    wr=np.asarray(wrist); tl=np.asarray(tool); axis=tl-wr
    length=np.linalg.norm(axis)
    if length<1e-8:return
    axis/=length
    m.cyl(wr+axis*.035,wr+axis*.069,.102,DARK,24)
    m.cyl(wr+axis*.070,wr+axis*.099,.107,ALU,24)
    m.cyl(tl-axis*.066,tl-axis*.026,.091,paint,24)
    m.cyl(tl-axis*.025,tl,.082,STEEL,24)


def _spray_booth(m,phase):
    """First half of M5: genuinely open tunnel with real translucent front."""
    x0=.30; x1=3.10; y0=.24; y1=2.57
    # Sheet-metal rear with removable filter cassettes on its inner surface.
    m.box((x0,y0,.14),(x1,y0+.11,2.40),BLUE,.013)
    for xa in [.46,1.12,1.78,2.44]:
        m.box((xa,.352,.96),(xa+.52,.386,2.20),ALU,.006)
        m.box((xa+.033,.387,1.005),(xa+.487,.400,2.155),FILTER,.003)
        for zz in np.arange(1.045,2.13,.065):
            m.box((xa+.044,.401,zz),(xa+.476,.407,zz+.009),STEEL,.001)
        for xx in [xa+.018,xa+.502]:
            m.bolt(xx,.408,1.08,r=.01);m.bolt(xx,.408,2.07,r=.01)
    # Enclosed inspection roof: a single clear glass panel in a blue perimeter
    # with steel crossbars. The real six-axis robot remains fully readable
    # through this glazing from the fixed game camera, without opening the
    # paint booth. The rear filter plenum retains an opaque sheet-metal roof.
    m.box((x0,y0,2.38),(x1,.72,2.48),BLUE,.014)
    m.box((x0,y1-.105,2.38),(x1,y1,2.48),BLUE,.014)
    for xa,xb in [(x0,x0+.10),(x1-.10,x1)]:
        m.box((xa,.70,2.38),(xb,y1-.08,2.48),BLUE,.010)
    m.quad([(x0+.101,.721,2.445),(x1-.101,.721,2.445),
            (x1-.101,y1-.106,2.445),(x0+.101,y1-.106,2.445)],
           [0,0,1],PANE)
    # Low metal cover strips hold the glass. One crossbar is deliberately
    # clear of the arm joints, and its straight edges obey the same 3D camera.
    for yy in [.702,y1-.106]:
        m.box((x0+.08,yy,2.448),(x1-.08,yy+.020,2.468),ALU,.002)
    for xx in [x0+.085,1.77,x1-.105]:
        m.box((xx,.72,2.447),(xx+.022,y1-.105,2.469),ALU,.002)
    m.box((.57,.31,2.485),(2.83,.66,2.655),BLUE_DARK,.012)
    for xx in np.arange(.72,2.7,.20):
        m.box((xx,.670,2.53),(xx+.09,.679,2.61),DARK,.001)
    # Front frame with three glazed door panels. No opaque fake window.
    m.box((x0,y1-.055,.13),(x1,y1+.045,.90),BLUE,.011)
    m.box((x0,y1-.055,2.34),(x1,y1+.045,2.415),ALU,.006)
    for xx in [x0,1.22,2.16,x1-.055]:
        m.box((xx,y1-.055,.89),(xx+.055,y1+.045,2.38),BLUE,.006)
    for xa,xb in [(.357,1.217),(1.277,2.157),(2.217,3.042)]:
        m.quad([(xa,y1+.020,.965),(xb,y1+.020,.965),
                (xb,y1+.020,2.32),(xa,y1+.020,2.32)],[0,1,0],PANE)
        m.box((xb-.069,y1+.049,1.23),(xb-.054,y1+.082,1.51),DARK,.003)
    for xx in [.37,3.03]:
        for yy in [.31,2.57]:
            m.feet(xx,yy,.14,.047)
    # Steel entry/exit portal: allow the workpiece to enter at Z=.9.
    for xx in [x0,x1-.055]:
        m.box((xx,y0+.1,.87),(xx+.055,.64,2.38),ALU,.007)
        m.box((xx,2.31,.87),(xx+.055,y1-.03,2.38),ALU,.007)
        m.box((xx,.65,2.22),(xx+.055,2.30,2.38),BLUE,.007)
    m.box((.64,.49,.05),(1.19,1.04,.15),DARK,.008)
    m.box((.71,.56,.15),(1.12,.97,.53),BLUE,.015)
    phase=phase01(phase);s=math.sin(2*math.pi*phase)
    base=(.915,.765,.535); shoulder=(.94,.78,.96)
    # Bring articulated joints toward the operator glass below the roof lip,
    # so the spray arm remains recognisable from the actual game camera.
    elbow=(1.42,1.78,1.85); wrist=(2.05,2.08,1.65)
    tool=(2.15,1.78,1.40)
    if phase:
        shift=np.array([.36*s,.11*math.sin(4*math.pi*phase),.04*(1-math.cos(2*math.pi*phase))])
        wrist=np.asarray(wrist)+shift;tool=np.asarray(tool)+shift
        elbow=solve_elbow(shoulder,wrist,(1.42,1.78,1.85),(2.05,2.08,1.65))
    start=len(m.tri)
    robot_arm(m,base,shoulder,elbow,wrist,tool,ROBOT_WHITE,'spray')
    _joint_details(m,wrist,tool,BLUE)
    for p in [shoulder,elbow]:
        m.cyl((p[0],p[1]+.158,p[2]),(p[0],p[1]+.173,p[2]),.087,BLUE,24)
    tag(m,start)
    if phase:
        _spray_mist(m,np.asarray(tool)+np.array([0,0,-.195]),phase)
    # Small stainless pressure pot and real paint/air hoses.
    m.cyl((2.70,.65,.13),(2.70,.65,.73),.13,CHROME,32)
    m.cyl((2.70,.65,.73),(2.70,.65,.76),.145,ALU,32)
    m.cyl((2.70,.65,.76),(2.70,.65,.92),.015,STEEL,12)
    bezier(m,[(2.70,.65,.92),(2.64,.68,1.16),(2.12,.78,1.23),(.98,.60,.78)],.016,RUBBER,25)
    _flat_frame(m,1.30,2.65,.99,2.02,.913,False)


def _pallet(m):
    """Empty two-fork wooden pallet, floor-supported in the final 1.5 m."""
    x0=4.50; x1=5.95; y0=1.90; y1=2.90
    # The pallet is beside the narrow outbound conveyor, in its final 1.5 m.
    for yy in [y0+.015,(y0+y1)/2-.065,y1-.145]:
        m.box((x0,yy,0),(x1,yy+.13,.04),WOOD,.004)
    for xx in [x0+.025,(x0+x1)/2-.065,x1-.155]:
        for yy in [y0+.025,(y0+y1)/2-.06,y1-.145]:
            m.box((xx,yy,.04),(xx+.13,yy+.12,.15),WOOD,.005)
    for xx in [x0+.015,(x0+x1)/2-.06,x1-.135]:
        m.box((xx,y0,.15),(xx+.12,y1,.18),WOOD,.004)
    for yy in np.linspace(y0+.025,y1-.16,6):
        m.box((x0,yy,.18),(x1,yy+.13,.225),WOOD,.004)
        for xx in [x0+.08,x1-.08]:
            m.cyl((xx,yy+.045,.225),(xx,yy+.045,.228),.008,DARK,8)


def _glazing_table(m,phase):
    # Cabinet and lifting table, open fork clearance below the table's feet.
    base_cabinet(m,1.25,3.45,.85,2.14,.16,.73,BLUE,3,True)
    m.box((1.18,.77,.755),(3.52,2.23,.805),STEEL,.006)
    m.box((1.20,.80,.805),(3.50,2.20,.845),DARK,.005)
    # Frame remains at the common roller surface datum.
    _flat_frame(m,1.56,3.28,1.02,2.06,.913,True)
    for xx in [1.52,3.31]:
        m.cyl((xx,.99,.85),(xx,.99,.99),.025,CHROME,16)
        m.box((xx-.035,.96,.97),(xx+.035,1.03,1.015),RUBBER,.003)
    # Vacuum-lift gantry is deliberately recognisable as a separate machine.
    for yy in [.56,2.44]:
        post(m,2.02,yy,.055,2.45,BLUE,.10)
        m.box((1.86,yy-.11,.025),(2.18,yy+.11,.065),DARK,.005)
    m.box((1.96,.50,2.39),(2.10,2.50,2.50),STEEL,.008)
    m.box((1.82,1.25,2.26),(2.21,1.76,2.45),BLUE,.012)
    start=len(m.tri)
    z=1.48 if phase01(phase)==0 else state6(phase)['liftZ']
    for xx in [1.91,2.11]:
        m.cyl((xx,1.50,z+.12),(xx,1.50,2.31),.022,CHROME,18)
    m.box((1.71,1.45,z+.05),(2.73,1.55,z+.12),ALU,.008)
    for xx in [1.80,2.62]:
        m.box((xx-.035,1.13,z+.03),(xx+.035,1.87,z+.09),ALU,.006)
        for yy in [1.18,1.82]:
            m.cyl((xx,yy,z-.035),(xx,yy,z+.03),.025,CHROME,16)
            m.cyl((xx,yy,z-.065),(xx,yy,z-.031),.082,RUBBER,24)
    # Sheet carried by the lift: physically translucent and thinner than frame.
    if phase01(phase)<4/12:
        m.quad([(1.68,1.075,z-.07),(3.14,1.075,z-.07),
                (3.14,2.005,z-.07),(1.68,2.005,z-.07)],[0,0,1],PANE)
    bezier(m,[(1.93,1.51,2.28),(1.64,1.51,2.13),(1.61,1.51,z+.15),(1.91,1.51,z+.10)],.016,RUBBER,23)
    tag(m,start)


def build_module5(phase=0):
    from common import conveyor, overhead_rail, console
    phase=phase01(phase);m=Model()
    conveyor(m)
    _spray_booth(m,phase)
    overhead_rail(m)
    # The second half is an open hook loading/lift station, with empty rollers
    # below the suspended frames. Two slim guide columns allow future motion.
    for xx in [3.50,4.79]:
        post(m,xx,.48,.07,2.39,BLUE,.11)
        m.cyl((xx,.59,.61),(xx,.59,2.28),.029,CHROME,18)
    m.box((3.44,.42,2.29),(4.85,.60,2.39),BLUE,.010)
    if phase==0:
        for xx in [3.72,4.96]:
            _hanging_frame(m,xx,1.5,.98,1.00,1.43)
    else:
        _flow_hangers5(m,phase)
    # Loading lift forks below the first hanging frame.
    m.box((3.49,.54,.60),(4.04,.70,.72),BLUE,.007)
    for xx in [3.55,3.94]:
        m.box((xx,.62,.67),(xx+.050,1.55,.73),STEEL,.005)
    console(m,5.12)
    tower_light(m,3.02,.38,2.46)
    m.animation={'module':5,'phase':phase,'frames':12,'fps':6,'periodic':True,
        'movements':['six_axis_spray_sweep','paint_mist','loaded_overhead_carriers'],
        'movingHangersDirection':[1,0,0],'staticGeometryFrozen':True}
    return m


def build_module6(phase=0):
    from common import conveyor, overhead_rail, console
    phase=phase01(phase);m=Model()
    conveyor(m,0,4.45)
    conveyor(m,4.45,6,y0=1.18,y1=1.82)
    # End support precedes the empty pallet so no post penetrates its slats.
    overhead_rail(m,supports=(.30,4.32))
    if phase==0:_hanging_frame(m,.67,1.50,.97,1.10,1.44)
    else:_moving_windows6(m,phase)
    _glazing_table(m,phase)
    # Distinct six-axis packing robot behind the line. Its vacuum gripper is
    # above the exit of the glazing table, while the pallet stays empty in L1.
    m.box((3.45,.16,.025),(4.20,.92,.11),DARK,.009)
    m.box((3.55,.25,.11),(4.10,.80,.47),BLUE,.017)
    base=(3.83,.53,.48); shoulder=(3.80,.55,.91)
    elbow=(4.10,.69,1.90); wrist=(3.66,1.18,2.04);tool=(3.55,1.51,1.70)
    grip=np.eye(3)
    if phase:
        state=state6(phase);elbow=state['elbow'];wrist=state['wrist'];tool=state['tool'];grip=state['gripRotation']
    start=len(m.tri)
    robotstart=len(m.tri)
    robot_arm(m,base,shoulder,elbow,wrist,tool,BLUE,'vacuum')
    if phase and not np.allclose(grip,np.eye(3)):
        _rotate_robot_gripper(m,robotstart,base,shoulder,elbow,wrist,tool,grip)
    _joint_details(m,wrist,tool,ROBOT_WHITE)
    for p in [shoulder,elbow]:
        m.cyl((p[0],p[1]+.157,p[2]),(p[0],p[1]+.175,p[2]),.086,ALU,24)
    tag(m,start)
    _pallet(m)
    console(m,.61)
    controller(m,3.78,2.47,.50,.34,1.24,ROBOT_WHITE,False)
    m.animation={'module':6,'phase':phase,'frames':12,'fps':6,'periodic':True,
        'stages':{'0-2':'incoming_hook_and_frame','2-3':'lower_and_turn_to_glazing_bed',
                  '3-5':'vacuum_glazing','5-9':'robot_transfer','10':'release_on_pallet',
                  '11':'carried_window_absent_and_robot_reset'},
        'workpieceMeters':[1.10,.08,1.44],'carriedWindowVisible':phase<11/12,
        'palletContentsInAnimation':0,'palletStacksAreSeparateOverlays':True,
        'whiteBedRectangleRole':'fixed positioning and glazing support',
        'staticGeometryFrozen':True}
    return m


def _spray_mist(m,tip,phase):
    start=len(m.tri)
    mat=((212,222,228),.01,.95,8)
    height=.16+.025*math.sin(4*math.pi*phase)
    radius=.065+.018*math.sin(2*math.pi*phase)**2
    # Sparse translucent spray cones exist in real 3D beneath the nozzle.
    for i in range(8):
        a=2*math.pi*i/8;b=2*math.pi*(i+1)/8
        q1=tip+np.array([radius*math.cos(a),radius*math.sin(a),-height])
        q2=tip+np.array([radius*math.cos(b),radius*math.sin(b),-height])
        m.polygon([tip,q1,q2],mat)
    tag(m,start)


def _flow_hangers5(m,phase):
    # Loaded carriers enter from behind the booth's exit portal. Outgoing
    # carriers accelerate in the transfer zone so they clear the module at
    # the periodic boundary; no carrier ever moves against production flow.
    positions=[(3.72+2.95*phase,0.),(4.96+2.48*phase,0.),
               (1.24+2.48*phase,3.10),(2.48+2.48*phase,3.10)]
    for xx,entry in positions:
        q=Model();_hanging_frame(q,xx,1.5,.98,1.,1.43)
        append(m,clipped_x(q,entry,6.))


def _real_window(center,R=np.eye(3),glazed=False):
    q=Model();_hanging_frame(q,0,0,-.72,1.10,1.44,glazed,hook=False)
    return transform(q,R,center)


def _moving_windows6(m,phase):
    s=state6(phase)
    if s['carriedVisible']:
        q=_real_window(s['frameCenter'],s['frameRotation'],s['glazed'])
        append(m,clipped_x(q))
    q=Model();_hanging_frame(q,s['hookX'],1.5,.97,1.10,1.44,frame=False)
    append(m,clipped_x(q))
    # The next physical frame enters while the current one is deposited.
    # Frame 12 contains no carried/placed pallet window, only this next input.
    if phase>9/12:
        xx=-.55+(phase-9/12)/(3/12)*1.22
        q=Model();_hanging_frame(q,xx,1.50,.97,1.10,1.44)
        append(m,clipped_x(q))


def _rotate_robot_gripper(m,start,base,shoulder,elbow,wrist,tool,R):
    # Legacy arm emits its actual vacuum gripper immediately before the hose.
    # Rebuild the two short helper meshes to obtain exact triangle counts;
    # only the gripper is rotated, the articulated wrist retains its pose.
    tl=np.asarray(tool,float);b=np.asarray(base);sh=np.asarray(shoulder)
    el=np.asarray(elbow);wr=np.asarray(wrist)
    g=Model()
    g.box(tuple(tl+[-.30,-.25,-.05]),tuple(tl+[.30,.25,.015]),ALU,.008)
    for dx in [-.22,0,.22]:
        for dy in [-.17,.17]:
            g.cyl(tl+[dx,dy,-.11],tl+[dx,dy,-.049],.028,CHROME,12)
            g.cyl(tl+[dx,dy,-.13],tl+[dx,dy,-.108],.060,RUBBER,18)
    h=Model();bezier(h,[b+[-.03,-.20,.10],sh+[.09,-.18,0],el+[.08,-.15,.10],
                       wr+[.03,-.13,.07],tl+[.04,-.08,.04]],.023,RUBBER,30)
    hi=len(m.tri)-len(h.tri);lo=hi-len(g.tri)
    assert lo>=start
    for i in range(lo,hi):
        m.tri[i]=(m.tri[i]-tl)@R.T+tl;m.norm[i]=m.norm[i]@R.T


def build_stack(count):
    """Only N upright glazed windows, clear wrap and cardboard protectors.

    No pallet or machine geometry is included. Coordinates match the approved
    M6 wooden pallet. Identical 1.10×.08×1.44 m units are also used by the robot.
    """
    count=int(count)
    if not 1<=count<=10:raise ValueError('stack count must be 1..10')
    m=Model();groups=[];windows=[]
    for i in range(count):
        start=len(m.tri)
        q=_real_window((5.225,2.01+i*.082,.948),np.eye(3),True)
        append(m,q,dynamic=False)
        r=[start,len(m.tri)];windows.append(r)
        groups.append({'index':i+1,'triangleRanges':[r],
                       'centerMeters':[5.225,2.01+i*.082,.948],
                       'sizeMeters':[1.10,.08,1.44]})
    start=len(m.tri)
    x0,x1=4.675,5.775;y0=1.970;y1=2.01+(count-1)*.082+.040
    z0,z1=.228,1.668
    film=((224,238,241),.20,.10,9)
    # Film surfaces lie on the outside datum; the timber and glass remain
    # visible through it. No opaque shrink-wrap slab masks individual windows.
    for yy,n in [(y0,[0,-1,0]),(y1,[0,1,0])]:
        m.quad([(x0,yy,z0),(x1,yy,z0),(x1,yy,z1),(x0,yy,z1)],n,film)
    for xx,n in [(x0,[-1,0,0]),(x1,[1,0,0])]:
        m.quad([(xx,y0,z0),(xx,y1,z0),(xx,y1,z1),(xx,y0,z1)],n,film)
    m.quad([(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],[0,0,1],film)
    cardboard=((180,151,108),.01,.85,0)
    for xx in [x0,x1-.035]:
        for yy in [y0,y1-.025]:
            for za,zb in [(z0,z0+.15),(z1-.15,z1)]:
                m.box((xx,yy,za),(xx+.035,yy+.025,zb),cardboard,.002)
    # Narrow overlapping film bands create restrained physical highlights.
    for za in [.58,1.23]:
        m.quad([(x0+.002,y1,za),(x1-.002,y1,za),
                (x1-.002,y1,za+.05),(x0+.002,y1,za+.05)],[0,1,0],film)
    m.componentTriangleRanges={'windows':windows,'wrap':[[start,len(m.tri)]]}
    m.windowGroups=groups
    m.animation={'kind':'pallet_stack_overlay','windowCount':count,
                 'windowMeters':[1.10,.08,1.44],'windowPitchY':.082,
                 'palletTopZ':.228,'containsPalletGeometry':False,
                 'containsMachineGeometry':False,'clearFilm':True,
                 'cardboardCornerGuards':True}
    return m
