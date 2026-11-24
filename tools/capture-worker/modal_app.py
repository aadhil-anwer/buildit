"""Run the spike on a rented GPU (Modal). One-off setup on your machine:

    pip install modal && modal setup          # opens the browser to log in
    modal run modal_app.py --room rooms/bedroom

Uploads rooms/<name>/photos/*, runs reconstruct.py on an L4 GPU, writes rooms/<name>/result.json.
Weights are cached in a Modal volume so only the first run downloads them (~4 GB).
"""
from pathlib import Path

import modal

HERE = Path(__file__).parent
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install("torch", "torchvision", "numpy", "transformers", "pillow")
    .run_commands("git clone https://github.com/facebookresearch/map-anything.git /opt/map-anything", "pip install -e /opt/map-anything")
    .env({"HF_HOME": "/cache/hf"})
    .add_local_file(HERE / "layout.py", "/root/layout.py")
    .add_local_file(HERE / "reconstruct.py", "/root/reconstruct.py")
)
app = modal.App("buildit-capture-spike", image=image)
cache = modal.Volume.from_name("buildit-capture-cache", create_if_missing=True)


@app.function(gpu="L4", timeout=900, volumes={"/cache": cache})
def run_room(photos: list[tuple[str, bytes]], with_detection: bool = True) -> dict:
    import tempfile

    from reconstruct import run

    with tempfile.TemporaryDirectory() as d:
        paths = []
        for name, data in photos:
            p = Path(d) / name
            p.write_bytes(data)
            paths.append(str(p))
        result = run(sorted(paths), with_detection)
    cache.commit()
    return result


@app.local_entrypoint()
def main(room: str, detect: bool = True):
    import json

    folder = Path(room) / "photos"
    photos = [(p.name, p.read_bytes()) for p in sorted(folder.iterdir()) if p.suffix.lower() in (".jpg", ".jpeg", ".png")]
    result = run_room.remote(photos, detect)
    (Path(room) / "result.json").write_text(json.dumps(result, indent=1))
    print(room, result["timing"], f"{len(result['walls'])} walls, {len(result['objects'])} objects")
