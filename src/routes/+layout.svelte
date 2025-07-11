<script lang="ts">
  import { listen } from '@tauri-apps/api/event';
  import { invoke } from '@tauri-apps/api/core';
  import AboutModal from '../lib/components/AboutModal.svelte';
  import AppHeader from '../lib/components/AppHeader.svelte';
  import AppSidebar from '../lib/components/AppSidebar.svelte';
  import LoginScreen from '../lib/components/LoginScreen.svelte';
  import { authService, type UserInfo } from '../lib/services/authService';
  import { weatherService, type WeatherData } from '../lib/services/weatherService';
  import { errorService } from '../lib/services/errorService';

  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import { accentColor, loadAccentColor, theme, loadTheme, loadCurrentTheme } from '../lib/stores/theme';
  import { Icon } from 'svelte-hero-icons';
  import {
    Home,
    Newspaper,
    ClipboardDocumentList,
    BookOpen,
    ChatBubbleLeftRight,
    DocumentText,
    AcademicCap,
    ChartBar,
    Cog6Tooth,
    CalendarDays,
    User,
  } from 'svelte-hero-icons';

  import { writable } from 'svelte/store';
  import { seqtaFetch } from '../utils/netUtil';
  import LoadingScreen from '../lib/components/LoadingScreen.svelte';
  import { page } from '$app/stores';
  export const needsSetup = writable(false);

  let seqtaUrl = $state<string>('');
  let userInfo = $state<UserInfo | undefined>(undefined);
  let { children } = $props();

  let weatherEnabled = $state(false);
  let forceUseLocation = $state(true);
  let weatherCity = $state('');
  let weatherCountry = $state('');
  let weatherData = $state<WeatherData | null>(null);
  let loadingWeather = $state(false);
  let weatherError = $state('');

  let isMobileMenuOpen = $state(false);
  let isMobile = $state(false);

  let sidebarOpen = $state(true);
  let isDarkMode = $derived($theme === 'dark');
  let notifications = $state([]);
  let unreadNotifications = $state(0);

  let showUserDropdown = $state(false);
  let showAboutModal = $state(false);
  let isLoading = $state(true);

  let disableSchoolPicture = $state(false);

  let enhancedAnimations = $state(true);
  let autoCollapseSidebar = $state(false);
  let autoExpandSidebarHover = $state(false);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.user-dropdown-container')) {
      showUserDropdown = false;
    }
  }

  async function checkSession() {
    const sessionExists = await authService.checkSession();
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

  // Function to reload enhanced animations setting
  async function reloadEnhancedAnimationsSetting() {
    try {
      const settings = await invoke<{ enhanced_animations?: boolean }>('get_settings');
      enhancedAnimations = settings.enhanced_animations ?? true;
      console.log('Enhanced animations setting reloaded:', enhancedAnimations);
    } catch (e) {
      console.error('Failed to reload enhanced animations setting:', e);
    }
  }

  // Function to reload auto collapse sidebar setting
  async function reloadAutoCollapseSidebarSetting() {
    try {
      const settings = await invoke<{ auto_collapse_sidebar?: boolean }>('get_settings');
      autoCollapseSidebar = settings.auto_collapse_sidebar ?? false;
      console.log('Auto collapse sidebar setting reloaded:', autoCollapseSidebar);
    } catch (e) {
      console.error('Failed to reload auto collapse sidebar setting:', e);
    }
  }

  // Function to reload auto expand sidebar hover setting
  async function reloadAutoExpandSidebarHoverSetting() {
    try {
      const settings = await invoke<{ auto_expand_sidebar_hover?: boolean }>('get_settings');
      autoExpandSidebarHover = settings.auto_expand_sidebar_hover ?? false;
      console.log('Auto expand sidebar hover setting reloaded:', autoExpandSidebarHover);
    } catch (e) {
      console.error('Failed to reload auto expand sidebar hover setting:', e);
    }
  }

  // Function to handle page navigation with auto-collapse
  function handlePageNavigation() {
    if (autoCollapseSidebar) {
      sidebarOpen = false;
    }
  }

  // Function to handle mouse hover for auto-expand
  function handleMouseMove(event: MouseEvent) {
    if (autoExpandSidebarHover && !isMobile) {
      const x = event.clientX;
      
      if (!sidebarOpen && x <= 20) {
        // Expand sidebar when hovering near left edge
        sidebarOpen = true;
      } else if (sidebarOpen && x > 280) {
        // Collapse sidebar when mouse moves away from sidebar area (sidebar width is ~256px + some buffer)
        sidebarOpen = false;
      }
    }
  }

  async function startLogin() {
    if (!seqtaUrl) return;
    await authService.startLogin(seqtaUrl);

    const timer = setInterval(async () => {
      const sessionExists = await authService.checkSession();
      if (sessionExists) {
        clearInterval(timer);
        needsSetup.set(false);
        await loadUserInfo();
      }
    }, 1000);

    setTimeout(() => clearInterval(timer), 5 * 60 * 1000);
  }

  async function handleLogout() {
    const success = await authService.logout();
    if (success) {
      await checkSession();
    }
  }

  async function loadSettingsForUserPicture() {
    try {
      const settings = await invoke<{
        disable_school_picture?: boolean;
      }>('get_settings');
      console.log('Loaded settings for user picture:', settings);
      disableSchoolPicture = settings.disable_school_picture ?? false;
      console.log('disableSchoolPicture set to:', disableSchoolPicture);
    } catch (e) {
      console.error('Failed to load settings for user picture:', e);
      disableSchoolPicture = false;
    }
  }

  async function loadUserInfo() {
    await loadSettingsForUserPicture();
    userInfo = await authService.loadUserInfo({ disableSchoolPicture });
  }

  async function loadWeatherSettings() {
    const settings = await weatherService.loadWeatherSettings();
    weatherEnabled = settings.weather_enabled;
    weatherCity = settings.weather_city;
    weatherCountry = settings.weather_country ?? '';
    forceUseLocation = settings.force_use_location;
  }

  async function fetchWeatherWithIP() {
    if (!weatherEnabled) {
      weatherData = null;
      return;
    }

    loadingWeather = true;
    weatherError = '';

    try {
      weatherData = await weatherService.fetchWeatherWithIP();
    } catch (e) {
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

    loadingWeather = true;
    weatherError = '';
    try {
      weatherData = await weatherService.fetchWeather(weatherCity, weatherCountry);
    } catch (e) {
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

  async function loadEnhancedAnimationsSetting() {
    try {
      const settings = await invoke<{ enhanced_animations?: boolean }>('get_settings');
      enhancedAnimations = settings.enhanced_animations ?? true;
      console.log('Enhanced animations setting loaded:', enhancedAnimations);
    } catch (e) {
      console.error('Failed to load enhanced animations setting:', e);
      enhancedAnimations = true;
    }
  }

  $effect(() => {
    console.log('Enhanced animations effect triggered:', enhancedAnimations);
    if (enhancedAnimations) {
      document.body.classList.add('enhanced-animations');
    } else {
      document.body.classList.remove('enhanced-animations');
    }
  });

  onMount(async () => {
    await Promise.all([
      checkSession(),
      loadWeatherSettings(),
      loadAccentColor(),
      loadTheme(),
      loadCurrentTheme(),
      loadEnhancedAnimationsSetting(),
      reloadAutoCollapseSidebarSetting(),
      reloadAutoExpandSidebarHoverSetting()
    ]);
    if (weatherEnabled) {
      if (forceUseLocation) fetchWeather();
      else fetchWeatherWithIP();
    }

    // Check SEQTA cookie/session on app launch
    if (!($needsSetup)) {
      try {
        const appUrl = seqtaUrl || 'https://learn.cardijn.catholic.edu.au/#?page=/home';
        const response = await seqtaFetch('/seqta/student/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            mode: 'normal',
            query: null,
            redirect_url: appUrl,
          },
        });
        // Debug: log the raw response
        console.debug('SEQTA session check response:', response);
        const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
        const foundAbbrev = responseStr.includes('site.name.abbrev');
        console.debug('Contains site.name.abbrev:', foundAbbrev);
        if (foundAbbrev) {
          console.debug('Triggering handleLogout() due to detected logout');
          await handleLogout();
        }
      } catch (e) {
        console.error('SEQTA session check failed', e);
      }
    }
    isLoading = false;
  });

  // Effect to handle page navigation and auto-collapse sidebar
  $effect(() => {
    if (autoCollapseSidebar) {
      handlePageNavigation();
    }
  });

  // Reload auto collapse sidebar setting when navigating to settings
  $effect(() => {
    if ($page.url.pathname === '/settings') {
      reloadAutoCollapseSidebarSetting();
      reloadAutoExpandSidebarHoverSetting();
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
    
    // Add mouse event listeners for auto-expand hover
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('mousemove', handleMouseMove);
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
    { label: 'Directory', icon: User, path: '/directory' },
    { label: 'Reports', icon: ChartBar, path: '/reports' },
    { label: 'Settings', icon: Cog6Tooth, path: '/settings' },
    { label: 'Analytics', icon: AcademicCap, path: '/analytics' },
  ];
</script>

{#if isLoading}
  <LoadingScreen />
{:else}
  <div class="flex flex-col h-screen">
    <AppHeader
      {sidebarOpen}
      {weatherEnabled}
      {weatherData}
      {userInfo}
      {showUserDropdown}
      onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
      onToggleUserDropdown={() => (showUserDropdown = !showUserDropdown)}
      onLogout={handleLogout}
      onShowAbout={() => (showAboutModal = true)}
      onClickOutside={handleClickOutside}
      disableSchoolPicture={disableSchoolPicture}
    />

    <div class="flex flex-1 min-h-0">
      <AppSidebar {sidebarOpen} {menu} onMenuItemClick={handlePageNavigation} />

      <main
        class="overflow-y-auto flex-1 border-t border-l border-slate-200 dark:border-slate-700/50"
        style="background: var(--background-color);">
        {#if $needsSetup}
          <LoginScreen
            {seqtaUrl}
            onStartLogin={startLogin}
            onUrlChange={(url) => (seqtaUrl = url)}
          />
        {:else}
          {@render children()}
        {/if}
      </main>
    </div>
  </div>
{/if}

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
