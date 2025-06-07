<script lang="ts">
import { isEmbeddableUrl, getEmbedUrl, getEmbedType } from '../utils';
import type { LinkPreview } from '../types';

let { url, preview = null }: { url: string; preview?: LinkPreview | null } = $props();

let isEmbeddable = $derived(isEmbeddableUrl(url));
let embedUrl = $derived(getEmbedUrl(url));
let embedType = $derived(getEmbedType(url));

function getDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'External Link';
  }
}

function getEmbedIcon(type: string): string {
  switch (type) {
    case 'video': return '🎥';
    case 'document': return '📄';
    case 'interactive': return '🎮';
    default: return '🔗';
  }
}
</script>

{#if isEmbeddable && embedUrl}
  <div class="mb-6 p-4 max-w-xl bg-slate-900 rounded-xl border border-slate-700">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <span class="text-2xl mr-3">{getEmbedIcon(embedType)}</span>
        <h4 class="text-white font-semibold">{getDomainName(url)}</h4>
      </div>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        class="flex items-center text-indigo-400 hover:text-purple-300 font-medium text-sm transition-colors">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    </div>
    
    <div class="relative w-full bg-black rounded-lg overflow-hidden">
      {#if embedType === 'video'}
        <div class="relative pb-[42%] h-0">
          <iframe
            src={embedUrl}
            title="Embedded content from {getDomainName(url)}"
            class="absolute top-0 left-0 w-full h-full border-0"
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
      {:else if embedType === 'document'}
        <div class="relative pb-[50%] h-0">
          <iframe
            src={embedUrl}
            title="Document from {getDomainName(url)}"
            class="absolute top-0 left-0 w-full h-full border-0"
            loading="lazy">
          </iframe>
        </div>
      {:else}
        <div class="relative pb-[40%] h-0">
          <iframe
            src={embedUrl}
            title="Interactive content from {getDomainName(url)}"
            class="absolute top-0 left-0 w-full h-full border-0"
            loading="lazy">
          </iframe>
        </div>
      {/if}
    </div>
  </div>
{:else}
  {#if preview}
    {@const hasLargeImage = preview.image && (preview.imageWidth || 0) > 200 && (preview.imageHeight || 0) > 200}
    {#if hasLargeImage}
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        class="block mb-4 bg-slate-900 rounded-xl border border-slate-700 hover:border-indigo-500 transition-colors group overflow-hidden">
        
        <div class="relative w-full h-48 bg-slate-800 overflow-clip">
          <img 
            src={preview.image} 
            alt={preview.title} 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div class="absolute bottom-2 left-4 right-4">
            <h4 class="text-lg font-semibold text-white mb-0 transition-colors line-clamp-2">
              {preview.title}
            </h4>
          </div>
        </div>
        
        <div class="p-4">
          {#if preview.description}
            <p class="text-slate-300 text-sm mb-3 line-clamp-3">{preview.description}</p>
          {/if}
          
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-xs">{getDomainName(url)}</span>
            <span class="inline-flex items-center text-indigo-400 group-hover:text-purple-300 font-medium text-sm transition-colors">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Visit Link
            </span>
          </div>
        </div>
      </a>
    {:else}
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        class="block mb-4 p-4 bg-slate-900 rounded-xl border border-slate-700 hover:border-indigo-500 transition-colors group">
        <h4 class="text-lg mt-0 font-semibold text-white mb-2 group-hover:text-indigo-300 transition-colors">{preview.title}</h4>
        {#if preview.description}
          <p class="text-slate-300 text-sm mb-3 line-clamp-3">{preview.description}</p>
        {/if}
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            {#if preview.image}
              <img src={preview.image} alt={preview.title} class="size-6 rounded-lg mr-4 my-0" />
            {/if}
            <span class="text-slate-400 text-xs">{getDomainName(url)}</span>
          </div>
          <span class="inline-flex items-center text-indigo-400 group-hover:text-purple-300 font-medium text-sm transition-colors">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            Visit Link
          </span>
        </div>
      </a>
    {/if}
  {/if}
{/if} 