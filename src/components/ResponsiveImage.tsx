import type { ComponentProps } from "react";

import { MEDIA_BASE_URL } from "#/lib/site";
import { createResponsiveMedia } from "#/lib/media-variants";

type ResponsiveImageProps = Omit<ComponentProps<"img">, "sizes" | "src" | "srcSet"> & {
  sizes?: string;
  src: string;
};

export function ResponsiveImage({ src, sizes = "100vw", ...props }: ResponsiveImageProps) {
  const responsive = createResponsiveMedia(src, { baseUrl: MEDIA_BASE_URL, sizes });

  const image = (
    <img
      {...props}
      src={src}
      {...(responsive?.srcSet ? { sizes: responsive.sizes, srcSet: responsive.srcSet } : {})}
    />
  );

  if (!responsive?.avifSrcSet && !responsive?.srcSet) return image;

  return (
    <picture>
      {responsive.avifSrcSet ? (
        <source type="image/avif" sizes={responsive.sizes} srcSet={responsive.avifSrcSet} />
      ) : null}
      {responsive.srcSet ? (
        <source type="image/webp" sizes={responsive.sizes} srcSet={responsive.srcSet} />
      ) : null}
      {image}
    </picture>
  );
}
