
import React, { useState } from 'react';
import type { StoryboardComponent } from '../types';
import HtmlPreview from './HtmlPreview'; // Re-use for iframe logic

interface StoryboardPanelProps {
    components: StoryboardComponent[];
    readNode: (path: string) => string | null;
}

const StoryboardPanel: React.FC<StoryboardPanelProps> = ({ components, readNode }) => {
    const [selectedComponent, setSelectedComponent] = useState<StoryboardComponent | null>(null);

    const generatePreviewHtml = (component: StoryboardComponent) => {
        const componentCode = readNode(component.path);
        if (!componentCode) return 'Error: Could not read component file.';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <style>body { background-color: #1a1a1a; color: white; padding: 1rem; font-family: sans-serif; }</style>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel">
                    ${componentCode}
                    const Component = window.${component.name} || App;
                    const container = document.getElementById('root');
                    const root = ReactDOM.createRoot(container);
                    root.render(<Component />);
                </script>
            </body>
            </html>
        `;
    };

    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)]">
                <h2 className="text-sm font-bold uppercase tracking-wider">Storyboard</h2>
            </div>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-1/3 border-r border-[var(--ui-border)] overflow-y-auto">
                    {components.map(comp => (
                        <div 
                            key={comp.path} 
                            onClick={() => setSelectedComponent(comp)}
                            className={`p-2 cursor-pointer ${selectedComponent?.path === comp.path ? 'bg-blue-600/50' : 'hover:bg-white/10'}`}
                        >
                            {comp.name}
                        </div>
                    ))}
                </div>
                <div className="w-2/3">
                    {selectedComponent ? (
                        <HtmlPreview content={generatePreviewHtml(selectedComponent)} />
                    ) : (
                        <p className="p-4 text-center text-gray-500">Select a component to view.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryboardPanel;
