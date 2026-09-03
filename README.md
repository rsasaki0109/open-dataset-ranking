# Open Dataset Ranking

Cross-source ranking of public datasets from **Kaggle** and **Hugging Face**.
Static site (React + Vite) served via **GitHub Pages**. Only **metadata** is stored — never dataset contents.
The UI defaults to Japanese and can be switched to English from the header.

## Screenshots

> TODO: add screenshots after first deploy.
>
> - `docs/screenshot-top.png` — Trending / Most Popular sections
> - `docs/screenshot-explore.png` — Explore view (table mode, dark)

## Supported data sources

| Source | How we fetch | Auth |
|---|---|---|
| Hugging Face | Public REST API `GET https://huggingface.co/api/datasets` (stdlib `urllib`, no SDK) | Optional `HF_TOKEN` secret (higher rate limit). Works without it. |
| Kaggle | `GET https://www.kaggle.com/api/v1/datasets/list` | Requires `KAGGLE_USERNAME` + `KAGGLE_KEY` secrets. Without them, Kaggle fetch is skipped and existing Kaggle entries are preserved. |

## Ranking spec

Raw metrics differ per source, so we store raw values **plus** normalized scores in `[0, 1]`.
Formulas live in `scripts/ranking.py` (Python, build-time) and `src/lib/ranking.ts`
(TypeScript, client-side re-score fallback). Keep both in sync.

```text
popularity  = log10(1 + downloads) / 7
engagement  = log10(1 + likes + votes) / 7
freshness   = 0.5 ^ (age_days / 180)      # half-life 180 days
total       = 0.5 * popularity + 0.2 * freshness + 0.3 * engagement
```

- Change weights/constants in one place: top of `scripts/ranking.py` / `src/lib/ranking.ts`.
- Sorting keys: `trending` (total), `popular` (popularity), `recent` (updated_at), `engagement`.
- Sections: Trending / Most Popular / Recently Updated / Kaggle / Hugging Face + full Explore list.

## Tag cleanup

HF exposes many operational tags such as `library:`, `format:`, `region:` and
`size_categories:`. The normalizer removes those from the public filter list,
keeps useful `modality:` and `task_categories:` values, and converts language
tags such as `language:ja` to `lang-ja`. The UI shows the 100 most frequent tags
with at least two datasets, so the tag selector stays useful at scale.

### Common schema (`public/data/datasets.json`)

```jsonc
{
  "generated_at": "2026-09-03T00:00:00Z",
  "count": 14,
  "datasets": [
    {
      "id": "hf:squad",
      "name": "squad",
      "source": "huggingface", // or "kaggle"
      "description": "...",
      "downloads": 2500000,
      "likes": 1200,
      "votes": 0,
      "updated_at": "2026-08-20T00:00:00Z",
      "license": "cc-by-sa-3.0",
      "tags": ["nlp"],
      "url": "https://huggingface.co/datasets/squad",
      "popularity_score": 0.91,
      "freshness_score": 0.95,
      "engagement_score": 0.44,
      "total_score": 0.78
    }
  ]
}
```

## Local development

Prereqs: Node 20+, Python 3.12+ (stdlib only, no pip needed for scripts).

```bash
npm install
npm run dev        # http://localhost:5173 (uses public/data/datasets.json dummy data)

npm run build      # typecheck + production build -> dist/
npm run preview    # preview the production build

npm run lint       # ESLint
npm run format     # Prettier
```

### Data pipeline (Python)

```bash
# Run unit tests (stdlib unittest, no deps)
python3 -m unittest discover -s scripts/tests -v

# Rebuild datasets.json (HF works without secrets; Kaggle is skipped without secrets)
python3 scripts/build.py --out public/data/datasets.json

# Fetch sources individually (stdout = JSON array)
python3 scripts/fetch_huggingface.py | head -c 500
KAGGLE_USERNAME=... KAGGLE_KEY=... python3 scripts/fetch_kaggle.py | head -c 500
```

Safety properties of `scripts/build.py`:

- Loads existing `datasets.json` first; a failed source keeps old entries for that source.
- If **all** fetches fail, the existing JSON is left untouched (exit 0, no write).
- Writes atomically (temp file + `os.replace`).
- Sleeps between API calls; retries with backoff.

## Deploy to GitHub Pages

1. Create repo `open-dataset-ranking` on GitHub and push this directory to `main`.
2. `Settings → Pages → Build and deployment → Source: GitHub Actions`.
3. (Optional, for Kaggle + higher HF limits) add Actions secrets:
   - `HF_TOKEN`, `KAGGLE_USERNAME`, `KAGGLE_KEY`.
4. Push to `main` (or run **Deploy to GitHub Pages** via workflow dispatch).
5. Site URL: `https://rsasaki0109.github.io/open-dataset-ranking/`
   - Custom domain: set `BASE_PATH=/` when building, e.g. `BASE_PATH=/ npm run build`.

## Data refresh

- **Automatic:** `.github/workflows/update-data.yml` runs daily (`0 0 * * *` UTC),
  rebuilds `public/data/datasets.json`, and commits it if changed (which triggers `deploy.yml`).
- **Manual:** Actions → `Update data` → `Run workflow`, or run `python3 scripts/build.py` locally and commit.

## Contributing

- Keep `scripts/ranking.py` ↔ `src/lib/ranking.ts` formulas in sync; add/extend unit tests in `scripts/tests/`.
- Frontend: `src/components/` (cards/table/filters), `src/lib/` (ranking, data hook, theme).
- Run `npm run lint && npm run format && npm run typecheck` and
  `python3 -m unittest discover -s scripts/tests` before opening a PR.

## License

MIT — see [LICENSE](LICENSE).
