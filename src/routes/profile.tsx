import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Briefcase,
  Cake,
  Laptop,
  MapPin,
  Monitor,
  Server,
  Sparkles,
  Tent,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { siGithub, siInstagram, siX, type SimpleIcon } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { SecretGames, useSecretUnlock } from "#/components/SecretGames";
import { ResponsiveImage } from "#/components/ResponsiveImage";
import { SectionHeading } from "#/components/SectionHeading";
import { Button, Link as AriaLink, RouterLink } from "#/components/ui";
import { machines, tools, type MachineKind } from "#/data/setup";
import { createPageHead, mediaUrl, withSiteName } from "#/lib/site";

export const Route = createFileRoute("/profile")({
  head: () =>
    createPageHead({
      title: withSiteName("プロフィール"),
      description: "nosuke のプロフィール",
      path: "/profile",
      imageAlt: "satotek.dev のプロフィール",
    }),
  component: Profile,
});

const socials: readonly { label: string; handle: string; href: string; icon: SimpleIcon }[] = [
  { label: "GitHub", handle: "satotek", href: "https://github.com/satotek/", icon: siGithub },
  { label: "X", handle: "@nosuke912", href: "https://x.com/nosuke912/", icon: siX },
  {
    label: "Instagram",
    handle: "@nosuke912",
    href: "https://www.instagram.com/nosuke912/",
    icon: siInstagram,
  },
];

const hobbies = ["旅行", "キャンプ", "読書", "ガジェットいじり"] as const;
const interests = ["サイバーセキュリティ", "分割キーボード"] as const;

const machineIcons: Record<MachineKind, LucideIcon> = {
  laptop: Laptop,
  desktop: Monitor,
  server: Server,
};

// 規約類はプロフィール本体より一段小さく、読み物として静かに置く。
const legalBodyClass =
  "text-[0.95rem] leading-[1.85] text-ink/90 [&_a]:text-accent [&_a]:decoration-accent/40 [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-[2.2em] [&_h3]:scroll-mt-[120px] [&_h3]:text-[1.05rem] [&_h3]:font-bold [&_h3:first-child]:mt-0 [&_h4]:mt-[1.4em] [&_h4]:text-[0.95rem] [&_h4]:font-bold [&_h4]:text-muted [&_li]:my-[0.35em] [&_p]:my-[0.9em] [&_ul]:my-[0.9em] [&_ul]:list-disc [&_ul]:pl-6";

