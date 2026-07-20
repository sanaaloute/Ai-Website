import type { Metadata } from "next";

// The page itself is a client component, so metadata lives in this layout.
export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
