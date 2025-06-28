<script lang="ts">
  import { Window } from '@tauri-apps/api/window';
  import WeatherWidget from './WeatherWidget.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import {
    Icon,
    Bars3,
    Bell,
    Minus,
    Square2Stack,
    XMark
  } from 'svelte-hero-icons';

  interface Props {
    sidebarOpen: boolean;
    weatherEnabled: boolean;
    weatherData: any;
    userInfo?: UserInfo;
    notifications: any[];
    unreadNotifications: number;
    showUserDropdown: boolean;
    onToggleSidebar: () => void;
    onToggleUserDropdown: () => void;
    onClearNotifications: () => void;
    onLogout: () => void;
    onShowAbout: () => void;
    onClickOutside: (event: MouseEvent) => void;
    disableSchoolPicture?: boolean;
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

  let {
    sidebarOpen,
    weatherEnabled,
    weatherData,
    userInfo,
    notifications,
    unreadNotifications,
    showUserDropdown,
    onToggleSidebar,
    onToggleUserDropdown,
    onClearNotifications,
    onLogout,
    onShowAbout,
    onClickOutside,
    disableSchoolPicture = false
  }: Props = $props();

  const appWindow = Window.getCurrent();
</script>

<header class="flex justify-between items-center px-3 pr-2 w-full h-16 bg-white dark:bg-slate-950 relative z-[999999]" data-tauri-drag-region>
  <div class="flex items-center space-x-4">
    <button
      class="flex justify-center items-center w-10 h-10 rounded-xl transition-all duration-200 bg-slate-100 hover:accent-bg dark:bg-slate-800 focus:outline-none focus:ring-2 accent-ring"
      onclick={onToggleSidebar}
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
      <WeatherWidget {weatherData} />
    {/if}
  </div>

  <div class="flex items-center space-x-2">
    <button
      class="flex relative justify-center items-center rounded-xl border transition-all duration-200 size-12 bg-white/60 border-slate-200/40 hover:accent-bg dark:bg-slate-800/60 dark:border-slate-700/40 focus:outline-none focus:ring-2 accent-ring"
      onclick={onClearNotifications}>
      <Icon src={Bell} class="w-5 h-5 text-slate-700 dark:text-slate-300 hover:text-white" />
      {#if unreadNotifications > 0}
        <span
          class="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadNotifications}
        </span>
      {/if}
    </button>

    {#if userInfo}
      <UserDropdown
        {userInfo}
        {showUserDropdown}
        {onToggleUserDropdown}
        {onLogout}
        {onShowAbout}
        {onClickOutside}
        disableSchoolPicture={disableSchoolPicture}
      />
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