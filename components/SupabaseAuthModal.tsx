
import React, { useState, useRef, useEffect } from 'react';
import type { Notification } from '../types';
import * as supabaseService from '../services/supabaseService';

interface SupabaseAuthModalProps {
    onClose: () => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({ onClose, addNotification }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        try {
            const { error } = await supabaseService.signInWithMagicLink(email);
            if (error) throw error;
            setIsSubmitted(true);
        } catch (error) {
            if(error instanceof Error) addNotification({ type: 'error', message: `Login failed: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-[var(--ui-panel-bg-heavy)] backdrop-blur-lg text-white rounded-lg shadow-xl w-full max-w-sm p-6 border border-[var(--ui-border)] animate-float-in"
                onClick={e => e.stopPropagation()}
            >
                {isSubmitted ? (
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">Check your email</h2>
                        <p className="text-sm text-gray-300 mb-6">A magic link has been sent to <strong className="text-white">{email}</strong>. Click the link to sign in.</p>
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold mb-2">Connect to Supabase</h2>
                        <p className="text-sm text-gray-400 mb-6">Enter your email to receive a secure magic link to sign in or create an account.</p>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                                <input
                                    ref={inputRef}
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
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
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default SupabaseAuthModal;
