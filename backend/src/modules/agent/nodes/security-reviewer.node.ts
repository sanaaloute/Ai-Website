import { AgentState } from '../state';
import { GraphDependencies } from '../graph';

interface SecurityPattern {
  name: string;
  severity: 'critical' | 'high' | 'medium';
  regex: string;
}

export const PATTERNS: SecurityPattern[] = [
  {
    name: 'dangerouslySetInnerHTML',
    severity: 'critical',
    regex: 'dangerouslySetInnerHTML',
  },
  {
    name: 'eval() call',
    severity: 'critical',
    regex: '\\beval\\s*\\(',
  },
  {
    name: 'new Function()',
    severity: 'critical',
    regex: 'new\\s+Function\\s*\\(',
  },
  {
    name: 'innerHTML assignment',
    severity: 'high',
    regex: '\\.innerHTML\\s*=',
  },
  {
    name: 'document.write',
    severity: 'high',
    regex: 'document\\.write\\s*\\(',
  },
  {
    name: 'potential hardcoded secret',
    severity: 'medium',
    regex: '(api[_-]?key|password|secret|token)\\s*[:=]\\s*["\'][^"\']+["\']',
  },
];

export interface SecurityReviewResult {
  securityIssues: string[];
  lastVerificationStage?: string;
  verificationFailures?: string[];
  messages: Array<{ role: string; content: string }>;
}

export async function runSecurityReview(
  state: AgentState,
  deps: GraphDependencies,
): Promise<SecurityReviewResult> {
  const sandboxId = state.sandboxId;
  const issues: string[] = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running security audit...' },
    });

    // Run all grep checks concurrently. Each pattern is written to its own temp
    // file so the regex is not shell-escaped.
    const results = await Promise.all(
      PATTERNS.map(async (pattern, i) => {
        const patternFile = `/tmp/security-pattern-${i}.txt`;
        await deps.e2b.writeFile(sandboxId, patternFile, pattern.regex);

        const res = await deps.e2b.runCommand(
          sandboxId,
          `grep -R -n -E -f ${patternFile} src/ --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' || true`,
          '/home/user/app',
        );
        if (res.output.trim()) {
          const lines = res.output.split('\n').filter(Boolean).slice(0, 20);
          return `[${pattern.severity}] ${pattern.name} found in:\n${lines.join('\n')}`;
        }
        return null;
      }),
    );

    for (const issue of results) {
      if (issue) issues.push(issue);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.error(`Security reviewer failed: ${message}`);
    issues.push(`Security audit system error: ${message}`);
  }

  return {
    securityIssues: issues,
    lastVerificationStage: issues.length > 0 ? 'security_reviewer' : undefined,
    verificationFailures: issues.map((i) => `security_reviewer: ${i}`),
    messages: [{ role: 'assistant', content: `Security review: ${issues.length} issues` }],
  };
}

export async function securityReviewerNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const result = await runSecurityReview(state, deps);

  const nextFailures = result.securityIssues.length
    ? [...(state.verificationFailures ?? []), ...result.securityIssues.map((i) => `security_reviewer: ${i}`)].slice(-20)
    : state.verificationFailures;

  return {
    ...result,
    verificationFailures: nextFailures,
  };
}
