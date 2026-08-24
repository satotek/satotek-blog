import { createFileRoute } from "@tanstack/react-router";
import { siGithub, siInstagram, siX } from "simple-icons";

import { BrandIcon } from "#/components/BrandIcon";
import { SecretGames, useSecretUnlock } from "#/components/SecretGames";
import { ResponsiveImage } from "#/components/ResponsiveImage";
import { Button, Link as AriaLink } from "#/components/ui";
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

const profileBodyClass =
  "text-[1.0625rem] leading-[1.75] sm:text-[1.125rem] sm:leading-[1.85] [&_a]:text-accent [&_a]:decoration-accent/40 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:relative [&_h2]:mt-[2.4em] [&_h2]:scroll-mt-[120px] [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-[0.3em] [&_h2]:text-[1.3rem] [&_h2]:font-bold [&_h2]:leading-[1.3] sm:[&_h2]:text-[1.45rem] [&_h3]:relative [&_h3]:mt-[2em] [&_h3]:scroll-mt-[120px] [&_h3]:border-b [&_h3]:border-line [&_h3]:pb-[0.25em] [&_h3]:text-[1.175rem] [&_h3]:font-bold [&_h3]:leading-[1.3] sm:[&_h3]:text-[1.3rem] [&_hr]:my-[3.5em] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line [&_li]:my-[0.4em] [&_p]:my-[1.25em] [&_strong]:font-bold [&_ul]:my-[1.25em] [&_ul]:list-disc [&_ul]:pl-6";

function Profile() {
  const { onAvatarPress, unlocked } = useSecretUnlock();

  return (
    <article className={profileBodyClass}>
      <div className="mb-6 flex items-center gap-5 py-6">
        <Button
          aria-label="プロフィール画像"
          className="shrink-0 cursor-pointer rounded-[24px] border-0 bg-transparent p-0"
          onPress={onAvatarPress}
          type="button"
        >
          <ResponsiveImage
            className="h-32 w-32 rounded-[24px] border border-line object-cover"
            src={mediaUrl("site/my-avater.jpg")}
            sizes="128px"
            alt="nosuke"
            width="256"
            height="256"
          />
        </Button>
        <div>
          <h1 className="m-0 text-[1.6rem] font-bold leading-tight">nosuke</h1>
          <p className="m-0 mt-1 text-muted">日常雑記 / 技術メモ</p>
        </div>
      </div>

      <p>
        はじめまして、nosukeです。
        <br />
        旅行、技術、ガジェット、読書記録などの記事を気ままに書いています。
      </p>

      <h2>プロフィール</h2>
      <ul>
        <li>職業：ソフトウェア開発者</li>
        <li>出身地：神奈川県</li>
        <li>現在地：福岡県</li>
        <li>年齢：20代</li>
        <li>趣味：旅行、キャンプ、読書、ガジェットいじり</li>
        <li>最近気になっていること：サイバーセキュリティ、分割キーボード</li>
        <li>
          好きな式：
          <span className="font-mono">
            e<sup>iπ</sup> + 1 = 0
          </span>
          （ベタですが中学時代に「オイラーの贈物」を読んで気に入りました。中身はだいぶ忘れましたが…）
        </li>
      </ul>

      <h2>リンク</h2>
      <div className="flex flex-wrap gap-3">
        <AriaLink
          className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line text-muted transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
          href="https://github.com/satotek/"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <BrandIcon icon={siGithub} className="size-5" />
        </AriaLink>
        <AriaLink
          className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line text-muted transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
          href="https://x.com/nosuke912/"
          target="_blank"
          rel="noreferrer"
          aria-label="X"
        >
          <BrandIcon icon={siX} className="size-5" />
        </AriaLink>
        <AriaLink
          className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-line text-muted transition-[background,border-color,color] duration-150 hover:border-accent-border hover:bg-accent-soft hover:text-accent"
          href="https://www.instagram.com/nosuke912/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <BrandIcon icon={siInstagram} className="size-5" />
        </AriaLink>
      </div>

      {unlocked ? <SecretGames /> : null}

      <hr />

      <h2 id="privacy">プライバシーポリシー</h2>

      <h3>アクセス解析について</h3>
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
        <AriaLink href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
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

      <h2>クレジット</h2>
      <p>
        このサイトでは、SIL Open Font License 1.1
        のもとで公開されている以下のフォントを使用しています。
      </p>
      <ul>
        <li>
          Geist / Geist Mono — © 2023 Vercel, Inc.（
          <AriaLink href="https://github.com/vercel/geist-font" target="_blank" rel="noreferrer">
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

      <h2>権利および免責</h2>
      <p>
        このサイトの文章や写真は、基本的に私（nosuke）が自分で書き、撮影したものです。気軽に読んでいただけたら嬉しいですが、著作権を放棄しているわけではありませんので、無断での転載はご遠慮ください。
      </p>
      <p>
        内容はできるだけ正確を期していますが、確認漏れや思い違いがないとは言い切れません。またレビューなどの評価は中立な視点ではなく、あくまで私個人の主観によるものですので、その点はご了承ください。
      </p>
      <p>
        一方で、このサイトへのリンク・シェア・言及・引用は歓迎します。法令とインターネットの一般的なマナーの範囲であれば、許諾などは一切必要ありません。
      </p>

      <h2>お問い合わせ</h2>
      <p>
        記事内容、掲載写真についてのお問い合わせ、ご指摘、ご質問等ありましたら、
        <br />
        ご連絡は <span className="font-semibold">info [at] satotek.dev</span> まで。
      </p>

      <p>
        <small className="text-[0.85rem] text-muted">最終更新日: 2026年6月7日</small>
      </p>
    </article>
  );
}
