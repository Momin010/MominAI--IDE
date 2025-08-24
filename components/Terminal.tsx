import React, { useEffect, useRef, useState, useContext } from 'react';
import { generateShellCommand } from '../services/aiService';
import { WebContainerContext } from '../contexts/WebContainerContext';

declare const window: any;

const waitForLibs = (timeout = 8000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window.Terminal && window.FitAddon) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                reject(new Error("Terminal libraries (xterm.js) failed to load."));
            }
        }, 100);
    });
};

export const Terminal: React.FC<{ fs?: any }> = () => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const shellProcessRef = useRef<any>(null);
    const { webContainer, isLoading, error } = useContext(WebContainerContext);
    const [isAiPrompt, setIsAiPrompt] = useState(false);
    const aiPromptBuffer = useRef('');

    useEffect(() => {
        if (!terminalRef.current) return;
        let fitAddon: any, resizeObserver: ResizeObserver, xterm: any;

        const initTerminal = async () => {
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
                
                // Event listener for external commands from plugins
                const handleRunCommand = (event: CustomEvent) => {
                    const { command } = event.detail;
                    if (shellProcessRef.current && typeof command === 'string') {
                        shellProcessRef.current.input.write(command + '\r');
                    }
                };
                window.addEventListener('run-in-terminal', handleRunCommand as EventListener);
                
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                 if (terminalRef.current) {
                    terminalRef.current.innerText = `Terminal failed to start: ${errorMessage}`;
                }
            }
        };

        initTerminal();
        
        return () => { 
            resizeObserver?.disconnect(); 
            xtermRef.current?.dispose();
            window.removeEventListener('run-in-terminal', (window as any).__terminalCommandHandler);
        };
    }, []);
    
    useEffect(() => {
        if (xtermRef.current) {
            xtermRef.current.clear();
            if (isLoading) {
                xtermRef.current.writeln('Booting WebContainer...');
            } else if (error) {
                xtermRef.current.writeln(`\x1b[1;31mError: ${error}\x1b[0m`);
            } else if (webContainer) {
                 xtermRef.current.writeln('WebContainer ready. Starting shell...');
                 startShell();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [webContainer, isLoading, error]);

    const startShell = async () => {
        if (!webContainer || !xtermRef.current || shellProcessRef.current) return;

        const xterm = xtermRef.current;
        const shellProcess = await webContainer.spawn('jsh', {
            terminal: {
                cols: xterm.cols,
                rows: xterm.rows,
            },
        });
        shellProcessRef.current = shellProcess;

        shellProcess.output.pipeTo(
            new WritableStream({
                write(data) {
                    xterm.write(data);
                },
            })
        );
        const input = shellProcess.input.getWriter();
        
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
                        input.write(command + '\r');
                    } catch (e) {
                        xterm.write(`\r\n\x1b[31mAI Error: ${e instanceof Error ? e.message : 'Unknown Error'}\x1b[0m\r\n$ `);
                    }
                    aiPromptBuffer.current = '';
                } else {
                    input.write(data);
                }
                currentInput = '';
            } else if (code === 127) { // Backspace
                if (isAiPrompt) {
                    if (aiPromptBuffer.current.length > 0) {
                        aiPromptBuffer.current = aiPromptBuffer.current.slice(0, -1);
                        xterm.write('\b \b');
                    }
                } else {
                    // Let the shell handle backspace
                    input.write(data);
                }
            } else { // Regular character
                if (isAiPrompt) {
                    aiPromptBuffer.current += data;
                    xterm.write(data);
                } else if (currentInput + data === '#') {
                    setIsAiPrompt(true);
                    currentInput = '';
                    xterm.write(`\r\x1b[2K\x1b[36mAI > \x1b[0m`);
                } else {
                    currentInput += data;
                    input.write(data);
                }
            }
        });
        
        return shellProcess;
    };


    return (
        <div className="bg-[var(--ui-panel-bg)] backdrop-blur-md h-full w-full">
            <div ref={terminalRef} className="h-full w-full" />
        </div>
    );
};