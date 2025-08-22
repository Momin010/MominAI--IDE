import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { Icons } from '../components/Icon';
import HtmlPreview from '../components/HtmlPreview';

const EDITOR_ACTION_ID = 'universal-runner-action';

const injectDebugger = (jsContent: string, breakpoints: number[]): string => {
    if (!breakpoints || breakpoints.length === 0) return jsContent;
    const lines = jsContent.split('\n');
    // Add debugger statement safely, considering existing content on the line.
    breakpoints.sort((a,b) => b - a).forEach(lineNum => {
        const index = lineNum - 1;
        if (index >= 0 && index < lines.length) {
            const line = lines[index];
            const indentation = line.match(/^\s*/)?.[0] || '';
            lines.splice(index, 0, `${indentation}debugger;`);
        }
    });
    return lines.join('\n');
};

const resolvePath = (base: string, relative: string): string => {
    const stack = base.split('/');
    stack.pop(); // remove filename
    const parts = relative.split('/');
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    return stack.join('/');
}

const runHtml = (api: IDEApi, filePath: string, content: string) => {
    api.clearConsole();
    api.appendConsoleMessage({
        type: 'system',
        message: [`Starting execution of ${filePath}...`],
        timestamp: new Date().toLocaleTimeString(),
    });

    const allBreakpoints = api.getBreakpoints();
    let processedHtml = content;
    const jsDependencies: string[] = [];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const scripts = Array.from(doc.querySelectorAll('script'));

        for (const script of scripts) {
            const srcPath = script.getAttribute('src');
            if (srcPath && !srcPath.startsWith('http') && !srcPath.startsWith('//')) {
                const fullSrcPath = srcPath.startsWith('/') ? srcPath : resolvePath(filePath, srcPath);
                jsDependencies.push(fullSrcPath);
                const jsContent = api.readNode(fullSrcPath);

                if (jsContent) {
                    const breakpoints = allBreakpoints[fullSrcPath] || [];
                    const modifiedJs = injectDebugger(jsContent, breakpoints);
                    
                    const newScript = doc.createElement('script');
                     // Copy attributes from old script to new one (e.g., type="text/babel")
                    for (const attr of script.attributes) {
                        newScript.setAttribute(attr.name, attr.value);
                    }
                    newScript.removeAttribute('src'); // Remove src as we are inlining
                    newScript.textContent = modifiedJs;
                    script.parentNode?.replaceChild(newScript, script);
                } else {
                    api.appendConsoleMessage({
                        type: 'error',
                        message: [`Could not find script: ${fullSrcPath}`],
                        timestamp: new Date().toLocaleTimeString(),
                    });
                }
            } else if (!srcPath && script.textContent) {
                // Inline script
                const breakpoints = allBreakpoints[filePath] || [];
                script.textContent = injectDebugger(script.textContent, breakpoints);
            }
        }
        processedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    } catch (e) {
         api.appendConsoleMessage({
            type: 'error',
            message: [`Error processing HTML for debugger: ${e instanceof Error ? e.message : String(e)}`],
            timestamp: new Date().toLocaleTimeString(),
        });
    }
    
    api.setRunContext(filePath, jsDependencies);
    api.setPreviewContext({ html: processedHtml });

    const previewComponent = React.createElement(HtmlPreview, { content: processedHtml });
    api.showInPreview(`Running: ${filePath.split('/').pop()}`, previewComponent);
};

const runJs = (api: IDEApi, filePath: string) => {
    api.clearConsole();
    api.appendConsoleMessage({
        type: 'system',
        message: [`Creating preview for ${filePath}...`],
        timestamp: new Date().toLocaleTimeString(),
    });

    const jsContent = api.readNode(filePath);
    if (jsContent === null) {
        api.showNotification({ type: 'error', message: `Could not read file: ${filePath}` });
        return;
    }

    const breakpoints = api.getBreakpoints()[filePath] || [];
    const contentWithDebugger = injectDebugger(jsContent, breakpoints);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      margin: 0;
      padding: 1rem;
      background-color: #ffffff;
      color: #000000;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
${contentWithDebugger}
  </script>
</body>
</html>`;

    api.setRunContext(filePath, []);
    api.setPreviewContext({ html });
    const previewComponent = React.createElement(HtmlPreview, { content: html });
    api.showInPreview(`Running: ${filePath.split('/').pop()}`, previewComponent);
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
    description: 'Adds a "Run" button to execute various file types like HTML, JS, and Python.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'Run File',
            icon: React.createElement(Icons.Play, { className: "w-4 h-4" }),
            action: (filePath, content) => {
                const extension = filePath.split('.').pop()?.toLowerCase();

                switch (extension) {
                    case 'html':
                        runHtml(api, filePath, content);
                        break;
                    case 'js':
                    case 'jsx':
                    case 'ts':
                    case 'tsx':
                        runJs(api, filePath);
                        break;
                    case 'py':
                        runPython(api, filePath);
                        break;
                    default:
                        api.showNotification({
                            type: 'warning',
                            message: `No runner available for .${extension} files.`
                        });
                }
            },
            shouldShow: (filePath, content) => {
                const supportedExtensions = ['html', 'js', 'jsx', 'ts', 'tsx', 'py'];
                const extension = filePath.split('.').pop()?.toLowerCase();
                return !!extension && supportedExtensions.includes(extension);
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
        api.setRunContext(null, null);
        api.setPreviewContext(null);
    },
};
