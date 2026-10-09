"""Independent order-4/package-1 geometry, camera and PNG validation.

Reads the current brief; never modifies meshes, renders, or model code.
Uses original exported triangles, renderer metadata and the actual vertex
shader executed via GPU transform feedback. A missing check cannot pass.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import itertools
import json
import math
import re
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
EPS=2e-6

def numbers(s):
    return [float(x.replace(',','.')) for x in re.findall(r'\d+(?:,\d+)?',s)]

def parse_contract(path):
    result={}
    for line in path.read_text(encoding='utf-8').splitlines():
        if not re.match(r'^\|\s*`(?:sander\.|cutters)',line):continue
        cols=[x.strip().strip('`') for x in line.split('|')[1:-1]]
        name=cols[0].removesuffix('.png')
        if name.startswith('sander.'):
            env=numbers(cols[1]);size=list(map(int,numbers(cols[2])))
            # Commas separate anchor integers, whereas decimal commas occur in metres.
            anchors={str(a):list(map(int,re.findall(r'\d+',cols[i]))) for a,i in [(0,3),(90,4)]}
            kind='metric'
        else:
            size=list(map(int,numbers(cols[2])))
            anchors={'0':list(map(int,re.findall(r'\d+',cols[3])))}
            # Catalogue tools use a logical 1m square, inferred from the symmetric
            # anchor and canvas; this is NOT a physical size stated in the brief.
            w=(anchors['0'][0]-8)/48
            d=(size[0]-16)/48-w
            h=(size[1]-16-24*(w+d))/48
            env=[w,d,h];kind='catalog'
        computed=[round(48*(env[0]+env[1])+16),round(24*(env[0]+env[1])+48*env[2]+16)]
        if size!=computed:raise ValueError(f'{name}: brief table contradicts formula: {size} / {computed}')
        result[name]={'envelopeMeters':env,'canvasPx':size,'anchors':anchors,'kind':kind}
    if len(result)!=8 or sum(len(x['anchors']) for x in result.values())!=13:
        raise ValueError('Current package 1 must contain five sanders and three cutter sets, 13 views')
    return result

def expected_matrix(env,view):
    w,d,h=env
    return np.array([[48,-48,0,8+48*d],[24,24,-48,8+48*h]],float) if view==0 else np.array([[48,48,0,8],[-24,24,-48,8+48*h+24*w]],float)

def expected_transform(env,view):
    if view==0:return np.eye(4)
    return np.array([[0,1,0,0],[-1,0,0,env[0]],[0,0,1,0],[0,0,0,1]],float)

def project(points,matrix):
    return np.c_[np.asarray(points).reshape(-1,3),np.ones(np.asarray(points).reshape(-1,3).shape[0])]@matrix.T

def metadata_records(output):
    records={}
    paths=[output/'render-metadata.json']+sorted((output/'reports').glob('*.json'))
    for p in paths:
        if not p.exists():continue
        raw=json.loads(p.read_text())
        if isinstance(raw,list):entries=raw
        elif 'assets' in raw:
            entries=[dict(v,name=k) for k,v in raw['assets'].items()] if isinstance(raw['assets'],dict) else raw['assets']
        elif 'name' in raw:entries=[raw]
        elif 'views' in raw:entries=[dict(raw,name=p.stem)]
        else:continue
        for row in entries:records[row['name']]=row
    return records

def mesh_audit(path,env,metric):
    with np.load(path,allow_pickle=False) as data:
        tris=np.asarray(data['triangles'],float)
        normals=np.asarray(data['normals'],float)
        boxes=np.asarray(data['boxes'],float) if 'boxes' in data else None
    if tris.ndim!=3 or tris.shape[1:]!=(3,3) or normals.shape!=tris.shape:
        raise ValueError('Triangle and normal arrays must be matching Nx3x3 arrays')
    vertices=tris.reshape(-1,3)
    lo=vertices.min(0);hi=vertices.max(0);lengths=np.linalg.norm(normals,axis=-1)
    cross=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]);areas=np.linalg.norm(cross,axis=1)
    alignment=np.einsum('ij,ij->i',cross,normals.mean(axis=1))
    degenerate=int((areas<1e-12).sum())
    wrong_normals=int((alignment < -1e-10).sum())
    edges=np.concatenate([tris[:,[0,1]],tris[:,[1,2]],tris[:,[2,0]]])
    delta=edges[:,1]-edges[:,0]
    axis_edges={}
    for axis in range(3):
        other=[a for a in range(3) if a!=axis]
        mask=(np.abs(delta[:,axis])>1e-5)&(np.abs(delta[:,other]).max(1)<1e-7)
        axis_edges[axis]=edges[mask]
    audit={
        'path':str(path),'fileSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'trianglesSHA256':hashlib.sha256(tris.tobytes()).hexdigest(),
        'triangleCount':len(tris),'boundsMinM':lo.tolist(),'boundsMaxM':hi.tolist(),
        'insideEnvelope':bool((lo>=-EPS).all() and (hi<=np.asarray(env)+EPS).all()),
        'grounded':bool(abs(lo[2])<EPS),'heightMatchesEnvelope':bool(abs(hi[2]-env[2])<EPS),
        'fillsXYEnvelope':bool(np.max(np.abs(lo[:2]))<EPS and np.max(np.abs(hi[:2]-env[:2]))<EPS),
        'normalLengthMinMax':[float(lengths.min()),float(lengths.max())],
        'normalsUnit':bool(np.max(np.abs(lengths-1))<1e-4),
        'nonFiniteValues':int((~np.isfinite(tris)).sum()+(~np.isfinite(normals)).sum()),
        'degenerateTriangles':degenerate,'facesOpposedToNormals':wrong_normals,
        'axisAlignedEdgeCounts':{str(k):len(v) for k,v in axis_edges.items()},
        'boxCount':None if boxes is None else len(boxes),
    }
    audit['passed']=bool(audit['insideEnvelope'] and audit['normalsUnit'] and not audit['nonFiniteValues'] and not degenerate and not wrong_normals and (not metric or audit['grounded'] and audit['heightMatchesEnvelope'] and audit['fillsXYEnvelope']))
    return audit,tris,axis_edges

_GPU=None
def gpu_projection_probe(shader,env,view,size,points):
    """Execute the renderer's vertex shader, capturing gl_Position unchanged."""
    global _GPU
    if _GPU is None:
        import moderngl
        ctx=moderngl.create_standalone_context(backend='egl')
        framebuffer=ctx.simple_framebuffer((1,1))
        _GPU=(moderngl,ctx,framebuffer)
    moderngl,ctx,framebuffer=_GPU
    framebuffer.use()
    source=shader.replace('void main()', 'out vec4 qa_clip;\nvoid main()',1)
    # Original calculations are preserved; append one transform-feedback output.
    end=source.rfind('}')
    source=source[:end]+'\n qa_clip=gl_Position;\n'+source[end:]
    program=ctx.program(vertex_shader=source,varyings=['qa_clip'])
    program['bounds'].value=tuple(map(float,env));program['canvas'].value=tuple(map(float,size));program['view90'].value=int(view==90)
    vbo=ctx.buffer(np.asarray(points,dtype='f4').tobytes())
    vao=ctx.vertex_array(program,[(vbo,'3f','in_pos')])
    output=ctx.buffer(reserve=len(points)*16)
    ctx.enable(moderngl.RASTERIZER_DISCARD)
    vao.transform(output,mode=moderngl.POINTS,vertices=len(points))
    ctx.disable(moderngl.RASTERIZER_DISCARD)
    clip=np.frombuffer(output.read(),dtype='f4').reshape(-1,4).astype(float)
    output.release();vao.release();vbo.release();program.release()
    xy=np.column_stack([(clip[:,0]/clip[:,3]+1)*size[0]/2,(1-clip[:,1]/clip[:,3])*size[1]/2])
    expected=project(np.asarray(points,dtype='f4'),expected_matrix(env,view))
    error=np.abs(xy-expected)
    return {'method':'actual vertex shader / GPU transform feedback','sampleCount':len(points),'maxPixelError':float(error.max()),'clipWMinMax':[float(clip[:,3].min()),float(clip[:,3].max())],'passed':bool(np.isfinite(error).all() and error.max()<1e-4 and np.all(clip[:,3]==1))}

