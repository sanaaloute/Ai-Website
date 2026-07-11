'use client';

import type { ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';

interface StylePopoverProps {
  icon: ReactNode;
  title: string;
  tooltip: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function StylePopover({
  icon,
  title,
  tooltip,
  children,
  side = 'bottom'
}: StylePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-[#7f22fe] hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700"
          aria-label={tooltip}
          title={tooltip}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-64">
        <div className="space-y-3">
          <h4 className="text-sm font-medium" style={{ color: '#7f22fe' }}>
            {title}
          </h4>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
}
