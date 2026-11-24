import { NotFound } from "#/components/NotFound";
import BlockPuzzle from "../src/islands/BlockPuzzle";

// 404 はその場で遊べるようにしてある。
export default function NotFoundPage() {
  return (
    <NotFound
      title="ページが見つかりません。"
      description="せっかくなので、ブロックパズルでもどうぞ。"
    >
      <a className="text-accent underline underline-offset-2" href="/">
        ← Homeへ戻る
      </a>
      <div className="mt-8">
        <BlockPuzzle />
      </div>
    </NotFound>
  );
}
