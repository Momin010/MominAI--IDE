
import React from 'react';
import type { DependencyReport, DependencyInfo } from '../types';

interface DependencyPanelProps {
    report: DependencyReport | null;
}

const getStatusColor = (status: DependencyInfo['status']) => {
    switch (status) {
        case 'outdated': return 'bg-yellow-500/20 text-yellow-300';
        case 'vulnerable': return 'bg-red-500/20 text-red-300';
        default: return 'bg-green-500/10 text-green-300';
    }
};

const DependencyTable: React.FC<{ title: string; dependencies: DependencyInfo[] }> = ({ title, dependencies }) => (
    <div className="mb-4">
        <h3 className="font-bold text-white px-2 py-1">{title} ({dependencies.length})</h3>
        {dependencies.map(dep => (
            <div key={dep.name} className="p-2 border-b border-white/10">
                <div className="flex justify-between items-center">
                    <span className="font-mono text-blue-300">{dep.name}</span>
                    <div>
                        <span className="font-mono text-gray-400 mr-2">{dep.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(dep.status)}`}>{dep.status}</span>
                    </div>
                </div>
                {dep.summary && <p className="text-xs text-gray-400 mt-1 pl-2">{dep.summary}</p>}
            </div>
        ))}
    </div>
);

const DependencyPanel: React.FC<DependencyPanelProps> = ({ report }) => {
    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)] flex-shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider">Dependency Analysis</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-1 text-sm">
                {!report ? (
                    <p className="p-4 text-center text-gray-500">
                        No report generated. Open `package.json` and run 'Dependencies: Analyze package.json' from the command palette.
                    </p>
                ) : (
                    <div>
                        <DependencyTable title="Dependencies" dependencies={report.dependencies} />
                        <DependencyTable title="Dev Dependencies" dependencies={report.devDependencies} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DependencyPanel;
