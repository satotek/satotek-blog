import type { ErrorPageProps } from "@void/react";
import { useEffect } from "react";

import { NotFoundContent } from "#/components/NotFound";
import { withSiteName } from "#/lib/site";

const NOT_FOUND_TITLE = withSiteName("ページが見つかりません");

// _not-found は .server.ts を持てないため、loader を通らない 404（存在しないパスの直アクセス等）でも
// ブラウザ上のタイトルを 404.tsx と揃える。JSX の <title> は Void の applyClientHead と競合し
// 遷移時に二重になるため DOM 側で反映する。
export default function NotFoundBoundary(_props: ErrorPageProps) {
  useEffect(() => {
    document.title = NOT_FOUND_TITLE;
  }, []);

  return <NotFoundContent />;
}
