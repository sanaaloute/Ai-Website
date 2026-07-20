import { ImageResponse } from "next/og";

// Default social card for the whole site (brand gradient on the dark
// background used by the landing page).
export const alt = "AI-Website — AI app builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(251, 146, 60, 0.18), transparent 50%), #0A0A0F",
          color: "white",
          padding: 80,
          textAlign: "center"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)",
            color: "#0A0A0F",
            fontSize: 52,
            fontWeight: 800,
            marginBottom: 40
          }}
        >
          AI
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-2px" }}>
          AI-Website
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#D4D4D8",
            marginTop: 24,
            maxWidth: 900
          }}
        >
          Turn ideas into full-stack web applications in seconds.
        </div>
      </div>
    ),
    { ...size }
  );
}
