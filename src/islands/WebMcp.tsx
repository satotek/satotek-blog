import { useEffect } from "react";

// WebMCP が有効なブラウザでだけ専用コードを読む。
export default function WebMcpIsland() {
  useEffect(() => {
    try {
      if (!document.modelContext) return;
    } catch {
      return;
    }
    void import("#/webmcp/register").catch((error: unknown) => {
      console.warn("[WebMCP] Could not load blog tools.", error);
    });
  }, []);

  return null;
}
