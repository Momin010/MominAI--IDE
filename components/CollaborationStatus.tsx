
import React from 'react';
import type { UserPresence } from '../types';

interface CollaborationStatusProps {
    collaborators: UserPresence[];
}

const CollaborationStatus: React.FC<CollaborationStatusProps> = ({ collaborators }) => {
    if (collaborators.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center space-x-1 pl-2">
            {collaborators.map(user => (
                <div 
                    key={user.id} 
                    title={`${user.name} is viewing ${user.currentFile || '...lobby'}`}
                    className="w-4 h-4 rounded-full border-2 border-white/50"
                    style={{ backgroundColor: user.color }}
                />
            ))}
        </div>
    );
};

export default CollaborationStatus;
