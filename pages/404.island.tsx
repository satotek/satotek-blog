import { NotFound } from "#/components/NotFound";
import BlockPuzzle from "../src/islands/BlockPuzzle" with { island: "visible" };

// 404 はその場で遊べるようにしてある。ゲームは画面に入ってから読む。
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
