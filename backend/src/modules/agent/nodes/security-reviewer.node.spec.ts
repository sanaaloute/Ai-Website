import { PATTERNS } from './security-reviewer.node';

function patternMatches(patternName: string, code: string): boolean {
  const pattern = PATTERNS.find((p) => p.name === patternName);
  if (!pattern) throw new Error(`Unknown pattern: ${patternName}`);
  const regex = new RegExp(pattern.regex);
  return regex.test(code);
}

describe('Security pattern regexes', () => {
  it('detects dangerouslySetInnerHTML', () => {
    expect(patternMatches('dangerouslySetInnerHTML', '<div dangerouslySetInnerHTML={{ __html: x }} />')).toBe(true);
    expect(patternMatches('dangerouslySetInnerHTML', '<div>{x}</div>')).toBe(false);
  });

  it('detects eval() calls', () => {
    expect(patternMatches('eval() call', 'eval(userInput)')).toBe(true);
    expect(patternMatches('eval() call', 'evaluate(userInput)')).toBe(false);
  });

  it('detects new Function()', () => {
    expect(patternMatches('new Function()', 'new Function("return 1")')).toBe(true);
    expect(patternMatches('new Function()', 'new Fn()')).toBe(false);
  });

  it('detects innerHTML assignments', () => {
    expect(patternMatches('innerHTML assignment', 'el.innerHTML = html')).toBe(true);
    expect(patternMatches('innerHTML assignment', 'el.textContent = html')).toBe(false);
  });

  it('detects document.write', () => {
    expect(patternMatches('document.write', 'document.write(html)')).toBe(true);
    expect(patternMatches('document.write', 'console.write(html)')).toBe(false);
  });

  it('detects hardcoded secrets', () => {
    expect(patternMatches('potential hardcoded secret', 'const api_key = "secret123"')).toBe(true);
    expect(patternMatches('potential hardcoded secret', "const api_key = 'secret123'")).toBe(true);
    expect(patternMatches('potential hardcoded secret', 'const api_key = process.env.API_KEY')).toBe(false);
  });
});
