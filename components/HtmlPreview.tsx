
import React from 'react';

interface HtmlPreviewProps {
    content: string;
}

const getIframeScript = () => `
  <script>
    // --- Console Override Script ---
    const originalConsole = { ...window.console };
    const postMessageToParent = (source, message) => {
        window.parent.postMessage({ source, message }, '*');
    };
    const formatMessage = (type, args) => ({
        type: type,
        message: args.map(arg => {
            try {
                if (arg instanceof Error) return arg.stack || arg.message;
                return JSON.stringify(arg);
            } catch(e) { return String(arg); }
        }),
        timestamp: new Date().toLocaleTimeString(),
    });
    window.console.log = (...args) => { originalConsole.log(...args); postMessageToParent('codecraft-preview', formatMessage('log', args)); };
    window.console.info = (...args) => { originalConsole.info(...args); postMessageToParent('codecraft-preview', formatMessage('info', args)); };
    window.console.warn = (...args) => { originalConsole.warn(...args); postMessageToParent('codecraft-preview', formatMessage('warn', args)); };
    window.console.error = (...args) => { originalConsole.error(...args); postMessageToParent('codecraft-preview', formatMessage('error', args)); };
    window.addEventListener('error', (event) => postMessageToParent('codecraft-preview', formatMessage('error', [event.message])));
    window.addEventListener('unhandledrejection', (event) => postMessageToParent('codecraft-preview', formatMessage('error', ['Unhandled promise rejection:', event.reason])));

    // --- Visual Inspector Script ---
    let inspectorActive = false;
    let highlightedElement = null;

    function getCssSelector(el) {
        if (!(el instanceof Element)) return;
        let path = [], parent;
        while (el && (parent = el.parentNode)) {
            let tag = el.tagName;
            let siblings = Array.from(parent.children).filter(child => child.tagName === tag);
            path.unshift(
                el.id ? \`#\${el.id}\` : (
                    siblings.length > 1 ? \`\${tag}:nth-of-type(\${1 + siblings.indexOf(el)})\` : tag
                )
            );
            el = parent;
            if (el === document.body) {
                path.unshift('body');
                break;
            }
        }
        return path.join(' > ').toLowerCase();
    }

    function getElementStyles(element) {
        const computed = window.getComputedStyle(element);
        const desiredStyles = {
            'color': computed.color,
            'background-color': computed.backgroundColor,
            'font-size': computed.fontSize,
            'font-family': computed.fontFamily,
            'padding': computed.padding,
            'margin': computed.margin,
            'border': computed.border,
            'border-radius': computed.borderRadius,
        };
        return desiredStyles;
    }

    window.addEventListener('message', (event) => {
        if (event.data.type === 'toggleInspector') {
            inspectorActive = !inspectorActive;
            if (!inspectorActive && highlightedElement) {
                highlightedElement.style.outline = '';
                highlightedElement = null;
            }
        }
        if (event.data.type === 'applyStyles') {
            const { selector, styles } = event.data.payload;
            try {
              const target = document.querySelector(selector);
              if (target) {
                  Object.assign(target.style, styles);
              }
            } catch(e) {
              originalConsole.error('Failed to apply styles with selector:', selector, e);
            }
        }
    });

    document.addEventListener('mouseover', (e) => {
        if (!inspectorActive) return;
        if (highlightedElement) highlightedElement.style.outline = '';
        highlightedElement = e.target;
        highlightedElement.style.outline = '2px solid #4299e1';
    });

    document.addEventListener('mouseout', () => {
        if (highlightedElement) highlightedElement.style.outline = '';
    });

    document.addEventListener('click', (e) => {
        if (!inspectorActive) return;
        e.preventDefault();
        e.stopPropagation();

        const selectedEl = e.target;
        const selector = getCssSelector(selectedEl);
        if (!selector) return;

        const styles = getElementStyles(selectedEl);
        
        window.parent.postMessage({
            source: 'codecraft-inspector',
            type: 'elementSelected',
            payload: {
                tagName: selectedEl.tagName,
                selector: selector,
                styles: styles
            }
        }, '*');
    }, true);
  </script>
`;

const injectScriptToHtml = (htmlContent: string) => {
    const script = getIframeScript();
    if (htmlContent.includes('</head>')) {
        return htmlContent.replace('</head>', `${script}</head>`);
    }
    if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', `${script}</body>`);
    }
    return htmlContent + script;
};

const HtmlPreview = React.forwardRef<HTMLIFrameElement, HtmlPreviewProps>(({ content }, ref) => {
    const processedContent = injectScriptToHtml(content);

    return (
        <iframe
            ref={ref}
            srcDoc={processedContent}
            title="HTML Preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none bg-white"
        />
    );
});

export default HtmlPreview;
