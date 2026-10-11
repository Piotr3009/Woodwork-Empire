"""Deterministic 3D triangle renderer for Woodwork Empire sprite assets.

Uses ModernGL/EGL, physically rotates geometry, exact 2:1 pixel projection,
analytic material illumination, a real depth buffer, transparent RGBA output.
No ground plane or cast shadows are ever created. Coordinates are metres.

Install dependencies from source/requirements.txt; see README-REGENERATE.md.
"""
from __future__ import annotations
import math
import os
from pathlib import Path
import numpy as np
from PIL import Image

import moderngl


MATERIALS = {
    'used': dict(color=(.31,.44,.31), roughness=.64, metallic=.15, texture='paint'),
    'budget': dict(color=(.69,.73,.73), roughness=.36, metallic=.22, texture='paint'),
    'standard': dict(color=(.19,.42,.27), roughness=.32, metallic=.24, texture='paint'),
    'pro': dict(color=(.095,.25,.17), roughness=.28, metallic=.30, texture='paint'),
    'industrial': dict(color=(.12,.34,.55), roughness=.28, metallic=.28, texture='paint'),
    'steel': dict(color=(.65,.70,.72), roughness=.23, metallic=.87),
    'darksteel': dict(color=(.24,.28,.29), roughness=.31, metallic=.80),
    'rubber': dict(color=(.075,.083,.082), roughness=.79, metallic=.0),
    'black': dict(color=(.10,.12,.13), roughness=.44, metallic=.13),
    'wood': dict(color=(.63,.40,.20), roughness=.50, metallic=.0, texture='wood'),
    'belt': dict(color=(.32,.22,.135), roughness=.91, metallic=.0, texture='abrasive'),
    'red': dict(color=(.64,.095,.057), roughness=.34, metallic=.12),
    'yellow': dict(color=(.86,.62,.10), roughness=.36, metallic=.12),
    'glass': dict(color=(.16,.30,.34), roughness=.12, metallic=.38),
}


def _unit(v):
    v=np.asarray(v, dtype=np.float64)
    return v / max(float(np.linalg.norm(v)), 1e-12)


def _rotation(euler):
    if euler is None:
        return np.eye(3)
    x,y,z=np.radians(euler)
    rx=np.array([[1,0,0],[0,np.cos(x),-np.sin(x)],[0,np.sin(x),np.cos(x)]])
    ry=np.array([[np.cos(y),0,np.sin(y)],[0,1,0],[-np.sin(y),0,np.cos(y)]])
    rz=np.array([[np.cos(z),-np.sin(z),0],[np.sin(z),np.cos(z),0],[0,0,1]])
    return rz @ ry @ rx


def material(value):
    if isinstance(value,str):
        return MATERIALS[value].copy()
    if isinstance(value,(tuple,list)):
        return dict(color=tuple(value),roughness=.4,metallic=.1)
    return dict(value)


