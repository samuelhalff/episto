const MACOS_WINDOW_DOT_COLORS = ["#FF5F57", "#FFBD2E", "#28C840"] as const;

export function MarketingWindowDots() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      {MACOS_WINDOW_DOT_COLORS.map((color) => (
        <span
          key={color}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
