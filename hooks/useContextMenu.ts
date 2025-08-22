
import React, { useState, useCallback, useEffect } from 'react';
import type { ContextMenuItem } from '../types';

export const useContextMenu = () => {
    const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

    const handleContextMenu = useCallback((event: React.MouseEvent, items: ContextMenuItem[]) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({
            x: event.clientX,
            y: event.clientY,
            items: items,
        });
    }, []);

    const closeMenu = useCallback(() => {
        setMenu(null);
    }, []);

    useEffect(() => {
        document.addEventListener('click', closeMenu);
        return () => {
            document.removeEventListener('click', closeMenu);
        };
    }, [closeMenu]);

    return { menu, handleContextMenu, closeMenu };
};
