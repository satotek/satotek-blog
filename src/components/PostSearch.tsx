import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Input, SearchField } from "react-aria-components";

import type { PostSummary } from "@satotek/blog-core/posts/types";

import { PostList } from "./PostList";

const SEARCH_DELAY_MS = 350;

type SearchResult = { query: string; slugs: readonly string[]; total: number };

type SearchState = {
  /** 直前に表示した結果。次の結果が届くまで出したままにして、入力のたびに画面を揺らさない。 */
  result: SearchResult | null;
  pending: boolean;
  error: boolean;
};

const idleState: SearchState = { result: null, pending: false, error: false };

/**
 * 記事一覧の上の検索窓。検索そのものは /api/search が行い、ここは結果の slug を
 * 手元の記事一覧へ突き合わせてカードにするだけ。打鍵が止まってから検索し、
 * 一覧と結果の切り替えもそこまで待つ。prerender した HTML と食い違わないよう、
 * URL の ?q= は hydrate のあとで読む。
 */
export function usePostSearch() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [state, setState] = useState<SearchState>(idleState);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q")?.trim();
    if (initial) {
      setQuery(initial);
      setSearched(initial);
    }
  }, []);

  // 消したときはすぐ一覧へ戻し、打っている間は止まるまで待つ。
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearched("");
      return;
    }
    const timer = window.setTimeout(() => setSearched(trimmed), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (searched) url.searchParams.set("q", searched);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);

    if (!searched) {
      setState(idleState);
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, pending: true }));
    void fetch(`/api/search?${new URLSearchParams({ q: searched })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("search request failed");
        const body = (await response.json()) as {
          total?: number;
          posts?: readonly { slug?: string }[];
        };
        const slugs = (body.posts ?? []).flatMap((post) => (post.slug ? [post.slug] : []));
        setState({
          result: { query: searched, slugs, total: body.total ?? slugs.length },
          pending: false,
          error: false,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ result: null, pending: false, error: true });
      });

    return () => controller.abort();
  }, [searched]);

  return { query, setQuery, state, active: searched !== "" };
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
        className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-11 text-base text-ink outline-none transition-[border-color] placeholder:text-muted focus-visible:border-accent-border [&::-webkit-search-cancel-button]:hidden"
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
  if (state.error) {
    return <p className="py-6 text-muted">検索できませんでした。時間をおいて試してください。</p>;
  }

  const result = state.result;
  const found = (result?.slugs ?? []).flatMap((slug) => {
    const post = posts.find((candidate) => candidate.slug === slug);
    return post ? [post] : [];
  });

  return (
    <div
      aria-busy={state.pending}
      className={`transition-opacity duration-200 ${state.pending ? "opacity-60" : ""}`}
    >
      <p className="m-0 mb-4 min-h-[1.5em] text-[0.9rem] text-muted" aria-live="polite">
        {result
          ? found.length > 0
            ? result.total > found.length
              ? `${result.total}件中、上位${found.length}件`
              : `${found.length}件見つかりました`
            : "見つかりませんでした"
          : null}
      </p>
      {found.length > 0 ? <PostList posts={found} variant="grid" /> : null}
    </div>
  );
}
