<script lang="ts">
  import { Icon, ArrowDownTray, TableCells, DocumentText } from 'svelte-hero-icons';
  import { fly, scale } from 'svelte/transition';

  export let showExportMenu: boolean;
  export let onExportCsv: () => void;
  export let onExportPdf: () => void;
</script>

<div class="inline-block relative text-left export-dropdown-container">
  <button
    class="flex gap-3 items-center px-5 py-3 rounded-xl border transition-all duration-200 bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-600 border-slate-200/70 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-md hover:shadow-lg"
    on:click={() => (showExportMenu = !showExportMenu)}
    aria-label="Export options"
    aria-expanded={showExportMenu}>
    <Icon src={ArrowDownTray} class="w-4 h-4 text-slate-700 dark:text-slate-300" />
    <span class="font-semibold text-slate-900 dark:text-white">Export</span>
  </button>
  
  {#if showExportMenu}
    <div
      class="absolute right-0 z-50 mt-3 w-64 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/95 border-slate-200/60 dark:bg-slate-900/95 dark:border-slate-700/40"
      transition:fly={{ y: -8, duration: 200, opacity: 0 }}>
      <div class="p-3">
        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 px-2">
          Export Format
        </div>
        
        <button
          class="flex gap-4 items-center px-4 py-4 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50 group"
          on:click={() => {
            showExportMenu = false;
            onExportCsv();
          }}>
          <div
            class="flex justify-center items-center w-10 h-10 rounded-xl transition-all duration-200 bg-green-100 group-hover:bg-green-200 dark:bg-green-900/30 dark:group-hover:bg-green-900/50">
            <Icon src={TableCells} class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1">
            <div class="font-semibold text-slate-900 dark:text-white">Export as CSV</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">Spreadsheet format for Excel</div>
          </div>
        </button>

        <button
          class="flex gap-4 items-center px-4 py-4 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/50 group"
          on:click={() => {
            showExportMenu = false;
            onExportPdf();
          }}>
          <div
            class="flex justify-center items-center w-10 h-10 rounded-xl transition-all duration-200 bg-red-100 group-hover:bg-red-200 dark:bg-red-900/30 dark:group-hover:bg-red-900/50">
            <Icon src={DocumentText} class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div class="flex-1">
            <div class="font-semibold text-slate-900 dark:text-white">Export as PDF</div>
            <div class="text-sm text-slate-500 dark:text-slate-400">Portable document format</div>
          </div>
        </button>
      </div>
    </div>
  {/if}
</div> 