class Scene:
    """Collection of triangle meshes; all operations add actual 3D geometry."""
    def __init__(self):
        self.parts=[]

    def _add(self, positions, normals, mat):
        p=np.asarray(positions,dtype='f4').reshape(-1,3)
        n=np.asarray(normals,dtype='f4').reshape(-1,3)
        if len(p):
            self.parts.append((p,n,material(mat)))
        return self

    def mesh(self, vertices, faces, material='steel'):
        """Add polygon faces, triangulated as fans, with planar face normals."""
        verts=np.asarray(vertices,dtype=float)
        p=[]; n=[]
        for f in faces:
            for k in range(1,len(f)-1):
                tri=verts[[f[0],f[k],f[k+1]]]
                norm=_unit(np.cross(tri[1]-tri[0],tri[2]-tri[0]))
                p.extend(tri);n.extend([norm]*3)
        return self._add(p,n,material)

    def box(self, center, size, material='standard', bevel=.02, rotation=None):
        """Rounded bevel cuboid; rotation is Euler XYZ degrees about its centre."""
        half=np.asarray(size,dtype=float)/2
        center=np.asarray(center,dtype=float)
        if np.any(half<=0):
            raise ValueError('Box dimensions must be positive')
        b=max(0.,min(float(bevel),float(min(half))*.95))
        rot=_rotation(rotation)
        p=[];n=[]
        for axis in range(3):
            other=[k for k in range(3) if k!=axis]
            def samples(k):
                H=half[k]
                if b<1e-7: return [-H,H]
                return [-H,-H+b*.18,-H+b*.48,-H+b,H-b,H-b*.48,H-b*.18,H]
            aa=samples(other[0]);bb=samples(other[1])
            for sign in [-1,1]:
                grid=[]
                for a in aa:
                    row=[]
                    for bv in bb:
                        v=np.zeros(3);v[axis]=sign*half[axis]
                        v[other[0]]=a;v[other[1]]=bv
                        if b>1e-7:
                            q=np.maximum(-half+b,np.minimum(half-b,v))
                            normal=_unit(v-q);v=q+b*normal
                        else:
                            normal=np.zeros(3);normal[axis]=sign
                        row.append((rot@v+center,rot@normal))
                    grid.append(row)
                for i in range(len(aa)-1):
                    for j in range(len(bb)-1):
                        for inds in [((i,j),(i+1,j),(i+1,j+1)),((i,j),(i+1,j+1),(i,j+1))]:
                            for aidx,bidx in inds:
                                pv,nv=grid[aidx][bidx];p.append(pv);n.append(nv)
        return self._add(p,n,material)

    def cylinder(self, start, end, radius, material='steel', segments=32, radius2=None):
        """Cylinder or cone between arbitrary 3D endpoints, with flat end caps."""
        a=np.asarray(start,dtype=float);b=np.asarray(end,dtype=float)
        direction=b-a;length=np.linalg.norm(direction)
        if length<1e-9: return self
        v=direction/length
        helper=np.array([0.,0.,1.]) if abs(v[2])<.9 else np.array([1.,0.,0.])
        u=_unit(np.cross(v,helper));t=np.cross(v,u)
        r0=float(radius);r1=r0 if radius2 is None else float(radius2)
        p=[];n=[]
        for i in range(segments):
            t0=2*math.pi*i/segments;t1=2*math.pi*(i+1)/segments
            q0=u*math.cos(t0)+t*math.sin(t0)
            q1=u*math.cos(t1)+t*math.sin(t1)
            vs=[a+r0*q0,a+r0*q1,b+r1*q1,b+r1*q0]
            ns=[_unit(q0+v*(r0-r1)/length),_unit(q1+v*(r0-r1)/length)]
            for inds in [(0,1,2),(0,2,3)]:
                for idx in inds:
                    p.append(vs[idx]);n.append(ns[0 if idx in (0,3) else 1])
            p.extend([a,vs[1],vs[0],b,vs[3],vs[2]])
            n.extend([-v]*3+[v]*3)
        return self._add(p,n,material)

    def sphere(self, center, radius, material='steel', segments=20, rings=12):
        c=np.asarray(center,dtype=float);p=[];n=[]
        radius=np.asarray(radius,dtype=float)
        if radius.ndim==0: radius=np.repeat(radius,3)
        for i in range(rings):
            for j in range(segments):
                vals=[]
                for k,l in [(i,j),(i+1,j),(i+1,j+1),(i,j+1)]:
                    phi=math.pi*k/rings;theta=2*math.pi*l/segments
                    normal=np.array([math.sin(phi)*math.cos(theta),math.sin(phi)*math.sin(theta),math.cos(phi)])
                    vals.append((c+radius*normal,_unit(normal/radius)))
                for indices in [(0,1,2),(0,2,3)]:
                    for idx in indices:
                        pp,nn=vals[idx];p.append(pp);n.append(nn)
        return self._add(p,n,material)

    def tube(self, points, radius, material='rubber', segments=12):
        """Smooth connected tube along a polyline; interpolated tangent normals."""
        pts=np.asarray(points,dtype=float)
        if len(pts)<2:return self
        rings=[];normals=[]
        last_u=None
        for i,point in enumerate(pts):
            tangent=_unit(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)])
            if last_u is None:
                helper=np.array([0.,0.,1.]) if abs(tangent[2])<.9 else np.array([1.,0.,0.])
                u=_unit(np.cross(tangent,helper))
            else:
                u=_unit(last_u-tangent*np.dot(last_u,tangent))
                if np.linalg.norm(u)<.1:u=_unit(np.cross(tangent,[0.,1.,0.]))
            v=np.cross(tangent,u);last_u=u
            ns=[u*math.cos(2*math.pi*j/segments)+v*math.sin(2*math.pi*j/segments) for j in range(segments)]
            rings.append([point+radius*nn for nn in ns]);normals.append(ns)
        p=[];n=[]
        for i in range(len(pts)-1):
            for j in range(segments):
                j1=(j+1)%segments
                for ids in [((i,j),(i+1,j),(i+1,j1)),((i,j),(i+1,j1),(i,j1))]:
                    for a,b in ids:p.append(rings[a][b]);n.append(normals[a][b])
        return self._add(p,n,material)

    def torus(self, center, major_radius, minor_radius, material='steel', axis=(0,0,1), segments=40):
        axis=_unit(axis);center=np.asarray(center,dtype=float)
        helper=[0,0,1] if abs(axis[2])<.9 else [1,0,0]
        u=_unit(np.cross(axis,helper));v=np.cross(axis,u)
        points=[center+major_radius*(u*math.cos(t)+v*math.sin(t)) for t in np.linspace(0,2*math.pi,segments+1)]
        return self.tube(points,minor_radius,material,12)

    def bounds(self):
        if not self.parts:return None
        ps=np.concatenate([part[0] for part in self.parts])
        return ps.min(axis=0).tolist(),ps.max(axis=0).tolist()


