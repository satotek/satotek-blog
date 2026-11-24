import type { ErrorPageProps } from "@void/react";

import { NotFound } from "#/components/NotFound";
import BugHunt from "../src/islands/BugHunt" with { island: "visible" };

// loader や描画が想定外に失敗したとき、素のエラー画面ではなく 404 と同じトーンで見せる。
// 本番の error.message は Void が伏せた汎用文なので、画面には出さない。
export default function ErrorPage({ error }: ErrorPageProps) {
  return (
    <NotFound
      code={String(error.status)}
      title="サーバー側で問題が発生しました。"
      description="復旧までの間、バグ退治でもどうぞ。"
    >
      <a className="text-accent underline underline-offset-2" href="/">
        ← Homeへ戻る
      </a>
      <div className="mt-8">
        <BugHunt />
      </div>
    </NotFound>
  );
}
