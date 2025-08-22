
import React from 'react';

interface VoiceControlUIProps {
    status: string; // idle, listening, error, denied
    onToggle: () => void;
}

const VoiceControlUI: React.FC<VoiceControlUIProps> = ({ status, onToggle }) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'listening': return { color: 'text-green-400', title: 'Listening...' };
            case 'error': return { color: 'text-red-400', title: 'Error' };
            case 'denied': return { color: 'text-yellow-400', title: 'Permission Denied' };
            default: return { color: 'text-gray-400', title: 'Activate Voice Commands' };
        }
    };

    const { color, title } = getStatusInfo();

    return (
        <button onClick={onToggle} title={title} className={`flex items-center space-x-1 ${color} hover:text-white`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
            {status === 'listening' && <span className="text-xs animate-pulse">Listening...</span>}
        </button>
    );
};

export default VoiceControlUI;
