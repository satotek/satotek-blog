import { describe, expect, it } from "vite-plus/test";

import { dockDirection, dockIndex } from "./nav";

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
