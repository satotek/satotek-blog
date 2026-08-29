import { useEffect, useState } from "react";

import { scheduleAfterIdle } from "#/lib/idle";

type ShareButtonModule = typeof import("./ShareButton");

export function DeferredShareButton({ title, url }: { title: string; url: string }) {
  const [shareButton, setShareButton] = useState<ShareButtonModule>();

  useEffect(() => {
    let active = true;
    const cancel = scheduleAfterIdle(() => {
      void import("./ShareButton")
        .then((module) => {
          if (active) setShareButton(module);
        })
        .catch((error: unknown) => {
          console.warn("[ShareButton] Could not load the share button.", error);
        });
    });

    return () => {
      active = false;
      cancel();
    };
  }, []);

  return shareButton ? <shareButton.ShareButton title={title} url={url} /> : null;
}
