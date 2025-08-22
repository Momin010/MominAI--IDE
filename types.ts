
import React from 'react';

export interface File {
  type: 'file';
  content: string;
}

export interface Directory {
  type: 'directory';
  children: { [key:string]: FileSystemNode };
}

export type FileSystemNode = File | Directory;

// --- New Types for Plugins, UI, and API ---

export interface StatusBarItem {
    id: string;
    component: React.ReactNode;
    priority?: number; // Lower numbers are shown first (to the right)
}

export type BottomPanelView = 'terminal' | 'problems' | 'debug-console' | 'dependencies';

export interface IDEApi {
    // File System
    createNode: (path: string, type: 'file' | 'directory', content?: string) => void;
    readNode: (path:string) => string | null;
    updateNode: (path: string, content: string) => void;
    deleteNode: (path: string) => void;
    renameNode: (oldPath: string, newName: string) => void;
    moveNode: (sourcePath: string, destDir: string) => void;
    getNode: (path: string) => FileSystemNode | null;
    getFileSystem: () => FileSystemNode | null;
    scaffoldProject: (files: Record<string, string>) => void;

    // State Access
    getActiveFile: () => string | null;
    getOpenFileContent: () => string;
    updateActiveFileContent: (content: string) => void;
    openFile: (path: string, line?: number) => void;

    // Event Subscription
    onActiveFileChanged: (callback: (path: string | null) => void) => () => void;
    onFileSaved: (callback: (path: string, content: string) => void) => () => void; // Concept for future use
    
    // UI Manipulation
    addStatusBarItem: (item: StatusBarItem) => void;
    removeStatusBarItem: (id: string) => void;
    showNotification: (notification: Omit<Notification, 'id'>) => void;
    addEditorAction: (action: EditorAction) => void;
    removeEditorAction: (id: string) => void;
    showInPreview: (title: string, component: React.ReactNode) => void;
    hidePreview: () => void;
    toggleZenMode: () => void;
    switchView: (viewId: string) => void;
    switchBottomPanelView: (view: BottomPanelView) => void;
    
    // Command Palette Integration
    registerCommand: (command: Command) => void;
    unregisterCommand: (commandId: string) => void;
    replaceAll: (query: string, replaceWith: string, options: { isCaseSensitive: boolean, isRegex: boolean }) => Promise<void>;

    // Diagnostics
    setAiDiagnostics: (source: string, diagnostics: Diagnostic[]) => void;

    // Debugging APIs
    getBreakpoints: () => Record<string, number[]>;
    clearConsole: () => void;
    appendConsoleMessage: (message: ConsoleMessage) => void;
    setRunContext: (htmlFile: string | null, jsFiles: string[] | null) => void;
    setPreviewContext: (context: { html: string } | null) => void;

    // Collaboration
    broadcastFileChange: (path: string, content: string) => void;

    // Voice Commands
    startVoiceRecognition: (onResult: (transcript: string) => void) => void;
    stopVoiceRecognition: () => void;
    
    // Dependency Analysis
    setDependencyReport: (report: DependencyReport | null) => void;
    performSearch: (query: string) => void;
}

export interface Plugin {
    id: string;
    name: string;
    description: string;
    activate: (api: IDEApi) => void;
    deactivate: (api: IDEApi) => void;
}

export interface ContextMenuItem {
    label: string;
    action: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
}

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
}

export interface EditorAction {
    id:string;
    label: string;
    icon: React.ReactNode;
    action: (filePath: string, content: string) => void;
    shouldShow: (filePath: string, content: string) => boolean;
}

// Added for global search feature
export interface SearchResult {
  path: string;
  line: number;
  content: string;
  preMatch: string;
  match: string;
  postMatch: string;
}

// --- AI Assistant & Context Types ---
export interface FileAction {
    action: 'create' | 'update';
    path: string;
    content: string;
}

export interface Message {
  sender: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
  actions?: FileAction[];
  actionsApplied?: boolean;
  originalFileContents?: { path: string; content: string }[];
}

export type EditorAIAction = 'explain' | 'refactor' | 'find_bugs';


// --- GitHub Gist Integration Types ---
export interface GistFile {
    content: string;
}

export interface GistApiResponse {
    id: string;
    files: { [filename: string]: GistFile };
    html_url: string;
}

export interface GistCommit {
    id: string;
    message: string;
    timestamp: string;
    parent?: string;
}

// --- Command Palette ---
export interface Command {
    id: string;
    label: string;
    category?: string;
    action: () => void;
    icon?: React.ReactNode;
}

// --- Language Service & Diagnostics ---
export interface Diagnostic {
    line: number;
    startCol: number;
    endCol: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    source: string;
}

// --- Debugging ---
export interface ConsoleMessage {
    type: 'log' | 'info' | 'warn' | 'error' | 'system';
    message: any[];
    timestamp: string;
}

// --- Theming ---
export type Theme = 'deep-space' | 'nordic-light';

// --- Collaboration ---
export interface UserPresence {
    id: string;
    name: string;
    color: string;
    currentFile: string | null;
}

export interface BroadcastMessage {
    type: 'file-change' | 'presence-update';
    payload: any;
}

// --- Storyboard ---
export interface StoryboardComponent {
    path: string;
    name: string;
}

// --- Dependency Analysis ---
export interface DependencyInfo {
    name: string;
    version: string;
    latest?: string;
    status: 'ok' | 'outdated' | 'vulnerable';
    summary?: string;
}

export interface DependencyReport {
    dependencies: DependencyInfo[];
    devDependencies: DependencyInfo[];
}

// --- Supabase ---
export type SupabaseUser = {
  id: string;
  email?: string;
};

// --- CSS Inspector ---
export interface InspectedElement {
  tagName: string;
  selector: string;
  styles: Record<string, string>;
}

// --- AI Diff View ---
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}
