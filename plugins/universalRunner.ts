
import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { Icons } from '../components/Icon';
import { getIframeScript } from '../utils/iframeScripts';


const EDITOR_ACTION_ID = 'universal-runner-action';

const injectScriptToHtml = (htmlContent: string) => {
    const script = getIframeScript();
    if (htmlContent.includes('<!--CODECRAFT_INJECT_SCRIPT-->')) {
        return htmlContent; // Already injected
    }
    const injectionPoint = '</head>';
    if (htmlContent.includes(injectionPoint)) {
        return htmlContent.replace(injectionPoint, `<!--CODECRAFT_INJECT_SCRIPT-->\n${script}\n</head>`);
    }
    // Fallback if no head tag
    return script + htmlContent;
};


const runModernProject = (api: IDEApi, filePath: string) => {
    api.clearConsole();
    api.switchBottomPanelView('terminal');
    api.appendConsoleMessage({
        type: 'system',
        message: [`Starting dev server...`],
        timestamp: new Date().toLocaleTimeString(),
    });

    // Inject inspector script into index.html if it exists
    const indexPath = '/index.html';
    const indexContent = api.readNode(indexPath);
    if (indexContent) {
        const modifiedHtml = injectScriptToHtml(indexContent);
        if (modifiedHtml !== indexContent) {
            api.updateNode(indexPath, modifiedHtml);
            api.appendConsoleMessage({
                type: 'system',
                message: [`Injected debugger scripts into ${indexPath}.`],
                timestamp: new Date().toLocaleTimeString(),
            });
        }
    }
    
    const command = 'npm install && npm run dev';
    window.dispatchEvent(new CustomEvent('run-in-terminal', { detail: { command } }));
    api.showNotification({ type: 'info', message: `Running '${command}' in terminal.`});
    // The preview will automatically update when the server is ready via the serverUrl
};


const runPython = (api: IDEApi, filePath: string) => {
    api.clearConsole();
    api.switchBottomPanelView('terminal');
    api.appendConsoleMessage({
        type: 'system',
        message: [`Executing ${filePath} in terminal...`],
        timestamp: new Date().toLocaleTimeString(),
    });
    
    const command = `python ${filePath}`;
    window.dispatchEvent(new CustomEvent('run-in-terminal', { detail: { command } }));
};


export const universalRunnerPlugin: Plugin = {
    id: 'universal-runner',
    name: 'Universal Runner',
    description: 'Adds a "Run" button to execute Python files or modern JS projects (with package.json).',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'Run',
            icon: React.createElement(Icons.Play, { className: "w-4 h-4" }),
            action: (filePath, content) => {
                const extension = filePath.split('.').pop()?.toLowerCase();

                if (extension === 'py') {
                    runPython(api, filePath);
                    return;
                }

                // For all other supported file types, check for a package.json
                if (api.getNode('/package.json')) {
                    runModernProject(api, filePath);
                } else {
                     api.showNotification({
                        type: 'warning',
                        message: `No runner found. Create a package.json to run a JS project.`
                    });
                }
            },
            shouldShow: (filePath, content) => {
                const extension = filePath.split('.').pop()?.toLowerCase();
                
                // List of all extensions that should show the run button.
                // The action logic will determine *how* to run it.
                const runnableExtensions = ['html', 'js', 'jsx', 'ts', 'tsx', 'py'];
                
                if (filePath.toLowerCase().endsWith('package.json')) {
                    return true;
                }

                if (extension && runnableExtensions.includes(extension)) {
                    return true;
                }

                return false;
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
        api.setRunContext(null, null);
        api.setPreviewContext(null);
    },
};
