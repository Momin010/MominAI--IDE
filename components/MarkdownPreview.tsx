import React, { useMemo } from 'react';

declare const marked: any; // From CDN script in index.html

interface MarkdownPreviewProps {
    content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {

    const renderedHtml = useMemo(() => {
        if (typeof marked === 'undefined') {
            return '<p>Markdown renderer is not available.</p>';
        }
        try {
            // Configure marked to be more secure and GitHub-flavored
            marked.setOptions({
                gfm: true,
                breaks: true,
                sanitize: true, // Use a proper sanitizer like DOMPurify in a real app
            });
            return marked.parse(content);
        } catch (error) {
            return `<p class="text-red-500">Error parsing Markdown: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
        }
    }, [content]);

    return (
        <div 
            className="prose prose-invert p-4 bg-transparent h-full w-full max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
    );
};

export default MarkdownPreview;