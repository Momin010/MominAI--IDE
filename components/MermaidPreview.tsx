import React, { useEffect, useRef } from 'react';

declare const mermaid: any;

interface MermaidPreviewProps {
    chart: string;
}

const MermaidPreview: React.FC<MermaidPreviewProps> = ({ chart }) => {
    const mermaidRef = useRef<HTMLDivElement>(null);
    const chartId = `mermaid-chart-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        if (mermaidRef.current && typeof mermaid !== 'undefined') {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
            });
            
            const renderMermaid = async () => {
                try {
                    mermaidRef.current!.innerHTML = chart; // Put the raw code in first
                    await mermaid.run({ nodes: [mermaidRef.current!] });
                } catch (e) {
                    if (mermaidRef.current) {
                       mermaidRef.current.innerHTML = `Error rendering diagram: ${e instanceof Error ? e.message : 'Unknown error'}`;
                    }
                }
            };
            
            renderMermaid();
        }
    }, [chart]);

    return (
        <div className="p-4 bg-transparent h-full w-full flex items-center justify-center">
            <div ref={mermaidRef} id={chartId} className="mermaid w-full h-full text-white">
                {chart}
            </div>
        </div>
    );
};

export default MermaidPreview;