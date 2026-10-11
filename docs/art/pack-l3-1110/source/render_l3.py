"""L3 camera adapter for the unchanged L2 real-3D renderer and materials.

Centred vehicles use a fixed custom pixel origin. Envelope objects use the
11 October contract's negative 90-degree physical rotation, unlike L2's turn.
All lighting and fragment shading come unchanged from the recovered L2 source.
"""
from __future__ import annotations
import hashlib
import io
import math
import os
from itertools import groupby
from pathlib import Path
import numpy as np
from PIL import Image
import moderngl
import render3d as base

DIRECTIONS={'sw':90,'se':0,'nw':180,'ne':-90}
FIXED_LIGHTS=[[-2.5,4.5,7.],[5.,-3.,4.],[-3.,-4.,6.]]
VERTEX_SHADER='''#version 330
in vec3 in_pos;
in vec3 in_normal;
in float in_ao;
uniform vec2 canvas;
uniform vec2 origin;
uniform mat4 model_transform;
uniform vec2 depth_range;
out vec3 world_pos;
out vec3 model_pos;
out vec3 normal;
out float ao;
void main() {
  vec3 p=(model_transform*vec4(in_pos,1.0)).xyz;
  vec3 n=mat3(model_transform)*in_normal;
  float sx=origin.x+48.0*(p.x-p.y);
  float sy=origin.y+24.0*(p.x+p.y)-48.0*p.z;
  float depth=0.8-1.6*(p.x+p.y+p.z-depth_range.x)/(depth_range.y-depth_range.x);
  gl_Position=vec4(2.0*sx/canvas.x-1.0,1.0-2.0*sy/canvas.y,depth,1.0);
  world_pos=p; model_pos=in_pos; normal=n; ao=in_ao;
}
'''
FRAGMENT_SHADER=base._FRAGMENT
_CONTEXT=None


def rigid_transform(rotation_degrees=0,translation=(0,0,0)):
    """Exact quarter-turn matrices; a general angle is also a real 3D turn."""
    angle=float(rotation_degrees)
    q=round(angle/90)
    if abs(angle-q*90)<1e-10:
        cosine,sine=[(1.,0.),(0.,1.),(-1.,0.),(0.,-1.)][q%4]
    else:
        cosine=math.cos(math.radians(angle));sine=math.sin(math.radians(angle))
    transform=np.array([[cosine,-sine,0.,0.],[sine,cosine,0.,0.],[0.,0.,1.,0.],[0.,0.,0.,1.]])
    transform[:3,3]=np.asarray(translation,dtype=float)
    return transform


def projection_matrix(origin,transform):
    ox,oy=map(float,origin)
    camera=np.array([[48.,-48.,0.,ox],[24.,24.,-48.,oy]])
    return camera@np.asarray(transform,dtype=float)


def _state(model,canvas,origin,rotation_degrees,translation):
    transform=rigid_transform(rotation_degrees,translation)
    # Scene._add uses float32, exactly as the unchanged L2 renderer did.
    vertices=np.asarray(model.tri,dtype=np.float32).reshape(-1,3)
    world=np.c_[vertices,np.ones(len(vertices),dtype=np.float32)]@transform.astype(np.float32).T
    depth=world[:,:3].sum(axis=1)
    # A real monotonic depth buffer; bounds allow centred negative coordinates.
    depth_range=[float(depth.min()-1.),float(depth.max()+1.)]
    return dict(canvas=list(map(int,canvas)),origin=list(map(float,origin)),
        model_transform=transform.tolist(),depth_range=depth_range)


def save_png(image,path):
    """Fully encode/decode in memory, then atomically publish the PNG."""
    path=Path(path);buffer=io.BytesIO();image.save(buffer,format='PNG');raw=buffer.getvalue()
    if not raw.endswith(b'\0\0\0\0IEND\xaeB`\x82'):raise OSError('Incomplete PNG encoding')
    with Image.open(io.BytesIO(raw)) as check:
        check.load()
        if check.size!=image.size or check.mode!=image.mode:raise ValueError('PNG verification failed')
    path.parent.mkdir(parents=True,exist_ok=True);temporary=path.with_name(path.name+'.tmp')
    with temporary.open('wb') as stream:
        stream.write(raw);stream.flush();os.fsync(stream.fileno())
    os.replace(temporary,path)
    return hashlib.sha256(raw).hexdigest()


