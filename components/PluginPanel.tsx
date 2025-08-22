
import React, { useState, useEffect } from 'react';
import type { Plugin } from '../types';

interface PluginPanelProps {
  plugins: Plugin[];
}

const PluginPanel: React.FC<PluginPanelProps> = ({ plugins }) => {
    const [enabledPlugins, setEnabledPlugins] = useState<{[key: string]: boolean}>(() => {
        try {
            const saved = localStorage.getItem('enabledPlugins');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        localStorage.setItem('enabledPlugins', JSON.stringify(enabledPlugins));
    }, [enabledPlugins]);

    const togglePlugin = (pluginId: string) => {
        setEnabledPlugins(prev => ({
            ...prev,
            [pluginId]: !prev[pluginId]
        }));
    };

    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)]">
                <h2 className="text-sm font-bold uppercase tracking-wider">Plugins</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {plugins.map(plugin => (
                    <div key={plugin.id} className="bg-black/20 p-3 rounded-md flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-white">{plugin.name}</h3>
                            <p className="text-sm text-gray-400 mt-1">{plugin.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!enabledPlugins[plugin.id]}
                                onChange={() => togglePlugin(plugin.id)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PluginPanel;
