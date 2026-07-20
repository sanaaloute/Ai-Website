import { Annotation } from '@langchain/langgraph';
import { PromptContent } from '@/types';
import { AiCredential } from '@/lib/llm-providers';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: string;
}

export interface FileWritten {
  path: string;
  status: string;
  content?: string;
  error?: string;
}

export interface DatabaseCollectionStatus {
  name: string;
  exists: boolean;
  recordCount: number;
  seeded: number;
}

export interface DatabaseStatus {
  checked: boolean;
  collections: DatabaseCollectionStatus[];
  allExist: boolean;
  dataAvailable: boolean;
  message: string;
}

export interface ColorToken {
  name: string;
  value: string;
  usage: string;
}

export interface TypographySpec {
  headingFont: string;
  bodyFont: string;
  monoFont?: string;
  scale: 'small' | 'base' | 'large';
}

export interface SpacingSpec {
  base: number;
  density: 'compact' | 'normal' | 'spacious';
}

export interface BreakpointSpec {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface DesignSpec {
  brandName?: string;
  mood: string;
  colorPalette: {
    primary: ColorToken;
    secondary: ColorToken;
    accent: ColorToken;
    background: ColorToken;
    foreground: ColorToken;
    muted: ColorToken;
    border: ColorToken;
    dark?: Record<string, ColorToken>;
  };
  typography: TypographySpec;
  spacing: SpacingSpec;
  radii: string;
  shadows: 'none' | 'soft' | 'medium' | 'strong';
  breakpoints: BreakpointSpec;
  animationStyle: 'minimal' | 'subtle' | 'playful' | 'dramatic';
  darkMode: boolean;
  components: {
    preferred: string[];
    avoid: string[];
  };
  rules: string[];
}

export interface PackageFailure {
  package: string;
  error: string;
}

/**
 * Retry budgets for the two corrective loops. Deliberately separate counters:
 * the reviewer↔debugger loop (reviewRetryCount) and the verification→executor
 * loop (retryCount) each get their own budget — a run that spends retries on
 * review failures must not starve the verification loop (and vice versa).
 */
export const MAX_REVIEW_RETRIES = 3;
export const MAX_VERIFICATION_RETRIES = 3;

export const AgentStateAnnotation = Annotation.Root({
  // Input
  prompt: Annotation<PromptContent>,
  sandboxId: Annotation<string>,
  projectId: Annotation<string | undefined>,
  userId: Annotation<string | undefined>,
  chatHistory: Annotation<ChatMessage[]>(),
  aiCredentials: Annotation<AiCredential[]>,

  // Workflow & Category
  workflow: Annotation<'new_app' | 'edit' | 'debug' | 'chat' | 'review_fix' | undefined>,
  websiteCategory: Annotation<string | undefined>,
  websiteType: Annotation<string | undefined>,
  templateId: Annotation<string | undefined>,
  templateLoaded: Annotation<boolean | undefined>,

  // User Integrations
  needsIntegration: Annotation<string | null | undefined>,
  userPocketbaseConnected: Annotation<boolean | undefined>,
  dbSchemaTemplate: Annotation<Record<string, unknown> | undefined>,

  /**
   * Contents of the template's key files (App, routes, Home, layout), captured
   * at template-selection time and injected into the executor's first-pass
   * context so the model doesn't burn tool-loop iterations re-reading them.
   */
  templateDigest: Annotation<Record<string, string> | undefined>(),

  // Design system
  designSpec: Annotation<DesignSpec | undefined>(),
  // Database readiness
  databaseStatus: Annotation<DatabaseStatus | undefined>,
  databaseReady: Annotation<boolean | undefined>,

  // Orchestration
  retryCount: Annotation<number>(),
  reviewRetryCount: Annotation<number>(),
  executorLoopCount: Annotation<number>(),
  lastVerificationStage: Annotation<string | undefined>(),
  verificationFailures: Annotation<string[] | undefined>(),
  needsClarification: Annotation<boolean | undefined>,
  clarificationQuestions: Annotation<string[] | undefined>,

  // Caching / performance
  previewHealthy: Annotation<boolean | undefined>,
  routesSource: Annotation<string | undefined>,

  // Analyzer output
  intent: Annotation<string | undefined>,
  scope: Annotation<string | undefined>,
  relevantFiles: Annotation<string[] | undefined>,

  // Bug Analysis
  bugErrorType: Annotation<string | undefined>,
  bugAffectedFiles: Annotation<string[] | undefined>,
  bugRootCause: Annotation<string | undefined>,

  // Planner output
  planSummary: Annotation<string | undefined>,
  planSteps: Annotation<string[] | undefined>,
  planDesign: Annotation<string | undefined>,
  planNewFiles: Annotation<string[] | undefined>,
  todos: Annotation<TodoItem[] | undefined>,

  // Pre-flight Validator output
  planValid: Annotation<boolean | undefined>,
  planErrors: Annotation<string[] | undefined>,
  planWarnings: Annotation<string[] | undefined>,

  // Execution
  filesWritten: Annotation<FileWritten[] | undefined>,
  packagesInstalled: Annotation<string[] | undefined>,
  packagesToInstall: Annotation<string[] | undefined>,
  packagesFailed: Annotation<PackageFailure[] | undefined>,
  componentsToInstall: Annotation<string[] | undefined>(),

  // Type checking
  typeCheckPassed: Annotation<boolean | undefined>,
  typeCheckErrors: Annotation<string[] | undefined>,

  // Reviewer output
  visualIssues: Annotation<string[] | undefined>(),
  functionalIssues: Annotation<string[] | undefined>(),
  a11yIssues: Annotation<string[] | undefined>(),
  e2eFailures: Annotation<string[] | undefined>(),
  e2eTestsWritten: Annotation<string[] | undefined>(),
  securityIssues: Annotation<string[] | undefined>(),
  seoGenerated: Annotation<boolean | undefined>(),
  // Fresh (current-round) SEO failures. Kept separate from the accumulated
  // `verificationFailures` history so routing never reacts to stale entries.
  seoIssues: Annotation<string[] | undefined>(),
  screenshots: Annotation<Array<{ path: string; route: string }> | undefined>(),
  reviewPassed: Annotation<boolean | undefined>,
  reviewIssues: Annotation<string[] | undefined>,
  reviewSuggestions: Annotation<string[] | undefined>,
  reviewTodos: Annotation<TodoItem[] | undefined>,

  // Debugger output
  debugFixed: Annotation<boolean | undefined>,
  debugRemainingErrors: Annotation<string[] | undefined>,

  // Chat
  chatAnswer: Annotation<string | undefined>,

  // Finalization
  previewUrl: Annotation<string | undefined>,
  summary: Annotation<string | undefined>,

  // Error handling
  error: Annotation<string | undefined>,

  // Streaming / messaging
  messages: Annotation<ChatMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;

export interface AgentEvent {
  type: string;
  data: Record<string, unknown>;
}
