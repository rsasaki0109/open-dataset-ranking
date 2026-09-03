import type { ReactNode } from 'react';

export function Section({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
