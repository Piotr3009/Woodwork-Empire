"""Package 1: retained 3D sanders, additions explicitly requested in Oct 8 brief."""
from pathlib import Path
import sys
import numpy as np
SOURCE = Path(__file__).resolve().parent/'legacy'
sys.path.insert(0,str(SOURCE))
from renderer import Model
from build_order3 import (build_sander,finish,ENVS,table_frame,rim_can,hose,
                         USED,BUDGET,STEEL,CHROME,DARK,RUBBER,ALU,RED)

def orbital(m,x,y,z,paint=USED,r=.125):
    # Genuine round backing pad and palm-grip housing: not a belt sander.
    m.cyl((x,y,z),(x,y,z+.027),r,RUBBER,40)
    m.cyl((x,y,z+.027),(x,y,z+.045),r*.90,ALU,36)
    m.cyl((x,y,z+.045),(x,y,z+.12),r*.78,paint,32)
    m.box((x-r*.54,y-r*.43,z+.092),(x+r*.54,y+r*.43,z+.203),paint,.025)
    m.cyl((x,y,z+.188),(x,y,z+.245),r*.63,DARK,32)
    m.box((x-r*.16,y+r*.56,z+.19),(x+r*.16,y+r*.68,z+.212),RED,.005)
    m.cyl((x+r*.58,y,z+.078),(x+r*1.1,y,z+.078),r*.19,DARK,20)

def build(name):
    tier=name.split('.')[-1]
    if tier=='used':
        m=Model();table_frame(m,2,1,.71,USED,True,True)
        # Small industrial vacuum secured to the lower shelf, open table retained.
        rim_can(m,1.55,.64,.25,.173,.275,STEEL,False)
        m.cyl((1.55,.64,.52),(1.55,.64,.595),.183,DARK,32)
        m.box((1.48,.605,.58),(1.62,.675,.64),USED,.018)
        for x in [1.43,1.67]:
            m.cyl((x,.49,.269),(x,.525,.269),.046,RUBBER,18)
        orbital(m,.82,.51,.755)
        hose(m,[(.954,.51,.833),(1.74,.51,.88),(1.83,.74,.58),(1.59,.74,.56)],.024,RUBBER)
        return finish(name,m)
    m=build_sander(tier)
    if tier=='budget':
        # Recess lower cabinet front to leave real room for external hanging tools.
        for i,tri in enumerate(m.tri):
            if tri[:,2].min()>=.109 and tri[:,2].max()<=.875:
                m.tri[i]=tri*np.array([1,.90,1]) + np.array([0,.01,0])
                normals=m.norm[i]/np.array([1,.90,1]);m.norm[i]=normals/np.linalg.norm(normals,axis=1,keepdims=True)
        for i,box in enumerate(m.boxes):
            if box[:,2].min()>=.109 and box[:,2].max()<=.875:
                m.boxes[i]=box*np.array([1,.90,1])+np.array([0,.01,0])
        # Two hand sanders clipped onto front hangers. All parts remain inside 2x1m.
        toolpaint=((87,112,119),.20,.42,0)
        for x in [.06,1.94]:
            m.box((x-.038,.83,.096),(x+.038,.981,.142),BUDGET,.004)
        for x in [.57,1.08]:
            m.box((x-.055,.911,.61),(x+.055,.928,.83),DARK,.006)
            m.box((x-.045,.929,.75),(x+.045,.998,.787),STEEL,.004)
            m.cyl((x,.961,.586),(x,.996,.586),.087,RUBBER,32)
            m.cyl((x,.963,.586),(x,.998,.586),.073,toolpaint,32)
            m.box((x-.051,.938,.60),(x+.051,.999,.714),toolpaint,.012)
            m.box((x-.039,.938,.704),(x+.039,.997,.758),DARK,.012)
            m.box((x-.014,.994,.68),(x+.014,.999,.70),RED,.002)
    return finish(name,m)

def save_mesh(model,path):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    mats=list(dict.fromkeys(model.mat))
    np.savez_compressed(path,triangles=np.asarray(model.tri,dtype=np.float64),
        normals=np.asarray(model.norm,dtype=np.float64),
        material_index=np.asarray([mats.index(m) for m in model.mat],dtype=np.uint16),
        material_rgb=np.asarray([m[0] for m in mats],dtype=np.uint8),
        material_parameters=np.asarray([m[1:] for m in mats],dtype=np.float64),
        boxes=np.asarray(model.boxes,dtype=np.float64))
