// Style conversion and manipulation utilities

interface SpacingValues {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
}

interface StyleObject {
  margin?: { left?: string; right?: string; top?: string; bottom?: string };
  padding?: { left?: string; right?: string; top?: string; bottom?: string };
  dimensions?: { width?: string; height?: string };
  border?: { width?: string; radius?: string; color?: string };
  backgroundColor?: string;
  text?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    fontFamily?: string;
  };
}

function convertSpacingToTailwind(values: SpacingValues, prefix: 'm' | 'p'): string[] {
  const classes: string[] = [];
  const { left, right, top, bottom } = values;

  const hasHorizontal = left !== undefined && right !== undefined;
  const hasVertical = top !== undefined && bottom !== undefined;

  if (
    hasHorizontal &&
    hasVertical &&
    left === right &&
    top === bottom &&
    left === top
  ) {
    classes.push(`${prefix}-[${left}]`);
  } else {
    const horizontalValue = hasHorizontal && left === right ? left : null;
    const verticalValue = hasVertical && top === bottom ? top : null;

    if (
      horizontalValue !== null &&
      verticalValue !== null &&
      horizontalValue === verticalValue
    ) {
      classes.push(`${prefix}-[${horizontalValue}]`);
    } else {
      if (hasHorizontal && left === right) {
        classes.push(`${prefix}x-[${left}]`);
      } else {
        if (left !== undefined) classes.push(`${prefix}l-[${left}]`);
        if (right !== undefined) classes.push(`${prefix}r-[${right}]`);
      }

      if (hasVertical && top === bottom) {
        classes.push(`${prefix}y-[${top}]`);
      } else {
        if (top !== undefined) classes.push(`${prefix}t-[${top}]`);
        if (bottom !== undefined) classes.push(`${prefix}b-[${bottom}]`);
      }
    }
  }

  return classes;
}

function stylesToTailwind(styles: StyleObject): string[] {
  const classes: string[] = [];

  if (styles.margin) {
    classes.push(...convertSpacingToTailwind(styles.margin, 'm'));
  }

  if (styles.padding) {
    classes.push(...convertSpacingToTailwind(styles.padding, 'p'));
  }

  if (styles.border) {
    if (styles.border.width !== undefined) classes.push(`border-[${styles.border.width}]`);
    if (styles.border.radius !== undefined) classes.push(`rounded-[${styles.border.radius}]`);
    if (styles.border.color !== undefined) classes.push(`border-[${styles.border.color}]`);
  }

  if (styles.backgroundColor !== undefined) {
    classes.push(`bg-[${styles.backgroundColor}]`);
  }

  if (styles.dimensions) {
    if (styles.dimensions.width !== undefined) classes.push(`w-[${styles.dimensions.width}]`);
    if (styles.dimensions.height !== undefined) classes.push(`h-[${styles.dimensions.height}]`);
  }

  if (styles.text) {
    if (styles.text.fontSize !== undefined) classes.push(`text-[${styles.text.fontSize}]`);
    if (styles.text.fontWeight !== undefined) classes.push(`font-[${styles.text.fontWeight}]`);
    if (styles.text.color !== undefined) classes.push(`[color:${styles.text.color}]`);
    if (styles.text.fontFamily !== undefined) {
      const fontFamilyValue = styles.text.fontFamily.replace(/\s/g, '_');
      classes.push(`font-[${fontFamilyValue}]`);
    }
  }

  return classes;
}

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

function extractClassPrefixes(classes: string[]): string[] {
  return Array.from(
    new Set(
      classes.map((cls) => {
        const arbitraryMatch = cls.match(/^\[([a-z-]+):/);
        if (arbitraryMatch) {
          return `[${arbitraryMatch[1]}:`;
        }

        if (cls.startsWith('font-[')) {
          const value = cls.match(/^font-\[([^\]]+)\]/);
          if (value) {
            const isNumeric = /^\d+$/.test(value[1]);
            return isNumeric ? 'font-weight-' : 'font-family-';
          }
        }

        if (cls.startsWith('text-')) {
          const sizeMatch = cls.match(
            /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/
          );
          if (sizeMatch) {
            return 'text-size-';
          }
          if (cls.match(/^text-\[[\d.]+[a-z]+\]$/)) {
            return 'text-size-';
          }
        }

        const match = cls.match(/^([a-z]+[-])/);
        return match ? match[1] : `${cls.split('-')[0]}-`;
      })
    )
  );
}
