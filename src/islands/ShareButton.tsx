import { ShareButton } from "#/components/ShareButton";

// island 自体が idle で読み込まれるので、DeferredShareButton のような遅延は要らない。
export default function ShareButtonIsland({ title, url }: { title: string; url: string }) {
  return <ShareButton title={title} url={url} />;
}
