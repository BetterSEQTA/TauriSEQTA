<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';
  import { cache } from '../../utils/cache';
  import { saveAs } from 'file-saver';
  import jsPDF from 'jspdf';
  import autoTable from 'jspdf-autotable';
  import * as pdfjsLib from 'pdfjs-dist';
  import Modal from '$lib/components/Modal.svelte';
  import { Icon, ArrowDownTray, DocumentText, TableCells } from 'svelte-hero-icons';
  import { fly } from 'svelte/transition';

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const studentId = 69;

  let weekStart: Date = getMonday(new Date());
  let lessons = $state<any[]>([]);
  let lessonColours = $state<any[]>([]);
  let loadingLessons = $state<boolean>(true);
  let error = $state<string | null>(null);
  let showExportMenu = $state(false);
  let selectedDay = $state<number>(
    Math.min(5, Math.max(1, new Date().getDay() === 0 ? 1 : new Date().getDay())),
  );
  let showPdfViewer = $state(false);
  let pdfUrl = $state<string | null>(null);
  let pdfLoading = $state(false);

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  function getMonday(d: Date) {
    d = new Date(d);
    const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function loadLessonColours() {
    const cachedColours = cache.get<any[]>('lesson_colours');
    if (cachedColours) {
      lessonColours = cachedColours;
      return lessonColours;
    }

    const res = await seqtaFetch('/seqta/student/load/prefs?', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: { request: 'userPrefs', asArray: true, user: studentId },
    });
    lessonColours = JSON.parse(res).payload;

    cache.set('lesson_colours', lessonColours, 30);
    return lessonColours;
  }

  async function loadLessons() {
    loadingLessons = true;
    error = null;
    const from = formatDate(weekStart);
    const until = formatDate(new Date(weekStart.getTime() + 4 * 86400000));

    try {
      const cacheKey = `timetable_${from}_${until}`;
      const cachedLessons = cache.get<any[]>(cacheKey);
      if (cachedLessons) {
        lessons = cachedLessons;
        loadingLessons = false;
        return;
      }

      const res = await seqtaFetch('/seqta/student/load/timetable?', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { from, until, student: studentId },
      });
      const colours = await loadLessonColours();
      lessons = JSON.parse(res).payload.items.map((lesson: any) => {
        const colourPrefName = `timetable.subject.colour.${lesson.code}`;
        const subjectColour = colours.find((c: any) => c.name === colourPrefName);
        lesson.colour = subjectColour ? `${subjectColour.value}` : `#232428`;
        lesson.from = lesson.from.substring(0, 5);
        lesson.until = lesson.until.substring(0, 5);
        lesson.dayIdx = (new Date(lesson.date).getDay() + 6) % 7;
        return lesson;
      });

      cache.set(cacheKey, lessons, 30);
    } catch (e) {
      error = 'Failed to load timetable. Please try again.';
      console.error('Error loading timetable:', e);
    } finally {
      loadingLessons = false;
    }
  }

  function prevWeek() {
    weekStart = new Date(weekStart.valueOf() - 7 * 86400000);
    loadLessons();
  }
  function nextWeek() {
    weekStart = new Date(weekStart.valueOf() + 7 * 86400000);
    loadLessons();
  }

  function getLessonsFor(dayIdx: number) {
    return lessons.filter((l) => l.dayIdx === dayIdx).sort((a, b) => a.from.localeCompare(b.from));
  }

  function weekRangeLabel() {
    const end = new Date(weekStart.valueOf() + 4 * 86400000);
    return `${weekStart.getDate()} ${weekStart.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })} ${weekStart.getFullYear()}`;
  }

  function hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((x) => x + x)
        .join('');
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function isColorLight(hex: string) {
    const [r, g, b] = hexToRgb(hex);

    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  function getUniqueTimes() {
    const times = Array.from(new Set(lessons.map((l) => l.from)));
    return times.sort((a, b) => a.localeCompare(b));
  }

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function getTimeBounds() {
    if (!lessons.length) return { min: 8 * 60, max: 16 * 60 };
    const allTimes = lessons.flatMap((l) => [timeToMinutes(l.from), timeToMinutes(l.until)]);
    return {
      min: Math.min(...allTimes),
      max: Math.max(...allTimes),
    };
  }

  const GRID_HEIGHT = 800;
  function timeToY(time: number, min: number, max: number): number {
    return ((time - min) / (max - min)) * GRID_HEIGHT;
  }

  const timeBounds = $derived(getTimeBounds);

  function exportTimetableCSV() {
    const header = ['Day', 'Subject', 'Code', 'From', 'Until', 'Room', 'Teacher'];
    const sortedLessons = [...lessons].sort(
      (a, b) => a.dayIdx - b.dayIdx || a.from.localeCompare(b.from),
    );
    const rows = sortedLessons.map((l) => [
      new Date(l.date).toLocaleDateString('en-AU', { weekday: 'long' }),
      l.description || '',
      l.code || '',
      l.from,
      l.until,
      l.room || '',
      l.staff || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'timetable.csv');
  }

  async function exportTimetablePDF() {
    pdfLoading = true;
    const doc = new jsPDF();
    const header = ['Day', 'Subject', 'Code', 'From', 'Until', 'Room', 'Teacher'];
    const sortedLessons = [...lessons].sort(
      (a, b) => a.dayIdx - b.dayIdx || a.from.localeCompare(b.from),
    );
    const rows = sortedLessons.map((l) => [
      new Date(l.date).toLocaleDateString('en-AU', { weekday: 'long' }),
      l.description || '',
      l.code || '',
      l.from,
      l.until,
      l.room || '',
      l.staff || '',
    ]);
    doc.text('Weekly Timetable', 14, 16);
    autoTable(doc, {
      head: [header],
      body: rows,
      startY: 22,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    pdfUrl = url;
    showPdfViewer = true;
    pdfLoading = false;
  }

  function prevDay() {
    selectedDay = selectedDay === 1 ? 5 : selectedDay - 1;
  }

  function nextDay() {
    selectedDay = selectedDay === 5 ? 1 : selectedDay + 1;
  }

  function handleExportClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.export-dropdown-container')) {
      showExportMenu = false;
    }
  }

  onMount(() => {
    loadLessons();
    document.addEventListener('click', handleExportClickOutside);

    return () => {
      document.removeEventListener('click', handleExportClickOutside);
    };
  });
</script>

<div class="flex flex-col w-full h-full text-slate-900 dark:text-slate-50">
  <div class="flex justify-between items-center px-4 py-2 shadow bg-slate-100 dark:bg-slate-800">
    <div class="flex gap-2 items-center">
      <button
        class="flex justify-center items-center w-8 h-8 rounded-full transition-transform duration-300 hover:bg-slate-200 dark:hover:bg-slate-950/40 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={prevWeek}
        disabled={loadingLessons}>&#60;</button>
      <span class="text-lg font-bold">{weekRangeLabel()}</span>
      <button
        class="flex justify-center items-center w-8 h-8 rounded-full transition-transform duration-300 hover:bg-slate-200 dark:hover:bg-slate-950/40 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={nextWeek}
        disabled={loadingLessons}>&#62;</button>
    </div>
    <div class="inline-block relative text-left export-dropdown-container">
      <button
        class="flex gap-2 items-center px-4 py-2 rounded-xl border transition-all duration-200 bg-white/60 border-slate-200/70 hover:bg-white/80 dark:bg-slate-700/60 dark:border-slate-700/40 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
        onclick={() => (showExportMenu = !showExportMenu)}
        aria-label="Export options">
        <Icon src={ArrowDownTray} class="w-4 h-4 text-slate-700 dark:text-slate-300" />
        <span class="font-medium text-slate-900 dark:text-white">Export</span>
      </button>
      {#if showExportMenu}
        <div
          class="absolute right-0 z-50 mt-3 w-56 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/95 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-700/40"
          transition:fly={{ y: -8, duration: 200, opacity: 0 }}>
          <div class="p-2">
            <button
              class="flex gap-3 items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/50 group"
              onclick={() => {
                showExportMenu = false;
                exportTimetableCSV();
              }}>
              <div
                class="flex justify-center items-center w-8 h-8 rounded-lg transition-colors bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-700/50 dark:group-hover:bg-slate-700">
                <Icon src={TableCells} class="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div class="flex-1">
                <div class="font-medium">Export as CSV</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Spreadsheet format</div>
              </div>
            </button>

            <button
              class="flex gap-3 items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/50 group"
              onclick={() => {
                showExportMenu = false;
                exportTimetablePDF();
              }}>
              <div
                class="flex justify-center items-center w-8 h-8 rounded-lg transition-colors bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-700/50 dark:group-hover:bg-slate-700">
                <Icon src={DocumentText} class="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div class="flex-1">
                <div class="font-medium">Export as PDF</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Portable document</div>
              </div>
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex overflow-hidden flex-1 items-stretch">
    <div class="flex flex-col flex-1 w-full min-h-0 justify-stretch">
      <!-- Header Row -->
      <div
        class="grid grid-cols-[60px_repeat(5,1fr)] w-full border-b-2 border-slate-300 dark:border-slate-800">
        <div class="w-14 bg-slate-100 dark:bg-slate-800"></div>
        {#each dayLabels as day, index}
          <div
            class="py-3 px-2 text-center font-semibold bg-slate-100 dark:bg-slate-800 border-l border-slate-300 dark:border-slate-900 text-base text-slate-900 dark:text-white/80 {new Date().getDay() ===
            index + (1 % 7)
              ? 'bg-blue-500 text-slate-800 dark:text-white font-bold'
              : ''} hidden sm:block">
            {day}
          </div>
        {/each}
      </div>

      <!-- Mobile Day Navigation -->
      <div
        class="flex justify-between items-center px-4 py-2 border-b border-slate-300 sm:hidden bg-slate-100/50 dark:bg-slate-800/50 dark:border-slate-800">
        <button
          class="flex justify-center items-center w-8 h-8 rounded-full transition-transform duration-300 hover:bg-slate-200 dark:hover:bg-slate-950/40 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={prevDay}
          disabled={loadingLessons}>&#60;</button>
        <span class="text-base font-bold">{dayLabels[selectedDay - 1].toUpperCase()}</span>
        <button
          class="flex justify-center items-center w-8 h-8 rounded-full transition-transform duration-300 hover:bg-slate-200 dark:hover:bg-slate-950/40 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={nextDay}
          disabled={loadingLessons}>&#62;</button>
      </div>

      <!-- Time grid and lessons -->
      {#if error}
        <div class="flex flex-col justify-center items-center py-16">
          <div
            class="w-16 h-16 rounded-full border-4 animate-spin border-red-500/30 border-t-red-500">
          </div>
          <p class="mt-4 text-red-400">{error}</p>
          <button
            class="px-4 py-2 mt-4 text-sm font-medium bg-red-600 rounded-lg transition-colors hover:bg-red-500"
            onclick={loadLessons}>
            Retry
          </button>
        </div>
      {:else if loadingLessons}
        <div class="flex flex-col justify-center items-center py-16">
          <div
            class="w-16 h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500">
          </div>
          <p class="mt-4 text-slate-600 dark:text-slate-400">Loading timetable...</p>
        </div>
      {:else if lessons.length}
        <div class="overflow-y-auto relative flex-1 w-full min-h-0">
          <div class="relative w-full" style="height: {GRID_HEIGHT}px;">
            <!-- Time labels -->
            <div class="absolute top-0 left-0 z-10 w-14 h-full pointer-events-none">
              {#each getUniqueTimes() as time}
                <div
                  class="absolute left-0 w-full border-t border-slate-300 dark:border-slate-800"
                  style="top: {timeToY(
                    timeToMinutes(time),
                    timeBounds().min,
                    timeBounds().max,
                  )}px;">
                  <span class="text-xs text-slate-600 dark:text-slate-400">{time}</span>
                </div>
              {/each}
            </div>
            <!-- Day columns -->
            <div class="grid absolute top-0 right-0 left-14 grid-cols-1 h-full sm:grid-cols-5">
              {#each Array(5) as _, dayIdx}
                <div
                  class="relative h-full border-l border-slate-300 dark:border-slate-800 {dayIdx +
                    1 !==
                  selectedDay
                    ? 'hidden sm:block'
                    : ''}">
                  {#each getLessonsFor(dayIdx) as lesson}
                    <div
                      class="flex absolute right-1 left-1 flex-col justify-center p-2 bg-white rounded-lg border-l-4 shadow-sm dark:bg-slate-800"
                      style="
                      top: {timeToY(
                        timeToMinutes(lesson.from),
                        timeBounds().min,
                        timeBounds().max,
                      )}px;
                      height: {timeToY(
                        timeToMinutes(lesson.until),
                        timeBounds().min,
                        timeBounds().max,
                      ) -
                        timeToY(timeToMinutes(lesson.from), timeBounds().min, timeBounds().max)}px;
                      border-color: {lesson.colour};
                    ">
                      <span class="text-sm font-bold truncate">{lesson.description}</span>
                      <span class="text-xs truncate text-slate-600 dark:text-slate-400"
                        >{lesson.staff}</span>
                      <span class="text-xs truncate text-slate-600 dark:text-slate-400"
                        >{lesson.room}</span>
                      {#if lesson.attendanceTitle && lesson.attendanceTitle.trim()}
                        <span class="text-xs italic truncate text-slate-600 dark:text-slate-400"
                          >{lesson.attendanceTitle}</span>
                      {/if}
                      <span class="mt-1 font-mono text-xs">{lesson.from} - {lesson.until}</span>
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="flex flex-col justify-center items-center py-16">
          <div
            class="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient">
            📚
          </div>
          <p class="mt-4 text-xl text-slate-700 dark:text-slate-300">
            No lessons available for this week.
          </p>
        </div>
      {/if}
    </div>
  </div>

  <Modal
    bind:open={showPdfViewer}
    onclose={() => {
      showPdfViewer = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        pdfUrl = null;
      }
    }}
    maxWidth="max-w-4xl"
    customClasses="min-h-[80vh]"
    title="Timetable PDF"
    ariaLabel="Timetable PDF Viewer">
    <div class="absolute top-6 right-6 z-10 pr-12 pointer-events-none">
      <button
        class="flex justify-center items-center w-10 h-10 rounded-xl transition-all duration-200 pointer-events-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        onclick={() => {
          if (pdfUrl) {
            saveAs(pdfUrl, 'timetable.pdf');
          }
        }}
        aria-label="Download">
        <Icon src={ArrowDownTray} class="w-5 h-5 text-slate-700 dark:text-slate-300" />
      </button>
    </div>

    <div class="overflow-hidden h-full">
      {#if pdfLoading}
        <div class="flex justify-center items-center h-full">
          <div
            class="w-16 h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500">
          </div>
        </div>
      {:else if pdfUrl}
        <iframe src={pdfUrl} class="w-full min-h-[80vh]" title="Timetable PDF"></iframe>
      {/if}
    </div>
  </Modal>
</div>
