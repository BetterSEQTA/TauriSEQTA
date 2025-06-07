<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { seqtaFetch } from "../utils/netUtil";
  import { cache } from "../utils/cache";
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
  } from "svelte-hero-icons";

  const studentId = 69; //! literally changes nothing but was used in the original seqta code.

  let currentSelectedDate: Date = new Date();

  let lessons = $state<any[]>([]);
  let lessonColours = $state<any[]>([]);
  let upcomingAssessments = $state<any[]>([]);
  let activeSubjects = $state<any[]>([]);
  let notices = $state<any[]>([]);

  let subjectFilters = $state<Record<string, boolean>>({});

  let loadingLessons = $state<boolean>(true);
  let loadingAssessments = $state<boolean>(true);
  let loadingNotices = $state<boolean>(true);

  const filteredAssessments = $derived(
    upcomingAssessments.filter((a: any) => subjectFilters[a.code])
  );

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
    { name: "Outlook", icon: "📅", url: "https://outlook.office.com" },
    { name: "Office365", icon: "🏢", url: "https://office365.com" },
    { name: "Google", icon: "🌐", url: "https://google.com" },
  ]);

  let weatherEnabled = $state(false);
  let weatherLocation = $state("");
  let weatherData: any = $state(null);
  let loadingWeather = $state(false);
  let weatherError = $state("");

  let selectedTab = $state<'list' | 'board'>('list');

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async function loadLessonColours() {
    if (lessonColours.length) return lessonColours;
    const res = await seqtaFetch("/seqta/student/load/prefs?", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: { request: "userPrefs", asArray: true, user: studentId },
    });
    lessonColours = JSON.parse(res).payload;
    return lessonColours;
  }

  async function loadLessons() {
    loadingLessons = true;
    const dateStr = formatDate(currentSelectedDate);

    const res = await seqtaFetch("/seqta/student/load/timetable?", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { from: dateStr, until: dateStr, student: studentId },
    });

    const colours = await loadLessonColours();

    lessons = JSON.parse(res)
      .payload.items.sort((a: any, b: any) => a.from.localeCompare(b.from))
      .map((lesson: any) => {
        const colourPrefName = `timetable.subject.colour.${lesson.code}`;
        const subjectColour = colours.find(
          (c: any) => c.name === colourPrefName
        );

        lesson.colour = subjectColour
          ? `${subjectColour.value}`
          : `transparent`;

        lesson.from = lesson.from.substring(0, 5);
        lesson.until = lesson.until.substring(0, 5);

        lesson.attendanceTitle = lesson.attendance
          ? lesson.attendance.label
          : " ";
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
      const [sh, sm] = l.from.split(":").map(Number);
      const [eh, em] = l.until.split(":").map(Number);

      const start = new Date(currentSelectedDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(currentSelectedDate);
      end.setHours(eh, em, 0, 0);

      l.active =
        now >= start &&
        now <= end &&
        now.toDateString() === currentSelectedDate.toDateString();
      return l;
    });
  }

  async function loadAssessments() {
    loadingAssessments = true;

    try {
      // Check cache first
      const cachedData = cache.get<{
        assessments: any[];
        subjects: any[];
        filters: Record<string, boolean>;
      }>('upcoming_assessments_data');
      
      if (cachedData) {
        upcomingAssessments = cachedData.assessments;
        activeSubjects = cachedData.subjects;
        subjectFilters = cachedData.filters;
        loadingAssessments = false;
        return;
      }

      const [assessmentsRes, classesRes] = await Promise.all([
        seqtaFetch("/seqta/student/assessment/list/upcoming?", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: { student: studentId },
        }),
        seqtaFetch("/seqta/student/load/subjects?", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: {},
        }),
      ]);

      const colours = await loadLessonColours();

      const classesResJson = JSON.parse(classesRes);
      const activeClass = classesResJson.payload.find((c: any) => c.active);
      activeSubjects = activeClass ? activeClass.subjects : [];

      activeSubjects.forEach((s: any) => {
        if (!(s.code in subjectFilters)) subjectFilters[s.code] = true;
      });

      const activeCodes = activeSubjects.map((s: any) => s.code);

      upcomingAssessments = JSON.parse(assessmentsRes)
        .payload.filter((a: any) => activeCodes.includes(a.code))
        .filter((a: any) => new Date(a.due) >= new Date())
        .map((a: any) => {
          const prefName = `timetable.subject.colour.${a.code}`;
          const c = colours.find((p: any) => p.name === prefName);
          a.colour = c ? c.value : "#8e8e8e";
          return a;
        })
        .sort((a: any, b: any) => (a.due < b.due ? -1 : 1));

      // Cache all the data for 1 hour
      cache.set('upcoming_assessments_data', {
        assessments: upcomingAssessments,
        subjects: activeSubjects,
        filters: subjectFilters
      }, 60);
    } catch (e) {
      console.error('Error loading assessments:', e);
    } finally {
      loadingAssessments = false;
    }
  }

  async function loadNotices(dateStr: string) {
    loadingNotices = true;

    const prefsRes = await seqtaFetch("/seqta/student/load/prefs?", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { asArray: true, request: "userPrefs" },
    });

    const prefsResJson = JSON.parse(prefsRes);
    const filters = prefsResJson.payload.find(
      (p: any) => p.name === "notices.filters"
    );
    const labelArray = filters ? filters.value.split(" ") : [];

    const res = await seqtaFetch("/seqta/student/load/notices?", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { date: dateStr },
    });

    notices = res.payload?.filter((n: any) =>
      labelArray.includes(JSON.stringify(n.label))
    );
    loadingNotices = false;
  }

  function prevDay() {
    currentSelectedDate = new Date(currentSelectedDate.valueOf() - 86_400_000);
    loadLessons();
  }

  function nextDay() {
    currentSelectedDate = new Date(currentSelectedDate.valueOf() + 86_400_000);
    loadLessons();
  }

  function buildAssessmentURL(
    programmeID: number,
    metaID: number,
    itemID?: number
  ) {
    const base = `../#?page=/assessments/${programmeID}:${metaID}`;
    return itemID ? `${base}&item=${itemID}` : base;
  }

  function getStatusBadge(status: string, due: string) {
    const dueDate = new Date(due);
    const now = new Date();

    if (status === "MARKS_RELEASED") {
      return { text: "Marked", color: "bg-green-500" };
    } else if (dueDate < now) {
      return { text: "Overdue", color: "bg-red-500" };
    } else if (dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return { text: "Due Soon", color: "bg-yellow-500" };
    } else {
      return { text: "Upcoming", color: "bg-blue-500" };
    }
  }

  async function fetchHomepageLabels() {
    const response = await seqtaFetch("/seqta/student/load/notices?", {
      method: "POST",
      body: { mode: "labels" },
    });
    const data = typeof response === "string" ? JSON.parse(response) : response;
    homepageLabels = Array.isArray(data?.payload) ? data.payload : [];
  }

  async function fetchHomepageNotices() {
    loadingHomepageNotices = true;
    const response = await seqtaFetch("/seqta/student/load/notices?", {
      method: "POST",
      body: { date: formatDate(new Date()) },
    });
    const data = typeof response === "string" ? JSON.parse(response) : response;
    homepageNotices = Array.isArray(data?.payload)
      ? data.payload.slice(0, 50)
      : [];
    loadingHomepageNotices = false;
  }

  function getHomepageLabelColor(labelId: number): string {
    return homepageLabels.find((l) => l.id === labelId)?.colour || "#910048";
  }
  function getHomepageLabelTitle(labelId: number): string {
    return homepageLabels.find((l) => l.id === labelId)?.title || "";
  }

  async function loadHomepageShortcuts() {
    try {
      const settings = await invoke<{ shortcuts: Shortcut[] }>("get_settings");
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
      }>("get_settings");
      weatherEnabled = settings.weather_enabled ?? false;
      weatherLocation = settings.weather_location ?? "";
    } catch (e) {
      weatherEnabled = false;
      weatherLocation = "";
    }
  }

  async function fetchWeather() {
    if (!weatherEnabled || !weatherLocation) {
      weatherData = null;
      return;
    }
    loadingWeather = true;
    weatherError = "";
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherLocation)}&count=1&language=en&format=json`
      );
      const geoJson = await geoRes.json();
      if (!geoJson.results || !geoJson.results.length)
        throw new Error("Location not found");
      const { latitude, longitude, name, country } = geoJson.results[0];

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
      );
      const weatherJson = await weatherRes.json();
      weatherData = {
        ...weatherJson.current_weather,
        location: name,
        country,
      };
    } catch (e) {
      weatherError = "Failed to load weather.";
      weatherData = null;
    } finally {
      loadingWeather = false;
    }
  }

  onMount(async () => {
    await Promise.all([
      loadLessons(),
      loadAssessments(),
      loadNotices(formatDate(new Date())),
      fetchHomepageLabels(),
      fetchHomepageNotices(),
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
    const diff = ~~(
      (today.getTime() - currentSelectedDate.getTime()) /
      86_400_000
    );
    if (diff === 0) return "Today's Lessons";
    if (diff === -1) return "Tomorrow's Lessons";
    if (diff === 1) return "Yesterday's Lessons";
    return currentSelectedDate.toLocaleDateString("en-AU", {
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }

  $effect(() => {
    if (weatherEnabled && weatherLocation) fetchWeather();
  });
</script>

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

	.animate-gradient {
		background-size: 200% 200%;
		animation: gradient-shift 8s ease infinite;
	}
</style>

<div
  class="p-8 mx-auto max-w-7xl min-h-screen bg-gradient-to-br from-slate-950 to-slate-900"
>
  <div class="space-y-8">
    <!-- Shortcuts Section -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {#each homepageShortcuts as shortcut}
        <a
          href={shortcut.url}
          target="_blank"
          rel="noopener noreferrer"
          class="group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-700/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div
            class="relative flex justify-center items-center w-12 h-12 sm:w-14 sm:h-14 mb-3 text-2xl sm:text-3xl text-white bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg animate-gradient"
          >
            {shortcut.icon}
          </div>
          <span
            class="relative text-sm sm:text-base font-medium text-white transition-colors group-hover:text-indigo-200 text-center"
            >{shortcut.name}</span
          >
        </a>
      {/each}
    </div>

    <!-- Today's Lessons Section -->
    <div
      class="overflow-hidden rounded-2xl border shadow-xl backdrop-blur-sm bg-slate-800/30 border-slate-700/50"
    >
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-3 sm:px-4 py-3 bg-gradient-to-r border-b border-slate-700/50 from-slate-800/70 to-slate-800/30"
      >
        <span class="text-xl font-semibold text-white">{lessonsSubtitle()}</span>
        <div class="flex gap-3">
          <button
            onclick={prevDay}
            class="flex justify-center items-center w-9 h-9 rounded-full transition-all duration-300 hover:accent-bg-hover text-slate-400 hover:text-white border border-slate-700/50 hover:accent-border hover:accent-shadow"
          >
            <Icon src={ChevronLeft} class="w-5 h-5" />
          </button>
          <button
            onclick={nextDay}
            class="flex justify-center items-center w-9 h-9 rounded-full transition-all duration-300 hover:accent-bg-hover text-slate-400 hover:text-white border border-slate-700/50 hover:accent-border hover:accent-shadow"
          >
            <Icon src={ChevronRight} class="w-5 h-5" />
          </button>
        </div>
      </div>

      {#if loadingLessons}
        <div class="flex flex-col justify-center items-center py-16">
          <div
            class="w-16 h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"
          ></div>
          <p class="mt-4 text-slate-400">Loading your schedule...</p>
        </div>
      {:else if lessons.length === 0}
        <div class="flex flex-col sm:flex-row gap-6 sm:gap-12 justify-center items-center px-4 sm:px-14 py-12 sm:py-16 w-full">
          <div
            class="flex justify-center items-center w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-gradient"
          >
            <span class="text-3xl sm:text-5xl">Q</span>
          </div>
          <p class="text-xl sm:text-2xl text-slate-300 text-center">
            No lessons available for this day.
          </p>
        </div>
      {:else}
        <div class="flex overflow-x-scroll">
          {#each lessons as lesson, i}
            <div
              class="relative flex flex-col max-w-xs w-full group border-t-4"
              style="border-color: {lesson.colour}; box-shadow: inset 0px 10px 10px -10px {lesson.colour};"
            >
              <div
                class="flex relative flex-col flex-1 gap-2 p-3 sm:p-4 backdrop-blur-sm"
              >
                <div class="flex justify-between items-center">
                  <span class="text-base sm:text-lg font-bold text-white truncate"
                    >{lesson.description}</span
                  >
                  {#if lesson.active}
                    <span
                      class="px-2.5 py-1 ml-2 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-sm animate-gradient"
                      >Now</span
                    >
                  {/if}
                </div>
                <div class="flex items-center mt-1 text-sm sm:text-base text-slate-300">
                  <Icon
                    src={AcademicCap}
                    class="mr-1.5 w-4 h-4 text-slate-400"
                  />
                  <span class="truncate">{lesson.staff}</span>
                </div>
                <div class="flex items-center text-sm sm:text-base text-slate-300">
                  <Icon
                    src={BuildingOffice}
                    class="mr-1.5 w-4 h-4 text-slate-400"
                  />
                  <span class="truncate">{lesson.room}</span>
                </div>
                <div
                  class="inline-flex items-center px-3 py-1.5 mt-3 font-mono text-sm rounded-lg bg-slate-800/50 w-fit mb-auto"
                >
                  <Icon src={Clock} class="mr-1.5 w-4 h-4 text-indigo-400" />
                  {lesson.from} – {lesson.until}
                </div>
                {#if lesson.attendanceTitle && lesson.attendanceTitle.trim()}
                  <div class="text-xs text-slate-400">
                    {lesson.attendanceTitle}
                  </div>
                {/if}

                {#if lesson.programmeID !== 0}
                  <div class="flex gap-3">
                    <button
                      class="flex justify-center items-center w-9 h-9 rounded-lg border transition-all duration-300 bg-slate-800/70 hover:accent-bg-hover text-slate-300 hover:text-white border-slate-700/50 hover:accent-border"
                      aria-label="View Assessment"
                      onclick={() =>
                        (location.href = `/assessments?code=${lesson.code}&date=${lesson.date}`)}
                    >
                      <Icon src={DocumentText} class="w-5 h-5" />
                    </button>
                    <button
                      class="flex justify-center items-center w-9 h-9 rounded-lg border transition-all duration-300 bg-slate-800/70 hover:accent-bg-hover text-slate-300 hover:text-white border-slate-700/50 hover:accent-border"
                      aria-label="View Course"
                      onclick={() =>
                        (location.href = `/courses?code=${lesson.code}&date=${lesson.date}`)}
                    >
                      <Icon src={BookOpen} class="w-5 h-5" />
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Notices Widget -->
    <div
      class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-slate-800/30 border-slate-700/50"
    >
      <div
        class="flex justify-between items-center px-4 py-3 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border-b border-slate-700/50"
      >
        <h3 class="text-xl font-semibold text-white">Notices</h3>
        <a
          href="/notices"
          class="px-3 py-1.5 text-nowrap text-sm accent-text rounded-lg transition-all duration-300 hover:accent-bg-hover hover:text-white"
        >
          View all
          <Icon src={ArrowTopRightOnSquare} class="inline ml-1 w-4 h-4" />
        </a>
      </div>
      <div
        class="overflow-y-auto px-6 py-4 max-h-80 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-800/10"
      >
        {#if loadingHomepageNotices}
          <div class="py-10 text-center">
            <div
              class="mx-auto w-12 h-12 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"
            ></div>
            <p class="mt-4 text-slate-400">Loading notices...</p>
          </div>
        {:else if homepageNotices.length === 0}
          <div class="py-10 text-center text-slate-400">
            No notices available.
          </div>
        {:else}
          {#each homepageNotices as notice}
            <div
              class="p-4 mb-4 rounded-xl border transition-all duration-300 last:mb-0 bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50 hover:border-slate-600/50"
            >
              <div class="flex gap-2 items-center mb-2">
                <span
                  class="px-2.5 py-1 text-xs font-medium rounded-full animate-gradient"
                  style="background: linear-gradient(135deg, {getHomepageLabelColor(
                    notice.label
                  )}, {getHomepageLabelColor(notice.label)}dd); color: white;"
                >
                  {getHomepageLabelTitle(notice.label)}
                </span>
                <span class="text-xs text-slate-400">{notice.staff}</span>
              </div>
              <div class="mb-2 text-base font-bold text-white">
                {notice.title}
              </div>
              <div class="text-sm text-slate-300 line-clamp-2">
                {@html notice.contents}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Upcoming Assessments -->
    <div
      class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-slate-800/30 border-slate-700/50"
    >
      <div
        class="flex justify-between items-center px-4 py-3 bg-gradient-to-br from-slate-800/70 to-slate-800/30 border-b border-slate-700/50"
      >
        <span class="text-xl font-semibold text-white text-nowrap pr-4"
          >Upcoming Assessments</span
        >
        <div class="flex gap-2 overflow-x-scroll" id="upcoming-filters">
          {#each activeSubjects as subj}
            <label
              class="flex items-center px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-all duration-300 cursor-pointer bg-slate-800/70 border-slate-700/50 hover:border-indigo-500/50"
            >
              <input
                type="checkbox"
                bind:checked={subjectFilters[subj.code]}
                class="mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 rounded form-checkbox border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <span style="color: {subj.colour}">{subj.code}</span>
            </label>
          {/each}
        </div>
      </div>

      {#if loadingAssessments}
        <div class="flex flex-col justify-center items-center py-12 sm:py-16">
          <div
            class="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"
          ></div>
          <p class="mt-4 text-sm sm:text-base text-slate-400">Loading assessments...</p>
        </div>
      {:else if filteredAssessments.length === 0}
        <div class="flex flex-col justify-center items-center py-12 sm:py-16">
          <div
            class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl sm:text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient"
          >
            🎉
          </div>
          <p class="mt-4 text-lg sm:text-xl text-slate-300">Nothing coming up!</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
          {#each filteredAssessments as a}
            <div
              class="flex flex-col gap-4 p-4 sm:p-5 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] relative group"
            >
              <div
                class="absolute inset-0 bg-gradient-to-br rounded-xl opacity-30 animate-gradient"
                style="background: linear-gradient(135deg, {a.colour}20, {a.colour}05);"
              ></div>
              <div
                class="absolute inset-0 rounded-xl border"
                style="border: 1px solid {a.colour}30;"
              ></div>

              <div class="relative z-10 flex items-center gap-4">
                <div
                  class="flex justify-center items-center h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br rounded-xl shadow-lg animate-gradient"
                  style="background: linear-gradient(135deg, {a.colour}, {a.colour}dd);"
                >
                  <span class="text-xl sm:text-2xl">📄</span>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap gap-2 items-center">
                    <div class="text-sm sm:text-base font-bold text-white">
                      {new Date(a.due).toLocaleDateString("en-AU", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <span
                      class="px-2 py-0.5 rounded-full text-xs font-medium text-white shadow-sm {getStatusBadge(
                        a.status,
                        a.due
                      ).color}"
                    >
                      {getStatusBadge(a.status, a.due).text}
                    </span>
                  </div>
                  <div class="mt-1">
                    <span
                      class="block text-xs font-semibold uppercase text-slate-400"
                      >{a.subject}</span
                    >
                    <span class="block text-sm sm:text-base font-semibold text-white truncate"
                      >{a.title}</span
                    >
                  </div>
                </div>
              </div>

              {#if a.description}
                <div class="relative z-10 text-sm text-slate-300 line-clamp-2">
                  {a.description}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
