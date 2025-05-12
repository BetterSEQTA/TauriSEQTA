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