function Profile() {
  const { onAvatarPress, unlocked } = useSecretUnlock();

  return (
    <article className="grid gap-12 pt-4 sm:gap-14">
      <section className="profile-hero panel relative overflow-hidden p-6 sm:p-9">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Button
            aria-label="プロフィール画像"
            className="w-fit shrink-0 cursor-pointer rounded-[28px] border-0 bg-transparent p-0"
            onPress={onAvatarPress}
            type="button"
          >
            <ResponsiveImage
              pictureClassName="shrink-0"
              className="profile-avatar size-28 rounded-[28px] object-cover sm:size-36"
              src={mediaUrl("site/my-avater.jpg")}
              sizes="144px"
              alt="nosuke"
              width="288"
              height="288"
            />
          </Button>
          <div className="min-w-0">
            <p className="m-0 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent">
              Software developer
            </p>
            <h1 className="m-0 mt-1.5 text-[clamp(2rem,6vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.04em]">
              nosuke
            </h1>
            <p className="m-0 mt-3 max-w-[560px] text-[1rem] leading-[1.8] text-muted">
              はじめまして、nosukeです。旅行、技術、ガジェット、読書記録などの記事を気ままに書いています。
            </p>
            <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0" aria-label="SNS">
              {socials.map(({ label, handle, href, icon }) => (
                <li key={label}>
                  <AriaLink
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink no-underline transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label}（${handle}）`}
                  >
                    <BrandIcon icon={icon} className="size-4" />
                    <span>{handle}</span>
                  </AriaLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {unlocked ? <SecretGames /> : null}

      <section aria-labelledby="about-title">
        <SectionHeading eyebrow="About" title="プロフィール" id="about-title" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FactCard icon={Briefcase} label="職業" className="col-span-2 sm:col-span-1">
            ソフトウェア開発者
          </FactCard>
          <FactCard icon={MapPin} label="拠点">
            福岡県
            <span className="block text-[0.8rem] font-normal text-muted sm:ml-2 sm:inline">
              （神奈川県出身）
            </span>
          </FactCard>
          <FactCard icon={Cake} label="年齢">
            20代
          </FactCard>
          <FactCard icon={Tent} label="趣味" className="col-span-2 sm:col-span-1">
            <Chips items={hobbies} />
          </FactCard>
          <FactCard
            icon={Sparkles}
            label="最近気になっていること"
            className="col-span-2 sm:col-span-1 lg:col-span-2"
          >
            <Chips items={interests} />
          </FactCard>
        </div>
      </section>

      <section aria-labelledby="setup-title">
        <SectionHeading
          eyebrow="Setup"
          title="作業環境"
          id="setup-title"
          description="手元のマシンと自宅サーバー、普段使っている道具です。"
        />
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {machines.map(({ kind, role, name, os, note, specs }) => {
            const Icon = machineIcons[kind];
            return (
              <li className="panel flex flex-col p-5" key={name}>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-muted">
                    {role}
                  </span>
                </div>
                <h3 className="m-0 mt-4 text-[1.1rem] font-bold tracking-[-0.01em]">{name}</h3>
                {os && <p className="m-0 mt-0.5 font-mono text-[0.78rem] text-muted">{os}</p>}
                {note && (
                  <p className="m-0 mt-3 text-[0.88rem] leading-[1.75] text-ink/85">{note}</p>
                )}
                {specs && specs.length > 0 && (
                  <dl className="m-0 mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[0.82rem]">
                    {specs.map(({ label, value }) => (
                      <div className="contents" key={label}>
                        <dt className="font-mono text-muted">{label}</dt>
                        <dd className="m-0 font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="panel m-0 mt-3 grid gap-px overflow-hidden bg-line p-0 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map(({ label, value, postSlug }) => (
            <div className="bg-card px-5 py-4" key={label}>
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                {label}
              </dt>
              <dd className="m-0 mt-1 text-[0.95rem] font-semibold">
                {postSlug ? (
                  <RouterLink
                    className="inline-flex items-center gap-1 text-ink no-underline hover:text-accent"
                    to="/posts/$slug"
                    params={{ slug: postSlug }}
                  >
                    {value}
                    <ArrowUpRight className="size-3.5 text-accent" aria-hidden="true" />
                  </RouterLink>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="site-title">
        <SectionHeading eyebrow="Site" title="このサイトについて" id="site-title" />
        <div className={`panel p-6 sm:p-8 ${legalBodyClass}`}>
          <h3 id="privacy">プライバシーポリシー</h3>

          <h4>アクセス解析について</h4>
          <p>
            当サイトでは、サイトの利用状況を把握し、コンテンツや表示速度の改善に役立てるため、Cloudflare,
            Inc. が提供するアクセス解析サービス「Cloudflare Web Analytics」を利用しています。
          </p>
          <p>
            同サービスでは、ページビュー、訪問数、参照元、ページの表示速度、Core Web Vitals
            などの情報が集計されます。これらの情報は、個人を特定する目的では利用しません。
          </p>
          <p>
            同サービスは、アクセス解析のために Cookie や localStorage
            などのクライアント側の保存領域を使用せず、個人を追跡するためのフィンガープリンティングも行わないとされています。
          </p>
          <p>
            収集された情報は、
            <AriaLink
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noreferrer"
            >
              Cloudflare のプライバシーポリシー
            </AriaLink>
            に基づいて取り扱われます。
          </p>
          <p>
            あわせて、Google LLC が提供するアクセス解析サービス「Google Analytics
            4」を利用しています。ページの閲覧などの利用状況が Google に送信され、Cookie
            が使用される場合があります。収集された情報は、
            <AriaLink href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              Google のプライバシーポリシー
            </AriaLink>
            に基づいて取り扱われます。
          </p>

          <h3>クレジット</h3>
          <p>
            このサイトでは、SIL Open Font License 1.1
            のもとで公開されている以下のフォントを使用しています。
          </p>
          <ul>
            <li>
              Geist / Geist Mono — © 2023 Vercel, Inc.（
              <AriaLink
                href="https://github.com/vercel/geist-font"
                target="_blank"
                rel="noreferrer"
              >
                vercel/geist-font
              </AriaLink>
              ）
            </li>
            <li>
              Zen Kaku Gothic New — © 2020 The Zen Kaku Gothic New Project Authors（
              <AriaLink
                href="https://fonts.google.com/specimen/Zen+Kaku+Gothic+New"
                target="_blank"
                rel="noreferrer"
              >
                Google Fonts
              </AriaLink>
              ）
            </li>
            <li>
              SNSブランドアイコン —{" "}
              <AriaLink href="https://simpleicons.org/" target="_blank" rel="noreferrer">
                Simple Icons
              </AriaLink>
              。各ブランドの商標・ガイドラインに従って使用しています。
            </li>
          </ul>

          <h3>権利および免責</h3>
          <p>
            このサイトの文章や写真は、基本的に私（nosuke）が自分で書き、撮影したものです。気軽に読んでいただけたら嬉しいですが、著作権を放棄しているわけではありませんので、無断での転載はご遠慮ください。
          </p>
          <p>
            内容はできるだけ正確を期していますが、確認漏れや思い違いがないとは言い切れません。またレビューなどの評価は中立な視点ではなく、あくまで私個人の主観によるものですので、その点はご了承ください。
          </p>
          <p>
            一方で、このサイトへのリンク・シェア・言及・引用は歓迎します。法令とインターネットの一般的なマナーの範囲であれば、許諾などは一切必要ありません。
          </p>

          <h3>お問い合わせ</h3>
          <p>
            記事内容、掲載写真についてのお問い合わせ、ご指摘、ご質問等ありましたら、
            <br />
            ご連絡は <span className="font-semibold">info [at] satotek.dev</span> まで。
          </p>

          <p>
            <small className="text-[0.85rem] text-muted">最終更新日: 2026年6月7日</small>
          </p>
        </div>
      </section>
    </article>
  );
}

function FactCard({
  icon: Icon,
  label,
  className = "",
  children,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`panel flex gap-3 p-4 sm:gap-4 sm:p-5 ${className}`}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[0.75rem] font-bold text-muted">{label}</p>
        <div className="mt-1 text-[1rem] font-semibold">{children}</div>
      </div>
    </div>
  );
}

function Chips({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 mt-0.5 flex list-none flex-wrap gap-1.5 p-0">
      {items.map((item) => (
        <li
          className="rounded-full border border-line px-2.5 py-0.5 text-[0.82rem] font-semibold"
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
