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

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

/** Returns up to `limit` sample images for an HF dataset id (e.g. "cifar10"). */
export async function fetchPreview(
  hfId: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<PreviewImage[]> {
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
