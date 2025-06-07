<script lang="ts">
	import { onMount } from 'svelte';
	import { seqtaFetch } from '../../utils/netUtil';
	import { cache } from '../../utils/cache';
	import { notify } from '../../utils/notify';

	const studentId = 69;
  
	let upcomingAssessments = $state<any[]>([]);
	let activeSubjects = $state<any[]>([]);
	let lessonColours = $state<any[]>([]);
	let loadingAssessments = $state<boolean>(true);
	let selectedTab = $state<'list' | 'board' | 'calendar'>('list');
	let subjectFilters: Record<string, boolean> = {};
	let remindersEnabled = true;
	let groupBy = $state<'subject' | 'month' | 'status'>('subject');

	const filteredAssessments = $derived(upcomingAssessments.filter((a: any) => subjectFilters[a.code]));
  
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
			body: { request: 'userPrefs', asArray: true, user: studentId }
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
				filters: Record<string, boolean>;
			}>('assessments_overview_data');
			
			if (cachedData) {
				upcomingAssessments = cachedData.assessments;
				activeSubjects = cachedData.subjects;
				subjectFilters = cachedData.filters;
				loadingAssessments = false;
				return;
			}

			const [assessmentsRes, classesRes] = await Promise.all([
				seqtaFetch('/seqta/student/assessment/list/upcoming?', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json; charset=utf-8' },
					body: { student: studentId }
				}),
				seqtaFetch('/seqta/student/load/subjects?', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json; charset=utf-8' },
					body: {}
				})
			]);

			const colours = await loadLessonColours();

			const classesResJson = JSON.parse(classesRes);
			const activeClass = classesResJson.payload.find((c: any) => c.active);
			activeSubjects = activeClass ? activeClass.subjects : [];

			// Initialize subject filters on first run
			activeSubjects.forEach((s: any) => {
				if (!(s.code in subjectFilters)) subjectFilters[s.code] = true;
			});

			const activeCodes = activeSubjects.map((s: any) => s.code);

			// Fetch past assessments for each active subject
			const pastAssessmentsPromises = activeSubjects.map(subject => 
				seqtaFetch('/seqta/student/assessment/list/past?', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json; charset=utf-8' },
					body: {
						programme: subject.programme,
						metaclass: subject.metaclass,
						student: studentId
					}
				})
			);

			const pastAssessmentsResponses = await Promise.all(pastAssessmentsPromises);
			const pastAssessments = pastAssessmentsResponses
				.map(res => JSON.parse(res).payload.tasks || [])
				.flat();

			// Combine and process all assessments
			const allAssessments = [
				...JSON.parse(assessmentsRes).payload,
				...pastAssessments
			];

			// Remove duplicates by id
			const uniqueAssessmentsMap = new Map();
			allAssessments.forEach((a: any) => {
				if (!uniqueAssessmentsMap.has(a.id)) {
					uniqueAssessmentsMap.set(a.id, a);
				}
			});
			const uniqueAssessments = Array.from(uniqueAssessmentsMap.values());

			upcomingAssessments = uniqueAssessments
				.filter((a: any) => activeCodes.includes(a.code))
				.map((a: any) => {
					const prefName = `timetable.subject.colour.${a.code}`;
					const c = colours.find((p: any) => p.name === prefName);
					a.colour = c ? c.value : '#8e8e8e';
					// Get the metaclass from the subject
					const subject = activeSubjects.find((s: any) => s.code === a.code);
					a.metaclass = subject?.metaclass;
					return a;
				})
				.sort((a: any, b: any) => new Date(b.due).getTime() - new Date(a.due).getTime());

			// Cache all the data for 10 minutes
			cache.set('assessments_overview_data', {
				assessments: upcomingAssessments,
				subjects: activeSubjects,
				filters: subjectFilters
			}, 10);
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
		} else if (dueDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
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
		return upcomingAssessments.filter(a => {
			const assessmentDate = new Date(a.due);
			return assessmentDate.getDate() === date.getDate() &&
				   assessmentDate.getMonth() === date.getMonth() &&
				   assessmentDate.getFullYear() === date.getFullYear();
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
			hex = hex.split('').map(x => x + x).join('');
		}
		const num = parseInt(hex, 16);
		return [
			(num >> 16) & 255,
			(num >> 8) & 255,
			num & 255
		];
	}

	// Utility: Check if color is light
	function isColorLight(hex: string) {
		const [r, g, b] = hexToRgb(hex);
		return (r * 299 + g * 587 + b * 114) / 1000 > 150;
	}

	function scheduleAssessmentReminders(assessments: any[]) {
		if (!remindersEnabled) return;
		const now = Date.now();
		const scheduled = new Set(JSON.parse(localStorage.getItem('scheduledAssessmentReminders') || '[]'));

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
		filteredAssessments.forEach(assessment => {
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
		filteredAssessments.forEach(assessment => {
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

	const originalOnMount = onMount;
	onMount(async () => {
		await loadAssessments();
		highlightAssessmentFromQuery();
	});
</script>

<div class="p-4 sm:p-6 space-y-6">
	<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
		<h1 class="text-2xl font-bold text-white">Assessments</h1>
		<div class="flex gap-2">
			<button 
				class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab === 'list' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
				onclick={() => selectedTab = 'list'}
			>
				List View
			</button>
			<button 
				class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab === 'board' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
				onclick={() => selectedTab = 'board'}
			>
				Board View
			</button>
			<button 
				class="px-3 sm:px-4 py-2 rounded-lg transition-all duration-300 text-sm sm:text-base {selectedTab === 'calendar' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
				onclick={() => selectedTab = 'calendar'}
			>
				Calendar View
			</button>
		</div>
	</div>

	{#if loadingAssessments}
		<div class="flex flex-col justify-center items-center py-12 sm:py-16">
			<div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"></div>
			<p class="mt-4 text-sm sm:text-base text-slate-400">Loading assessments...</p>
		</div>
	{:else if filteredAssessments.length === 0}
		<div class="flex flex-col justify-center items-center py-12 sm:py-16">
			<div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl sm:text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient">
				🎉
			</div>
			<p class="mt-4 text-lg sm:text-xl text-slate-300">No upcoming assessments!</p>
		</div>
	{:else if selectedTab === 'board'}
		<div class="space-y-6">
			<div class="flex justify-end gap-2">
				<button 
					class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'subject' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
					onclick={() => groupBy = 'subject'}
				>
					Group by Subject
				</button>
				<button 
					class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'month' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
					onclick={() => groupBy = 'month'}
				>
					Group by Month
				</button>
				<button 
					class="px-4 py-2 rounded-lg transition-all duration-300 text-sm {groupBy === 'status' ? 'accent-bg text-white shadow-lg accent-shadow' : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'}"
					onclick={() => groupBy = 'status'}
				>
					Group by Status
				</button>
			</div>

			<div class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-800/10">
				{#if groupBy === 'subject'}
					{#each activeSubjects.filter(s => subjectFilters[s.code]) as subject}
						<div class="flex-shrink-0 w-72 sm:w-80">
							<div class="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border-l-8 border border-slate-700/50" style="border-color: {subject.colour || '#8e8e8e'};">
								<h3 class="font-bold text-base sm:text-lg text-white">{subject.title}</h3>
								<p class="text-sm text-slate-400">{subject.code}</p>
							</div>
							<div class="space-y-4">
								{#each filteredAssessments.filter(a => a.code === subject.code) as assessment}
									<a 
										href="/assessments/{assessment.id}/{assessment.metaclass}"
										class="block bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
										style="border-color: {assessment.colour};"
									>
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-slate-400">
												{new Date(assessment.due).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
											</div>
											<span class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(assessment.status, assessment.due).color}">
												{getStatusBadge(assessment.status, assessment.due).text}
											</span>
										</div>
										<h4 class="font-bold mt-1 text-white truncate">{assessment.title}</h4>
									</a>
								{/each}
							</div>
						</div>
					{/each}
				{:else if groupBy === 'month'}
					{#each getAssessmentsByMonth() as [month, assessments]}
						<div class="flex-shrink-0 w-72 sm:w-80">
							<div class="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border-l-8 border border-slate-700/50">
								<h3 class="font-bold text-base sm:text-lg text-white">{month}</h3>
								<p class="text-sm text-slate-400">{assessments.length} assessment{assessments.length === 1 ? '' : 's'}</p>
							</div>
							<div class="space-y-4">
								{#each assessments as assessment}
									<a 
										href="/assessments/{assessment.id}/{assessment.metaclass}"
										class="block bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
										style="border-color: {assessment.colour};"
									>
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-slate-400">
												{new Date(assessment.due).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
											</div>
											<span class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(assessment.status, assessment.due).color}">
												{getStatusBadge(assessment.status, assessment.due).text}
											</span>
										</div>
										<h4 class="font-bold mt-1 text-white truncate">{assessment.title}</h4>
										<p class="text-sm text-slate-400 mt-1">{assessment.code}</p>
									</a>
								{/each}
							</div>
						</div>
					{/each}
				{:else if groupBy === 'status'}
					{#each getAssessmentsByStatus() as [status, assessments]}
						<div class="flex-shrink-0 w-72 sm:w-80">
							<div class="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border-l-8 border border-slate-700/50" style="border-color: {getStatusBadge(assessments[0].status, assessments[0].due).color};">
								<h3 class="font-bold text-base sm:text-lg text-white">{status}</h3>
								<p class="text-sm text-slate-400">{assessments.length} assessment{assessments.length === 1 ? '' : 's'}</p>
							</div>
							<div class="space-y-4">
								{#each assessments as assessment}
									<a 
										href="/assessments/{assessment.id}/{assessment.metaclass}"
										class="block bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
										style="border-color: {assessment.colour};"
									>
										<div class="flex items-center gap-2">
											<div class="text-sm font-semibold text-slate-400">
												{new Date(assessment.due).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
											</div>
										</div>
										<h4 class="font-bold mt-1 text-white truncate">{assessment.title}</h4>
										<p class="text-sm text-slate-400 mt-1">{assessment.code}</p>
									</a>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{:else if selectedTab === 'calendar'}
		<div class="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-700/50">
			<div class="flex justify-between items-center mb-6">
				<button 
					class="p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-300 text-slate-300 hover:text-white"
					onclick={prevMonth}
				>
					←
				</button>
				<h2 class="text-lg sm:text-xl font-bold text-white">
					{getMonthName(currentDate)}
				</h2>
				<button 
					class="p-2 rounded-lg hover:bg-slate-700/50 transition-all duration-300 text-slate-300 hover:text-white"
					onclick={nextMonth}
				>
					→
				</button>
			</div>
			
			<div class="grid grid-cols-7 gap-2">
				{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
					<div class="text-center py-2 text-xs sm:text-sm font-semibold text-slate-400">
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
					<div class="aspect-square p-1">
						<div class="h-full rounded-lg border p-2 transition-all duration-300 hover:scale-105 {assessments.length > 0 ? '' : 'bg-slate-800/30'} {isToday ? 'border-indigo-500 ring-4 ring-indigo-500/30 animate-pulse-today' : 'border-slate-700/50'}"
							style={assessments.length > 0 && assessments[0].colour ? `background: ${assessments[0].colour}20;` : ''}>
							<div class="text-sm sm:text-base mb-1 {isToday ? 'font-bold text-indigo-400 scale-110' : 'text-slate-300'}">{i + 1}</div>
							{#if assessments.length > 0}
								<div class="space-y-1">
									{#each assessments.slice(0, 2) as assessment}
										{@const textColor = isColorLight(assessment.colour || '#8e8e8e') ? '#232428' : '#fff'}
										<div class="flex items-center gap-1">
											<div 
												class="text-xs p-1 rounded truncate flex-1"
												style={`background: rgba(0,0,0,0.2); color: ${textColor};`}
											>
												{assessment.title}
											</div>
										</div>
									{/each}
									{#if assessments.length > 2}
										<div class="text-xs text-center text-slate-400">
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
		<div class="flex flex-col lg:flex-row gap-6">
			<!-- Quick Navigation Sidebar -->
			<div class="lg:w-48 flex-shrink-0">
				<div class="sticky top-6 bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
					<h3 class="text-sm font-semibold mb-3 text-slate-400">Quick Jump</h3>
					<div class="space-y-2">
						{#each activeSubjects.filter(s => subjectFilters[s.code]) as subject}
							<a 
								href="#subject-{subject.code}"
								class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-all duration-300 cursor-pointer text-slate-300 hover:text-white"
								onclick={(e) => scrollToSubject(e, subject.code)}
							>
								<div class="w-2 h-2 rounded-full" style="background-color: {subject.colour || '#8e8e8e'}"></div>
								<span class="text-sm truncate">{subject.code}</span>
							</a>
						{/each}
					</div>
				</div>
			</div>

			<!-- Main Content -->
			<div class="flex-1 space-y-6">
				{#each activeSubjects.filter(s => subjectFilters[s.code]) as subject}
					<div id="subject-{subject.code}" class="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50">
						<div class="px-4 sm:px-6 py-4 border-b border-slate-700/50">
							<div class="flex items-center gap-3">
								<div class="w-3 h-3 rounded-full" style="background-color: {subject.colour || '#8e8e8e'}"></div>
								<h3 class="font-bold text-base sm:text-lg text-white">{subject.title}</h3>
								<span class="text-sm text-slate-400">({subject.code})</span>
							</div>
						</div>
						<div class="p-4 space-y-4">
							{#each filteredAssessments.filter(a => a.code === subject.code) as assessment}
								<a 
									href="/assessments/{assessment.id}/{assessment.metaclass}"
									class="block bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 shadow-lg border-l-8 border border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
									style="border-color: {assessment.colour};"
								>
									<div class="flex items-center gap-2">
										<div class="text-sm font-semibold text-slate-400">
											{new Date(assessment.due).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
										</div>
										<span class="px-2 py-0.5 rounded text-xs text-white {getStatusBadge(assessment.status, assessment.due).color}">
											{getStatusBadge(assessment.status, assessment.due).text}
										</span>
									</div>
									<h4 class="font-bold mt-1 text-white truncate">{assessment.title}</h4>
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