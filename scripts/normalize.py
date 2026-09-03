"""Common dataset schema + normalizers for Kaggle / Hugging Face raw records.

Keep in sync with src/types.ts.
Only metadata is stored — never dataset contents.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import re


@dataclass
class Dataset:
    id: str
    name: str
    source: str  # "kaggle" | "huggingface"
    description: str = ""
    downloads: int = 0
    likes: int = 0
    votes: int = 0
    updated_at: str = "1970-01-01T00:00:00Z"
    license: str = "unknown"
    tags: list[str] = field(default_factory=list)
    url: str = ""
    popularity_score: float = 0.0
    freshness_score: float = 0.0
    engagement_score: float = 0.0
    total_score: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)


def _to_int(value: object, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return max(0, int(value))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _clean_text(value: object, limit: int = 500) -> str:
    if not isinstance(value, str):
        return ""
    text = re.sub(r"\s+", " ", value).strip()
    return text[:limit]


def _clean_tags(values: object, limit: int = 10) -> list[str]:
    if not isinstance(values, (list, tuple)):
        return []
    out: list[str] = []
    for v in values:
        if isinstance(v, str):
            t = v.strip().lower()[:40]
            if t and t not in out:
                out.append(t)
        if len(out) >= limit:
            break
    return out


def _norm_iso(dt: object) -> str:
    if isinstance(dt, str) and dt:
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            pass
    return "1970-01-01T00:00:00Z"


def normalize_huggingface(raw: dict) -> Dataset:
    """Normalize one Hugging Face API dataset record (GET /api/datasets)."""
    ds_id: str = str(raw.get("id") or raw.get("_id") or "unknown")
    likes = _to_int(raw.get("likes", 0))
    downloads = _to_int(raw.get("downloads", 0))
    tags = _clean_tags(raw.get("tags"))
    card = raw.get("cardData") if isinstance(raw.get("cardData"), dict) else {}
    license_name = "unknown"
    if isinstance(card, dict):
        lic = card.get("license")
        if isinstance(lic, str) and lic.strip():
            license_name = lic.strip().lower()
    if license_name == "unknown" and isinstance(raw.get("license"), str):
        license_name = raw["license"].strip().lower() or "unknown"
    return Dataset(
        id=f"hf:{ds_id}",
        name=ds_id,
        source="huggingface",
        description=_clean_text(raw.get("description") or (card.get("description") if isinstance(card, dict) else "")),
        downloads=downloads,
        likes=likes,
        votes=0,
        updated_at=_norm_iso(raw.get("lastModified") or raw.get("updatedAt")),
        license=license_name,
        tags=tags,
        url=f"https://huggingface.co/datasets/{ds_id}",
    )


def normalize_kaggle(raw: dict) -> Dataset:
    """Normalize one Kaggle API dataset record (GET /api/v1/datasets/list)."""
    ref: str = str(raw.get("ref", "unknown/unknown"))
    title = str(raw.get("title") or ref)
    votes = _to_int(raw.get("voteCount", raw.get("votes", 0)))
    downloads = _to_int(raw.get("downloadCount", raw.get("downloads", 0)))
    tags: list[str] = []
    for key in ("tags", "categories"):
        val = raw.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("slug")
                    if isinstance(name, str):
                        tags.append(name)
                elif isinstance(item, str):
                    tags.append(item)
    subtitle = _clean_text(raw.get("subtitle") or raw.get("description"))
    return Dataset(
        id=f"kaggle:{ref}",
        name=title,
        source="kaggle",
        description=subtitle,
        downloads=downloads,
        likes=votes,  # Kaggle exposes votes; mirror into likes for cross-source display
        votes=votes,
        updated_at=_norm_iso(raw.get("lastUpdated") or raw.get("updatedAt")),
        license=_clean_text(raw.get("licenseName") or "other", 80) or "other",
        tags=_clean_tags(tags),
        url=str(raw.get("url") or f"https://www.kaggle.com/datasets/{ref}"),
    )
