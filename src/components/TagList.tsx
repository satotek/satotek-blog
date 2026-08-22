import { Link } from "@tanstack/react-router";

export type TagCount = {
  name: string;
  count: number;
};

export function TagList({ tags }: { tags: readonly TagCount[] }) {
  if (tags.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0" aria-label="タグ一覧">
      {tags.map(({ name, count }) => (
        <li key={name}>
          <Link
            className="inline-flex items-baseline gap-1.5 text-[0.9rem] text-muted no-underline transition-colors hover:text-accent"
            to="/tags/$tag"
            params={{ tag: name }}
          >
            <span>#{name}</span>
            <span className="font-mono text-[0.72rem] tabular-nums text-muted/70">{count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
