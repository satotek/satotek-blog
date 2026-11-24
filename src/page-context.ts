declare module "void" {
  interface CloudContextVariables {
    shared: { path: string };
  }
}

type PageContext = {
  req: { path: string };
  set(key: "shared", value: { path: string }): void;
};

/**
 * island ページの SSR では Router が無く、レイアウトから現在の URL を読めない。
 * loader で shared に積んでおけば、レイアウトが useShared() でナビの選択位置を決められる。
 * middleware で積むと全ページが Worker 経由になり静的配信の利点が消えるので、各 loader から呼ぶ。
 */
export function sharePage(c: PageContext) {
  c.set("shared", { path: c.req.path });
}
