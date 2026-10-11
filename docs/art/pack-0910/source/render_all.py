from pathlib import Path
import sys,json,time
import numpy as np
from models import build,save_mesh,ENVS
from render3d import Renderer

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'regenerated'
def main():
    requested=sys.argv[1:]
    names=requested or ['sander.'+x for x in ['used','budget','standard','pro','industrial']]+['cutters'+x+'.standard' for x in ['Sash','Casement','Door']]
    renderer=Renderer();metadata=[]
    for name in names:
        t=time.time()
        if name.startswith('cutters'):
            from cutters import build_cutters
            model=build_cutters(name.removeprefix('cutters').split('.')[0]);env=(1,1,1)
        else:model=build(name);env=ENVS[name]
        vertices=np.asarray(model.tri).reshape(-1,3)
        if np.any(vertices.min(0)<-1e-7) or np.any(vertices.max(0)>np.asarray(env)+1e-7):raise ValueError((name,vertices.min(0),vertices.max(0)))
        save_mesh(model,OUT/'source-meshes'/f'{name}.npz')
        views={}
        for angle in ([0] if name.startswith('cutters') else [0,90]):
            small,master=renderer.render(model,env,angle,6)
            for directory,im in [('sprites-2x',small),('masters-6x',master)]:
                p=OUT/directory/str(angle)/f'{name}.png';p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
            views[str(angle)]=renderer.metadata(model,env,angle)
        report=OUT/'reports'/f'{name}.json';report.parent.mkdir(parents=True,exist_ok=True)
        report.write_text(json.dumps({'views':views},indent=2))
        metadata.append({'name':name,'boundsM':env,'meshMin':vertices.min(0).tolist(),'meshMax':vertices.max(0).tolist(),'triangles':len(model.tri)})
        print(name,round(time.time()-t,2),flush=True)
    (OUT/'render-metadata.json').write_text(json.dumps(metadata,indent=2))

if __name__=='__main__':main()
