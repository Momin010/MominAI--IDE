
import React, { useState } from 'react';
import type { Diagnostic, Notification } from '../types';
import { Icons } from './Icon';
import { getSuggestedFix } from '../services/aiService';

interface ProblemsPanelProps {
    diagnostics: Diagnostic[];
    onProblemSelect: (path: string, line: number) => void;
    activeFile: string | null;
    readNode: (path: string) => string | null;
    updateNode: (path: string, content: string) => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const ProblemIcon: React.FC<{ severity: Diagnostic['severity'] }> = ({ severity }) => {
    switch (severity) {
        case 'error':
            return <Icons.AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
        case 'warning':
            return <Icons.AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
        case 'info':
            return <Icons.Info className="w-4 h-4 text-blue-400 flex-shrink-0" />;
        default:
            return null;
    }
};

const ProblemsPanel: React.FC<ProblemsPanelProps> = ({ diagnostics, onProblemSelect, activeFile, readNode, updateNode, addNotification }) => {
    
    const problemsForActiveFile = activeFile ? diagnostics : [];
    const [suggestion, setSuggestion] = useState<{ forLine: number, original: string, fix: string } | null>(null);
    const [isLoadingFix, setIsLoadingFix] = useState<number | null>(null);

    const handleSuggestFix = async (problem: Diagnostic) => {
        if (!activeFile) return;
        setIsLoadingFix(problem.line);
        setSuggestion(null);
        try {
            const content = readNode(activeFile);
            if (!content) throw new Error("Could not read active file content.");
            const fix = await getSuggestedFix(content, problem, activeFile);
            const originalLine = content.split('\n')[problem.line - 1];
            setSuggestion({ forLine: problem.line, original: originalLine, fix });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoadingFix(null);
        }
    };
    
    const handleApplyFix = () => {
        if (!suggestion || !activeFile) return;
        const oldContent = readNode(activeFile);
        if (oldContent) {
            const lines = oldContent.split('\n');
            lines[suggestion.forLine - 1] = suggestion.fix;
            updateNode(activeFile, lines.join('\n'));
            addNotification({ type: 'success', message: `Fix applied to line ${suggestion.forLine}.` });
            setSuggestion(null);
        }
    };

    return (
        <div className="text-gray-200 h-full flex flex-col font-sans bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)] flex-shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider">Problems ({problemsForActiveFile.length})</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-1 text-sm">
                {problemsForActiveFile.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No problems have been detected in the workspace.</p>
                ) : (
                    <div>
                        <h3 className="font-bold text-white px-2 py-1">{activeFile}</h3>
                        {problemsForActiveFile.map((problem, index) => (
                            <div key={index} className="border-b border-white/5 last:border-b-0">
                                <div className="flex items-start p-2 pl-4 cursor-pointer hover:bg-white/10" onClick={() => onProblemSelect(activeFile!, problem.line)}>
                                    <div className="mr-2 pt-0.5"><ProblemIcon severity={problem.severity} /></div>
                                    <div className="flex-grow">
                                        <p>{problem.message} <span className="text-gray-500 ml-2">[{problem.source}]</span></p>
                                        <span className="text-xs text-gray-500">Ln {problem.line}, Col {problem.startCol}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleSuggestFix(problem); }}
                                        disabled={isLoadingFix === problem.line}
                                        className="text-xs bg-blue-600/50 hover:bg-blue-600 rounded px-2 py-0.5 ml-2 transition-colors disabled:opacity-50"
                                    >
                                        {isLoadingFix === problem.line ? '...' : 'Suggest Fix'}
                                    </button>
                                </div>
                                {suggestion?.forLine === problem.line && (
                                    <div className="bg-black/20 p-2 mx-2 mb-2 rounded font-mono text-xs">
                                        <pre className="text-red-400 whitespace-pre-wrap"><span className="select-none">- </span>{suggestion.original}</pre>
                                        <pre className="text-green-400 whitespace-pre-wrap"><span className="select-none">+ </span>{suggestion.fix}</pre>
                                        <div className="flex justify-end space-x-2 mt-2">
                                            <button onClick={() => setSuggestion(null)} className="px-2 py-1 bg-gray-600 rounded">Cancel</button>
                                            <button onClick={handleApplyFix} className="px-2 py-1 bg-green-600 rounded">Apply Fix</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProblemsPanel;