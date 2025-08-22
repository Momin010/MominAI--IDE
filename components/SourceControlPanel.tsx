import React from 'react';
import type { Directory, FileSystemNode, GistCommit, SupabaseUser } from '../types';
import { useNotifications } from '../App';
import { createGist, fetchGist } from '../services/githubService';
import { generateCommitMessage, deployProject } from '../services/aiService';
import { buildFsFromGist } from '../utils/gistHelper';
import GitHistoryVisualizer from './GitHistoryVisualizer';
import * as supabaseService from '../services/supabaseService';

interface SourceControlPanelProps {
    fs: Directory;
    replaceFs: (newFs: Directory) => void;
    githubToken: string | null;
    switchView: (view: string) => void;
    supabaseUser: SupabaseUser | null;
}

const getAllFiles = (node: FileSystemNode, currentPath: string): { path: string; content: string }[] => {
    if (node.type === 'file') {
        const path = currentPath === '' ? `/${(node as any).name}` : currentPath;
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

const SourceControlPanel: React.FC<SourceControlPanelProps> = ({ fs, replaceFs, githubToken, switchView, supabaseUser }) => {
    const [pullUrlInput, setPullUrlInput] = React.useState('');
    const [pushResultUrl, setPushResultUrl] = React.useState('');
    const [commitMessage, setCommitMessage] = React.useState('feat: initial commit');
    const [isLoading, setIsLoading] = React.useState<boolean | string>(false);
    const { addNotification } = useNotifications();
    const [activeTab, setActiveTab] = React.useState('github');
    const [commitHistory, setCommitHistory] = React.useState<GistCommit[]>([]);
    const [lastSync, setLastSync] = React.useState<string | null>(null);

    React.useEffect(() => {
        const savedHistory = localStorage.getItem('gistCommitHistory');
        if(savedHistory) setCommitHistory(JSON.parse(savedHistory));
    }, []);

    const handlePush = async () => {
        if (!githubToken) return;
        setIsLoading('push-gist');
        setPushResultUrl('');
        try {
            const response = await createGist(fs, githubToken, commitMessage);
            addNotification({ type: 'success', message: 'Successfully pushed to secret Gist!' });
            setPushResultUrl(response.html_url);
            
            setCommitHistory(prev => {
                const newCommit: GistCommit = {
                    id: response.id.slice(0, 7),
                    message: commitMessage,
                    timestamp: new Date().toISOString(),
                    parent: prev.length > 0 ? prev[prev.length - 1].id : undefined
                };
                const newHistory = [...prev, newCommit];
                localStorage.setItem('gistCommitHistory', JSON.stringify(newHistory));
                return newHistory;
            });

        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePull = async () => {
        if (!githubToken) return;
        const gistId = pullUrlInput.split('/').pop();
        if (!gistId) {
            addNotification({ type: 'error', message: 'Invalid Gist URL or ID.' });
            return;
        }
        if (!window.confirm("This will replace your entire current workspace. Are you sure?")) return;
        setIsLoading('pull-gist');
        try {
            const gistData = await fetchGist(gistId, githubToken);
            const newFs = buildFsFromGist(gistData);
            replaceFs(newFs);
            addNotification({ type: 'success', message: 'Workspace loaded from Gist.' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCommit = async () => {
        setIsLoading('commit');
        try {
            const allFiles = getAllFiles(fs, '');
            const message = await generateCommitMessage(allFiles);
            setCommitMessage(message);
        } catch (error) {
             if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleShare = async () => {
        if (!githubToken) return;
        setIsLoading('share');
        try {
            const response = await createGist(fs, githubToken, "CodeCraft IDE Workspace Share");
            const shareUrl = `${window.location.origin}${window.location.pathname}?gist_id=${response.id}`;
            navigator.clipboard.writeText(shareUrl);
            addNotification({ type: 'success', message: 'Shareable URL copied to clipboard!' });
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSupabasePush = async () => {
        if (!fs) return;
        setIsLoading('push-supabase');
        try {
            const updatedAt = await supabaseService.saveWorkspace(fs);
            setLastSync(new Date(updatedAt).toLocaleString());
            addNotification({type: 'success', message: 'Workspace saved to Supabase.'});
        } catch (error) {
            if(error instanceof Error) addNotification({type: 'error', message: error.message});
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSupabasePull = async () => {
        if (!window.confirm("Pulling from Supabase will replace your entire local workspace. Are you sure?")) return;
        setIsLoading('pull-supabase');
        try {
            const workspace = await supabaseService.loadWorkspace();
            if (workspace) {
                replaceFs(workspace.content as Directory);
                setLastSync(new Date(workspace.updated_at).toLocaleString());
                addNotification({type: 'success', message: 'Workspace loaded from Supabase.'});
            } else {
                addNotification({type: 'info', message: 'No workspace found in Supabase.'});
            }
        } catch (error) {
            if(error instanceof Error) addNotification({type: 'error', message: error.message});
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeploy = async () => {
        setIsLoading('deploy');
        try {
            const result = await deployProject();
            if(result.success) {
                navigator.clipboard.writeText(result.url);
                addNotification({ type: 'success', message: 'Deployment successful! URL copied to clipboard.', duration: 10000 });
                addNotification({ type: 'info', message: `Live at: ${result.url}`, duration: 10000 });
            }
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
            <div className="p-2 border-b border-[var(--ui-border)]">
                <h2 className="text-sm font-bold uppercase tracking-wider">Source Control</h2>
            </div>

            <div className="flex border-b border-[var(--ui-border)]">
                <button onClick={() => setActiveTab('github')} className={`flex-1 p-2 text-sm ${activeTab === 'github' ? 'bg-white/10' : 'text-gray-400'}`}>GitHub Gist</button>
                {supabaseUser && <button onClick={() => setActiveTab('supabase')} className={`flex-1 p-2 text-sm ${activeTab === 'supabase' ? 'bg-white/10' : 'text-gray-400'}`}>Supabase</button>}
            </div>

            {/* Supabase Tab */}
            <div className={`flex-grow overflow-y-auto p-4 space-y-6 ${activeTab !== 'supabase' && 'hidden'}`}>
                <h3 className="text-md font-semibold mb-2">Supabase Cloud Sync</h3>
                 <div className="space-y-3">
                    <button onClick={handleSupabasePush} disabled={!!isLoading} className="w-full bg-green-500/80 hover:bg-green-500/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                        {isLoading === 'push-supabase' ? 'Pushing...' : 'Push to Supabase'}
                    </button>
                    <button onClick={handleSupabasePull} disabled={!!isLoading} className="w-full bg-blue-500/80 hover:bg-blue-500/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                        {isLoading === 'pull-supabase' ? 'Pulling...' : 'Pull from Supabase'}
                    </button>
                </div>
                 {lastSync && <p className="text-xs text-center text-gray-400">Last sync: {lastSync}</p>}
            </div>

            {/* GitHub Gist Tab */}
            <div className={`flex-grow overflow-y-auto p-4 space-y-6 ${activeTab !== 'github' && 'hidden'}`}>
                {!githubToken ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center h-full">
                        <p className="text-gray-400 mb-4">You are not connected to GitHub.</p>
                        <button 
                            onClick={() => switchView('settings')}
                            className="bg-[var(--accent-primary)]/80 hover:bg-[var(--accent-primary)]/70 text-black font-bold py-2 px-4 rounded transition-colors"
                        >
                            Connect to GitHub
                        </button>
                    </div>
                ) : (
                    <>
                        <div>
                            <h3 className="text-md font-semibold mb-2">Commit & Push</h3>
                            <textarea value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="Commit message..." rows={2} className="bg-black/30 w-full p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)] mb-2" />
                            <button onClick={handleGenerateCommit} disabled={!!isLoading} className="w-full text-sm bg-gray-600 hover:bg-gray-500 rounded-lg px-3 py-1.5 transition-colors mb-2 disabled:opacity-50">
                                {isLoading === 'commit' ? 'Generating...' : 'Generate Commit Message'}
                            </button>
                            <button onClick={handlePush} disabled={!!isLoading} className="w-full bg-green-500/80 hover:bg-green-500/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                                {isLoading === 'push-gist' ? 'Pushing...' : 'Push Workspace'}
                            </button>
                            {pushResultUrl && (
                                <div className="mt-2 p-2 bg-black/30 rounded-lg">
                                    <input type="text" readOnly value={pushResultUrl} className="flex-grow bg-black/50 p-1 rounded text-xs w-full" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">Deploy Project</h3>
                             <button onClick={handleDeploy} disabled={!!isLoading} className="w-full bg-[var(--accent-secondary)]/80 hover:bg-[var(--accent-secondary)]/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                <span>{isLoading === 'deploy' ? 'Deploying...' : 'Deploy with AI'}</span>
                            </button>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">Share & Collaborate</h3>
                            <p className="text-xs text-gray-400 mb-2">Create a secret Gist and copy a shareable link.</p>
                            <button onClick={handleShare} disabled={!!isLoading} className="w-full bg-purple-500/80 hover:bg-purple-500/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                                {isLoading === 'share' ? 'Sharing...' : 'Copy Share Link'}
                            </button>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">Pull from Gist</h3>
                            <p className="text-xs text-gray-400 mb-2">Enter a Gist URL or ID. <strong className='text-yellow-400'>This will replace your workspace.</strong></p>
                            <input type="text" placeholder="Gist URL or ID" value={pullUrlInput} onChange={(e) => setPullUrlInput(e.target.value)} className="bg-black/30 w-full p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--accent-primary)] mb-2" />
                            <button onClick={handlePull} disabled={!!isLoading || !pullUrlInput} className="w-full bg-red-500/80 hover:bg-red-500/70 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                                {isLoading === 'pull-gist' ? 'Pulling...' : 'Pull and Replace'}
                            </button>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold mb-2">History</h3>
                            <div className="bg-black/20 p-2 rounded-lg max-h-48 overflow-y-auto">
                                <GitHistoryVisualizer history={commitHistory} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SourceControlPanel;