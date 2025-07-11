<script lang="ts">
  import { errorService } from '../services/errorService';
  import { Icon } from 'svelte-hero-icons';
  import { ExclamationTriangle, ArrowPath } from 'svelte-hero-icons';

  let { children, fallback } = $props<{
    children: any;
    fallback?: (error: unknown, reset: () => void) => any;
  }>();

  function onerror(error: unknown, reset: () => void) {
    // Log the error
    console.error('Error caught by ErrorBoundary:', error);
    
    // Report to error service
    if (error instanceof Error) {
      errorService.handleManualError(error);
    } else {
      errorService.handleManualError(String(error));
    }
  }
</script>

<svelte:boundary {onerror}>
  {@render children()}
  
  {#snippet failed(error, reset)}
    {#if fallback}
      {@render fallback(error, reset)}
    {:else}
      <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div class="flex items-center gap-3 mb-3">
          <Icon src={ExclamationTriangle} size="20" class="text-red-500 dark:text-red-400" />
          <h3 class="text-sm font-semibold text-red-700 dark:text-red-400">Component Error</h3>
        </div>
        
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-3">
          {error instanceof Error ? error.message : String(error) || 'An error occurred in this component'}
        </p>
        
        <button
          onclick={reset}
          class="px-3 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:bg-red-200 dark:hover:bg-red-700"
        >
          <Icon src={ArrowPath} size="14" class="inline mr-1" />
          Retry
        </button>
      </div>
    {/if}
  {/snippet}
</svelte:boundary> 