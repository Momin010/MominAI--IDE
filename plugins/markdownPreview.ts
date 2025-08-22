import React from 'react';
import type { Plugin, IDEApi } from '../types';
import { Icons } from '../components/Icon';
import MarkdownPreview from '../components/MarkdownPreview';

const EDITOR_ACTION_ID = 'markdown-preview';

export const markdownPreviewPlugin: Plugin = {
    id: 'markdown-preview',
    name: 'Markdown Preview',
    description: 'Adds a button to preview .md files as rendered HTML in the preview pane.',
    
    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'Open Preview',
            icon: React.createElement(Icons.Eye, { className: "w-4 h-4" }),
            action: (filePath, content) => {
                const previewComponent = React.createElement(MarkdownPreview, { content });
                api.showInPreview(`Preview: ${filePath.split('/').pop()}`, previewComponent);
            },
            shouldShow: (filePath, content) => {
                return filePath.endsWith('.md');
            }
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
    },
};