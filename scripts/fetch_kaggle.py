"""Fetch public dataset metadata from Kaggle.

Auth (optional but recommended):
  KAGGLE_USERNAME + KAGGLE_KEY (GitHub Actions Secrets recommended)
  Without credentials the Kaggle API rejects requests, so this script
  returns [] and lets build.py keep existing Kaggle entries untouched.

Stdlib only (urllib). Rate-limit friendly: small page count + sleep.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normalize import Dataset, normalize_kaggle  # noqa: E402

API_URL = "https://www.kaggle.com/api/v1/datasets/list"
DEFAULT_PAGES = 3
PER_PAGE = 100
SLEEP_BETWEEN_CALLS = 1.5


def _auth_header() -> dict[str, str] | None:
    user = os.environ.get("KAGGLE_USERNAME")
    key = os.environ.get("KAGGLE_KEY")
    if not user or not key:
        return None
    raw = f"{user}:{key}".encode()
    return {"Authorization": "Basic " + base64.b64encode(raw).decode()}


def fetch_kaggle(
    pages: int = DEFAULT_PAGES,
    sort_by: str = "hottest",
    username: str | None = None,
    key: str | None = None,
) -> list[Dataset]:
    if username:
        os.environ["KAGGLE_USERNAME"] = username
    if key:
        os.environ["KAGGLE_KEY"] = key
    auth = _auth_header()
    if auth is None:
        print(
            "[kaggle] KAGGLE_USERNAME/KAGGLE_KEY not set; skipping Kaggle "
            "(existing Kaggle entries will be preserved).",
            file=sys.stderr,
        )
        return []

    out: list[Dataset] = []
    for page in range(1, pages + 1):
        params = {
            "sortBy": sort_by,
            "page": str(page),
            "pageSize": str(PER_PAGE),
        }
        url = f"{API_URL}?{urllib.parse.urlencode(params)}"
        print(f"[kaggle] GET page {page}", file=sys.stderr)
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "open-dataset-ranking/0.1",
                "Accept": "application/json",
                **auth,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"[kaggle] request failed (page {page}): {e}", file=sys.stderr)
            break
        records = data if isinstance(data, list) else data.get("datasets", [])
        if not records:
            break
        for raw in records:
            if isinstance(raw, dict):
                try:
                    out.append(normalize_kaggle(raw))
                except Exception as e:  # noqa: BLE001
                    print(f"[kaggle] skip bad record: {e}", file=sys.stderr)
        time.sleep(SLEEP_BETWEEN_CALLS)
    print(f"[kaggle] fetched {len(out)} datasets", file=sys.stderr)
    return out


def main() -> int:
    pages = int(os.environ.get("KAGGLE_PAGES", str(DEFAULT_PAGES)))
    datasets = fetch_kaggle(pages=pages)
    print(json.dumps([d.to_dict() for d in datasets], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
