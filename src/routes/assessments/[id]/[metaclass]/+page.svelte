<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { seqtaFetch } from '../../../../utils/netUtil';
	import { Icon, ArrowLeft, DocumentText, VideoCamera, PresentationChartLine, Photo } from 'svelte-hero-icons';

	let assessmentData: any = $state(null);
	let loading = $state(true);
	let error = $state('');
	let tab = $state('details'); // default tab
	let firstCriterion: any = $state(null);
	let teacherFiles: any[] = $state([]);
	let allSubmissions: any[] = $state([]);

	async function loadAssessmentDetails() {
		try {
			const res = await seqtaFetch('/seqta/student/assessment/get?', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: {
					assessment: parseInt($page.params.id),
					student: 69,
					metaclass: parseInt($page.params.metaclass)
				}
			});
			assessmentData = JSON.parse(res).payload;
			firstCriterion = assessmentData?.criteria?.[0] ?? null;

			// Fetch teacher files (submissions)
			const subRes = await seqtaFetch('/seqta/student/assessment/submissions/get?', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: {
					assessment: parseInt($page.params.id),
					student: 69,
					metaclass: parseInt($page.params.metaclass)
				}
			});
			const submissions = JSON.parse(subRes).payload;
			allSubmissions = submissions;
			teacherFiles = submissions.filter((f: any) => f.staff || f.created_by !== 69);
		} catch (e) {
			console.error('Failed to load assessment details:', e);
			error = 'Failed to load assessment details';
		} finally {
			loading = false;
		}
	}

	function getFileIcon(mimetype: string) {
		if (mimetype.startsWith('video/')) return VideoCamera;
		if (mimetype.includes('presentation')) return PresentationChartLine;
		if (mimetype.includes('image')) return Photo;
		return DocumentText;
	}

	function formatFileSize(size: string) {
		const bytes = parseInt(size);
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
		return Math.round(bytes / (1024 * 1024)) + ' MB';
	}

	onMount(loadAssessmentDetails);
</script>

