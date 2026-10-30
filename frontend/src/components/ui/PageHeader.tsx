import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
          {title}
        </h1>
        <div className="mt-2.5 max-w-3xl text-[13.5px] leading-relaxed text-ink-secondary">
          {description}
        </div>
        {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}
