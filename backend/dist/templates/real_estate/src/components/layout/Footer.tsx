import { siteConfig, footerSocial, footerLegalLinks } from '@/lib/constants';
import { Container } from '@/components/ui/Container';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12">
      <Container>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-600">
            {footerSocial.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-gray-900">
                {link.label}
              </a>
            ))}
            {footerLegalLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-gray-900">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
