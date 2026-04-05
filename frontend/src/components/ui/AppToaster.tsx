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
        classNames: {
          success:
            "!border-emerald-300/80 !bg-emerald-50 !text-emerald-950 dark:!border-emerald-400/30 dark:!bg-emerald-500/12 dark:!text-emerald-100",
          warning:
            "!border-amber-300/80 !bg-amber-50 !text-amber-950 dark:!border-amber-400/30 dark:!bg-amber-500/12 dark:!text-amber-100",
          error:
            "!border-red-300/80 !bg-red-50 !text-red-950 dark:!border-red-400/30 dark:!bg-red-500/12 dark:!text-red-100",
        },
      }}
    />
  );
}
