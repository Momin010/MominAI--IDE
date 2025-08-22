
import React from 'react';

interface SideBarProps {
    activeView: string;
    children: React.ReactNode[];
}

const SideBar: React.FC<SideBarProps> = ({ activeView, children }) => {
    const views = ['explorer', 'search', 'source-control', 'storyboard', 'figma', 'plugins', 'settings'];
    const activeIndex = views.indexOf(activeView);
    
    return (
        <div className="h-full w-full">
          {React.Children.map(children, (child, index) => (
              <div className={index === activeIndex ? 'h-full' : 'hidden'}>
                  {child}
              </div>
          ))}
        </div>
    );
};

export default SideBar;
