import { mainNav } from '@/lib/constants';
import { useSettings } from '@/lib/settings';
import { Container } from '@/components/ui/Container';

export function Header() {
  const { settings } = useSettings();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="text-lg font-semibold">
            {settings.name}
          </a>
          <nav className="hidden gap-6 text-sm sm:flex">
            {mainNav.map((item) => (
              <a key={item.label} href={item.href} className="text-gray-600 hover:text-gray-900">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </Container>
    </header>
  );
}
