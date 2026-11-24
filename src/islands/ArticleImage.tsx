import type { ComponentProps } from "react";

import { ArticleImage } from "#/components/article/ArticleImage";

// クリックで原寸を開くライトボックスは状態を持つので、画像ごとに island にする。
export default function ArticleImageIsland(props: ComponentProps<typeof ArticleImage>) {
  return <ArticleImage {...props} />;
}
