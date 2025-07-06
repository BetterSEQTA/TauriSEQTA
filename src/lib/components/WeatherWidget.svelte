<script lang="ts">
  interface Props {
    weatherData: {
      temperature: number;
      weathercode: number;
      location: string;
      country: string;
    };
  }

  let { weatherData }: Props = $props();
</script>

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