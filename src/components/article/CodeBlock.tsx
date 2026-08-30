import { Check, Copy } from "lucide-react";
import { useRef, useState, type HTMLAttributes } from "react";

import { Button } from "#/components/ui";

type CodeBlockProps = HTMLAttributes<HTMLPreElement> & {
  "data-title"?: string;
  "data-lang"?: string;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 権限が無い環境では選択ベースの API へ落とす。
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Copy command failed");
  } finally {
    textarea.remove();
  }
}

/**
 * MDX の `pre` を置き換えて、外枠とコピーボタンを添える。
 */
export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  // ファイル名と言語は別物なので併記する。title を書いた途端に言語が消えると
  // 「これは何のコードか」が読み取れなくなる。値の解釈はビルド時に済んでいる。
  const filename = props["data-title"];
  const lang = props["data-lang"];

  const handlePress = async () => {
    const code = preRef.current?.textContent ?? "";
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
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__meta">
          {filename ? (
            <span className="code-block__filename">
              <span aria-hidden="true" className="code-block__icon">
                ▸
              </span>
              {filename}
            </span>
          ) : null}
          {lang ? <span className="code-block__lang">{lang}</span> : null}
        </span>
        <Button
          aria-label="コードをコピー"
          className="copy-btn"
          onPress={handlePress}
          type="button"
        >
          {copied ? (
            <Check aria-hidden="true" className="icon-check" size={16} strokeWidth={2.5} />
          ) : (
            <Copy aria-hidden="true" className="icon-copy" size={16} />
          )}
        </Button>
        {/* aria-label の差し替えでは、フォーカスが外れていると結果が伝わらない。 */}
        <span aria-atomic="true" aria-live="polite" className="sr-only" role="status">
          {copied ? "コードをコピーしました" : ""}
        </span>
      </div>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}
