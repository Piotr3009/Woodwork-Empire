"""L3: standalone pallet containing the exact approved L2 stack of windows.

Only one rigid translation is applied to the L2 window, glazing, film and
cardboard meshes. The wooden pallet also reuses the approved M6 geometry.
This file builds metric triangle geometry; the renderer owns the camera.
"""
from __future__ import annotations

import hashlib
import json
import numpy as np

from common import Model
from modules56 import build_stack, _pallet


ENV=(2.0,1.0,1.75)
REFERENCE_STACK_TRANSLATION_M=(-4.225,-1.90,0.0)
WINDOW_SIZE_M=(1.10,.08,1.44)
WINDOW_PITCH_Y_M=.082
WOODEN_PALLET_SIZE_M=(1.45,1.0,.228)
PALLET_CENTER_M=(1.0,.5,0.0)


def _ranges_shift(ranges,offset):
    return [[int(a+offset),int(b+offset)] for a,b in ranges]


def _indices(ranges):
    return np.asarray([i for a,b in ranges for i in range(a,b)],dtype=int)


def _canonical_hash(values):
    """Nanometre-quantised hash ignores floating-point translation roundoff."""
    q=np.rint(np.asarray(values,dtype=np.float64)*1e9).astype('<i8')
    return hashlib.sha256(q.tobytes()).hexdigest()


def build_pallet():
    """Return a Model in the centred 2×1×1.75 m L3 envelope.

    Actual wooden footprint is X .275..1.725 and Y 0..1. Fork pockets run
    along X at Y approximately .30 and .70, with free vertical space .04..15.
    Window bottoms remain at Z .228, exactly as on the M6 pallet.
    """
    model=Model()
    _pallet(model)
    wooden_count=len(model.tri)

    reference=build_stack(10)
    model.tri.extend([t.copy() for t in reference.tri])
    model.norm.extend([n.copy() for n in reference.norm])
    model.mat.extend(reference.mat)
    model.boxes.extend([b.copy() for b in reference.boxes])

    shift=np.asarray(REFERENCE_STACK_TRANSLATION_M,dtype=float)
    model.tri=[t+shift for t in model.tri]
    model.boxes=[b+shift for b in model.boxes]
    model.componentTriangleRanges={
        'pallet':[[0,wooden_count]],
        **{name:_ranges_shift(ranges,wooden_count)
           for name,ranges in reference.componentTriangleRanges.items()},
    }
    model.windowGroups=[]
    for group in reference.windowGroups:
        copied=dict(group)
        copied['triangleRanges']=_ranges_shift(group['triangleRanges'],wooden_count)
        copied['sourceCenterMetersL2']=list(group['centerMeters'])
        copied['centerMeters']=(np.asarray(group['centerMeters'])+shift).tolist()
        model.windowGroups.append(copied)

    model.referenceStackTranslationM=list(REFERENCE_STACK_TRANSLATION_M)
    model.envelopeMeters=list(ENV)
    model.animation={
        'kind':'standalone_window_pallet','windowCount':10,
        'windowMeters':list(WINDOW_SIZE_M),'windowPitchY':WINDOW_PITCH_Y_M,
        'palletTopZ':.228,'containsPalletGeometry':True,
        'containsMachineGeometry':False,'clearFilm':True,
        'cardboardCornerGuards':True,'referenceAsset':'windowLine6.standard.stack10',
        'referenceStackTranslationM':list(REFERENCE_STACK_TRANSLATION_M),
        'referenceChange':'translation_only',
    }
    model.palletMetadata={
        'logicalEnvelopeMeters':list(ENV),'actualWoodenSizeMeters':list(WOODEN_PALLET_SIZE_M),
        'woodenBoundsMeters':[[.275,0.,0.],[1.725,1.,.228]],
        'stackBoundsMeters':[[.45,.07,.228],[1.55,.888,1.668]],
        'floorCenterMeters':list(PALLET_CENTER_M),
        'forkEntryAxis':'X','forkPocketCentersY':[.30,.70],
        'forkPocketClearZ':[.04,.15],
    }
    return model


def verify_reference_identity(model=None):
    """Compare exported component ranges against the actual recovered L2 mesh."""
    model=build_pallet() if model is None else model
    reference=build_stack(10)
    shift=np.asarray(model.referenceStackTranslationM,dtype=float)
    report={
        'referenceAsset':'windowLine6.standard.stack10',
        'translationMeters':shift.tolist(),'windowCount':len(model.windowGroups),
        'normalComparison':'bitwise','materialComparison':'exact_tuple_equality',
        'geometryToleranceMeters':1e-9,'components':{},
    }
    for name in ['windows','wrap']:
        ids=_indices(model.componentTriangleRanges[name])
        rids=_indices(reference.componentTriangleRanges[name])
        actual=np.asarray(model.tri)[ids]-shift
        expected=np.asarray(reference.tri)[rids]
        normals_equal=np.array_equal(np.asarray(model.norm)[ids],np.asarray(reference.norm)[rids])
        materials_equal=[model.mat[i] for i in ids]==[reference.mat[i] for i in rids]
        geometry_equal=actual.shape==expected.shape and np.allclose(actual,expected,rtol=0,atol=1e-9)
        source_hash=_canonical_hash(expected)
        translated_hash=_canonical_hash(actual)
        report['components'][name]={
            'triangleCount':len(ids),'referenceTriangleCount':len(rids),
            'geometryEqualAfterTranslation':bool(geometry_equal),
            'normalArraysExactlyEqual':bool(normals_equal),
            'materialsExactlyEqual':bool(materials_equal),
            'maxAbsCoordinateDifferenceMeters':float(np.max(np.abs(actual-expected))),
            'sourceCanonicalSHA256':source_hash,
            'translatedCanonicalSHA256':translated_hash,
            'canonicalHashesMatch':source_hash==translated_hash,
        }
    vertices=np.asarray(model.tri).reshape(-1,3)
    report['actualBoundsMeters']=[vertices.min(0).tolist(),vertices.max(0).tolist()]
    report['withinEnvelope']=bool(np.all(vertices.min(0)>=-1e-9) and
                                  np.all(vertices.max(0)<=np.asarray(ENV)+1e-9))
    report['passed']=report['withinEnvelope'] and report['windowCount']==10 and all(
        item['geometryEqualAfterTranslation'] and item['normalArraysExactlyEqual'] and
        item['materialsExactlyEqual'] and item['canonicalHashesMatch']
        for item in report['components'].values())
    return report


if __name__=='__main__':
    report=verify_reference_identity()
    print(json.dumps(report,indent=2))
    raise SystemExit(0 if report['passed'] else 1)
