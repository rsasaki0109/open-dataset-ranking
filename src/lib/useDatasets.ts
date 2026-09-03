import { useEffect, useState } from 'react';
import type { Dataset, DatasetFile } from '../types';
import { scoreAll } from './ranking';

export function datasetJsonUrl(): string {
  // import.meta.env.BASE_URL respects vite `base`, so this works on
  // GitHub Pages project sites (/open-dataset-ranking/) and custom domains.
  const base: string = import.meta.env.BASE_URL ?? '/';
  const sep = base.endsWith('/') ? '' : '/';
  return `${base}${sep}data/datasets.json`;
}

interface State {
  datasets: Dataset[];
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
}

export function useDatasets(): State {
  const [state, setState] = useState<State>({
    datasets: [],
    generatedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(datasetJsonUrl(), { headers: { Accept: 'application/json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DatasetFile | Dataset[]>;
      })
      .then((json) => {
        if (cancelled) return;
        const raw: Dataset[] = Array.isArray(json) ? json : (json.datasets ?? []);
        // Re-score client-side so local edits / stale JSON still rank sensibly.
        setState({
          datasets: scoreAll(raw),
          generatedAt: Array.isArray(json) ? null : (json.generated_at ?? null),
          loading: false,
          error: null,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          datasets: [],
          generatedAt: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Failed to load datasets.json',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
