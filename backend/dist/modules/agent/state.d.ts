import { PromptContent } from "../../types";
import { AiCredential } from "../../lib/llm-providers";
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
export declare const AgentStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    prompt: {
        (annotation: import("@langchain/langgraph").SingleReducer<PromptContent, PromptContent>): import("@langchain/langgraph").BaseChannel<PromptContent, PromptContent | import("@langchain/langgraph").OverwriteValue<PromptContent>, unknown>;
        (): import("@langchain/langgraph").LastValue<PromptContent>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    sandboxId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    projectId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    userId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    chatHistory: import("@langchain/langgraph").LastValue<ChatMessage[]>;
    aiCredentials: {
        (annotation: import("@langchain/langgraph").SingleReducer<AiCredential[], AiCredential[]>): import("@langchain/langgraph").BaseChannel<AiCredential[], AiCredential[] | import("@langchain/langgraph").OverwriteValue<AiCredential[]>, unknown>;
        (): import("@langchain/langgraph").LastValue<AiCredential[]>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    workflow: {
        (annotation: import("@langchain/langgraph").SingleReducer<"new_app" | "edit" | "debug" | "chat" | "review_fix" | undefined, "new_app" | "edit" | "debug" | "chat" | "review_fix" | undefined>): import("@langchain/langgraph").BaseChannel<"new_app" | "edit" | "debug" | "chat" | "review_fix" | undefined, "new_app" | "edit" | "debug" | "chat" | "review_fix" | import("@langchain/langgraph").OverwriteValue<"new_app" | "edit" | "debug" | "chat" | "review_fix" | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<"new_app" | "edit" | "debug" | "chat" | "review_fix" | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    websiteCategory: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    websiteType: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    templateId: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    framework: {
        (annotation: import("@langchain/langgraph").SingleReducer<"next" | "vite" | undefined, "next" | "vite" | undefined>): import("@langchain/langgraph").BaseChannel<"next" | "vite" | undefined, "next" | "vite" | import("@langchain/langgraph").OverwriteValue<"next" | "vite" | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<"next" | "vite" | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    templateLoaded: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    needsIntegration: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | null | undefined, string | null | undefined>): import("@langchain/langgraph").BaseChannel<string | null | undefined, string | import("@langchain/langgraph").OverwriteValue<string | null | undefined> | null | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | null | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    userPocketbaseConnected: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    dbSchemaTemplate: {
        (annotation: import("@langchain/langgraph").SingleReducer<Record<string, unknown> | undefined, Record<string, unknown> | undefined>): import("@langchain/langgraph").BaseChannel<Record<string, unknown> | undefined, Record<string, unknown> | import("@langchain/langgraph").OverwriteValue<Record<string, unknown> | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<Record<string, unknown> | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    designSpec: import("@langchain/langgraph").LastValue<DesignSpec | undefined>;
    databaseStatus: {
        (annotation: import("@langchain/langgraph").SingleReducer<DatabaseStatus | undefined, DatabaseStatus | undefined>): import("@langchain/langgraph").BaseChannel<DatabaseStatus | undefined, DatabaseStatus | import("@langchain/langgraph").OverwriteValue<DatabaseStatus | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<DatabaseStatus | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    databaseReady: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    retryCount: import("@langchain/langgraph").LastValue<number>;
    executorLoopCount: import("@langchain/langgraph").LastValue<number>;
    lastVerificationStage: import("@langchain/langgraph").LastValue<string | undefined>;
    verificationFailures: import("@langchain/langgraph").LastValue<string[] | undefined>;
    needsClarification: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    clarificationQuestions: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    intent: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    scope: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    relevantFiles: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    bugErrorType: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    bugAffectedFiles: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    bugRootCause: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planSummary: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planSteps: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planDesign: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planNewFiles: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    todos: {
        (annotation: import("@langchain/langgraph").SingleReducer<TodoItem[] | undefined, TodoItem[] | undefined>): import("@langchain/langgraph").BaseChannel<TodoItem[] | undefined, TodoItem[] | import("@langchain/langgraph").OverwriteValue<TodoItem[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<TodoItem[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planValid: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planErrors: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    planWarnings: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    filesWritten: {
        (annotation: import("@langchain/langgraph").SingleReducer<FileWritten[] | undefined, FileWritten[] | undefined>): import("@langchain/langgraph").BaseChannel<FileWritten[] | undefined, FileWritten[] | import("@langchain/langgraph").OverwriteValue<FileWritten[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<FileWritten[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    packagesInstalled: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    packagesToInstall: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    packagesFailed: {
        (annotation: import("@langchain/langgraph").SingleReducer<PackageFailure[] | undefined, PackageFailure[] | undefined>): import("@langchain/langgraph").BaseChannel<PackageFailure[] | undefined, PackageFailure[] | import("@langchain/langgraph").OverwriteValue<PackageFailure[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<PackageFailure[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    componentsToInstall: import("@langchain/langgraph").LastValue<string[] | undefined>;
    typeCheckPassed: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    typeCheckErrors: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    visualIssues: import("@langchain/langgraph").LastValue<string[] | undefined>;
    functionalIssues: import("@langchain/langgraph").LastValue<string[] | undefined>;
    a11yIssues: import("@langchain/langgraph").LastValue<string[] | undefined>;
    e2eFailures: import("@langchain/langgraph").LastValue<string[] | undefined>;
    e2eTestsWritten: import("@langchain/langgraph").LastValue<string[] | undefined>;
    securityIssues: import("@langchain/langgraph").LastValue<string[] | undefined>;
    seoGenerated: import("@langchain/langgraph").LastValue<boolean | undefined>;
    screenshots: import("@langchain/langgraph").LastValue<{
        path: string;
        route: string;
    }[] | undefined>;
    reviewPassed: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    reviewIssues: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    reviewSuggestions: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    reviewTodos: {
        (annotation: import("@langchain/langgraph").SingleReducer<TodoItem[] | undefined, TodoItem[] | undefined>): import("@langchain/langgraph").BaseChannel<TodoItem[] | undefined, TodoItem[] | import("@langchain/langgraph").OverwriteValue<TodoItem[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<TodoItem[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    debugFixed: {
        (annotation: import("@langchain/langgraph").SingleReducer<boolean | undefined, boolean | undefined>): import("@langchain/langgraph").BaseChannel<boolean | undefined, boolean | import("@langchain/langgraph").OverwriteValue<boolean | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<boolean | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    debugRemainingErrors: {
        (annotation: import("@langchain/langgraph").SingleReducer<string[] | undefined, string[] | undefined>): import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string[] | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    chatAnswer: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    previewUrl: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    summary: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    error: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    messages: import("@langchain/langgraph").BaseChannel<ChatMessage[], ChatMessage[] | import("@langchain/langgraph").OverwriteValue<ChatMessage[]>, unknown>;
}>;
export type AgentState = typeof AgentStateAnnotation.State;
export interface AgentEvent {
    type: string;
    data: Record<string, unknown>;
}
