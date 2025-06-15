<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { seqtaFetch } from '../utils/netUtil';
  import { cache } from '../utils/cache';
  import {
    Icon,
    ChevronLeft,
    ChevronRight,
    AcademicCap,
    Clock,
    DocumentText,
    BookOpen,
    BuildingOffice,
    ArrowTopRightOnSquare,
    XMark,
  } from 'svelte-hero-icons';
  import Modal from '$lib/components/Modal.svelte';
  import TodaySchedule from '$lib/components/TodaySchedule.svelte';
  import NoticesPane from '$lib/components/NoticesPane.svelte';
  import UpcomingAssessments from '$lib/components/UpcomingAssessments.svelte';
  import WelcomePortal from '$lib/components/WelcomePortal.svelte';
  import TodoList from '$lib/components/TodoList.svelte';
  import FocusTimer from '$lib/components/FocusTimer.svelte';
  import Homework from '$lib/components/Homework.svelte';

  const studentId = 69; //! literally changes nothing but was used in the original seqta code.

  let currentSelectedDate: Date = new Date();

  let lessons = $state<any[]>([]);
  let lessonColours = $state<any[]>([]);
  let notices = $state<any[]>([]);

  let loadingLessons = $state<boolean>(true);
  let loadingNotices = $state<boolean>(true);

  let lessonInterval: ReturnType<typeof setInterval> | null = null;

  let homepageNotices = $state<any[]>([]);
  let homepageLabels = $state<any[]>([]);
  let loadingHomepageNotices = $state(true);

  interface Shortcut {
    name: string;
    icon: string;
    url: string;
  }

  let homepageShortcuts = $state<Shortcut[]>([
    { name: 'Outlook', icon: '📅', url: 'https://outlook.office.com' },
    { name: 'Office365', icon: '🏢', url: 'https://office365.com' },
    { name: 'Google', icon: '🌐', url: 'https://google.com' },
  ]);

  let weatherEnabled = $state(false);
  let weatherLocation = $state('');
  let weatherData: any = $state(null);
  let loadingWeather = $state(false);
  let weatherError = $state('');

  let selectedTab = $state<'list' | 'board'>('list');
  let showPortalModal = $state(false);

  let portalUrl = $state<string>('');
  let loadingPortal = $state<boolean>(true);
  let portalError = $state<string>('');

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function loadLessonColours() {
    if (lessonColours.length) return lessonColours;
    const res = await seqtaFetch('/seqta/student/load/prefs?', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: { request: 'userPrefs', asArray: true, user: studentId },
    });
    lessonColours = JSON.parse(res).payload;
    return lessonColours;
  }

  async function loadLessons() {
    loadingLessons = true;
    const dateStr = formatDate(currentSelectedDate);

    const res = await seqtaFetch('/seqta/student/load/timetable?', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { from: dateStr, until: dateStr, student: studentId },
    });

    const colours = await loadLessonColours();

    lessons = JSON.parse(res)
      .payload.items.sort((a: any, b: any) => a.from.localeCompare(b.from))
      .map((lesson: any) => {
        const colourPrefName = `timetable.subject.colour.${lesson.code}`;
        const subjectColour = colours.find((c: any) => c.name === colourPrefName);

        lesson.colour = subjectColour ? `${subjectColour.value}` : `transparent`;

        lesson.from = lesson.from.substring(0, 5);
        lesson.until = lesson.until.substring(0, 5);

        lesson.attendanceTitle = lesson.attendance ? lesson.attendance.label : ' ';
        return lesson;
      });

    loadingLessons = false;

    if (lessonInterval) clearInterval(lessonInterval);
    checkCurrentLessons();
    lessonInterval = setInterval(checkCurrentLessons, 60_000);
  }

  function checkCurrentLessons() {
    const now = new Date();
    lessons = lessons.map((l: any) => {
      const [sh, sm] = l.from.split(':').map(Number);
      const [eh, em] = l.until.split(':').map(Number);

      const start = new Date(currentSelectedDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(currentSelectedDate);
      end.setHours(eh, em, 0, 0);

      l.active =
        now >= start && now <= end && now.toDateString() === currentSelectedDate.toDateString();
      return l;
    });
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

  async function loadHomepageShortcuts() {
    try {
      const settings = await invoke<{ shortcuts: Shortcut[] }>('get_settings');
      if (settings.shortcuts && settings.shortcuts.length > 0) {
        homepageShortcuts = settings.shortcuts;
      }
    } catch (e) {}
  }

  async function loadWeatherSettings() {
    try {
      const settings = await invoke<{
        weather_enabled: boolean;
        weather_location: string;
      }>('get_settings');
      weatherEnabled = settings.weather_enabled ?? false;
      weatherLocation = settings.weather_location ?? '';
    } catch (e) {
      weatherEnabled = false;
      weatherLocation = '';
    }
  }

  async function fetchWeather() {
    if (!weatherEnabled || !weatherLocation) {
      weatherData = null;
      return;
    }
    loadingWeather = true;
    weatherError = '';
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLocation)}&count=1&language=en&format=json`,
      );
      const geoJson = await geoRes.json();
      if (!geoJson.results || !geoJson.results.length) throw new Error('Location not found');
      const { latitude, longitude, name, country } = geoJson.results[0];

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
      );
      const weatherJson = await weatherRes.json();
      weatherData = {
        ...weatherJson.current_weather,
        location: name,
        country,
      };
    } catch (e) {
      weatherError = 'Failed to load weather.';
      weatherData = null;
    } finally {
      loadingWeather = false;
    }
  }

  function closeModal() {
    showPortalModal = false;
  }

  onMount(async () => {
    await Promise.all([
      loadHomepageShortcuts(),
      loadWeatherSettings(),
    ]);
    if (weatherEnabled && weatherLocation) fetchWeather();
  });

  onDestroy(() => {
    if (lessonInterval) clearInterval(lessonInterval);
  });

  function lessonsSubtitle() {
    const today = new Date();
    const diff = ~~((today.getTime() - currentSelectedDate.getTime()) / 86_400_000);
    if (diff === 0) return "Today's Lessons";
    if (diff === -1) return "Tomorrow's Lessons";
    if (diff === 1) return "Yesterday's Lessons";
    return currentSelectedDate.toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }

  $effect(() => {
    if (weatherEnabled && weatherLocation) fetchWeather();
  });
</script>

<div class="p-8 mx-auto min-h-screen">
  <div class="space-y-8">
    <!-- Shortcuts Section -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
      {#each homepageShortcuts as shortcut}
        <a
          href={shortcut.url}
          target="_blank"
          rel="noopener noreferrer"
          class="flex relative flex-col justify-center items-center p-6 rounded-2xl border shadow-sm transition-all duration-200 cursor-pointer border-slate-200 group bg-white/80 dark:bg-slate-900/60 dark:border-slate-800 hover:accent-bg hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 accent-ring"
          tabindex="0"
          aria-label={shortcut.name}>
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

    <!-- Today's Schedule Section -->
    <TodaySchedule />

    <!-- Notices Section -->
    <NoticesPane />

    <!-- Upcoming Assessments -->
    <UpcomingAssessments />

    <!-- Welcome Portal Window -->
    <WelcomePortal />

    <!-- Dashboard Grid -->
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- Left Column: Homework and Todo List -->
      <div class="space-y-8">
        <!-- Homework Section -->
        <Homework />

        <!-- Todo List Section -->
        <TodoList />
      </div>

      <!-- Right Column: Timer -->
      <FocusTimer />
        </div>
  </div>
</div>

<Modal
  bind:open={showPortalModal}
  onclose={closeModal}
  maxWidth="w-[80%]"
  maxHeight="h-[80%]"
  customClasses="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
  ariaLabel="Welcome Portal Modal">
  {#if portalUrl}
    <iframe src={portalUrl} class="w-full h-full rounded-2xl border-0" title="Welcome Portal"
    ></iframe>
  {/if}
</Modal>

<style>
  @keyframes gradient-shift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient-shift 8s ease infinite;
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-fade-out {
    animation: fade-out 0.2s ease-out;
  }
</style>
