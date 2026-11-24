import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  clearDockTransition,
  dockDirection,
  dockIndex,
  dockTransitionType,
  prepareDockTransition,
} from "./nav";

describe("dockIndex", () => {
  it("places the four sections from left to right", () => {
    expect(dockIndex("/")).toBe(0);
    expect(dockIndex("/posts")).toBe(1);
    expect(dockIndex("/music")).toBe(2);
    expect(dockIndex("/profile")).toBe(3);
  });

  it("keeps article filters on the articles item", () => {
    expect(dockIndex("/posts/cellscope")).toBe(1);
    expect(dockIndex("/posts/page/2")).toBe(1);
    expect(dockIndex("/categories/dev")).toBe(1);
    expect(dockIndex("/tags/react")).toBe(1);
  });

  it("returns -1 for pages outside the dock", () => {
    expect(dockIndex("/play/crash")).toBe(-1);
  });
});

describe("dockDirection", () => {
  it("points toward the tapped item", () => {
    expect(dockDirection("/", "/music")).toBe(1);
    expect(dockDirection("/profile", "/posts")).toBe(-1);
  });

  it("stays put when the active item does not change", () => {
    expect(dockDirection("/posts/cellscope", "/posts")).toBe(0);
    expect(dockDirection("/music", "/music")).toBe(0);
  });

  it("ignores pages that are not in the dock", () => {
    expect(dockDirection("/play/crash", "/music")).toBeNull();
  });
});

describe("dockTransitionType", () => {
  it("maps dock direction to view transition types", () => {
    expect(dockTransitionType("/", "/music")).toBe("dock-forward");
    expect(dockTransitionType("/profile", "/posts")).toBe("dock-back");
    expect(dockTransitionType("/posts/cellscope", "/posts")).toBe("dock-fade");
    expect(dockTransitionType("/play/crash", "/music")).toBeNull();
  });
});

describe("prepareDockTransition", () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    clearDockTransition();
    if (originalDocument === undefined) {
      delete (globalThis as { document?: Document }).document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  function installDocumentStub() {
    const dataset: Record<string, string> = {};
    const transitions: Set<string>[] = [];
    const startViewTransition = vi.fn(() => {
      const types = new Set<string>();
      transitions.push(types);
      return { types } as unknown as ViewTransition;
    });

    globalThis.document = {
      documentElement: { dataset },
      startViewTransition,
    } as unknown as Document;

    return { dataset, transitions, startViewTransition };
  }

  it("attaches dock transition type once on the next startViewTransition", () => {
    const { transitions } = installDocumentStub();

    prepareDockTransition("/", "/music");
    document.startViewTransition(() => {});
    document.startViewTransition(() => {});

    expect([...(transitions[0] ?? [])]).toEqual(["dock-forward"]);
    expect([...(transitions[1] ?? [])]).toEqual([]);
  });

  it("does not consume or attach dock type during theme transitions", () => {
    const { dataset, transitions } = installDocumentStub();

    prepareDockTransition("/profile", "/posts");
    dataset.themeTransition = "";
    document.startViewTransition(() => {});
    delete dataset.themeTransition;
    document.startViewTransition(() => {});

    expect([...(transitions[0] ?? [])]).toEqual([]);
    expect([...(transitions[1] ?? [])]).toEqual(["dock-back"]);
  });

  it("clears pending dock transition when switching to another destination", () => {
    const { transitions } = installDocumentStub();

    prepareDockTransition("/", "/music");
    clearDockTransition("/posts");
    document.startViewTransition(() => {});

    expect([...(transitions[0] ?? [])]).toEqual([]);
  });
});
