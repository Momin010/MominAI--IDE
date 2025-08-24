
import type { Directory } from "../types";

export const buildFsFromTemplate = (files: Record<string, string>): Directory => {
    const root: Directory = { type: 'directory', children: {} };
    for (const filename in files) {
        // Ensure path starts with a slash, but handle it if it doesn't
        const path = filename.startsWith('/') ? filename.substring(1) : filename;
        const parts = path.split('/');
        let currentLevel = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!currentLevel.children[part]) {
                currentLevel.children[part] = { type: 'directory', children: {} };
            }
            const nextNode = currentLevel.children[part];
            if (nextNode.type === 'directory') {
                currentLevel = nextNode;
            } else {
                console.warn(`Path conflict: ${part} is a file but needs to be a directory.`);
                break;
            }
        }
        currentLevel.children[parts[parts.length - 1]] = {
            type: 'file',
            content: files[filename]
        };
    }
    return root;
};
