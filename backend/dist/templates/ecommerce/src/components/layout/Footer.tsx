import { footerSocial, footerLegalLinks } from '@/lib/constants';
import { useSettings } from '@/lib/settings';
import { Container } from '@/components/ui/Container';

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="border-t border-gray-200 py-12">
      <Container>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} {settings.name}. All rights reserved.
            </p>
            {settings.footerText && (
              <p className="mt-1 max-w-md text-sm text-gray-500">{settings.footerText}</p>
            )}
          </div>
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
