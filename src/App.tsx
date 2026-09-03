import { useMemo, useState } from 'react';
import { DatasetCard } from './components/DatasetCard';
import { DatasetTable } from './components/DatasetTable';
import { FilterBar, type SourceFilter, type ViewMode } from './components/FilterBar';
import { Section } from './components/Section';
import { sortDatasets, type SortKey } from './lib/ranking';
import { useDatasets } from './lib/useDatasets';
import { useTheme } from './lib/useTheme';

const PAGE_SIZE = 12;

function matchesQuery(
  hay: string,
  q: string,
): boolean {
  return hay.toLowerCase().includes(q.toLowerCase());
}

export default function App() {
  const { datasets, generatedAt, loading, error } = useDatasets();
  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('trending');
  const [view, setView] = useState<ViewMode>('card');
  const [page, setPage] = useState(0);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const d of datasets) for (const t of d.tags) s.add(t);
    return [...s].sort().slice(0, 100);
  }, [datasets]);

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = datasets.filter((d) => {
      if (source !== 'all' && d.source !== source) return false;
      if (tag && !d.tags.includes(tag)) return false;
      if (q) {
        const hay = `${d.name} ${d.description} ${d.tags.join(' ')}`;
        if (!matchesQuery(hay, q)) return false;
      }
      return true;
    });
    return sortDatasets(list, sort);
  }, [datasets, query, source, tag, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const trending = useMemo(() => sortDatasets(datasets, 'trending').slice(0, 6), [datasets]);
  const popular = useMemo(() => sortDatasets(datasets, 'popular').slice(0, 6), [datasets]);
  const recent = useMemo(() => sortDatasets(datasets, 'recent').slice(0, 6), [datasets]);
  const kaggle = useMemo(
    () =>
      sortDatasets(
        datasets.filter((d) => d.source === 'kaggle'),
        'trending',
      ).slice(0, 6),
    [datasets],
  );
  const hf = useMemo(
    () =>
      sortDatasets(
        datasets.filter((d) => d.source === 'huggingface'),
        'trending',
      ).slice(0, 6),
    [datasets],
  );

  const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="text-xl">📊</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Open Dataset Ranking</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kaggle × Hugging Face · metadata only · daily update
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading && <p className="py-10 text-center text-sm">Loading datasets…</p>}
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Failed to load dataset data: {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {datasets.length} datasets
              {generatedAt ? ` · updated ${generatedAt.slice(0, 10)}` : ''}
            </p>

            <Section title="🔥 Trending" subtitle="Top total score (popularity + freshness + engagement)">
              <div className={grid}>
                {trending.map((d, i) => (
                  <DatasetCard key={d.id} d={d} rank={i + 1} />
                ))}
              </div>
            </Section>

            <Section title="🏆 Most Popular" subtitle="Top by download-based popularity score">
              <div className={grid}>
                {popular.map((d, i) => (
                  <DatasetCard key={d.id} d={d} rank={i + 1} />
                ))}
              </div>
            </Section>

            <Section title="🆕 Recently Updated" subtitle="Top by freshness score">
              <div className={grid}>
                {recent.map((d, i) => (
                  <DatasetCard key={d.id} d={d} rank={i + 1} />
                ))}
              </div>
            </Section>

            <Section title="📦 Kaggle" subtitle="Top Kaggle datasets">
              <div className={grid}>
                {kaggle.map((d, i) => (
                  <DatasetCard key={d.id} d={d} rank={i + 1} />
                ))}
              </div>
            </Section>

            <Section title="🤗 Hugging Face" subtitle="Top Hugging Face datasets">
              <div className={grid}>
                {hf.map((d, i) => (
                  <DatasetCard key={d.id} d={d} rank={i + 1} />
                ))}
              </div>
            </Section>

            <Section
              title="🔍 Explore all datasets"
              subtitle="Search, filter by source/tag, sort, and paginate"
            >
              <FilterBar
                query={query}
                onQuery={(v) => {
                  setQuery(v);
                  setPage(0);
                }}
                source={source}
                onSource={(v) => {
                  setSource(v);
                  setPage(0);
                }}
                tag={tag}
                onTag={(v) => {
                  setTag(v);
                  setPage(0);
                }}
                allTags={allTags}
                sort={sort}
                onSort={setSort}
                view={view}
                onView={setView}
              />

              <p className="mb-3 text-sm text-slate-500">
                {filtered.length} result{filtered.length === 1 ? '' : 's'} · page{' '}
                {safePage + 1} / {totalPages}
              </p>

              {view === 'card' ? (
                <div className={grid}>
                  {pageRows.map((d, i) => (
                    <DatasetCard key={d.id} d={d} rank={safePage * PAGE_SIZE + i + 1} />
                  ))}
                </div>
              ) : (
                <DatasetTable rows={pageRows} />
              )}

              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-500">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(safePage + 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
                >
                  Next →
                </button>
              </div>
            </Section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <p>
          Metadata only — datasets belong to their owners on Kaggle / Hugging Face.
        </p>
        <p className="mt-1">
          <a
            className="underline"
            href="https://github.com/rsasaki0109/open-dataset-ranking"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub: open-dataset-ranking
          </a>
        </p>
      </footer>
    </div>
  );
}
