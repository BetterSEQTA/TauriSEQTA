<script lang="ts">
  interface Shortcut {
    name: string;
    icon: string;
    url: string;
  }

  export let shortcuts: Shortcut[] = [];

  import { openUrl } from '@tauri-apps/plugin-opener';

  function handleShortcutClick(e: MouseEvent, url: string) {
    e.preventDefault();
    openUrl(url);
  }
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4 h-full">
  {#each shortcuts as shortcut}
    <a
      href={shortcut.url}
      target="_blank"
      rel="noopener noreferrer"
      class="flex relative flex-col justify-center items-center p-6 rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer border-slate-200 group bg-white/80 dark:bg-slate-900/60 dark:border-slate-800 hover:accent-bg hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 accent-ring"
      tabindex="0"
      aria-label={shortcut.name}
      on:click={(e) => handleShortcutClick(e, shortcut.url)}>
      <div
        class="flex relative justify-center items-center mb-4 w-16 h-16 text-3xl text-white rounded-2xl shadow-lg transition-all duration-200 accent-bg group-hover:scale-110 group-active:scale-95">
        {shortcut.icon}
      </div>
      <span
        class="relative mt-1 text-base font-semibold text-center transition-colors text-slate-900 dark:text-white"
        >{shortcut.name}</span>
    </a>
  {/each}
</div> 