def camera_audit(meta,env,view,size,anchor,triangles,axis_edges):
    result={'metadataPresent':bool(meta),'exactProjectionVerified':False}
    if not meta:return result
    matrix=np.asarray(meta.get('sourceToPixel',meta.get('worldToPixel',[])),float)
    transform=np.asarray(meta.get('objectTransform',[]),float)
    expected=expected_matrix(env,view);want_transform=expected_transform(env,view)
    source_anchor=np.array([env[0],env[1],0.] if view==0 else [0.,env[1],0.])
    result['matrixMatchesContract']=bool(matrix.shape==(2,4) and np.max(np.abs(matrix-expected))<1e-9)
    result['metadataMatchesExportedMesh']=meta.get('sourceMeshSHA256')==hashlib.sha256(triangles.tobytes()).hexdigest()
    result['physicalRotationVerified']=bool(transform.shape==(4,4) and np.max(np.abs(transform-want_transform))<1e-9)
    result['rotationDeterminant']=float(np.linalg.det(transform[:3,:3])) if transform.shape==(4,4) else None
    result['anchorSourceM']=source_anchor.tolist()
    result['computedAnchorPx']=project([source_anchor],expected)[0].tolist()
    recorded_anchor=meta.get('anchorSourceM',meta.get('anchorWorldSource',[]))
    result['anchorVerified']=bool(np.shape(recorded_anchor)==(3,) and np.max(np.abs(np.asarray(recorded_anchor)-source_anchor))<1e-9 and np.max(np.abs(np.asarray(result['computedAnchorPx'])-anchor))<1e-9 and np.shape(meta.get('anchorPx'))==(2,) and np.max(np.abs(np.asarray(meta['anchorPx'])-anchor))<1e-9)
    result['renderCanvasMatches']=list(meta.get('rasterSizePx',meta.get('canvasPx',[])))==size
    result['edgeTests']={}
    for axis,edges in axis_edges.items():
        if not len(edges):result['edgeTests'][str(axis)]={'count':0,'passed':False};continue
        projected=project(edges,expected).reshape(-1,2,2)
        delta=projected[:,1]-projected[:,0]
        if axis==2:
            err=float(np.max(np.abs(delta[:,0])));values=[0.,0.];expected_slope=None
        else:
            slopes=delta[:,1]/delta[:,0]
            expected_slope=.5 if (axis==0 and view==0 or axis==1 and view==90) else -.5
            err=float(np.max(np.abs(slopes-expected_slope)));values=[float(slopes.min()),float(slopes.max())]
        result['edgeTests'][str(axis)]={'count':len(edges),'slopeMinMax':values,'targetSlope':expected_slope,'maxError':err,'passed':err<1e-7}
    vertices=triangles.reshape(-1,3)
    projected=project(vertices,expected)
    result['projectedVertexBoundsPx']=[projected.min(0).tolist(),projected.max(0).tolist()]
    points=np.array(list(itertools.product([0.,env[0]],[0.,env[1]],[0.,env[2]])))
    indexes=np.linspace(0,len(vertices)-1,min(256,len(vertices))).astype(int)
    points=np.vstack([points,source_anchor,vertices[indexes]])
    try:result['gpuProbe']=gpu_projection_probe(meta['vertexShaderSource'],env,view,size,points)
    except Exception as exc:result['gpuProbe']={'passed':False,'error':f'{type(exc).__name__}: {exc}'}
    lights=np.asarray(meta.get('fixedLightingWorld',[]),float)
    result['lightingWorld']=lights.tolist()
    if lights.ndim==2 and len(lights):
        screen_delta=np.array([[48,-48,0],[24,24,-48]],float)@lights[0]
        result['keyLightScreenDirection']=screen_delta.tolist()
        result['keyLightFromUpperLeft']=bool((screen_delta<0).all())
    else:result['keyLightFromUpperLeft']=False
    result['shaderHash']=meta.get('shaderHash')
    try:
        module=ast.parse(Path(meta['shaderSourceFile']).read_text())
        shaders={}
        for node in module.body:
            if isinstance(node,ast.Assign):
                for target in node.targets:
                    if isinstance(target,ast.Name) and target.id in ('_VERTEX','_FRAGMENT'):
                        shaders[target.id]=ast.literal_eval(node.value)
        actual_hash=hashlib.sha256((shaders['_VERTEX']+shaders['_FRAGMENT']).encode()).hexdigest()
        result['shaderSourceMatchesRendererFile']=bool(shaders['_VERTEX']==meta['vertexShaderSource'] and actual_hash==meta['shaderHash'])
    except Exception as exc:
        result['shaderSourceMatchesRendererFile']=False
        result['shaderSourceError']=f'{type(exc).__name__}: {exc}'
    result['exactProjectionVerified']=bool(result['matrixMatchesContract'] and result['metadataMatchesExportedMesh'] and result['shaderSourceMatchesRendererFile'] and result['physicalRotationVerified'] and result['anchorVerified'] and result['renderCanvasMatches'] and result['gpuProbe']['passed'] and all(v['passed'] for v in result['edgeTests'].values()))
    return result

