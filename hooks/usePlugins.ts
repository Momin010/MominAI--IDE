import { useEffect, useRef } from 'react';
import type { Plugin, IDEApi } from '../types';

export const usePlugins = (plugins: Plugin[], api: IDEApi) => {
    const activePlugins = useRef<{ [key: string]: Plugin }>({});

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const enabledPlugins: { [key: string]: boolean } = JSON.parse(localStorage.getItem('enabledPlugins') || '{}');

                // Deactivate plugins that were disabled
                Object.keys(activePlugins.current).forEach(pluginId => {
                    if (!enabledPlugins[pluginId]) {
                        console.log(`Deactivating plugin: ${pluginId}`);
                        activePlugins.current[pluginId].deactivate(api);
                        delete activePlugins.current[pluginId];
                    }
                });

                // Activate plugins that were enabled
                plugins.forEach(plugin => {
                    if (enabledPlugins[plugin.id] && !activePlugins.current[plugin.id]) {
                        console.log(`Activating plugin: ${plugin.id}`);
                        plugin.activate(api);
                        activePlugins.current[plugin.id] = plugin;
                    }
                });

            } catch (e) {
                console.error("Failed to update plugins from localStorage", e);
            }
        };

        // Initial activation
        handleStorageChange();

        // Listen for changes from other tabs (or the plugin panel)
        window.addEventListener('storage', handleStorageChange);

        // Also listen for changes within the same tab (since `storage` event is cross-tab)
        // This is a simple workaround using a custom event.
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key === 'enabledPlugins') {
                const event = new Event('storageChange');
                window.dispatchEvent(event);
            }
            originalSetItem.apply(this, [key, value]);
        };
        window.addEventListener('storageChange', handleStorageChange);


        return () => {
            console.log("Cleaning up plugins...");
            Object.values(activePlugins.current).forEach(plugin => plugin.deactivate(api));
            activePlugins.current = {};
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('storageChange', handleStorageChange);
            localStorage.setItem = originalSetItem; // Restore original
        };
    }, [plugins, api]);
};
