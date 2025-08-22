
import React from 'react';
import type { StatusBarItem, Diagnostic, UserPresence, SupabaseUser } from '../types';
import { Icons } from './Icon';
import CollaborationStatus from './CollaborationStatus';
import VoiceControlUI from './VoiceControlUI';

interface StatusBarProps {
  activeFile: string | null;
  customItems: StatusBarItem[];
  diagnostics: Diagnostic[];
  collaborators: UserPresence[];
  voiceStatus: string;
  onVoiceToggle: () => void;
  supabaseUser: SupabaseUser | null;
}

const SupabaseStatus: React.FC<{ user: SupabaseUser | null }> = ({ user }) => {
  const isConnected = !!user;
  return (
    <div title={isConnected ? `Connected to Supabase as ${user.email}` : 'Disconnected from Supabase'} className={`flex items-center space-x-1 ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
    </div>
  );
};

export const StatusBar: React.FC<StatusBarProps> = ({ activeFile, customItems, diagnostics, collaborators, voiceStatus, onVoiceToggle, supabaseUser }) => {
  const getLanguage = (path: string | null): string => {
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
        return 'JavaScript';
      case 'jsx':
          return 'JavaScript React';
      case 'ts':
        return 'TypeScript';
      case 'tsx':
        return 'TypeScript React';
      case 'json':
        return 'JSON';
      case 'md':
        return 'Markdown';
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      default:
        return 'Plain Text';
    }
  };

  const sortedCustomItems = [...customItems].sort((a, b) => (a.priority || 100) - (b.priority || 100));
  
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <footer className="bg-[var(--ui-panel-bg)] backdrop-blur-md text-[var(--text-secondary)] px-4 py-1 text-xs flex items-center justify-between border border-[var(--ui-border)] flex-shrink-0 rounded-[var(--ui-border-radius)] shadow-lg">
      <div className="flex items-center space-x-4">
        <span>main*</span>
        <div className="flex items-center space-x-2" title="Problems">
            <div className="flex items-center space-x-1">
                <Icons.XCircle className="w-3.5 h-3.5" />
                <span>{errorCount}</span>
            </div>
             <div className="flex items-center space-x-1">
                <Icons.AlertTriangle className="w-3.5 h-3.5" />
                <span>{warningCount}</span>
            </div>
        </div>
        <CollaborationStatus collaborators={collaborators} />
      </div>
      <div className="flex items-center space-x-4">
        {sortedCustomItems.map(item => (
            <React.Fragment key={item.id}>{item.component}</React.Fragment>
        ))}
        <VoiceControlUI status={voiceStatus} onToggle={onVoiceToggle} />
        <SupabaseStatus user={supabaseUser} />
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>{getLanguage(activeFile)}</span>
        <span className="text-[var(--text-primary)]">Ready</span>
      </div>
    </footer>
  );
};