<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Subject, Folder } from '../types';

export let search: string = '';
export let loading: boolean = false;
export let error: string | null = null;
export let activeSubjects: Subject[] = [];
export let otherFolders: Folder[] = [];
export let selectedSubject: Subject | null = null;
export let expandedFolders: Record<string, boolean> = {};
export let subjectMatches: (subj: Subject) => boolean;
export let folderMatches: (folder: Folder) => boolean;

const dispatch = createEventDispatcher<{
  selectSubject: Subject;
  toggleFolder: string;
}>();
</script>

<aside class="flex flex-col w-80 h-full border-r bg-slate-950 border-slate-800">
  <div class="px-4 py-3 border-b border-slate-800">
    <input
      type="text"
      placeholder="Search subjects..."
      bind:value={search}
      class="px-3 py-2 w-full rounded-lg border bg-slate-800 text-slate-50 border-slate-800 focus:outline-none focus:ring focus:ring-indigo-500"
    />
  </div>
  <div class="overflow-y-auto flex-1">
    {#if loading}
      <div class="px-6 py-6 text-slate-400">Loading…</div>
    {:else if error}
      <div class="px-6 py-6 text-red-400">{error}</div>
    {:else}
      {#each activeSubjects.filter(subjectMatches) as subj}
        <button 
          class="px-6 py-3 w-full text-left font-bold text-base hover:bg-slate-800 cursor-pointer border-l-2 border-transparent hover:accent-border transition-all {selectedSubject && selectedSubject.classunit === subj.classunit ? 'bg-slate-800 accent-border' : ''}"
          on:click={() => dispatch('selectSubject', subj)}>
          {subj.title}
        </button>
      {/each}
      <div class="my-2 border-t border-slate-800"></div>
      {#each otherFolders.filter(folderMatches) as folder}
        <div>
          <button 
            class="flex justify-between items-center px-6 py-3 w-full border-l-2 border-transparent transition-all cursor-pointer hover:bg-slate-800 hover:accent-border"
            on:click={() => dispatch('toggleFolder', folder.code)}>
            <span class="text-base font-bold">{folder.code}</span>
            <svg 
              class="ml-2 w-4 h-4 transition-transform duration-200 text-slate-400" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              viewBox="0 0 24 24" 
              style="transform: rotate({expandedFolders[folder.code] ? 90 : 0}deg)">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {#if expandedFolders[folder.code]}
            {#each folder.subjects.filter(subjectMatches) as subj}
              <button 
                class="pl-10 pr-6 py-2 font-medium text-sm hover:bg-slate-800 cursor-pointer border-l-2 border-transparent hover:accent-border transition-all {selectedSubject && selectedSubject.classunit === subj.classunit ? 'bg-slate-800 accent-border' : ''}"
                on:click={() => dispatch('selectSubject', subj)}>
                {subj.title}
              </button>
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside> 