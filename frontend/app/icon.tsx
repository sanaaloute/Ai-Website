import { ImageResponse } from "next/og";

// Generated favicon/app icon (brand amber gradient, matches tailwind primary).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)",
          color: "#0A0A0F",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          borderRadius: 7
        }}
      >
        AI
      </div>
    ),
    { ...size }
  );
}
