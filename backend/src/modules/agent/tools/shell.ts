/**
 * Quote a string for safe inclusion in a POSIX shell command.
 * Wraps in single quotes and escapes embedded single quotes (' → '\'').
 * Single-quoted strings undergo no expansion, so this neutralizes
 * $variables, backticks, globs, semicolons, and spaces.
 */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
