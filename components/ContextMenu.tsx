import React from 'react';
import type { ContextMenuItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  closeMenu: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, closeMenu }) => {
  const style: React.CSSProperties = {
    top: `${y}px`,
    left: `${x}px`,
  };

  const handleAction = (item: ContextMenuItem) => {
    if(!item.disabled) {
        item.action();
    }
    closeMenu();
  };

  return (
    <div
      style={style}
      className="fixed bg-[var(--ui-panel-bg-heavy)] backdrop-blur-lg border border-[var(--ui-border)] rounded-[var(--ui-border-radius)] shadow-[var(--ui-shadow)] py-1 z-50 text-white animate-fade-scale-in"
    >
      <ul>
        {items.map((item, index) => (
          <li
            key={index}
            onClick={() => handleAction(item)}
            className={`px-4 py-1 text-sm ${item.disabled ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-[var(--accent-primary)]/40 cursor-pointer'}`}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;