"""Unit tests for normalize.py — run with: python3 -m unittest discover -s scripts/tests -v."""

from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from normalize import normalize_huggingface, normalize_kaggle  # noqa: E402


class TestNormalize(unittest.TestCase):
    def test_hf(self) -> None:
        d = normalize_huggingface(
            {
                "id": "squad",
                "likes": 1200,
                "downloads": 2500000,
                "lastModified": "2026-08-20T00:00:00Z",
                "tags": ["NLP", " qa "],
                "cardData": {"license": "CC-BY-SA-3.0"},
            }
        )
        self.assertEqual(d.id, "hf:squad")
        self.assertEqual(d.source, "huggingface")
        self.assertEqual(d.downloads, 2500000)
        self.assertIn("nlp", d.tags)
        self.assertEqual(d.license, "cc-by-sa-3.0")
        self.assertTrue(d.url.endswith("/squad"))

    def test_kaggle(self) -> None:
        d = normalize_kaggle(
            {
                "ref": "mlg-ulb/creditcardfraud",
                "title": "Credit Card Fraud",
                "voteCount": 4100,
                "downloadCount": 680000,
                "lastUpdated": "2026-07-22T00:00:00Z",
                "licenseName": "other",
                "tags": [{"name": "Finance"}],
            }
        )
        self.assertEqual(d.id, "kaggle:mlg-ulb/creditcardfraud")
        self.assertEqual(d.source, "kaggle")
        self.assertEqual(d.votes, 4100)
        self.assertIn("finance", d.tags)

    def test_bad_input_does_not_crash(self) -> None:
        d = normalize_huggingface({})
        self.assertEqual(d.downloads, 0)
        d2 = normalize_kaggle({})
        self.assertEqual(d2.votes, 0)

    def test_tag_namespaces(self) -> None:
        d = normalize_huggingface(
            {
                "id": "x",
                "tags": [
                    "modality:image",
                    "task_categories:object-detection",
                    "language:ja",
                    "library:pandas",
                    "region:us",
                    "format:parquet",
                    "size_categories:10k<n<100k",
                    "license:mit",
                    "arxiv:2401.00001",
                    "source_datasets:original",
                    "Vision",
                ],
            }
        )
        self.assertIn("image", d.tags)
        self.assertIn("object-detection", d.tags)
        self.assertIn("lang-ja", d.tags)
        self.assertIn("vision", d.tags)
        for noisy in ("library:pandas", "region:us", "format:parquet", "license:mit"):
            self.assertNotIn(noisy, d.tags)
        self.assertFalse(any("arxiv" in t or "<" in t for t in d.tags))

    def test_tag_noise_dropped(self) -> None:
        d = normalize_huggingface(
            {
                "id": "x",
                "tags": [
                    "has spaces",
                    "https://example.com/x",
                    "mail@example.com",
                    "x" * 31,
                    "nlp",
                    "NLP",
                ],
            }
        )
        self.assertEqual(d.tags, ["nlp"])


if __name__ == "__main__":
    unittest.main()
