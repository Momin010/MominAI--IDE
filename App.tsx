


import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import type { FileSystemNode, IDEApi, StatusBarItem, EditorAction, Notification, SearchResult, Diagnostic, Command, ConsoleMessage, UserPresence, BroadcastMessage, StoryboardComponent, DependencyReport, SupabaseUser, InspectedElement, FileAction, BottomPanelView, Directory } from './types';
import ResizablePanels from './components/ResizablePanels';
import { StatusBar } from './components/StatusBar';
import { Terminal } from './components/Terminal';
import EditorPane from './components/EditorPane';
import ActivityBar from './components/ActivityBar';
import SideBar from './components/SideBar';
import FileExplorer from './components/FileExplorer';
import PluginPanel from './components/PluginPanel';
import SearchPanel from './components/SearchPanel';
import SourceControlPanel from './components/SourceControlPanel';
import { usePlugins } from './hooks/usePlugins';
import { allPlugins } from './plugins';
import PreviewContainer from './components/PreviewContainer';
import AiFileGeneratorModal from './components/AiFileGeneratorModal';
import { generateCodeForFile, fixCodeWithAI, updateCssInProject, setApiKey as setAiServiceKey } from './services/aiService';
import { AIProvider } from './contexts/AIContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { CommandPaletteProvider, useCommandPalette } from './hooks/useCommandPalette';
import CommandPalette from './components/CommandPalette';
import { analyzeCode } from './services/languageService';
import TabbedPanel from './components/TabbedPanel';
import ProblemsPanel from './components/ProblemsPanel';
import DebugConsolePanel from './components/DebugConsolePanel';
import { fetchGist } from './services/githubService';
import { buildFsFromGist } from './utils/gistHelper';
import RegexGeneratorModal from './components/RegexGeneratorModal';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import StoryboardPanel from './components/StoryboardPanel';
import DependencyPanel from './components/DependencyPanel';
import ImageToCodePanel from './components/ImageToCodePanel';
import SettingsPanel from './components/SettingsPanel';
import FigmaPanel from './components/FigmaPanel';
import * as supabaseService from './services/supabaseService';
import { getAllFiles } from './utils/fsUtils';
import InspectorPanel from './components/InspectorPanel';
import AiDiffViewModal from './components/AiDiffViewModal';
import TitleBar from './components/TitleBar';
import TemplatesPanel from './components/TemplatesPanel';
import { ProjectTemplate, templates } from './services/templates';
import { buildFsFromTemplate } from './utils/templateHelper';
import ConfirmationModal from './components/ConfirmationModal';
import { WebContainerProvider, useWebContainer } from './contexts/WebContainerContext';


// --- Notification System ---
const NotificationContext = createContext<{
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}>({ addNotification: () => {} });

export const useNotifications = () => useContext(NotificationContext);

const NotificationToast: React.FC<{ notification: Notification; onDismiss: (id: string) => void }> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, notification.duration || 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const colors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`w-80 rounded-md shadow-lg text-white text-sm p-3 mt-2 ${colors[notification.type]} animate-fade-in-up`}>
      <div className="flex justify-between items-center">
        <p>{notification.message}</p>
        <button onClick={() => onDismiss(notification.id)} className="ml-2 text-lg font-bold">&times;</button>
      </div>
    </div>
  );
};

const NotificationContainer: React.FC<{ notifications: Notification[]; onDismiss: (id: string) => void }> = ({ notifications, onDismiss }) => (
  <div className="fixed bottom-10 right-4 z-50">
    {notifications.map(n => (
      <NotificationToast key={n.id} notification={n} onDismiss={onDismiss} />
    ))}
  </div>
);