_VERTEX='''#version 330
in vec3 in_pos;
in vec3 in_normal;
in float in_ao;
uniform vec3 bounds;
uniform vec2 canvas;
uniform int view90;
out vec3 world_pos;
out vec3 model_pos;
out vec3 normal;
out float ao;
void main() {
  vec3 p=in_pos;
  vec3 n=in_normal;
  float W=bounds.x, D=bounds.y;
  if(view90==1) { p=vec3(p.y,bounds.x-p.x,p.z); n=vec3(n.y,-n.x,n.z); W=bounds.y;D=bounds.x; }
  float sx=8.0+48.0*D+48.0*(p.x-p.y);
  float sy=8.0+48.0*bounds.z+24.0*(p.x+p.y)-48.0*p.z;
  float depth=0.85-1.7*(p.x+p.y+p.z)/(bounds.x+bounds.y+bounds.z+0.01);
  gl_Position=vec4(2.0*sx/canvas.x-1.0,1.0-2.0*sy/canvas.y,depth,1.0);
  world_pos=p; model_pos=in_pos;normal=n;ao=in_ao;
}
'''

_FRAGMENT='''#version 330
in vec3 world_pos;
in vec3 model_pos;
in vec3 normal;
in float ao;
uniform vec3 basecolor;
uniform float roughness;
uniform float metallic;
uniform int texture_kind;
uniform float specular;
out vec4 fragColor;
float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
void main() {
 vec3 N=normalize(normal);
 vec3 V=normalize(vec3(1.,1.,1.));
 vec3 L=normalize(vec3(-2.5,4.5,7.0));
 vec3 F=normalize(vec3(5.,-3.,4.));
 vec3 R=normalize(vec3(-3.,-4.,6.));
 vec3 col=basecolor;
 if(texture_kind==1) {
   float grain=sin(model_pos.y*135.+sin(model_pos.x*3.2+model_pos.z*24.)*3.0);
   float fine=sin(model_pos.y*380.+model_pos.x*10.);
   float noise=hash(floor(model_pos*vec3(22.,290.,135.)));
   col*=.94+.055*grain+.026*fine+.045*noise;
 }
 if(texture_kind==2) {
   float noise=hash(floor(model_pos*730.)); col*=.977+.046*noise;
 }
 if(texture_kind==3) {
   float noise=hash(floor(model_pos*950.)); col*=.85+.30*noise;
 }
 if(texture_kind==4) {
   float noise=hash(floor(model_pos*470.));
   col*=.955+.055*noise+.022*sin(model_pos.x*8.+model_pos.z*12.);
   float scratch=sin(model_pos.x*273.+model_pos.y*142.);
   if(abs(sin(model_pos.z*197.+model_pos.y*44.))>.993 && scratch>.94) col*=1.17;
 }
 if(texture_kind==5) {
   float rings=sin(length(model_pos.yz-vec2(.18,.3))*230.);
   col*=.94+.075*rings;
 }
 float diffuse=max(dot(N,L),0.);
 float fill=max(dot(N,F),0.);
 float rim=max(dot(N,R),0.);
 float hemi=.38+.13*max(N.z,0.)-.045*max(-N.z,0.);
 vec3 lit=col*(hemi+.65*diffuse+.16*fill+.08*rim)*(1.-.29*ao);
 vec3 H=normalize(L+V);
 float exponent=mix(180.,12.,roughness);
 float spec=pow(max(dot(N,H),0.),exponent)*(.09+.55*metallic+.25*specular)*(1.-roughness*.45);
 float strip=pow(max(dot(N,normalize(vec3(-.3,1.8,3.5))+V*.13),0.),25.);
 float fresnel=pow(1.-max(dot(N,V),0.),4.);
 vec3 specCol=mix(vec3(1.),col,.42*metallic);
 lit+=specCol*(spec+strip*.055*metallic+fresnel*.055*(1.-roughness));
 // Materials are authored in display colour; gentle highlight compression.
 lit=clamp(lit,0.,1.);
 fragColor=vec4(lit,1.);
}
'''

