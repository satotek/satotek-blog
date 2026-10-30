/** 画像が無いときの頭文字。絵文字や結合文字を割らないよう書記素単位で取る。 */
export function initialOf(label: string) {
  const segment = new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(label.trim());
  const first = segment[Symbol.iterator]().next().value?.segment ?? "";
  return first.toUpperCase() || "♪";
}

/** 名前から色相を決める。同じ名前はいつも同じ色になる。 */
export function hueFor(label: string) {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % 360;
}
