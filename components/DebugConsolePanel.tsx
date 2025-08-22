
import React, { useRef, useEffect } from 'react';
import type { ConsoleMessage } from '../types';
import { Icons } from './Icon';

interface DebugConsolePanelProps {
    messages: ConsoleMessage[];
    onClear: () => void;
    onAiFixRequest: (error: ConsoleMessage) => void;
    isFixingWithAi: string | null;
}

const MessageIcon: React.FC<{ type: ConsoleMessage['type'] }> = ({ type }) => {
    switch (type) {
        case 'error':
            return <Icons.XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
        case 'warn':
            return <Icons.AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
        case 'info':
            return <Icons.Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
        case 'system':
            return <Icons.Terminal className="w-4 h-4 text-gray-400 flex-shrink-0" />;
        default:
            return <Icons.ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
};

const getMessageStyle = (type: ConsoleMessage['type']): string => {
    switch (type) {
        case 'error': return 'text-red-400';
        case 'warn': return 'text-yellow-400';
        case 'info': return 'text-blue-400';
        case 'system': return 'text-gray-400 italic';
        default: return 'text-gray-200';
    }
}

const DebugConsolePanel: React.FC<DebugConsolePanelProps> = ({ messages, onClear, onAiFixRequest, isFixingWithAi }) => {
    const endOfPanelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="text-gray-200 h-full flex flex-col font-sans bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)] flex-shrink-0 flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider">Debug Console</h2>
                <button 
                    onClick={onClear} 
                    title="Clear console" 
                    className="p-1 rounded hover:bg-white/20 text-gray-400"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                </button>
            </div>
            <div className="flex-grow overflow-y-auto p-1 font-mono text-xs">
                {messages.map((msg, index) => {
                    const fullMessageString = msg.message.join(' ');
                    const isThisMessageBeingFixed = isFixingWithAi === fullMessageString;
                    return (
                        <div key={index} className={`flex items-start justify-between border-b border-white/5 py-1 px-2 ${getMessageStyle(msg.type)}`}>
                            <div className="flex items-start flex-grow min-w-0">
                                <div className="mr-2 pt-0.5"><MessageIcon type={msg.type} /></div>
                                <div className="whitespace-pre-wrap break-words">
                                {msg.message.map((part, i) => <span key={i}>{part} </span>)}
                                </div>
                            </div>
                            <div className="flex items-center flex-shrink-0 ml-4 pl-2">
                               {msg.type === 'error' && (
                                    <button
                                        onClick={() => onAiFixRequest(msg)}
                                        disabled={!!isFixingWithAi}
                                        className="text-xs bg-blue-600 hover:bg-blue-500 rounded px-2 py-0.5 mr-2 transition-colors disabled:bg-gray-500 disabled:cursor-wait"
                                    >
                                        {isThisMessageBeingFixed ? 'Fixing...' : 'Fix with AI'}
                                    </button>
                                )}
                                <div className="text-gray-500 w-16 text-right">{msg.timestamp}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endOfPanelRef}></div>
            </div>
        </div>
    );
};

export default DebugConsolePanel;