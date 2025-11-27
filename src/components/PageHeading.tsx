import { type ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeading({ title, description, actions }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm ring-1 ring-slate-100/60 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">Sección</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
    </div>
  );
}
