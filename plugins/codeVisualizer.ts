import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { generateMermaidDiagram } from '../services/aiService';
import MermaidPreview from '../components/MermaidPreview';

const EDITOR_ACTION_ID = 'code-visualizer';

export const codeVisualizerPlugin: Plugin = {
    id: 'code-visualizer',
    name: 'Code Visualizer',
    description: 'Generates a diagram to visualize the selected code.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'AI: Visualize Code',
            icon: React.createElement('span', null, '📊'),
            action: async (filePath, content) => {
                // In a real app, we'd use the selected text. For now, we use the whole file.
                api.showNotification({ type: 'info', message: 'Generating diagram...' });
                 try {
                    const mermaidCode = await generateMermaidDiagram(content);
                    const previewComponent = React.createElement(MermaidPreview, { chart: mermaidCode });
                    api.showInPreview(`Visualization: ${filePath.split('/').pop()}`, previewComponent);
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to generate diagram.";
                    api.showNotification({ type: 'error', message });
                }
            },
            shouldShow: (filePath, content) => {
                 return content.trim().length > 0 && (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx'));
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
    },
};