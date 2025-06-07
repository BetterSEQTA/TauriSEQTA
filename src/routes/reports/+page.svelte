<script lang="ts">
import { onMount } from 'svelte';
import { seqtaFetch } from '../../utils/netUtil';
import { cache } from '../../utils/cache';

let reports = $state<any[]>([]);
let loading = $state(true);
let error = $state('');

function formatDate(dateStr: string) {
  const date = new Date(dateStr.replace(' ', 'T'));
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();
}

async function loadReports() {
  loading = true;
  error = '';

  // Check cache first
  const cachedReports = cache.get<any[]>('reports');
  if (cachedReports) {
    reports = cachedReports;
    loading = false;
    return;
  }

  try {
    const response = await seqtaFetch('/seqta/student/load/reports?', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    if (data.status === '200' && Array.isArray(data.payload)) {
      reports = data.payload;
      // Cache reports for 5 minutes
      cache.set('reports', reports);
    } else {
      error = 'Failed to load reports.';
    }
  } catch (e) {
    error = 'Error loading reports.';
  } finally {
    loading = false;
  }
}

onMount(loadReports);
</script>

<div class="p-8 min-h-screen bg-slate-900">
  <h1 class="text-3xl font-bold mb-8 text-white">Reports</h1>
  {#if loading}
    <div class="flex flex-col items-center justify-center py-24">
      <div class="w-16 h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"></div>
      <p class="mt-4 text-slate-400">Loading reports...</p>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center py-24">
      <div class="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-3xl shadow animate-gradient">⚠️</div>
      <p class="mt-4 text-xl text-slate-300">{error}</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {#each reports as report}
        <div
          class="group bg-[#232428] border border-[#333] rounded-2xl p-0 overflow-hidden shadow-md transition-all duration-200 hover:scale-[1.03] hover:shadow-lg focus:outline-none"
        >
          <div class="flex justify-between items-center px-6 pt-6">
            <div class="rounded-full accent-bg text-white text-lg font-bold px-6 py-2 tracking-widest transition-colors duration-300 group-hover:opacity-90 animate-gradient">{report.year}</div>
            <div class="rounded-full accent-bg text-white text-sm font-bold px-6 py-2 tracking-widest transition-colors duration-300 group-hover:opacity-90 animate-gradient">{report.terms}</div>
          </div>
          <div class="flex flex-col items-center justify-center flex-1 py-12">
            <div class="text-2xl font-extrabold text-white mb-2 text-center animate-fade-in">{report.types}</div>
          </div>
          <div class="px-6 pb-6">
            <div class="text-xs font-semibold text-white text-center opacity-80 animate-fade-in">
              {formatDate(report.created_date)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
.animate-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 8s ease infinite;
}
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
.animate-fade-in {
  animation: fade-in 0.7s cubic-bezier(.4,2.3,.3,1);
}
</style> 