def image_audit(path,expected_size,kind):
    if not path.exists():return {'present':False,'passed':False}
    raw=path.read_bytes();im=Image.open(path);alpha=np.array(im.getchannel('A')) if im.mode=='RGBA' else None
    bbox=None if alpha is None else im.getchannel('A').getbbox()
    margins=None if bbox is None else [bbox[0],bbox[1],im.width-bbox[2],im.height-bbox[3]]
    result={'present':True,'fileSHA256':hashlib.sha256(raw).hexdigest(),'sizePx':list(im.size),'mode':im.mode,'pngBitDepth':raw[24] if raw.startswith(b'\x89PNG') else None,'pngColorType':raw[25] if raw.startswith(b'\x89PNG') else None,'alphaBoundsPx':list(bbox) if bbox else None,'marginsPx':margins,'minimumMarginPx':min(margins) if margins else None,'transparentPixelCount':int((alpha==0).sum()) if alpha is not None else 0}
    result['passed']=bool(list(im.size)==expected_size and im.mode=='RGBA' and result['pngBitDepth']==8 and result['pngColorType']==6 and margins and min(margins)>=8 and result['transparentPixelCount']>0)
    if kind=='catalog' and bbox:
        result['catalogApproximateTargetBox']=[23,25,87,89]
        result['catalogBoxDeltaPx']=(np.asarray(bbox)-[23,25,87,89]).tolist()
        result['catalogCenteredX']=abs((bbox[0]+bbox[2])/2-56)<=5
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--brief',type=Path,default=Path(__file__).resolve().parent/'brief.txt')
    parser.add_argument('--output',type=Path,default=ROOT/'regenerated')
    parser.add_argument('--report',type=Path)
    args=parser.parse_args();contracts=parse_contract(args.brief);metadata=metadata_records(args.output)
    report={'scope':'order 2026-10-08 / package 1 preview','briefSHA256':hashlib.sha256(args.brief.read_bytes()).hexdigest(),'expectedAssets':8,'expectedSprites':13,'files':[],'meshes':{},'exactProjectionVerified':False}
    for name,contract in contracts.items():
        env=contract['envelopeMeters'];meshpath=args.output/'source-meshes'/f'{name}.npz'
        if not meshpath.exists():meshpath=args.output/'meshes'/f'{name}.npz'
        try:mesh,triangles,edges=mesh_audit(meshpath,env,contract['kind']=='metric')
        except Exception as exc:mesh={'passed':False,'error':f'{type(exc).__name__}: {exc}'};triangles=edges=None
        report['meshes'][name]=mesh
        modelmeta=metadata.get(name,{})
        view_records=[]
        for view_string,anchor in contract['anchors'].items():
            view=int(view_string);path=args.output/'sprites-2x'/view_string/f'{name}.png'
            image=image_audit(path,contract['canvasPx'],contract['kind'])
            meta=modelmeta.get('views',{}).get(view_string,{})
            camera=camera_audit(meta,env,view,contract['canvasPx'],anchor,triangles,edges) if triangles is not None else {'exactProjectionVerified':False,'metadataPresent':bool(meta)}
            bbox=image.get('alphaBoundsPx');projected=camera.get('projectedVertexBoundsPx')
            if bbox and projected:
                exact=np.r_[projected[0],projected[1]];delta=np.asarray(bbox)-exact
                image['projectedBoundsDeltaPx']=delta.tolist()
                image['rasterRegistrationVerified']=bool(np.abs(delta).max()<=2)
            else:image['rasterRegistrationVerified']=False
            row={'file':f'sprites-2x/{view_string}/{name}.png','asset':name,'view':view,'envelopeMeters':env,'contractAnchorPx':anchor,'image':image,'camera':camera}
            row['passed']=bool(mesh['passed'] and image['passed'] and image['rasterRegistrationVerified'] and camera['exactProjectionVerified'] and camera.get('keyLightFromUpperLeft',False))
            report['files'].append(row);view_records.append(row)
        if len(view_records)==2:
            lights=[r['camera'].get('lightingWorld') for r in view_records]
            same=bool(lights[0] and lights[0]==lights[1])
            mesh['fixedLightingAcrossViews']=same
            mesh['sameSourceMeshForBothViews']=bool(all(metadata.get(name,{}).get('views',{}).get(str(r['view']),{}).get('sourceMeshSHA256') for r in view_records) and len({metadata[name]['views'][str(r['view'])]['sourceMeshSHA256'] for r in view_records})==1)
            for row in view_records:
                row['passed']=bool(row['passed'] and same and mesh['sameSourceMeshForBothViews'])
    expected={r['file'] for r in report['files']}
    actual={str(p.relative_to(args.output)) for p in (args.output/'sprites-2x').rglob('*.png')}
    report['missingFiles']=sorted(expected-actual);report['unexpectedFiles']=sorted(actual-expected)
    report['exactProjectionVerified']=all(r['camera']['exactProjectionVerified'] for r in report['files'])
    report['technicalChecksPassed']=bool(all(r['passed'] for r in report['files']) and not report['missingFiles'] and not report['unexpectedFiles'])
    report['visualApproval']='pending — preview only'
    destination=args.report or args.output/'independent-validation.json';destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'report':str(destination),'sprites':len(report['files']),'exactProjectionVerified':report['exactProjectionVerified'],'technicalChecksPassed':report['technicalChecksPassed'],'failures':[r['file'] for r in report['files'] if not r['passed']]},ensure_ascii=False))
    return 0 if report['technicalChecksPassed'] else 1

if __name__=='__main__':raise SystemExit(main())
