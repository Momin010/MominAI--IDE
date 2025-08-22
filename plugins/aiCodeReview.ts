
import React from 'react';
import type { Plugin, IDEApi, Diagnostic } from '../types';
import { reviewCode } from '../services/aiService';

const EDITOR_ACTION_ID = 'ai-code-review';
const AI_REVIEW_SOURCE = 'AI Code Review';

export const aiCodeReviewPlugin: Plugin = {
    id: 'ai-code-review',
    name: 'AI Code Review',
    description: 'Adds an action to perform an AI-powered code review on the current file.',

    activate: (api: IDEApi) => {
        api.addEditorAction({
            id: EDITOR_ACTION_ID,
            label: 'Run AI Code Review',
            icon: React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round"}, [
                React.createElement('path', { d: "m12 14 4 4 4-4"}),
                React.createElement('path', { d: "M12 20v-8"}),
                React.createElement('path', { d: "M20 12h-2a8 8 0 0 0-8-8V2"}),
                React.createElement('path', { d: "M4.2 11.5A8 8 0 0 0 10 18v2"}),
            ]),
            action: async (filePath, content) => {
                api.showNotification({ type: 'info', message: 'Starting AI code review...' });
                try {
                    const results = await reviewCode(content);
                    const diagnostics: Diagnostic[] = results.map(r => ({ ...r, source: AI_REVIEW_SOURCE }));
                    api.setAiDiagnostics(AI_REVIEW_SOURCE, diagnostics);
                    api.showNotification({ type: 'success', message: `AI review complete. Found ${diagnostics.length} issues.` });
                    api.switchBottomPanelView('problems');
                } catch (error) {
                    if (error instanceof Error) api.showNotification({ type: 'error', message: error.message });
                }
            },
            shouldShow: (filePath, content) => content.trim().length > 0
        });
    },

    deactivate: (api: IDEApi) => {
        api.removeEditorAction(EDITOR_ACTION_ID);
        api.setAiDiagnostics(AI_REVIEW_SOURCE, []);
    },
};