const AppContent: React.FC = () => {
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [lastActiveFile, setLastActiveFile] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('explorer');
  const [activeBottomTab, setActiveBottomTab] = useState<BottomPanelView>('terminal');
  
  const [statusBarItems, setStatusBarItems] = useState<StatusBarItem[]>([]);
  const [editorActions, setEditorActions] = useState<EditorAction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null);
  const [aiFileGeneratorState, setAiFileGeneratorState] = useState({ isOpen: false, path: '/' });
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [breakpoints, setBreakpoints] = useState<Record<string, number[]>>(() => JSON.parse(localStorage.getItem('breakpoints') || '{}'));
  const [runContext, setRunContext] = useState<{htmlFile: string, jsFiles: string[]}|null>(null);
  const [previewContext, setPreviewContext] = useState<{html: string} | null>(null);
  const [isFixingWithAi, setIsFixingWithAi] = useState<string | null>(null);
  const [isRegexModalOpen, setIsRegexModalOpen] = useState(false);
  
  // New feature states
  const [isZenMode, setIsZenMode] = useState(false);
  const [storyboardComponents, setStoryboardComponents] = useState<StoryboardComponent[]>([]);
  const [dependencyReport, setDependencyReport] = useState<DependencyReport | null>(null);
  const [collaborators, setCollaborators] = useState<UserPresence[]>([]);
  const collaborationChannel = useRef<BroadcastChannel | null>(null);
  const currentUser = useRef<UserPresence | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem('githubToken'));
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(() => localStorage.getItem('supabaseUrl'));
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string | null>(() => localStorage.getItem('supabaseAnonKey'));
  const [diffModalState, setDiffModalState] = useState<{ isOpen: boolean, actions: FileAction[], originalFiles: {path: string, content: string}[], messageIndex?: number }>({ isOpen: false, actions: [], originalFiles: [] });
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(() => localStorage.getItem('geminiApiKey'));
  const [panelVisibility, setPanelVisibility] = useState({ left: true, right: true, bottom: true });
  const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; title: string; message: React.ReactNode; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Inspector state
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [inspectedElement, setInspectedElement] = useState<InspectedElement | null>(null);
  const [isSavingCss, setIsSavingCss] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const { serverUrl } = useWebContainer();


  const { voiceStatus, startListening, stopListening, isListening } = useVoiceCommands();

  const { setTheme } = useTheme();
  const { registerCommand, commands } = useCommandPalette();
  const [diagnostics, setDiagnostics] = useState<Record<string, Diagnostic[]>>({});
  const analysisTimeoutRef = useRef<number | null>(null);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID();
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);
  
  const fsState = useFileSystem(supabaseUser, addNotification);

  // Effect to initialize AI service with the user's key on load
  useEffect(() => {
    const key = localStorage.getItem('geminiApiKey');
    setGeminiApiKey(key);
    setAiServiceKey(key);
  }, []);

  const handleSetGeminiApiKey = (key: string | null) => {
    if (key) {
        localStorage.setItem('geminiApiKey', key);
    } else {
        localStorage.removeItem('geminiApiKey');
    }
    setGeminiApiKey(key);
    setAiServiceKey(key);
  };
  
  const togglePanel = (panel: 'left' | 'right' | 'bottom') => {
    setPanelVisibility(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Inspector Logic
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === 'codecraft-inspector' && event.data.type === 'elementSelected') {
        setInspectedElement(event.data.payload);
      } else if (event.data?.source === 'codecraft-preview') {
        setConsoleMessages(prev => [...prev, event.data.message]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  const handleToggleInspector = () => {
      const newInspectorState = !isInspectorActive;
      setIsInspectorActive(newInspectorState);
      if (newInspectorState && !isPreviewVisible) {
        addNotification({type: 'info', message: 'Run a file to activate the inspector.'})
        return;
      }
      if (!newInspectorState) {
        setInspectedElement(null); // Clear selection when deactivating
      }
      previewIframeRef.current?.contentWindow?.postMessage({ type: 'toggleInspector' }, '*');
  };
  
  const handleStyleChange = (newStyles: Record<string, string>) => {
    if (!inspectedElement) return;
    setInspectedElement(prev => prev ? { ...prev, styles: newStyles } : null);
    previewIframeRef.current?.contentWindow?.postMessage({
        type: 'applyStyles',
        payload: { selector: inspectedElement.selector, styles: newStyles }
    }, '*');
  };
  
  const handleSaveChangesToStylesheet = async () => {
    if (!inspectedElement || !fsState.fs) return;
    setIsSavingCss(true);
    addNotification({ type: 'info', message: 'AI is updating your stylesheet...' });
    try {
        const allFiles = getAllFiles(fsState.fs, '/');
        const { filePath, updatedCode } = await updateCssInProject(
            allFiles,
            inspectedElement.selector,
            inspectedElement.styles
        );
        fsState.updateNode(filePath, updatedCode);
        addNotification({ type: 'success', message: `Successfully updated ${filePath}!` });
    } catch (error) {
        if (error instanceof Error) addNotification({ type: 'error', message: `AI Update Failed: ${error.message}` });
        else addNotification({type: 'error', message: 'An unknown error occurred during AI update.'})
    } finally {
      setIsSavingCss(false);
    }
  };


  const combinedDiagnostics = useMemo(() => Object.values(diagnostics).flat(), [diagnostics]);
  
  useEffect(() => {
    supabaseService.initialize(supabaseUrl, supabaseAnonKey);

    const { data: authListener } = supabaseService.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
      if (_event === 'SIGNED_IN') {
        addNotification({ type: 'success', message: `Welcome ${session?.user.email}!`});
      }
      if (_event === 'SIGNED_OUT') {
        addNotification({ type: 'info', message: 'You have been signed out.'});
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [addNotification, supabaseUrl, supabaseAnonKey]);
  
  const handleFileSelect = useCallback((path: string, line?: number) => {
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    setActiveTab(path);
    if (!path.startsWith('plugin:')) {
      setActiveView('explorer');
    }
  }, [openFiles]);

  const handleAiFixRequest = useCallback(async (errorToFix: ConsoleMessage) => {
    const errorMessage = errorToFix.message.join(' ');
    if (!fsState.fs) return;

    setIsFixingWithAi(errorMessage);
    try {
        const allWorkspaceFiles = getAllFiles(fsState.fs, '/');
        const entryPoint = runContext?.htmlFile; 
        const result = await fixCodeWithAI(errorMessage, allWorkspaceFiles, entryPoint);
        fsState.updateNode(result.filePath, result.fixedCode);
        addNotification({ type: 'success', message: `AI applied a fix to ${result.filePath}.` });
        addNotification({ type: 'info', message: `AI Debugger: ${result.detailedExplanation}`, duration: 20000 });
        handleFileSelect(result.filePath);
    } catch (error) {
        if (error instanceof Error) addNotification({ message: error.message, type: 'error' });
    } finally {
        setIsFixingWithAi(null);
    }
}, [fsState.fs, runContext, fsState.updateNode, addNotification, handleFileSelect]);

  const listeners = useMemo(() => ({
    onActiveFileChanged: new Set<(path: string | null) => void>(),
    onFileSaved: new Set<(path: string, content: string) => void>(),
  }), []);

  const handleFileContentChange = useCallback((path: string, content: string, fromBroadcast = false) => {
    fsState.updateNode(path, content);
    listeners.onFileSaved.forEach(cb => cb(path, content));
    if (!fromBroadcast) {
      collaborationChannel.current?.postMessage({ type: 'file-change', payload: { path, content } });
    }
  }, [fsState.updateNode, listeners.onFileSaved]);
  
  const setAiDiagnostics = useCallback((source: string, newDiagnostics: Diagnostic[]) => {
      setDiagnostics(prev => ({ ...prev, [source]: newDiagnostics }));
  }, []);
  
  const mainViewPlugins = ['storyboard', 'figma', 'image-to-code'];
  
  const switchView = useCallback((viewId: string) => {
    if (mainViewPlugins.includes(viewId)) {
        const pluginPath = `plugin:${viewId}`;
        if (!openFiles.includes(pluginPath)) {
            setOpenFiles(prev => [...prev, pluginPath]);
        }
        setActiveTab(pluginPath);
    } else {
        setActiveView(viewId);
    }
  }, [openFiles]);

  const switchBottomPanelView = useCallback((view: BottomPanelView) => {
    setActiveBottomTab(view);
  }, []);

  const replaceAll = useCallback(async (query: string, replaceWith: string, options: { isCaseSensitive: boolean, isRegex: boolean }) => {
    if (!fsState.fs) return;
    const allFiles = getAllFiles(fsState.fs, '/');
    const changes: { path: string, newContent: string }[] = [];
    let filesChangedCount = 0;
    let occurrencesCount = 0;

    const flags = options.isCaseSensitive ? 'g' : 'gi';
    const searchRegex = options.isRegex
        ? new RegExp(query, flags)
        : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    for (const file of allFiles) {
        if (file.content.match(searchRegex)) {
            const newContent = file.content.replace(searchRegex, replaceWith);
            occurrencesCount += (file.content.match(searchRegex) || []).length;
            changes.push({ path: file.path, newContent });
        }
    }

    if (changes.length > 0) {
        changes.forEach(change => fsState.updateNode(change.path, change.newContent));
        addNotification({ type: 'success', message: `Replaced ${occurrencesCount} occurrences in ${changes.length} files.` });
    } else {
        addNotification({ type: 'info', message: 'No occurrences found.' });
    }
  }, [fsState.fs, fsState.updateNode, addNotification]);

  const ideApi: IDEApi = useMemo(() => ({
      ...fsState,
      getFileSystem: () => fsState.fs,
      getActiveFile: () => lastActiveFile,
      getOpenFileContent: () => (activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant') ? fsState.readNode(activeTab) ?? '' : '',
      updateActiveFileContent: (content: string) => lastActiveFile && handleFileContentChange(lastActiveFile, content),
      addStatusBarItem: (item) => setStatusBarItems(prev => [...prev.filter(i => i.id !== item.id), item]),
      removeStatusBarItem: (id) => setStatusBarItems(prev => prev.filter(i => i.id !== id)),
      addEditorAction: (action) => setEditorActions(prev => [...prev.filter(a => a.id !== action.id), action]),
      removeEditorAction: (id) => setEditorActions(prev => prev.filter(a => a.id !== a.id)),
      onActiveFileChanged: (cb) => { listeners.onActiveFileChanged.add(cb); return () => listeners.onActiveFileChanged.delete(cb); },
      onFileSaved: (cb) => { listeners.onFileSaved.add(cb); return () => listeners.onFileSaved.delete(cb); },
      showNotification: (notification: Omit<Notification, 'id'>) => addNotification(notification),
      showInPreview: (title, component) => { setPreviewTitle(title); setPreviewContent(component); setIsPreviewVisible(true); },
      hidePreview: () => { setIsPreviewVisible(false); setPreviewTitle(''); setPreviewContent(null); setPreviewContext(null); setInspectedElement(null); setIsInspectorActive(false); },
      registerCommand,
      unregisterCommand: (commandId) => { /* Placeholder */ },
      setAiDiagnostics,
      getBreakpoints: () => breakpoints,
      clearConsole: () => setConsoleMessages([]),
      appendConsoleMessage: (message) => setConsoleMessages(prev => [...prev, message]),
      setRunContext: (htmlFile, jsFiles) => setRunContext(htmlFile && jsFiles ? { htmlFile, jsFiles } : null),
      setPreviewContext: (context) => setPreviewContext(context),
      toggleZenMode: () => setIsZenMode(prev => !prev),
      broadcastFileChange: (path, content) => collaborationChannel.current?.postMessage({ type: 'file-change', payload: { path, content } }),
      startVoiceRecognition: startListening,
      stopVoiceRecognition: stopListening,
      setDependencyReport,
      openFile: handleFileSelect,
      switchView,
      switchBottomPanelView,
      replaceAll,
      performSearch: (query) => {
          setSearchResults([]);
          setIsSearching(true);
          // This would be where you call the AI search service
          // For now, it's a placeholder.
          setTimeout(() => setIsSearching(false), 1000);
      }
  }), [fsState, lastActiveFile, listeners, addNotification, registerCommand, breakpoints, setAiDiagnostics, activeTab, handleFileContentChange, startListening, stopListening, handleFileSelect, switchView, switchBottomPanelView, replaceAll]);

  usePlugins(allPlugins, ideApi);
  
  const handleSetGithubToken = useCallback((token: string | null) => {
    if (token) {
        localStorage.setItem('githubToken', token);
    } else {
        localStorage.removeItem('githubToken');
    }
    setGithubToken(token);
  }, []);
  
  // New features setup
  useEffect(() => {
    // Collaboration setup
    const channel = new BroadcastChannel('codecraft_collaboration');
    collaborationChannel.current = channel;
    const user: UserPresence = { id: crypto.randomUUID(), name: `User-${Math.floor(Math.random()*1000)}`, color: `hsl(${Math.random()*360}, 70%, 50%)`, currentFile: lastActiveFile };
    currentUser.current = user;

    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        const { type, payload } = event.data;
        if (type === 'file-change' && payload.path === activeTab) {
            handleFileContentChange(payload.path, payload.content, true);
        } else if (type === 'presence-update') {
            setCollaborators(prev => [...prev.filter(c => c.id !== payload.user.id), payload.user]);
        }
    };
    const presenceInterval = setInterval(() => {
        user.currentFile = lastActiveFile;
        channel.postMessage({ type: 'presence-update', payload: { user }});
    }, 3000);

    return () => {
        clearInterval(presenceInterval);
        channel.close();
    };
  }, [lastActiveFile, activeTab, handleFileContentChange]);
  
  useEffect(() => {
    registerCommand({ id: 'zen.toggle', label: 'View: Toggle Zen Mode', category: 'View', action: () => setIsZenMode(p => !p) });
    registerCommand({ id: 'ai.image2code', label: 'AI: Generate UI from Image...', category: 'AI', action: () => switchView('image-to-code') });
  }, [registerCommand, switchView]);
  
  const handleVoiceCommand = (command: string) => {
    addNotification({ type: 'info', message: `Voice command: "${command}"`});
    // Simple command matching
    if (command.toLowerCase().includes('toggle zen mode')) ideApi.toggleZenMode();
    if (command.toLowerCase().startsWith('create file')) {
        const filename = command.split(' ').pop();
        if (filename) ideApi.createNode(`/${filename}`, 'file');
    }
  };
  
  useEffect(() => {
    if (!fsState.fs) return;
    const components: StoryboardComponent[] = [];
    const findComponents = (node: FileSystemNode, path: string) => {
        if (node.type === 'directory') {
            Object.entries(node.children).forEach(([name, child]) => findComponents(child, `${path}/${name}`));
        } else if (path.endsWith('.jsx') || path.endsWith('.tsx')) {
            components.push({ path, name: path.split('/').pop()?.replace(/\.jsx?|\.tsx?/, ''
) || '' });
        }
    };
    findComponents(fsState.fs, '');
    setStoryboardComponents(components);
  }, [fsState.fs]);


  const handleTabClose = useCallback((path: string) => {
    setOpenFiles(prev => {
      const newOpenFiles = prev.filter(p => p !== path);
      if (activeTab === path) {
        setActiveTab(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
      }
      return newOpenFiles;
    });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant') {
      setLastActiveFile(activeTab);
      listeners.onActiveFileChanged.forEach(cb => cb(activeTab));
    }
  }, [activeTab, listeners.onActiveFileChanged]);
  
  const handleRunAnalysis = useCallback((path: string | null) => {
    if (analysisTimeoutRef.current) {
        window.clearTimeout(analysisTimeoutRef.current);
    }
    analysisTimeoutRef.current = window.setTimeout(() => {
        if (path && !path.startsWith('plugin:')) {
            const content = fsState.readNode(path);
            if (content) {
                const language = path.split('.').pop() || '';
                const newDiagnostics = analyzeCode(content, language);
                setDiagnostics(prev => ({ ...prev, 'linter': newDiagnostics }));
            }
        } else {
             setDiagnostics(prev => ({ ...prev, 'linter': [] }));
        }
    }, 500);
  }, [fsState.readNode]);
  
  useEffect(() => {
    handleRunAnalysis(activeTab);
    return () => {
      if (analysisTimeoutRef.current) {
        window.clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [activeTab, fsState.readNode, handleRunAnalysis]);

  const handleAiFileSubmit = useCallback(async (basePath: string, filename: string, prompt: string) => {
    const fullPath = basePath === '/' ? `/${filename}` : `${basePath}/${filename}`;
    if (fsState.getNode(fullPath)) {
        throw new Error(`File already exists at ${fullPath}`);
    }
    addNotification({ message: `AI is generating ${filename}...`, type: 'info' });
    const content = await generateCodeForFile(prompt, filename);
    fsState.createNode(fullPath, 'file', content);
    addNotification({ message: `${filename} created successfully!`, type: 'success' });
    handleFileSelect(fullPath);
    setAiFileGeneratorState({ isOpen: false, path: '/' });
  }, [fsState.createNode, fsState.getNode, handleFileSelect, addNotification]);

  const handleBreakpointsChange = (path: string, newBreakpoints: number[]) => {
    setBreakpoints(prev => {
        const updated = { ...prev, [path]: newBreakpoints };
        localStorage.setItem('breakpoints', JSON.stringify(updated));
        return updated;
    });
  };
  
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(handleVoiceCommand);
    }
  };

  const handleSelectTemplate = useCallback((template: ProjectTemplate) => {
    setConfirmationState({
        isOpen: true,
        title: `Load '${template.name}' Template?`,
        message: (
            <p>This will <strong className="text-red-400">replace your entire current workspace</strong>. All unsaved changes will be lost. Are you sure you want to continue?</p>
        ),
        onConfirm: () => {
            try {
                const newFs = buildFsFromTemplate(template.files);
                fsState.replaceFs(newFs);
                // Close all tabs and open the main file of the template
                setOpenFiles([]);
                setActiveTab(null);
                const mainFile = Object.keys(template.files).find(f => f.includes('index.html') || f.includes('main.jsx') || f.includes('App.jsx'));
                if (mainFile) {
                    handleFileSelect(mainFile);
                }
                addNotification({type: 'success', message: `'${template.name}' template loaded successfully.`});
            } catch(e) {
                if (e instanceof Error) addNotification({ type: 'error', message: `Failed to load template: ${e.message}`});
            }
        }
    });
  }, [fsState.replaceFs, addNotification, handleFileSelect]);

  const handleAiScaffold = useMemo(() => {
    return commands.find(c => c.id === 'ai.scaffold.project')?.action;
  }, [commands]);
  
  if (fsState.isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#0a0a19] text-white">
        <p className="animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  // App structure
  if (isZenMode) {
    return (
        <main className="w-screen h-screen bg-transparent p-4 flex flex-col">
            <EditorPane
                openFiles={openFiles}
                activeTab={activeTab}
                onTabSelect={setActiveTab}
                onTabClose={handleTabClose}
                fileContent={(activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant') ? fsState.readNode(activeTab) ?? '' : ''}
                onContentChange={handleFileContentChange}
                editorActions={editorActions}
                diagnostics={combinedDiagnostics.filter(d => d.source !== 'AI Code Review')}
                breakpoints={breakpoints[activeTab || ''] || []}
                onBreakpointsChange={handleBreakpointsChange}
                pluginViews={{}}
            />
        </main>
    )
  }
  
  const rightPanelContent = (
    <div className="flex flex-col h-full bg-[var(--ui-panel-bg)] backdrop-blur-md">
      <div className={isInspectorActive ? "h-3/5" : "h-full"}>
         <PreviewContainer
            isVisible={isPreviewVisible || !!serverUrl}
            title={previewTitle}
            onClose={ideApi.hidePreview}
            previewContext={previewContext}
            serverUrl={serverUrl}
            iframeRef={previewIframeRef}
            onToggleInspector={handleToggleInspector}
            isInspectorActive={isInspectorActive}
          >
            {previewContent || <div />}
          </PreviewContainer>
      </div>
      {isInspectorActive && (
        <div className="h-2/5 border-t-2 border-[var(--ui-border)]">
           <InspectorPanel 
              element={inspectedElement} 
              onStyleChange={handleStyleChange}
              onSaveChanges={handleSaveChangesToStylesheet}
              isSaving={isSavingCss}
           />
        </div>
      )}
    </div>
  );
  
  const pluginViews: Record<string, React.ReactNode> = {
    'plugin:storyboard': <StoryboardPanel components={storyboardComponents} readNode={fsState.readNode} />,
    'plugin:figma': <FigmaPanel />,
    'plugin:image-to-code': <ImageToCodePanel />,
  };

  return (
    <AIProvider 
      activeFile={activeTab} 
      getOpenFileContent={() => (activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant') ? fsState.readNode(activeTab) ?? '' : ''}
      createNode={fsState.createNode}
      updateNode={fsState.updateNode}
      getNode={fsState.getNode}
      openFile={handleFileSelect}
      fs={fsState.fs}
      setDiffModalState={setDiffModalState}
    >
        <div className="w-screen h-screen bg-transparent p-4 flex flex-col gap-4">
           <TitleBar onTogglePanel={togglePanel} panelVisibility={panelVisibility} />
          <div className="flex-grow flex min-h-0">
              {panelVisibility.left && <ActivityBar activeView={activeView} setActiveView={switchView} />}
              <div className={`flex-grow ${panelVisibility.left ? 'ml-4' : ''}`}>
                <ResizablePanels
                  panelVisibility={panelVisibility}
                  leftPanel={
                      <SideBar activeView={activeView}>
                          <FileExplorer 
                              fs={fsState.fs!}
                              onFileSelect={handleFileSelect}
                              createNode={fsState.createNode}
                              deleteNode={fsState.deleteNode}
                              renameNode={fsState.renameNode}
                              moveNode={fsState.moveNode}
                              openAiFileGenerator={(path) => setAiFileGeneratorState({ isOpen: true, path })}
                          />
                           <SearchPanel 
                              performSearch={ideApi.performSearch}
                              isSearching={isSearching}
                              searchResults={searchResults}
                              onResultClick={handleFileSelect}
                              replaceAll={replaceAll}
                          />
                          <SourceControlPanel 
                              fs={fsState.fs!} 
                              replaceFs={fsState.replaceFs} 
                              githubToken={githubToken} 
                              switchView={switchView}
                              supabaseUser={supabaseUser}
                          />
                          <TemplatesPanel
                              templates={templates}
                              onSelectTemplate={handleSelectTemplate}
                              onScaffoldWithAi={handleAiScaffold}
                          />
                          {/* These panels are now main views */}
                          <div />
                          <div />
                          <PluginPanel plugins={allPlugins} />
                          <SettingsPanel
                             githubToken={githubToken}
                             setGithubToken={handleSetGithubToken}
                             supabaseUser={supabaseUser}
                             supabaseUrl={supabaseUrl}
                             setSupabaseUrl={setSupabaseUrl}
                             supabaseAnonKey={supabaseAnonKey}
                             setSupabaseAnonKey={setSupabaseAnonKey}
                             geminiApiKey={geminiApiKey}
                             setGeminiApiKey={handleSetGeminiApiKey}
                          />
                      </SideBar>
                  }
                  mainPanel={
                       <EditorPane
                          openFiles={openFiles}
                          activeTab={activeTab}
                          onTabSelect={setActiveTab}
                          onTabClose={handleTabClose}
                          fileContent={(activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant') ? fsState.readNode(activeTab) ?? '' : ''}
                          onContentChange={handleFileContentChange}
                          editorActions={editorActions}
                          diagnostics={combinedDiagnostics.filter(d => d.source !== 'AI Code Review')}
                          breakpoints={breakpoints[activeTab || ''] || []}
                          onBreakpointsChange={handleBreakpointsChange}
                          pluginViews={pluginViews}
                      />
                  }
                  rightPanel={rightPanelContent}
                  bottomPanel={
                     <TabbedPanel 
                          diagnostics={combinedDiagnostics} 
                          dependencyReport={dependencyReport}
                          activeTab={activeBottomTab}
                          onTabChange={setActiveBottomTab}
                     >
                          <Terminal fs={fsState.fs}/>
                          <ProblemsPanel 
                            diagnostics={combinedDiagnostics} 
                            onProblemSelect={(path, line) => handleFileSelect(path, line)} 
                            activeFile={activeTab}
                            readNode={fsState.readNode}
                            updateNode={fsState.updateNode}
                            addNotification={addNotification}
                          />
                           <DebugConsolePanel 
                             messages={consoleMessages} 
                             onClear={() => setConsoleMessages([])}
                             onAiFixRequest={handleAiFixRequest}
                             isFixingWithAi={isFixingWithAi}
                           />
                           <DependencyPanel report={dependencyReport} />
                     </TabbedPanel>
                  }
                />
              </div>
          </div>
          <StatusBar 
            activeFile={activeTab} 
            customItems={statusBarItems} 
            diagnostics={combinedDiagnostics}
            collaborators={collaborators}
            voiceStatus={voiceStatus}
            onVoiceToggle={handleVoiceToggle}
            supabaseUser={supabaseUser}
          />
        </div>
        <CommandPalette />
        <AiFileGeneratorModal 
            isOpen={aiFileGeneratorState.isOpen}
            onClose={() => setAiFileGeneratorState({ isOpen: false, path: '/' })}
            onSubmit={handleAiFileSubmit}
            basePath={aiFileGeneratorState.path}
            addNotification={addNotification}
        />
        <RegexGeneratorModal 
            isOpen={isRegexModalOpen}
            onClose={() => setIsRegexModalOpen(false)}
            addNotification={addNotification}
        />
        <ConfirmationModal
            isOpen={confirmationState.isOpen}
            onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
            onConfirm={() => {
                confirmationState.onConfirm();
                setConfirmationState(prev => ({ ...prev, isOpen: false }));
            }}
            title={confirmationState.title}
        >
            {confirmationState.message}
        </ConfirmationModal>
        {diffModalState.isOpen && (
            <AiDiffViewModal
                isOpen={diffModalState.isOpen}
                onClose={() => setDiffModalState({ isOpen: false, actions: [], originalFiles: [] })}
                actions={diffModalState.actions}
                originalFiles={diffModalState.originalFiles}
                messageIndex={diffModalState.messageIndex}
            />
        )}
    </AIProvider>
  );
};


const App: React.FC = () => {
    return (
        <ThemeProvider>
            <CommandPaletteProvider>
                <NotificationContext.Provider value={{ addNotification: () => {} }}>
                     <AppWithNotifications />
                </NotificationContext.Provider>
            </CommandPaletteProvider>
        </ThemeProvider>
    );
};

// Separate component to use the notification context
const AppWithNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const id = crypto.randomUUID();
        setNotifications(prev => [...prev.filter(n => n.message !== notification.message), { ...notification, id }]);
    }, []);

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const contextValue = useMemo(() => ({ addNotification }), [addNotification]);
    const fsState = useFileSystem(null, addNotification); // Assuming no user for now.
    
    // Global key listener for Command Palette
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                // A bit of a hack to make it available globally for plugins without deep prop drilling
                const paletteToggler = (window as any).toggleCommandPalette;
                if (paletteToggler) {
                    paletteToggler();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);


    return (
        <NotificationContext.Provider value={contextValue}>
            <WebContainerProvider fs={fsState.fs}>
                <AppContent />
            </WebContainerProvider>
            <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
        </NotificationContext.Provider>
    );
}


export default App;