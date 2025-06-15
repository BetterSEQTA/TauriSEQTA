<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';
  import {
    Icon,
    BookOpen,
    ClipboardDocumentList,
    CalendarDays,
    ChatBubbleLeftRight,
    Bell,
    DocumentText,
    GlobeAlt,
  } from 'svelte-hero-icons';

  interface Props {
    open: boolean;
    onclose?: () => void;
  }

  let { open = $bindable(false), onclose }: Props = $props();

  function closeModal() {
    onclose?.();
  }
</script>

<Modal bind:open onclose={closeModal} ariaLabel="About Modal">
  <!-- Easter Egg Trigger Area -->
  <div
    class="absolute top-0 right-0 w-16 h-16 opacity-0 cursor-pointer"
    onclick={(e) => {
      e.stopPropagation();
      const audio = new Audio('/sounds/konami.mp3');
      audio.play();
      document.body.classList.add('konami-mode');
      setTimeout(() => document.body.classList.remove('konami-mode'), 5000);
    }}
    onkeydown={(e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const audio = new Audio('/sounds/konami.mp3');
        audio.play();
      }
    }}
    role="button"
    tabindex="0">
  </div>

  <div class="p-8">
    <div class="flex justify-between items-start mb-8">
      <div class="flex items-center space-x-4">
        <img src="/betterseqta-dark-icon.png" alt="DesQTA" class="invert size-14 dark:invert-0" />
        <div>
          <h2
            class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
            About DesQTA
          </h2>
          <p class="text-slate-600 dark:text-slate-400">Your SEQTA Learn Desktop Experience</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 items-stretch md:grid-cols-2">
      <div class="flex flex-col gap-6 h-full">
        <div
          class="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/40 dark:border-slate-700/40 p-6 flex-1 flex flex-col justify-between min-h-[160px]">
          <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Version Information
          </h3>
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400">Version</span>
              <span class="font-medium text-slate-900 dark:text-white">1.0.0</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400">Build Date</span>
              <span class="font-medium text-slate-900 dark:text-white"
                >{new Date().toLocaleDateString()}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600 dark:text-slate-400">Platform</span>
              <span class="font-medium text-slate-900 dark:text-white">Desktop</span>
            </div>
          </div>
        </div>
        <div
          class="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/40 dark:border-slate-700/40 p-6 flex-1 flex flex-col justify-between min-h-[160px]">
          <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Built With</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-xl bg-[#FF3E00] flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span class="text-slate-900 dark:text-white">SvelteKit</span>
            </div>
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-xl bg-[#FFC131] flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <span class="text-slate-900 dark:text-white">Tauri</span>
            </div>
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-xl bg-[#06B6D4] flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <span class="text-slate-900 dark:text-white">TailwindCSS</span>
            </div>
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-xl bg-[#764ABC] flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <span class="text-slate-900 dark:text-white">Rust</span>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-6 h-full">
        <div
          class="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/40 dark:border-slate-700/40 p-6 flex-1 flex flex-col justify-between min-h-[160px]">
          <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Features</h3>
          <ul class="overflow-auto pr-2 space-y-3 max-h-40">
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-blue-100 rounded-lg dark:bg-blue-900/50">
                <Icon src={BookOpen} class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Course Management</span>
            </li>
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-purple-100 rounded-lg dark:bg-purple-900/50">
                <Icon
                  src={ClipboardDocumentList}
                  class="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Assessment Tracking</span>
            </li>
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-orange-100 rounded-lg dark:bg-orange-900/50">
                <Icon src={CalendarDays} class="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Timetable Integration</span>
            </li>
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-pink-100 rounded-lg dark:bg-pink-900/50">
                <Icon src={ChatBubbleLeftRight} class="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Direqt Messaging</span>
            </li>
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-red-100 rounded-lg dark:bg-red-900/50">
                <Icon src={Bell} class="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Real-time Notifications</span>
            </li>
            <li class="flex items-center space-x-3">
              <div
                class="flex justify-center items-center w-6 h-6 bg-indigo-100 rounded-lg dark:bg-indigo-900/50">
                <Icon src={DocumentText} class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span class="text-slate-900 dark:text-white">Notice Board</span>
            </li>
          </ul>
        </div>
        <div
          class="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-200/40 dark:border-slate-700/40 p-6 flex-1 flex flex-col justify-between min-h-[160px]">
          <h3 class="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Links</h3>
          <div class="space-y-4">
            <a
              href="https://github.com/betterseqta/desqta"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center p-3 space-x-3 bg-slate-100 rounded-xl transition-all duration-200 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 group">
              <div
                class="flex justify-center items-center w-8 h-8 bg-slate-800 rounded-lg dark:bg-slate-200">
                <svg
                  class="w-4 h-4 text-white dark:text-slate-800"
                  fill="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    fill-rule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="font-medium text-slate-900 dark:text-white">GitHub Repository</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">View source code</div>
              </div>
            </a>
            <a
              href="https://desqta.betterseqta.org"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center p-3 space-x-3 bg-slate-100 rounded-xl transition-all duration-200 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 group">
              <div
                class="flex justify-center items-center w-8 h-8 bg-slate-100 rounded-lg dark:bg-slate-700/50">
                <Icon src={GlobeAlt} class="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <div class="font-medium text-slate-900 dark:text-white">Website</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">Official website</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-6 mt-8 border-t border-slate-200/60 dark:border-slate-700/60">
      <p class="text-center text-slate-600 dark:text-slate-400">
        © 2025 DesQTA. Licensed under MIT License.
      </p>
    </div>
  </div>
</Modal>
