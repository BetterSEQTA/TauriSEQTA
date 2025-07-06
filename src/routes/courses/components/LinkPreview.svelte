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
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      case 'interactive':
        return '🎮';
      default:
        return '🔗';
    }
  }
</script>

{#if isEmbeddable && embedUrl}
  <div
    class="p-4 mb-6 max-w-xl bg-white rounded-xl border dark:bg-slate-900 border-slate-300 dark:border-slate-700 animate-slide-in">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center">
        <span class="mr-3 text-2xl animate-bounce">{getEmbedIcon(embedType)}</span>
        <h4 class="font-semibold text-slate-900 dark:text-white">
          {getDomainName(url)}
        </h4>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center text-sm font-medium transition-all duration-200 accent-text hover:accent-bg-hover hover:scale-105">
        <svg
          class="mr-1 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open
      </a>
    </div>

    <div
      class="overflow-hidden relative w-full rounded-lg bg-slate-100 dark:bg-black animate-fade-in">
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
{:else if preview}
  {@const hasLargeImage =
    preview.image && (preview.imageWidth || 0) > 200 && (preview.imageHeight || 0) > 200}
  {#if hasLargeImage}
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      class="block overflow-hidden mb-4 bg-white rounded-xl border transition-all duration-300 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-500 group animate-slide-in hover:shadow-lg">
      <div class="relative w-full h-48 overflow-clip bg-slate-200 dark:bg-slate-800">
        <img
          src={preview.image}
          alt={preview.title}
          class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
        <div
          class="absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-opacity duration-300 from-black/80 group-hover:opacity-90">
        </div>
        <div class="absolute bottom-2 right-4 left-4">
          <h4
            class="mb-0 text-lg font-semibold text-white transition-colors duration-300 line-clamp-2 group-hover:text-indigo-300">
            {preview.title}
          </h4>
        </div>
      </div>

      <div class="p-4">
        {#if preview.description}
          <p
            class="mb-3 text-sm transition-colors duration-300 text-slate-700 dark:text-slate-300 line-clamp-3 group-hover:text-slate-900 dark:group-hover:text-white">
            {preview.description}
          </p>
        {/if}

        <div class="flex justify-between items-center">
          <span
            class="text-xs transition-colors duration-300 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            >{getDomainName(url)}</span>
          <span
            class="inline-flex items-center text-sm font-medium transition-all duration-300 accent-text group-hover:accent-bg-hover group-hover:translate-x-1">
            <svg
              class="mr-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
      class="block p-4 mb-4 bg-white rounded-xl border transition-all duration-300 dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-500 group animate-slide-in hover:shadow-lg">
      <h4
        class="mt-0 mb-2 text-lg font-semibold transition-colors duration-300 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
        {preview.title}
      </h4>
      {#if preview.description}
        <p
          class="mb-3 text-sm transition-colors duration-300 text-slate-700 dark:text-slate-300 line-clamp-3 group-hover:text-slate-900 dark:group-hover:text-white">
          {preview.description}
        </p>
      {/if}
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          {#if preview.image}
            <img
              src={preview.image}
              alt={preview.title}
              class="my-0 mr-4 rounded-lg transition-transform duration-300 size-6 group-hover:scale-110" />
          {/if}
          <span
            class="text-xs transition-colors duration-300 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            >{getDomainName(url)}</span>
        </div>
        <span
          class="inline-flex items-center text-sm font-medium transition-all duration-300 accent-text group-hover:accent-bg-hover group-hover:translate-x-1">
          <svg
            class="mr-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Visit Link
        </span>
      </div>
    </a>
  {/if}
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    opacity: 0;
    animation: fadeIn 0.3s ease-out forwards;
  }

  .animate-slide-in {
    opacity: 0;
    animation: slideIn 0.3s ease-out forwards;
  }

  .animate-bounce {
    animation: bounce 0.8s infinite;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }
</style>
