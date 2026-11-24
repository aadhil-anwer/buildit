"""Photos of a room -> RoomPlan-shaped JSON. Needs a CUDA GPU; run through modal_app.py or on any GPU box.

    python reconstruct.py rooms/bedroom/photos rooms/bedroom/result.json [--no-detect]

Models (commercial use; re-check licences before shipping):
  - facebook/map-anything-apache  (Apache-2.0)  metric points + camera poses from plain photos
  - google/owlv2-base-patch16-ensemble  open-vocabulary detector, only NAMES things; sizes come from the points.
    Licence still to verify in the spike (README.md).
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np

from layout import fit_layout

os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

MODEL_ID = "facebook/map-anything-apache"
DETECTOR_ID = "google/owlv2-base-patch16-ensemble"
# Detector prompt -> RoomPlan category the TypeScript importer understands (packages/core/src/importers/roomplan.ts classify()).
LABELS = {
    "a door": "door", "a window": "window", "a sofa": "sofa", "an armchair": "chair", "a chair": "chair",
    "a bed": "bed", "a table": "table", "a desk": "table", "a wardrobe": "storage", "a bookshelf": "storage",
    "a chest of drawers": "storage", "a television": "television",
}
MAX_POINTS = 600_000


def reconstruct(paths: list[str]):
    import torch
    from mapanything.models import MapAnything
    from mapanything.utils.image import load_images

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = MapAnything.from_pretrained(MODEL_ID).to(device)
    views = load_images(paths)
    preds = model.infer(views, memory_efficient_inference=True, use_amp=True, amp_dtype="bf16",
                        apply_mask=True, mask_edges=True, apply_confidence_mask=True, confidence_percentile=10)
    return [{k: (v[0].float().cpu().numpy() if hasattr(v, "cpu") else v) for k, v in p.items()} for p in preds]


def world_up(preds) -> np.ndarray:
    """Phones are held upright: camera 'down' (+Y in OpenCV) averaged over the photos points at the floor."""
    downs = [p["camera_poses"][:3, 1] for p in preds]
    up = -np.mean(downs, axis=0)
    return up / np.linalg.norm(up)


def all_points(preds) -> np.ndarray:
    pts = np.concatenate([p["pts3d"][p["mask"][..., 0].astype(bool)] for p in preds])
    if len(pts) > MAX_POINTS:
        pts = pts[np.random.default_rng(0).choice(len(pts), MAX_POINTS, replace=False)]
    return pts


def detect(preds) -> list[dict]:
    """Name things in each photo, lift each box to its 3D points (foreground only), merge the same thing seen twice."""
    import torch
    from transformers import Owlv2ForObjectDetection, Owlv2Processor

    proc = Owlv2Processor.from_pretrained(DETECTOR_ID)
    det = Owlv2ForObjectDetection.from_pretrained(DETECTOR_ID).to("cuda" if torch.cuda.is_available() else "cpu").eval()
    prompts = list(LABELS)
    found: list[dict] = []
    for p in preds:
        img = (np.clip(p["img_no_norm"], 0, 1) * 255).astype(np.uint8)
        h, w = img.shape[:2]
        inputs = proc(text=[prompts], images=img, return_tensors="pt").to(det.device)
        with torch.no_grad():
            out = det(**inputs)
        size = max(h, w)  # OWLv2 pads to a square
        res = proc.post_process_object_detection(out, threshold=0.25, target_sizes=torch.tensor([[size, size]]))[0]
        valid = p["mask"][..., 0].astype(bool)
        for box, label in zip(res["boxes"].cpu().numpy(), res["labels"].cpu().numpy()):
            x0, y0, x1, y1 = np.clip(box, 0, [w, h, w, h]).astype(int)
            sel = valid[y0:y1, x0:x1]
            depth = p["depth_z"][y0:y1, x0:x1, 0][sel]
            if depth.size < 50:
                continue
            near = np.abs(depth - np.median(depth)) < 0.4  # drop the wall/floor behind the object
            found.append({"category": LABELS[prompts[label]], "points": p["pts3d"][y0:y1, x0:x1][sel][near]})
    return merge(found)


def merge(found: list[dict]) -> list[dict]:
    merged: list[dict] = []
    for f in found:
        c = np.median(f["points"], axis=0)
        twin = next((m for m in merged if m["category"] == f["category"] and np.linalg.norm(np.median(m["points"], axis=0) - c) < 0.6), None)
        if twin:
            twin["points"] = np.concatenate([twin["points"], f["points"]])
        else:
            merged.append(dict(f))
    return merged


def run(paths: list[str], with_detection: bool = True) -> dict:
    t0 = time.time()
    preds = reconstruct(paths)
    t1 = time.time()
    dets = detect(preds) if with_detection else []
    t2 = time.time()
    result = fit_layout(all_points(preds), world_up(preds), dets)
    result["timing"] = {"reconstruct_s": round(t1 - t0, 1), "detect_s": round(t2 - t1, 1), "layout_s": round(time.time() - t2, 1), "photos": len(paths)}
    return result


if __name__ == "__main__":
    folder, out = Path(sys.argv[1]), Path(sys.argv[2])
    photos = sorted(str(p) for p in folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".heic"))
    res = run(photos, with_detection="--no-detect" not in sys.argv)
    out.write_text(json.dumps(res, indent=1))
    print(json.dumps(res["timing"]), f"{len(res['walls'])} walls, {len(res['objects'])} objects")
