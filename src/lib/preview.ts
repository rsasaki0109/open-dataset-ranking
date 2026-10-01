// Client-side preview of image/GIF samples via the public Hugging Face
// datasets-server. Fetched on demand in the browser; nothing is stored in
// this repo (metadata only), images are hotlinked from Hugging Face.
const API = 'https://datasets-server.huggingface.co';

export interface PreviewImage {
  src: string;
  width: number;
  height: number;
}

interface Feature {
  name: string;
  type: { _type?: string };
}

interface FirstRows {
  features?: Feature[];
  rows?: { row: Record<string, unknown> }[];
}

export class PreviewHttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new PreviewHttpError(res.status);
  return (await res.json()) as T;
}

function isImageCell(v: unknown): v is PreviewImage {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as PreviewImage).src === 'string' &&
    (v as PreviewImage).src.startsWith('http')
  );
}

const HF = 'https://huggingface.co';
const MAX_GIF_BYTES = 3 * 1024 * 1024; // skip huge animations

interface TreeEntry {
  type: string;
  path: string;
  size?: number;
}

/**
 * GIFs stored as plain files in the dataset repo. datasets-server re-encodes
 * images to static PNG/JPEG, so animation is only preserved by hotlinking the
 * original file (resolve/main/... is public and sends CORS `*`).
 */
async function fetchRepoGifs(
  hfId: string,
  limit: number,
  signal?: AbortSignal,
): Promise<PreviewImage[]> {
  const tree = await getJson<TreeEntry[]>(`${HF}/api/datasets/${hfId}/tree/main?recursive=true`, signal);
  return tree
    .filter((f) => f.type === 'file' && /\.gif$/i.test(f.path) && (f.size ?? 0) <= MAX_GIF_BYTES)
    .slice(0, limit)
    .map((f) => ({
      src: `${HF}/datasets/${hfId}/resolve/main/${f.path.split('/').map(encodeURIComponent).join('/')}`,
      width: 0,
      height: 0,
    }));
}

/** Returns up to `limit` sample images for an HF dataset id (e.g. "cifar10"). */
export async function fetchPreview(
  hfId: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<PreviewImage[]> {
  try {
    const gifs = await fetchRepoGifs(hfId, limit, signal);
    if (gifs.length > 0) return gifs;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    // no repo listing (gated / not found): fall back to datasets-server
  }
  const ds = encodeURIComponent(hfId);
  const splits = await getJson<{ splits?: { config: string; split: string }[] }>(
    `${API}/splits?dataset=${ds}`,
    signal,
  );
  const first = splits.splits?.[0];
  if (!first) return [];
  const data = await getJson<FirstRows>(
    `${API}/first-rows?dataset=${ds}&config=${encodeURIComponent(first.config)}&split=${encodeURIComponent(first.split)}`,
    signal,
  );
  const cols = (data.features ?? []).filter((f) => f.type?._type === 'Image').map((f) => f.name);
  const out: PreviewImage[] = [];
  for (const { row } of data.rows ?? []) {
    for (const c of cols) {
      const v = row[c];
      if (isImageCell(v)) out.push(v);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