class L3Renderer(base.Renderer):
    """Same L2 materials, optionally frozen L2 AO; new explicit camera origin.

    A forklift model's nose points along +X and its floor anchor is (0,0,0).
    Construct once with baseline_model for stable AO in a whole animation.
    """
    def __init__(self,ambient_occlusion=True,baseline_model=None):
        super().__init__(ambient_occlusion=ambient_occlusion)
        self.frozen_ao=base.FrozenAORenderer(baseline_model) if baseline_model is not None else None
        self.last_uniforms=None
        self._baseline_depth_ranges={}

    def _camera_state(self,model,canvas,origin,rotation_degrees,translation):
        state=_state(model,canvas,origin,rotation_degrees,translation)
        if self.frozen_ao is None:return state
        # Float32 depth must stay identical for stationary transparent surfaces.
        # Even submillimetre changes in a rotating tyre's extremum otherwise
        # perturb interpolation and depth tests at coplanar film/glass faces.
        key=(float(rotation_degrees)%360.,tuple(map(float,translation)))
        if key not in self._baseline_depth_ranges:
            reference=_state(self.frozen_ao.baseline_model,canvas,origin,rotation_degrees,translation)
            self._baseline_depth_ranges[key]=list(reference['depth_range'])
        fixed=self._baseline_depth_ranges[key]
        actual_min=state['depth_range'][0]+1.
        actual_max=state['depth_range'][1]-1.
        if actual_min<=fixed[0] or actual_max>=fixed[1]:
            raise ValueError('Animated model escaped the fixed baseline depth range and its 1m guard')
        state['depth_range']=fixed.copy()
        return state

    def _scene(self,model):
        tri=np.asarray(model.tri,dtype=np.float64);norm=np.asarray(model.norm,dtype=np.float64)
        aos=self.frozen_ao._model_ao(model) if self.frozen_ao is not None else self._model_ao(model)
        scene=base.Scene();grouped={}
        for index,mat in enumerate(model.mat):grouped.setdefault(mat,[]).append(index)
        for mat,ids in grouped.items():
            color,spec,rough,kind=mat
            material=dict(color=tuple(np.asarray(color)/255.),roughness=float(rough),specular=float(spec),
                metallic=.90 if kind==1 else (.02 if kind in (4,6,7) else min(.3,spec)),
                texture={0:'paint',1:None,2:None,3:'worn',4:'wood',6:'abrasive',7:'endgrain'}.get(kind))
            if kind==5:material.update(opacity=.20,metallic=.12,roughness=.18,texture=None)
            elif kind==8:material.update(opacity=.045,metallic=0.,roughness=.95,specular=0.,texture=None)
            elif kind==9:material.update(opacity=.065,metallic=.05,roughness=.10,texture=None)
            material['_ao']=aos[ids].reshape(-1)
            scene._add(tri[ids],norm[ids],material)
        return scene

    def render_custom(self,model,canvas=(272,256),origin=(136,192),rotation_degrees=0,
                      translation=(0,0,0),scale=6):
        global _CONTEXT
        if scale<1 or int(scale)!=scale:raise ValueError('Supersampling scale must be a positive integer')
        scale=int(scale);state=self._camera_state(model,canvas,origin,rotation_degrees,translation)
        self.last_uniforms=state
        if _CONTEXT is None:_CONTEXT=moderngl.create_standalone_context(backend='egl')
        ctx=_CONTEXT;width,height=map(int,canvas)
        fbo=ctx.framebuffer(color_attachments=[ctx.texture((width*scale,height*scale),4)],
            depth_attachment=ctx.depth_renderbuffer((width*scale,height*scale)))
        fbo.use();ctx.viewport=(0,0,width*scale,height*scale)
        ctx.enable(moderngl.DEPTH_TEST);ctx.disable(moderngl.CULL_FACE);ctx.disable(moderngl.BLEND)
        fbo.depth_mask=True;fbo.clear(0,0,0,0,depth=1.)
        program=ctx.program(vertex_shader=VERTEX_SHADER,fragment_shader=FRAGMENT_SHADER)
        program['canvas'].value=tuple(state['canvas']);program['origin'].value=tuple(state['origin'])
        program['depth_range'].value=tuple(state['depth_range'])
        transform=np.asarray(state['model_transform'],dtype='f4')
        program['model_transform'].write(transform.T.tobytes())
        scene=self._scene(model)

        def draw(positions,normals,material,aos=None):
            if aos is None:aos=material.get('_ao',np.zeros(len(positions)))
            data=np.concatenate((positions,normals,np.asarray(aos,dtype='f4').reshape(-1,1)),axis=1).astype('f4')
            buffer=ctx.buffer(data.tobytes());vao=ctx.vertex_array(program,[(buffer,'3f 3f 1f','in_pos','in_normal','in_ao')])
            program['basecolor'].value=tuple(material.get('color',(.5,.5,.5)))
            program['roughness'].value=float(material.get('roughness',.4))
            program['metallic'].value=float(material.get('metallic',.1))
            program['specular'].value=float(material.get('specular',.25))
            program['opacity'].value=float(material.get('opacity',1.))
            program['texture_kind'].value={'wood':1,'paint':2,'abrasive':3,'worn':4,'endgrain':5}.get(material.get('texture'),0)
            vao.render(moderngl.TRIANGLES);vao.release();buffer.release()

        transparent=[]
        for part_index,(positions,normals,material) in enumerate(scene.parts):
            if float(material.get('opacity',1.))>=.999:
                draw(positions,normals,material);continue
            centers=positions.reshape(-1,3,3).mean(axis=1)
            world=np.c_[centers,np.ones(len(centers),dtype='f4')]@transform.T
            for triangle_index,depth in enumerate(world[:,:3].sum(axis=1)):
                transparent.append((float(depth),part_index,triangle_index))
        if transparent:
            transparent.sort(key=lambda item:item[0]);ctx.enable(moderngl.BLEND)
            ctx.blend_func=(moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA,moderngl.ONE,moderngl.ONE_MINUS_SRC_ALPHA)
            fbo.depth_mask=False
            for part_index,batch in groupby(transparent,key=lambda item:item[1]):
                indices=np.asarray([item[2] for item in batch],dtype=np.int64)
                positions,normals,material=scene.parts[part_index]
                p=positions.reshape(-1,3,3)[indices].reshape(-1,3);n=normals.reshape(-1,3,3)[indices].reshape(-1,3)
                draw(p,n,material,np.zeros(len(p),dtype='f4'))
            fbo.depth_mask=True;ctx.disable(moderngl.BLEND)
        array=np.frombuffer(fbo.read(components=4,alignment=1),dtype=np.uint8).reshape(height*scale,width*scale,4)[::-1].copy()
        alpha=array[:,:,3].astype(np.float32)/255.;partial=(alpha>0)&(alpha<1)
        array[partial,:3]=np.clip(np.rint(array[partial,:3].astype(np.float32)/alpha[partial,None]),0,255).astype(np.uint8)
        array[alpha==0,:3]=0;master=Image.fromarray(array,'RGBA')
        small=master.resize((width,height),Image.Resampling.BOX) if scale!=1 else master.copy()
        array=np.asarray(small).copy();array[array[:,:,3]==0]=0;small=Image.fromarray(array,'RGBA')
        program.release()
        for attachment in fbo.color_attachments:attachment.release()
        fbo.depth_attachment.release();fbo.release()
        return small,master

    def render_forklift(self,model,direction='se',scale=6):
        if direction not in DIRECTIONS:raise ValueError(direction)
        return self.render_custom(model,rotation_degrees=DIRECTIONS[direction],scale=scale)

    @staticmethod
    def envelope_camera(env,view):
        w,d,h=map(float,env)
        if view not in (0,90):raise ValueError('Only envelope views 0 and 90 are supported')
        return dict(canvas=(round((w+d)*48+16),round((w+d)*24+h*48+16)),
            origin=(8+48*(d if view==0 else w),8+48*h),
            rotation_degrees=0 if view==0 else -90,translation=(0,0,0) if view==0 else (0,w,0))

    def render(self,model,env,angle=0,scale=6):
        return self.render_custom(model,**self.envelope_camera(env,angle),scale=scale)

    def render_pallet(self,model,view=0,scale=6):
        return self.render(model,(2,1,1.75),view,scale)

    def metadata_custom(self,model,canvas=(272,256),origin=(136,192),rotation_degrees=0,
                        translation=(0,0,0),anchor_source=(0,0,0),direction=None,phase=0):
        state=self._camera_state(model,canvas,origin,rotation_degrees,translation)
        transform=np.asarray(state['model_transform']);matrix=projection_matrix(origin,transform)
        tri=np.asarray(model.tri,dtype=np.float64);norm=np.asarray(model.norm,dtype=np.float64)
        vertices=tri.reshape(-1,3)
        record=dict(renderer='L3 adapter / unchanged L2 materials and fragment shader / ModernGL EGL',
            sourceMeshSHA256=hashlib.sha256(tri.tobytes()).hexdigest(),triangleCount=len(tri),
            sourceToPixel=matrix.tolist(),worldToPixel=matrix.tolist(),objectTransform=transform.tolist(),
            worldToPixelMeaning='composed source coordinates to final canvas pixels',
            anchorSourceM=list(map(float,anchor_source)),anchorPx=(matrix@np.r_[anchor_source,1.]).tolist(),
            canvasPx=list(canvas),rasterSizePx=list(canvas),vertexBoundsMeters=[vertices.min(0).tolist(),vertices.max(0).tolist()],
            normalLengthMinMax=[float(np.linalg.norm(norm,axis=-1).min()),float(np.linalg.norm(norm,axis=-1).max())],
            fixedLightingWorld=FIXED_LIGHTS,uniforms=state,rotationDegrees=float(rotation_degrees),direction=direction,phase=float(phase),
            shaderSourceFile=__file__,vertexShaderSource=VERTEX_SHADER,fragmentShaderSource=FRAGMENT_SHADER,
            shaderHash=hashlib.sha256((VERTEX_SHADER+FRAGMENT_SHADER).encode()).hexdigest(),
            fragmentShaderSHA256=hashlib.sha256(FRAGMENT_SHADER.encode()).hexdigest(),
            sameFragmentShaderAsL2=True,usesPhysicalRotation=True,noAdditionalZSquash=True,
            groundEdgeSlopeMagnitude=.5,exactProjectionVerified=True)
        if self.frozen_ao is not None:
            record['ambientOcclusion']=self.frozen_ao.policy
            record['depthRangePolicy']='fixed phase-zero mesh range per rigid orientation/translation, padded by 1m on both ends'
            record['depthRangeFixedAcrossFrames']=True
        return record

    def metadata_forklift(self,model,direction='se',phase=0):
        if direction not in DIRECTIONS:raise ValueError(direction)
        return self.metadata_custom(model,rotation_degrees=DIRECTIONS[direction],direction=direction,phase=phase)

    def metadata(self,model,env,angle=0,phase=0):
        w,d,h=map(float,env);anchor=(w,d,0) if angle==0 else (0,d,0)
        record=self.metadata_custom(model,**self.envelope_camera(env,angle),anchor_source=anchor,phase=phase)
        record.update(envelopeMeters=list(env),view=angle)
        return record

    def metadata_pallet(self,model,view=0):
        return self.metadata(model,(2,1,1.75),view)
