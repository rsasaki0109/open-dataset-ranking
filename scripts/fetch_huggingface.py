"""Fetch public dataset metadata from Hugging Face Hub (no secret required).

Uses the public REST API: GET https://huggingface.co/api/datasets
Optional env: HF_TOKEN (increases rate limits), HF_LIMIT, HF_MAX_PAGES.

Stdlib only (urllib) so no extra pip install is needed.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normalize import Dataset, normalize_huggingface  # noqa: E402

API_URL = "https://huggingface.co/api/datasets"
DEFAULT_LIMIT = 100
DEFAULT_MAX_PAGES = 2  # 200 datasets max by default; raise via HF_MAX_PAGES
RETRY = 3
SLEEP_BETWEEN_CALLS = 1.0


def _get_json(url: str, token: str | None) -> list[dict] | None:
    headers = {"User-Agent": "open-dataset-ranking/0.1", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err: Exception | None = None
    for attempt in range(RETRY):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - network resilience
            last_err = e
            time.sleep(2**attempt)
    print(f"[hf] failed after {RETRY} retries: {url}: {last_err}", file=sys.stderr)
    return None


def fetch_huggingface(
    limit: int = DEFAULT_LIMIT,
    max_pages: int = DEFAULT_MAX_PAGES,
    token: str | None = None,
) -> list[Dataset]:
    token = token or os.environ.get("HF_TOKEN")
    out: list[Dataset] = []
    cursor: str | None = None
    for _ in range(max_pages):
        params = {"sort": "likes", "direction": "-1", "limit": str(limit)}
        if cursor:
            params["cursor"] = cursor
        url = f"{API_URL}?{urllib.parse.urlencode(params)}"
        # NOTE: the HF list endpoint returns the next cursor via `Link` header;
        # urllib makes that awkward, so we paginate by `cursor` when provided
        # and otherwise stop after the requested pages using `skip` fallback.
        print(f"[hf] GET {url}", file=sys.stderr)
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "open-dataset-ranking/0.1",
                "Accept": "application/json",
                **({"Authorization": f"Bearer {token}"} if token else {}),
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode("utf-8"))
                link = res.headers.get("Link", "")
        except Exception as e:  # noqa: BLE001
            print(f"[hf] request failed: {e}", file=sys.stderr)
            break
        if not isinstance(data, list):
            break
        for raw in data:
            if isinstance(raw, dict):
                try:
                    out.append(normalize_huggingface(raw))
                except Exception as e:  # noqa: BLE001
                    print(f"[hf] skip bad record: {e}", file=sys.stderr)
        # Parse cursor from Link header: <...&cursor=XYZ>; rel="next"
        nxt: str | None = None
        for part in link.split(","):
            if 'rel="next"' in part:
                start = part.find("cursor=")
                if start != -1:
                    nxt = urllib.parse.unquote(part[start + 7 :].split(">")[0].strip())
        cursor = nxt
        time.sleep(SLEEP_BETWEEN_CALLS)
        if not cursor:
            break
    print(f"[hf] fetched {len(out)} datasets", file=sys.stderr)
    return out


def main() -> int:
    limit = int(os.environ.get("HF_LIMIT", str(DEFAULT_LIMIT)))
    max_pages = int(os.environ.get("HF_MAX_PAGES", str(DEFAULT_MAX_PAGES)))
    datasets = fetch_huggingface(limit=limit, max_pages=max_pages)
    print(json.dumps([d.to_dict() for d in datasets], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
