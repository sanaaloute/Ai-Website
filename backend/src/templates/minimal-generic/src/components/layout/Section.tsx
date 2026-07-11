import { cn } from '@/lib/cn';
import { Container } from '@/components/ui/Container';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  withContainer?: boolean;
}

const paddingMap = {
  none: 'py-0',
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-20',
  xl: 'py-28',
};

export function Section({ children, className, padding = 'lg', withContainer = true }: SectionProps) {
  return (
    <section className={cn(paddingMap[padding], className)}>
      {withContainer ? <Container>{children}</Container> : children}
    </section>
  );
}
