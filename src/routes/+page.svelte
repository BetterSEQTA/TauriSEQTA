<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import Modal from '$lib/components/Modal.svelte';
  import TodaySchedule from '$lib/components/TodaySchedule.svelte';
  import NoticesPane from '$lib/components/NoticesPane.svelte';
  import UpcomingAssessments from '$lib/components/UpcomingAssessments.svelte';
  import WelcomePortal from '$lib/components/WelcomePortal.svelte';
  import TodoList from '$lib/components/TodoList.svelte';
  import FocusTimer from '$lib/components/FocusTimer.svelte';
  import Homework from '$lib/components/Homework.svelte';

  let currentSelectedDate: Date = new Date();
  let lessons = $state<any[]>([]);

  let lessonInterval: ReturnType<typeof setInterval> | null = null;

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

  let showPortalModal = $state(false);
  let portalUrl = $state<string>('');

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

  async function loadHomepageShortcuts() {
    try {
      const settings = await invoke<{ shortcuts: Shortcut[] }>('get_settings');
      if (settings.shortcuts && settings.shortcuts.length > 0) {
        homepageShortcuts = settings.shortcuts;
      }
    } catch (e) {}
  }

  function closeModal() {
    showPortalModal = false;
  }

  onMount(async () => {
    await loadHomepageShortcuts();
  });

  onDestroy(() => {
    if (lessonInterval) clearInterval(lessonInterval);
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

    <TodaySchedule />
    <NoticesPane />
    <UpcomingAssessments />
    <WelcomePortal />

    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div class="space-y-8">
        <Homework />
        <TodoList />
      </div>
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