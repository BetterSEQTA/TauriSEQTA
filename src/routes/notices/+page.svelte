<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';

  interface Notice {
    id: number;
    title: string;
    subtitle: string;
    author: string;
    color: string;
    labelId: number;
    content: string;
  }
  interface Label {
    id: number;
    title: string;
    color: string;
  }

  let notices: Notice[] = $state([]);
  let labels: Label[] = $state([]);
  let selectedLabel: number | null = $state(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedDate = $state(new Date());

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function fetchLabels() {
    try {
      const response = await seqtaFetch(
        '/seqta/student/load/notices?',
        {
          method: 'POST',
          body: { mode: 'labels' }
        }
      );
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      if (Array.isArray(data?.payload)) {
        labels = data.payload.map((l: any) => ({
          id: l.id,
          title: l.title,
          color: l.colour
        }));
      } else {
        labels = [];
      }
    } catch (e) {
      labels = [];
    }
  }

  async function fetchNotices() {
    loading = true;
    error = null;
    try {
      const response = await seqtaFetch(
        '/seqta/student/load/notices?',
        {
          method: 'POST',
          body: { date: formatDate(selectedDate) }
        }
      );
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      if (Array.isArray(data?.payload)) {
        notices = data.payload.map((n: any, i: number) => ({
          id: i + 1,
          title: n.title,
          subtitle: n.label_title,
          author: n.staff,
          color: n.colour,
          labelId: n.label,
          content: n.contents
        }));
      } else {
        notices = [];
      }
    } catch (e) {
      error = 'Failed to load notices.';
      notices = [];
    } finally {
      loading = false;
    }
  }

  function updateDate(event: Event) {
    const input = event.target as HTMLInputElement;
    selectedDate = new Date(input.value);
    fetchNotices();
  }

  onMount(async () => {
    await Promise.all([fetchLabels(), fetchNotices()]);
  });

  // Get color for a notice from the label
  function getLabelColor(labelId: number): string {
    return labels.find(l => l.id === labelId)?.color || '#910048';
  }
  function getLabelTitle(labelId: number): string {
    return labels.find(l => l.id === labelId)?.title || '';
  }

  // Luminance check for text color
  function isColorDark(hex: string): boolean {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminance < 0.5;
  }
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Notices</h1>
    <div class="flex items-center gap-4">
      <input
        type="date"
        value={formatDate(selectedDate)}
        on:change={updateDate}
        class="px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>

  <!-- Label filter bar -->
  {#if labels.length > 0}
    <div class="flex flex-wrap gap-2 mb-6 bg-white/5 rounded-lg p-2">
      <button
        class="px-4 py-1.5 rounded-lg font-semibold text-sm border border-[var(--surface-alt)] bg-[var(--surface)] hover:bg-[var(--surface-alt)] transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-400"
        on:click={() => selectedLabel = null}
        class:selected={!selectedLabel}
      >
        All
      </button>
      {#each labels as label}
        <button
          class="px-4 py-1.5 rounded-lg font-semibold text-sm border border-[var(--surface-alt)] transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-400"
          style={`color: ${label.color}; border-color: ${label.color}; background: ${selectedLabel === label.id ? label.color + '22' : 'var(--surface)'}`}
          on:click={() => selectedLabel = label.id}
        >
          {label.title}
        </button>
      {/each}
    </div>
  {/if}

  {#if loading}
    <div class="p-8 text-center text-[var(--text-muted)]">Loading notices...</div>
  {:else if error}
    <div class="p-8 text-center text-red-500">{error}</div>
  {:else}
    <div class="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {#each notices.filter(n => !selectedLabel || n.labelId === selectedLabel) as notice}
        <div class="rounded-xl shadow-lg bg-white/10 text-[var(--text)] border-t-8 flex flex-col h-96" style={`border-top-color: ${getLabelColor(notice.labelId)}; border-top-width: 8px;`}> 
          <div class="p-5 flex-1 flex flex-col overflow-y-auto">
            <h2 class="text-2xl font-bold mb-1">{notice.title}</h2>
            <div class="font-semibold text-sm mb-1" style={`color: ${getLabelColor(notice.labelId)}`}
              class:text-white={isColorDark(getLabelColor(notice.labelId))}
            >{getLabelTitle(notice.labelId)}</div>
            <div class="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">{notice.author}</div>
            <div class="text-base flex-1">{@html notice.content}</div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div> 