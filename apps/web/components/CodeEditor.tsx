"use client";

import { useState, useEffect, useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Save, RotateCcw, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { monacoConfig } from "@/lib/monaco";

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language?: "typescript" | "javascript" | "tsx" | "jsx" | "html" | "css";
  sessionId?: string;
  milestoneId?: string;
  height?: string;
  showPreview?: boolean;
  previewUrl?: string;
}

export default function CodeEditor({
  code,
  setCode,
  language = "typescript",
  sessionId,
  milestoneId,
  height = "400px",
  showPreview = false,
  previewUrl,
}: CodeEditorProps) {
  const [editorError, setEditorError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);

  // Auto-save to localStorage with debounce
  const saveToLocalStorage = useCallback((codeToSave: string) => {
    if (!sessionId || !milestoneId) return;
    
    setIsSaving(true);
    const storageKey = `code_${sessionId}_${milestoneId}`;
    localStorage.setItem(storageKey, codeToSave);
    setLastSaved(new Date());
    
    // Reset saving indicator after delay
    setTimeout(() => setIsSaving(false), 500);
  }, [sessionId, milestoneId]);

  // Debounced auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localCode !== code) {
        setCode(localCode);
        saveToLocalStorage(localCode);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [localCode, code, setCode, saveToLocalStorage]);

  // Load saved code from localStorage on mount
  useEffect(() => {
    if (!sessionId || !milestoneId) return;
    
    const storageKey = `code_${sessionId}_${milestoneId}`;
    const savedCode = localStorage.getItem(storageKey);
    
    if (savedCode && savedCode !== code) {
      setLocalCode(savedCode);
    }
  }, [sessionId, milestoneId, code]);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset your code? This will load the starter code.")) {
      setLocalCode(code);
      setCode(code);
      if (sessionId && milestoneId) {
        localStorage.removeItem(`code_${sessionId}_${milestoneId}`);
        setLastSaved(null);
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setLocalCode(value || "");
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    try {
      // Configure Monaco to avoid loading errors
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0d0d0d',
        }
      });
      monaco.editor.setTheme('custom-dark');
      setEditorError(null);
    } catch (error) {
      console.error('Monaco initialization error:', error);
      setEditorError('Editor failed to load');
    }
  };

  const handleEditorError = (error: Error) => {
    console.error('Monaco Editor Error:', error);
    setEditorError('Failed to load editor');
  };

  return (
    <div className="flex flex-col h-full border border-zinc-800 rounded-sm bg-[#0d0d0d]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            {language.toUpperCase()} Editor
          </span>
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              {isSaving ? (
                <RotateCcw className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              <span>
                {isSaving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showPreview && (
            <button
              onClick={() => setShowPreviewPanel(!showPreviewPanel)}
              className="px-3 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-sm transition-colors"
            >
              {showPreviewPanel ? "Hide Preview" : "Show Preview"}
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-sm transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={cn(
        "flex flex-1 overflow-hidden",
        showPreviewPanel ? "flex-row" : "flex-col"
      )}>
        {/* Monaco Editor */}
        <div className={cn(
          "flex-1 overflow-hidden",
          showPreviewPanel ? "w-1/2 border-r border-zinc-800" : "w-full"
        )}>
          {editorError ? (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <p className="text-sm mb-2">{editorError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                >
                  Refresh page
                </button>
              </div>
            </div>
          ) : (
            <Editor
              height={height}
              language={language}
              theme="vs-dark"
              value={localCode}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin text-zinc-500">⏳</div>
                </div>
              }
              options={{
                ...monacoConfig.defaultOptions,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                renderWhitespace: "selection",
                bracketPairColorization: { enabled: true },
                // guidingIndent: true, // Removed: Not a valid option in current Monaco version
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                formatOnPaste: true,
                formatOnType: true,
                autoClosingBrackets: "always",
                autoClosingQuotes: "always",
                tabSize: 2,
              }}
            />
          )}
        </div>

        {/* Live Preview Panel */}
        {showPreviewPanel && (
          <div className="w-1/2 bg-zinc-950 flex flex-col">
            <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Live Preview
              </span>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[300px] border border-zinc-800 rounded-sm bg-white"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  <p>Preview not available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
