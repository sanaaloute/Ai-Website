import { useState, useCallback, useRef } from 'react';

export type ApplyPipelineState =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'finalizing'
  | 'succeeded'
  | 'failed';

const APPLY_PIPELINE_TRANSITIONS: Record<ApplyPipelineState, ApplyPipelineState[]> = {
  idle: ['connecting'],
  connecting: ['streaming', 'failed'],
  streaming: ['finalizing', 'failed'],
  finalizing: ['succeeded', 'failed'],
  succeeded: ['idle'],
  failed: ['idle'],
};

export interface GenerationFile {
  path: string;
  content: string;
  type: string;
  completed: boolean;
  edited?: boolean;
}

export interface GenerationTodoItem {
  label: string;
  done: boolean;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: 'text' | 'radio' | 'checkbox';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface PlanData {
  title: string;
  summary: string;
  plan: string;
}

export interface AgentStep {
  id: string;
  node: string;
  kind: 'thinking' | 'code';
  label: string;
  text: string;
  done: boolean;
}

export interface GenerationProgress {
  isGenerating: boolean;
  status: string;
  components: Array<{ name: string; path: string; completed: boolean }>;
  currentComponent: number;
  streamedCode: string;
  isStreaming: boolean;
  isThinking: boolean;
  thinkingText?: string;
  thinkingDuration?: number;
  currentFile?: { path: string; content: string; type: string };
  files: GenerationFile[];
  lastProcessedPosition: number;
  isEdit?: boolean;
  estimatedPercent: number;
  todoList: GenerationTodoItem[];
  questionnaire: {
    questions: QuestionnaireQuestion[];
  } | null;
  plan: PlanData | null;
  exitPlan: boolean;
  reviewMaxReached?: boolean;
  reviewMaxIssues?: string[];
  reviewMaxTodos?: Array<{ id: string; content: string; status: string }>;
  agentSteps?: AgentStep[];
}

export interface CodeApplicationState {
  stage: 'analyzing' | 'installing' | 'applying' | 'complete' | null;
  message?: string;
  packages?: string[];
  installedPackages?: string[];
  filesGenerated?: string[];
  currentFile?: string;
  deadlineAt?: number;
}

export function useGenerationProgress() {
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    isGenerating: false,
    status: '',
    components: [],
    currentComponent: 0,
    streamedCode: '',
    isStreaming: false,
    isThinking: false,
    thinkingText: undefined,
    thinkingDuration: undefined,
    files: [],
    lastProcessedPosition: 0,
    estimatedPercent: 0,
    todoList: [],
    questionnaire: null,
    plan: null,
    exitPlan: false,
    reviewMaxReached: false,
    reviewMaxIssues: [],
    reviewMaxTodos: [],
  });

  const [generationTaskStartedAtMs, setGenerationTaskStartedAtMs] = useState<number | null>(null);
  const [generationProgressNowMs, setGenerationProgressNowMs] = useState<number>(0);
  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({ stage: null });

  const applyPipelineStateRef = useRef<ApplyPipelineState>('idle');

  const transitionApplyPipelineState = useCallback(
    (next: ApplyPipelineState, reason: string): boolean => {
      const prev = applyPipelineStateRef.current;
      if (prev === next) return true;
      const allowed = APPLY_PIPELINE_TRANSITIONS[prev] || [];
      if (!allowed.includes(next)) {
        console.warn(`[apply-pipeline] Invalid transition ${prev} -> ${next} (${reason})`);
        return false;
      }
      applyPipelineStateRef.current = next;
      return true;
    },
    []
  );

  const resetGenerationProgress = useCallback(() => {
    setGenerationProgress({
      isGenerating: false,
      status: '',
      components: [],
      currentComponent: 0,
      streamedCode: '',
      isStreaming: false,
      isThinking: false,
      thinkingText: undefined,
      thinkingDuration: undefined,
      files: [],
      lastProcessedPosition: 0,
      estimatedPercent: 0,
      todoList: [],
      questionnaire: null,
      plan: null,
      exitPlan: false,
      reviewMaxReached: false,
      reviewMaxIssues: [],
      reviewMaxTodos: [],
    });
  }, []);

  const resetApplyPipeline = useCallback(() => {
    applyPipelineStateRef.current = 'idle';
    setCodeApplicationState({ stage: null });
  }, []);

  return {
    // State
    generationProgress,
    setGenerationProgress,
    generationTaskStartedAtMs,
    setGenerationTaskStartedAtMs,
    generationProgressNowMs,
    setGenerationProgressNowMs,
    codeApplicationState,
    setCodeApplicationState,
    applyPipelineStateRef,
    // Actions
    transitionApplyPipelineState,
    resetGenerationProgress,
    resetApplyPipeline,
  };
}
