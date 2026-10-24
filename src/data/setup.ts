/**
 * プロフィールの「作業環境」に出す内容。マシンやツールが変わったらここだけ直す。
 * specs は分かっている項目だけ書けばよく、空ならカードに表示しない。
 */

export type MachineKind = "laptop" | "desktop" | "server";

export type Machine = {
  kind: MachineKind;
  /** 「メイン」「サーバー」のような役割。カード右上の小さなラベルになる。 */
  role: string;
  name: string;
  os?: string;
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
    role: "Laptop",
    name: "MacBook Pro",
    os: "macOS",
    note: "普段使いの1台。nix-darwin + Home Manager でシステム設定まで宣言的に管理しています。",
    specs: [
      { label: "Chip", value: "Apple M5" },
      { label: "RAM", value: "24GB" },
      { label: "Storage", value: "1TB" },
    ],
  },
  {
    kind: "desktop",
    role: "Desktop",
    name: "デスクトップ PC",
    specs: [
      { label: "CPU", value: "AMD Ryzen 9 5950X" },
      { label: "GPU", value: "AMD Radeon RX 7900 XTX" },
      { label: "RAM", value: "64GB" },
      { label: "Storage", value: "SSD 2TB + 1TB / HDD 4TB" },
    ],
  },
  {
    kind: "server",
    role: "Server #1",
    name: "Proxmox Server #1",
    os: "Proxmox VE",
    specs: [
      { label: "CPU", value: "Intel N100" },
      { label: "RAM", value: "16GB" },
      { label: "Storage", value: "SSD 512GB" },
    ],
  },
  {
    kind: "server",
    role: "Server #2",
    name: "Proxmox Server #2",
    os: "Proxmox VE",
    specs: [
      { label: "CPU", value: "Intel Xeon E5-2687W ×2" },
      { label: "GPU", value: "NVIDIA Quadro K2200" },
      { label: "RAM", value: "64GB" },
      { label: "Storage", value: "SSD 512GB / HDD 2TB" },
    ],
  },
];

export const tools: readonly Tool[] = [
  { label: "Editor", value: "Neovim" },
  { label: "Terminal", value: "Ghostty / WezTerm" },
  { label: "Shell", value: "zsh + Starship" },
  { label: "dotfiles", value: "Nix Flakes + Home Manager", postSlug: "nix-flakes-dotfiles" },
];
