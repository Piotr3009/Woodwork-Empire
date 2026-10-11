"""Independent L3 checks: metric projection, true rotations, common pivot and loops.

Reads published PNG/JSON/NPZ files and reconstructs models, but never renders
or changes assets. The original L2 stack is loaded in an isolated interpreter.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib
import itertools
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ROWS = {'sw': 0, 'se': 1, 'nw': 2, 'ne': 3}
HEADINGS = {'sw': [0., 1., 0.], 'se': [1., 0., 0.], 'nw': [-1., 0., 0.], 'ne': [0., -1., 0.]}
_GPU = None


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def project(points, matrix):
    points = np.asarray(points).reshape(-1, 3)
    return np.c_[points, np.ones(len(points))] @ np.asarray(matrix).T


def expected_pallet(view):
    if view == 0:
        return (np.eye(4), np.array([[48., -48., 0., 56.], [24., 24., -48., 92.]]),
                [2., 1., 0.], [104, 164], [56., 92.])
    if view == 90:
        # The new 11.10 brief explicitly requires NEGATIVE physical rotation.
        transform = np.array([[0., 1., 0., 0.], [-1., 0., 0., 2.], [0., 0., 1., 0.], [0., 0., 0., 1.]])
        return (transform, np.array([[48., 48., 0., 8.], [-24., 24., -48., 140.]]),
                [0., 1., 0.], [56, 164], [104., 92.])
    raise ValueError('Pallet view must be 0 or 90')


def expected_vehicle(direction, anchor):
    x, y, _ = HEADINGS[direction]
    transform = np.array([[x, -y, 0., 0.], [y, x, 0., 0.], [0., 0., 1., 0.], [0., 0., 0., 1.]])
    base = np.array([[48., -48., 0., anchor[0]], [24., 24., -48., anchor[1]]])
    return transform, base @ transform, [0., 0., 0.], anchor, anchor


def arrays(model):
    tri = np.asarray(model.tri, dtype=np.float64)
    normal = np.asarray(model.norm, dtype=np.float64)
    material = np.asarray([tuple(m[0]) + tuple(m[1:]) for m in model.mat], dtype=np.float64)
    records = np.ascontiguousarray(np.c_[tri.reshape(len(tri), -1), normal.reshape(len(tri), -1), material])
    keys = records.view(np.dtype((np.void, records.shape[1]*8))).reshape(-1)
    return tri, normal, material, keys


def mask_for_ranges(ranges, length):
    mask = np.zeros(length, bool)
    for a, b in ranges:
        if not isinstance(a, int) or not isinstance(b, int) or not 0 <= a < b <= length:
            raise ValueError(f'Invalid triangle interval {(a, b)} for {length}')
        mask[a:b] = True
    return mask


def model_audit(model, envelope=None):
    tri, normal, material, keys = arrays(model)
    vertices = tri.reshape(-1, 3)
    cross = np.cross(tri[:, 1]-tri[:, 0], tri[:, 2]-tri[:, 0])
    area = np.linalg.norm(cross, axis=1)
    dynamic = mask_for_ranges(getattr(model, 'dynamicTriangleRanges', []), len(tri))
    # A rotating polygonal tyre approximates a circular contact surface. Its
    # lowest sampled vertex can sit a fraction of a pixel above the floor.
    # The brief fixes the floor pivot, not a tyre vertex. Keep the pallet's
    # exact contact test, and explicitly report the forklift's <0.048px limit.
    contact_tolerance = 2e-6 if envelope is not None else .001
    clearance = float(vertices[:, 2].min())
    result = {'triangleCount': len(tri), 'meshSHA256': sha(tri.tobytes()),
              'modelDataSHA256': sha(keys.tobytes()),
              'staticDataSHA256': sha(np.sort(keys[~dynamic]).tobytes()),
              'dynamicTriangles': int(dynamic.sum()), 'staticTriangles': int((~dynamic).sum()),
              'boundsMinM': vertices.min(0).tolist(), 'boundsMaxM': vertices.max(0).tolist(),
              'nonFiniteValues': sum(int((~np.isfinite(a)).sum()) for a in (tri, normal, material)),
              'degenerateTriangles': int((area < 1e-12).sum()),
              'facesOpposedToNormals': int((np.einsum('ij,ij->i', cross, normal.mean(1)) < -1e-10).sum()),
              'normalsUnit': bool(np.max(np.abs(np.linalg.norm(normal, axis=-1)-1)) < 1e-4),
              'groundClearanceM': clearance, 'groundClearancePx': clearance*48,
              'groundContactToleranceM': contact_tolerance,
              'groundContactTolerancePx': contact_tolerance*48,
              'groundingMethod': 'exact pallet contact' if envelope is not None else 'polygonal tyre surface; subpixel contact tolerance',
              'grounded': bool(abs(clearance) <= contact_tolerance)}
    if envelope is not None:
        result['insideEnvelope'] = bool((vertices.min(0) >= -2e-6).all() and
                                         (vertices.max(0) <= np.asarray(envelope)+2e-6).all())
    result['passed'] = bool(not result['nonFiniteValues'] and not result['degenerateTriangles'] and
                            not result['facesOpposedToNormals'] and result['normalsUnit'] and
                            result['grounded'] and result.get('insideEnvelope', True))
    return result, tri, normal, keys, dynamic


def exported_model_matches(path, model):
    tri, normal, material, _ = arrays(model)
    with np.load(path, allow_pickle=False) as data:
        return bool(np.array_equal(data['tri'], tri) and np.array_equal(data['norm'], normal) and
                    np.array_equal(data['mat'], material) and np.array_equal(data['boxes'], np.asarray(model.boxes)))


def image_audit(path, size):
    raw = path.read_bytes()
    with Image.open(path) as im:
        im.load()
        actual_size, mode = list(im.size), im.mode
        pixels = np.asarray(im).copy()
        bbox = im.getchannel('A').getbbox() if mode == 'RGBA' else None
    margins = [bbox[0], bbox[1], size[0]-bbox[2], size[1]-bbox[3]] if bbox else []
    result = {'fileSHA256': sha(raw), 'pixelSHA256': sha(pixels.tobytes()), 'fullyDecoded': True,
              'sizePx': actual_size, 'mode': mode, 'pngBitDepth': raw[24], 'pngColorType': raw[25],
              'alphaBoundsPx': list(bbox) if bbox else None, 'marginsPx': margins,
              'minimumMarginPx': min(margins) if margins else None}
    result['passed'] = bool(actual_size == list(size) and mode == 'RGBA' and raw[24] == 8 and
                            raw[25] == 6 and margins and min(margins) >= 8)
    return result, pixels


def gpu_probe(shader, uniforms, points, matrix, size):
    global _GPU
    if _GPU is None:
        import moderngl
        context = moderngl.create_standalone_context(backend='egl')
        _GPU = moderngl, context, context.simple_framebuffer((1, 1))
    moderngl, context, fb = _GPU
    fb.use()
    source = shader.replace('void main()', 'out vec4 qa_clip;\nout vec3 qa_rotated_normal;\nvoid main()', 1)
    end = source.rfind('}')
    source = source[:end]+'\nqa_clip=gl_Position;\nqa_rotated_normal=normal;\n'+source[end:]
    program = context.program(vertex_shader=source, varyings=['qa_clip', 'qa_rotated_normal'])
    program['canvas'].value = tuple(map(float, uniforms['canvas']))
    program['origin'].value = tuple(map(float, uniforms['origin']))
    program['depth_range'].value = tuple(map(float, uniforms['depth_range']))
    program['model_transform'].write(np.asarray(uniforms['model_transform'], dtype='f4').T.tobytes())
    points = np.asarray(points, dtype='f4')
    normals = np.eye(3, dtype='f4')[np.arange(len(points)) % 3]
    vbo = context.buffer(np.c_[points, normals].astype('f4').tobytes())
    vao = context.vertex_array(program, [(vbo, '3f 3f', 'in_pos', 'in_normal')])
    target = context.buffer(reserve=len(points)*28)
    context.enable(moderngl.RASTERIZER_DISCARD)
    vao.transform(target, mode=moderngl.POINTS, vertices=len(points))
    context.disable(moderngl.RASTERIZER_DISCARD)
    captured = np.frombuffer(target.read(), dtype='f4').reshape(-1, 7).astype(float)
    clip = captured[:, :4]
    normal_error = np.abs(captured[:, 4:] - normals @ np.asarray(uniforms['model_transform'])[:3, :3].T)
    screen = np.c_[(clip[:, 0]/clip[:, 3]+1)*size[0]/2, (1-clip[:, 1]/clip[:, 3])*size[1]/2]
    error = np.abs(screen-project(points, matrix))
    result = {'method': 'actual vertex shader / GPU transform feedback', 'sampleCount': len(points),
              'maxPixelError': float(error.max()), 'maxRotatedNormalError': float(normal_error.max()),
              'clipWMinMax': [float(clip[:, 3].min()), float(clip[:, 3].max())],
              'passed': bool(np.isfinite(error).all() and error.max() < 1e-4 and
                             normal_error.max() < 1e-6 and (clip[:, 3] == 1).all())}
    target.release(); vao.release(); vbo.release(); program.release()
    return result


def camera_audit(meta, model, expected, size, probe=True, prior=None):
    transform, matrix, source_anchor, anchor, origin = expected
    tri, _, _, _ = arrays(model)
    vertices = tri.reshape(-1, 3)
    uniforms = meta.get('uniforms', {})
    actual_transform = np.asarray(meta.get('objectTransform', []), float)
    result = {'metadataPresent': bool(meta), 'exactProjectionVerified': False}
    result['matrixMatchesContract'] = bool(np.shape(meta.get('sourceToPixel')) == (2, 4) and
        np.max(np.abs(np.asarray(meta['sourceToPixel'])-matrix)) < 1e-9)
    result['realPhysicalRotationVerified'] = bool(actual_transform.shape == (4, 4) and
        np.max(np.abs(actual_transform-transform)) < 1e-9)
    result['rotationDeterminant'] = float(np.linalg.det(actual_transform[:3, :3])) if actual_transform.shape == (4, 4) else None
    result['metadataMatchesSourceMesh'] = meta.get('sourceMeshSHA256', meta.get('meshSHA256')) == sha(tri.tobytes())
    result['anchorVerified'] = bool(np.shape(meta.get('anchorSourceM')) == (3,) and
        np.max(np.abs(np.asarray(meta['anchorSourceM'])-source_anchor)) < 1e-9 and
        np.shape(meta.get('anchorPx')) == (2,) and np.max(np.abs(np.asarray(meta['anchorPx'])-anchor)) < 1e-9 and
        np.max(np.abs(project([source_anchor], matrix)[0]-anchor)) < 1e-9)
    result['canvasMatchesContract'] = list(meta.get('rasterSizePx', meta.get('canvasPx', []))) == list(size)
    result['uniformsMatchContract'] = bool(np.shape(uniforms.get('model_transform')) == (4, 4) and
        np.max(np.abs(np.asarray(uniforms['model_transform'])-transform)) < 1e-9 and
        list(uniforms.get('canvas', [])) == list(size) and np.shape(uniforms.get('origin')) == (2,) and
        np.max(np.abs(np.asarray(uniforms['origin'])-origin)) < 1e-9)
    depth_range = np.asarray(uniforms.get('depth_range', []), float)
    world = np.c_[vertices, np.ones(len(vertices))] @ transform.T
    depth = world[:, :3].sum(1)
    result['allGeometryInsideDepthRange'] = bool(depth_range.shape == (2,) and np.isfinite(depth_range).all() and
        depth_range[1] > depth_range[0] and depth.min() > depth_range[0] and depth.max() < depth_range[1])
    shader = meta.get('vertexShaderSource', '')
    fragment = meta.get('fragmentShaderSource', '')
    module = importlib.import_module('render_l3')
    shader_strings = [value for value in vars(module).values() if isinstance(value, str)]
    result['shaderSourceMatchesRenderer'] = bool(shader in shader_strings and fragment in shader_strings and
        meta.get('shaderHash') == sha((shader+fragment).encode()))
    lights = meta.get('fixedLightingWorld', [])
    result['lightingWorld'] = lights
    delta = np.array([[48., -48., 0.], [24., 24., -48.]]) @ np.asarray(lights[0]) if lights else np.zeros(2)
    result['keyLightFromUpperLeft'] = bool((delta < 0).all())
    edge_rows = []
    edges = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]])
    source_delta = edges[:, 1]-edges[:, 0]
    for axis in range(3):
        selected = (np.abs(source_delta[:, axis]) > 1e-5) & (np.abs(source_delta[:, [x for x in range(3) if x != axis]]).max(1) < 1e-7)
        xy = project(edges[selected], matrix).reshape(-1, 2, 2)
        d = xy[:, 1]-xy[:, 0]
        expected_vector = matrix[:, axis]
        target = None if axis == 2 else expected_vector[1]/expected_vector[0]
        err = float(np.abs(d[:, 0]).max()) if axis == 2 and len(d) else (
            float(np.abs(d[:, 1]/d[:, 0]-target).max()) if len(d) else None)
        edge_rows.append({'axis': axis, 'count': int(selected.sum()), 'targetSlope': target,
                          'maxError': err, 'passed': bool(err is not None and err < 1e-7)})
    result['edgeTests'] = edge_rows
    if probe:
        lo, hi = vertices.min(0), vertices.max(0)
        samples = np.array(list(itertools.product(*zip(lo, hi))))
        indexes = np.linspace(0, len(vertices)-1, min(256, len(vertices))).astype(int)
        samples = np.vstack([samples, source_anchor, vertices[indexes]])
        try:
            result['gpuProbe'] = gpu_probe(shader, uniforms, samples, matrix, size)
        except Exception as exc:
            result['gpuProbe'] = {'passed': False, 'error': f'{type(exc).__name__}: {exc}'}
    else:
        result['gpuProbe'] = {'method': 'shared verified shader and identical metric transform',
                              'passed': bool(prior and prior.get('exactProjectionVerified'))}
    result['projectedVertexBoundsPx'] = [project(vertices, matrix).min(0).tolist(), project(vertices, matrix).max(0).tolist()]
    result['exactProjectionVerified'] = bool(all(result[k] for k in ['matrixMatchesContract', 'realPhysicalRotationVerified',
        'metadataMatchesSourceMesh', 'anchorVerified', 'canvasMatchesContract', 'uniformsMatchContract',
        'shaderSourceMatchesRenderer', 'allGeometryInsideDepthRange']) and result['gpuProbe']['passed'] and all(x['passed'] for x in edge_rows))
    return result


def reference_stack(reference):
    """Load the approved source in a separate interpreter to avoid import aliasing."""
    with tempfile.TemporaryDirectory(prefix='l3-reference-') as temporary:
        folder = Path(temporary)
        source = '''import sys,json,numpy as np
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from modules56 import build_stack
from common import cleanup
m=cleanup(build_stack(10))
out=Path(sys.argv[2])
np.savez(out/'stack.npz',tri=np.asarray(m.tri),norm=np.asarray(m.norm),mat=np.asarray([tuple(x[0])+tuple(x[1:]) for x in m.mat]))
(out/'ranges.json').write_text(json.dumps(m.componentTriangleRanges))
'''
        subprocess.run([sys.executable, '-c', source, str(reference), str(folder)], check=True, capture_output=True)
        with np.load(folder/'stack.npz', allow_pickle=False) as data:
            tri, normal, material = (data[name].copy() for name in ['tri', 'norm', 'mat'])
        ranges = read_json(folder/'ranges.json')
    return tri, normal, material, ranges


def verify_same_windows(model, reference):
    rtri, rnorm, rmat, rranges = reference_stack(reference)
    tri, normal, material, _ = arrays(model)
    shift = np.asarray(model.referenceStackTranslationM)
    results = {}
    for kind in ['windows', 'wrap']:
        ids = mask_for_ranges(model.componentTriangleRanges[kind], len(tri))
        rid = mask_for_ranges(rranges[kind], len(rtri))
        geometry = tri[ids]-shift
        same_shape = geometry.shape == rtri[rid].shape
        maximum = float(np.max(np.abs(geometry-rtri[rid]))) if same_shape else None
        results[kind] = {'triangleCount': int(ids.sum()), 'referenceTriangleCount': int(rid.sum()),
                         'coordinateErrorM': maximum, 'normalArraysExactlyEqual': bool(np.array_equal(normal[ids], rnorm[rid])),
                         'materialArraysExactlyEqual': bool(np.array_equal(material[ids], rmat[rid])),
                         'passed': bool(same_shape and maximum < 1e-9 and np.array_equal(normal[ids], rnorm[rid]) and
                                        np.array_equal(material[ids], rmat[rid]))}
    groups = model.windowGroups
    bounds = []
    for group in groups:
        v = tri[mask_for_ranges(group['triangleRanges'], len(tri))].reshape(-1, 3)
        bounds.append([v.min(0).tolist(), v.max(0).tolist()])
    sizes = np.asarray([np.asarray(b[1])-b[0] for b in bounds])
    centers = np.asarray([(np.asarray(b[1])+b[0])/2 for b in bounds])
    shape_ok = bool(len(groups) == 10 and np.max(np.abs(sizes-[1.10, .08, 1.44])) < 1e-9 and
                    np.max(np.abs(np.diff(centers[:, 1])-.082)) < 1e-9 and
                    np.max(np.abs(np.asarray(bounds)[:, 0, 2]-.228)) < 1e-9)
    return {'referenceSource': str(reference), 'translationMeters': shift.tolist(), 'components': results,
            'windowCount': len(groups), 'windowGeometryMatchesMetricSpec': shape_ok,
            'windowBoundsM': bounds, 'passed': shape_ok and all(x['passed'] for x in results.values())}


def alpha_registration(image, camera):
    bbox = image.get('alphaBoundsPx')
    exact = camera.get('projectedVertexBoundsPx')
    if not bbox or not exact:
        return {'passed': False}
    delta = np.asarray(bbox)-np.r_[exact[0], exact[1]]
    return {'alphaBoundsMinusMeshBoundsPx': delta.tolist(), 'passed': bool(np.abs(delta).max() <= 2)}


def validate_pallet(output, reference):
    from pallet import build_pallet
    model = build_pallet()
    mesh, _, _, _, _ = model_audit(model, [2., 1., 1.75])
    mesh['exportedMatchesSource'] = exported_model_matches(output/'models/windowPallet.standard.npz', model)
    same = verify_same_windows(model, reference)
    records = read_json(output/'reports/windowPallet.standard.json')['views']
    files = []
    for view in [0, 90]:
        path = f'sprites-2x/{view}/windowPallet.standard.png'
        row = next(item for item in records if item['file'] == path)
        image, _ = image_audit(output/path, [160, 172])
        camera = camera_audit(row['camera'], model, expected_pallet(view), [160, 172])
        registration = alpha_registration(image, camera)
        bound = row['imageSHA256'] == image['fileSHA256'] and row['image']['pixelSHA256'] == image['pixelSHA256']
        files.append({'file': path, 'image': image, 'camera': camera, 'sourceMetadataVerified': bound,
                      'registration': registration, 'exactProjectionVerified': camera['exactProjectionVerified'],
                      'passed': bool(image['passed'] and camera['exactProjectionVerified'] and camera['keyLightFromUpperLeft'] and
                                     registration['passed'] and bound)})
    return {'files': files, 'mesh': mesh, 'sameWindowsAsL2': same,
            'passed': bool(mesh['passed'] and mesh['exportedMatchesSource'] and same['passed'] and all(x['passed'] for x in files))}


def moving_mask(tri, dynamic, matrix, size):
    image = Image.new('L', tuple(size), 0)
    draw = ImageDraw.Draw(image)
    for triangle in project(tri[dynamic], matrix).reshape(-1, 3, 2):
        draw.polygon([tuple(p) for p in triangle], fill=255)
    return np.asarray(image) > 0


def point_surface_distance(point, triangles):
    p = np.asarray(point, float)
    a = triangles[:, 0]; u = triangles[:, 1]-a; v = triangles[:, 2]-a; w = p-a
    aa = np.einsum('ij,ij->i', u, u); bb = np.einsum('ij,ij->i', u, v); cc = np.einsum('ij,ij->i', v, v)
    wu = np.einsum('ij,ij->i', w, u); wv = np.einsum('ij,ij->i', w, v); den = aa*cc-bb*bb
    valid = den > 1e-20; s = np.zeros(len(a)); t = np.zeros(len(a))
    s[valid] = (cc[valid]*wu[valid]-bb[valid]*wv[valid])/den[valid]
    t[valid] = (aa[valid]*wv[valid]-bb[valid]*wu[valid])/den[valid]
    inside = valid & (s >= -1e-9) & (t >= -1e-9) & (s+t <= 1+1e-9)
    distances = np.linalg.norm(p-(a+s[:, None]*u+t[:, None]*v), axis=1)
    distances[~inside] = np.inf
    for i, j in [(0, 1), (1, 2), (2, 0)]:
        start = triangles[:, i]; edge = triangles[:, j]-start
        length = np.einsum('ij,ij->i', edge, edge)
        fraction = np.einsum('ij,ij->i', p-start, edge)/np.maximum(length, 1e-30)
        distances = np.minimum(distances, np.linalg.norm(p-(start+np.clip(fraction, 0, 1)[:, None]*edge), axis=1))
    return float(distances.min())


def forklift_geometry_audit(model, loaded):
    tri, normals, material, _ = arrays(model)
    forks = tri[mask_for_ranges(model.componentTriangleRanges['forks'], len(tri))]
    root = np.asarray(model.forkRootM); tip = np.asarray(model.forkTipM)
    delta = tip-root
    contact = [point_surface_distance(p, forks) for p in [root, tip]]
    front_ok = bool(delta[0] > .1 and np.abs(delta[1:]).max() < 1e-9 and max(contact) < 2e-6)
    result = {'forkRootM': root.tolist(), 'forkTipM': tip.tolist(), 'endpointSurfaceDistanceM': contact,
              'actualForksPointAlongPositiveSourceX': front_ok}
    if loaded:
        from pallet import build_pallet
        load = build_pallet()
        ltri, lnorm, lmat, _ = arrays(load)
        transform = np.asarray(model.loadTransform, float)
        ids = mask_for_ranges(model.componentTriangleRanges['load'], len(tri))
        transformed = (np.c_[ltri.reshape(-1, 3), np.ones(ltri.size//3)] @ transform.T)[:, :3].reshape(ltri.shape)
        transformed_normals = lnorm @ transform[:3, :3].T
        same_shape = tri[ids].shape == transformed.shape
        error = float(np.abs(tri[ids]-transformed).max()) if same_shape else None
        equal = bool(same_shape and error < 1e-9 and np.allclose(normals[ids], transformed_normals, atol=1e-9, rtol=0) and
                     np.array_equal(material[ids], lmat))
        rigid = bool(transform.shape == (4, 4) and np.abs(transform[:3, :3].T@transform[:3, :3]-np.eye(3)).max() < 1e-9 and
                     abs(np.linalg.det(transform[:3, :3])-1) < 1e-9)
        result['sameCompletePalletLoad'] = {'transform': transform.tolist(), 'coordinateErrorM': error,
                                           'sameGeometryNormalsMaterials': equal, 'rigidTransform': rigid,
                                           'raisedAboveFloor': bool(tri[ids, :, 2].min() > 0),
                                           'passed': equal and rigid and bool(tri[ids, :, 2].min() > 0)}
    result['passed'] = front_ok and result.get('sameCompletePalletLoad', {'passed': True})['passed']
    return result


def differences(frames):
    images = []
    for frame in frames:
        alpha = frame[..., 3:4].astype(float)/255
        images.append(np.concatenate([frame[..., :3].astype(float)*alpha, alpha*255], axis=2))
    steps = [float(np.abs(images[(i+1) % 6]-images[i]).mean()) for i in range(6)]
    ratio = steps[-1]/max(max(steps[:-1]), 1e-12)
    return {'adjacentMeanPremultipliedDifference': steps, 'seamToLargestOtherStepRatio': ratio,
            'seamOutlier': bool(ratio > 1.75 and steps[-1] > .05),
            'uniqueDecodedFrames': len({sha(x.tobytes()) for x in frames}),
            'lastFrameEqualsFirst': bool(np.array_equal(frames[-1], frames[0])), 'visualReviewRequired': True}


def validate_vehicle(output, loaded):
    from common import cleanup
    from forklift import build_forklift
    kind = 'driveLoaded' if loaded else 'drive'
    name = f'vehicle.forklift.{kind}'
    meta = read_json(output/'reports'/f'{name}.json')
    size, anchor = meta['canvasPx'], meta['anchorPx']
    assert len(size) == 2 and len(anchor) == 2
    models = [cleanup(build_forklift(phase=i/6, loaded=loaded)) for i in range(6)]
    audits = [model_audit(m) for m in models]
    geometry = forklift_geometry_audit(models[0], loaded)
    closure = model_audit(cleanup(build_forklift(phase=1., loaded=loaded)))[0]
    source_rows = [item[0] for item in audits]
    static_ok = len({row['staticDataSHA256'] for row in source_rows} | {closure['staticDataSHA256']}) == 1
    loop_ok = closure['modelDataSHA256'] == source_rows[0]['modelDataSHA256']
    for i, row in enumerate(source_rows):
        row['exportedMatchesSource'] = exported_model_matches(output/f'models/{kind}/{i:02}.npz', models[i])
    files, row_reports, row_images = [], {}, {}
    lights, pivots = set(), set()
    for direction in ROWS:
        rendered = {row['frameIndex']: row for row in meta['rows'][direction]}
        assert set(rendered) == set(range(6))
        expected = expected_vehicle(direction, anchor)
        swept = np.zeros(size[::-1], bool)
        images = []
        depth_ranges = []
        baseline = None
        for i, (model, audit) in enumerate(zip(models, audits)):
            source, tri, _, _, dynamic = audit
            swept |= moving_mask(tri, dynamic, expected[1], size)
            relative = f'frames/{kind}/{direction}/{i:02}.png'
            image, pixels = image_audit(output/relative, size)
            record = rendered[i]
            depth_ranges.append(record['camera']['uniforms']['depth_range'])
            camera = camera_audit(record['camera'], model, expected, size, probe=i == 0, prior=baseline)
            if i == 0:
                baseline = camera
            bound = record['imageSHA256'] == image['fileSHA256'] and record['image']['pixelSHA256'] == image['pixelSHA256']
            phase_ok = abs(record['phase']-i/6) < 1e-12
            registration = alpha_registration(image, camera)
            lights.add(json.dumps(camera['lightingWorld']))
            pivots.add(json.dumps(record['camera'].get('anchorSourceM')))
            row = {'file': relative, 'direction': direction, 'phase': i/6, 'image': image,
                   'camera': camera, 'registration': registration,
                   'sourceMetadataVerified': bool(bound and phase_ok), 'exactProjectionVerified': camera['exactProjectionVerified']}
            row['passed'] = bool(source['passed'] and source['exportedMatchesSource'] and image['passed'] and
                                 camera['exactProjectionVerified'] and camera['keyLightFromUpperLeft'] and registration['passed'] and bound and phase_ok)
            files.append(row); images.append(pixels)
        row_images[direction] = images
        swept = np.asarray(Image.fromarray(swept.astype('uint8')*255).filter(ImageFilter.MaxFilter(7))) > 0
        stable_visible = (~swept) & (images[0][..., 3] > 0)
        changed = [int((np.any(im != images[0], axis=2) & ~swept).sum()) for im in images]
        motion = differences(images)
        fixed_depth = all(value == depth_ranges[0] for value in depth_ranges)
        row_reports[direction] = {'expectedWorldForward': HEADINGS[direction],
                                 'expectedScreenForwardPerMeter': (np.array([[48, -48, 0], [24, 24, -48]]) @ HEADINGS[direction]).tolist(),
                                 'testedVisibleStaticPixels': int(stable_visible.sum()),
                                 'staticChangedPixelsByFrame': changed, 'motion': motion,
                                 'depthRangeAcrossFrames': depth_ranges, 'fixedDepthRangeAllPhases': fixed_depth,
                                 'passed': bool(stable_visible.any() and max(changed) == 0 and
                                                fixed_depth and motion['uniqueDecodedFrames'] > 1 and not motion['seamOutlier'])}
    expected_sheet = np.concatenate([np.concatenate(row_images[d], axis=1) for d in ROWS], axis=0)
    sheet_path = f'sheets/{name}.sheet.png'
    sheet, sheet_pixels = image_audit(output/sheet_path, [size[0]*6, size[1]*4])
    expected_json = {'cellWidth': size[0], 'cellHeight': size[1], 'anchorX': anchor[0], 'anchorY': anchor[1],
                     'frames': 6, 'fps': 8, 'rows': ROWS, 'loop': True}
    contract = read_json(output/f'sheets/{name}.sheet.json')
    json_ok = all(contract.get(k) == v for k, v in expected_json.items())
    sheet_ok = bool(sheet['passed'] and np.array_equal(sheet_pixels, expected_sheet) and json_ok)
    result = {'name': name, 'canvasPx': size, 'anchorPx': anchor,
              'defaultCellAndAnchorUsed': size == [272, 256] and anchor == [136, 192],
              'files': files, 'models': source_rows, 'rows': row_reports, 'forkAndLoadGeometry': geometry,
              'loopEndpointExactlyEqual': loop_ok, 'staticGeometryExactlyEqual': static_ok,
              'fixedLightingAllFramesAndDirections': len(lights) == 1,
              'sameSourcePivotAllFramesAndDirections': len(pivots) == 1,
              'sheet': {'file': sheet_path, 'image': sheet, 'exactProjectionVerified': all(row['exactProjectionVerified'] for row in files),
                        'exactFrameConcatenation': bool(np.array_equal(sheet_pixels, expected_sheet)),
                        'jsonMatchesContract': json_ok, 'passed': sheet_ok}}
    result['passed'] = bool(loop_ok and static_ok and geometry['passed'] and len(lights) == 1 and len(pivots) == 1 and sheet_ok and
                            all(row['passed'] for row in files) and all(row['passed'] for row in row_reports.values()))
    return result


def validate_gifs(output):
    expected = [(f'L3-wozek-{kind}-{direction}.gif', [720, 800]) for kind in ['pusty', 'z-paleta'] for direction in ROWS]
    expected += [(f'L3-wozek-{kind}-4-kierunki.gif', [1360, 1460]) for kind in ['pusty', 'z-paleta']]
    results = []
    for name, size in expected:
        path = output/'previews'/name
        try:
            durations, pixels = [], set()
            with Image.open(path) as im:
                actual_size = list(im.size); loop = im.info.get('loop')
                for i in range(im.n_frames):
                    im.seek(i); im.load()
                    durations.append(im.info.get('duration', 0))
                    pixels.add(sha(im.convert('RGBA').tobytes()))
            row = {'file': f'previews/{name}', 'sizePx': actual_size, 'frames': len(durations),
                   'durationMs': sum(durations), 'durationsMs': durations, 'uniqueFrames': len(pixels), 'fileSHA256': sha(path.read_bytes()),
                   'passed': bool(actual_size == size and len(durations) == 6 and sum(durations) == 750 and len(pixels) > 1 and loop == 0)}
        except Exception as exc:
            row = {'file': f'previews/{name}', 'passed': False, 'error': f'{type(exc).__name__}: {exc}'}
        results.append(row)
    return results


def validate_inventory_and_preview_sources(output):
    expected = {f'frames/{kind}/{direction}/{i:02}.png' for kind in ['drive', 'driveLoaded'] for direction in ROWS for i in range(6)}
    expected |= {f'sprites-2x/{view}/windowPallet.standard.png' for view in [0, 90]}
    expected |= {f'sheets/vehicle.forklift.{kind}.sheet{extension}' for kind in ['drive', 'driveLoaded'] for extension in ['.png', '.json']}
    actual = {str(path.relative_to(output)) for folder in ['frames', 'sprites-2x', 'sheets']
              for path in (output/folder).rglob('*') if path.is_file()}
    inventory = {'missing': sorted(expected-actual), 'unexpected': sorted(actual-expected), 'passed': actual == expected}
    path = output/'previews/l3-previews.json'
    if not path.exists():
        path = output/'l3-previews.json'
    try:
        manifest = read_json(path)
        sources = manifest['sources']
        expected_sources = {x for x in expected if x.startswith(('frames/', 'sprites-2x/'))}
        observed = {row['path'] for row in sources}
        mismatches = [row['path'] for row in sources if sha((output/row['path']).read_bytes()) != row['sha256']]
        preview_sources = {'sourceCount': len(sources), 'missing': sorted(expected_sources-observed),
                           'unexpected': sorted(observed-expected_sources), 'hashMismatches': mismatches,
                           'passed': len(sources) == 50 and observed == expected_sources and not mismatches}
    except Exception as exc:
        preview_sources = {'passed': False, 'error': f'{type(exc).__name__}: {exc}'}
    return inventory, preview_sources


def shared_pivot_geometry():
    from common import cleanup
    from forklift import build_forklift
    models = [cleanup(build_forklift(phase=0., loaded=loaded)) for loaded in [False, True]]
    vertices = np.concatenate([np.asarray(model.tri).reshape(-1, 3) for model in models])
    lo, hi = vertices.min(0), vertices.max(0)
    center = (lo[:2]+hi[:2])/2
    anchors = [getattr(model, 'anchorSourceM', None) for model in models]
    return {'combinedBoundsMeters': [lo.tolist(), hi.tolist()], 'combinedFootprintCenterXY': center.tolist(),
            'sourceAnchors': anchors,
            'passed': bool(np.abs(center).max() < 1e-9 and all(anchor == [0., 0., 0.] for anchor in anchors))}


def write_summary(report, path):
    files = report.get('pallet', {}).get('files', []) + [row for v in report['vehicles'] for row in v.get('files', [])]
    lines = ['# Niezależne QA: L3', '', f'`exactProjectionVerified: {str(report["exactProjectionVerified"]).lower()}` · '
             f'`technicalChecksPassed: {str(report["technicalChecksPassed"]).lower()}`', '',
             'Kontrola korzysta z rzeczywistych siatek, zapisanych rastrów i wykonania vertex shadera na GPU. '
             'Nie tworzy ani nie poprawia obrazów.', '',
             'Paleta 90° stosuje fizyczny obrót ujemny `(x,y,z) → (y,2−x,z)` zgodnie z briefem z 11.10. '
             'To inna konwencja niż dodatni obrót modułów L1/L2. Kierunki wózka: sw=+Y, se=+X, nw=−X, ne=−Y. '
             'Kotwica wózka jest wspólnym punktem podłogi, a nie środkiem sylwetki PNG.', '',
             '| Plik | Minimalny margines | Dokładny rzut |', '|---|---|---|']
    for row in files:
        lines.append(f'| `{row["file"]}` | {row["image"].get("minimumMarginPx")} px | {row["exactProjectionVerified"]} |')
    lines += ['', 'Fazy animacji: 0/6…5/6. Model fazy 1 porównywany jest z fazą 0; ostatnia zapisana klatka '
              'nie musi być kopią pierwszej. Różnice przejść rastra stanowią kontrolę skoków, a nie zastępują oceny GIF-ów.', '',
              'Nieruchome piksele kontrolowane są poza sumą projekcji geometrii ruchomej, z zapasem 3 px na antyaliasing. '
              'Okna i folia porównywane są z odzyskanym źródłem zatwierdzonej nakładki stack10 po samej translacji.', '',
              'Pełne pomiary i skróty plików: `independent-validation.json`.', '']
    models = [model for vehicle in report['vehicles'] for model in vehicle.get('models', [])]
    if models:
        maximum = max(abs(model['groundClearanceM']) for model in models)
        lines[-1:-1] = ['Kontakt opon: obracana siatka wielokątowa przybliża okrągłą powierzchnię. '
                       f'Największa zmierzona szczelina wynosi {maximum:.9f} m ({maximum*48:.6f} px). '
                       'Jawna tolerancja tego testu to 0,001 m = 0,048 px. Nie zmienia ona ścisłych testów kotwicy, '
                       'macierzy rzutu, skali ani marginesów. Paleta zachowuje test kontaktu z tolerancją 0,000002 m.', '']
    path.write_text('\n'.join(lines), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT/'l3-output')
    parser.add_argument('--reference-l2', type=Path, default=ROOT/'recovered/line1010-l2-src')
    parser.add_argument('--brief', type=Path, default=ROOT/'l3s1-1110-reference/zamowienie-gpt-l3-s1-1110.md')
    args = parser.parse_args()
    brief = args.brief.read_text(encoding='utf-8')
    assert '(x, y, z) -> (y, w - x, z)' in brief, 'Unexpected L3 rotation contract'
    report = {'scope': 'L3 preview only', 'deliveryStatus': 'preview_pending_user_approval',
              'briefSHA256': sha(args.brief.read_bytes()), 'vehicles': []}
    try:
        report['pallet'] = validate_pallet(args.output, args.reference_l2)
    except Exception as exc:
        report['pallet'] = {'passed': False, 'error': f'{type(exc).__name__}: {exc}'}
    for loaded in [False, True]:
        try:
            item = validate_vehicle(args.output, loaded)
        except Exception as exc:
            item = {'name': f'vehicle.forklift.{"driveLoaded" if loaded else "drive"}', 'passed': False,
                    'error': f'{type(exc).__name__}: {exc}'}
        report['vehicles'].append(item)
    report['gifs'] = validate_gifs(args.output)
    report['inventory'], report['previewSources'] = validate_inventory_and_preview_sources(args.output)
    try:
        report['physicalSharedPivot'] = shared_pivot_geometry()
    except Exception as exc:
        report['physicalSharedPivot'] = {'passed': False, 'error': f'{type(exc).__name__}: {exc}'}
    files = report['pallet'].get('files', []) + [row for v in report['vehicles'] for row in v.get('files', [])]
    report['exactProjectionVerified'] = bool(len(files) == 50 and all(row['exactProjectionVerified'] for row in files))
    pivots = [(v.get('canvasPx'), v.get('anchorPx')) for v in report['vehicles']]
    report['sharedVehicleCellAndAnchor'] = bool(len(pivots) == 2 and pivots[0][0] and pivots[0] == pivots[1])
    report['technicalChecksPassed'] = bool(report['exactProjectionVerified'] and report['sharedVehicleCellAndAnchor'] and
        report['pallet']['passed'] and all(x['passed'] for x in report['vehicles'] + report['gifs']) and
        report['inventory']['passed'] and report['previewSources']['passed'] and report['physicalSharedPivot']['passed'])
    report['visualApproval'] = 'pending, preview only'
    path = args.output/'independent-validation.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    (args.output/'validation.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    write_summary(report, args.output/'camera-QA.md')
    print(json.dumps({'report': str(path), 'exactProjectionVerified': report['exactProjectionVerified'],
                      'technicalChecksPassed': report['technicalChecksPassed'],
                      'palletPassed': report['pallet']['passed'], 'vehiclePassed': [v['passed'] for v in report['vehicles']]}))
    return 0 if report['technicalChecksPassed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
