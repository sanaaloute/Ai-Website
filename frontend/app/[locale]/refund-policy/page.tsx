import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("refund.title"),
  };
}

export default function RefundPolicyPage() {
  return (
    <LegalPage titleKey="refund">
      <section>
        <h2 className="text-lg font-semibold text-white">1. No Refunds</h2>
        <p className="mt-2 text-zinc-300">
          All payments made for subscriptions and one-time purchases on AI-Website are final and
          non-refundable. Once you subscribe or purchase a product, you are not entitled to a refund for
          any reason, including but not limited to change of mind, dissatisfaction with the Service, or
          non-use.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">2. Cancel Anytime</h2>
        <p className="mt-2 text-zinc-300">
          You may cancel your subscription at any time through your account or the billing portal. After
          cancellation, you will continue to have access to the paid features until the end of your current
          billing period. No further charges will be made after cancellation.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">3. No Prorated Refunds</h2>
        <p className="mt-2 text-zinc-300">
          We do not provide prorated refunds or credits for partial months or unused portions of your
          subscription. If you cancel halfway through a billing period, you retain access until the period
          ends.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">4. Billing Errors</h2>
        <p className="mt-2 text-zinc-300">
          In the rare event of a demonstrable billing error caused by us (for example, a duplicate charge or
          an incorrect amount), please contact us promptly. If we confirm the error, we may, at our sole
          discretion, issue a correction or credit.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">5. Changes to This Policy</h2>
        <p className="mt-2 text-zinc-300">
          We may update this Refund Policy from time to time. The current version will be posted on this
          page with a revised “Last updated” date.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">6. Contact</h2>
        <p className="mt-2 text-zinc-300">
          If you have questions about this Refund Policy, please contact us through the contact information
          provided on the Service.
        </p>
      </section>
    </LegalPage>
  );
}
