<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { Window } from '@tauri-apps/api/window';
  import { seqtaFetch } from '../utils/netUtil';

  import { cache } from '../utils/cache';
  import AboutModal from '../lib/components/AboutModal.svelte';

  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import { page } from '$app/stores';
  import { accentColor, loadAccentColor, theme, loadTheme } from '../lib/stores/theme';
  import {
    Icon,
    Home,
    Newspaper,
    ClipboardDocumentList,
    BookOpen,
    ChatBubbleLeftRight,
    DocumentText,
    AcademicCap,
    Bell,
    ChartBar,
    Cog6Tooth,
    CalendarDays,
    ArrowRightOnRectangle,
    Bars3,
    XMark,
    Minus,
    Square2Stack,
  } from 'svelte-hero-icons';
  import { fly } from 'svelte/transition';

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

  let hovered = $state<'extension' | 'web' | ''>('');
  let selected = $state<'extension' | 'web' | ''>('');

  let sidebarOpen = $state(true);
  let isDarkMode = $derived($theme === 'dark');
  let notifications = $state([]);
  let unreadNotifications = $state(0);

  let showUserDropdown = $state(false);
  let showAboutModal = $state(false);
  let aboutClosing = $state(false);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.user-dropdown-container')) {
      showUserDropdown = false;
    }
  }

  async function checkSession() {
    const sessionExists = await invoke<boolean>('check_session_exists');
    needsSetup.set(!sessionExists);
    if (sessionExists) {
      loadUserInfo();
    }
  }

  onMount(checkSession);

  let unlisten: (() => void) | undefined;
  onMount(async () => {
    unlisten = await listen<string>('reload', () => {
      location.reload();
    });
  });

  onDestroy(() => {
    if (unlisten) unlisten();
  });

  async function startLogin() {
    if (!seqtaUrl) return;
    await invoke('create_login_window', { url: seqtaUrl });

    const timer = setInterval(async () => {
      const sessionExists = await invoke<boolean>('check_session_exists');
      if (sessionExists) {
        clearInterval(timer);
        needsSetup.set(false);
        await loadUserInfo();
      }
    }, 1000);

    setTimeout(() => clearInterval(timer), 5 * 60 * 1000);
  }

  async function getAPIData(url: string, parameters: Map<string, string>) {
    return await invoke('get_api_data', {
      url,
      parameters: Object.fromEntries(parameters),
    });
  }

  async function postAPIData(url: string, data: Map<string, string>) {
    return await invoke('post_api_data', {
      url,
      data: Object.fromEntries(data),
    });
  }

  async function handleLogout() {
    const success = await invoke('logout');
    if (success) {
      await checkSession();
    }
  }

  // Window controls
  const appWindow = Window.getCurrent();

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
    saml: [
      {
        autologin: boolean;
        label: string;
        method: string;
        request: string;
        sigalg: URL;
        signature: string;
        slo: boolean;
        url: URL;
      },
    ];
    status: string;
    type: string;
    userCode: string;
    userDesc: string;
    userName: string;
    displayName?: string;
    profilePicture?: string;
  }

  function binaryStringToBase64(binaryStr: string): string {
    let bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i) & 0xFF;
    }

    // Convert to binary string for btoa (this part is safe now)
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}

  async function loadUserInfo() {
    try {
      const cachedUserInfo = cache.get<UserInfo>('userInfo');
      if (cachedUserInfo) {
        userInfo = cachedUserInfo;
        return;
      }

      const res = await seqtaFetch('/seqta/student/login?', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {},
      });
      userInfo = JSON.parse(res).payload;

      let profileImage = await seqtaFetch(`/seqta/student/photo/get`, { params: { uuid: userInfo!.personUUID, format: 'low' }, is_image: true });
      userInfo!.profilePicture = `data:image/png;base64,${profileImage}`;

      cache.set('userInfo', userInfo); // hi
    } catch (e) {
      console.error('Failed to load user info:', e);
    }
  }

  async function loadWeatherSettings() {
    try {
      const settings = await invoke<{
        weather_enabled: boolean;
        force_use_location: boolean;
        weather_city: string;
        weather_country?: string;
      }>('get_settings');
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

    const cachedWeather = cache.get<any>('weather');
    if (cachedWeather) {
      weatherData = cachedWeather;
      return;
    }

    loadingWeather = true;
    weatherError = '';

    try {
      let latitude: number, longitude: number, name: string, country: string;

      try {
        const ipRes = await fetch('http://ip-api.com/json/');
        const ipJson = await ipRes.json();
        if (ipJson.status !== 'success') throw new Error('IP Geolocation failed');

        latitude = ipJson.lat;
        longitude = ipJson.lon;
        name = ipJson.city;
        country = ipJson.country;
      } catch (geoError) {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`,
        );
        const geoJson = await geoRes.json();
        if (!geoJson.results || !geoJson.results.length)
          throw new Error('Location not found via fallback');

        ({ latitude, longitude, name, country } = geoJson.results[0]);
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
      );
      const weatherJson = await weatherRes.json();

      weatherData = {
        ...weatherJson.current_weather,
        location: name,
        country,
      };

      cache.set('weather', weatherData, 15 * 60 * 1000);
    } catch (e) {
      console.log(e);
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

    const cachedWeather = cache.get<any>('weather');
    if (cachedWeather) {
      weatherData = cachedWeather;
      return;
    }

    loadingWeather = true;
    weatherError = '';
    try {
      console.log(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`,
      );
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&countryCode=${encodeURIComponent(weatherCountry)}&count=1&language=en&format=json`,
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

      cache.set('weather', weatherData, 15 * 60 * 1000);
    } catch (e) {
      console.log(e);
      weatherError = `Failed to load weather: ${e}`;
      weatherData = null;
    } finally {
      loadingWeather = false;
    }
  }

  $effect(() => {
    document.documentElement.setAttribute('data-accent-color', '');
    document.documentElement.style.setProperty('--accent-color-value', $accentColor);
  });

  onMount(async () => {
    await Promise.all([checkSession(), loadWeatherSettings(), loadAccentColor(), loadTheme()]);
    if (weatherEnabled) {
      if (forceUseLocation) fetchWeather();
      else fetchWeatherWithIP();
    }
  });

  onMount(() => {
    const checkMobile = () => {
      isMobile = window.innerWidth < 768;
      if (isMobile) {
        sidebarOpen = false;
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  const menu = [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Courses', icon: BookOpen, path: '/courses' },
    { label: 'Assessments', icon: ClipboardDocumentList, path: '/assessments' },
    { label: 'Timetable', icon: CalendarDays, path: '/timetable' },
    { label: 'Messages', icon: ChatBubbleLeftRight, path: '/direqt-messages' },
    { label: 'Notices', icon: DocumentText, path: '/notices' },
    { label: 'News', icon: Newspaper, path: '/news' },
    { label: 'Reports', icon: ChartBar, path: '/reports' },
    { label: 'Settings', icon: Cog6Tooth, path: '/settings' },
    { label: 'Analytics', icon: AcademicCap, path: '/analytics' },
  ];
</script>

<div class="flex flex-col h-screen">
  <!-- Top Bar with integrated window controls -->
  <header class="flex justify-between items-center px-3 pr-2 w-full h-16 bg-white dark:bg-slate-950 relative z-[999999]" data-tauri-drag-region>
    <div class="flex items-center space-x-4">
      <button
        class="flex justify-center items-center w-10 h-10 rounded-xl transition-all duration-200 bg-slate-100 hover:accent-bg dark:bg-slate-800 focus:outline-none focus:ring-2 accent-ring"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        aria-label="Toggle sidebar">
        <Icon src={Bars3} class="w-5 h-5 text-slate-700 dark:text-slate-300 hover:text-white" />
      </button>
      <div class="flex items-center space-x-3">
        <img src="/betterseqta-dark-icon.png" alt="DesQTA" class="w-8 h-8 invert dark:invert-0" />
        <h1
          class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
          DesQTA
        </h1>
      </div>
      {#if weatherEnabled && weatherData}
        <div
          class="flex gap-3 items-center px-4 py-2 ml-4 text-sm font-medium rounded-xl border backdrop-blur-md bg-white/60 border-slate-200/40 dark:bg-slate-800/60 dark:border-slate-700/40">
          <div class="flex gap-2 items-center">
            <div
              class="flex justify-center items-center w-6 h-6 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                {#if weatherData.weathercode === 0}
                  <!-- Clear -->
                  <circle cx="12" cy="12" r="8" fill="#facc15" />
                {:else if weatherData.weathercode === 1 || weatherData.weathercode === 2}
                  <!-- Partly Cloudy -->
                  <ellipse cx="12" cy="15" rx="7" ry="4" fill="#a3a3a3" />
                  <circle cx="16" cy="10" r="5" fill="#facc15" />
                {:else}
                  <!-- Cloudy/Other -->
                  <ellipse cx="12" cy="15" rx="7" ry="4" fill="#a3a3a3" />
                {/if}
              </svg>
            </div>
            <span class="font-semibold text-slate-900 dark:text-white"
              >{Math.round(weatherData.temperature)}°C</span>
          </div>
          <span class="hidden text-slate-600 sm:inline dark:text-slate-400"
            >{weatherData.location}</span>
        </div>
      {/if}
    </div>

    <div class="flex items-center space-x-2">
      <button
        class="flex relative justify-center items-center rounded-xl border transition-all duration-200 size-12 bg-white/60 border-slate-200/40 hover:accent-bg dark:bg-slate-800/60 dark:border-slate-700/40 focus:outline-none focus:ring-2 accent-ring"
        onclick={() => (notifications = [])}>
        <Icon src={Bell} class="w-5 h-5 text-slate-700 dark:text-slate-300 hover:text-white" />
        {#if unreadNotifications > 0}
          <span
            class="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadNotifications}
          </span>
        {/if}
      </button>

      {#if userInfo}
        <div class="relative user-dropdown-container">
          <button
            class="flex gap-3 items-center px-4 py-2 rounded-xl border transition-all duration-200 bg-white/60 border-slate-200/40 hover:accent-bg dark:bg-slate-800/60 dark:border-slate-700/40 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
            onclick={() => (showUserDropdown = !showUserDropdown)}
            aria-label="User menu"
            tabindex="0">
            <img
              src={userInfo.profilePicture}
              alt=""
              class="object-cover w-8 h-8 rounded-full border-2 shadow-sm border-white/60 dark:border-slate-600/60" />
            <span class="hidden font-semibold text-slate-900 md:inline dark:text-white">
              {userInfo.userDesc || userInfo.userName}
            </span>
          </button>
          {#if showUserDropdown}
            <div
              class="absolute right-0 z-50 mt-3 w-56 rounded-2xl border shadow-2xl backdrop-blur-md bg-white/95 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-700/40"
              transition:fly={{ y: -8, duration: 200, opacity: 0 }}>
              <div class="p-2">
                <button
                  class="flex gap-3 items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:accent-bg hover:text-white dark:text-slate-200 group"
                  onclick={() => {
                    showUserDropdown = false;
                    showAboutModal = true;
                  }}>
                  <div
                    class="flex justify-center items-center w-8 h-8 rounded-lg transition-colors bg-slate-100 group-hover:bg-white/20 dark:bg-slate-700/50">
                    <svg
                      class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <div class="font-medium">About</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 group-hover:text-white/80">App information</div>
                  </div>
                </button>

                <div class="my-2 border-t border-slate-200 dark:border-slate-700/40"></div>

                <button
                  class="flex gap-3 items-center px-4 py-3 w-full text-left rounded-xl transition-all duration-200 text-slate-700 hover:accent-bg hover:text-white dark:text-slate-200 group"
                  onclick={() => {
                    showUserDropdown = false;
                    handleLogout();
                  }}>
                  <div
                    class="flex justify-center items-center w-8 h-8 rounded-lg transition-colors bg-slate-100 group-hover:bg-white/20 dark:bg-slate-700/50">
                    <Icon
                      src={ArrowRightOnRectangle}
                      class="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-white" />
                  </div>
                  <div class="flex-1">
                    <div class="font-medium">Sign out</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 group-hover:text-white/80">End your session</div>
                  </div>
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Window Controls -->
      <div class="flex items-center ml-4 space-x-2">
        <button
          class="flex justify-center items-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 accent-ring"
          onclick={() => appWindow.minimize()}
          aria-label="Minimize">
          <Icon src={Minus} class="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <button
          class="flex justify-center items-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 accent-ring"
          onclick={() => appWindow.toggleMaximize()}
          aria-label="Maximize">
          <Icon src={Square2Stack} class="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <button
          class="flex justify-center items-center w-8 h-8 rounded-lg transition-all duration-200 group hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onclick={() => appWindow.close()}
          aria-label="Close">
          <Icon src={XMark} class="w-4 h-4 transition duration-200 text-slate-600 dark:text-slate-400 group-hover:text-white" />
        </button>
      </div>
    </div>
  </header>

  <div class="flex flex-1 min-h-0">
    <!-- Sidebar -->
    <aside
      class="overflow-hidden transition-all duration-300 ease-in-out"
      class:w-64={sidebarOpen}
      class:w-0={!sidebarOpen}>
      <nav class="p-3 py-[1px] space-y-2 w-64 min-w-64">
        {#each menu as item}
          <a
            href={item.path}
            class="flex gap-4 items-center text-md px-3 py-3 font-medium rounded-xl transition-all duration-200 hover:bg-accent-100 hover:text-slate-900 dark:hover:bg-accent-600 dark:hover:text-white focus:outline-none {(
              item.path === '/'
                ? $page.url.pathname === '/'
                : $page.url.pathname.startsWith(item.path)
            )
              ? 'bg-accent text-white'
              : 'text-slate-900 dark:text-slate-300'}">
            <Icon
              src={item.icon}
              class="w-6 h-6 {(
                item.path === '/'
                  ? $page.url.pathname === '/'
                  : $page.url.pathname.startsWith(item.path)
              )
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400'}" />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <!-- Main Content -->
    <main
      class="overflow-y-auto flex-1 rounded-tl-2xl border-t border-l border-slate-200 bg-slate-100/50 dark:border-slate-700/50 dark:bg-slate-900/50">
      {#if $needsSetup}
        <div class="flex justify-center items-center p-6 h-full">
          <div
            class="flex overflow-hidden flex-col w-full max-w-6xl rounded-3xl border shadow-2xl backdrop-blur-xl bg-white/80 border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 md:flex-row animate-fade-in-up"
            style="box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <!-- Left side - Image and branding -->
            <div class="hidden relative md:block md:w-2/3">
              <div
                class="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-500/10 dark:to-purple-500/10">
              </div>
              <img
                src="/images/signin.jpg"
                alt="Sign in"
                class="object-cover w-full h-full min-h-[600px]" />
              <div
                class="flex absolute inset-0 flex-col justify-end p-8 bg-gradient-to-t to-transparent from-black/50">
                <h1 class="mb-4 text-4xl font-bold text-white">Welcome to DesQTA</h1>
                <p class="text-lg text-slate-200">
                  Experience SEQTA Learn like never before with our powerful desktop application
                </p>
              </div>
            </div>

            <!-- Right side - Login form -->
            <div class="flex flex-col justify-center p-8 w-full md:w-1/3 md:p-12">
              <div class="mb-8 text-center md:hidden">
                <h1 class="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
                  Welcome to DesQTA
                </h1>
                <p class="text-slate-600 dark:text-slate-300">
                  Experience SEQTA Learn like never before with our powerful desktop application
                </p>
              </div>

              <div class="space-y-6">
                <div>
                  <label
                    for="seqta-url"
                    class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    SEQTA URL
                  </label>
                  <div class="relative">
                    <div
                      class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
                      <svg
                        class="w-5 h-5 text-slate-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                          clip-rule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="seqta-url"
                      type="text"
                      bind:value={seqtaUrl}
                      placeholder="your-school.seqta.com.au"
                      class="py-3 pr-4 pl-10 w-full rounded-lg border transition-colors text-slate-900 bg-slate-50 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>
                  <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Enter your school's SEQTA URL to get started
                  </p>
                </div>

                <button
                  class="py-3 w-full text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  onclick={startLogin}
                  disabled={!seqtaUrl}>
                  Sign In
                </button>

                <div class="text-center">
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    Need help? <a
                      href="https://github.com/betterseqta/desqta"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-indigo-600 dark:text-indigo-400 hover:underline">Visit GitHub</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        {@render children()}
      {/if}
    </main>
  </div>
</div>

<!-- Mobile Menu Overlay -->
{#if isMobileMenuOpen}
  <div
    class="fixed inset-0 z-40 bg-black/50"
    onclick={() => (isMobileMenuOpen = false)}
    onkeydown={(e) => e.key === 'Escape' && (isMobileMenuOpen = false)}
    role="button"
    tabindex="0"
    aria-label="Close mobile menu">
  </div>
{/if}

<!-- About Modal -->
<AboutModal bind:open={showAboutModal} onclose={() => (showAboutModal = false)} />