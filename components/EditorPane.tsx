
import React from 'react';
import MonacoEditor from './MonacoEditor';
import type { EditorAction, Diagnostic } from '../types';
import AIAssistant from './AIAssistant';
import { Icons } from './Icon';

interface EditorPaneProps {
  openFiles: string[];
  activeTab: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  fileContent: string;
  onContentChange: (path: string, content: string) => void;
  editorActions: EditorAction[];
  diagnostics: Diagnostic[];
  breakpoints: number[];
  onBreakpointsChange: (path: string, newBreakpoints: number[]) => void;
  pluginViews: Record<string, React.ReactNode>;
}

const EditorPane: React.FC<EditorPaneProps> = ({
  openFiles,
  activeTab,
  onTabSelect,
  onTabClose,
  fileContent,
  onContentChange,
  editorActions,
  diagnostics,
  breakpoints,
  onBreakpointsChange,
  pluginViews,
}) => {

  const isFileActive = activeTab && !activeTab.startsWith('plugin:') && activeTab !== 'ai-assistant';

  const relevantActions = isFileActive
    ? editorActions.filter(a => a.shouldShow(activeTab, fileContent))
    : [];

  const handleAction = (actionId: string) => {
    const action = editorActions.find(a => a.id === actionId);
    if(action && isFileActive){
        action.action(activeTab, fileContent);
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[var(--ui-panel-bg)] backdrop-blur-md">
      <div className="flex-shrink-0 bg-[var(--ui-panel-bg-heavy)] flex justify-between items-center">
        <div className="flex items-center overflow-x-auto">
          {openFiles.map(path => {
              if (path.startsWith('plugin:')) {
                const pluginId = path.split(':')[1];
                return (
                    <PluginTab
                        key={path}
                        pluginId={pluginId}
                        isActive={activeTab === path}
                        onSelect={() => onTabSelect(path)}
                        onClose={() => onTabClose(path)}
                    />
                );
              }
              return (
                <Tab
                  key={path}
                  path={path}
                  isActive={activeTab === path}
                  onSelect={() => onTabSelect(path)}
                  onClose={() => onTabClose(path)}
                />
            );
          })}
          <AITab
            isActive={activeTab === 'ai-assistant'}
            onSelect={() => onTabSelect('ai-assistant')}
          />
        </div>
        <div className="flex items-center pr-2">
            {relevantActions.map(action => (
                <button 
                    key={action.id}
                    title={action.label}
                    onClick={() => handleAction(action.id)}
                    className="p-2 rounded hover:bg-[var(--ui-hover-bg)]"
                >
                    {action.icon}
                </button>
            ))}
        </div>
      </div>
      <div className="flex-grow w-full h-full overflow-hidden flex">
        {activeTab === 'ai-assistant' ? (
            <AIAssistant />
        ) : activeTab?.startsWith('plugin:') ? (
            pluginViews[activeTab] || <div className="p-4">Unknown Plugin: {activeTab}</div>
        ) : isFileActive ? (
            <MonacoEditor
                key={activeTab}
                value={fileContent}
                onChange={(content) => onContentChange(activeTab, content || '')}
                path={activeTab}
                diagnostics={diagnostics}
                breakpoints={breakpoints}
                onBreakpointsChange={onBreakpointsChange}
            />
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};

interface TabProps {
  path: string;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const Tab: React.FC<TabProps> = ({ path, isActive, onSelect, onClose }) => {
  const fileName = path.split('/').pop();

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-2 cursor-pointer text-sm border-r border-[var(--ui-border)] transition-colors duration-200 ${
        isActive
          ? 'bg-[var(--ui-panel-bg)] text-[var(--text-primary)]'
          : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
      }`}
    >
      <span className="whitespace-nowrap">{fileName}</span>
      <button
        onClick={handleClose}
        className="ml-3 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--ui-hover-bg)] flex-shrink-0 transform transition-transform hover:scale-110 hover:rotate-90"
      >
        &times;
      </button>
    </div>
  );
};

const getPluginInfo = (pluginId: string) => {
    switch (pluginId) {
        case 'storyboard':
            return { title: 'Storyboard', icon: <Icons.LayoutDashboard className="w-4 h-4 mr-2" /> };
        case 'figma':
            return { title: 'Figma Import', icon: <Icons.Figma className="w-4 h-4 mr-2" /> };
        case 'image-to-code':
            return { title: 'Image to Code', icon: <Icons.Image className="w-4 h-4 mr-2" /> };
        default:
            return { title: pluginId, icon: <Icons.Puzzle className="w-4 h-4 mr-2" /> };
    }
};

const PluginTab: React.FC<{ pluginId: string; isActive: boolean; onSelect: () => void; onClose: () => void; }> = ({ pluginId, isActive, onSelect, onClose }) => {
    const { title, icon } = getPluginInfo(pluginId);
    
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    return (
        <div
          onClick={onSelect}
          className={`flex items-center justify-between p-2 cursor-pointer text-sm border-r border-[var(--ui-border)] transition-colors duration-200 ${
            isActive
              ? 'bg-[var(--ui-panel-bg)] text-[var(--text-primary)]'
              : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
          }`}
        >
          {icon}
          <span className="whitespace-nowrap">{title}</span>
          <button
            onClick={handleClose}
            className="ml-3 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--ui-hover-bg)] flex-shrink-0 transform transition-transform hover:scale-110 hover:rotate-90"
          >
            &times;
          </button>
        </div>
    );
};


const AITab: React.FC<{ isActive: boolean; onSelect: () => void }> = ({ isActive, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center p-2 cursor-pointer text-sm border-r border-l border-[var(--ui-border)] ${
        isActive
          ? 'bg-[var(--ui-panel-bg)] text-[var(--text-primary)]'
          : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--ui-hover-bg)]'
      }`}
    >
      <Icons.Bot className="w-4 h-4 mr-2 flex-shrink-0" />
      <span className="whitespace-nowrap">AI Assistant</span>
    </div>
  );
};


const WelcomeScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] p-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mb-4"><path d="M10 20.5 2 17.5l8-15 12 5-12 13z"/><path d="m2 17.5 8 3 8-10-8-3z"/><path d="M10 5.5v15"/></svg>
        <h2 className="text-2xl font-semibold text-[var(--text-secondary)]">CodeCraft IDE</h2>
        <p className="mt-2">Select a file from the explorer to begin editing.</p>
        <p className="text-sm mt-4">Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl+Shift+P</kbd> to open the Command Palette.</p>
    </div>
);


export default EditorPane;
