/**
 * プロフィールの「作業環境」に出す内容。マシンやツールが変わったらここだけ直す。
 * specs は分かっている項目だけ書けばよく、空ならカードに表示しない。
 */

export type MachineKind = "laptop" | "desktop" | "cloud" | "wsl";

export type Machine = {
  kind: MachineKind;
  /** 「メイン」「クラウド」のような役割。カード左上の小さなラベルになる。 */
  role: string;
  name: string;
  os: string;
  note?: string;
  specs?: readonly { label: string; value: string }[];
};

export type Tool = {
  label: string;
  value: string;
  /** 関連する記事があればリンクする。 */
  postSlug?: string;
};

export const machines: readonly Machine[] = [
  {
    kind: "laptop",
    role: "メイン",
    name: "MacBook Pro (M5)",
    os: "macOS",
    note: "普段使いの1台。nix-darwin + Home Manager でシステム設定まで宣言的に管理しています。",
    specs: [],
  },
  {
    kind: "wsl",
    role: "サブ",
    name: "WSL",
    os: "Linux on Windows",
    note: "Windows 側でも同じシェル・同じエディタ設定で作業できるようにしています。",
  },
  {
    kind: "cloud",
    role: "クラウド",
    name: "Azure VM",
    os: "Ubuntu",
    note: "作業用の VM。作り直しても dotfiles を流せばすぐ元の環境に戻ります。",
  },
];

export const tools: readonly Tool[] = [
  { label: "Editor", value: "Neovim" },
  { label: "Terminal", value: "Ghostty / WezTerm" },
  { label: "Shell", value: "zsh + Starship" },
  { label: "dotfiles", value: "Nix Flakes + Home Manager", postSlug: "nix-flakes-dotfiles" },
];
