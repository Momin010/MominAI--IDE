
import React from 'react';
import { Icons } from './Icon';

interface ActivityBarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, setActiveView }) => {
    const views = [
        { id: 'explorer', icon: <Icons.Files className="w-6 h-6"/>, title: 'Explorer', disabled: false },
        { id: 'search', icon: <Icons.Search className="w-6 h-6"/>, title: 'Search', disabled: false },
        { id: 'source-control', icon: <Icons.GitFork className="w-6 h-6"/>, title: 'Source Control', disabled: false },
        { id: 'storyboard', icon: <Icons.LayoutDashboard className="w-6 h-6"/>, title: 'Storyboard', disabled: false },
        { id: 'image-to-code', icon: <Icons.Image className="w-6 h-6"/>, title: 'Image to Code', disabled: false },
        { id: 'figma', icon: <Icons.Figma className="w-6 h-6"/>, title: 'Figma Import', disabled: false },
        { id: 'plugins', icon: <Icons.Puzzle className="w-6 h-6"/>, title: 'Plugins', disabled: false },
        { id: 'settings', icon: <Icons.Settings className="w-6 h-6"/>, title: 'Settings', disabled: false },
    ];
    
    return (
        <div className="bg-[var(--ui-panel-bg)] backdrop-blur-md h-full w-12 flex flex-col items-center py-4 space-y-4 border border-[var(--ui-border)] rounded-[var(--ui-border-radius)] shadow-lg">
            {views.map(view => (
                <button
                    key={view.id}
                    title={view.title}
                    onClick={() => !view.disabled && setActiveView(view.id)}
                    disabled={view.disabled}
                    className={`p-2 rounded-md transition-all duration-200 transform 
                        ${activeView === view.id ? 'text-white bg-white/20' : 'text-gray-400'}
                        ${view.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-white hover:bg-white/10 hover:scale-110'}
                    `}
                >
                    {view.icon}
                </button>
            ))}
        </div>
    );
};

export default ActivityBar;