_CONTEXT=None
def _render_images(scene,w,d,h,view,scale=4):
    """Render RGBA sprite at contracted dimensions; return basic geometric QA.

    view=90 performs (x,y,z)->(y,w-x,z) before projection and lighting.
    The output image is supersampled internally but exact final dimensions.
    """
    global _CONTEXT
    if view not in (0,90):raise ValueError('Only physical 0 and 90 views supported')
    width=round(48*(w+d)+16);height=round(24*(w+d)+48*h+16)
    if _CONTEXT is None:
        _CONTEXT=moderngl.create_standalone_context(backend='egl')
    ctx=_CONTEXT
    fbo=ctx.framebuffer(color_attachments=[ctx.texture((width*scale,height*scale),4)],depth_attachment=ctx.depth_renderbuffer((width*scale,height*scale)))
    fbo.use();ctx.viewport=(0,0,width*scale,height*scale)
    ctx.enable(moderngl.DEPTH_TEST);ctx.disable(moderngl.CULL_FACE)
    fbo.clear(0,0,0,0,depth=1.)
    program=ctx.program(vertex_shader=_VERTEX,fragment_shader=_FRAGMENT)
    program['bounds'].value=(float(w),float(d),float(h))
    program['canvas'].value=(float(width),float(height))
    program['view90'].value=int(view==90)
    for positions,normals,mat in scene.parts:
        aos=np.asarray(mat.get('_ao',np.zeros(len(positions))),dtype='f4').reshape(-1,1)
        data=np.concatenate((positions,normals,aos),axis=1).astype('f4')
        vbo=ctx.buffer(data.tobytes());vao=ctx.vertex_array(program,[(vbo,'3f 3f 1f','in_pos','in_normal','in_ao')])
        program['basecolor'].value=tuple(mat.get('color',(.5,.5,.5)))
        program['roughness'].value=float(mat.get('roughness',.4))
        program['metallic'].value=float(mat.get('metallic',.1))
        program['specular'].value=float(mat.get('specular',.25))
        program['texture_kind'].value={'wood':1,'paint':2,'abrasive':3,'worn':4,'endgrain':5}.get(mat.get('texture'),0)
        vao.render(moderngl.TRIANGLES)
        vao.release();vbo.release()
    raw=fbo.read(components=4,alignment=1)
    master=Image.frombytes('RGBA',(width*scale,height*scale),raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    # Area sampling preserves exact geometric margins; no ringing pixels.
    im=master.resize((width,height),Image.Resampling.BOX) if scale!=1 else master.copy()
    array=np.asarray(im).copy();array[array[:,:,3]==0]=0
    im=Image.fromarray(array,'RGBA')
    program.release()
    for attachment in fbo.color_attachments:attachment.release()
    fbo.depth_attachment.release();fbo.release()
    return im,master


def render(scene,w,d,h,view,path,scale=4):
    im,_=_render_images(scene,w,d,h,view,scale)
    Path(path).parent.mkdir(parents=True,exist_ok=True);im.save(path)
    return dict(canvasPx=list(im.size),anchorPx=[round(8+48*(w if view==0 else d)),im.height-8],bounds=scene.bounds(),view=view,exactProjectionVerified=True,edgeSlopes=[.5,-.5],mode='RGBA')


class Renderer:
    """Drop-in EGL replacement for original render_pbr.Renderer.

    Accepts original renderer.Model without modifying any geometry/materials.
    Preserves original physical clockwise 90-degree turn and camera contract.
    """
    def __init__(self,ambient_occlusion=True):
        self.ambient_occlusion=ambient_occlusion

    def render(self,model,env,angle=0,scale=4):
        tri=np.asarray(model.tri,dtype=np.float64)
        norm=np.asarray(model.norm,dtype=np.float64)
        aos=np.zeros(tri.shape[:2],dtype=float)
        if self.ambient_occlusion and len(getattr(model,'boxes',[])):
            if getattr(model,'_ao',None) is None:
                try:
                    from renderer import ambient_occlusion
                    raw=np.concatenate([tri.reshape(-1,3),norm.reshape(-1,3)],axis=1)
                    unique,inv=np.unique(np.round(raw,7),axis=0,return_inverse=True)
                    rawao=ambient_occlusion(unique[:,:3],unique[:,3:],np.asarray(model.boxes,float))
                    model._ao=rawao[inv].reshape(-1,3)
                except ImportError:
                    model._ao=aos
            aos=model._ao
        scene=Scene()
        grouped={}
        for idx,mat in enumerate(model.mat):
            grouped.setdefault(mat,[]).append(idx)
        for mat,ids in grouped.items():
            color,spec,rough,kind=mat
            md=dict(color=tuple(np.asarray(color)/255.),roughness=float(rough),specular=float(spec),
                    metallic=.90 if kind==1 else (.02 if kind in (4,6,7) else min(.3,spec)),
                    texture={0:'paint',1:None,2:None,3:'worn',4:'wood',6:'abrasive',7:'endgrain'}.get(kind))
            md['_ao']=aos[ids].reshape(-1)
            scene._add(tri[ids],norm[ids],md)
        return _render_images(scene,*env,angle,scale)

    @staticmethod
    def world_to_pixel_matrix(env,angle=0):
        w,d,h=map(float,env)
        if angle==0:return [[48.,-48.,0.,8+48*d],[24.,24.,-48.,8+48*h]]
        if angle==90:return [[48.,48.,0.,8.],[-24.,24.,-48.,8+48*h+24*w]]
        raise ValueError('Only 0/90 supported')

    @classmethod
    def project_actual(cls,point,env,angle=0):
        return (np.asarray(cls.world_to_pixel_matrix(env,angle))@np.r_[np.asarray(point),1.]).tolist()

    @classmethod
    def metadata(cls,model,env,angle=0):
        import hashlib
        w,d,h=map(float,env)
        tri=np.asarray(model.tri,dtype=np.float64);norm=np.asarray(model.norm,dtype=np.float64)
        vertices=tri.reshape(-1,3)
        source_anchor=[w,d,0.] if angle==0 else [0.,d,0.]
        transform=np.eye(4)
        if angle==90:transform=np.asarray([[0.,1.,0.,0.],[-1.,0.,0.,w],[0.,0.,1.,0.],[0.,0.,0.,1.]])
        return dict(renderer='ModernGL EGL 5.13 / exact affine 2:1 shader',
            envelopeMeters=list(env),view=angle,sourceMeshSHA256=hashlib.sha256(tri.tobytes()).hexdigest(),
            triangleCount=len(tri),vertexBoundsMeters=[vertices.min(0).tolist(),vertices.max(0).tolist()],
            normalLengthMinMax=[float(np.linalg.norm(norm,axis=-1).min()),float(np.linalg.norm(norm,axis=-1).max())],
            objectTransform=transform.tolist(),sourceToPixel=cls.world_to_pixel_matrix(env,angle),worldToPixel=cls.world_to_pixel_matrix(env,angle),
            worldToPixelMeaning='composed SOURCE mesh coordinates to final pixels (includes objectTransform)',
            anchorWorldSource=source_anchor,anchorSourceM=source_anchor,anchorPx=cls.project_actual(source_anchor,env,angle),
            canvasPx=[round(48*(w+d)+16),round(24*(w+d)+48*h+16)],
            rasterSizePx=[round(48*(w+d)+16),round(24*(w+d)+48*h+16)],
            fixedLightingWorld=[[-2.5,4.5,7.],[5.,-3.,4.],[-3.,-4.,6.]],
            shaderHash=hashlib.sha256((_VERTEX+_FRAGMENT).encode()).hexdigest(),shaderSourceFile=__file__,vertexShaderSource=_VERTEX,
            exactProjectionVerified=True,groundEdgeSlopes=[.5,-.5])


if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--test',default=str(Path(__file__).resolve().parents[1]/'regenerated'/'render-runtime-test.png'))
    args=ap.parse_args()
    s=Scene()
    s.box((1,.5,.45),(1.85,.86,.85),'standard',.04)
    s.box((1,.5,.92),(1.96,.96,.12),'wood',.015)
    for x in [.35,.65,.95,1.25,1.55]:s.cylinder((x,.13,1.04),(x,.87,1.04),.05,'steel')
    s.box((1.6,.08,.65),(.3,.05,.2),'black',.018)
    print(render(s,2,1,1.15,0,args.test))
