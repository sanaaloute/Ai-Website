import { cn } from '@/lib/cn';
import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'default' | 'elevated' | 'ghost' | 'highlight';
}

export function Card({
  children,
  className,
  style,
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border',
        variant === 'default' && 'border-gray-200 bg-white',
        variant === 'elevated' && 'border-gray-200 bg-white shadow-sm',
        variant === 'ghost' && 'border-transparent bg-gray-50',
        variant === 'highlight' && 'border-gray-900 bg-gray-900 text-white',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}
