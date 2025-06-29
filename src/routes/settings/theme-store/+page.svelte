<script lang="ts">
  import { accentColor, theme, updateAccentColor, updateTheme } from '$lib/stores/theme';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  type Theme = {
    name: string;
    accent: string;
    background: string;
    preview: string;
    theme: 'light' | 'dark';
  };

  // Define local themes
  const themes: Theme[] = [
    {
      name: 'Default',
      accent: '#3b82f6',
      background: '#18181b',
      preview: 'A modern blue accent with dark background.',
      theme: 'dark',
    },
    {
      name: 'Sunset',
      accent: '#ff7e5f',
      background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
      preview: 'Warm orange-pink sunset gradient.',
      theme: 'dark',
    },
    {
      name: 'Light',
      accent: '#f59e42',
      background: '#f8fafc',
      preview: 'Light mode with orange accent.',
      theme: 'light',
    },
  ];

  let selectedTheme = writable<Theme | null>(null);

  function openThemeModal(t: Theme) {
    selectedTheme.set(t);
  }
  function closeThemeModal() {
    selectedTheme.set(null);
  }
  function applyTheme(t: Theme) {
    updateAccentColor(t.accent);
    updateTheme(t.theme);
    selectedTheme.set(null);
  }
</script>

<div class="p-8 max-w-4xl mx-auto">
  <h1 class="text-2xl font-bold mb-6">Theme Store</h1>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
    {#each themes as t}
      <div class="rounded-xl shadow-lg p-6 flex flex-col items-center bg-white/10 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:scale-105 hover:shadow-2xl cursor-pointer" on:click={() => openThemeModal(t)}>
        <div class="w-16 h-16 rounded-full mb-4" style="background: {t.background}; border: 2px solid {t.accent};"></div>
        <div class="font-semibold text-lg mb-2">{t.name}</div>
        <div class="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">{t.preview}</div>
        <span class="text-xs text-slate-400">Click to preview</span>
      </div>
    {/each}
  </div>

  {#if $selectedTheme}
    <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in-up relative" style="background: {$selectedTheme.background};">
        <button class="absolute top-4 right-4 text-xl text-white bg-black/30 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/60 transition" on:click={closeThemeModal}>&times;</button>
        <div class="flex flex-col h-full">
          <!-- Mock DesQTA UI -->
          <div class="flex h-64">
            <div class="w-20 flex flex-col items-center py-4" style="background: {$selectedTheme.accent};">
              <div class="w-8 h-8 rounded-lg bg-white/80 mb-4"></div>
              <div class="w-8 h-8 rounded-lg bg-white/60 mb-4"></div>
              <div class="w-8 h-8 rounded-lg bg-white/40 mb-4"></div>
              <div class="w-8 h-8 rounded-lg bg-white/20"></div>
            </div>
            <div class="flex-1 flex flex-col">
              <div class="h-12 flex items-center px-6" style="background: {$selectedTheme.accent}; color: white;">
                <span class="font-bold text-lg">DesQTA</span>
                <span class="ml-auto text-sm opacity-80">User</span>
              </div>
              <div class="flex-1 bg-white/80 dark:bg-slate-900/80 p-6 flex flex-col gap-4">
                <div class="h-6 w-1/3 rounded bg-slate-300 dark:bg-slate-700 mb-2"></div>
                <div class="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800 mb-2"></div>
                <div class="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800 mb-2"></div>
                <div class="h-32 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
              </div>
            </div>
          </div>
          <div class="p-6 flex flex-col items-center">
            <div class="font-semibold text-lg mb-2">{$selectedTheme.name} Theme</div>
            <div class="text-sm text-slate-700 dark:text-slate-300 mb-4 text-center">{$selectedTheme.preview}</div>
            <button class="px-4 py-2 rounded-lg font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gradient-to-r from-orange-400 to-pink-500 hover:scale-105 active:scale-95" on:click={() => applyTheme($selectedTheme)}>
              Apply Theme
            </button>
          </div>
        </div>
      </div>
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
</style> 