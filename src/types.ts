// Common dataset schema shared with scripts/normalize.py.
// Keep both sides in sync: any field added here must be added there.
export type DatasetSource = 'kaggle' | 'huggingface';

export interface Dataset {
  id: string; // stable id, e.g. "kaggle:owner/slug" or "hf:org/name"
  name: string;
  source: DatasetSource;
  description: string;
  downloads: number; // raw downloads (or download-equivalent)
  likes: number; // likes (HF) / votes+likes equivalent (Kaggle)
  votes: number; // votes/upvotes equivalent (Kaggle votes, HF likes duplicated if needed)
  updated_at: string; // ISO 8601
  license: string;
  tags: string[];
  url: string;
  // Normalized ranking scores in [0, 1]; computed by scripts/ranking.py
  // (frontend re-computes for resilience via src/lib/ranking.ts).
  popularity_score: number;
  freshness_score: number;
  engagement_score: number;
  total_score: number;
}

export interface DatasetFile {
  generated_at: string;
  count: number;
  datasets: Dataset[];
}
