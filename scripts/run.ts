/**
 * TS のスクリプトを Vite のモジュールランナー経由で実行する。
 *
 * scripts/ は src/ の共有コードを読み、そこでは `import.meta.env.VITE_*` を使う。
 * 素の Node では import.meta.env が無いので、アプリと同じ Vite の変換と
 * .env 読み込みを通して、ビルド時と同じ値で動かす。
 *
 * usage: node scripts/run.ts scripts/<file>.ts [...args]
 */
import { resolve } from "node:path";
import { runnerImport } from "vite";

const [entry, ...args] = process.argv.slice(2);
if (!entry) {
  console.error("usage: node scripts/run.ts <script> [...args]");
  process.exit(1);
}

// 呼ばれたスクリプトは process.argv.slice(2) を自分の引数として読む。
process.argv = [process.argv[0], resolve(entry), ...args];

// vite.config.ts は Void や MDX のプラグインを積んでいて重く、
// スクリプトの実行には要らないので読まない。
await runnerImport(resolve(entry), { configFile: false, logLevel: "warn" });
