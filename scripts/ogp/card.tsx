import { Resvg } from "@resvg/resvg-js";
import satori, { type Font as SatoriFont, type SatoriNode } from "satori";

import type { PostSummary } from "../../src/lib/posts/types";

export const imageWidth = 1200;
export const imageHeight = 630;

export type OgpCardContent = Pick<PostSummary, "category" | "tags" | "title">;

function compactText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  return characters.length > maxLength ? `${characters.slice(0, maxLength - 1).join("")}…` : text;
}

function OGPCard({ content }: { content: OgpCardContent }) {
  const title = compactText(content.title, 48);
  const tags = content.tags.slice(0, 4).map((tag) => compactText(tag, 18));
  const titleFontSize = title.length > 24 ? 52 : 58;

  return (
    <div
      style={{
        backgroundColor: "#f2f3ff",
        border: "4px solid #292a38",
        borderRadius: 32,
        // Satori sizes boxes like browsers, so without this the padding and
        // border push the card past the image edges.
        boxSizing: "border-box",
        color: "#292a38",
        display: "flex",
        flexDirection: "column",
        height: imageHeight,
        overflow: "hidden",
        padding: "52px 64px",
        position: "relative",
        width: imageWidth,
      }}
    >
      <div
        style={{
          backgroundColor: "#d8dbff",
          borderRadius: 280,
          height: 560,
          position: "absolute",
          right: -180,
          top: -240,
          width: 560,
        }}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div style={{ alignItems: "center", display: "flex" }}>
          <div
            style={{
              alignItems: "center",
              backgroundColor: "#635fc2",
              borderRadius: 20,
              color: "#fafbff",
              display: "flex",
              fontSize: 42,
              fontWeight: 700,
              height: 76,
              justifyContent: "center",
              width: 76,
            }}
          >
            s.
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginLeft: 18 }}>satotek.dev</div>
        </div>
        <div
          style={{
            color: "#5c5d90",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {content.category}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#635fc2",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 18,
          }}
        >
          ARTICLE
        </div>
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.22,
            maxWidth: 1020,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, minHeight: 48, position: "relative" }}>
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              backgroundColor: "#fbfbff",
              border: "2px solid #ccceeb",
              borderRadius: 24,
              color: "#454482",
              fontSize: 22,
              padding: "8px 18px",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
}
export function renderOgpSvg(
  content: OgpCardContent,
  fonts: readonly SatoriFont[],
  onNodeDetected?: (node: SatoriNode) => void,
) {
  return satori(<OGPCard content={content} />, {
    embedFont: true,
    fonts: [...fonts],
    height: imageHeight,
    onNodeDetected,
    width: imageWidth,
  });
}

export async function renderOgpPng(content: OgpCardContent, fonts: readonly SatoriFont[]) {
  return Buffer.from(new Resvg(await renderOgpSvg(content, fonts)).render().asPng());
}
