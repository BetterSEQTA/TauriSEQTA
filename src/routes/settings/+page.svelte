<script lang="ts">
import { onMount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { notify } from '../../utils/notify';
import { accentColor, loadAccentColor, updateAccentColor, theme, loadTheme, updateTheme } from '../../lib/stores/theme';
import { Icon } from 'svelte-hero-icons';
import { Plus, ArrowPath, Trash, Rss, Sun, Moon } from 'svelte-hero-icons';

interface Shortcut {
  name: string;
  icon: string;
  url: string;
}

interface Feed {
  url: string;
}

let shortcuts: Shortcut[] = [];
let loading = true;
let saving = false;
let saveSuccess = false;
let saveError = '';
let weatherEnabled = false;
let forceUseLocation = false;
let weatherCity = '';
let feeds: Feed[] = []; 
let weatherCountry = '';

let remindersEnabled = true;

async function loadSettings() {
  loading = true;
  try {
    const settings = await invoke<{ shortcuts: Shortcut[], feeds: any[], weather_enabled: boolean, weather_city: string, weather_country: string, reminders_enabled: boolean, force_use_location: boolean, accent_color: string, theme: 'light' | 'dark'}>('get_settings');
    shortcuts = settings.shortcuts || [];
    feeds = settings.feeds || [];
    weatherEnabled = settings.weather_enabled ?? false;
    forceUseLocation = settings.force_use_location ?? false;
    weatherCity = settings.weather_city ?? '';
    weatherCountry = settings.weather_country ?? '';
    remindersEnabled = settings.reminders_enabled ?? true;
    accentColor.set(settings.accent_color ?? '#3b82f6');
    theme.set(settings.theme ?? 'dark');

    console.log('Loading settings', {
      shortcuts,
      weatherEnabled,
      weatherCity,
      weatherCountry,
      remindersEnabled,
      forceUseLocation,
      theme: settings.theme
    });
  } catch (e) {
    shortcuts = [];
    feeds = [];
    weatherEnabled = false;
    forceUseLocation = false;
    weatherCity = '';
    weatherCountry = '';
    remindersEnabled = true;
    accentColor.set('#3b82f6');
    theme.set('dark');
  }
  loading = false;
}

async function saveSettings() {
  saving = true;
  saveSuccess = false;
  saveError = '';
  console.log('Saving settings', {
    shortcuts,
    feeds,
    weatherEnabled,
    weatherCity,
    weatherCountry,
    remindersEnabled,
    forceUseLocation,
    theme: $theme
  });
  try {
    await invoke('save_settings', { 
      newSettings: { 
        shortcuts,
        feeds, 
        weather_enabled: weatherEnabled, 
        weather_city: weatherCity, 
        weather_country: weatherCountry, 
        reminders_enabled: remindersEnabled, 
        force_use_location: forceUseLocation,
        accent_color: $accentColor,
        theme: $theme
      }
    });
    saveSuccess = true;
    setTimeout(() => location.reload(), 1500)
  } catch (e) {
    saveError = 'Failed to save settings.';
    console.log(e);
  }
  saving = false;
}

function addShortcut() {
  shortcuts = [...shortcuts, { name: '', icon: '', url: '' }];
}

function addFeed() {
  feeds = [...feeds, { url: '' }];
}

function removeShortcut(idx: number) {
  shortcuts = shortcuts.filter((_, i) => i !== idx);
}

function removeFeed(idx: number) {
  feeds = feeds.filter((_, i) => i !== idx);
}

async function sendTestNotification() {
  if (!remindersEnabled) {
    alert('Reminders are currently disabled. Enable them to receive notifications.');
    return;
  }
  await notify({
    title: 'Test Notification',
    body: 'This is a test notification from DesQTA settings.',
  });
}

async function testFeed(url: string) {
  if (!url) {
    notify({
      title: 'Invalid Feed URL',
      body: 'Please enter a valid RSS feed URL'
    });
    return;
  }

  try {
    const result = await invoke('get_rss_feed', { feed: url });
    notify({
      title: 'Feed Test Successful',
      body: 'The RSS feed is valid and can be added'
    });
  } catch (error) {
    notify({
      title: 'Feed Test Failed',
      body: 'Could not fetch the RSS feed. Please check the URL and try again.'
    });
  }
}

onMount(async () => {
  await Promise.all([loadSettings(), loadTheme()]);
});
</script>

<div class="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in-up">
    <h1 class="text-xl sm:text-2xl font-bold">Settings</h1>
    <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
      <button 
        class="w-full sm:w-auto px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 focus:ring-2 focus:ring-green-400 transition-all duration-200 active:scale-95 hover:scale-105 shadow-lg"
        on:click={saveSettings} 
        disabled={saving}
      >
        {#if saving}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
            <span>Saving...</span>
          </div>
        {:else}
          Save Changes
        {/if}
      </button>
      {#if saveSuccess}
        <span class="text-green-400 animate-fade-in text-sm sm:text-base">Settings saved successfully!</span>
      {/if}
      {#if saveError}
        <span class="text-red-400 animate-fade-in text-sm sm:text-base">{saveError}</span>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center items-center py-12 animate-fade-in">
      <div class="flex flex-col items-center gap-4">
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"></div>
        <p class="text-slate-400 text-sm sm:text-base">Loading settings...</p>
      </div>
    </div>
  {:else}
    <div class="space-y-6 sm:space-y-8">
      <!-- Homepage Settings -->
      <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700/50 animate-fade-in-up">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-800/50">
          <h2 class="text-base sm:text-lg font-semibold">Homepage</h2>
          <p class="text-xs sm:text-sm text-slate-400">Customize your homepage experience</p>
        </div>
        <div class="p-4 sm:p-6 space-y-6">
          <!-- Shortcuts -->
          <div>
            <h3 class="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Quick Access Shortcuts</h3>
            <p class="mb-4 text-xs sm:text-sm text-slate-400">Add shortcuts to frequently used websites that will appear at the top of your homepage.</p>
            <div class="space-y-3 sm:space-y-4">
              {#each shortcuts as shortcut, idx}
                <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-800/50 rounded-lg p-3 transition-all duration-200 hover:shadow-lg hover:bg-slate-700/50 animate-fade-in">
                  <input class="w-full sm:w-24 px-2 py-1.5 rounded bg-slate-900/50 focus:ring-2 focus:ring-blue-500 transition" placeholder="Name" bind:value={shortcut.name} />
                  <input class="w-full sm:w-22 px-2 py-1.5 rounded bg-slate-900/50 focus:ring-2 focus:ring-blue-500 transition" placeholder="Icon emoji" bind:value={shortcut.icon} />
                  <input class="w-full sm:flex-1 px-2 py-1.5 rounded bg-slate-900/50 focus:ring-2 focus:ring-blue-500 transition" placeholder="URL" bind:value={shortcut.url} />
                  <button class="text-red-400 hover:text-red-600 px-2 transition-transform duration-200 active:scale-110" on:click={() => removeShortcut(idx)} title="Remove">✕</button>
                </div>
              {/each}
              <button class="w-full sm:w-auto px-4 py-2 rounded-lg accent-bg text-white hover:accent-bg-hover focus:ring-2 accent-ring transition-all duration-200 active:scale-95 hover:scale-105 shadow" on:click={addShortcut}>Add Shortcut</button>
            </div>
          </div>
          <!-- Widget Settings -->
          <div>
            <h3 class="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Widget Settings</h3>
            <p class="mb-4 text-xs sm:text-sm text-slate-400">Configure which widgets appear on your in DesQTA.</p>
            <div class="p-4 bg-slate-800/50 rounded-lg animate-fade-in space-y-4">
              <div class="flex items-center gap-4">
                <input id="weather-enabled" type="checkbox" class="accent-blue-600 w-4 h-4 sm:w-5 sm:h-5" bind:checked={weatherEnabled} />
                <label for="weather-enabled" class="text-sm sm:text-base text-slate-200 font-medium cursor-pointer">Show Weather Widget</label>
              </div>
              <div class="flex items-center gap-4">
                <input id="force-use-location" type="checkbox" class="accent-blue-600 w-4 h-4 sm:w-5 sm:h-5" bind:checked={forceUseLocation} />
                <label for="force-use-location" class="text-sm sm:text-base text-slate-200 font-medium cursor-pointer">Only use Fallback Location for Weather</label>
                <p class="text-xs sm:text-sm text-slate-400">Useful if you use a VPN or want to choose the location, though the system sometimes does not work.</p>
              </div>
              <div class="flex flex-col items-start gap-2 pl-1" style="opacity: {weatherEnabled ? 1 : 0.5}; pointer-events: {weatherEnabled ? 'auto' : 'none'};">
                <label for="weather-city" class="text-xs sm:text-sm text-slate-400">Fallback City:</label>
                <input id="weather-city" class="w-full sm:w-64 px-3 py-2 rounded bg-slate-900/50 text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Perth" bind:value={weatherCity} />
              </div>
              <div class="flex flex-col items-start gap-2 pl-1" style="opacity: {weatherEnabled ? 1 : 0.5}; pointer-events: {weatherEnabled ? 'auto' : 'none'};">
                <label for="weather-country" class="text-xs sm:text-sm text-slate-400">Fallback Country Code</label>
                <a href="https://countrycode.org" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-400 hover:underline">If unsure, visit countrycode.org</a>
                <input id="weather-country" class="w-full sm:w-64 px-3 py-2 rounded bg-slate-900/50 text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="AU" bind:value={weatherCountry} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Appearance Settings -->
      <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700/50 animate-fade-in-up delay-100">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-800/50">
          <h2 class="text-base sm:text-lg font-semibold">Appearance</h2>
          <p class="text-xs sm:text-sm text-slate-400">Customize how DesQTA looks</p>
        </div>
        <div class="p-4 sm:p-6 space-y-6">
          <!-- Theme Settings -->
          <div>
            <h3 class="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Theme</h3>
            <p class="mb-4 text-xs sm:text-sm text-slate-400">Choose your preferred color scheme and theme settings.</p>
            <div class="p-4 bg-slate-800/50 rounded-lg animate-fade-in space-y-4">
              <div class="flex flex-col gap-2">
                <label for="accent-color" class="text-sm text-slate-200">Accent Color</label>
                <div class="flex gap-2 items-center">
                  <input 
                    type="color" 
                    id="accent-color" 
                    bind:value={$accentColor}
                    class="w-12 h-12 rounded-lg cursor-pointer bg-transparent accent-border border"
                  />
                  <input 
                    type="text" 
                    bind:value={$accentColor}
                    class="flex-1 px-3 py-2 rounded bg-slate-900/50 text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="#3b82f6"
                  />
                  <button 
                    class="px-3 py-2 rounded bg-slate-700/50 text-white hover:bg-slate-600/50 focus:ring-2 focus:ring-blue-500 transition"
                    on:click={() => accentColor.set('#3b82f6')}
                  >
                    Reset
                  </button>
                </div>
                <p class="text-xs text-slate-400">This color will be used throughout the app for buttons, links, and other interactive elements.</p>
              </div>

              <div class="flex flex-col gap-2">
                <label class="text-sm text-slate-200">Theme</label>
                <div class="flex gap-2">
                  <button 
                    class="flex-1 px-4 py-3 rounded-lg bg-slate-700/50 text-white hover:bg-slate-600/50 focus:ring-2 focus:ring-blue-500 transition flex items-center justify-center gap-2 {$theme === 'light' ? 'accent-bg' : ''}"
                    on:click={() => updateTheme('light')}
                  >
                    <Icon src={Sun} class="w-5 h-5" />
                    Light
                  </button>
                  <button 
                    class="flex-1 px-4 py-3 rounded-lg bg-slate-700/50 text-white hover:bg-slate-600/50 focus:ring-2 focus:ring-blue-500 transition flex items-center justify-center gap-2 {$theme === 'dark' ? 'accent-bg' : ''}"
                    on:click={() => updateTheme('dark')}
                  >
                    <Icon src={Moon} class="w-5 h-5" />
                    Dark
                  </button>
                </div>
                <p class="text-xs text-slate-400">Choose between light and dark mode for the entire app.</p>
              </div>
            </div>
          </div>
          <!-- Layout Settings -->
          <div>
            <h3 class="text-sm sm:text-base font-semibold mb-3 sm:mb-4">Layout</h3>
            <p class="mb-4 text-xs sm:text-sm text-slate-400">Adjust the layout and sizing of various elements.</p>
            <div class="p-4 bg-slate-800/50 rounded-lg animate-fade-in">
              <p class="text-xs sm:text-sm text-slate-400">Layout settings coming soon...</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Notification Settings -->
      <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700/50 animate-fade-in-up delay-200">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-800/50">
          <h2 class="text-base sm:text-lg font-semibold">Notifications</h2>
          <p class="text-xs sm:text-sm text-slate-400">Manage your notification preferences</p>
        </div>
        <div class="p-4 sm:p-6">
          <div class="p-4 bg-slate-800/50 rounded-lg animate-fade-in flex flex-col gap-4">
            <div class="flex items-center gap-3">
              <input id="reminders-enabled" type="checkbox" class="accent-blue-600 w-4 h-4 sm:w-5 sm:h-5" bind:checked={remindersEnabled} />
              <label for="reminders-enabled" class="text-sm sm:text-base text-slate-200 font-medium cursor-pointer">Enable assessment reminder notifications</label>
            </div>
            <button class="w-full sm:w-auto px-4 py-2 rounded-lg accent-bg text-white hover:accent-bg-hover focus:ring-2 accent-ring transition-all duration-200 active:scale-95 hover:scale-105 shadow" on:click={sendTestNotification}>
              Send Test Notification
            </button>
          </div>
        </div>
      </section>

      <!-- RSS Feeds Settings -->
      <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700/50 animate-fade-in-up delay-200">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-800/50">
          <h2 class="text-base sm:text-lg font-semibold">RSS Feeds</h2>
          <p class="text-xs sm:text-sm text-slate-400">Manage your news and content feeds that appear in your DMs</p>
        </div>
        <div class="p-4 sm:p-6 space-y-6">
          <div>
            <div class="flex justify-between items-center mb-4">
              <div>
                <h3 class="text-sm sm:text-base font-semibold">Feed Sources</h3>
                <p class="text-xs sm:text-sm text-slate-400">Add RSS feeds to stay updated with your favorite content</p>
              </div>
              <button 
                class="px-4 py-2 rounded-lg accent-bg text-white hover:accent-bg-hover focus:ring-2 accent-ring transition-all duration-200 active:scale-95 hover:scale-105 shadow flex items-center gap-2"
                on:click={addFeed}
              >
                <Icon src={Plus} class="w-4 h-4" />
                Add Feed
              </button>
            </div>
            <div class="space-y-3">
              {#each feeds as feed, idx}
                <div class="group bg-slate-800/50 rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:bg-slate-700/50 animate-fade-in">
                  <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-sm font-medium text-slate-200 truncate">
                          {feed.url ? new URL(feed.url).hostname : 'New Feed'}
                        </span>
                      </div>
                      <input 
                        class="w-full px-3 py-2 rounded bg-slate-900/50 text-white border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="https://example.com/feed.xml"
                        bind:value={feed.url}
                      />
                    </div>
                    <div class="flex items-center gap-2">
                      <button 
                        class="p-2 text-slate-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-700/50"
                        title="Test Feed"
                        on:click={() => testFeed(feed.url)}
                      >
                        <Icon src={ArrowPath} class="w-5 h-5" />
                      </button>
                      <button 
                        class="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-700/50"
                        title="Remove Feed"
                        on:click={() => removeFeed(idx)}
                      >
                        <Icon src={Trash} class="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
              {#if feeds.length === 0}
                <div class="text-center py-8 text-slate-400 animate-fade-in">
                  <Icon src={Rss} class="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p class="text-sm">No feeds added yet</p>
                  <p class="text-xs mt-1">Add your first RSS feed to get started</p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <!-- Plugins Section -->
      <section class="bg-slate-900/50 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-slate-800/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700/50 animate-fade-in-up delay-300">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-800/50">
          <h2 class="text-base sm:text-lg font-semibold">Plugins</h2>
          <p class="text-xs sm:text-sm text-slate-400">Enhance your DesQTA experience with plugins</p>
        </div>
        <div class="p-4 sm:p-6">
          <div class="p-4 bg-slate-800/50 rounded-lg animate-fade-in">
            <p class="text-xs sm:text-sm text-slate-400 mb-4">Install additional features and customizations from our plugin store.</p>
            <a href="/settings/plugins" class="inline-block w-full sm:w-auto text-center px-6 py-2 rounded-lg accent-bg text-white hover:accent-bg-hover focus:ring-2 accent-ring transition-all duration-200 active:scale-95 hover:scale-105 shadow">
              Open Plugin Store
            </a>
          </div>
        </div>
      </section>
    </div>
  {/if}
</div>

<style>
@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(32px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
.animate-fade-in {
  animation: fade-in 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style> 