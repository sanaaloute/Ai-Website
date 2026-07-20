import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "AI-Website is an AI app builder that turns ideas into full-stack web applications in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0F",
    theme_color: "#F59E0B",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "/icon",
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "any",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
