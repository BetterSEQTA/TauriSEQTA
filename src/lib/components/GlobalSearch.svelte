<script lang="ts">
import { createEventDispatcher, onMount, onDestroy } from 'svelte';
import { goto } from '$app/navigation';
import { writable, derived } from 'svelte/store';
import { Icon, Squares2x2, BookOpen, ClipboardDocumentList } from 'svelte-hero-icons';
import { scale } from 'svelte/transition';

const dispatch = createEventDispatcher();

const pages = [
  { name: 'Home', path: '/' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Assessments', path: '/assessments' },
  { name: 'Courses', path: '/courses' },
  { name: 'Directory', path: '/directory' },
  { name: 'Direqt Messages', path: '/direqt-messages' },
  { name: 'News', path: '/news' },
  { name: 'Notices', path: '/notices' },
  { name: 'Reports', path: '/reports' },
  { name: 'Settings', path: '/settings' },
  { name: 'Timetable', path: '/timetable' },
  { name: 'Welcome', path: '/welcome' },
];

const searchStore = writable('');
const showModal = writable(false);
const filteredPages = derived(searchStore, ($search) =>
  $search ? pages.filter((p) => p.name.toLowerCase().includes($search.toLowerCase())) : pages
);
let selectedIndex = $state(0);
let inputBox: HTMLInputElement | null = null;
let modalInput = $state<HTMLInputElement | null>(null);
let inPagesFolder = $state<false | 'pages' | 'courses' | 'assessments'>(false);

let folderOptions = [
  { name: 'Pages', icon: Squares2x2 },
  { name: 'Courses', icon: BookOpen },
  { name: 'Assessments', icon: ClipboardDocumentList },
];

const visibleFolders = derived(searchStore, $search =>
  $search.trim() === ''
    ? folderOptions
    : folderOptions.filter(folder => folder.name.toLowerCase().includes($search.trim().toLowerCase()))
);
const totalItems = derived([visibleFolders, searchStore, filteredPages], ([$visibleFolders, $searchStore, $filteredPages]) =>
  $visibleFolders.length + ($searchStore.trim() !== '' ? $filteredPages.length : 0)
);

function openModal() {
  showModal.set(true);
  inPagesFolder = false;
  setTimeout(() => {
    if (modalInput) modalInput.focus();
  }, 10);
}
function openPagesFolder() {
  inPagesFolder = true;
  setTimeout(() => {
    if (modalInput) modalInput.focus();
  }, 10);
}
function goBack() {
  inPagesFolder = false;
  setTimeout(() => {
    if (modalInput) modalInput.focus();
  }, 10);
}
function closeModal() {
  showModal.set(false);
  searchStore.set('');
}
function handleSelect(page: { name: string; path: string }) {
  closeModal();
  goto(page.path);
}
function handleKeydown(e: KeyboardEvent) {
  if (!$showModal) return;
  if (inPagesFolder) {
    if ($filteredPages.length === 0) return;
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
      closeModal();
    }
  } else {
    if ($totalItems === 0) return;
    if (e.key === 'ArrowDown') {
      selectedIndex = (selectedIndex + 1) % $totalItems;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      selectedIndex = (selectedIndex - 1 + $totalItems) % $totalItems;
      e.preventDefault();
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      if (selectedIndex < $visibleFolders.length) {
        // Folder
        if ($visibleFolders[selectedIndex].name === 'Pages') inPagesFolder = 'pages';
        else if ($visibleFolders[selectedIndex].name === 'Courses') inPagesFolder = 'courses';
        else if ($visibleFolders[selectedIndex].name === 'Assessments') inPagesFolder = 'assessments';
      } else {
        // Page result
        handleSelect($filteredPages[selectedIndex - $visibleFolders.length]);
      }
      e.preventDefault();
      return;
    } else if (e.key === 'Escape') {
      closeModal();
    }
  }
}
onMount(() => {
  const handleClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.global-search-modal')) {
      closeModal();
    }
  };
  window.addEventListener('mousedown', handleClick);

  const handleGlobalKeydown = (e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openModal();
    }
    // Escape
    if ($showModal && e.key === 'Escape') {
      if (inPagesFolder === 'pages' || inPagesFolder === 'courses' || inPagesFolder === 'assessments') {
        inPagesFolder = 'pages';
        setTimeout(() => {
          if (modalInput) modalInput.focus();
        }, 10);
      } else {
        closeModal();
      }
    }
  };
  window.addEventListener('keydown', handleGlobalKeydown);

  return () => {
    window.removeEventListener('mousedown', handleClick);
    window.removeEventListener('keydown', handleGlobalKeydown);
  };
});
</script>

<!-- Header search box trigger -->
<div class="flex-1 flex justify-center" data-tauri-drag-region>
  <input
    type="text"
    class="w-72 px-5 py-2 rounded-xl bg-white/20 dark:bg-gray-800/40 border border-accent-500 text-accent-500 font-semibold shadow-md backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 accent-ring placeholder:text-accent-500/70 text-center cursor-pointer select-none"
    placeholder="Quick search..."
    readonly
    onfocus={openModal}
    onclick={openModal}
    aria-label="Open global search"
  />
