import { useEffect, useState } from 'react';
import { fetchPreview, PreviewHttpError, type PreviewImage } from '../lib/preview';
import type { Copy } from '../lib/i18n';

type State =
  | { status: 'loading' }
  | { status: 'ready'; images: PreviewImage[] }
  | { status: 'gated' }
  | { status: 'error' };

export function PreviewGallery({ hfId, copy }: { hfId: string; copy: Copy }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [zoom, setZoom] = useState<PreviewImage | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPreview(hfId, 8, ctrl.signal)
      .then((images) => setState({ status: 'ready', images }))
      .catch((e: unknown) => {
        if ((e as Error).name === 'AbortError') return;
        const gated = e instanceof PreviewHttpError && (e.status === 401 || e.status === 403);
        setState({ status: gated ? 'gated' : 'error' });
      });
    return () => ctrl.abort();
  }, [hfId]);

  if (state.status === 'loading')
    return <p className="mb-3 text-xs text-slate-500">{copy.previewLoading}</p>;
  if (state.status === 'gated')
    return <p className="mb-3 text-xs text-slate-500">{copy.previewGated}</p>;
  if (state.status === 'error')
    return <p className="mb-3 text-xs text-slate-500">{copy.previewError}</p>;
  if (state.images.length === 0)
    return <p className="mb-3 text-xs text-slate-500">{copy.previewEmpty}</p>;

  return (
    <>
      <div className="mb-3 grid grid-cols-4 gap-1">
        {state.images.map((img, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setZoom(img)}
            className="relative aspect-square overflow-hidden rounded bg-slate-100 dark:bg-slate-700"
          >
            {img.kind === 'video' ? (
              <>
                {/* #t=0.1 makes browsers paint a poster frame without downloading the whole file */}
                <video
                  src={`${img.src}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="pointer-events-none h-full w-full object-cover"
                />
                <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] leading-4 text-white">
                  ▶
                </span>
              </>
            ) : (
              <img
                src={img.src}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            )}
          </button>
        ))}
      </div>
      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {zoom.kind === 'video' ? (
            <video
              src={zoom.src}
              controls
              autoPlay
              loop
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded"
            />
          ) : (
            <img
              src={zoom.src}
              alt=""
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded"
            />
          )}
        </div>
      )}
    </>
  );
}
