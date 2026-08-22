import type { ComponentProps } from "react";

import { MEDIA_BASE_URL } from "#/lib/site";
import { createResponsiveMedia } from "#/lib/media-variants";

type ResponsiveImageProps = Omit<ComponentProps<"img">, "sizes" | "src" | "srcSet"> & {
  sizes?: string;
  src: string;
};

export function ResponsiveImage({ src, sizes = "100vw", ...props }: ResponsiveImageProps) {
  const responsive = createResponsiveMedia(src, { baseUrl: MEDIA_BASE_URL, sizes });

  return (
    <img
      {...props}
      src={src}
      {...(responsive ? { sizes: responsive.sizes, srcSet: responsive.srcSet } : {})}
    />
  );
}
