export const POSTS_PER_PAGE = 10;

export function paginate<T>(items: readonly T[], page: number) {
  const total = Math.max(1, Math.ceil(items.length / POSTS_PER_PAGE));
  const current = Math.min(Math.max(1, page), total);
  const start = (current - 1) * POSTS_PER_PAGE;

  return {
    slice: items.slice(start, start + POSTS_PER_PAGE),
    current,
    total,
  };
}

export function parsePage(raw: string | undefined) {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}
