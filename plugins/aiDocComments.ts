import type { Plugin, IDEApi } from '../types';
import { getCodeExplanation } from '../services/aiService';

declare const window: any;

let hoverProvider: any = null;

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeout: number | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise(resolve => {
            if (timeout) {
                window.clearTimeout(timeout);
            }
            timeout = window.setTimeout(() => resolve(func(...args)), waitFor);
        });
};

const debouncedGetCodeExplanation = debounce(getCodeExplanation, 500);


export const aiDocCommentsPlugin: Plugin = {
    id: 'ai-doc-comments',
    name: 'AI Doc Comments',
    description: 'Provides AI-generated explanations when you hover over code.',
    
    activate: (api: IDEApi) => {
        if (!window.monaco) return;

        hoverProvider = window.monaco.languages.registerHoverProvider(['javascript', 'typescript', 'jsx', 'tsx', 'python', 'html', 'css'], {
            provideHover: async (model: any, position: any) => {
                const word = model.getWordAtPosition(position);
                if (!word) return;
                
                // Get a slightly larger range for more context
                const range = new window.monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                const lineContent = model.getLineContent(position.lineNumber);
                
                // Avoid tiny snippets
                if (lineContent.trim().length < 10) return;
                
                try {
                    const explanation = await debouncedGetCodeExplanation(lineContent);
                    return {
                        range: range,
                        contents: [{ value: explanation }]
                    };
                } catch (e) {
                    console.error("AI Hover error", e);
                    return;
                }
            }
        });
    },

    deactivate: (api: IDEApi) => {
        hoverProvider?.dispose();
    },
};