
import type { Directory, SupabaseUser } from '../types';

declare const window: any;
let supabase: any = null;

export const initialize = (url: string | null, key: string | null) => {
    if (url && key && window.supabase) {
        try {
            supabase = window.supabase.createClient(url, key);
        } catch (e) {
            console.error("Failed to initialize Supabase client:", e);
            supabase = null;
        }
    } else {
        supabase = null;
    }
};

const getClient = () => supabase;


export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const client = getClient();
    if (!client) return { data: { subscription: { unsubscribe: () => {} } } };
    return client.auth.onAuthStateChange(callback);
};

export const signInWithMagicLink = async (email: string) => {
    const client = getClient();
    if (!client) return { error: new Error("Supabase is not configured. Please provide a valid URL and Key in Settings.") };
    return client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
};

export const signOut = async () => {
    const client = getClient();
    if (!client) return { error: new Error("Supabase is not configured.") };
    return client.auth.signOut();
};

export const saveWorkspace = async (fs: Directory) => {
    const client = getClient();
    if (!client) throw new Error("Supabase is not configured. Please provide a valid URL and Key in Settings.");
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { data, error } = await client
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    const updatedAt = new Date().toISOString();

    if (data) { // Workspace exists, update it
        const { error: updateError } = await client
            .from('workspaces')
            .update({ content: fs, updated_at: updatedAt })
            .eq('id', data.id);
        if (updateError) throw updateError;
    } else { // No workspace, create one
        const { error: insertError } = await client
            .from('workspaces')
            .insert({ user_id: user.id, content: fs, updated_at: updatedAt });
        if (insertError) throw insertError;
    }
    
    return updatedAt;
};

export const loadWorkspace = async (): Promise<{ content: Directory, updated_at: string } | null> => {
    const client = getClient();
    if (!client) throw new Error("Supabase is not configured. Please provide a valid URL and Key in Settings.");
    
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    
    const { data, error } = await client
        .from('workspaces')
        .select('content, updated_at')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = 'single row not found'
        throw error;
    }
    
    return data;
};
