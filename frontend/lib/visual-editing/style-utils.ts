// Style conversion and manipulation utilities

export function rgbToHex(rgb: string): string {
  if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
  const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return rgb || '#000000';
}

export function processNumericValue(value: string): string {
  return /^\d+$/.test(value) ? `${value}px` : value;
}
