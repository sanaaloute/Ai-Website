"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATTERNS = void 0;
exports.securityReviewerNode = securityReviewerNode;
exports.PATTERNS = [
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
async function securityReviewerNode(state, deps) {
    const sandboxId = state.sandboxId;
    const issues = [];
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Running security audit...' },
        });
        for (let i = 0; i < exports.PATTERNS.length; i++) {
            const pattern = exports.PATTERNS[i];
            const patternFile = `/tmp/security-pattern-${i}.txt`;
            await deps.e2b.writeFile(sandboxId, patternFile, pattern.regex);
            const res = await deps.e2b.runCommand(sandboxId, `grep -R -n -E -f ${patternFile} src/ --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' || true`, '/home/user/app');
            if (res.output.trim()) {
                const lines = res.output.split('\n').filter(Boolean).slice(0, 20);
                issues.push(`[${pattern.severity}] ${pattern.name} found in:\n${lines.join('\n')}`);
            }
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error(`Security reviewer failed: ${message}`);
        issues.push(`Security audit system error: ${message}`);
    }
    return {
        securityIssues: issues,
        lastVerificationStage: issues.length > 0 ? 'security_reviewer' : undefined,
        verificationFailures: issues.length
            ? [...(state.verificationFailures ?? []), ...issues.map((i) => `security_reviewer: ${i}`)].slice(-20)
            : state.verificationFailures,
        messages: [{ role: 'assistant', content: `Security review: ${issues.length} issues` }],
    };
}
//# sourceMappingURL=security-reviewer.node.js.map