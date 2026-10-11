"""Render L3 real 3D meshes into preview-ready static sprites and animation sheets."""
from __future__ import annotations
import argparse, hashlib, io, json, os, time
from pathlib import Path
import numpy as np
from PIL import Image
from common import cleanup
from pallet import build_pallet, verify_reference_identity
from render_l3 import L3Renderer

ROOT=Path(__file__).resolve().parent.parent
ROWS={'sw':0,'se':1,'nw':2,'ne':3}
CELL=(272,256)
ANCHOR=(136,192)

def atomic_bytes(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_name(path.name+'.tmp')
    with temporary.open('wb') as f:
        f.write(data);f.flush();os.fsync(f.fileno())
    os.replace(temporary,path)

def save_png(im,path):
    buf=io.BytesIO();im.save(buf,format='PNG');raw=buf.getvalue()
    assert raw.endswith(b'\x00\x00\x00\x00IEND\xaeB`\x82')
    with Image.open(io.BytesIO(raw)) as check:
        check.load();assert check.mode==im.mode and check.size==im.size
    atomic_bytes(path,raw)
    return hashlib.sha256(raw).hexdigest()

def json_default(value):
    if isinstance(value,np.ndarray):return value.tolist()
    if isinstance(value,np.generic):return value.item()
    if isinstance(value,Path):return str(value)
    raise TypeError(type(value).__name__)

def save_json(path,value):
    atomic_bytes(path,(json.dumps(value,indent=2,ensure_ascii=False,default=json_default)+'\n').encode())

def model_digest(model):
    digest=hashlib.sha256()
    for arr in [np.asarray(model.tri),np.asarray(model.norm),np.asarray([tuple(m[0])+tuple(m[1:]) for m in model.mat]),np.asarray(model.boxes)]:
        digest.update(str(arr.shape).encode());digest.update(np.round(arr,10).tobytes())
    return digest.hexdigest()

def audit(im):
    assert im.mode=='RGBA'
    bbox=im.getchannel('A').getbbox();assert bbox is not None
    margins=[bbox[0],bbox[1],im.width-bbox[2],im.height-bbox[3]]
    assert min(margins)>=8, margins
    return {'canvasPx':list(im.size),'mode':'RGBA','bitDepth':8,'alphaBoundsPx':list(bbox),'marginsPx':margins,'pixelSHA256':hashlib.sha256(np.asarray(im).tobytes()).hexdigest()}

def save_mesh(model,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    materials=np.asarray([tuple(m[0])+tuple(m[1:]) for m in model.mat],dtype=np.float64)
    buf=io.BytesIO();np.savez_compressed(buf,tri=np.asarray(model.tri),norm=np.asarray(model.norm),mat=materials,boxes=np.asarray(model.boxes))
    atomic_bytes(path,buf.getvalue())

def render_pallet(out,scale):
    model=build_pallet()
    identity=verify_reference_identity(model);assert identity['passed']
    save_json(out/'reports/pallet-reference-identity.json',identity)
    renderer=L3Renderer()
    report={'asset':'windowPallet.standard','views':[],'windowReference':identity}
    save_mesh(model,out/'models/windowPallet.standard.npz')
    for view in [0,90]:
        im,master=renderer.render_pallet(model,view=view,scale=scale)
        relative=f'sprites-2x/{view}/windowPallet.standard.png'
        sha=save_png(im,out/relative)
        save_png(master,out/f'masters/{view}/windowPallet.standard.png')
        camera=renderer.metadata_pallet(model,view=view)
        report['views'].append({'file':relative,'imageSHA256':sha,'camera':camera,'image':audit(im),'exactProjectionVerified':True})
        print(f'Pallet {view}: {im.size}',flush=True)
    save_json(out/'reports/windowPallet.standard.json',report)
    return report

def render_vehicle(out,loaded,scale,directions=None,first_only=False):
    from forklift import build_forklift
    kind='driveLoaded' if loaded else 'drive'
    key=f'vehicle.forklift.{kind}'
    phases=[0] if first_only else [i/6 for i in range(6)]
    models=[cleanup(build_forklift(phase=p,loaded=loaded)) for p in phases]
    closure=cleanup(build_forklift(phase=1.,loaded=loaded))
    assert model_digest(closure)==model_digest(models[0]),'Model loop endpoint changed'
    renderer=L3Renderer(baseline_model=models[0])
    sheet=Image.new('RGBA',(CELL[0]*6,CELL[1]*4))
    report={'asset':key,'frames':6,'fps':8,'rows':{},'canvasPx':list(CELL),'anchorPx':list(ANCHOR),'loopEndpointModelEqualsBaseline':True,'models':[]}
    for i,model in enumerate(models):
        save_mesh(model,out/f'models/{kind}/{i:02d}.npz')
        report['models'].append({'frameIndex':i,'modelSHA256':model_digest(model),'triangleCount':len(model.tri),'componentTriangleRanges':getattr(model,'componentTriangleRanges',{}),'dynamicTriangleRanges':getattr(model,'dynamicTriangleRanges',[]),'animation':getattr(model,'animation',{})})
    started=time.time()
    for direction,row in ROWS.items():
        if directions and direction not in directions:continue
        report['rows'][direction]=[]
        for i,model in enumerate(models):
            im,master=renderer.render_forklift(model,direction=direction,scale=scale)
            assert im.size==CELL
            relative=f'frames/{kind}/{direction}/{i:02d}.png'
            sha=save_png(im,out/relative)
            if i==0:save_png(master,out/f'masters/{kind}/{direction}.png')
            sheet.paste(im,(i*CELL[0],row*CELL[1]))
            camera=renderer.metadata_forklift(model,direction=direction,phase=phases[i])
            record={'frameIndex':i,'phase':phases[i],'file':relative,'imageSHA256':sha,'camera':camera,'image':audit(im),'exactProjectionVerified':True}
            report['rows'][direction].append(record)
            print(f'{kind} {direction} {i+1}/{len(models)} ({time.time()-started:.1f}s)',flush=True)
    if not first_only and not directions:
        for frames in report['rows'].values():assert len({f['image']['pixelSHA256'] for f in frames})>1
        sheetfile=f'sheets/{key}.sheet.png'
        report['sheetFile']=sheetfile;report['sheetSHA256']=save_png(sheet,out/sheetfile)
        save_json(out/f'sheets/{key}.sheet.json',{'cellWidth':CELL[0],'cellHeight':CELL[1],'anchorX':ANCHOR[0],'anchorY':ANCHOR[1],'frames':6,'fps':8,'rows':ROWS,'loop':True})
    save_json(out/f'reports/{key}.json',report)
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,default=ROOT/'l3-output')
    p.add_argument('--scale',type=int,default=6)
    p.add_argument('--only',choices=['pallet','drive','driveLoaded','all'],default='all')
    p.add_argument('--first-only',action='store_true')
    a=p.parse_args()
    if a.only in ['pallet','all']:render_pallet(a.output,a.scale)
    for loaded,kind in [(False,'drive'),(True,'driveLoaded')]:
        if a.only in [kind,'all']:render_vehicle(a.output,loaded,a.scale,first_only=a.first_only)

if __name__=='__main__':main()
