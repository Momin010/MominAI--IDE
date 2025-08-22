
import React from 'react';
import type { InspectedElement } from '../types';

interface InspectorPanelProps {
  element: InspectedElement | null;
  onStyleChange: (newStyles: Record<string, string>) => void;
  onSaveChanges: () => void;
  isSaving: boolean;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({ element, onStyleChange, onSaveChanges, isSaving }) => {
    if (!element) {
        return (
            <div className="text-gray-400 h-full flex flex-col items-center justify-center text-center p-4">
                <h3 className="font-bold text-white mb-2">Inspector</h3>
                <p className="text-sm">Activate the inspector and click an element in the preview to see its styles.</p>
            </div>
        );
    }

    const handleInputChange = (prop: string, value: string) => {
        onStyleChange({ ...element.styles, [prop]: value });
    };

    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)]">
            <div className="p-2 border-b border-[var(--ui-border)] flex justify-between items-center flex-shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider">Inspector</h2>
                <button 
                  onClick={onSaveChanges} 
                  disabled={isSaving}
                  className="text-xs bg-blue-600 hover:bg-blue-500 rounded px-2 py-1 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                    {isSaving ? 'Saving...' : 'Save to Stylesheet'}
                </button>
            </div>
            <div className="flex-grow overflow-y-auto p-2 text-xs">
                <div className="font-mono bg-black/20 p-2 rounded mb-2">
                    <span className="text-purple-400">{element.tagName.toLowerCase()}</span>
                    <span className="text-gray-400"> {element.selector}</span>
                </div>
                <div className="space-y-2">
                    {Object.entries(element.styles).map(([prop, value]) => (
                        <div key={prop} className="flex items-center">
                            <label className="w-2/5 text-gray-400 truncate pr-2">{prop}</label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => handleInputChange(prop, e.target.value)}
                                className="w-3/5 bg-black/30 p-1 rounded-md outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InspectorPanel;
