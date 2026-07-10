import Navbar from "@/components/landing/Navbar";
import PromptInput from "@/components/landing/PromptInput";
import HowItWorks from "@/components/landing/HowItWorks";
import Download from "@/components/landing/Download";
import Footer from "@/components/landing/Footer";
import HomePageTitle from "@/components/landing/HomePageTitle";

export default function HomePageContent() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      {/* Clears fixed navbar */}
      <div aria-hidden className="h-16 sm:h-[4.2rem]" />

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 pb-20 pt-8 sm:px-6 md:px-8 lg:px-10">
        {/* Hero: prompt input + templates */}
        <section
          aria-label="Start building"
          className="flex w-full flex-col items-center justify-center pt-8 sm:pt-12 md:min-h-[calc(100svh-8rem)] md:pt-16 md:pb-8"
        >
          <HomePageTitle />
          <PromptInput />
        </section>

        {/* How it works */}
        <section className="mt-16 scroll-mt-24">
          <HowItWorks />
        </section>

        {/* Download */}
        <section id="download" className="mt-16 scroll-mt-24">
          <Download />
        </section>
      </div>

      <Footer />
    </main>
  );
}
