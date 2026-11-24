import { ProfileDetails } from "#/components/ProfileContent";
import GithubActivity from "../src/islands/GithubActivity";
import ProfileHero from "../src/islands/ProfileHero";

export default function ProfilePage() {
  return (
    <article className="grid gap-12 pt-4 sm:gap-14">
      <ProfileHero />
      <ProfileDetails github={<GithubActivity />} />
    </article>
  );
}
