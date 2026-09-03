import type { Dataset } from '../types';
import { SourceLogo, sourceLabel } from './SourceLogo';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function fmtDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toISOString().slice(0, 10);
}

function sourceBadge(source: Dataset['source']): string {
  return source === 'kaggle'
    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
}

export function DatasetCard({ d, rank }: { d: Dataset; rank?: number }) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-center gap-2 text-xs">
        {rank !== undefined && (
          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono font-bold text-white dark:bg-slate-100 dark:text-slate-900">
            #{rank}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 font-medium ${sourceBadge(d.source)}`}
        >
          <SourceLogo source={d.source} size={18} />
          {sourceLabel(d.source)}
        </span>
        <span className="ml-auto font-mono text-slate-500 dark:text-slate-400">
          ★ {d.total_score.toFixed(2)}
        </span>
      </div>
      <h3 className="mb-1 line-clamp-2 font-semibold leading-snug">
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {d.name}
        </a>
      </h3>
      <p className="mb-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
        {d.description || 'No description.'}
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {d.tags.slice(0, 5).map((t) => (
          <span
            key={t}
            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {t}
          </span>
        ))}
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-1 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <dt>Downloads</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100">
            {fmt(d.downloads)}
          </dd>
        </div>
        <div>
          <dt>Likes/Votes</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100">
            {fmt(d.likes + d.votes)}
          </dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd className="font-semibold text-slate-800 dark:text-slate-100">
            {fmtDate(d.updated_at)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 truncate text-xs text-slate-400">{d.license || 'unknown license'}</p>
    </article>
  );
}
