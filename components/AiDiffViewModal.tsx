import React, { useMemo } from 'react';
import type { FileAction, DiffLine } from '../types';
import { useAI } from '../contexts/AIContext';
import { useNotifications } from '../App';
import { generateDiff } from '../utils/diff';

interface AiDiffViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: FileAction[];
  originalFiles: { path: string, content: string }[];
  messageIndex?: number;
}

const DiffView: React.FC<{ original: string, modified: string }> = ({ original, modified }) => {
    const diffLines = useMemo(() => generateDiff(original, modified), [original, modified]);

    return (
        <div className="font-mono text-xs bg-[#0d1117] rounded-lg p-2 overflow-auto">
            <pre>
                {diffLines.map((line, index) => {
                    let lineClass = 'flex ';
                    let prefix = '';
                    let lineNumber = '';
                    if (line.type === 'added') {
                        lineClass += 'bg-green-600/20 text-green-300';
                        prefix = '+';
                        lineNumber = String(line.lineNumber).padStart(3, ' ');
                    } else if (line.type === 'removed') {
                        lineClass += 'bg-red-600/20 text-red-300';
                        prefix = '-';
                        lineNumber = String(index + 1).padStart(3, ' ');
                    } else {
                        lineClass += 'text-gray-400';
                        prefix = ' ';
                        lineNumber = String(line.lineNumber).padStart(3, ' ');
                    }
                    return (
                        <code key={index} className={lineClass}>
                            <span className="w-10 text-right pr-2 select-none opacity-50">{lineNumber}</span>
                            <span className="w-4 select-none">{prefix}</span>
                            <span className="whitespace-pre-wrap flex-1">{line.content}</span>
                        </code>
                    );
                })}
            </pre>
        </div>
    );
};

const AiDiffViewModal: React.FC<AiDiffViewModalProps> = ({ isOpen, onClose, actions, originalFiles, messageIndex }) => {
    const { createNode, updateNode, getNode, openFile, setMessages } = useAI();
    const { addNotification } = useNotifications();

    if (!isOpen) return null;

    const handleApplyChanges = () => {
        try {
            actions.forEach(action => {
                if (action.action === 'create') {
                    createNode(action.path, 'file', action.content);
                } else if (action.action === 'update') {
                    if (!getNode(action.path)) {
                        addNotification({ type: 'info', message: `Creating new file at ${action.path} as it did not exist.` });
                        createNode(action.path, 'file', action.content);
                    } else {
                        updateNode(action.path, action.content);
                    }
                }
            });

            if (actions.length > 0) {
                openFile(actions[0].path);
            }

            if (typeof messageIndex !== 'undefined') {
                setMessages(prev => {
                    const newMessages = [...prev];
                    const msg = newMessages[messageIndex];
                    if (msg) {
                        newMessages[messageIndex] = { ...msg, actionsApplied: true };
                    }
                    return newMessages;
                });
            }

            addNotification({ type: 'success', message: 'AI changes applied successfully!' });
            onClose();
        } catch (error) {
            if (error instanceof Error) {
                addNotification({ type: 'error', message: `Failed to apply changes: ${error.message}` });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-[var(--ui-panel-bg-heavy)] text-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col p-6 border border-[var(--ui-border)] animate-float-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 flex-shrink-0">Review AI-Generated Changes</h2>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {actions.map((action, index) => {
                        const originalFile = originalFiles.find(f => f.path === action.path);
                        const originalContent = originalFile?.content || '';
                        const modifiedContent = action.content || ''; // FIX: Ensure content is a string
                        
                        return (
                            <div key={index} className="bg-black/20 rounded-lg">
                                <div className="p-2 border-b border-white/10 flex items-center">
                                    <span className={`px-1.5 py-0.5 text-xs rounded mr-2 font-semibold ${action.action === 'create' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black'}`}>
                                        {action.action.toUpperCase()}
                                    </span>
                                    <span className="font-mono text-gray-300">{action.path}</span>
                                </div>
                                <div className="p-2">
                                    <DiffView original={originalContent} modified={modifiedContent} />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end space-x-3 mt-4 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500">Cancel</button>
                    <button onClick={handleApplyChanges} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">Confirm & Apply Changes</button>
                </div>
            </div>
        </div>
    );
};

export default AiDiffViewModal;
