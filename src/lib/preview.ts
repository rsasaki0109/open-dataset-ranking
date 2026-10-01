// Client-side preview of image/GIF/video samples via the public Hugging Face
// datasets-server. Fetched on demand in the browser; nothing is stored in
// this repo (metadata only), images are hotlinked from Hugging Face.
const API = 'https://datasets-server.huggingface.co';

export interface PreviewImage {
  src: string;
  width: number;
  height: number;
  /** 'video' items are rendered with <video>; everything else (incl. GIF) with <img>. */
  kind?: 'image' | 'video';
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

function isMediaCell(v: unknown): v is PreviewImage {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as PreviewImage).src === 'string' &&
    (v as PreviewImage).src.startsWith('http')
  );
}

const HF = 'https://huggingface.co';
const MAX_GIF_BYTES = 3 * 1024 * 1024; // skip huge animations
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // only played on click (range-streamed)

interface TreeEntry {
  type: string;
  path: string;
  size?: number;
}

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;
const GIF_EXT = /\.gif$/i;

/**
 * Media stored as plain files in the dataset repo. datasets-server re-encodes
 * images to static PNG/JPEG and does not serve videos, so animation/video is
 * only preserved by hotlinking the original file (resolve/main/... is public
 * and sends CORS `*`). Animated/video files are listed before still images.
 */
async function fetchRepoMedia(
  hfId: string,
  limit: number,
  signal?: AbortSignal,
): Promise<PreviewImage[]> {
  const tree = await getJson<TreeEntry[]>(`${HF}/api/datasets/${hfId}/tree/main?recursive=true`, signal);
  const url = (path: string) =>
    `${HF}/datasets/${hfId}/resolve/main/${path.split('/').map(encodeURIComponent).join('/')}`;
  const files = tree.filter((f) => f.type === 'file');
  const pick = (re: RegExp, max: number, kind: 'image' | 'video'): PreviewImage[] =>
    files
      .filter((f) => re.test(f.path) && (f.size ?? 0) <= max)
      .map((f) => ({ src: url(f.path), width: 0, height: 0, kind }));
  return [
    ...pick(GIF_EXT, MAX_GIF_BYTES, 'image'),
    ...pick(VIDEO_EXT, MAX_VIDEO_BYTES, 'video'),
    ...pick(IMAGE_EXT, MAX_IMAGE_BYTES, 'image'),
  ].slice(0, limit);
}

/** Returns up to `limit` sample images for an HF dataset id (e.g. "cifar10"). */
export async function fetchPreview(
  hfId: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<PreviewImage[]> {
  try {
    const media = await fetchRepoMedia(hfId, limit, signal);
    if (media.length > 0) return media;
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
  const cols = (data.features ?? [])
    .filter((f) => f.type?._type === 'Image' || f.type?._type === 'Video')
    .map((f) => ({ name: f.name, kind: f.type._type === 'Video' ? ('video' as const) : ('image' as const) }));
  const out: PreviewImage[] = [];
  for (const { row } of data.rows ?? []) {
    for (const c of cols) {
      const v = row[c.name];
      if (isMediaCell(v)) out.push({ ...v, kind: c.kind });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
