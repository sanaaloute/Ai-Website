import { validatePlan } from './pre-flight-validator.node';

describe('validatePlan', () => {
  it('accepts valid steps and src files', () => {
    const { errors, warnings } = validatePlan(
      ['Create src/components/Hero.tsx', 'Update src/pages/Home.tsx'],
      ['src/components/Hero.tsx', 'src/lib/routes.ts'],
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('rejects forbidden path patterns', () => {
    const { errors } = validatePlan([], ['../etc/passwd', 'src/../foo.tsx', 'node_modules/x']);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('forbidden path'))).toBe(true);
  });

  it('rejects forbidden step patterns', () => {
    const { errors } = validatePlan(['Run rm -rf /', 'Use sudo to install packages'], []);
    expect(errors.length).toBe(2);
    expect(errors.some((e) => e.includes('forbidden pattern'))).toBe(true);
  });

  it('warns about newFiles outside src/public', () => {
    const { warnings } = validatePlan(['Create src/App.tsx'], ['config/secrets.ts']);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('outside src/ or public/');
  });

  it('allows known root config files', () => {
    const { errors, warnings } = validatePlan([], ['package.json', 'components.json', 'design.json']);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('warns when plan is empty', () => {
    const { warnings } = validatePlan([], []);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('no steps and no new files');
  });
});
