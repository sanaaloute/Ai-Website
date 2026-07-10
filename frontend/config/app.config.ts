// Application Configuration
// This file contains all configurable settings for the application

export const appConfig = {
  // E2B Sandbox Configuration
  e2b: {
    // Sandbox timeout in minutes
    // Proactive renewal happens 10 min before expiry, so effective session is ~50 min.
    timeoutMinutes: 60,

    // Convert to milliseconds for E2B API
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },

    // Dev server port inside the sandbox; must match E2B getHost(devPort) and Vite dev server.
    devPort: 5173,

    // Max time to poll the preview URL until HTTP OK after starting/restarting dev server (milliseconds).
    // Prefer a generous budget — reliability over a slightly slower first paint.
    devStartupDelay: 20000,

    // Working directory in sandbox
    workingDirectory: '/home/user/app',
  },

  // AI Configuration — model selection is owned by the backend.
  ai: {
    // Temperature settings for non-reasoning models
    defaultTemperature: 0.5,

    // Max tokens for code generation
    maxTokens: 8000,

    // Max tokens for truncation recovery
    truncationRecoveryMaxTokens: 4000,
  },
  
  // Code Application Configuration
  codeApplication: {
    // Delay after applying code before refreshing iframe (milliseconds)
    defaultRefreshDelay: 2000,
    
    // Delay when packages are installed (milliseconds)
    packageInstallRefreshDelay: 5000,
    
    // Enable/disable automatic truncation recovery
    enableTruncationRecovery: false, // Disabled - too many false positives
    
    // Maximum number of truncation recovery attempts per file
    maxTruncationRecoveryAttempts: 1,

    // Maximum automatic analyzer self-repair passes after apply
    maxAnalyzerRepairPasses: 2,

    // Hard timeout for a single build check during analysis
    analyzerBuildTimeoutMs: 120000,

    // Hard timeout for AI reflection pass
    analyzerAiTimeoutMs: 60000,

    // Total budget for analyze + self-repair loop (hard cap: 10 minutes)
    analyzerTotalTimeoutMs: 600000,
  },
  
  // UI Configuration
  ui: {
    // Show/hide certain UI elements
    showModelSelector: true,
    showStatusIndicator: true,
    
    // Animation durations (milliseconds)
    animationDuration: 200,
    
    // Toast notification duration (milliseconds)
    toastDuration: 3000,
    
    // Maximum chat messages to keep in memory
    maxChatMessages: 100,
    
    // Maximum recent messages to send as context
    maxRecentMessagesContext: 20,
  },
  
  // Development Configuration
  dev: {
    // Enable debug logging
    enableDebugLogging: true,
    
    // Enable performance monitoring
    enablePerformanceMonitoring: false,
    
    // Log API responses
    logApiResponses: true,
  },
  
  // Package Installation Configuration
  packages: {
    // Use --legacy-peer-deps flag for npm install
    useLegacyPeerDeps: true,
    
    // Package installation timeout (milliseconds)
    installTimeout: 60000,
    
    // Auto-restart dev server after package installation
    autoRestartDev: true,
  },
  
  // File Management Configuration
  files: {
    // Excluded file patterns (files to ignore)
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      '.next/**',
      'dist/**',
      'build/**',
      '*.log',
      '.DS_Store'
    ],
    
    // Maximum file size to read (bytes)
    maxFileSize: 1024 * 1024, // 1MB
    
    // File extensions to treat as text
    textFileExtensions: [
      '.js', '.jsx', '.ts', '.tsx',
      '.css', '.scss', '.sass',
      '.html', '.xml', '.svg',
      '.json', '.yml', '.yaml',
      '.md', '.txt', '.env',
      '.gitignore', '.dockerignore'
    ],
  },
  
  // API Endpoints Configuration (for external services)
  api: {
    // Retry configuration
    maxRetries: 5,
    retryDelay: 1000, // milliseconds
    
    // Request timeout (milliseconds)
    requestTimeout: 30000,
  }
};

export default appConfig;
