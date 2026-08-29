import { createBlogWebMcpTools } from "./blog-tools";

let registrationPromise: Promise<void> | undefined;

function currentModelContext() {
  if (typeof document === "undefined") return undefined;

  try {
    return document.modelContext;
  } catch {
    return undefined;
  }
}

export function registerBlogWebMcpTools() {
  if (registrationPromise) return registrationPromise;

  const modelContext = currentModelContext();
  if (!modelContext) return undefined;

  const controller = new AbortController();
  const tools = createBlogWebMcpTools();
  registrationPromise = Promise.resolve()
    .then(() =>
      Promise.all(
        tools.map((tool) => modelContext.registerTool(tool, { signal: controller.signal })),
      ),
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      // If registration is only partially successful, remove the tools that
      // were registered before surfacing the failure in the console.
      controller.abort();
      registrationPromise = undefined;
      console.warn("[WebMCP] Could not register blog tools.", error);
    });

  return registrationPromise;
}

// This module is imported once from the root shell. Keeping initialization at
// module scope avoids React Strict Mode registering the same tool twice.
void registerBlogWebMcpTools();
