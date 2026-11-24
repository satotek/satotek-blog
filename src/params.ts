/** 日本語のタグは URL エンコードされて届く。二重デコードで壊れないよう、失敗したら素の値を使う。 */
export function decodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
