import type { Dataset } from '../types';

export function DatasetTable({ rows }: { rows: Dataset[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Downloads</th>
            <th className="px-3 py-2">Likes/Votes</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">License</th>
            <th className="px-3 py-2">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-900">
          {rows.map((d, i) => (
            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
              <td className="px-3 py-2 font-mono text-slate-500">{i + 1}</td>
              <td className="max-w-[280px] px-3 py-2">
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                >
                  {d.name}
                </a>
                <p className="line-clamp-1 text-xs text-slate-500">{d.description}</p>
              </td>
              <td className="px-3 py-2 text-xs">{d.source}</td>
              <td className="px-3 py-2 font-mono">{d.downloads.toLocaleString()}</td>
              <td className="px-3 py-2 font-mono">
                {(d.likes + d.votes).toLocaleString()}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {d.updated_at.slice(0, 10)}
              </td>
              <td className="max-w-[140px] truncate px-3 py-2 text-xs">{d.license}</td>
              <td className="px-3 py-2 font-mono">{d.total_score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
