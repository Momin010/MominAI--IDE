
import type { FileSystemNode } from '../types';

/**
 * Recursively traverses the file system to create a flat array of all files with their full paths and content.
 */
export const getAllFiles = (node: FileSystemNode, currentPath: string): { path: string; content: string }[] => {
    if (node.type === 'file') {
        return [{ path: currentPath, content: node.content }];
    }
    
    let files: { path: string; content: string }[] = [];
    
    if (node.type === 'directory') {
        for (const name in node.children) {
            const childPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
            files = files.concat(getAllFiles(node.children[name], childPath));
        }
    }
    
    return files;
};
