<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';

  interface HomeworkItem {
    meta: number;
    id: number;
    title: string;
    items: string[];
  }

  interface HomeworkResponse {
    payload: HomeworkItem[];
    status: string;
  }

  let homeworkData = $state<HomeworkResponse | null>(null);
  let homeworkError = $state<string | null>(null);
  let loadingHomework = $state(true);

  async function fetchHomeworkData() {
    try {
      loadingHomework = true;
      homeworkError = null;
      const response = await seqtaFetch('/seqta/student/dashlet/summary/homework', {
        method: 'POST',
        body: {},
        params: { majhvjju: '' },
      });
      homeworkData = JSON.parse(response);
    } catch (e: any) {
      console.error('Error details:', e);
      homeworkError = e.toString();
    } finally {
      loadingHomework = false;
    }
  }

  onMount(async () => {
    await fetchHomeworkData();
  });
</script>

<div
  class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
  <div
    class="flex justify-between items-center px-4 py-3 bg-gradient-to-br border-b from-slate-100/70 dark:from-slate-800/70 to-slate-100/30 dark:to-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
    <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Homework</h3>
  </div>
  <div class="p-6">
    {#if loadingHomework}
      <div class="flex justify-center items-center py-12">
        <div
          class="w-16 h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500">
        </div>
        <p class="mt-4 text-slate-600 dark:text-slate-400">Loading homework data...</p>
      </div>
    {:else if homeworkError}
      <div class="px-6 py-4 mb-4 text-red-700 bg-red-100 rounded-lg border border-red-200">
        <p>Error: {homeworkError}</p>
      </div>
    {:else if homeworkData}
      <div class="flex flex-col gap-6">
        {#each homeworkData.payload as homework}
          <div
            class="rounded-xl border-l-8 shadow-lg backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50"
            style="border-color: var(--accent);">
            <div class="px-6 pt-5 pb-3">
              <h3 class="mb-2 text-lg font-bold text-slate-900 dark:text-white">
                {homework.title}
              </h3>
              <div class="flex flex-col gap-3">
                {#each homework.items as item}
                  <div
                    class="flex gap-2 items-start px-4 py-3 rounded-lg border backdrop-blur-sm border-slate-300 bg-slate-200/80 dark:bg-slate-700/50 dark:border-slate-600">
                    <span class="mt-1 text-xl accent-text">•</span>
                    <span class="text-slate-800 dark:text-slate-50">{item}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-center text-slate-600 dark:text-slate-400">
        No homework data available
      </p>
    {/if}
  </div>
</div> 