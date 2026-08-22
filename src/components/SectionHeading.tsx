import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  id,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  id?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div>
        {eyebrow && (
          <p className="m-0 mb-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.02em] sm:text-[1.4rem]" id={id}>
          {title}
        </h2>
        {description && <p className="m-0 mt-1 text-[0.9rem] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
