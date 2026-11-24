import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * secrets.sops.env の値を Worker satotek のシークレットへまとめて登録する。
 *
 * void secret put は env.ts（型付きの環境変数定義）が無いと本番の値を受け付けない。
 * env.ts は Workers の型をブラウザ側のコードへ持ち込んで DOM の型とぶつかるので使わず、
 * Cloudflare の API（cf workers secrets bulk-edit）で直接登録する。
 * 値はコマンドライン引数に載せず、権限を絞った一時ファイル経由で渡して、終わったら消す。
 * 載っていないシークレットは消さずに残る。
 */
const WORKER = "satotek";

const decrypted = spawnSync(
  "sops",
  ["--decrypt", "--output-type", "json", "secrets.sops.env"],
  // 失敗時に値が混ざり得るので、sops の標準エラーは表示しない。
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);
if (decrypted.status !== 0) {
  console.error(
    "secrets.sops.env を復号できませんでした（gcloud auth application-default login を確認）",
  );
  process.exit(1);
}

const values = JSON.parse(decrypted.stdout) as Record<string, string>;
const secrets = Object.fromEntries(
  Object.entries(values).map(([name, text]) => [name, { type: "secret_text", text }]),
);

const directory = mkdtempSync(join(tmpdir(), "satotek-secrets-"));
const file = join(directory, "secrets.json");
try {
  writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
  const result = spawnSync(
    "cf",
    ["workers", "secrets", "bulk-edit", "--worker", WORKER, "--secrets", `@${file}`, "--quiet"],
    {
      // void cloudflare login と同じく、cf の認証は OS のキーチェーンから読む。
      env: { ...process.env, CLOUDFLARE_AUTH_USE_KEYRING: "true" },
      // 応答にはシークレットの名前しか含まれないが、念のため表示しない。
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(
    `Worker ${WORKER} に ${Object.keys(secrets).length} 件のシークレットを登録しました: ${Object.keys(secrets).join(", ")}`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
