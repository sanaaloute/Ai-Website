import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";
import { canonicalAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("privacy.title"),
    description: t("privacy.description"),
    alternates: canonicalAlternates(locale, "/privacy"),
  };
}

export default function PrivacyPage() {
  return (
    <LegalPage titleKey="privacy">
      <section>
        <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
        <p className="mt-2 text-zinc-300">
          We collect information you provide directly to us, such as your name, email address, and payment
          information. We also collect information automatically, including IP addresses, browser types,
          device information, and usage data through cookies and similar technologies.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
        <p className="mt-2 text-zinc-300">
          We use the information we collect to provide, maintain, and improve the Service; to process
          transactions; to communicate with you; to provide customer support; and to comply with legal
          obligations.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. Legal Basis for Processing</h2>
        <p className="mt-2 text-zinc-300">
          We process your personal information based on your consent, the performance of our contract with
          you, compliance with legal obligations, and our legitimate interests in operating and improving
          the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Cookies and Tracking</h2>
        <p className="mt-2 text-zinc-300">
          We use cookies and similar technologies to operate the Service, remember your preferences,
          analyze usage, and improve your experience. You can manage cookie preferences through your
          browser settings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">5. Third-Party Services</h2>
        <p className="mt-2 text-zinc-300">
          We use third-party service providers to process payments (Paddle), host infrastructure, and analyze
          usage. These providers have access to personal information only as needed to perform their
          services and are contractually obligated to protect it. Paddle processes payment information as
          our merchant of record.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">6. Data Retention</h2>
        <p className="mt-2 text-zinc-300">
          We retain your personal information for as long as necessary to provide the Service and fulfill
          the purposes described in this policy, or as required by law. When information is no longer
          needed, we delete or anonymize it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">7. Your Rights</h2>
        <p className="mt-2 text-zinc-300">
          Depending on your jurisdiction, you may have the right to access, correct, delete, or restrict the
          processing of your personal information. To exercise these rights, contact us using the
          information provided on the Service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">8. Security</h2>
        <p className="mt-2 text-zinc-300">
          We implement reasonable administrative, technical, and physical safeguards to protect your
          personal information. However, no method of transmission over the Internet or electronic storage
          is completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">9. Children’s Privacy</h2>
        <p className="mt-2 text-zinc-300">
          The Service is not intended for individuals under the age of 18 (or the age of majority in your
          jurisdiction). We do not knowingly collect personal information from children.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">10. International Transfers</h2>
        <p className="mt-2 text-zinc-300">
          Your information may be transferred to and processed in countries other than your country of
          residence. By using the Service, you consent to such transfers.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">11. Changes to This Privacy Policy</h2>
        <p className="mt-2 text-zinc-300">
          We may update this Privacy Policy from time to time. The updated version will be posted on this
          page with a revised “Last updated” date.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">12. Contact</h2>
        <p className="mt-2 text-zinc-300">
          If you have any questions about this Privacy Policy or our data practices, please contact us
          through the contact information provided on the Service.
        </p>
      </section>
    </LegalPage>
  );
}
