
import React, { useState } from 'react';
import { Icons } from './Icon';
import type { Diagnostic, DependencyReport, BottomPanelView } from '../types';

interface TabbedPanelProps {
  children: React.ReactNode[];
  diagnostics: Diagnostic[];
  dependencyReport?: DependencyReport | null;
  activeTab: BottomPanelView;
  onTabChange: (tab: BottomPanelView) => void;
}

const TabbedPanel: React.FC<TabbedPanelProps> = ({ children, diagnostics, dependencyReport, activeTab, onTabChange }) => {
  const tabs: { name: string; id: BottomPanelView; icon: React.ReactNode; }[] = [
    { name: 'Terminal', id: 'terminal', icon: <Icons.Terminal className="w-4 h-4" /> },
    { name: 'Problems', id: 'problems', icon: <Icons.AlertTriangle className="w-4 h-4" /> },
    { name: 'Debug Console', id: 'debug-console', icon: <Icons.Bug className="w-4 h-4" /> },
    { name: 'Dependencies', id: 'dependencies', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
  ];
  
  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const depIssueCount = dependencyReport ? 
    [...dependencyReport.dependencies, ...dependencyReport.devDependencies].filter(d => d.status !== 'ok').length 
    : 0;

  const tabNameToIndex: Record<BottomPanelView, number> = {
    'terminal': 0,
    'problems': 1,
    'debug-console': 2,
    'dependencies': 3,
  };
  const activeTabIndex = tabNameToIndex[activeTab];

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-shrink-0 bg-[var(--ui-panel-bg-heavy)] backdrop-blur-md flex items-center border-b border-t border-[var(--ui-border)]">
        {tabs.map((tab, index) => (
          <button
            key={tab.name}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm focus:outline-none ${
              activeTabIndex === index
                ? 'bg-[var(--ui-panel-bg)] text-white'
                : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
            {tab.name === 'Problems' && (errorCount > 0 || warningCount > 0) && (
              <span className="text-xs bg-gray-600 rounded-full px-1.5 py-0.5">
                {errorCount + warningCount}
              </span>
            )}
             {tab.name === 'Dependencies' && depIssueCount > 0 && (
              <span className="text-xs bg-yellow-600 text-white rounded-full px-1.5 py-0.5">
                {depIssueCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-hidden">
        {React.Children.map(children, (child, index) => (
          <div className={`${activeTabIndex === index ? 'h-full' : 'hidden'}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabbedPanel;