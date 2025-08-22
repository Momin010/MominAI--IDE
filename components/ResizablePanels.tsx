import React, { useState, useRef, useCallback } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  panelVisibility: { left: boolean; right: boolean; bottom: boolean };
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({ leftPanel, mainPanel, rightPanel, bottomPanel, panelVisibility }) => {
  const [leftWidth, setLeftWidth] = useState(25); // percentage
  const [rightWidth, setRightWidth] = useState(25); // percentage
  const [bottomHeight, setBottomHeight] = useState(30); // percentage
  const { left: isLeftVisible, right: isRightVisible, bottom: isBottomVisible } = panelVisibility;

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
          // Prevent main panel from becoming too small
          setLeftWidth(Math.max(15, Math.min(newWidth, 100 - (isRightVisible ? rightWidth : 0) - 15)));
        } else if (divider === 'right') {
          const dx = startX - moveEvent.clientX;
          const newWidth = startRightWidth + (dx / containerRect.width) * 100;
          // Prevent main panel from becoming too small
          setRightWidth(Math.max(15, Math.min(newWidth, 100 - (isLeftVisible ? leftWidth : 0) - 15)));
        } else if (divider === 'bottom') {
          const dy = startY - moveEvent.clientY;
          const newHeight = startBottomHeight + (dy / containerRect.height) * 100;
          setBottomHeight(Math.max(15, Math.min(newHeight, 85)));
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
  }, [leftWidth, rightWidth, bottomHeight, isLeftVisible, isRightVisible]);

  const finalLeftWidth = isLeftVisible ? leftWidth : 0;
  const finalRightWidth = isRightVisible ? rightWidth : 0;
  const finalBottomHeight = isBottomVisible ? bottomHeight : 0;
  
  const mainPanelWidth = 100 - finalLeftWidth - finalRightWidth;
  const mainPanelHeight = 100 - finalBottomHeight;

  return (
    <div ref={containerRef} className="w-full h-full flex overflow-hidden rounded-[var(--ui-border-radius)] shadow-lg">
      {/* Left Panel */}
      {isLeftVisible && (
        <>
          <div style={{ width: `${finalLeftWidth}%` }} className="h-full overflow-auto">
            {leftPanel}
          </div>
          
          <div
            onMouseDown={(e) => startDrag('left', e)}
            className="w-1.5 h-full bg-transparent cursor-col-resize group flex items-center justify-center"
          >
            <div className="w-px h-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
          </div>
        </>
      )}

      {/* Center Panels (Main and Right) */}
      <div style={{ width: `${mainPanelWidth}%` }} className="h-full flex flex-col">
        {/* Main Content Area */}
        <div style={{ height: `${mainPanelHeight}%` }} className="w-full overflow-hidden">
           {mainPanel}
        </div>
        
        {isBottomVisible && (
          <>
            <div
              onMouseDown={(e) => startDrag('bottom', e)}
              className="h-1.5 w-full bg-transparent cursor-row-resize group flex items-center justify-center"
            >
              <div className="h-px w-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
            </div>
            
            <div style={{ height: `${finalBottomHeight}%` }} className="w-full overflow-hidden">
              {bottomPanel}
            </div>
          </>
        )}
      </div>
      
      {isRightVisible && (
        <>
          <div
            onMouseDown={(e) => startDrag('right', e)}
            className="w-1.5 h-full bg-transparent cursor-col-resize group flex items-center justify-center"
          >
            <div className="w-px h-full bg-[var(--ui-border)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300"></div>
          </div>

          <div style={{ width: `${finalRightWidth}%` }} className="h-full overflow-auto">
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
};

export default ResizablePanels;