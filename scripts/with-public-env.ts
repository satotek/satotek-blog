import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/**
 * .env の VITE_* だけを環境変数に載せてコマンドを実行する。
 *
 * Void のビルドは、手元の値が黙って本番に混ざらないよう .env のクライアント値（VITE_*）を
 * 取り除き、シェルから渡された値だけを埋め込む。このサイトでは GA4 の測定 ID などの本番値を
 * .env に置いているので、デプロイ時はここで明示的にシェルへ渡す。シェルに同じ名前があれば
 * そちらを優先する。サーバー用のシークレットはビルドに要らないので渡さない。
 */
const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("usage: node scripts/with-public-env.ts <command> [...args]");
  process.exit(1);
}

const local = existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {};
const env = { ...process.env };
for (const [key, value] of Object.entries(local)) {
  if (key.startsWith("VITE_") && env[key] === undefined) env[key] = value;
}

const result = spawnSync(command, args, { env, stdio: "inherit" });
process.exit(result.status ?? 1);
