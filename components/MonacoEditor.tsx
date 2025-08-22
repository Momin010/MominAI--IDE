import React, { useRef, useEffect, useState } from 'react';
import { getInlineCodeSuggestion } from '../services/aiService';
import { useAI } from '../contexts/AIContext';
import { useTheme } from '../contexts/ThemeContext';
import type { Diagnostic } from '../types';

declare const window: any;

interface MonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  path: string;
  diagnostics: Diagnostic[];
  breakpoints: number[];
  onBreakpointsChange: (path: string, newBreakpoints: number[]) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange, path, diagnostics, breakpoints, onBreakpointsChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);
  const suggestionTimeout = useRef<number | null>(null);
  const decorations = useRef<string[]>([]);
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);
  const { performEditorAction } = useAI();
  const { theme } = useTheme();

  // Use refs for props that change often to stabilize the main useEffect dependencies
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const onBreakpointsChangeRef = useRef(onBreakpointsChange);
  useEffect(() => { onBreakpointsChangeRef.current = onBreakpointsChange; }, [onBreakpointsChange]);
  
  const performEditorActionRef = useRef(performEditorAction);
  useEffect(() => { performEditorActionRef.current = performEditorAction; }, [performEditorAction]);

  useEffect(() => {
    if (window.require) {
      window.require(['vs/editor/editor.main'], () => {
        setIsMonacoLoaded(true);
      });
    } else {
      console.error("Monaco loader is not available.");
    }
  }, []);

  // Effect to create the editor instance once
  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let suggestionProvider: any = null;

    if (editorRef.current && isMonacoLoaded && !editorInstance.current) {
      window.monaco.editor.defineTheme('glass-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6a9955' },
            { token: 'keyword', foreground: 'c586c0' },
            { token: 'string', foreground: 'ce9178' },
            { token: 'number', foreground: 'b5cea8' },
        ],
        colors: {
            'editor.background': '#00000000', // Fully transparent
            'editor.foreground': '#e5e5e5',
            'editorGutter.background': '#00000000',
            'editorLineNumber.foreground': '#858585',
            'editorLineNumber.activeForeground': '#c6c6c6',
            'editorCursor.foreground': 'var(--accent-secondary)',
            'editor.selectionBackground': '#ffffff15',
            'editorWidget.background': '#25252c',
            'minimap.background': '#00000000',
        }
      });
      
      const editor = window.monaco.editor.create(editorRef.current, {
        theme: 'glass-theme',
        automaticLayout: false,
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: 'on',
        inlineSuggest: { enabled: true },
        contextmenu: true,
        glyphMargin: true,
      });
      editorInstance.current = editor;

      // --- Add Contextual AI Actions ---
      editor.addAction({ id: 'ai-explain-code', label: 'AI: Explain Selection', contextMenuGroupId: 'navigation', contextMenuOrder: 1.5, precondition: 'editorHasSelection', run: (ed: any) => { const sel = ed.getSelection(); if (sel) { const txt = ed.getModel().getValueInRange(sel); performEditorActionRef.current('explain', txt, ed.getModel().uri.path); } } });
      editor.addAction({ id: 'ai-refactor-code', label: 'AI: Refactor Selection', contextMenuGroupId: 'navigation', contextMenuOrder: 1.6, precondition: 'editorHasSelection', run: (ed: any) => { const sel = ed.getSelection(); if (sel) { const txt = ed.getModel().getValueInRange(sel); performEditorActionRef.current('refactor', txt, ed.getModel().uri.path); } } });
      editor.addAction({ id: 'ai-find-bugs', label: 'AI: Find Bugs in Selection', contextMenuGroupId: 'navigation', contextMenuOrder: 1.7, precondition: 'editorHasSelection', run: (ed: any) => { const sel = ed.getSelection(); if (sel) { const txt = ed.getModel().getValueInRange(sel); performEditorActionRef.current('find_bugs', txt, ed.getModel().uri.path); } } });

      // --- Breakpoint click handler ---
      editor.onMouseDown((event: any) => {
        if (event.target.type === window.monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
          const modelPath = editor.getModel()?.uri.path;
          if (modelPath) {
            const lineNumber = event.target.position.lineNumber;
            const currentBreakpoints = editor.getModel().getLineDecorations(lineNumber).some((d: any) => d.options.glyphMarginClassName === 'monaco-breakpoint')
              ? breakpoints.filter(b => b !== lineNumber)
              : [...breakpoints, lineNumber].sort((a, b) => a - b);
            onBreakpointsChangeRef.current(modelPath, currentBreakpoints);
          }
        }
      });

      editor.onDidChangeModelContent(() => {
        onChangeRef.current(editor.getValue());
      });

      // --- AI Inline Suggestions Provider ---
      suggestionProvider = window.monaco.languages.registerInlineCompletionsProvider({ pattern: '**/*' }, {
        async provideInlineCompletions(model: any, position: any, context: any, token: any) {
          if (suggestionTimeout.current) { clearTimeout(suggestionTimeout.current); }
          return new Promise(resolve => {
            suggestionTimeout.current = window.setTimeout(async () => {
              if (token.isCancellationRequested) { resolve({ items: [] }); return; }
              const textBefore = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
              try {
                const suggestion = await getInlineCodeSuggestion(textBefore);
                if (token.isCancellationRequested || !suggestion) { resolve({ items: [] }); return; }
                resolve({ items: [{ insertText: suggestion }] });
              } catch (e) { console.error("Code suggestion error:", e); resolve({ items: [] }); }
            }, 500);
          });
        },
        freeInlineCompletions() {}
      });

      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => editorInstance.current?.layout());
      });
      resizeObserver.observe(editorRef.current);
    }

    return () => {
      if (!editorInstance.current) { // Prevent cleanup if editor was never created
          resizeObserver?.disconnect();
          suggestionProvider?.dispose();
          if (suggestionTimeout.current) { clearTimeout(suggestionTimeout.current); }
      }
    };
  }, [isMonacoLoaded]);

  // Effect to handle editor disposal
  useEffect(() => () => {
      editorInstance.current?.dispose();
      editorInstance.current = null;
  }, []);


  // Effect to switch models and handle content changes
  useEffect(() => {
      if (editorInstance.current && path) {
          const uri = window.monaco.Uri.parse(path);
          let model = window.monaco.editor.getModel(uri);
          if (!model) {
              model = window.monaco.editor.createModel(value, undefined, uri);
          } else if (model.getValue() !== value) {
              model.setValue(value);
          }
          if (editorInstance.current.getModel() !== model) {
              editorInstance.current.setModel(model);
          }
      }
  }, [path, value, isMonacoLoaded]);

  // --- Update Breakpoint Decorations ---
  useEffect(() => {
    if (editorInstance.current && window.monaco && editorInstance.current.getModel()?.uri.path === path) {
      const newDecorations = breakpoints.map(lineNumber => ({
        range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
        options: { isWholeLine: false, glyphMarginClassName: 'monaco-breakpoint' }
      }));
      decorations.current = editorInstance.current.deltaDecorations(decorations.current, newDecorations);
    } else {
       // Clear old decorations when switching files if they are not part of the new model's state
       decorations.current = editorInstance.current?.deltaDecorations(decorations.current, []) || [];
    }
  }, [breakpoints, path]);
  
  // Update theme - This is now handled at creation, but could be used for dynamic theme switching
  useEffect(() => {
    if (window.monaco) {
      // For now, we stick to our glass theme
      window.monaco.editor.setTheme('glass-theme');
    }
  }, [theme]);
  
  // Update diagnostics
  useEffect(() => {
    if (window.monaco && path) {
      const model = window.monaco.editor.getModel(window.monaco.Uri.parse(path));
      if (model) {
        const markers = diagnostics.map(d => ({
          startLineNumber: d.line,
          startColumn: d.startCol,
          endLineNumber: d.line,
          endColumn: d.endCol,
          message: d.message,
          severity: window.monaco.MarkerSeverity[d.severity.charAt(0).toUpperCase() + d.severity.slice(1)],
          source: d.source,
        }));
        window.monaco.editor.setModelMarkers(model, 'owner', markers);
      }
    }
  }, [diagnostics, path]);

  if (!isMonacoLoaded) {
    return (
      <div className="bg-[#1e1e1e] text-gray-400 p-4 h-full w-full flex items-center justify-center">
        <p>Loading Editor...</p>
      </div>
    );
  }

  return <div ref={editorRef} className="h-full w-full" />;
};

export default MonacoEditor;