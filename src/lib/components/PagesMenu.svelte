<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { goto } from '$app/navigation';
import { writable, derived } from 'svelte/store';
import { Icon, Squares2x2 } from 'svelte-hero-icons';
import { scale } from 'svelte/transition';

const dispatch = createEventDispatcher();

const pages = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Assessments', path: '/assessments' },
  { name: 'Courses', path: '/courses' },
  { name: 'Directory', path: '/directory' },
  { name: 'Direqt Messages', path: '/direqt-messages' },
  { name: 'News', path: '/news' },
  { name: 'Notices', path: '/notices' },
  { name: 'QR Sign In', path: '/qrsignin' },
  { name: 'Reports', path: '/reports' },
  { name: 'Settings', path: '/settings' },
  { name: 'Timetable', path: '/timetable' },
  { name: 'Welcome', path: '/welcome' },
];

const searchStore = writable('');
const showDropdownStore = writable(true);
const filteredPages = derived(searchStore, ($search) =>
  $search ? pages.filter((p) => p.name.toLowerCase().includes($search.toLowerCase())) : pages
);
let selectedIndex = 0;
let searchInput: HTMLInputElement | null = null;

function handleSelect(page: { name: string; path: string }) {
  searchStore.set('');
  showDropdownStore.set(false);
  dispatch('close');
  goto(page.path);
}

function handleKeydown(e: KeyboardEvent) {
  if (!$showDropdownStore || $filteredPages.length === 0) return;
  if (e.key === 'ArrowDown') {
    selectedIndex = (selectedIndex + 1) % $filteredPages.length;
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    selectedIndex = (selectedIndex - 1 + $filteredPages.length) % $filteredPages.length;
    e.preventDefault();
  } else if (e.key === 'Enter' && selectedIndex >= 0) {
    handleSelect($filteredPages[selectedIndex]);
    e.preventDefault();
  } else if (e.key === 'Escape') {
    dispatch('close');
  }
}

onMount(() => {
  if (searchInput) searchInput.focus();
  const handleClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.pages-modal')) {
      dispatch('close');
    }
  };
  window.addEventListener('mousedown', handleClick);
  return () => window.removeEventListener('mousedown', handleClick);
});
</script>

<div class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div class="pages-modal relative w-full max-w-xl mx-auto rounded-2xl bg-white/70 dark:bg-gray-900/80 shadow-2xl border border-white/20 dark:border-gray-700/40 backdrop-blur-xl p-0 flex flex-col animate-in"
    style="backdrop-filter: blur(24px);"
    in:scale={{ duration: 180, start: 0.98, opacity: 0 }}
    out:scale={{ duration: 120, start: 1, opacity: 0 }}
    tabindex="-1"
  >
    <div class="flex items-center gap-3 px-6 pt-6 pb-2">
      <span class="text-accent-500"><Icon src={Squares2x2} class="w-6 h-6" /></span>
      <input
        id="pages-search-input"
        bind:this={searchInput}
        type="text"
        class="flex-1 px-4 py-3 rounded-xl bg-white/40 dark:bg-gray-800/60 text-slate-900 dark:text-white border border-accent-500/40 focus:outline-none focus:ring-2 accent-ring transition-all duration-200 placeholder:text-slate-500 dark:placeholder:text-gray-400 text-lg shadow-md"
        placeholder="Search pages..."
        bind:value={$searchStore}
        onkeydown={handleKeydown}
        autocomplete="off"
        style="backdrop-filter: blur(8px);"
      />
    </div>
    {#if $showDropdownStore && $filteredPages.length > 0}
      <ul
        class="w-full mt-2 mb-4 px-2 space-y-1 max-h-96 overflow-y-auto"
        role="listbox"
      >
        {#each $filteredPages as page, i}
          <button
            type="button"
            role="option"
            aria-selected={selectedIndex === i}
            class={`flex items-center gap-3 w-full text-left px-5 py-3 cursor-pointer transition-all duration-200 rounded-xl hover:scale-[1.02] hover:bg-accent-100 dark:hover:bg-accent-700 text-base font-medium ${selectedIndex === i ? 'bg-accent-500 text-white' : 'text-slate-900 dark:text-white'}`}
            onmousedown={() => handleSelect(page)}
            tabindex="-1"
          >
            <span class="w-5 h-5 flex-shrink-0 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <!-- Optionally add an icon here in the future -->
            </span>
            {page.name}
          </button>
        {/each}
      </ul>
    {/if}
    <div class="flex items-center gap-4 px-6 pb-4 pt-2 text-xs text-slate-500 dark:text-gray-400">
      <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">↑</kbd><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">↓</kbd> Navigate</span>
      <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">⏎</kbd> Select</span>
      <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">Esc</kbd> Close</span>
    </div>
  </div>
</div> 