"""Ranking scores. Keep in sync with src/lib/ranking.ts.

MVP formulas (intentionally simple, easy to change):
- popularity  = log10(1 + downloads) / LOG_NORM
- engagement  = log10(1 + likes + votes) / LOG_NORM
- freshness   = 0.5 ** (age_days / HALF_LIFE_DAYS)
- total       = W_POP * popularity + W_FRESH * freshness + W_ENG * engagement

All scores are clamped to [0, 1].
"""

from __future__ import annotations

from datetime import datetime, timezone
import math

from normalize import Dataset

LOG_NORM = 7.0  # log10(1 + 10_000_000) ~= 7
FRESHNESS_HALF_LIFE_DAYS = 180.0
W_POPULARITY = 0.5
W_FRESHNESS = 0.2
W_ENGAGEMENT = 0.3


def clamp01(x: float) -> float:
    return min(1.0, max(0.0, x))


def popularity_score(downloads: int) -> float:
    return clamp01(math.log10(1 + max(0, downloads)) / LOG_NORM)


def engagement_score(likes: int, votes: int) -> float:
    return clamp01(math.log10(1 + max(0, likes) + max(0, votes)) / LOG_NORM)


def freshness_score(updated_at: str, now: datetime | None = None) -> float:
    try:
        parsed = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    except ValueError:
        return 0.0
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    age_days = max(0.0, (now - parsed).total_seconds() / 86400.0)
    return clamp01(0.5 ** (age_days / FRESHNESS_HALF_LIFE_DAYS))


def total_score(pop: float, fresh: float, eng: float) -> float:
    return W_POPULARITY * pop + W_FRESHNESS * fresh + W_ENGAGEMENT * eng


def score_dataset(d: Dataset, now: datetime | None = None) -> Dataset:
    pop = popularity_score(d.downloads)
    eng = engagement_score(d.likes, d.votes)
    fresh = freshness_score(d.updated_at, now)
    d.popularity_score = pop
    d.freshness_score = fresh
    d.engagement_score = eng
    d.total_score = total_score(pop, fresh, eng)
    return d


def score_all(datasets: list[Dataset], now: datetime | None = None) -> list[Dataset]:
    return [score_dataset(d, now) for d in datasets]


def rank(datasets: list[Dataset], key: str = "total") -> list[Dataset]:
    """Return datasets sorted desc by key: total|popularity|freshness|engagement|recent."""
    key_map = {
        "total": lambda d: d.total_score,
        "popularity": lambda d: d.popularity_score,
        "freshness": lambda d: d.freshness_score,
        "engagement": lambda d: d.engagement_score,
        "recent": lambda d: d.updated_at,
    }
    fn = key_map.get(key, key_map["total"])
    reverse = True
    return sorted(datasets, key=fn, reverse=reverse)  # type: ignore[return-value]
