import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { optimizeCss } from '../services/aiService';

const EDITOR_ACTION_ID = 'css-optimizer';

export const cssOptimizerPlugin: Plugin = {
    id: 'css-optimizer',
    name: 'CSS Optimizer',
    description: 'Uses AI to optimize and refactor your CSS file.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'AI: Optimize CSS',
            icon: React.createElement('span', null, '✨'),
            action: async (filePath, content) => {
                api.showNotification({ type: 'info', message: 'Optimizing CSS...' });
                try {
                    const optimizedContent = await optimizeCss(content);
                    api.updateActiveFileContent(optimizedContent);
                    api.showNotification({ type: 'success', message: 'CSS optimized successfully.' });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to optimize CSS.";
                    api.showNotification({ type: 'error', message });
                }
            },
            shouldShow: (filePath, content) => {
                return filePath.endsWith('.css');
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
    },
};