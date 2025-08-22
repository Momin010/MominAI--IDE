import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateTestFile } from '../services/aiService';

const EDITOR_ACTION_ID = 'test-generator';

export const testGeneratorPlugin: Plugin = {
    id: 'test-generator',
    name: 'AI Test Generator',
    description: 'Generates a test file for the current file.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'AI: Generate Test File',
            icon: React.createElement('span', null, '🧪'),
            action: async (filePath, content) => {
                api.showNotification({ type: 'info', message: `Generating tests for ${filePath.split('/').pop()}...` });
                try {
                    const testContent = await generateTestFile(content, filePath);
                    const extension = filePath.substring(filePath.lastIndexOf('.'));
                    const testPath = filePath.replace(extension, `.test${extension}`);
                    
                    api.createNode(testPath, 'file', testContent);
                    api.showNotification({ type: 'success', message: `Test file created at ${testPath}` });

                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate tests.";
                    api.showNotification({ type: 'error', message });
                }
            },
            shouldShow: (filePath, content) => {
                const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
                return supportedExtensions.some(ext => filePath.endsWith(ext));
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
    },
};