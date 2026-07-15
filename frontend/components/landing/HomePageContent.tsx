import Navbar from "@/components/landing/Navbar";
import PromptInput from "@/components/landing/PromptInput";
import Footer from "@/components/landing/Footer";
import HomePageTitle from "@/components/landing/HomePageTitle";

export default function HomePageContent() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      {/* Clears fixed navbar */}
      <div aria-hidden className="h-16 sm:h-[4.2rem]" />

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 sm:px-6 md:px-8 lg:px-10">
        {/* Hero: title + prompt input */}
        <section
          aria-label="Start building"
          className="flex w-full flex-1 flex-col items-center justify-center py-8"
        >
          <HomePageTitle />
          <PromptInput />
        </section>
      </div>

      <Footer />
    </main>
  );
}
