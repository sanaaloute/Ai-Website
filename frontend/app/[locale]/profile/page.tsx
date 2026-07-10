import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import UserProfile from "@/components/landing/UserProfile";

export default function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <div aria-hidden className="h-24 sm:h-28" />
      <UserProfile />
      <Footer />
    </main>
  );
}
