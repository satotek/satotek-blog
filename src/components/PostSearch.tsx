import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Input, SearchField } from "react-aria-components";

import type { PostSummary } from "#/lib/posts/types";

import { PostList } from "./PostList";

const SEARCH_DELAY_MS = 250;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; slugs: readonly string[]; total: number }
  | { status: "error" };

/**
 * 記事一覧の上の検索窓。検索そのものは /api/search が行い、ここは結果の slug を
 * 手元の記事一覧へ突き合わせてカードにするだけ。prerender した HTML と食い違わないよう、
 * URL の ?q= は hydrate のあとで読む。
 */
export function usePostSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initial) setQuery(initial);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set("q", trimmed);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);

    if (!trimmed) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?${new URLSearchParams({ q: trimmed })}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("search request failed");
          const body = (await response.json()) as {
            total?: number;
            posts?: readonly { slug?: string }[];
          };
          const slugs = (body.posts ?? []).flatMap((post) => (post.slug ? [post.slug] : []));
          setState({ status: "ready", slugs, total: body.total ?? slugs.length });
        })
        .catch(() => {
          if (!controller.signal.aborted) setState({ status: "error" });
        });
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { query, setQuery, state, active: query.trim() !== "" };
}

export function PostSearchField({
  query,
  onChange,
}: {
  query: string;
  onChange: (query: string) => void;
}) {
  return (
    <SearchField
      className="group relative mb-4 flex items-center"
      aria-label="記事を検索"
      value={query}
      onChange={onChange}
    >
      <Search
        className="pointer-events-none absolute left-4 size-4 text-muted"
        aria-hidden="true"
      />
      <Input
        className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-11 text-[0.95rem] text-ink outline-none transition-[border-color] placeholder:text-muted focus-visible:border-accent-border [&::-webkit-search-cancel-button]:hidden"
        placeholder="タイトル・タグ・説明から探す"
      />
      <Button
        className="absolute right-2 inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink group-data-[empty]:hidden"
        aria-label="検索語を消す"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </SearchField>
  );
}

export function PostSearchResults({
  posts,
  state,
}: {
  posts: readonly PostSummary[];
  state: SearchState;
}) {
  if (state.status === "error") {
    return <p className="py-6 text-muted">検索できませんでした。時間をおいて試してください。</p>;
  }
  if (state.status !== "ready") {
    return (
      <p className="py-6 text-muted" aria-live="polite">
        検索しています…
      </p>
    );
  }

  const found = state.slugs.flatMap((slug) => {
    const post = posts.find((candidate) => candidate.slug === slug);
    return post ? [post] : [];
  });

  return (
    <div aria-live="polite">
      <p className="m-0 mb-4 text-[0.9rem] text-muted">
        {found.length > 0
          ? state.total > found.length
            ? `${state.total}件中、上位${found.length}件`
            : `${found.length}件見つかりました`
          : "見つかりませんでした"}
      </p>
      {found.length > 0 ? <PostList posts={found} variant="grid" /> : null}
    </div>
  );
}
