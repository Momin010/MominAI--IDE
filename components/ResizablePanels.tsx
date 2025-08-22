
import React, { useState, useRef, useCallback } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({ leftPanel, mainPanel, rightPanel, bottomPanel }) => {
  const [leftWidth, setLeftWidth] = useState(20); // percentage
  const [rightWidth, setRightWidth] = useState(20); // percentage
  const [bottomHeight, setBottomHeight] = useState(25); // percentage

  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startDrag = useCallback((divider: 'left' | 'right' | 'bottom', startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const startLeftWidth = leftWidth;
    const startRightWidth = rightWidth;
    const startBottomHeight = bottomHeight;

    const doDrag = (moveEvent: MouseEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        if (divider === 'left') {
          const dx = moveEvent.clientX - startX;
          const newWidth = startLeftWidth + (dx / containerRect.width) * 100;
          setLeftWidth(Math.max(10, Math.min(newWidth, 50)));
        } else if (divider === 'right') {
          const dx = startX - moveEvent.clientX;
          const newWidth = startRightWidth + (dx / containerRect.width) * 100;
          setRightWidth(Math.max(10, Math.min(newWidth, 50)));
        } else if (divider === 'bottom') {
          const dy = startY - moveEvent.clientY;
          const newHeight = startBottomHeight + (dy / containerRect.height) * 100;
          setBottomHeight(Math.max(10, Math.min(newHeight, 80)));
        }
      });
    };

    const stopDrag = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    
    if (divider === 'bottom') {
      document.body.style.cursor = 'row-resize';
    } else {
      document.body.style.cursor = 'col-resize';
    }
  }, [leftWidth, rightWidth, bottomHeight]);

  return (
    <div ref={containerRef} className="w-full h-full flex overflow-hidden rounded-[var(--ui-border-radius)] shadow-lg border border-[var(--ui-border)]">
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="h-full overflow-auto">
        {leftPanel}
      </div>
      
      {/* Left Divider */}
      <div
        onMouseDown={(e) => startDrag('left', e)}
        className="w-1.5 h-full bg-transparent cursor-col-resize group flex items-center justify-center"
      >
        <div className="w-px h-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
      </div>

      {/* Center Panels (Main and Right) */}
      <div style={{ width: `${100 - leftWidth - rightWidth}%` }} className="h-full flex flex-col">
        {/* Main Content Area */}
        <div style={{ height: `${100 - bottomHeight}%` }} className="w-full overflow-hidden">
           {mainPanel}
        </div>
        
        {/* Bottom Divider */}
        <div
          onMouseDown={(e) => startDrag('bottom', e)}
          className="h-1.5 w-full bg-transparent cursor-row-resize group flex items-center justify-center"
        >
          <div className="h-px w-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
        </div>
        
        {/* Bottom Panel */}
        <div style={{ height: `${bottomHeight}%` }} className="w-full overflow-hidden">
          {bottomPanel}
        </div>
      </div>
      
      {/* Right Divider */}
      <div
        onMouseDown={(e) => startDrag('right', e)}
        className="w-1.5 h-full bg-transparent cursor-col-resize group flex items-center justify-center"
      >
        <div className="w-px h-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
      </div>

      {/* Right Panel */}
      <div style={{ width: `${rightWidth}%` }} className="h-full overflow-auto">
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanels;