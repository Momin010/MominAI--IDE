
import React from 'react';

interface HtmlPreviewProps {
    content?: string;
    serverUrl?: string;
}

const HtmlPreview = React.forwardRef<HTMLIFrameElement, HtmlPreviewProps>(({ content, serverUrl }, ref) => {
    
    if (serverUrl) {
         return (
            <iframe
                ref={ref}
                src={serverUrl}
                title="WebContainer Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                className="w-full h-full border-none bg-white"
            />
        );
    }

    return (
        <iframe
            ref={ref}
            srcDoc={content}
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none bg-white"
        />
    );
});

export default HtmlPreview;