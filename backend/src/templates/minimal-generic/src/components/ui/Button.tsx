import { cn } from '@/lib/cn';
import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  asChild = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
    outline:
      'border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-500',
    ghost:
      'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-500',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    link: 'bg-transparent text-gray-900 underline-offset-4 hover:underline focus-visible:ring-gray-500',
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2 text-sm',
    lg: 'h-11 px-6 py-3 text-base',
    icon: 'h-10 w-10 p-2',
  };

  const computedClassName = cn(
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    variant === 'link' && sizes[size].replace(/h-\d+/, ''),
    className,
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cn(computedClassName, (children.props as { className?: string }).className),
      disabled: disabled || loading,
      ...props,
    });
  }

  return (
    <button
      className={computedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
