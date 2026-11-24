import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { PressEvent } from "react-aria-components";

import { copyText } from "#/components/article/CodeBlock";
import { Button } from "#/components/ui";

/**
 * コードブロックのうち、JS が要るのはコピーボタンだけ。ハイライト済みの本文は
 * 静的 HTML のまま残し、押されたときに同じ枠の <pre> から文字列を読む。
 */
export default function CopyCodeButton() {
  const [copied, setCopied] = useState(false);

  const handlePress = async (event: PressEvent) => {
    const code = event.target.closest(".code-block")?.querySelector("pre")?.textContent ?? "";
    if (!code) return;

    try {
      await copyText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Button aria-label="コードをコピー" className="copy-btn" onPress={handlePress} type="button">
        {copied ? (
          <Check aria-hidden="true" className="icon-check" size={16} strokeWidth={2.5} />
        ) : (
          <Copy aria-hidden="true" className="icon-copy" size={16} />
        )}
      </Button>
      <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
        {copied ? "コードをコピーしました" : ""}
      </span>
    </>
  );
}
