/**
 * プロフィールの「作業環境」に出す内容。マシンが変わったらここだけ直す。
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
  /** 今は使っていないマシン。カードを薄くして「休止中」を添える。 */
  inactive?: boolean;
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
    os: "Windows 11",
    note: "趣味用と、Windows 環境での開発用。",
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
    note: "メインの自宅サーバー。",
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
    note: "電気代が高くなりすぎたので、今は止めています。",
    inactive: true,
    specs: [
      { label: "CPU", value: "Intel Xeon E5-2687W ×2" },
      { label: "GPU", value: "NVIDIA Quadro K2200" },
      { label: "RAM", value: "64GB" },
      { label: "Storage", value: "SSD 512GB / HDD 2TB" },
    ],
  },
];
