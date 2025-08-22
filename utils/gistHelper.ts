import type { Directory, GistApiResponse } from "../types";

export const buildFsFromGist = (gist: GistApiResponse): Directory => {
    const root: Directory = { type: 'directory', children: {} };
    for (const filename in gist.files) {
        const parts = filename.split('/');
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
                // This case should ideally not happen if the gist structure is valid
                console.warn(`Path conflict: ${part} is a file but needs to be a directory.`);
                break;
            }
        }
        currentLevel.children[parts[parts.length - 1]] = {
            type: 'file',
            content: gist.files[filename].content
        };
    }
    return root;
};