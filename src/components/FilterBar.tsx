import type { DatasetSource } from '../types';
import type { SortKey } from '../lib/ranking';
import type { Copy } from '../lib/i18n';

export type SourceFilter = 'all' | DatasetSource;
export type ViewMode = 'card' | 'table';

interface Props {
  query: string;
  onQuery: (v: string) => void;
  source: SourceFilter;
  onSource: (v: SourceFilter) => void;
  tag: string;
  onTag: (v: string) => void;
  allTags: string[];
  sort: SortKey;
  onSort: (v: SortKey) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  copy: Copy;
}

const SOURCES: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'kaggle', label: 'Kaggle' },
  { value: 'huggingface', label: 'Hugging Face' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'popular', label: 'Most popular' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'engagement', label: 'Most engaged' },
];

export function FilterBar(p: Props) {
  return (
    <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 md:grid-cols-[1fr_auto] md:items-end">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            {p.copy.keywordSearch}
          </span>
          <input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder={p.copy.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">{p.copy.source}</span>
          <select
            value={p.source}
            onChange={(e) => p.onSource(e.target.value as SourceFilter)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value === 'all' ? p.copy.allSources : s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            {p.copy.tagCategory}
          </span>
          <select
            value={p.tag}
            onChange={(e) => p.onTag(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            <option value="">{p.copy.allTags}</option>
            {p.allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">{p.copy.sort}</span>
          <select
            value={p.sort}
            onChange={(e) => p.onSort(e.target.value as SortKey)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value === 'trending' ? p.copy.trending : s.value === 'popular' ? p.copy.mostPopular : s.value === 'recent' ? p.copy.recently : p.copy.mostEngaged}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2" role="group" aria-label="View mode">
        <button
          onClick={() => p.onView('card')}
          aria-pressed={p.view === 'card'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            p.view === 'card'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'border border-slate-300 dark:border-slate-600'
          }`}
        >
          {p.copy.cards}
        </button>
        <button
          onClick={() => p.onView('table')}
          aria-pressed={p.view === 'table'}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            p.view === 'table'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'border border-slate-300 dark:border-slate-600'
          }`}
        >
          {p.copy.table}
        </button>
      </div>
    </div>
  );
}
