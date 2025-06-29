<script lang="ts">
  interface Props {
    seqtaUrl: string;
    onStartLogin: () => void;
    onUrlChange: (url: string) => void;
  }

  let { seqtaUrl, onStartLogin, onUrlChange }: Props = $props();
</script>

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
              oninput={(e) => onUrlChange(e.target.value)}
              placeholder="your-school.seqta.com.au"
              class="py-3 pr-4 pl-10 w-full rounded-lg border transition-colors text-slate-900 bg-slate-50 border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enter your school's SEQTA URL to get started
          </p>
        </div>

        <button
          class="py-3 w-full text-lg font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          onclick={onStartLogin}
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