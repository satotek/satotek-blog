import { useEffect, useState, type RefObject } from "react";

import { scheduleAfterIdle } from "#/lib/idle";

type ArticleContentRef = RefObject<HTMLElement | null>;
type ArticleEnhancersModule = typeof import("./ArticleEnhancers");

export function DeferredArticleEnhancers({
  containerRef,
  contentKey,
}: {
  containerRef: ArticleContentRef;
  contentKey: string;
}) {
  const [enhancers, setEnhancers] = useState<ArticleEnhancersModule>();

  useEffect(() => {
    let active = true;
    const cancel = scheduleAfterIdle(() => {
      void import("./ArticleEnhancers")
        .then((module) => {
          if (active) setEnhancers(module);
        })
        .catch((error: unknown) => {
          console.warn("[ArticleEnhancers] Could not load article enhancements.", error);
        });
    });

    return () => {
      active = false;
      cancel();
    };
  }, []);

  if (!enhancers) return null;

  return (
    <>
      <enhancers.CodeCopyButtons containerRef={containerRef} contentKey={contentKey} />
      <enhancers.ImageLightbox containerRef={containerRef} contentKey={contentKey} />
    </>
  );
}
