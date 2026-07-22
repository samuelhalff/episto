import { ImageResponse } from "next/og";
import { BRAND_NAME } from "../lib/brand";

// Branded social share card (Open Graph + Twitter). Applies to every route
// unless a segment provides its own opengraph-image. Rendered as a real PNG so
// social platforms and AI answer engines get a proper preview.
export const runtime = "nodejs";
export const alt = `${BRAND_NAME} — formal letters via Swiss Post`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf7f0",
        padding: "80px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "#f6c54a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          E
        </div>
        <div style={{ fontSize: "40px", fontWeight: 700, color: "#1a1a1a" }}>
          {BRAND_NAME}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div
          style={{
            fontSize: "68px",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#141414",
            maxWidth: "900px",
          }}
        >
          Formal letters, drafted and sent by Swiss Post.
        </div>
        <div style={{ fontSize: "32px", color: "#5c5648", maxWidth: "820px" }}>
          Draft a clear, correct letter and post it — standard or registered — without
          leaving your desk.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "26px",
          color: "#6b6558",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "6px",
            background: "#f6c54a",
            borderRadius: "3px",
          }}
        />
        episto.ch · Switzerland
      </div>
    </div>,
    { ...size },
  );
}
