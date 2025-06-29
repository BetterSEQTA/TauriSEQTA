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

<aside
  class="flex flex-col w-80 h-full border-r backdrop-blur-sm bg-white/80 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50">
  <div class="px-4 py-3 border-b border-slate-300/50 dark:border-slate-700/50">
    <div class="relative">
      <input
        type="text"
        placeholder="Search subjects..."
        class="px-4 py-2 w-full bg-white rounded-lg border transition-all duration-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        bind:value={search} />
      <svg
        class="absolute right-3 top-1/2 w-5 h-5 transform -translate-y-1/2 text-slate-400 dark:text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    {#if search}
      <div class="my-4">
        <h3 class="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Search Results</h3>
        {#if activeSubjects.filter(subjectMatches).length === 0}
          <p class="text-sm text-slate-500 dark:text-slate-400">No subjects found</p>
        {:else}
          <div class="space-y-2">
            {#each activeSubjects.filter(subjectMatches) as subject}
              <button
                class="overflow-hidden p-3 w-full text-left bg-white rounded-lg border transition-all duration-200 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 group hover:shadow-lg"
                onclick={() => {
                  dispatch('selectSubject', subject);
                  search = '';
                }}>
                <div
                  class="flex items-center transition-all duration-300 group-hover:translate-x-1">
                  <div>
                    <h4
                      class="font-medium transition-colors duration-300 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {subject.title}
                    </h4>
                    <p
                      class="text-sm transition-colors duration-300 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-300">
                      {subject.description}
                    </p>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="overflow-y-auto flex-1">
    {#if loading}
      <div class="flex justify-center items-center px-6 py-6 text-slate-600 dark:text-slate-400">
        <div
          class="mr-3 w-6 h-6 rounded-full border-2 animate-spin border-accent/30 border-t-accent">
        </div>
        Loading…
      </div>
    {:else if error}
      <div class="px-6 py-6 text-red-400">⚠️ {error}</div>
    {:else}
      {#each activeSubjects.filter(subjectMatches) as subj}
        <button
          class="px-6 py-3 w-full text-left font-bold text-base text-slate-900 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer border-l-2 border-transparent hover:accent-border transition-all duration-200 overflow-hidden group {selectedSubject &&
          selectedSubject.classunit === subj.classunit
            ? 'bg-white/50 dark:bg-slate-800/50 accent-border'
            : ''}"
          onclick={() => dispatch('selectSubject', subj)}>
          <span
            class="transition-all duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1"
            >{subj.title}</span>
        </button>
      {/each}

      <div class="my-2 border-t border-slate-300/50 dark:border-slate-700/50"></div>

      {#each otherFolders.filter(folderMatches) as folder}
        <div>
          <button
            class="flex overflow-hidden justify-between items-center px-6 py-3 w-full border-l-2 border-transparent transition-all duration-200 cursor-pointer text-slate-900 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50 hover:accent-border group"
            onclick={() => dispatch('toggleFolder', folder.code)}>
            <span class="text-base font-bold transition-all duration-300 group-hover:translate-x-1"
              >{folder.code}</span>
            <svg
              class="ml-2 w-4 h-4 transition-transform duration-300 text-slate-600 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
              style="transform: rotate({expandedFolders[folder.code] ? 90 : 0}deg)">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {#if expandedFolders[folder.code]}
            <div>
              {#each folder.subjects.filter(subjectMatches) as subj}
                <button
                  class="pl-10 pr-6 py-2 font-medium text-sm text-slate-900 dark:text-white hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer border-l-2 border-transparent hover:accent-border transition-all duration-200 overflow-hidden group {selectedSubject &&
                  selectedSubject.classunit === subj.classunit
                    ? 'bg-white/50 dark:bg-slate-800/50 accent-border'
                    : ''}"
                  onclick={() => dispatch('selectSubject', subj)}>
                  <span
                    class="transition-all duration-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1"
                    >{subj.title}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>
