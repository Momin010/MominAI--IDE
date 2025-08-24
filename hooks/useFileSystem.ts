

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FileSystemNode, Directory, SupabaseUser, Notification } from '../types';
import * as supabaseService from '../services/supabaseService';

const DEFAULT_FILE_SYSTEM: Directory = {
  type: 'directory',
  children: {
    'README.md': {
      type: 'file',
      content: '# Welcome to your React Workspace!\n\nThis is a simple React starter project running entirely in your browser.\n\n- `index.html` is the main entry point.\n- `src/App.jsx` contains the main React component.\n- To see your app, open `index.html` and click the "Run" button (▶️) in the editor header.\n',
    },
    'index.html': {
      type: 'file',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <!-- React Libraries -->
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <!-- Babel to transpile JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      background-color: #282c34; 
      color: white; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
    }
    button { 
      background-color: #61dafb; 
      border: none; 
      padding: 10px 20px; 
      border-radius: 5px; 
      cursor: pointer; 
      font-size: 16px; 
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <!-- Load our React component -->
  <script type="text/babel" src="/src/App.jsx"></script>
</body>
</html>
`
    },
    'src': {
        type: 'directory',
        children: {
            'App.jsx': {
                type: 'file',
                content: `function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Hello React!</h1>
      <p>This is your live React application running in the preview pane.</p>
      <hr style={{ margin: "20px 0", borderColor: "#555" }} />
      <h2>Simple Counter</h2>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);
`
            }
        }
    }
  },
};

const getPathParts = (path: string): string[] => {
  return path.split('/').filter(p => p);
};

// Helper to navigate and find a node, crucial for all FS operations
const findNodeAndParent = (root: Directory, path: string): { parent: Directory | null, node: FileSystemNode | null, name: string } => {
    const parts = getPathParts(path);
    if (parts.length === 0) return { parent: null, node: root, name: '/' };

    let current: FileSystemNode = root;
    let parent: Directory | null = root;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current.type !== 'directory' || !current.children[part]) {
            return { parent: null, node: null, name: '' }; // Invalid path
        }
        parent = current;
        current = current.children[part];
    }
    
    if (current.type !== 'directory') {
       return { parent: null, node: null, name: '' }; // Parent path is not a directory
    }
    
    const name = parts[parts.length - 1];
    return { parent: current, node: current.children[name] || null, name };
};


export const useFileSystem = (
  user: SupabaseUser | null,
  addNotification: (notification: Omit<Notification, 'id'>) => void
) => {
  const [fs, setFs] = useState<Directory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadFileSystem = async () => {
        setIsLoading(true);
        addNotification({ type: 'info', message: 'Initializing workspace...' });
        
        if (user) {
            // User is logged in, try loading from Supabase
            try {
                addNotification({ type: 'info', message: 'Syncing workspace from cloud...' });
                const remoteWorkspace = await supabaseService.loadWorkspace();
                if (remoteWorkspace) {
                    setFs(remoteWorkspace.content);
                    localStorage.setItem('fileSystem', JSON.stringify(remoteWorkspace.content));
                    addNotification({ type: 'success', message: 'Workspace synced from cloud.' });
                } else {
                    addNotification({ type: 'info', message: 'No cloud workspace found. Creating one from local data...' });
                    const savedFs = localStorage.getItem('fileSystem');
                    const localFs = savedFs ? JSON.parse(savedFs) : DEFAULT_FILE_SYSTEM;
                    setFs(localFs);
                    await supabaseService.saveWorkspace(localFs);
                    addNotification({ type: 'success', message: 'Local workspace pushed to cloud.' });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                addNotification({ type: 'error', message: `Cloud sync failed: ${message}. Using local version.` });
                const savedFs = localStorage.getItem('fileSystem');
                setFs(savedFs ? JSON.parse(savedFs) : DEFAULT_FILE_SYSTEM);
            }
        } else {
            // No user, load from local storage
            const savedFs = localStorage.getItem('fileSystem');
            setFs(savedFs ? JSON.parse(savedFs) : DEFAULT_FILE_SYSTEM);
            addNotification({ type: 'success', message: 'Workspace loaded from local storage.' });
        }
        setIsLoading(false);
    };

    loadFileSystem();
  }, [user, addNotification]);

  const saveFs = useCallback((newFs: Directory) => {
    localStorage.setItem('fileSystem', JSON.stringify(newFs));
    setFs(newFs);

    if (user) {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(async () => {
            try {
                await supabaseService.saveWorkspace(newFs);
                console.log("Workspace auto-saved to Supabase.");
            } catch (error) {
                console.error("Failed to auto-save workspace to Supabase:", error);
                addNotification({
                    type: 'error',
                    message: 'Cloud auto-save failed. Your work is saved locally.',
                    duration: 10000,
                });
            }
        }, 2000); // Debounce for 2 seconds
    }
  }, [user, addNotification]);

  const replaceFs = useCallback((newFs: Directory) => {
    saveFs(newFs);
  }, [saveFs]);

  const getFileSystem = useCallback(() => fs, [fs]);

  const getNode = useCallback((path: string): FileSystemNode | null => {
    if (!fs) return null;
    if (path === '/' || path === '') return fs;
    const parts = getPathParts(path);
    let currentNode: FileSystemNode = fs;

    for (const part of parts) {
      if (currentNode.type === 'directory' && currentNode.children[part]) {
        currentNode = currentNode.children[part];
      } else {
        return null;
      }
    }
    return currentNode;
  }, [fs]);


  const createNode = useCallback((path: string, type: 'file' | 'directory', content: string = '') => {
    if (!fs) return;
    const newFs = JSON.parse(JSON.stringify(fs));
    
    const parts = getPathParts(path);
    let current: Directory = newFs;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.children[part]) {
            current.children[part] = { type: 'directory', children: {} };
        }
        const nextNode = current.children[part];
        if (nextNode.type !== 'directory') {
            throw new Error(`Path conflict: ${part} is a file.`);
        }
        current = nextNode;
    }
    
    const name = parts[parts.length - 1];
    if (current.children[name]) {
       throw new Error(`'${name}' already exists.`);
    }

    current.children[name] = type === 'file' 
      ? { type: 'file', content } 
      : { type: 'directory', children: {} };
    
    saveFs(newFs);
  }, [fs, saveFs]);
  
  const scaffoldProject = useCallback((files: Record<string, string>) => {
      if (!fs) return;
      const newFs = JSON.parse(JSON.stringify(fs));
      
      Object.entries(files).forEach(([path, content]) => {
          const parts = getPathParts(path);
          let current: Directory = newFs;
          
          for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (!current.children[part]) {
                  current.children[part] = { type: 'directory', children: {} };
              }
              current = current.children[part] as Directory;
          }
          
          const name = parts[parts.length - 1];
          if (!current.children[name]) {
              current.children[name] = { type: 'file', content };
          }
      });
      saveFs(newFs);
  }, [fs, saveFs]);


  const readNode = useCallback((path: string): string | null => {
    const node = getNode(path);
    return node && node.type === 'file' ? node.content : null;
  }, [getNode]);

  const updateNode = useCallback((path: string, content: string) => {
    if (!fs) return;
    const newFs = JSON.parse(JSON.stringify(fs));
    
    const parts = getPathParts(path);
    let target: any = newFs;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target.children[parts[i]];
    }

    const nodeToUpdate = target.children[parts[parts.length - 1]];
    if (nodeToUpdate && nodeToUpdate.type === 'file') {
      nodeToUpdate.content = content;
      saveFs(newFs);
    }
  }, [fs, saveFs]);

  const deleteNode = useCallback((path: string) => {
    if (!fs) return;
    const newFs = JSON.parse(JSON.stringify(fs));
    const { parent, node, name } = findNodeAndParent(newFs, path);

    if (parent && node) {
      delete parent.children[name];
      saveFs(newFs);
    } else {
      throw new Error(`Item not found: ${path}`);
    }
  }, [fs, saveFs]);

  const renameNode = useCallback((oldPath: string, newName: string) => {
    if (!newName || newName.includes('/')) {
        throw new Error("Invalid name.");
    }
    if (!fs) return;
    const newFs = JSON.parse(JSON.stringify(fs));
    const { parent, node, name } = findNodeAndParent(newFs, oldPath);

    if (parent && node) {
        if (parent.children[newName]) {
            throw new Error(`'${newName}' already exists.`);
        }
        delete parent.children[name];
        parent.children[newName] = node;
        saveFs(newFs);
    } else {
      throw new Error(`Item not found: ${oldPath}`);
    }
  }, [fs, saveFs]);

  const moveNode = useCallback((sourcePath: string, destDirPath: string) => {
    if (sourcePath === destDirPath || destDirPath.startsWith(sourcePath + '/')) {
      throw new Error("Cannot move a directory into itself.");
    }
    if (!fs) return;
    const newFs = JSON.parse(JSON.stringify(fs));

    const { parent: sourceParent, node: sourceNode, name: sourceName } = findNodeAndParent(newFs, sourcePath);
    
    if (!sourceParent || !sourceNode || !sourceName) {
      throw new Error(`Source path not found: ${sourcePath}`);
    }
    
    let destDirNode: FileSystemNode | Directory | null = newFs;
    getPathParts(destDirPath).forEach(part => {
      if (destDirNode && destDirNode.type === 'directory') {
        destDirNode = destDirNode.children[part];
      } else {
        destDirNode = null;
      }
    });

    if (!destDirNode || destDirNode.type !== 'directory') {
      throw new Error(`Destination is not a directory: ${destDirPath}`);
    }
    if (destDirNode.children[sourceName]) {
      throw new Error(`'${sourceName}' already exists in destination.`);
    }

    delete sourceParent.children[sourceName];
    destDirNode.children[sourceName] = sourceNode;
    
    saveFs(newFs);
  }, [fs, saveFs]);


  return { fs, isLoading, createNode, readNode, updateNode, deleteNode, renameNode, moveNode, getNode, replaceFs, getFileSystem, scaffoldProject };
};