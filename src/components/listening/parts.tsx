import { useState, type CSSProperties, type ReactNode } from "react";

import { Link as AriaLink } from "#/components/ui";
import type { MusicTrack } from "@satotek/blog-core/music";

import { hueFor, initialOf } from "./artwork";

export function TrackText({ track }: { track: MusicTrack }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[0.9rem] font-bold">{track.name}</span>
      <span className="block truncate text-[0.78rem] text-muted">{track.artist}</span>
    </span>
  );
}

export function Artwork({
  image,
  label,
  className,
  round = false,
  eager = false,
  textClassName = "text-[0.95rem]",
}: {
  image: string | null;
  label: string;
  className: string;
  round?: boolean;
  eager?: boolean;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = image && !failed;

  return (
    <span
      className={`music-art relative block shrink-0 overflow-hidden ${round ? "" : "border border-line"} ${className}`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          height={eager ? 136 : 72}
          loading={eager ? "eager" : "lazy"}
          src={image}
          width={eager ? 136 : 72}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`music-art__fallback grid size-full place-items-center font-bold ${textClassName}`}
          style={{ "--hue": hueFor(label) } as CSSProperties}
          aria-hidden="true"
        >
          {initialOf(label)}
        </span>
      )}
    </span>
  );
}

export function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <AriaLink className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </AriaLink>
  );
}

export function Equalizer({ className = "" }: { className?: string }) {
  return (
    <span className={`music-eq ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
