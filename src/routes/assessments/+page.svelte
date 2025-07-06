<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';
  import { cache } from '../../utils/cache';
  import { notify } from '../../utils/notify';
  import { GeminiService } from '../../lib/services/geminiService';
  import { invoke } from '@tauri-apps/api/core';

  const studentId = 69;

  let upcomingAssessments = $state<any[]>([]);
  let allSubjects = $state<any[]>([]);
  let activeSubjects = $state<any[]>([]);
  let lessonColours = $state<any[]>([]);
  let loadingAssessments = $state<boolean>(true);
  let selectedTab = $state<'list' | 'board' | 'calendar'>('list');
  let subjectFilters: Record<string, boolean> = {};
  let remindersEnabled = true;
  let groupBy = $state<'subject' | 'month' | 'status'>('subject');
  
  // Year filter state
  let selectedYear = $state<number>(new Date().getFullYear());
  let availableYears = $state<number[]>([]);

  // Grade prediction state
  let gradePredictions = $state<Map<string, any>>(new Map());
  let generatingPredictions = $state<boolean>(false);
  let predictionError = $state<string | null>(null);

  let aiIntegrationsEnabled = $state(false);
  let gradeAnalyserEnabled = $state(true);

  const filteredAssessments = $derived(
    upcomingAssessments.filter((a: any) => {
      // Filter by year only
      const assessmentYear = new Date(a.due).getFullYear();
      if (assessmentYear !== selectedYear) return false;
      
      return true;
    }),
  );

  async function loadLessonColours() {
    // Check cache first
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
    // Cache for 10 minutes
    cache.set('lesson_colours', lessonColours, 10);
    return lessonColours;
  }

  async function loadAssessments() {
    loadingAssessments = true;

    try {
      // Check cache first
      const cachedData = cache.get<{
        assessments: any[];
        subjects: any[];
        allSubjects: any[];
        filters: Record<string, boolean>;
        years: number[];
      }>('assessments_overview_data');

      if (cachedData) {
        upcomingAssessments = cachedData.assessments;
        activeSubjects = cachedData.subjects;
        allSubjects = cachedData.allSubjects;
        subjectFilters = cachedData.filters;
        availableYears = cachedData.years;
        loadingAssessments = false;
        return;
      }

      const classesRes = await seqtaFetch('/seqta/student/load/subjects?', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {},
      });

      const colours = await loadLessonColours();

      const classesResJson = JSON.parse(classesRes);
      const folders = classesResJson.payload;
      
      // Get all subjects from all folders
      allSubjects = folders.flatMap((f: any) => f.subjects);
      
      // Remove duplicate subjects by programme+metaclass
      const uniqueSubjectsMap = new Map();
      allSubjects.forEach((s: any) => {
        const key = `${s.programme}-${s.metaclass}`;
        if (!uniqueSubjectsMap.has(key)) uniqueSubjectsMap.set(key, s);
      });
      allSubjects = Array.from(uniqueSubjectsMap.values());

      // Get active subjects for default filters
      const activeFolder = folders.find((c: any) => c.active);
      activeSubjects = activeFolder ? activeFolder.subjects : [];

      // Initialize subject filters on first run - include all subjects
      allSubjects.forEach((s: any) => {
        if (!(s.code in subjectFilters)) {
          // Default to true for active subjects, false for others
          subjectFilters[s.code] = activeSubjects.some((as: any) => as.code === s.code);
        }
      });

      // Fetch upcoming assessments for current active subjects
      const assessmentsRes = await seqtaFetch('/seqta/student/assessment/list/upcoming?', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: { student: studentId },
      });

      // Fetch past assessments for every subject ever
      const pastAssessmentsPromises = allSubjects.map((subject) =>
        seqtaFetch('/seqta/student/assessment/list/past?', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: {
            programme: subject.programme,
            metaclass: subject.metaclass,
            student: studentId,
          },
        }),
      );

      const pastAssessmentsResponses = await Promise.all(pastAssessmentsPromises);
      const pastAssessments = pastAssessmentsResponses
        .map((res) => JSON.parse(res).payload.tasks || [])
        .flat();

      // Combine and process all assessments
      const allAssessments = [...JSON.parse(assessmentsRes).payload, ...pastAssessments];

      // Remove duplicates by id
      const uniqueAssessmentsMap = new Map();
      allAssessments.forEach((a: any) => {
        if (!uniqueAssessmentsMap.has(a.id)) {
          uniqueAssessmentsMap.set(a.id, a);
        }
      });
      const uniqueAssessments = Array.from(uniqueAssessmentsMap.values());

      // Process assessments and add colors
      upcomingAssessments = uniqueAssessments
        .map((a: any) => {
          const prefName = `timetable.subject.colour.${a.code}`;
          const c = colours.find((p: any) => p.name === prefName);
          a.colour = c ? c.value : '#8e8e8e';
          // Get the metaclass from the subject
          const subject = allSubjects.find((s: any) => s.code === a.code);
          a.metaclass = subject?.metaclass;
          return a;
        })
        .sort((a: any, b: any) => new Date(b.due).getTime() - new Date(a.due).getTime());

      // Extract available years from assessments
      const years = new Set<number>();
      upcomingAssessments.forEach((a: any) => {
        years.add(new Date(a.due).getFullYear());
      });
      availableYears = Array.from(years).sort((a, b) => b - a); // Sort descending

      // Cache all the data for 10 minutes
      cache.set(
        'assessments_overview_data',
        {
          assessments: upcomingAssessments,
          subjects: activeSubjects,
          allSubjects: allSubjects,
          filters: subjectFilters,
          years: availableYears,
        },
        10,
      );
    } catch (e) {
      console.error('Error loading assessments:', e);
    } finally {
      loadingAssessments = false;
    }
  }

  function buildAssessmentURL(programmeID: number, metaID: number, itemID?: number) {
    const base = `../#?page=/assessments/${programmeID}:${metaID}`;
    return itemID ? `${base}&item=${itemID}` : base;
  }

  function getStatusBadge(status: string, due: string) {
    const dueDate = new Date(due);
    const now = new Date();

    if (status === 'MARKS_RELEASED') {
      return { text: 'Marked', color: 'bg-green-500' };
    } else if (dueDate < now) {
      return { text: 'Overdue', color: 'bg-red-500' };
    } else if (dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Within 7 days
      return { text: 'Due Soon', color: 'bg-yellow-500' };
    } else {
      return { text: 'Upcoming', color: 'bg-blue-500' };
    }
  }

  function scrollToSubject(event: MouseEvent, subjectCode: string) {
    event.preventDefault();
    const element = document.getElementById(`subject-${subjectCode}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add highlight class
      element.classList.add('highlight-subject');
      // Remove highlight class after animation
      setTimeout(() => {
        element.classList.remove('highlight-subject');
      }, 1500);
    }
  }

  // Add calendar view functions
  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function getMonthName(date: Date) {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  let currentDate = $state(new Date());
  let currentMonth = $derived(currentDate.getMonth());
  let currentYear = $derived(currentDate.getFullYear());

  function getAssessmentsForDate(date: Date) {
    return filteredAssessments.filter((a) => {
      const assessmentDate = new Date(a.due);
      return (
        assessmentDate.getDate() === date.getDate() &&
        assessmentDate.getMonth() === date.getMonth() &&
        assessmentDate.getFullYear() === date.getFullYear()
      );
    });
  }

  function prevMonth() {
    currentDate = new Date(currentYear, currentMonth - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentYear, currentMonth + 1, 1);
  }

  // Utility: Convert hex color to RGB
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

  // Utility: Check if color is light
  function isColorLight(hex: string) {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  }

  function scheduleAssessmentReminders(assessments: any[]) {
    if (!remindersEnabled) return;
    const now = Date.now();
    const scheduled = new Set(
      JSON.parse(localStorage.getItem('scheduledAssessmentReminders') || '[]'),
    );

    for (const a of assessments) {
      const due = new Date(a.due).getTime();
      const reminderTime = due - 24 * 60 * 60 * 1000; // 1 day before
      if (reminderTime > now && !scheduled.has(a.id)) {
        const timeout = reminderTime - now;
        setTimeout(() => {
          notify({
            title: 'Assessment Reminder',
            body: `${a.title} is due tomorrow!`,
          });
        }, timeout);
        scheduled.add(a.id);
      }
    }
    localStorage.setItem('scheduledAssessmentReminders', JSON.stringify(Array.from(scheduled)));
  }

  $effect(() => {
    if (upcomingAssessments.length) {
      scheduleAssessmentReminders(upcomingAssessments);
    }
  });

  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code'),
      date: params.get('date'),
    };
  }

  function highlightAssessmentFromQuery() {
    const { code, date } = getQueryParams();
    if (!code || !date) return;
    // Find the assessment with the matching code and closest due date
    let closest = null;
    let minDiff = Infinity;
    const targetDate = new Date(date);
    for (const a of upcomingAssessments) {
      if (a.code !== code) continue;
      const dueDate = new Date(a.due);
      const diff = Math.abs(dueDate.getTime() - targetDate.getTime());
      if (diff < minDiff) {
        closest = a;
        minDiff = diff;
      }
    }
    if (closest) {
      // Try to find the DOM element for this assessment and scroll/highlight
      setTimeout(() => {
        const selector = `[data-assessment-id="${closest.id}"]`;
        const el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-subject');
          setTimeout(() => el.classList.remove('highlight-subject'), 1500);
        }
      }, 300);
    }
  }

  function getAssessmentsByMonth() {
    const grouped = new Map<string, any[]>();
    filteredAssessments.forEach((assessment) => {
      const date = new Date(assessment.due);
      const monthKey = getMonthName(date);
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)?.push(assessment);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateA.getTime() - dateB.getTime();
    });
  }

  function getAssessmentsByStatus() {
    const grouped = new Map<string, any[]>();
    filteredAssessments.forEach((assessment) => {
      const status = getStatusBadge(assessment.status, assessment.due).text;
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)?.push(assessment);
    });
    return Array.from(grouped.entries()).sort((a, b) => {
      const order = ['Overdue', 'Due Soon', 'Upcoming', 'Marked'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }

  async function generateGradePredictions() {
    generatingPredictions = true;
    predictionError = null;

    try {
      // Get assessments for the selected year
      const yearAssessments = upcomingAssessments.filter((a: any) => {
        const assessmentYear = new Date(a.due).getFullYear();
        return assessmentYear === selectedYear;
      });

      // Add final grades to assessments that have been marked
      const assessmentsWithGrades = yearAssessments.map((a: any) => {
        let finalGrade = undefined;
        if (a.status === 'MARKS_RELEASED') {
          if (a.criteria && a.criteria[0]?.results?.percentage !== undefined) {
            finalGrade = a.criteria[0].results.percentage;
          } else if (a.results && a.results.percentage !== undefined) {
            finalGrade = a.results.percentage;
          }
        }
        return { ...a, finalGrade };
      });

      const predictions = await GeminiService.predictGrades(assessmentsWithGrades);
      
      // Store predictions in the map
      const predictionsMap = new Map();
      predictions.forEach(prediction => {
        predictionsMap.set(prediction.subject, prediction);
      });
      
      gradePredictions = predictionsMap;
      
      notify({
        title: 'Grade Predictions Generated',
        body: `Successfully generated predictions for ${predictions.length} subjects`,
      });
    } catch (error) {
      console.error('Error generating predictions:', error);
      predictionError = 'Failed to generate grade predictions. Please try again.';
      notify({
        title: 'Prediction Error',
        body: 'Failed to generate grade predictions',
      });
    } finally {
      generatingPredictions = false;
    }
  }

  function getPredictedGradeDisplay(subjectTitle: string) {
    const prediction = gradePredictions.get(subjectTitle);
    if (!prediction) return null;

    const grade = prediction.predictedGrade;
    const confidence = prediction.confidence;
    
    // Determine color based on grade
    let colorClass = 'text-gray-500';
    if (grade >= 90) colorClass = 'text-green-600 dark:text-green-400';
    else if (grade >= 80) colorClass = 'text-blue-600 dark:text-blue-400';
    else if (grade >= 70) colorClass = 'text-yellow-600 dark:text-yellow-400';
    else if (grade >= 60) colorClass = 'text-orange-600 dark:text-orange-400';
    else colorClass = 'text-red-600 dark:text-red-400';

    return {
      grade: Math.round(grade),
      confidence: Math.round(confidence),
      colorClass,
      reasoning: prediction.reasoning
    };
  }

  const originalOnMount = onMount;
  onMount(async () => {
    try {
      const settings = await invoke<any>('get_settings');
      aiIntegrationsEnabled = settings.ai_integrations_enabled ?? false;
      gradeAnalyserEnabled = settings.grade_analyser_enabled ?? true;
    } catch (e) {
      aiIntegrationsEnabled = false;
      gradeAnalyserEnabled = true;
    }
    await loadAssessments();
    highlightAssessmentFromQuery();
  });
</script>

<div class="p-4 space-y-6 sm:p-6">
  <div class="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Assessments</h1>
    <div class="flex gap-2">
      <button
        class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab ===
        'list'
          ? 'accent-bg text-white shadow-lg accent-shadow'
          : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
        onclick={() => (selectedTab = 'list')}>
        List View
      </button>
      <button
        class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab ===
        'board'
          ? 'accent-bg text-white shadow-lg accent-shadow'
          : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
        onclick={() => (selectedTab = 'board')}>
        Board View
      </button>
      <button
        class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab ===
        'calendar'
          ? 'accent-bg text-white shadow-lg accent-shadow'
          : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
        onclick={() => (selectedTab = 'calendar')}>
        Calendar View
      </button>
    </div>
  </div>

  <!-- Year Filter -->
  {#if availableYears && availableYears.length > 0}
    <div class="flex flex-col gap-4 p-4 rounded-xl border backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50">
      <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-400">Filter by Year</h3>
      <div class="flex flex-wrap gap-2">
        {#each availableYears as year}
          <button
            class="px-3 py-2 rounded-lg transition-all duration-200 text-sm {selectedYear === year
              ? 'accent-bg text-white shadow-lg accent-shadow'
              : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50 hover:scale-105'}"
            onclick={() => (selectedYear = year)}>
            {year}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Grade Predictions Section -->
  {#if aiIntegrationsEnabled && gradeAnalyserEnabled}
    <div class="flex flex-col gap-4 p-4 rounded-xl border backdrop-blur-sm bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200/50 dark:border-purple-700/50">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">AI Grade Predictions</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Generate AI-powered grade predictions for {selectedYear} based on your assessment performance
          </p>
        </div>
        <button
          class="px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={generateGradePredictions}
          disabled={generatingPredictions}>
          {#if generatingPredictions}
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </div>
          {:else}
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              Generate Predictions
            </div>
          {/if}
        </button>
      </div>
      
      {#if predictionError}
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <p class="text-sm text-red-700 dark:text-red-400">{predictionError}</p>
        </div>
      {/if}

      {#if gradePredictions.size > 0}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each Array.from(gradePredictions.entries()) as [subject, prediction]}
            <div class="p-3 rounded-lg bg-white/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative group transition-all duration-200 hover:scale-[1.02] cursor-pointer">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-slate-900 dark:text-white truncate">{subject}</span>
                <div class="text-right">
                  <div class="text-lg font-bold {getPredictedGradeDisplay(subject)?.colorClass}">
                    {getPredictedGradeDisplay(subject)?.grade}%
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">
                    Predicted
                  </div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  Confidence: {getPredictedGradeDisplay(subject)?.confidence}%
                </span>
              </div>
              <!-- Tooltip: appears when hovering over the entire card -->
              <div class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 px-4 py-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 max-w-xs w-max whitespace-pre-line break-words shadow-lg border border-slate-700"
                style="min-width:220px; max-width:320px;">
                <div class="font-semibold mb-1">AI Reasoning:</div>
                <div style="white-space:pre-line; word-break:break-word;">{getPredictedGradeDisplay(subject)?.reasoning}</div>
                <div class="mt-1 text-slate-300">
                  Confidence: {getPredictedGradeDisplay(subject)?.confidence}%
                </div>
                <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if loadingAssessments}
    <div class="flex flex-col justify-center items-center py-12 sm:py-16">
      <div
        class="w-12 h-12 rounded-full border-4 animate-spin sm:w-16 sm:h-16 border-indigo-500/30 border-t-indigo-500">
      </div>
      <p class="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
        Loading assessments...
      </p>
    </div>
  {:else if filteredAssessments.length === 0}
    <div class="flex flex-col justify-center items-center py-12 sm:py-16">
      <div
        class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl sm:text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient">
        🎉
      </div>
      <p class="mt-4 text-lg sm:text-xl text-slate-700 dark:text-slate-300">
        No assessments for {selectedYear}!
      </p>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Try selecting a different year.
      </p>
    </div>
  {:else if selectedTab === 'board'}
    <div class="space-y-6">
      <div class="flex gap-2 justify-end">
        <button
          class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'subject'
            ? 'accent-bg text-white shadow-lg accent-shadow'
            : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
          onclick={() => (groupBy = 'subject')}>
          Group by Subject
        </button>
        <button
          class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'month'
            ? 'accent-bg text-white shadow-lg accent-shadow'
            : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
          onclick={() => (groupBy = 'month')}>
          Group by Month
        </button>
        <button
          class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'status'
            ? 'accent-bg text-white shadow-lg accent-shadow'
            : 'bg-slate-200/80 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700/50'}"
          onclick={() => (groupBy = 'status')}>
          Group by Status
        </button>
      </div>

      <div
        class="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-300/20 dark:scrollbar-track-slate-800/10">
        {#if groupBy === 'subject'}
          {#each (allSubjects || []).filter(subject => filteredAssessments.some(a => a.code === subject.code)) as subject}
            <div class="flex-shrink-0 w-72 sm:w-80">
              <div
                class="p-4 mb-4 rounded-xl border border-l-8 backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50"
                style="border-color: {subject.colour || '#8e8e8e'};">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-base font-bold sm:text-lg text-slate-900 dark:text-white">
                      {subject.title}
                    </h3>
                    <p class="text-sm text-slate-600 dark:text-slate-400">
                      {subject.code}
                      {#if activeSubjects && activeSubjects.some((as: any) => as.code === subject.code)}
                        <span class="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">Active</span>
                      {/if}
                    </p>
                  </div>
                  {#if aiIntegrationsEnabled && gradeAnalyserEnabled && getPredictedGradeDisplay(subject.title)}
                    <div class="text-right relative group">
                      <div class="text-lg font-bold {getPredictedGradeDisplay(subject.title)?.colorClass} cursor-help">
                        {getPredictedGradeDisplay(subject.title)?.grade}%
                      </div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">
                        Predicted
                      </div>
                      <!-- Tooltip -->
                      <div class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
                        <div class="font-semibold mb-1">AI Reasoning:</div>
                        <div>{getPredictedGradeDisplay(subject.title)?.reasoning}</div>
                        <div class="mt-1 text-slate-300">
                          Confidence: {getPredictedGradeDisplay(subject.title)?.confidence}%
                        </div>
                        <div class="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
              <div class="space-y-4">
                {#each filteredAssessments.filter((a) => a.code === subject.code) as assessment}
                  <a
                    href="/assessments/{assessment.id}/{assessment.metaclass}"
                    class="block bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-300/50 dark:border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    style="border-color: {assessment.colour};">
                    <div class="flex gap-2 items-center">
                      <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {new Date(assessment.due).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <span
                        class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(
                          assessment.status,
                          assessment.due,
                        ).color}">
                        {getStatusBadge(assessment.status, assessment.due).text}
                      </span>
                    </div>
                    <h4 class="mt-1 font-bold truncate text-slate-900 dark:text-white">
                      {assessment.title}
                    </h4>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        {:else if groupBy === 'month'}
          {#each getAssessmentsByMonth() as [month, assessments]}
            <div class="flex-shrink-0 w-72 sm:w-80">
              <div
                class="p-4 mb-4 rounded-xl border border-l-8 backdrop-blur-sm bg-slate-800/50 border-slate-700/50">
                <h3 class="text-base font-bold sm:text-lg text-slate-900 dark:text-white">
                  {month}
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  {assessments.length} assessment{assessments.length === 1 ? '' : 's'}
                </p>
              </div>
              <div class="space-y-4">
                {#each assessments as assessment}
                  <a
                    href="/assessments/{assessment.id}/{assessment.metaclass}"
                    class="block bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-300/50 dark:border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    style="border-color: {assessment.colour};">
                    <div class="flex gap-2 items-center">
                      <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {new Date(assessment.due).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <span
                        class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(
                          assessment.status,
                          assessment.due,
                        ).color}">
                        {getStatusBadge(assessment.status, assessment.due).text}
                      </span>
                    </div>
                    <h4 class="mt-1 font-bold truncate text-slate-900 dark:text-white">
                      {assessment.title}
                    </h4>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {assessment.code}
                    </p>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        {:else if groupBy === 'status'}
          {#each getAssessmentsByStatus() as [status, assessments]}
            <div class="flex-shrink-0 w-72 sm:w-80">
              <div
                class="p-4 mb-4 rounded-xl border border-l-8 backdrop-blur-sm bg-slate-800/50 border-slate-700/50"
                style="border-color: {getStatusBadge(assessments[0].status, assessments[0].due)
                  .color};">
                <h3 class="text-base font-bold sm:text-lg text-slate-900 dark:text-white">
                  {status}
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  {assessments.length} assessment{assessments.length === 1 ? '' : 's'}
                </p>
              </div>
              <div class="space-y-4">
                {#each assessments as assessment}
                  <a
                    href="/assessments/{assessment.id}/{assessment.metaclass}"
                    class="block bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-300/50 dark:border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    style="border-color: {assessment.colour};">
                    <div class="flex gap-2 items-center">
                      <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {new Date(assessment.due).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <h4 class="mt-1 font-bold truncate text-slate-900 dark:text-white">
                      {assessment.title}
                    </h4>
                    <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {assessment.code}
                    </p>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {:else if selectedTab === 'calendar'}
    <div
      class="p-4 rounded-xl border backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50 sm:p-6 border-slate-300/50 dark:border-slate-700/50">
      <div class="flex justify-between items-center mb-6">
        <button
          class="p-2 rounded-lg transition-all duration-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          onclick={prevMonth}>
          ←
        </button>
        <h2 class="text-lg font-bold sm:text-xl text-slate-900 dark:text-white">
          {getMonthName(currentDate)}
        </h2>
        <button
          class="p-2 rounded-lg transition-all duration-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          onclick={nextMonth}>
          →
        </button>
      </div>

      <div class="grid grid-cols-7 gap-2">
        {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
          <div
            class="py-2 text-xs font-semibold text-center sm:text-sm text-slate-600 dark:text-slate-400">
            {day}
          </div>
        {/each}

        {#each Array(getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth())) as _, i}
          <div class="aspect-square"></div>
        {/each}

        {#each Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())) as _, i}
          {@const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)}
          {@const assessments = getAssessmentsForDate(date)}
          {@const isToday = date.toDateString() === new Date().toDateString()}
          <div class="p-1 aspect-square">
            <div
              class="h-full rounded-lg border p-2 transition-all duration-300 hover:scale-105 {assessments.length >
              0
                ? ''
                : 'bg-slate-200/60 dark:bg-slate-800/30'} {isToday
                ? 'border-indigo-500 ring-4 ring-indigo-500/30 animate-pulse-today'
                : 'border-slate-300/50 dark:border-slate-700/50'}"
              style={assessments.length > 0 && assessments[0].colour
                ? `background: ${assessments[0].colour}20;`
                : ''}>
              <div
                class="text-sm sm:text-base mb-1 {isToday
                  ? 'font-bold text-indigo-400 scale-110'
                  : 'text-slate-700 dark:text-slate-300'}">
                {i + 1}
              </div>
              {#if assessments.length > 0}
                <div class="space-y-1">
                  {#each assessments.slice(0, 2) as assessment}
                    {@const textColor = isColorLight(assessment.colour || '#8e8e8e')
                      ? '#232428'
                      : '#fff'}
                    <div class="flex gap-1 items-center">
                      <div
                        class="flex-1 p-1 text-xs truncate rounded"
                        style={`background: rgba(0,0,0,0.2); color: ${textColor};`}>
                        {assessment.title}
                      </div>
                    </div>
                  {/each}
                  {#if assessments.length > 2}
                    <div class="text-xs text-center text-slate-600 dark:text-slate-400">
                      +{assessments.length - 2} more
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-6 lg:flex-row">
      <!-- Quick Navigation Sidebar -->
      <div class="flex-shrink-0 lg:w-48">
        <div
          class="sticky top-6 p-4 rounded-xl border backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50">
          <h3 class="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Quick Jump</h3>
          <div class="space-y-2">
            {#each (allSubjects || []).filter(subject => filteredAssessments.some(a => a.code === subject.code)) as subject}
              <a
                href="#subject-{subject.code}"
                class="flex gap-2 items-center px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                onclick={(e) => scrollToSubject(e, subject.code)}>
                <div
                  class="w-2 h-2 rounded-full"
                  style="background-color: {subject.colour || '#8e8e8e'}">
                </div>
                <span class="text-sm truncate">{subject.code}</span>
                {#if activeSubjects && activeSubjects.some((as: any) => as.code === subject.code)}
                  <span class="text-xs opacity-75">(Active)</span>
                {/if}
              </a>
            {/each}
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 space-y-6">
        {#each (allSubjects || []).filter(subject => filteredAssessments.some(a => a.code === subject.code)) as subject}
          <div
            id="subject-{subject.code}"
            class="overflow-hidden rounded-xl border backdrop-blur-sm bg-slate-100/80 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50">
            <div class="px-4 py-4 border-b sm:px-6 border-slate-300/50 dark:border-slate-700/50">
              <div class="flex gap-3 items-center justify-between">
                <div class="flex gap-3 items-center">
                  <div
                    class="w-3 h-3 rounded-full"
                    style="background-color: {subject.colour || '#8e8e8e'}">
                  </div>
                  <h3 class="text-base font-bold sm:text-lg text-slate-900 dark:text-white">
                    {subject.title}
                  </h3>
                  <span class="text-sm text-slate-600 dark:text-slate-400">({subject.code})</span>
                  {#if activeSubjects && activeSubjects.some((as: any) => as.code === subject.code)}
                    <span class="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Active</span>
                  {/if}
                </div>
                {#if aiIntegrationsEnabled && gradeAnalyserEnabled && getPredictedGradeDisplay(subject.title)}
                  <div class="text-right relative group">
                    <div class="text-lg font-bold {getPredictedGradeDisplay(subject.title)?.colorClass} cursor-help">
                      {getPredictedGradeDisplay(subject.title)?.grade}%
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      Predicted
                    </div>
                    <!-- Tooltip -->
                    <div class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 max-w-xs">
                      <div class="font-semibold mb-1">AI Reasoning:</div>
                      <div>{getPredictedGradeDisplay(subject.title)?.reasoning}</div>
                      <div class="mt-1 text-slate-300">
                        Confidence: {getPredictedGradeDisplay(subject.title)?.confidence}%
                      </div>
                      <div class="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
            <div class="p-4 space-y-4">
              {#each filteredAssessments.filter((a) => a.code === subject.code) as assessment}
                <a
                  href="/assessments/{assessment.id}/{assessment.metaclass}"
                  class="block bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-300/50 dark:border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  style="border-color: {assessment.colour};">
                  <div class="flex gap-2 items-center">
                    <div class="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {new Date(assessment.due).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <span
                      class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(
                        assessment.status,
                        assessment.due,
                      ).color}">
                      {getStatusBadge(assessment.status, assessment.due).text}
                    </span>
                  </div>
                  <h4 class="mt-1 font-bold truncate text-slate-900 dark:text-white">
                    {assessment.title}
                  </h4>
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes highlight {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 0 0 10px rgba(99, 102, 241, 0.2);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
  }

  @keyframes pulse-today {
    0% {
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
  }

  .animate-pulse-today {
    animation: pulse-today 2s infinite;
  }

  .highlight-subject {
    animation: highlight 1.5s ease-out;
  }

  .scrollbar-thin::-webkit-scrollbar {
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.5);
  }
</style>
