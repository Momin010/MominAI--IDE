import React, { useEffect, useRef, useState } from 'react';
import type { Directory, FileSystemNode } from '../types';
import { generateShellCommand } from '../services/aiService';

declare const window: any;

interface TerminalProps {
    fs: Directory | null;
}

const waitForLibs = (timeout = 8000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.Terminal && window.FitAddon && window.Wasmer?.Shell) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error("Terminal libraries failed to load from CDN. Check network or ad-blockers."));
            }
        }, 100);
    });
};

const syncFs = async (shell: any, node: FileSystemNode, path: string) => {
    if (node.type === 'directory') {
        try {
            await shell.fs.createDir(path);
        } catch (e) {
            if (e instanceof Error && !e.message.includes('file already exists')) console.error(e);
        }
        for (const childName in node.children) {
            await syncFs(shell, node.children[childName], `${path === '/' ? '' : path}/${childName}`);
        }
    } else {
        const content = new TextEncoder().encode(node.content);
        await shell.fs.writeFile(path, content);
    }
};

export const Terminal: React.FC<TerminalProps> = ({ fs }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const shellRef = useRef<any>(null);
    const isInitialized = useRef(false);
    const commandSeparatorRef = useRef<any>(null);
    const [isAiPrompt, setIsAiPrompt] = useState(false);
    const aiPromptBuffer = useRef('');

    const addCommandSeparator = () => {
        const xterm = xtermRef.current;
        if (!xterm) return;
        const marker = xterm.registerMarker(0);
        const decoration = xterm.registerDecoration({
            marker: marker,
            x: 0,
            width: xterm.cols,
            height: 1,
        });

        decoration?.onRender(element => {
            element.style.borderTop = '1px dotted var(--ui-border)';
            element.style.opacity = '0.5';
            element.style.marginTop = '5px';
            element.style.marginBottom = '5px';
        });
        commandSeparatorRef.current = decoration;
    };

    useEffect(() => {
        if (isInitialized.current || !terminalRef.current) return;
        isInitialized.current = true;
        let fitAddon: any, resizeObserver: ResizeObserver, xterm: any;

        const init = async () => {
            if (!terminalRef.current) return;
            try {
                terminalRef.current.innerText = 'Loading terminal libraries...';
                await waitForLibs();

                xterm = new window.Terminal({
                    cursorBlink: true,
                    theme: { background: 'transparent', foreground: '#e5e5e5', cursor: 'var(--accent-primary)' },
                    fontFamily: 'monospace', fontSize: 14, allowProposedApi: true
                });
                xtermRef.current = xterm;

                fitAddon = new window.FitAddon();
                xterm.loadAddon(fitAddon);
                xterm.open(terminalRef.current);
                fitAddon.fit();
                
                resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => fitAddon?.fit()));
                resizeObserver.observe(terminalRef.current);

                xterm.writeln('Welcome to the WebAssembly Terminal! Type `#` for AI assistance.');
                
                await window.Wasmer.init();
                const shell = await window.Wasmer.Shell.create();
                shellRef.current = shell;

                // Event listener for external commands
                const handleRunCommand = (event: CustomEvent) => {
                    const { command } = event.detail;
                    if (shellRef.current && typeof command === 'string') {
                        shellRef.current.stdin.write(command + '\r');
                    }
                };
                window.addEventListener('run-in-terminal', handleRunCommand as EventListener);

                
                const process = await shell.open(xterm);

                // --- AI Prompt & Command Separator Logic ---
                let currentInput = '';
                xterm.onData(async (data: string) => {
                    const code = data.charCodeAt(0);
                    if (code === 13) { // Enter
                        if (isAiPrompt) {
                            setIsAiPrompt(false);
                            xterm.write(`\r\n\x1b[36mGenerating command...\x1b[0m\r\n`);
                            try {
                                const command = await generateShellCommand(aiPromptBuffer.current);
                                shell.stdin.write(command);
                                currentInput = command;
                                xterm.write(command); // Echo the command
                            } catch (e) {
                                xterm.write(`\r\n\x1b[31mAI Error: ${e instanceof Error ? e.message : 'Unknown Error'}\x1b[0m\r\n`);
                            }
                            aiPromptBuffer.current = '';
                        }
                        shell.stdin.write(data);
                        currentInput = '';
                    } else if (code === 127) { // Backspace
                        if (isAiPrompt) {
                            if (aiPromptBuffer.current.length > 0) {
                                aiPromptBuffer.current = aiPromptBuffer.current.slice(0, -1);
                                xterm.write('\b \b');
                            }
                        } else {
                            if (currentInput.length > 0) {
                                currentInput = currentInput.slice(0, -1);
                                xterm.write('\b \b');
                            }
                        }
                    } else { // Regular character
                        if (isAiPrompt) {
                            aiPromptBuffer.current += data;
                            xterm.write(data);
                        } else {
                            currentInput += data;
                            if (currentInput === '#') {
                                setIsAiPrompt(true);
                                currentInput = '';
                                xterm.write(`\r\x1b[2K\x1b[36mAI > \x1b[0m`);
                            } else {
                                shell.stdin.write(data);
                            }
                        }
                    }
                });

                // Add separator before new prompt appears
                xterm.onWillRender(() => {
                    const buffer = xterm.buffer.active;
                    if (buffer.cursorX === 0 && commandSeparatorRef.current?.isDisposed === false) {
                        commandSeparatorRef.current?.dispose();
                    }
                });
                shell.events.on('prompt', () => addCommandSeparator());
                
                await process.wait();

            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                if (xterm) {
                   xterm.writeln(`\n\x1b[1;31mError: ${errorMessage}\x1b[0m`);
                } else if (terminalRef.current) {
                    terminalRef.current.innerText = `Terminal failed to start: ${errorMessage}`;
                }
            }
        };
        init();
        return () => { 
            resizeObserver?.disconnect(); 
            xtermRef.current?.dispose();
            window.removeEventListener('run-in-terminal', (window as any).__terminalCommandHandler);
        };
    }, []);

    useEffect(() => {
        const performSync = async () => {
            if (shellRef.current && fs && xtermRef.current) {
                xtermRef.current.writeln('\n\x1b[1;33mSyncing file system...\x1b[0m');
                await syncFs(shellRef.current, fs, '/');
                xtermRef.current.writeln('\x1b[1;32mSync complete.\x1b[0m');
                xtermRef.current.write('$ ');
            }
        };
        performSync();
    }, [fs]);


    return (
        <div className="bg-[var(--ui-panel-bg)] backdrop-blur-md h-full w-full">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};