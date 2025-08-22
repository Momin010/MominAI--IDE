import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateDocsForCode } from '../services/aiService';

const EDITOR_ACTION_ID = 'code-to-docs';

export const codeToDocsPlugin: Plugin = {
    id: 'code-to-docs',
    name: 'Code to Docs Generator',
    description: 'Generates Markdown documentation for the current file.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'AI: Generate Documentation',
            icon: React.createElement('span', null, '📄'),
            action: async (filePath, content) => {
                api.showNotification({ type: 'info', message: 'Generating documentation...' });
                try {
                    const docContent = await generateDocsForCode(content, filePath);
                    const docPath = filePath.substring(0, filePath.lastIndexOf('.')) + '.md';
                    api.createNode(docPath, 'file', docContent);
                    api.showNotification({ type: 'success', message: `Documentation created at ${docPath}` });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate docs.";
                    api.showNotification({ type: 'error', message });
                }
            },
            shouldShow: (filePath, content) => {
                return !filePath.endsWith('.md');
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
    },
};