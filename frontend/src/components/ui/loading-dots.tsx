"use client";

interface LoadingDotsProps {
  className?: string;
  dotClassName?: string;
}

export function LoadingDots({
  className = "",
  dotClassName = "bg-zinc-300/80 dark:bg-zinc-600/80",
}: LoadingDotsProps) {
  return (
    <div className={["flex items-center gap-1.5", className].filter(Boolean).join(" ")}>
      <span
        className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotClassName} [animation-delay:-0.2s]`}
      />
      <span
        className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotClassName} [animation-delay:-0.1s]`}
      />
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotClassName}`} />
    </div>
  );
}
