/**
 * Monaco Editor Configuration
 * 
 * This module configures Monaco Editor for use with Next.js
 */

if (typeof window !== 'undefined') {
  // Configure Monaco to load from CDN
  (window as any).MonacoEnvironment = {
    getWorkerUrl: (moduleId: string, label: string) => {
      // Use CDN for Monaco workers
      return `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/${getWorkerUrlForLabel(label)}`;
    }
  };
}

function getWorkerUrlForLabel(label: string): string {
  switch (label) {
    case 'json':
      return 'language/json/json.worker.js';
    case 'css':
    case 'scss':
    case 'less':
      return 'language/css/css.worker.js';
    case 'html':
    case 'handlebars':
    case 'razor':
      return 'language/html/html.worker.js';
    case 'typescript':
    case 'javascript':
      return 'language/typescript/ts.worker.js';
    default:
      return 'editor/editor.worker.js';
  }
}

export const monacoConfig = {
  // Disable telemetry
  enableTelemetry: false,
  
  // Common editor options
  defaultOptions: {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    formatOnPaste: true,
    formatOnType: true,
    autoClosingBrackets: 'always' as const,
    autoClosingQuotes: 'always' as const,
    bracketPairColorization: { enabled: true },
  }
};
