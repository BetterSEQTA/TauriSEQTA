<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';
  import { Icon, ArrowTopRightOnSquare } from 'svelte-hero-icons';

  let homepageNotices = $state<any[]>([]);
  let homepageLabels = $state<any[]>([]);
  let loadingHomepageNotices = $state(true);

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function fetchHomepageLabels() {
    const response = await seqtaFetch('/seqta/student/load/notices?', {
      method: 'POST',
      body: { mode: 'labels' },
    });
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    homepageLabels = Array.isArray(data?.payload) ? data.payload : [];
  }

  async function fetchHomepageNotices() {
    loadingHomepageNotices = true;
    const response = await seqtaFetch('/seqta/student/load/notices?', {
      method: 'POST',
      body: { date: formatDate(new Date()) },
    });
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    homepageNotices = Array.isArray(data?.payload) ? data.payload.slice(0, 50) : [];
    loadingHomepageNotices = false;
  }

  function getHomepageLabelColor(labelId: number): string {
    return homepageLabels.find((l) => l.id === labelId)?.colour || '#910048';
  }

  function getHomepageLabelTitle(labelId: number): string {
    return homepageLabels.find((l) => l.id === labelId)?.title || '';
  }

  onMount(async () => {
    await Promise.all([fetchHomepageLabels(), fetchHomepageNotices()]);
  });
</script>

<div
  class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
  <div
    class="flex justify-between items-center px-4 py-3 bg-gradient-to-br border-b from-slate-100/70 dark:from-slate-800/70 to-slate-100/30 dark:to-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
    <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Notices</h3>
    <a
      href="/notices"
      class="px-3 py-1.5 text-sm rounded-lg transition-all duration-300 text-nowrap accent-text hover:accent-bg-hover hover:text-white">
      View all
      <Icon src={ArrowTopRightOnSquare} class="inline ml-1 w-4 h-4" />
    </a>
  </div>
  <div
    class="overflow-y-auto px-6 py-4 max-h-80 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-800/10">
    {#if loadingHomepageNotices}
      <div class="py-10 text-center">
        <div
          class="mx-auto w-12 h-12 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500">
        </div>
        <p class="mt-4 text-slate-600 dark:text-slate-400">Loading notices...</p>
      </div>
    {:else if homepageNotices.length === 0}
      <div class="py-10 text-center text-slate-600 dark:text-slate-400">
        No notices available.
      </div>
    {:else}
      {#each homepageNotices as notice}
        <div
          class="p-4 mb-4 rounded-xl border transition-all duration-300 last:mb-0 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border-slate-300/50 dark:border-slate-700/50 hover:border-slate-400/50 dark:hover:border-slate-600/50">
          <div class="flex gap-2 items-center mb-2">
            <span
              class="px-2.5 py-1 text-xs font-medium rounded-full animate-gradient"
              style="background: linear-gradient(135deg, {getHomepageLabelColor(
                notice.label,
              )}, {getHomepageLabelColor(notice.label)}dd); color: white;">
              {getHomepageLabelTitle(notice.label)}
            </span>
            <span class="text-xs text-slate-600 dark:text-slate-400">{notice.staff}</span>
          </div>
          <div class="mb-2 text-base font-bold text-slate-900 dark:text-white">
            {notice.title}
          </div>
          <div class="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
            {@html notice.contents}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div> 