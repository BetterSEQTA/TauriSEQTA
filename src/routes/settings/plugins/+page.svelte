<script lang="ts">
import { onMount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { notify } from '../../../utils/notify';
import { marked } from 'marked';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  installed: boolean;
  icon: string;
  longDescription: string;
  requirements: string[];
  features: string[];
  size: string;
  lastUpdated: string;
  // New fields for GitHub integration
  repository: {
    owner: string;
    repo: string;
    branch?: string;
  };
  banner: {
    light: string;  // URL for light theme banner
    dark: string;   // URL for dark theme banner
  };
  readme: string;   // Markdown content
  screenshots: string[];  // Array of screenshot URLs
  downloads: number;
  rating: number;
  tags: string[];
  license: string;
  minVersion: string;  // Minimum DesQTA version required
  dependencies?: {
    name: string;
    version: string;
  }[];
  changelog: {
    version: string;
    date: string;
    changes: string[];
  }[];
}

let plugins: Plugin[] = [];
let loading = true;
let selectedPlugin: Plugin | null = null;

async function loadPlugins() {
  loading = true;
  try {
    const response = await fetch('https://raw.githubusercontent.com/AdenMGB/desqta-plugins/refs/heads/main/plugins.json');
    const data = await response.json();
    // Initialize all plugins as not installed for now
    plugins = data.plugins.map((plugin: Plugin) => ({
      ...plugin,
      installed: false
    }));
  } catch (e) {
    console.error('Failed to load plugins:', e);
    plugins = [];
  }
  loading = false;
}

async function installPlugin(pluginId: string) {
  try {
    // For now, just update the UI state
    plugins = plugins.map(plugin => 
      plugin.id === pluginId ? { ...plugin, installed: true } : plugin
    );
    await notify({
      title: 'Plugin Installed',
      body: 'The plugin has been successfully installed.',
    });
  } catch (e) {
    await notify({
      title: 'Installation Failed',
      body: 'Failed to install the plugin. Please try again.',
    });
  }
}

async function uninstallPlugin(pluginId: string) {
  try {
    // For now, just update the UI state
    plugins = plugins.map(plugin => 
      plugin.id === pluginId ? { ...plugin, installed: false } : plugin
    );
    await notify({
      title: 'Plugin Uninstalled',
      body: 'The plugin has been successfully uninstalled.',
    });
  } catch (e) {
    await notify({
      title: 'Uninstallation Failed',
      body: 'Failed to uninstall the plugin. Please try again.',
    });
  }
}

function openPluginDetails(plugin: Plugin) {
  selectedPlugin = plugin;
}

function closePluginDetails() {
  selectedPlugin = null;
}

onMount(loadPlugins);
</script>

