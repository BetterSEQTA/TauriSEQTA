import { invoke } from '@tauri-apps/api/core';

export type SeqtaRequestInit = {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Record<string, any>;
    params?: Record<string, string>;
};

export async function seqtaFetch(input: string, init?: SeqtaRequestInit): Promise<any> {
    try {
        const response = await invoke('fetch_api_data', {
            url: input,
            method: init?.method || 'GET',
            headers: init?.headers || {},
            body: init?.body || {},
            parameters: init?.params || {}
        });
        
        // Convert the response to match the fetch API format
        return response;
    } catch (error) {
        console.error('seqtaFetch error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown fetch error');
    }
}

export async function getRSS(url: string): Promise<any> {
    try {
        const response = await invoke('get_rss_feed', {
            feed: url
        })
        return response;
    }
    catch (error) {
        console.error('getRSS error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown fetch error');
    }
}

export async function openURL(url: string): Promise<any> {
    try {
        const response = await invoke('open_url', {
            url: url
        })
    }
    catch (error) {
        console.error('openURL error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown fetch error');
    }
}


