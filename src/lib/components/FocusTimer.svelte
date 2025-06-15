<script lang="ts">
  import { onMount } from 'svelte';

  let timeLeft = $state(25 * 60); // 25 minutes in seconds
  let isRunning = $state(false);
  let timerInterval: number | undefined = $state(undefined);
  let selectedDuration = $state(25); // minutes
  let isBreak = $state(false);

  function startTimer() {
    if (!isRunning) {
      isRunning = true;
      timerInterval = window.setInterval(() => {
        if (timeLeft > 0) {
          timeLeft--;
        } else {
          clearInterval(timerInterval);
          isRunning = false;
          // Play notification sound
          new Audio('/notification.mp3').play().catch(() => {
            // Ignore errors if audio fails to play
          });
          // Toggle between work and break
          isBreak = !isBreak;
          timeLeft = (isBreak ? 5 : selectedDuration) * 60;
        }
      }, 1000);
    }
  }

  function pauseTimer() {
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    isBreak = false;
    timeLeft = selectedDuration * 60;
  }

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function setDuration(minutes: number) {
    selectedDuration = minutes;
    resetTimer();
  }

  onMount(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  });
</script>

<div
  class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
  <div
    class="flex justify-between items-center px-4 py-3 bg-gradient-to-br border-b from-slate-100/70 dark:from-slate-800/70 to-slate-100/30 dark:to-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
    <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Focus Timer</h3>
  </div>
  <div class="p-6">
    <div class="flex flex-col items-center gap-6">
      <!-- Timer Display -->
      <div
        class="flex items-center justify-center w-48 h-48 rounded-full border-8 {isBreak
          ? 'border-green-500'
          : 'border-accent'}">
        <span class="text-4xl font-bold text-slate-900 dark:text-white">{formatTime(timeLeft)}</span>
      </div>

      <!-- Timer Controls -->
      <div class="flex gap-4">
        {#if !isRunning}
          <button
            onclick={startTimer}
            class="px-6 py-2 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Start
          </button>
        {:else}
          <button
            onclick={pauseTimer}
            class="px-6 py-2 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2">
            Pause
          </button>
        {/if}
        <button
          onclick={resetTimer}
          class="px-6 py-2 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          Reset
        </button>
      </div>

      <!-- Duration Selection -->
      <div class="flex gap-2">
        <button
          onclick={() => setDuration(25)}
          class="px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 {selectedDuration === 25
            ? 'accent-bg text-white'
            : 'bg-transparent accent-text border-2 accent-border hover:accent-bg/10'}">
          25m
        </button>
        <button
          onclick={() => setDuration(45)}
          class="px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 {selectedDuration === 45
            ? 'accent-bg text-white'
            : 'bg-transparent accent-text border-2 accent-border hover:accent-bg/10'}">
          45m
        </button>
        <button
          onclick={() => setDuration(60)}
          class="px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 {selectedDuration === 60
            ? 'accent-bg text-white'
            : 'bg-transparent accent-text border-2 accent-border hover:accent-bg/10'}">
          60m
        </button>
      </div>

      <!-- Status -->
      <div class="text-center">
        <p class="text-lg font-medium text-slate-900 dark:text-white">
          {isBreak ? 'Break Time!' : 'Focus Time'}
        </p>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {isBreak ? 'Take a short break' : 'Stay focused and productive'}
        </p>
      </div>
    </div>
  </div>
</div> 