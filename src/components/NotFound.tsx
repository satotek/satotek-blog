import type { ReactNode } from "react";

export function NotFound({
  code = "404",
  title,
  description,
  children,
}: {
  code?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[820px] px-4 pb-12 pt-2 text-center sm:px-6">
      <p className="m-0 mt-2 text-[clamp(64px,18vw,120px)] leading-none tracking-[0.02em] text-accent">
        {code}
      </p>
      <p className="m-0 mt-2 text-[1.1rem]">{title}</p>
      {description ? <p className="mb-6 mt-1.5 text-muted">{description}</p> : null}
      {children}
    </section>
  );
}