<div class="max-w-4xl mx-auto p-8">
  <!-- Notice Banner -->
  <div class="mb-8 p-4 bg-yellow-900 border border-yellow-700 rounded-lg text-yellow-200 animate-fade-in">
    <div class="flex items-center gap-2">
      <span class="text-xl">⚠️</span>
      <div>
        <h3 class="font-semibold">Plugin Store Coming Soon</h3>
        <p class="text-sm text-yellow-300">The plugin store is currently in development. Installation and management features are not yet functional.</p>
      </div>
    </div>
  </div>

  <div class="flex justify-between items-center mb-8 animate-fade-in-up">
    <h1 class="text-2xl font-bold">Plugin Store</h1>
  </div>

  {#if loading}
    <div class="flex justify-center items-center py-12 animate-fade-in">
      <p class="text-slate-400">Loading plugins...</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each plugins as plugin}
        <div 
          class="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-blue-700 animate-fade-in-up cursor-pointer"
          on:click={() => openPluginDetails(plugin)}
        >
          <div class="relative h-32 overflow-hidden">
            <img 
              src={plugin.banner.dark} 
              alt={`${plugin.name} banner`}
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
          </div>
          <div class="p-6">
            <div class="flex items-start gap-4">
              <div class="text-4xl">{plugin.icon}</div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold">{plugin.name}</h3>
                <p class="text-sm text-slate-400 mt-1">{plugin.description}</p>
                <div class="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <span>v{plugin.version}</span>
                  <span>•</span>
                  <span>by {plugin.author}</span>
                  <span>•</span>
                  <span>⭐ {plugin.rating}</span>
                </div>
                <div class="flex flex-wrap gap-2 mt-2">
                  {#each plugin.tags as tag}
                    <span class="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-200">
                      {tag}
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if selectedPlugin}
  <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 animate-fade-in">
    <div class="fixed inset-0 overflow-y-auto">
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-fade-in-up">
          <!-- Plugin Header with Banner -->
          <div class="relative h-48 overflow-hidden">
            <img 
              src={selectedPlugin.banner.dark} 
              alt={`${selectedPlugin.name} banner`}
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-6">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-4">
                  <div class="text-5xl">{selectedPlugin.icon}</div>
                  <div>
                    <h2 class="text-2xl font-bold text-white">{selectedPlugin.name}</h2>
                    <div class="flex items-center gap-2 mt-1 text-blue-100">
                      <span>v{selectedPlugin.version}</span>
                      <span>•</span>
                      <span>by {selectedPlugin.author}</span>
                      <span>•</span>
                      <span>{selectedPlugin.size}</span>
                      <span>•</span>
                      <span>⭐ {selectedPlugin.rating}</span>
                    </div>
                  </div>
                </div>
                <button 
                  class="text-white hover:text-blue-100 transition-colors"
                  on:click={closePluginDetails}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- Plugin Content -->
          <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div class="space-y-6">
              <!-- Tags -->
              <div class="flex flex-wrap gap-2">
                {#each selectedPlugin.tags as tag}
                  <span class="px-3 py-1 text-sm rounded-full bg-blue-900 text-blue-200">
                    {tag}
                  </span>
                {/each}
              </div>

              <!-- Description -->
              <div>
                <h3 class="text-lg font-semibold mb-2">Description</h3>
                <div class="prose prose-invert max-w-none">
                  {@html marked(selectedPlugin.readme)}
                </div>
              </div>

              <!-- Screenshots -->
              {#if selectedPlugin.screenshots.length > 0}
                <div>
                  <h3 class="text-lg font-semibold mb-2">Screenshots</h3>
                  <div class="grid grid-cols-2 gap-4">
                    {#each selectedPlugin.screenshots as screenshot}
                      <img 
                        src={screenshot} 
                        alt="Plugin screenshot"
                        class="rounded-lg shadow-lg"
                      />
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Features -->
              <div>
                <h3 class="text-lg font-semibold mb-2">Features</h3>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  {#each selectedPlugin.features as feature}
                    <li>{feature}</li>
                  {/each}
                </ul>
              </div>

              <!-- Requirements -->
              <div>
                <h3 class="text-lg font-semibold mb-2">Requirements</h3>
                <ul class="list-disc list-inside space-y-1 text-slate-300">
                  {#each selectedPlugin.requirements as requirement}
                    <li>{requirement}</li>
                  {/each}
                </ul>
              </div>

              <!-- Changelog -->
              <div>
                <h3 class="text-lg font-semibold mb-2">Changelog</h3>
                <div class="space-y-4">
                  {#each selectedPlugin.changelog as entry}
                    <div class="bg-slate-800 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold">v{entry.version}</span>
                        <span class="text-sm text-slate-400">{entry.date}</span>
                      </div>
                      <ul class="list-disc list-inside space-y-1 text-slate-300">
                        {#each entry.changes as change}
                          <li>{change}</li>
                        {/each}
                      </ul>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Additional Info -->
              <div class="grid grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <span class="font-semibold">License:</span> {selectedPlugin.license}
                </div>
                <div>
                  <span class="font-semibold">Downloads:</span> {selectedPlugin.downloads.toLocaleString()}
                </div>
                <div>
                  <span class="font-semibold">Last Updated:</span> {selectedPlugin.lastUpdated}
                </div>
                <div>
                  <span class="font-semibold">Min Version:</span> {selectedPlugin.minVersion}
                </div>
              </div>
            </div>
          </div>

          <!-- Plugin Footer -->
          <div class="p-6 bg-slate-800 border-t border-slate-700">
            {#if selectedPlugin.installed}
              <button
                class="w-full px-6 py-3 rounded bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400 transition-transform duration-200 active:scale-95 hover:scale-105 shadow"
                on:click={() => selectedPlugin && uninstallPlugin(selectedPlugin.id)}
              >
                Uninstall Plugin
              </button>
            {:else}
              <button
                class="w-full px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-transform duration-200 active:scale-95 hover:scale-105 shadow"
                on:click={() => selectedPlugin && installPlugin(selectedPlugin.id)}
              >
                Install Plugin
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

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