<div class="min-h-screen bg-slate-950">
	<!-- Header -->
	<div class="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-slate-900 border-b border-slate-800 backdrop-blur-sm bg-opacity-80">
		<a href="/assessments" class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
			<Icon src={ArrowLeft} class="w-5 h-5" />
			<span>Back to Assessments</span>
		</a>
	</div>

	<!-- Tabs -->
	<div class="container mx-auto px-6 pt-6">
		<div class="flex gap-2 border-b border-slate-800">
			<button class="px-4 py-2 font-semibold uppercase tracking-wide text-xs focus:outline-none transition-all duration-200 border-b-2 hover:scale-105"
				on:click={() => tab = 'overview'}
				class:border-blue-500={tab === 'overview'}
				class:text-blue-400={tab === 'overview'}
				class:text-slate-400={tab !== 'overview'}
				class:border-transparent={tab !== 'overview'}
			>
				Overview
			</button>
			<button class="px-4 py-2 font-semibold uppercase tracking-wide text-xs focus:outline-none transition-all duration-200 border-b-2 hover:scale-105"
				on:click={() => tab = 'details'}
				class:border-blue-500={tab === 'details'}
				class:text-blue-400={tab === 'details'}
				class:text-slate-400={tab !== 'details'}
				class:border-transparent={tab !== 'details'}
			>
				Details
			</button>
			{#if allSubmissions.length}
				<button class="px-4 py-2 font-semibold uppercase tracking-wide text-xs focus:outline-none transition-all duration-200 border-b-2 hover:scale-105"
					on:click={() => tab = 'submissions'}
					class:border-blue-500={tab === 'submissions'}
					class:text-blue-400={tab === 'submissions'}
					class:text-slate-400={tab !== 'submissions'}
					class:border-transparent={tab !== 'submissions'}
				>
					Submissions
				</button>
			{/if}
		</div>
	</div>

	<!-- Content -->
	<div class="container mx-auto px-6 py-8">
		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		{:else if error}
			<div class="flex justify-center items-center h-64">
				<div class="text-red-500 animate-pulse">{error}</div>
			</div>
		{:else if assessmentData}
			{#if tab === 'overview'}
				<!-- Overview Tab: Description and Resources -->
				<div class="grid gap-8 animate-fade-in">
					<div class="grid gap-6 p-6 rounded-2xl bg-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
						<h1 class="text-2xl font-bold mb-2">Assessment Overview</h1>
						<div class="prose prose-invert max-w-none">
							<div class="text-slate-300 whitespace-pre-line">{@html assessmentData.description}</div>
						</div>
					</div>
					{#if assessmentData.resources?.length}
						<div class="grid gap-6 p-6 rounded-2xl bg-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
							<h2 class="text-xl font-bold">Resources</h2>
							<div class="grid gap-4">
								{#each assessmentData.resources as resource}
									<div class="flex items-center gap-4 p-4 rounded-xl bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5">
										<Icon src={getFileIcon(resource.userfile.mimetype)} class="w-6 h-6 text-blue-400" />
										<div class="flex-1 min-w-0">
											<div class="text-sm font-medium truncate">{resource.name}</div>
											<div class="text-xs text-slate-400">{formatFileSize(resource.userfile.size)}</div>
										</div>
										<button
											disabled
											class="px-3 py-1 text-sm font-medium rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed transition-all duration-200 hover:bg-gray-500"
										>
											Download
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else if tab === 'details'}
				<!-- Details Tab: Grade, Feedback, Teacher Files -->
				<div class="grid gap-8 animate-fade-in">
					<div class="p-6 rounded-2xl bg-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
						<!-- Grade Bar -->
						{#if assessmentData.marked && firstCriterion}
							<div class="mb-4">
								<div class="text-2xl font-bold mb-2">Grade</div>
								<div class="relative w-full h-16 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
									<div class="absolute top-0 left-0 h-full transition-all duration-500 bg-blue-600" style="width: {firstCriterion.results.percentage}%"></div>
									<div class="relative z-10 flex items-center justify-center h-full">
										<span class="text-3xl font-extrabold tracking-wide text-white drop-shadow animate-fade-in" style="text-shadow: 0 2px 8px #000a">
										{firstCriterion.results.grade || firstCriterion.results.percentage.toFixed(2) + '%'}
										</span>
									</div>
								</div>
							</div>
						{/if}
						<!-- End Grade Bar -->
						<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
							<h1 class="text-2xl font-bold">Teacher marking and feedback</h1>
						</div>
						{#if assessmentData.marked && assessmentData.criteria?.length}
							<div class="mb-2 font-semibold">Achievement</div>
						{/if}
						{#if assessmentData.marked && assessmentData.engagement?.feedbackComment}
							<div class="mb-4 p-4 rounded-xl bg-slate-800 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
								<div class="font-semibold mb-1">Teacher feedback</div>
								<div class="text-slate-300">{assessmentData.engagement.feedbackComment}</div>
							</div>
						{/if}
						{#if assessmentData.resources?.length}
							<div class="mt-6">
								<div class="font-semibold mb-2">Teacher files</div>
								<div class="grid gap-2">
									{#each teacherFiles as file}
										<div class="flex items-center gap-4 p-3 rounded-xl bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5">
											<Icon src={getFileIcon(file.mimetype)} class="w-5 h-5 text-blue-400" />
											<div class="flex-1 min-w-0">
												<div class="text-sm font-medium truncate">{file.filename}</div>
												<div class="text-xs text-slate-400">{formatFileSize(file.size)}</div>
											</div>
											<button
												disabled
												class="px-3 py-1 text-sm font-medium rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed transition-all duration-200 hover:bg-gray-500"
											>
												Download
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if tab === 'submissions'}
				<!-- Submissions Tab -->
				<div class="grid gap-8 animate-fade-in">
					<div class="p-6 rounded-2xl bg-slate-900 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
						<h1 class="text-2xl font-bold mb-4">Submissions</h1>
						{#if allSubmissions.filter(f => !f.staff).length === 0}
							<div class="text-slate-400">No submissions found.</div>
						{:else}
							<div class="grid gap-3">
								{#each allSubmissions.filter(f => !f.staff) as file}
									<div 
										class="flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg {file.created_by === 69 ? 'bg-slate-900 border-blue-600 hover:shadow-blue-500/10' : 'border-slate-700 hover:shadow-slate-500/5'}"
									>
										<Icon src={getFileIcon(file.mimetype)} class="w-5 h-5 text-blue-400" />
										<div class="flex-1 min-w-0">
											<div class="text-sm font-medium truncate">{file.filename}</div>
											<div class="text-xs text-slate-400 flex gap-2 items-center">
												<span>{formatFileSize(file.size)}</span>
												<span>•</span>
												<span>Student</span>
												<span>•</span>
												<span>{new Date(file.created_date).toLocaleString()}</span>
											</div>
										</div>
										<button
											disabled
											class="px-3 py-1 text-sm font-medium rounded-lg bg-gray-600 text-gray-300 cursor-not-allowed transition-all duration-200 hover:bg-gray-500"
										>
											Download
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}

	/* Add any additional styles here */
</style> 
