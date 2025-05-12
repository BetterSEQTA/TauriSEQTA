<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { onMount } from 'svelte';
	import '../app.css';
	import {
		Icon,
		Home,
		Newspaper,
		UserGroup,
		ClipboardDocumentList,
		BookOpen,
		Squares2x2,
		ChatBubbleLeftRight,
		DocumentText,
		AcademicCap,
		Bell,
		RectangleStack,
		ChartBar,
		Cog6Tooth,
		CalendarDays
	} from 'svelte-hero-icons';

	let needsSetup = false;
	let seqtaUrl = '';

	onMount(async () => {
		try {
			needsSetup = !(await invoke<boolean>('check_session_exists'));
		} catch (e) {
			console.error('Unable to check session', e);
			needsSetup = true;
		}
	});

	async function startLogin() {
		if (!seqtaUrl) return;
		await invoke('create_login_window', { url: seqtaUrl });

		// Poll every 1.5 s until the cookie is saved (login window closes itself)
		const timer = setInterval(async () => {
			needsSetup = !(await invoke<boolean>('check_session_exists'));
			if (!needsSetup) clearInterval(timer);
		}, 1500);
	}

	async function getAPIData(url: string, parameters: Map<string, string>) {
		return await invoke('get_api_data', { url, parameters: Object.fromEntries(parameters) });
	}

	async function postAPIData(url: string, data: Map<string, string>) {
		return await invoke('post_api_data', { url, data: Object.fromEntries(data) });
	}

	async function loop() {
		while (true) {
			await new Promise((r) => setTimeout(r, 1000));
			const map1 = new Map<string, string>();
			map1.set('hi', 'hi');
			const data = await getAPIData('https://httpbin.org/ip', map1);
			console.log(data);
		}
	}
	loop();

	async function handleLogout() {
		const success = await invoke('logout');
		if (success) {
			needsSetup = true;
		}
	}

	/* Sidebar menu items */
	const menu = [
		{ label: 'Home', icon: Home, path: '/' },
		{ label: 'News', icon: Newspaper, path: '/news' },
		{ label: 'Welcome', icon: UserGroup, path: '/welcome' },
		{ label: 'Assessments', icon: ClipboardDocumentList, hasSub: true, path: '/assessments' },
		{ label: 'Courses', icon: BookOpen, hasSub: true, path: '/courses' },
		{ label: 'Dashboard', icon: Squares2x2, path: '/dashboard' },
		{ label: 'Direqt Messages', icon: ChatBubbleLeftRight, path: '/direqt-messages' },
		{ label: 'Documents', icon: DocumentText, path: '/documents' },
		{ label: 'myEdOnline', icon: AcademicCap, path: '/myedonline' },
		{ label: 'Notices', icon: Bell, path: '/notices' },
		{ label: 'Portals', icon: RectangleStack, hasSub: true, path: '/portals' },
		{ label: 'Reports', icon: ChartBar, path: '/reports' },
		{ label: 'Settings', icon: Cog6Tooth, path: '/settings' },
		{ label: 'Timetable', icon: CalendarDays, path: '/timetable' }
	];
</script>

<div class="h-screen bg-[var(--surface)]" style="color: var(--text);">
	<!-- Top Bar -->
	<header class="flex fixed top-0 right-0 left-0 justify-between items-center place-items-center px-8 h-12" style="background: var(--surface); color: var(--text);">
		<span class="text-lg font-bold tracking-wide">TauriSEQTA</span>
		{#if !needsSetup}
			<button 
				on:click={handleLogout}
				class="px-4 py-1 rounded-lg font-semibold hover:scale-[1.02] transition"
				style="background: var(--surface-alt); color: var(--text);"
			>
				Logout
			</button>
		{/if}
	</header>

	<div class="flex pt-12 h-full">
		<!-- Sidebar -->
		<aside
			class="flex overflow-y-scroll flex-col px-2 pb-6 space-y-2 w-64 h-full"
			style="background: var(--surface); color: var(--text);"
		>
			{#each menu as item}
				<a href={item.path} class="flex items-center px-4 py-3 rounded hover:bg-[color:var(--surface-alt)] transition group">
					<Icon src={item.icon} class="mr-4 w-6 h-6" />
					<span class="text-base font-bold">{item.label}</span>
					{#if item.hasSub}
						<svg
							class="ml-auto w-4 h-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					{/if}
				</a>
			{/each}
		</aside>

		<!-- Main Content -->
		<div
			class="overflow-y-scroll flex-1 p-8 w-full h-full overflow-clip rounded-tl-2xl"
			style="background: var(--background); color: var(--text);"
		>
			<main class="mx-auto max-w-7xl"><slot /></main>
		</div>
	</div>

	<!-- First‑run overlay -->
	{#if needsSetup}
		<div class="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
			<div class="bg-[color:var(--surface)] rounded-2xl shadow-xl p-8 w-[26rem] max-w-full space-y-5">
				<h2 class="text-xl font-bold" style="color: var(--text);">Connect to your SEQTA instance</h2>
				<p class="text-sm" style="color: var(--text-muted);">
					Enter the full URL to your school's SEQTA page, then sign in in the window that opens. We'll
					securely save your session cookie.
				</p>
				<input
					type="text"
					bind:value={seqtaUrl}
					placeholder="https://schoolname.seqta.com"
					class="px-3 py-2 w-full rounded-lg border outline-none focus:ring"
					style="background: var(--surface-alt); color: var(--text); border-color: var(--surface-alt);"
				/>
				<button
					on:click={startLogin}
					class="w-full py-2 rounded-lg font-semibold hover:scale-[1.02] transition"
					style="background: #2563eb; color: white;"
				>
					Sign in
				</button>
			</div>
		</div>
	{/if}
</div> 