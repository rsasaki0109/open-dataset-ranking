"""Build public/data/datasets.json from all sources.

Strategy (never break the existing JSON):
1. Load existing public/data/datasets.json (if any) as fallback.
2. Fetch HF (public, no secret) + Kaggle (needs secrets; may be empty).
3. If a source fetch fails/returns empty, keep that source's old entries.
4. Merge, de-dupe by id, score via ranking.py, sort by total_score desc.
5. Atomic write (tmp file + os.replace).

Usage:
    python3 scripts/build.py [--out public/data/datasets.json]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_huggingface import fetch_huggingface  # noqa: E402
from fetch_kaggle import fetch_kaggle  # noqa: E402
from normalize import Dataset  # noqa: E402
from ranking import score_all  # noqa: E402

# Exact-match denylist for known non-dataset artifacts
# (e.g. internal mirrors). Extend as needed.
BLOCKLIST: set[str] = {
    "hf:huggingface/documentation-images",
}

def load_existing(path: str) -> list[dict]:
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("datasets"), list):
            return [d for d in data["datasets"] if isinstance(d, dict)]
        if isinstance(data, list):
            return [d for d in data if isinstance(d, dict)]
    except FileNotFoundError:
        print(f"[build] no existing file at {path}; starting fresh", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[build] WARNING: could not read {path}: {e}", file=sys.stderr)
    return []


def dict_to_dataset(d: dict) -> Dataset:    return Dataset(
        id=str(d.get("id", "")),
        name=str(d.get("name", "")),
        source=str(d.get("source", "unknown")),
        description=str(d.get("description", "")),
        downloads=int(d.get("downloads", 0) or 0),
        likes=int(d.get("likes", 0) or 0),
        votes=int(d.get("votes", 0) or 0),
        updated_at=str(d.get("updated_at", "1970-01-01T00:00:00Z")),
        license=str(d.get("license", "unknown")),
        tags=[t for t in d.get("tags", []) if isinstance(t, str)],
        url=str(d.get("url", "")),
    )


def merge(old: list[dict], hf: list[Dataset], kaggle: list[Dataset]) -> list[Dataset]:
    merged: dict[str, Dataset] = {}
    # Keep old entries first so a failed source fetch preserves them.
    for d in old:
        try:
            ds = dict_to_dataset(d)
            if ds.id:
                merged[ds.id] = ds
        except Exception:  # noqa: BLE001
            continue
    # Fresh data overwrites same-id entries.
    for ds in list(hf) + list(kaggle):
        if ds.id and ds.id not in BLOCKLIST:
            merged[ds.id] = ds
    # Drop blocklisted ids that came from old fallback data.
    for bid in BLOCKLIST:
        merged.pop(bid, None)
    # If HF fetch failed entirely, old HF entries survive via `old`.
    # Same for Kaggle (which is empty without secrets).
    return list(merged.values())


def atomic_write_json(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path) or ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, path)
    finally:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except OSError:
            pass


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/data/datasets.json")
    ap.add_argument("--hf-pages", type=int, default=int(os.environ.get("HF_MAX_PAGES", "5")))
    ap.add_argument("--kaggle-pages", type=int, default=int(os.environ.get("KAGGLE_PAGES", "3")))
    args = ap.parse_args()

    old = load_existing(args.out)

    try:
        hf = fetch_huggingface(max_pages=args.hf_pages)
    except Exception as e:  # noqa: BLE001
        print(f"[build] HF fetch failed, keeping old HF entries: {e}", file=sys.stderr)
        hf = []
    try:
        kaggle = fetch_kaggle(pages=args.kaggle_pages)
    except Exception as e:  # noqa: BLE001
        print(f"[build] Kaggle fetch failed, keeping old Kaggle entries: {e}", file=sys.stderr)
        kaggle = []

    if not hf and not kaggle and not old:
        print("[build] ERROR: no data from any source and no fallback.", file=sys.stderr)
        return 1
    if not hf and not kaggle:
        print("[build] WARNING: all fetches failed; keeping existing JSON untouched.", file=sys.stderr)
        return 0

    merged = merge(old, hf, kaggle)
    scored = score_all(merged)
    scored.sort(key=lambda d: d.total_score, reverse=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "count": len(scored),
        "datasets": [d.to_dict() for d in scored],
    }
    atomic_write_json(args.out, payload)
    print(f"[build] wrote {len(scored)} datasets -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
