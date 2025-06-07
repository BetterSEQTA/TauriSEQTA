<script lang="ts">
  import type { Message } from '../types';

  let { 
    selectedFolder,
    messages,
    loading,
    error,
    selectedMessage,
    openMessage
  } = $props<{
    selectedFolder: string;
    messages: Message[];
    loading: boolean;
    error: string | null;
    selectedMessage: Message | null;
    openMessage: (msg: Message) => void;
  }>();

  // Format date to readable format
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if date is within this year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise return full date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  // Check if message has attachments
  function hasAttachment(preview: string): boolean {
    return preview.includes('(Attachment)');
  }
</script>

<section class="w-full xl:w-[28rem] h-full border-r border-slate-800/50 flex flex-col bg-slate-900/10 backdrop-blur-sm">
  <div class="flex items-center p-4 text-base sm:text-lg font-semibold border-b border-slate-800/50 text-white">
    <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
    {selectedFolder}
  </div>
  
  <div class="overflow-y-auto flex-1 p-2 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-slate-800/10">
    {#if loading}
      <div class="flex flex-col justify-center items-center p-8 h-32 text-center text-slate-300">
        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"></div>
        <p class="mt-4 text-sm sm:text-base">Loading messages...</p>
      </div>
    {:else if error}
      <div class="flex justify-center items-center p-8 h-32 text-center text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm sm:text-base">{error}</span>
      </div>
    {:else}
      {#each messages.filter((m: Message) => m.folder === selectedFolder) as msg (msg.id)}
        <button
          class="w-full text-left p-3 mb-2 transition-all duration-200 flex flex-col gap-2
            rounded-lg relative animate-fadeIn
            {selectedMessage?.id === msg.id 
              ? 'bg-indigo-500/10 shadow-lg border border-indigo-500/50 hover:bg-indigo-500/20' 
              : 'border border-slate-800/30 hover:border-slate-700/50 hover:bg-slate-800/30'}
            {msg.unread 
              ? 'border-l-4 border-l-indigo-500' 
              : ''}
            focus:outline-none focus:ring-2 focus:ring-indigo-400"
          onclick={() => openMessage(msg)}
        >
          <!-- Top row: sender and date -->
          <div class="flex justify-between items-center w-full">
            <div class="flex gap-2 items-center">
              <span class="font-bold text-sm {msg.unread ? 'text-indigo-400' : 'text-slate-200'}">{msg.sender}</span>
              {#if msg.unread}
                <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
              {/if}
            </div>
            <span class="px-2 py-1 text-xs rounded-full bg-slate-800/50 text-slate-300">{formatDate(msg.date)}</span>
          </div>
          
          <!-- Middle row: subject -->
          <div class="font-semibold text-sm {msg.unread ? 'text-indigo-400' : 'text-slate-200'} flex items-center">
            <span class="line-clamp-1">{msg.subject}</span>
            {#if hasAttachment(msg.preview)}
              <span class="ml-2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </span>
            {/if}
          </div>
          
          <!-- Bottom row: to and preview -->
          <div class="flex items-center text-xs text-slate-400">
            <span class="flex items-center whitespace-nowrap">
              <span class="inline-block mr-1 opacity-70">To:</span> 
              <span class="max-w-[100px] truncate">{msg.to}</span>
            </span>
            <span class="mx-1">•</span>
            <span class="opacity-70 line-clamp-1">
              {hasAttachment(msg.preview) 
                ? msg.preview.replace(/\(Attachment\)/, '') 
                : msg.preview}
            </span>
          </div>
        </button>
      {:else}
        <div class="flex flex-col justify-center items-center p-8 h-32 text-center text-slate-300">
          <div class="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-2xl sm:text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p class="mt-4 text-sm sm:text-base">No messages in this folder.</p>
        </div>
      {/each}
    {/if}
  </div>
</section>

<style>
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.5);
  }

  @keyframes gradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  .animate-gradient {
    background-size: 200% 200%;
    animation: gradient 3s ease infinite;
  }
</style> 