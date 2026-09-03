"""Unit tests for ranking.py — run with: python3 -m unittest discover -s scripts/tests -v."""

from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from normalize import Dataset  # noqa: E402
from ranking import (  # noqa: E402
    engagement_score,
    freshness_score,
    popularity_score,
    rank,
    score_all,
    score_dataset,
    total_score,
)


def make_ds(**kw) -> Dataset:
    base = dict(
        id="t:1",
        name="test",
        source="huggingface",
        updated_at="2026-09-01T00:00:00Z",
        url="https://example.com",
    )
    base.update(kw)
    return Dataset(**base)  # type: ignore[arg-type]


class TestScores(unittest.TestCase):
    def test_popularity_monotonic_and_bounded(self) -> None:
        self.assertEqual(popularity_score(0), 0.0)
        self.assertLess(popularity_score(100), popularity_score(10_000))
        self.assertLessEqual(popularity_score(10**12), 1.0)

    def test_engagement_combines_likes_and_votes(self) -> None:
        self.assertEqual(engagement_score(0, 0), 0.0)
        self.assertAlmostEqual(engagement_score(100, 0), engagement_score(0, 100))
        self.assertLess(engagement_score(10, 10), engagement_score(1000, 1000))

    def test_freshness_decays_with_age(self) -> None:
        now = datetime(2026, 9, 3, tzinfo=timezone.utc)
        fresh = freshness_score("2026-09-02T00:00:00Z", now)
        old = freshness_score("2020-01-01T00:00:00Z", now)
        self.assertGreater(fresh, old)
        self.assertGreaterEqual(old, 0.0)
        # half-life: 180 days ago ~= 0.5
        half = freshness_score("2026-03-07T00:00:00Z", now)
        self.assertAlmostEqual(half, 0.5, places=1)

    def test_freshness_invalid_date(self) -> None:
        self.assertEqual(freshness_score("not-a-date"), 0.0)

    def test_total_is_weighted_sum(self) -> None:
        self.assertAlmostEqual(total_score(1.0, 1.0, 1.0), 1.0)
        self.assertAlmostEqual(total_score(0.0, 0.0, 0.0), 0.0)

    def test_score_dataset_fills_all_fields(self) -> None:
        d = score_dataset(make_ds(downloads=1000, likes=50, votes=10))
        for f in ("popularity_score", "freshness_score", "engagement_score", "total_score"):
            v = getattr(d, f)
            self.assertGreaterEqual(v, 0.0)
            self.assertLessEqual(v, 1.0)

    def test_rank_orders_by_total_desc(self) -> None:
        now = datetime(2026, 9, 3, tzinfo=timezone.utc)
        ds = score_all(
            [
                make_ds(id="a", downloads=10, updated_at="2020-01-01T00:00:00Z"),
                make_ds(id="b", downloads=1_000_000, updated_at="2026-09-01T00:00:00Z"),
            ],
            now,
        )
        self.assertEqual(rank(ds)[0].id, "b")

    def test_rank_recent(self) -> None:
        ds = [
            make_ds(id="old", updated_at="2020-01-01T00:00:00Z"),
            make_ds(id="new", updated_at="2026-09-01T00:00:00Z"),
        ]
        self.assertEqual(rank(ds, key="recent")[0].id, "new")


if __name__ == "__main__":
    unittest.main()
