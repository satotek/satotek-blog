import { ProfileDetails } from "#/components/ProfileContent";
// データが届くまで高さ 0 なので visible だと監視対象が画面に入りにくく、届いた瞬間に
// 読書中の位置で節が現れる。読み込み後すぐ取りに行く。
import GithubActivity from "../src/islands/GithubActivity" with { island: "idle" };
import ProfileHero from "../src/islands/ProfileHero" with { island: "idle" };

export default function ProfilePage() {
  return (
    <article className="grid gap-12 pt-4 sm:gap-14">
      <ProfileHero />
      <ProfileDetails github={<GithubActivity />} />
    </article>
  );
}
