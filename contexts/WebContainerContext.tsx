
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { WebContainer } from '@webcontainer/api';
import type { Directory, FileSystemNode, WebContainerContextType } from '../types';

export const WebContainerContext = createContext<WebContainerContextType>({
    webContainer: null,
    shellProcess: null,
    isLoading: true,
    error: null,
    serverUrl: null,
    runCommand: async () => {},
});

export const useWebContainer = () => useContext(WebContainerContext);

// Helper to convert our FS structure to WebContainer's format
const convertFsToWebContainer = (node: FileSystemNode, path = ''): any => {
    if (node.type === 'directory') {
        const children = Object.entries(node.children).reduce((acc, [name, childNode]) => {
            acc[name] = convertFsToWebContainer(childNode, `${path}/${name}`);
            return acc;
        }, {} as any);
        return { directory: children };
    } else {
        return { file: { contents: node.content } };
    }
};

export const WebContainerProvider: React.FC<{ children: ReactNode, fs: FileSystemNode | null }> = ({ children, fs }) => {
    const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
    const [shellProcess, setShellProcess] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const hasMounted = useRef(false);

    useEffect(() => {
        const bootContainer = async () => {
            try {
                const container = await WebContainer.boot();
                setWebContainer(container);

                container.on('server-ready', (port, url) => {
                    setServerUrl(url);
                });
                container.on('error', (err) => {
                    setError(err.message);
                });

            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to boot WebContainer.");
                setIsLoading(false);
            }
        };

        bootContainer();
    }, []);

    useEffect(() => {
        const mountFiles = async () => {
            if (webContainer && fs && !hasMounted.current) {
                hasMounted.current = true; // Mount only once on initial load
                const { directory: files } = convertFsToWebContainer(fs);
                await webContainer.mount(files);
                setIsLoading(false);
            }
        };
        mountFiles();
    }, [webContainer, fs]);
    
    const runCommand = useCallback(async (command: string, args: string[] = []) => {
        if (!webContainer) return;
        const process = await webContainer.spawn(command, args);
        await process.exit;
    }, [webContainer]);

    const value = { webContainer, shellProcess, isLoading, error, serverUrl, runCommand };

    return (
        <WebContainerContext.Provider value={value}>
            {children}
        </WebContainerContext.Provider>
    );
};
