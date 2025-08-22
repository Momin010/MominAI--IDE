
import React, { useState, useEffect, useRef } from 'react';
import type { FileSystemNode, Directory, File } from '../types';
import { Icons } from './Icon';
import { useContextMenu } from '../hooks/useContextMenu';
import ContextMenu from './ContextMenu';
import { FileIcon } from './FileIcon';

interface FileExplorerProps {
  fs: FileSystemNode;
  onFileSelect: (path: string) => void;
  createNode: (path: string, type: 'file' | 'directory') => void;
  deleteNode: (path: string) => void;
  renameNode: (oldPath: string, newName: string) => void;
  moveNode: (sourcePath: string, destDir: string) => void;
  openAiFileGenerator: (path: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = (props) => {
  const { createNode, openAiFileGenerator } = props;
  const { menu, handleContextMenu, closeMenu } = useContextMenu();

  const handleRootContextMenu = (e: React.MouseEvent) => {
    handleContextMenu(e, [
      { label: 'New File with AI...', action: () => openAiFileGenerator('/'), icon: <Icons.FileSparkle className="w-4 h-4 text-purple-400" /> },
      { label: 'New File', action: () => {
          const name = prompt("Enter new file name:");
          if (name) createNode(`/${name}`, 'file');
      }, icon: <Icons.FilePlus className="w-4 h-4" />},
      { label: 'New Folder', action: () => {
          const name = prompt("Enter new folder name:");
          if (name) createNode(`/${name}`, 'directory');
      }, icon: <Icons.FolderPlus className="w-4 h-4" />},
    ]);
  };

  return (
    <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md" onContextMenu={handleRootContextMenu} onClick={closeMenu}>
      <div className="p-2 border-b border-[var(--ui-border)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-wider">Explorer</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-1">
        {props.fs.type === 'directory' && (
          <DirectoryView
            directory={props.fs}
            path=""
            {...props}
            handleContextMenu={handleContextMenu}
          />
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} closeMenu={closeMenu} />}
    </div>
  );
};

interface DirectoryViewProps extends FileExplorerProps {
  directory: Directory;
  path: string;
  handleContextMenu: (e: React.MouseEvent, items: any[]) => void;
}

interface FileViewProps extends Omit<FileExplorerProps, 'fs'> {
    file: File;
    path: string;
    handleContextMenu: (e: React.MouseEvent, items: any[]) => void;
}

const FileView: React.FC<FileViewProps> = ({ file, path, onFileSelect, handleContextMenu, ...props }) => {
    const { deleteNode, renameNode } = props;
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(path.split('/').pop() || '');
    const inputRef = useRef<HTMLInputElement>(null);
  
    useEffect(() => {
      if (isRenaming) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isRenaming]);
  
    const onFileContextMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleContextMenu(e, [
        { label: 'Rename', action: () => setIsRenaming(true) },
        { label: 'Delete', action: () => {
            if (window.confirm(`Delete ${path.split('/').pop()}?`)) deleteNode(path);
        }},
      ]);
    };
  
    const handleRename = () => {
      if (newName && newName !== path.split('/').pop()) {
        renameNode(path, newName);
      }
      setIsRenaming(false);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleRename();
        if (e.key === 'Escape') setIsRenaming(false);
    }
  
    return (
      <div
        onClick={() => onFileSelect(path)}
        onContextMenu={onFileContextMenu}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', path); e.stopPropagation(); }}
        className="flex items-center cursor-pointer p-1 rounded-md hover:bg-white/10 hover:translate-x-1 transform transition-all duration-150"
      >
        <FileIcon filename={path.split('/').pop() || ''} className="w-4 h-4 mr-1 flex-shrink-0" />
        {isRenaming ? (
          <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="bg-black/50 text-white outline-none ring-1 ring-blue-500 rounded-sm w-full"
          />
      ) : (
          <span className="truncate">{path.split('/').pop()}</span>
      )}
      </div>
    );
};

const DirectoryView: React.FC<DirectoryViewProps> = ({ directory, path, handleContextMenu, ...props }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const { createNode, deleteNode, renameNode, moveNode, openAiFileGenerator } = props;
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(path.split('/').pop() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const sortedChildren = Object.entries(directory.children).sort(([aName, aNode], [bName, bNode]) => {
    if (aNode.type === 'directory' && bNode.type === 'file') return -1;
    if (aNode.type === 'file' && bNode.type === 'directory') return 1;
    return aName.localeCompare(bName);
  });

  const onDirContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPath = path || '/';
    const newFilePath = (name: string) => currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;

    handleContextMenu(e, [
        { label: 'New File with AI...', action: () => openAiFileGenerator(currentPath), icon: <Icons.FileSparkle className="w-4 h-4 text-purple-400" /> },
        { label: 'New File', action: () => {
            const name = prompt("File name in " + (path.split('/').pop() || '/'));
            if(name) createNode(newFilePath(name), 'file');
        }, icon: <Icons.FilePlus className="w-4 h-4" />},
        { label: 'New Folder', action: () => {
            const name = prompt("Folder name in " + (path.split('/').pop() || '/'));
            if(name) createNode(newFilePath(name), 'directory');
        }, icon: <Icons.FolderPlus className="w-4 h-4" />},
        ...(path !== '' ? [
            { label: 'Rename', action: () => { setIsRenaming(true); }},
            { label: 'Delete', action: () => {
                if(window.confirm(`Delete ${path.split('/').pop()}?`)) deleteNode(currentPath);
            }},
        ] : [])
    ]);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const sourcePath = e.dataTransfer.getData('text/plain');
    const destDir = path || '/';
    if(sourcePath && sourcePath !== destDir) {
      moveNode(sourcePath, destDir);
    }
  };

  const handleRename = () => {
    if (newName && newName !== path.split('/').pop()) {
        renameNode(path, newName);
    }
    setIsRenaming(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename();
    if (e.key === 'Escape') setIsRenaming(false);
  }

  return (
    <div>
      {path !== '' && (
        <div 
          onClick={() => setIsOpen(!isOpen)}
          onContextMenu={onDirContextMenu}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('text/plain', path); e.stopPropagation(); }}
          className={`flex items-center cursor-pointer p-1 rounded-md transform transition-all duration-150 ${isDragOver ? 'bg-blue-500/50' : 'hover:bg-white/10 hover:translate-x-1'}`}
        >
          {isOpen ? <Icons.ChevronDown className="w-4 h-4 mr-1 flex-shrink-0" /> : <Icons.ChevronRight className="w-4 h-4 mr-1 flex-shrink-0" />}
          <Icons.Folder className="w-4 h-4 mr-1 flex-shrink-0" />
            {isRenaming ? (
               <input
                   ref={inputRef}
                   type="text"
                   value={newName}
                   onClick={(e) => e.stopPropagation()}
                   onChange={(e) => setNewName(e.target.value)}
                   onBlur={handleRename}
                   onKeyDown={handleKeyDown}
                   className="bg-black/50 text-white outline-none ring-1 ring-blue-500 rounded-sm w-full"
               />
           ) : (
               <span className="truncate">{path.split('/').pop()}</span>
           )}
        </div>
      )}
      {isOpen && (
        <div className={path !== '' ? "pl-4" : ""}>
          {sortedChildren.map(([name, node]) => {
            const newPath = path ? `${path}/${name}` : `/${name}`;
            return node.type === 'directory' ? (
              <DirectoryView
                key={newPath}
                directory={node}
                path={newPath}
                {...props}
                handleContextMenu={handleContextMenu}
              />
            ) : (
              <FileView
                key={newPath}
                file={node}
                path={newPath}
                {...props}
                handleContextMenu={handleContextMenu}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
