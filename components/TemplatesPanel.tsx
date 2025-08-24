
import React from 'react';
import type { ProjectTemplate } from '../services/templates';
import { Icons } from './Icon';

interface TemplatesPanelProps {
  templates: ProjectTemplate[];
  onSelectTemplate: (template: ProjectTemplate) => void;
  onScaffoldWithAi?: () => void;
}

const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ templates, onSelectTemplate, onScaffoldWithAi }) => {
    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)] flex-shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider">Project Templates</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {/* AI Scaffolder Card */}
                {onScaffoldWithAi && (
                    <div 
                        className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-4 rounded-lg border border-purple-400/50 hover:border-purple-400 transition-all cursor-pointer group"
                        onClick={onScaffoldWithAi}
                    >
                        <div className="flex items-center mb-2">
                            <Icons.FileSparkle className="w-8 h-8 mr-3 text-purple-300 group-hover:scale-110 transition-transform" />
                            <h3 className="font-bold text-white text-lg">New Project with AI</h3>
                        </div>
                        <p className="text-sm text-gray-300">
                            Describe the project you want to build, and the AI will generate the entire file structure for you.
                        </p>
                    </div>
                )}
                
                {/* Pre-defined Templates */}
                {templates.map(template => (
                    <div key={template.id} className="bg-black/20 p-3 rounded-lg flex items-start space-x-4">
                        <div className="flex-shrink-0 text-[var(--accent-primary)] pt-1">
                            {template.icon}
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-white">{template.name}</h3>
                            <p className="text-sm text-gray-400 mt-1 mb-3">{template.description}</p>
                            <button
                                onClick={() => onSelectTemplate(template)}
                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded px-3 py-1.5 transition-colors"
                            >
                                Use Template
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TemplatesPanel;
