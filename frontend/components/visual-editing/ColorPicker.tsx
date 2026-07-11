'use client';

import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ id, value, onChange, className = '' }: ColorPickerProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        id={id}
        type="color"
        className="h-8 w-12 cursor-pointer p-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Input
        type="text"
        placeholder="#000000"
        className="h-8 flex-1 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
