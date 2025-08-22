import React, { useState, useRef, useEffect } from 'react';

interface GithubAuthModalProps {
    onClose: () => void;
    onConnect: (token: string) => void;
}

const GithubAuthModal: React.FC<GithubAuthModalProps> = ({ onClose, onConnect }) => {
    const [token, setToken] = useState('');
    const [step, setStep] = useState(1);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 2) {
            // Auto-focus the input field when the modal moves to step 2
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [step]);

    const handleAuthorize = () => {
        const githubTokenUrl = 'https://github.com/settings/tokens/new?scopes=gist&description=CodeCraft-IDE-Token';
        window.open(githubTokenUrl, '_blank');
        setStep(2);
    };

    const handleConnect = () => {
        if (token.trim()) {
            onConnect(token.trim());
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && step === 2) {
            handleConnect();
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-[var(--ui-panel-bg-heavy)] backdrop-blur-lg text-white rounded-lg shadow-xl w-full max-w-md p-6 border border-[var(--ui-border)] animate-float-in"
                onClick={e => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                {step === 1 && (
                    <>
                        <h2 className="text-xl font-bold mb-2">Authorize CodeCraft IDE</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            To connect your GitHub account, CodeCraft IDE needs permission to create Gists on your behalf. This is handled securely via a Personal Access Token.
                        </p>
                        <p className="text-sm text-gray-400 mb-6">
                            You'll be directed to GitHub to generate a secure token with the correct permissions.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAuthorize}
                                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
                            >
                                Authorize on GitHub
                            </button>
                        </div>
                    </>
                )}
                
                {step === 2 && (
                     <>
                        <h2 className="text-xl font-bold mb-2">Complete Connection</h2>
                         <p className="text-sm text-gray-400 mb-4">
                           A new tab has opened. Follow these steps to complete the connection:
                        </p>
                        <ol className="text-sm text-gray-300 list-decimal list-inside space-y-2 mb-4">
                            <li>On the GitHub page, scroll down and click <strong className="text-green-400">"Generate token"</strong>.</li>
                            <li>Copy the new token (it starts with <code className="bg-black/30 px-1 py-0.5 rounded text-xs">ghp_</code>).</li>
                            <li>Paste the token below and click "Connect".</li>
                        </ol>
                        
                        <div className="mb-4">
                            <label htmlFor="pat-input" className="block text-sm font-medium text-gray-300 mb-1">
                                Personal Access Token
                            </label>
                            <input
                                ref={inputRef}
                                type="password"
                                id="pat-input"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Paste your token here..."
                                className="w-full bg-black/30 p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConnect}
                                disabled={!token.trim()}
                                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Connect
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GithubAuthModal;
