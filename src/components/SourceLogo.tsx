import huggingfaceLogo from '../assets/huggingface.svg';
import kaggleLogo from '../assets/kaggle.svg';
import type { DatasetSource } from '../types';

const LOGOS: Record<DatasetSource, { src: string; label: string }> = {
  kaggle: { src: kaggleLogo, label: 'Kaggle' },
  huggingface: { src: huggingfaceLogo, label: 'Hugging Face' },
};

export function SourceLogo({
  source,
  size = 20,
}: {
  source: DatasetSource;
  size?: number;
}) {
  const { src, label } = LOGOS[source];
  return (
    <img
      src={src}
      alt={`${label} logo`}
      title={label}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block shrink-0 rounded-md"
    />
  );
}

export function sourceLabel(source: DatasetSource): string {
  return LOGOS[source].label;
}
