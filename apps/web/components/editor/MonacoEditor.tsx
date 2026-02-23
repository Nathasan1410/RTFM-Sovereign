'use client'

import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

interface MonacoEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language?: string
  theme?: 'vs-dark' | 'vs-light' | 'vs'
  height?: string | number
  options?: monaco.editor.IStandaloneEditorConstructionOptions
  readOnly?: boolean
}

export function MonacoEditor({
  value,
  onChange,
  language = 'typescript',
  theme = 'vs-dark',
  height = '400px',
  options,
  readOnly = false
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    ...options
  }

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={defaultOptions}
        loading={
          <div className="flex items-center justify-center h-full bg-muted">
            <div className="animate-spin text-2xl">⏳</div>
          </div>
        }
      />
    </div>
  )
}
