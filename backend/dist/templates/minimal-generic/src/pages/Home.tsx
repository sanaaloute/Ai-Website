import { Container } from '@/components/ui/Container';
import { Section } from '@/components/layout/Section';

export default function Home() {
  return (
    <Section>
      <Container>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Welcome
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Your LoveCode app is ready.
        </p>
      </Container>
    </Section>
  );
}
