import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("terms.title"),
  };
}

export default function TermsPage() {
  const t = useTranslations("legal");
  return (
    <LegalPage titleKey="terms">
      <section>
        <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
        <p className="mt-2 text-zinc-300">
          By accessing or using AI-Website (the “Service”), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, do not use the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. Description of Service</h2>
        <p className="mt-2 text-zinc-300">
          AI-Website is an AI-powered platform that helps users generate, build, and deploy web applications.
          We may update, modify, or discontinue features at any time without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. User Accounts</h2>
        <p className="mt-2 text-zinc-300">
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activities that occur under your account. You must provide accurate and complete information when
          creating an account and keep that information up to date.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Acceptable Use</h2>
        <p className="mt-2 text-zinc-300">
          You may not use the Service to create, host, or distribute content that is illegal, infringing,
          defamatory, fraudulent, harmful, or otherwise objectionable. You may not reverse-engineer, scrape,
          abuse APIs, or interfere with the operation of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">5. Intellectual Property</h2>
        <p className="mt-2 text-zinc-300">
          AI-Website retains all rights, title, and interest in the Service and its underlying technology.
          You retain ownership of the content you create using the Service. We grant you a limited, revocable,
          non-exclusive license to use the Service in accordance with these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">6. Payments and Subscriptions</h2>
        <p className="mt-2 text-zinc-300">
          Some features of the Service require payment. Subscriptions are billed in advance on a recurring
          basis. You authorize us to charge your selected payment method. You may cancel your subscription
          at any time from your account or billing portal; cancellation takes effect at the end of the
          current billing period. All fees are non-refundable unless otherwise required by law. See our{" "}
          <a href="/refund-policy" className="underline hover:text-white">Refund Policy</a> for details.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">7. Termination</h2>
        <p className="mt-2 text-zinc-300">
          We may suspend or terminate your access to the Service at any time, with or without notice, for
          violation of these terms or any other reason. Upon termination, your right to use the Service
          immediately ceases.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">8. Disclaimer of Warranties</h2>
        <p className="mt-2 text-zinc-300">
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
          OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, OR NON-INFRINGEMENT.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">9. Limitation of Liability</h2>
        <p className="mt-2 text-zinc-300">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, AI-Website AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND
          AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
          DAMAGES, INCLUDING LOST PROFITS, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">10. Governing Law</h2>
        <p className="mt-2 text-zinc-300">
          These terms shall be governed by and construed in accordance with the laws of the jurisdiction in
          which AI-Website is established, without regard to conflict of law principles. Any disputes shall
          be resolved in the courts of that jurisdiction.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">11. Changes to These Terms</h2>
        <p className="mt-2 text-zinc-300">
          We may revise these terms from time to time. The most current version will be posted on this page.
          Continued use of the Service after changes constitutes acceptance of the revised terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">12. Contact</h2>
        <p className="mt-2 text-zinc-300">
          If you have any questions about these Terms of Service, please contact us through the contact
          information provided on the Service.
        </p>
      </section>
    </LegalPage>
  );
}