</div>

{#if $showModal}
  <div class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div class="global-search-modal relative w-full max-w-xl min-w-[32rem] min-h-[28rem] mx-auto rounded-2xl bg-white/70 dark:bg-gray-900/80 shadow-2xl border border-white/20 dark:border-gray-700/40 backdrop-blur-xl p-0 flex flex-col animate-in"
      style="backdrop-filter: blur(24px);"
      in:scale={{ duration: 180, start: 0.98, opacity: 0 }}
      out:scale={{ duration: 120, start: 1, opacity: 0 }}
      tabindex="-1"
    >
      <div class="flex items-center gap-3 px-6 pt-6 pb-2">
        {#if inPagesFolder}
          <button class="mr-2 text-accent-500 hover:text-accent-700 transition-colors" onclick={goBack} aria-label="Back">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        {/if}
        <span class="text-accent-500"><Icon src={Squares2x2} class="w-6 h-6" /></span>
        <input
          bind:this={modalInput}
          type="text"
          class="flex-1 px-4 py-3 rounded-xl bg-white/40 dark:bg-gray-800/60 text-slate-900 dark:text-white border border-accent-500/40 focus:outline-none focus:ring-2 accent-ring transition-all duration-200 placeholder:text-slate-500 dark:placeholder:text-gray-400 text-lg shadow-md"
          placeholder={inPagesFolder ? "Search pages..." : "Search..."}
          bind:value={$searchStore}
          onkeydown={handleKeydown}
          autocomplete="off"
          style="backdrop-filter: blur(8px);"
        />
      </div>
      {#if inPagesFolder}
        {#if $filteredPages.length > 0}
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
                  <Icon src={Squares2x2} class="w-5 h-5" />
                </span>
                {page.name}
              </button>
            {/each}
          </ul>
        {/if}
      {:else}
        <ul class="w-full mt-2 mb-4 px-2 space-y-1 max-h-96 overflow-y-auto" role="listbox">
          {#each $visibleFolders as folder, i}
            <button
              type="button"
              role="option"
              aria-selected={selectedIndex === i}
              class={`flex items-center gap-3 w-full text-left px-5 py-3 cursor-pointer transition-all duration-200 rounded-xl hover:scale-[1.02] hover:bg-accent-100 dark:hover:bg-accent-700 text-base font-medium ${selectedIndex === i ? 'bg-accent-500 text-white' : 'text-slate-900 dark:text-white'}`}
              onclick={() => {
                if (folder.name === 'Pages') inPagesFolder = 'pages';
                else if (folder.name === 'Courses') inPagesFolder = 'courses';
                else if (folder.name === 'Assessments') inPagesFolder = 'assessments';
              }}
              tabindex="-1"
            >
              <span class="w-5 h-5 flex-shrink-0 rounded-lg bg-accent-500/20 flex items-center justify-center">
                <Icon src={folder.icon} class="w-5 h-5" />
              </span>
              {folder.name}
            </button>
          {/each}
          {#if $searchStore.trim() !== '' && $filteredPages.length > 0}
            <li class="mt-4 mb-1 px-5 text-xs font-semibold text-accent-500 uppercase tracking-wider">Pages</li>
            {#each $filteredPages as page, j}
              <button
                type="button"
                role="option"
                aria-selected={selectedIndex === $visibleFolders.length + j}
                class={`flex items-center gap-3 w-full text-left px-5 py-3 cursor-pointer transition-all duration-200 rounded-xl hover:scale-[1.02] hover:bg-accent-100 dark:hover:bg-accent-700 text-base font-medium ${selectedIndex === $visibleFolders.length + j ? 'bg-accent-500 text-white' : 'text-slate-900 dark:text-white'}`}
                onclick={() => handleSelect(page)}
                tabindex="-1"
              >
                <span class="w-5 h-5 flex-shrink-0 rounded-lg bg-accent-500/20 flex items-center justify-center">
                  <Icon src={Squares2x2} class="w-5 h-5" />
                </span>
                {page.name}
              </button>
            {/each}
          {/if}
        </ul>
      {/if}
      <div class="flex items-center gap-4 px-6 pb-4 pt-2 text-xs text-slate-500 dark:text-gray-400">
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">↑</kbd><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">↓</kbd> Navigate</span>
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">⏎</kbd> Select</span>
        <span class="flex items-center gap-1"><kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">Esc</kbd> Close</span>
      </div>
    </div>
  </div>
{/if}

{#if inPagesFolder === 'pages'}
  {#if $filteredPages.length > 0}
    <div class="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-gray-400">
      <Icon src={Squares2x2} class="w-8 h-8 mb-2" />
      <span>Pages folder (mock, empty)</span>
    </div>
  {/if}
{:else if inPagesFolder === 'courses'}
  <div class="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-gray-400">
    <Icon src={BookOpen} class="w-8 h-8 mb-2" />
    <span>Courses folder (mock, empty)</span>
  </div>
{:else if inPagesFolder === 'assessments'}
  <div class="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-gray-400">
    <Icon src={ClipboardDocumentList} class="w-8 h-8 mb-2" />
    <span>Assessments folder (mock, empty)</span>
  </div>
{/if} 