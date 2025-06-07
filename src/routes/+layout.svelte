<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { emit, listen } from '@tauri-apps/api/event'
	import { seqtaFetch } from '../utils/netUtil';
	import { cache } from '../utils/cache';

	import { onMount } from 'svelte';
	import '../app.css';
	import { accentColor, loadAccentColor, theme, loadTheme } from '../lib/stores/theme';
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
		ArrowLeftStartOnRectangle,
		ChartBar,
		Cog6Tooth,
		CalendarDays,
		GlobeAlt,
		ArrowRightOnRectangle,
		Bars3
	} from 'svelte-hero-icons';

	import { writable } from 'svelte/store';
	export const needsSetup = writable(false);

	let seqtaUrl = $state<string>('');
	let userInfo = $state<UserInfo>();
	let { children } = $props();

	let weatherEnabled = $state(false);
	let forceUseLocation = $state(true);
	let weatherCity = $state('');
	let weatherCountry = $state('');
	let weatherData: any = $state(null);
	let loadingWeather = $state(false);
	let weatherError = $state('');

	let isMobileMenuOpen = $state(false);
	let isMobile = $state(false);

	// Add hovered and selected state for login UI
	let hovered = $state<'extension' | 'web' | ''>('');
	let selected = $state<'extension' | 'web' | ''>('');

	async function checkSession() {
		const sessionExists = await invoke<boolean>('check_session_exists');
		needsSetup.set(!sessionExists);
		if (sessionExists) {
			loadUserInfo();
		}
	}

	onMount(checkSession);

	listen<string>('reload', (event) => {
		location.reload();
		checkSession();
	})

	async function startLogin() {
		if (!seqtaUrl) return;
		await invoke('create_login_window', { url: seqtaUrl });

		// Poll every 1.5 s until the cookie is saved (login window closes itself)
		const timer = setInterval(async () => {
			const sessionExists = await invoke<boolean>('check_session_exists');
			needsSetup.set(!sessionExists);
			if (sessionExists) clearInterval(timer);
		}, 1500);
	}

	async function getAPIData(url: string, parameters: Map<string, string>) {
		return await invoke('get_api_data', { url, parameters: Object.fromEntries(parameters) });
	}

	async function postAPIData(url: string, data: Map<string, string>) {
		return await invoke('post_api_data', { url, data: Object.fromEntries(data) });
	}

	async function handleLogout() {
		const success = await invoke('logout');
		if (success) {
			await checkSession();
		}
	}

	interface UserInfo {
		clientIP: string;
		email: string;
		id: number;
		lastAccessedTime: number;
		meta: {
			code: string;
			governmentID: string;
		};
		personUUID: string;
		saml: [{
			autologin: boolean;
			label: string;
			method: string;
			request: string;
			sigalg: URL;
			signature: string;
			slo: boolean;
			url: URL
		}];
		status: string;
		type: string;
		userCode: string;
		userDesc: string;
		userName: string;
	}

	async function loadUserInfo() {
		try {
			// Check cache first
			const cachedUserInfo = cache.get<UserInfo>('userInfo');
			if (cachedUserInfo) {
				userInfo = cachedUserInfo;
				return;
			}

			const res = await seqtaFetch('/seqta/student/login?', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: {}
			});
			userInfo = JSON.parse(res).payload;
			
			// Cache the user info for 5 minutes
			cache.set('userInfo', userInfo);
		} catch (e) {
			console.error('Failed to load user info:', e);
		}
	}

	async function loadWeatherSettings() {
		try {
			const settings = await invoke<{ weather_enabled: boolean, force_use_location: boolean, weather_city: string, weather_country?: string }>('get_settings');
			weatherEnabled = settings.weather_enabled ?? false;
			weatherCity = settings.weather_city ?? '';
			weatherCountry = settings.weather_country ?? '';
			forceUseLocation = settings.force_use_location ?? false;
		} catch (e) {
			weatherEnabled = false;
			weatherCity = '';
			weatherCountry = '';
		}
	}

	async function fetchWeatherWithIP() {
		if (!weatherEnabled) {
			weatherData = null;
			return;
		}

		// Check cache first
		const cachedWeather = cache.get<any>('weather');
		if (cachedWeather) {
			weatherData = cachedWeather;
			return;
		}

		loadingWeather = true;
		weatherError = '';

		try {
			let latitude: number, longitude: number, name: string, country: string;

			// Try IP-based geolocation
			try {
				const ipRes = await fetch('http://ip-api.com/json/');
				const ipJson = await ipRes.json();
				if (ipJson.status !== 'success') throw new Error('IP Geolocation failed');

				latitude = ipJson.lat;
				longitude = ipJson.lon;
				name = ipJson.city;
				country = ipJson.country;
			} catch (geoError) {
				// Fallback to manual location
				const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`);
				const geoJson = await geoRes.json();
				if (!geoJson.results || !geoJson.results.length) throw new Error('Location not found via fallback');

				({ latitude, longitude, name, country } = geoJson.results[0]);
			}

			const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
			const weatherJson = await weatherRes.json();

			weatherData = {
				...weatherJson.current_weather,
				location: name,
				country
			};

			// Cache weather data for 15 minutes
			cache.set('weather', weatherData, 15 * 60 * 1000);
		} catch (e) {
			console.log(e)
			weatherError = `Failed to load weather: ${e}`;
			weatherData = null;
		} finally {
			loadingWeather = false;
		}
	}

	async function fetchWeather() {
		if (!weatherEnabled || !weatherCity) {
			weatherData = null;
			return;
		}

		// Check cache first
		const cachedWeather = cache.get<any>('weather');
		if (cachedWeather) {
			weatherData = cachedWeather;
			return;
		}

		loadingWeather = true;
		weatherError = '';
		try {
			console.log(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`);
			const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`);
			const geoJson = await geoRes.json();
			if (!geoJson.results || !geoJson.results.length) throw new Error('Location not found');
			const { latitude, longitude, name, country } = geoJson.results[0];
			const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
			const weatherJson = await weatherRes.json();
			weatherData = {
				...weatherJson.current_weather,
				location: name,
				country
			};

			// Cache weather data for 15 minutes
			cache.set('weather', weatherData, 15 * 60 * 1000);
		} catch (e) {
			console.log(e)
			weatherError = `Failed to load weather: ${e}`;
			weatherData = null;
		} finally {
			loadingWeather = false;
		}
	}

	$effect(() => {
		// Update the root element's data attributes with the current accent color and theme
		document.documentElement.setAttribute('data-accent-color', '');
		document.documentElement.style.setProperty('--accent-color-value', $accentColor);
		document.documentElement.setAttribute('data-theme', $theme);
	});

	onMount(async () => {
		await Promise.all([
			checkSession(),
			loadWeatherSettings(),
			loadAccentColor(),
			loadTheme()
		]);
		if (weatherEnabled) {
			if (forceUseLocation) fetchWeather();
			else fetchWeatherWithIP();
		}
	});

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
			if (!isMobile) isMobileMenuOpen = false;
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		
		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});

	/* Sidebar menu items */
	const menu = [
		{ label: 'Home', icon: Home, path: '/' },
		{ label: 'News', icon: Newspaper, path: '/news' },
		{ label: 'Welcome', icon: UserGroup, path: '/welcome' },
		{ label: 'Assessments', icon: ClipboardDocumentList, hasSub: true, path: '/assessments' },
		{ label: 'Courses', icon: BookOpen, hasSub: true, path: '/courses' },
		{ label: 'Dashboard', icon: Squares2x2, path: '/dashboard' },
		{ label: 'Direqt Messages', icon: ChatBubbleLeftRight, path: '/direqt-messages' },
		{ label: 'Notices', icon: Bell, path: '/notices' },
		{ label: 'Reports', icon: ChartBar, path: '/reports' },
		{ label: 'Settings', icon: Cog6Tooth, path: '/settings' },
		{ label: 'Timetable', icon: CalendarDays, path: '/timetable' }
	];
</script>

<div class="flex flex-col md:flex-row pt-2 h-screen bg-slate-900" data-theme={$theme}>
	<!-- Mobile Menu Button -->
	<button 
		class="md:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
		onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
	>
		<Icon src={Bars3} class="w-6 h-6" />
	</button>

	<!-- Sidebar -->
	<aside
		class="flex flex-col justify-between px-2 pb-2 space-y-2 w-full md:w-64 h-full fixed md:relative transform transition-transform duration-300 ease-in-out z-40 bg-slate-900"
		class:translate-x-0={isMobileMenuOpen || !isMobile}
		class:-translate-x-full={!isMobileMenuOpen && isMobile}
	>
		<div class="flex overflow-y-scroll flex-col gap-2 h-full">
			<div class="flex sticky top-0 items-center px-4 pt-4 pb-2 w-full bg-slate-900">
				<img src="/32x32.png" alt="DesQTA Logo" class="mr-3 w-8 h-8 select-none" draggable="false" />
				<span class="text-lg font-bold tracking-wide">DesQTA</span>
			</div>
			{#each menu as item}
				<a 
					href={item.path} 
					class="flex items-center px-4 py-3 rounded transition-transform duration-300 hover:bg-slate-800 hover:scale-[1.03] group"
					onclick={() => isMobile && (isMobileMenuOpen = false)}
				>
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
			{#if weatherEnabled}
				<div class="my-4 mx-2 rounded-2xl shadow text-white p-4 flex flex-col justify-center animate-fade-in" style="background: linear-gradient(120deg, var(--accent-color-value) 0%, color-mix(in srgb, var(--accent-color-value) 70%, black) 100%);">
					{#if loadingWeather}
						<div>Loading weather…</div>
					{:else if weatherError}
						<div class="text-red-400">{weatherError}</div>
					{:else if weatherData}
						<div class="flex flex-col gap-1">
							<div class="text-base font-bold flex items-center gap-2">
								<span>Weather in {weatherData.location}, {weatherData.country}</span>
							</div>
							<div class="flex items-center gap-2 mt-2">
								<span class="text-2xl font-bold">{Math.round(weatherData.temperature)}°C</span>
								<span class="text-lg">{weatherData.weathercode === 0 ? '☀️' : weatherData.weathercode < 4 ? '🌤️' : weatherData.weathercode < 45 ? '☁️' : '🌧️'}</span>
								<span class="text-xs">{weatherData.windspeed} km/h wind</span>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		<div>
			<div class="flex justify-between">
				{#if userInfo}
					<div class="flex gap-3 items-center px-2 py-1 bg-transparent rounded-lg">
						<!-- Avatar with initials -->
						<div class="flex justify-center items-center w-8 h-8 text-base font-bold text-white rounded-full select-none" style="background-color: var(--accent-color-value);">
							{userInfo.userDesc?.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
						</div>
						<div class="flex flex-col flex-1 min-w-0">
							<div class="flex gap-2 items-center">
								<span class="text-base font-semibold truncate">{userInfo.userDesc}</span>
							</div>
							<div class="flex gap-2 items-center min-w-0 text-xs text-slate-400">
								<span class="font-mono">{userInfo.userCode}</span>
								<span>•</span>
								<span class="font-mono">{userInfo.meta.governmentID}</span>
							</div>
						</div>
					</div>
				{/if}
				{#if !$needsSetup}
					<button 
						onclick={handleLogout}
						class="px-2 py-1 font-semibold rounded-lg transition text-zinc-400 hover:text-zinc-50"
					>
						<Icon src={ArrowLeftStartOnRectangle} class="size-4" />
					</button>
				{/if}
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto bg-slate-950 rounded-tl-2xl">
		{#if $needsSetup}
			<style>
				.auth-header {
					width: 100%;
					text-align: center;
					font-size: 2.2rem;
					font-weight: 800;
					color: #fff;
					letter-spacing: 0.03em;
					margin-bottom: 2.5rem;
					margin-top: 2.5rem;
					z-index: 10;
					text-shadow: 0 2px 16px rgba(0,0,0,0.25);
				}
				.auth-panels {
					display: flex;
					width: 100%;
					height: 100vh;
					min-height: 600px;
					background: #111;
					position: relative;
				}
				.auth-panel {
					flex: 1 1 0%;
					transition: flex-basis 0.5s cubic-bezier(0.4,0,0.2,1), flex-grow 0.5s cubic-bezier(0.4,0,0.2,1), background 0.4s, box-shadow 0.4s;
					display: flex;
					align-items: center;
					justify-content: center;
					position: relative;
					cursor: pointer;
					min-width: 0;
					min-height: 0;
					overflow: hidden;
				}
				.auth-panel.ext {
					background: linear-gradient(120deg, rgba(36,99,235,0.25) 0%, rgba(36,99,235,0.10) 100%), rgba(0,0,0,0.7);
					backdrop-filter: blur(16px) saturate(1.2);
					box-shadow: 0 8px 32px 0 rgba(36,99,235,0.15);
				}
				.auth-panel.web {
					background: linear-gradient(120deg, rgba(139,92,246,0.25) 0%, rgba(139,92,246,0.10) 100%), rgba(0,0,0,0.7);
					backdrop-filter: blur(16px) saturate(1.2);
					box-shadow: 0 8px 32px 0 rgba(139,92,246,0.15);
				}
				.auth-panel .blur-overlay {
					position: absolute;
					top: 0; left: 0; right: 0; bottom: 0;
					background: linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%);
					backdrop-filter: blur(32px) saturate(1.2);
					z-index: 1;
					pointer-events: none;
				}
				.auth-panel > .panel-content {
					position: relative;
					z-index: 2;
					width: 100%;
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
				}
				.auth-panel.collapsed {
					flex-basis: 15%;
					flex-grow: 0;
					flex-shrink: 1;
					justify-content: center;
				}
				.auth-panel.expanded {
					flex-basis: 70%;
					flex-grow: 1;
					flex-shrink: 0;
					justify-content: center;
				}
				.auth-panel.full {
					flex-basis: 100%;
					flex-grow: 1;
					flex-shrink: 0;
					justify-content: center;
					z-index: 20;
					cursor: default;
				}
				.auth-panel.hide {
					flex-basis: 0%;
					flex-grow: 0;
					flex-shrink: 1;
					opacity: 0;
					pointer-events: none;
				}
				.auth-label {
					font-size: 2rem;
					font-weight: 700;
					letter-spacing: 0.1em;
					color: #fff;
					opacity: 0.7;
					user-select: none;
					text-align: center;
					writing-mode: vertical-rl;
					text-orientation: mixed;
				}
				.auth-panel.expanded .auth-label,
				.auth-panel.full .auth-label {
					writing-mode: initial;
					text-orientation: initial;
					font-size: 2rem;
					margin-bottom: 1.5rem;
				}
				.auth-panel.full .panel-content {
					align-items: center;
					justify-content: center;
				}
				.auth-backdrop {
					position: fixed;
					top: 0; left: 0; right: 0; bottom: 0;
					background: rgba(0,0,0,0.25);
					z-index: 15;
					transition: opacity 0.3s;
				}
				.auth-back-btn {
					position: absolute;
					top: 2rem;
					right: 2rem;
					background: rgba(0,0,0,0.5);
					color: #fff;
					border: none;
					border-radius: 0.5rem;
					padding: 0.5rem 1.2rem;
					font-size: 1rem;
					font-weight: 600;
					cursor: pointer;
					z-index: 30;
					box-shadow: 0 2px 8px rgba(0,0,0,0.15);
					transition: background 0.2s;
				}
				.auth-back-btn:hover {
					background: rgba(0,0,0,0.7);
				}
				@media (max-width: 900px) {
					.auth-header {
						font-size: 1.5rem;
						margin-bottom: 1.2rem;
						margin-top: 1.2rem;
					}
					.auth-panels {
						flex-direction: column;
						height: 100vh;
					}
					.auth-panel {
						min-height: 40vh;
						min-width: 100vw;
					}
					.auth-panel.collapsed {
						flex-basis: 15vh;
					}
					.auth-panel.expanded {
						flex-basis: 70vh;
					}
					.auth-panel.full {
						flex-basis: 100vh;
					}
					.auth-label {
						writing-mode: initial;
						font-size: 1.5rem;
					}
				}
			</style>
			<div class="auth-header">Choose Authentication Method</div>
			{#if selected}
				<div
					class="auth-backdrop"
					role="button"
					tabindex="0"
					onclick={() => selected = ''}
					onkeydown={e => (e.key === 'Enter' || e.key === ' ') && (selected = '')}
				></div>
			{/if}
			<div class="auth-panels">
				<!-- Extension Panel -->
				<div
					class="auth-panel ext {selected === 'extension' ? 'full' : selected === 'web' ? 'hide' : hovered === 'extension' ? 'expanded' : 'collapsed'}"
					onmouseenter={() => { if (!selected) hovered = 'extension'; }}
					onmouseleave={() => { if (!selected) hovered = ''; }}
					onclick={() => { if (!selected) selected = 'extension'; }}
					role="button"
					tabindex="0"
					onkeydown={e => (e.key === 'Enter' || e.key === ' ') && !selected && (selected = 'extension')}
				>
					<div class="blur-overlay"></div>
					<div class="panel-content">
						{#if selected === 'extension' || (!selected && hovered === 'extension')}
							{#if selected === 'extension'}
								<button class="auth-back-btn" onclick={() => selected = ''}>Back</button>
							{/if}
							<div class="auth-label">Extension Authentication</div>
							<div class="space-y-4 text-slate-100 mt-4">
								<p class="text-base">
									For the best experience, use our browser extension for seamless authentication and extra features.
								</p>
								<div>
									<h3 class="font-semibold mb-2">Supported Browsers:</h3>
									<ul class="list-disc list-inside space-y-2 text-base">
										<li>Google Chrome</li>
										<li>Mozilla Firefox</li>
									</ul>
								</div>
								<div>
									<h3 class="font-semibold mb-2">Features:</h3>
									<ul class="list-disc list-inside space-y-2 text-base">
										<li>Automatic session management</li>
										<li>Secure cookie handling</li>
										<li>Enhanced performance</li>
										<li>Additional browser integration features</li>
									</ul>
								</div>
								<p class="text-base text-slate-300">
									Don't have the extension? Use the web version instead.
								</p>
							</div>
						{:else}
							<div class="auth-label">Extension</div>
						{/if}
					</div>
				</div>
				<!-- Web Auth Panel -->
				<div
					class="auth-panel web {selected === 'web' ? 'full' : selected === 'extension' ? 'hide' : hovered === 'web' ? 'expanded' : 'collapsed'}"
					onmouseenter={() => { if (!selected) hovered = 'web'; }}
					onmouseleave={() => { if (!selected) hovered = ''; }}
					onclick={() => { if (!selected) selected = 'web'; }}
					role="button"
					tabindex="0"
					onkeydown={e => (e.key === 'Enter' || e.key === ' ') && !selected && (selected = 'web')}
				>
					<div class="blur-overlay"></div>
					<div class="panel-content">
						{#if selected === 'web' || (!selected && hovered === 'web')}
							{#if selected === 'web'}
								<button class="auth-back-btn" onclick={() => selected = ''}>Back</button>
							{/if}
							<div style="width:100%;max-width:480px;padding:2.5rem;">
								<div class="auth-label">Web Authentication</div>
								<p class="text-base mb-4">
									Enter the full URL to your school's SEQTA page, then sign in in the window that opens. We'll securely save your session cookie.
								</p>
								<div style="width:100%;max-width:400px;display:flex;flex-direction:column;align-items:center;gap:1rem;">
									<div class="flex items-center w-full mb-2">
										<Icon src={GlobeAlt} class="mr-2 w-5 h-5" />
										<input
											type="text"
											bind:value={seqtaUrl}
											placeholder="https://schoolname.seqta.com"
											class="px-3 py-2 flex-1 rounded-lg border outline-none focus:ring border-slate-800 bg-slate-800/40"
										/>
									</div>
									<button
										onclick={startLogin}
										class="flex justify-center items-center py-2 w-11/12 font-semibold rounded-lg transition-transform duration-300"
										style="background: #8b5cf6; color: white;"
									>
										<Icon src={ArrowRightOnRectangle} class="mr-2 w-5 h-5" />
										Sign in with Web
									</button>
								</div>
							</div>
						{:else}
							<div class="auth-label">Web</div>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>

<!-- Mobile Menu Overlay -->
{#if isMobile && isMobileMenuOpen}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-30"
		onclick={() => isMobileMenuOpen = false}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && (isMobileMenuOpen = false)}
	></div>
{/if} 
