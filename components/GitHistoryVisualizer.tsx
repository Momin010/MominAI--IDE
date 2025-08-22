
import React from 'react';
import type { GistCommit } from '../types';

interface GitHistoryVisualizerProps {
    history: GistCommit[];
}

const GitHistoryVisualizer: React.FC<GitHistoryVisualizerProps> = ({ history }) => {
    if (history.length === 0) {
        return <p className="p-4 text-center text-gray-400">No commit history yet. Push your workspace to a Gist to begin.</p>;
    }
    
    const reversedHistory = [...history].reverse();

    return (
        <div className="p-4 text-sm">
            <ul>
                {reversedHistory.map((commit, index) => (
                    <li key={commit.id + index} className="flex items-start mb-4">
                        <div className="flex flex-col items-center mr-4">
                            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-600"></div>
                            {index < reversedHistory.length - 1 && (
                                <div className="w-px h-12 bg-gray-600"></div>
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-white">{commit.message}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                                <span className="font-mono text-green-400">{commit.id}</span>
                                <span>{new Date(commit.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default GitHistoryVisualizer;
