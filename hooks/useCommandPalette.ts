import React, { useState, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import type { Command } from '../types';

interface CommandPaletteContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  commands: Command[];
  registerCommand: (command: Command) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [commands, setCommands] = useState<Command[]>([]);

    const registerCommand = useCallback((command: Command) => {
        setCommands(prev => {
            // Avoid duplicates
            if (prev.some(c => c.id === command.id)) {
                return prev.map(c => c.id === command.id ? command : c);
            }
            return [...prev, command];
        });
    }, []);

    const value = useMemo(() => ({
        isOpen,
        setIsOpen,
        commands,
        registerCommand
    }), [isOpen, commands, registerCommand]);

    return React.createElement(
        CommandPaletteContext.Provider,
        { value },
        children
    );
};