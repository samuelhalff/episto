"use client";

import { Toaster } from "sonner";
import { useMediaQuery } from "../../hooks/use-media-query";

export function AppToaster() {
  const isCompactViewport = useMediaQuery("(max-width: 767px)");

  return (
    <Toaster
      position={isCompactViewport ? "top-center" : "top-right"}
      offset={24}
      mobileOffset={{
        left: 16,
        right: 16,
        top: "calc(env(safe-area-inset-top, 0px) + 88px)",
      }}
      visibleToasts={isCompactViewport ? 1 : 3}
      toastOptions={{
        className:
          "!rounded-2xl !border !border-zinc-200/80 !bg-white !text-zinc-800 !shadow-lg dark:!border-zinc-700 dark:!bg-zinc-900 dark:!text-zinc-100",
      }}
    />
  );
}
