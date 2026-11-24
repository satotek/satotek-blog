import { ThemeToggle } from "#/components/ThemeToggle";

// island の import 属性は default export を対象にするので、共有コンポーネントを包み直す。
export default function ThemeToggleIsland() {
  return <ThemeToggle className="inline-flex" />;
}
