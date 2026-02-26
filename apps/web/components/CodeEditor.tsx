"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { Save, RotateCcw, Clock, CheckCircle, Plus, X, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { monacoConfig } from "@/lib/monaco";

export interface EditorFile {
  name: string;
  content: string;
  language?: "typescript" | "javascript" | "tsx" | "jsx" | "html" | "css";
}

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language?: "typescript" | "javascript" | "tsx" | "jsx" | "html" | "css";
  sessionId?: string;
  milestoneId?: string;
  height?: string;
  showPreview?: boolean;
  previewUrl?: string;
  files?: EditorFile[];
  setFiles?: (files: EditorFile[]) => void;
  allowMultiFile?: boolean;
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
  files: externalFiles,
  setFiles: externalSetFiles,
  allowMultiFile = false,
}: CodeEditorProps) {
  const [editorError, setEditorError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);
  
  // Multi-file state
  const [files, setFiles] = useState<EditorFile[]>(() => {
    if (externalFiles && externalFiles.length > 0) {
      return externalFiles;
    }
    return [{ name: "index.tsx", content: code, language }];
  });
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files[activeFileIndex];

  // Sync with external files prop
  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      setFiles(externalFiles);
    }
  }, [externalFiles]);

  // Update external files when local files change
  useEffect(() => {
    if (externalSetFiles) {
      externalSetFiles(files);
    }
  }, [files, externalSetFiles]);

  // Update active file content when code prop changes
  useEffect(() => {
    if (!allowMultiFile && code !== localCode) {
      setLocalCode(code);
      if (files[activeFileIndex]) {
        setFiles(prev => prev.map((f, i) => 
          i === activeFileIndex ? { ...f, content: code } : f
        ));
      }
    }
  }, [code, allowMultiFile, activeFileIndex, files, localCode]);

  // Auto-save to localStorage with debounce
  const saveToLocalStorage = useCallback((codeToSave: string) => {
    if (!sessionId || !milestoneId) return;

    setIsSaving(true);
    const storageKey = `code_${sessionId}_${milestoneId}`;
    const filesStorageKey = `files_${sessionId}_${milestoneId}`;
    
    if (allowMultiFile) {
      localStorage.setItem(filesStorageKey, JSON.stringify(files));
    } else {
      localStorage.setItem(storageKey, codeToSave);
    }
    setLastSaved(new Date());

    // Reset saving indicator after delay
    setTimeout(() => setIsSaving(false), 500);
  }, [sessionId, milestoneId, files, allowMultiFile]);

  // Debounced auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allowMultiFile) {
        saveToLocalStorage("");
      } else {
        saveToLocalStorage(localCode);
        setCode(localCode);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [allowMultiFile, localCode, saveToLocalStorage, setCode, files]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!sessionId || !milestoneId) return;

    const storageKey = `code_${sessionId}_${milestoneId}`;
    const filesStorageKey = `files_${sessionId}_${milestoneId}`;
    
    if (allowMultiFile) {
      const savedFiles = localStorage.getItem(filesStorageKey);
      if (savedFiles) {
        try {
          const parsed = JSON.parse(savedFiles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFiles(parsed);
            return;
          }
        } catch (e) {
          console.error("Failed to load saved files:", e);
        }
      }
    } else {
      const savedCode = localStorage.getItem(storageKey);
      if (savedCode && savedCode !== code) {
        setLocalCode(savedCode);
      }
    }
  }, [sessionId, milestoneId, allowMultiFile, code]);

  // Focus input when adding file
  useEffect(() => {
    if (isAddingFile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingFile]);

  // Focus input when editing file
  useEffect(() => {
    if (editingFileIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingFileIndex]);

  // Handle editor mount
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

  // Handle file change
  const updateActiveFile = (newContent: string) => {
    setFiles(prev => prev.map((f, i) => 
      i === activeFileIndex ? { ...f, content: newContent } : f
    ));
    setLocalCode(newContent);
    if (!allowMultiFile) {
      setCode(newContent);
    }
  };

  // Add new file
  const handleAddFile = () => {
    if (!newFileName.trim()) {
      setIsAddingFile(false);
      setNewFileName("");
      return;
    }

    // Ensure file has .tsx extension by default
    let fileName = newFileName.trim();
    if (!fileName.includes(".")) {
      fileName += ".tsx";
    }

    // Check if file already exists
    if (files.some(f => f.name === fileName)) {
      alert("File already exists!");
      setIsAddingFile(false);
      setNewFileName("");
      return;
    }

    const newFile: EditorFile = {
      name: fileName,
      content: `// ${fileName}\nexport default function Component() {\n  return <div></div>;\n}`,
      language: fileName.endsWith(".css") ? "css" : fileName.endsWith(".ts") ? "typescript" : "tsx",
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFileIndex(files.length);
    setIsAddingFile(false);
    setNewFileName("");
  };

  // Delete file
  const handleDeleteFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert("You must have at least one file!");
      return;
    }

    const fileToDelete = files[index];
    if (fileToDelete && confirm(`Delete ${fileToDelete.name}?`)) {
      setFiles(prev => prev.filter((_, i) => i !== index));
      if (activeFileIndex >= index && activeFileIndex > 0) {
        setActiveFileIndex(activeFileIndex - 1);
      }
    }
  };

  // Start editing file name
  const handleStartEditFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToEdit = files[index];
    if (fileToEdit) {
      setEditingFileIndex(index);
      setEditingFileName(fileToEdit.name);
    }
  };

  // Save edited file name
  const handleSaveEditFile = () => {
    if (!editingFileName.trim() || editingFileIndex === null) {
      setEditingFileIndex(null);
      setEditingFileName("");
      return;
    }

    let fileName = editingFileName.trim();
    if (!fileName.includes(".")) {
      fileName += ".tsx";
    }

    // Check if file already exists (excluding current file)
    if (files.some((f, i) => i !== editingFileIndex && f.name === fileName)) {
      alert("File already exists!");
      setEditingFileIndex(null);
      setEditingFileName("");
      return;
    }

    setFiles(prev => prev.map((f, i) => 
      i === editingFileIndex ? { ...f, name: fileName } : f
    ));
    setEditingFileIndex(null);
    setEditingFileName("");
  };

  // Reset to original code
  const handleReset = () => {
    if (confirm("Reset code to original? All changes will be lost.")) {
      const originalContent = allowMultiFile
        ? (externalFiles?.[activeFileIndex]?.content ?? files[activeFileIndex]?.content ?? code)
        : code;
      updateActiveFile(originalContent);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    updateActiveFile(value || "");
  };

  return (
    <div className="flex flex-col h-full border border-zinc-800 rounded-sm bg-[#0d0d0d]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            {language.toUpperCase()} Editor
          </span>
          {allowMultiFile && (
            <span className="text-[10px] text-zinc-600 font-mono">
              💡 Double-click file tab to rename
            </span>
          )}
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

      {/* File Tabs (Multi-file mode) */}
      {allowMultiFile && (
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-950 border-b border-zinc-800 overflow-x-auto">
          {files.map((file, index) => (
            <div
              key={file.name}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-sm cursor-pointer transition-colors whitespace-nowrap",
                index === activeFileIndex
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              )}
              onClick={() => setActiveFileIndex(index)}
              onDoubleClick={(e) => handleStartEditFile(index, e)}
              title="Double-click to rename"
            >
              <FileCode className="w-3 h-3" />
              {editingFileIndex === index ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingFileName}
                  onChange={(e) => setEditingFileName(e.target.value)}
                  onBlur={handleSaveEditFile}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEditFile();
                    if (e.key === "Escape") {
                      setEditingFileIndex(null);
                      setEditingFileName("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-1 py-0.5 text-xs font-mono bg-zinc-950 text-zinc-100 border border-zinc-600 rounded-sm focus:outline-none focus:border-zinc-400 w-24"
                />
              ) : (
                <span>{file.name}</span>
              )}
              {files.length > 1 && (
                <button
                  onClick={(e) => handleDeleteFile(index, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-700 rounded transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          
          {isAddingFile ? (
            <input
              ref={inputRef}
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={handleAddFile}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFile();
                if (e.key === "Escape") {
                  setIsAddingFile(false);
                  setNewFileName("");
                }
              }}
              className="px-2 py-1 text-xs font-mono bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-sm focus:outline-none focus:border-zinc-500"
              placeholder="filename.tsx"
            />
          ) : (
            <button
              onClick={() => setIsAddingFile(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-sm transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add File
            </button>
          )}
        </div>
      )}

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
              language={(activeFile?.language || language) as any}
              theme="vs-dark"
              value={activeFile?.content || localCode}
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
