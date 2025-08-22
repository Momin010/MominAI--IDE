import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fetchGithubUser } from '../services/githubService';
import GithubAuthModal from './GithubAuthModal';
import { useNotifications } from '../App';
import type { SupabaseUser } from '../types';
import * as supabaseService from '../services/supabaseService';
import SupabaseAuthModal from './SupabaseAuthModal';

interface SettingsPanelProps {
  githubToken: string | null;
  setGithubToken: (token: string | null) => void;
  supabaseUser: SupabaseUser | null;
  supabaseUrl: string | null;
  setSupabaseUrl: (url: string | null) => void;
  supabaseAnonKey: string | null;
  setSupabaseAnonKey: (key: string | null) => void;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string | null) => void;
}

interface GithubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    githubToken,
    setGithubToken,
    supabaseUser,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    geminiApiKey,
    setGeminiApiKey
}) => {
    const { theme, setTheme } = useTheme();
    const [isGithubAuthModalOpen, setIsGithubAuthModalOpen] = useState(false);
    const [isSupabaseAuthModalOpen, setIsSupabaseAuthModalOpen] = useState(false);
    const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const { addNotification } = useNotifications();
    
    const [localSupabaseUrl, setLocalSupabaseUrl] = useState(supabaseUrl || '');
    const [localSupabaseAnonKey, setLocalSupabaseAnonKey] = useState(supabaseAnonKey || '');
    const [localGeminiKey, setLocalGeminiKey] = useState('');


    useEffect(() => {
        const getUser = async () => {
            if (githubToken) {
                setIsLoadingUser(true);
                try {
                    const user = await fetchGithubUser(githubToken);
                    setGithubUser(user);
                } catch (error) {
                    addNotification({ type: 'error', message: 'Invalid GitHub token. Please reconnect.' });
                    setGithubToken(null);
                    setGithubUser(null);
                } finally {
                    setIsLoadingUser(false);
                }
            } else {
                setGithubUser(null);
            }
        };
        getUser();
    }, [githubToken, setGithubToken, addNotification]);

    const handleGithubDisconnect = () => {
        setGithubToken(null);
        addNotification({ type: 'info', message: 'Disconnected from GitHub.' });
    };

    const handleSupabaseDisconnect = async () => {
        const { error } = await supabaseService.signOut();
        if (error) {
            addNotification({ type: 'error', message: `Sign out failed: ${error.message}` });
        }
        // Also clear credentials
        setLocalSupabaseUrl('');
        setLocalSupabaseAnonKey('');
        setSupabaseUrl(null);
        setSupabaseAnonKey(null);
        localStorage.removeItem('supabaseUrl');
        localStorage.removeItem('supabaseAnonKey');
        addNotification({ type: 'info', message: 'Disconnected from Supabase and credentials cleared.' });
    };

    const handleSaveSupabaseConfig = () => {
        if (!localSupabaseUrl.trim() || !localSupabaseAnonKey.trim()) {
            addNotification({ type: 'warning', message: 'Both Supabase URL and Key are required.' });
            return;
        }
        localStorage.setItem('supabaseUrl', localSupabaseUrl);
        localStorage.setItem('supabaseAnonKey', localSupabaseAnonKey);
        setSupabaseUrl(localSupabaseUrl);
        setSupabaseAnonKey(localSupabaseAnonKey);
        addNotification({ type: 'success', message: 'Supabase configuration saved. You can now connect.' });
    };

    const handleSaveGeminiKey = () => {
        if (localGeminiKey.trim()) {
            setGeminiApiKey(localGeminiKey.trim());
            addNotification({ type: 'success', message: 'Gemini API Key saved.' });
            setLocalGeminiKey('');
        }
    };
    
    const handleClearGeminiKey = () => {
        setGeminiApiKey(null);
        addNotification({ type: 'info', message: 'Gemini API Key cleared.' });
    };


    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)]">
                <h2 className="text-sm font-bold uppercase tracking-wider">Settings</h2>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
                {/* Gemini API Key Section */}
                <div>
                    <h3 className="text-md font-semibold mb-2 text-white">Gemini API Key</h3>
                    {geminiApiKey ? (
                        <div className="bg-black/20 p-4 rounded-lg flex items-center justify-between">
                            <p className="text-sm text-green-400">API Key is set and active.</p>
                            <button onClick={handleClearGeminiKey} className="bg-red-500/80 hover:bg-red-500/70 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                                Clear Key
                            </button>
                        </div>
                    ) : (
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400 mb-3">
                                Provide your own Gemini API key to enable all AI features. 
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline ml-1">
                                    Get a key from Google AI Studio.
                                </a>
                            </p>
                            <div className="flex space-x-2">
                                <input
                                    type="password"
                                    placeholder="Enter your API Key..."
                                    value={localGeminiKey}
                                    onChange={(e) => setLocalGeminiKey(e.target.value)}
                                    className="flex-grow bg-black/30 p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                />
                                <button onClick={handleSaveGeminiKey} className="bg-[var(--accent-primary)]/80 hover:bg-[var(--accent-primary)]/70 text-black font-bold px-4 rounded-lg transition-colors">
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                 {/* Supabase Authentication Section */}
                <div>
                    <h3 className="text-md font-semibold mb-2 text-white">Supabase Account</h3>
                     {supabaseUser ? (
                        <div className="bg-black/20 p-4 rounded-lg flex items-center justify-between">
                            <p className="text-sm">Connected as <span className="font-bold text-white">{supabaseUser.email}</span></p>
                            <button onClick={handleSupabaseDisconnect} className="bg-red-500/80 hover:bg-red-500/70 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="bg-black/20 p-4 rounded-lg">
                            <p className="text-sm text-gray-400 mb-4">
                                Enter your Supabase project URL and Anon Key to enable cloud sync. You can find these in your project's API settings.
                            </p>
                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Project URL</label>
                                    <input type="text" placeholder="https://<project-id>.supabase.co" value={localSupabaseUrl} onChange={(e) => setLocalSupabaseUrl(e.target.value)} className="w-full bg-black/30 p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)]" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Anon (Public) Key</label>
                                    <input type="password" placeholder="Your anon key" value={localSupabaseAnonKey} onChange={(e) => setLocalSupabaseAnonKey(e.target.value)} className="w-full bg-black/30 p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)]" />
                                </div>
                                <button onClick={handleSaveSupabaseConfig} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg transition-colors">
                                    Save Configuration
                                </button>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 text-center">
                                <p className="text-gray-400 mb-3 text-sm">
                                    {supabaseUrl && supabaseAnonKey ? 'Configuration saved. You can now connect.' : 'Save your configuration to enable connection.'}
                                </p>
                                <button
                                    onClick={() => setIsSupabaseAuthModalOpen(true)}
                                    disabled={!supabaseUrl || !supabaseAnonKey}
                                    className="bg-green-500/80 hover:bg-green-500/70 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Connect with Magic Link
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* GitHub Authentication Section */}
                <div>
                    <h3 className="text-md font-semibold mb-2 text-white">GitHub Account</h3>
                    {isLoadingUser ? (
                        <div className="bg-black/20 p-4 rounded-lg flex items-center justify-center">
                            <p>Verifying token...</p>
                        </div>
                    ) : githubUser ? (
                        <div className="bg-black/20 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                                <img src={githubUser.avatar_url} alt={githubUser.login} className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <p className="font-bold text-white">{githubUser.login}</p>
                                    <a href={githubUser.html_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent-primary)] hover:underline">
                                        View Profile
                                    </a>
                                </div>
                            </div>
                            <button onClick={handleGithubDisconnect} className="bg-red-500/80 hover:bg-red-500/70 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="bg-black/20 p-4 rounded-lg text-center">
                            <p className="text-gray-400 mb-3">Connect your GitHub account to use Gist-based Source Control features.</p>
                            <button onClick={() => setIsGithubAuthModalOpen(true)} className="bg-[var(--accent-primary)]/80 hover:bg-[var(--accent-primary)]/70 text-black font-bold py-2 px-4 rounded-lg transition-colors">
                                Connect to GitHub
                            </button>
                        </div>
                    )}
                </div>

                {/* Theme Selector Section */}
                <div>
                    <h3 className="text-md font-semibold mb-2 text-white">Appearance</h3>
                    <div className="bg-black/20 p-4 rounded-lg">
                        <label htmlFor="theme-select" className="block text-sm font-medium text-gray-300 mb-2">
                            Color Theme
                        </label>
                        <select
                            id="theme-select"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value as any)}
                            className="w-full bg-black/30 p-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                        >
                            <option value="deep-space">Deep Space (Default)</option>
                            <option value="nordic-light">Nordic Light</option>
                        </select>
                    </div>
                </div>
            </div>
            {isGithubAuthModalOpen && (
                <GithubAuthModal 
                    onClose={() => setIsGithubAuthModalOpen(false)}
                    onConnect={(token) => {
                        setGithubToken(token);
                        setIsGithubAuthModalOpen(false);
                        addNotification({ type: 'success', message: 'Successfully connected to GitHub!' });
                    }}
                />
            )}
             {isSupabaseAuthModalOpen && (
                <SupabaseAuthModal
                    onClose={() => setIsSupabaseAuthModalOpen(false)}
                    addNotification={addNotification}
                />
            )}
        </div>
    );
};

export default SettingsPanel;