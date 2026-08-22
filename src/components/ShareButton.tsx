import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button as AriaButton } from "react-aria-components";
import { siHatenabookmark, siX } from "simple-icons";

import { BrandIcon } from "./BrandIcon";

const SHARE_TEXT_LIMIT = 140;

const pillClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-transparent px-3 py-1.5 text-[0.85rem] text-muted no-underline transition-[background,border-color,color,transform] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-ink active:scale-[0.94] motion-reduce:transition-none";

/** X でそのまま流せるよう、共有テキストは140文字に収める。 */
function truncate(text: string) {
  return text.length > SHARE_TEXT_LIMIT ? `${text.slice(0, SHARE_TEXT_LIMIT - 1)}…` : text;
}

export function ShareButton({ title, url }: { title: string; url: string }) {
  // SSR には navigator が無い。初期値は「非対応」にして、マウント後に切り替える
  // ことでハイドレーション不整合を避ける。
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const text = truncate(title);

  if (!canShare) {
    return (
      <div className="flex items-center gap-2">
        <a
          className={pillClass}
          href={`https://x.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
          <BrandIcon icon={siX} className="size-3.5" />
          ポスト
        </a>
        <a
          className={pillClass}
          href={`https://b.hatena.ne.jp/add?mode=confirm&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
          <BrandIcon icon={siHatenabookmark} className="size-3.5" />
          はてブ
        </a>
      </div>
    );
  }

  const share = async () => {
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // シェアシートを閉じると AbortError で reject するため、握りつぶす。
    }
  };

  return (
    <AriaButton className={pillClass} onPress={share} type="button">
      <Share2 className="size-3.5" aria-hidden="true" />
      共有
    </AriaButton>
  );
}
