<script lang="ts">
  import { Icon } from "svelte-hero-icons";
  import { PencilSquare, Trash, Star, ArrowUturnLeft } from "svelte-hero-icons";
  import type { Message } from "../types";
  import {openURL} from '../../../utils/netUtil'
  import DOMPurify from "dompurify";
  import { onMount } from "svelte";

  let {
    selectedMessage,
    selectedFolder,
    detailLoading,
    detailError,
    openCompose,
    starMessage,
    deleteMessage,
    restoreMessage,
    starring,
    deleting,
    restoring,
  } = $props<{
    selectedMessage: Message | null;
    selectedFolder: string;
    detailLoading: boolean;
    detailError: string | null;
    openCompose: () => void;
    starMessage: (msg: Message) => Promise<void>;
    deleteMessage: (msg: Message) => Promise<void>;
    restoreMessage: (msg: Message) => Promise<void>;
    starring: boolean;
    deleting: boolean;
    restoring: boolean;
  }>();

  let iframe: HTMLIFrameElement | null = $state(null);

  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  function updateIframeContent() {
    if (!selectedMessage || !iframe || !iframe.contentWindow) return;

    const sanitizedContent = DOMPurify.sanitize(selectedMessage.body);

    const html = /* html */`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        color: #f1f5f9;
        margin: 0;
        padding: 0 1px;
        background-color: transparent;
        line-height: 1.8;
        font-size: 15px;
      }

      a {
        color: #60a5fa;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
      
      p {
        margin: 0 0 1.2em;
      }

      .forward {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background-color: rgba(0, 0, 0, 0.05);
        padding: 8px;
        border-radius: 8px;
        margin: 0;
      }
      
      .forward .preamble {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 6px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      blockquote {
        border-left: 3px solid #3b82f6;
        margin-left: 0;
        padding-left: 12px;
        color: rgba(241, 245, 249, 0.8);
      }
    </style>
  </head>
  <body>${sanitizedContent}</body>
</html>`;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    
    setTimeout(adjustIframeHeight, 100);
  }
  
  function adjustIframeHeight() {
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) return;
    
    const height = iframe.contentDocument.body.scrollHeight;
    iframe.style.height = `${height + 32}px`;
  }

  $effect(() => {
    if (selectedMessage && iframe) {
      updateIframeContent();
    }
  });

  onMount(() => {
    if (selectedMessage && iframe) {
      updateIframeContent();
    }
    
    // Set up a resize observer to handle window resizing
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        if (iframe) adjustIframeHeight();
      });
      
      if (iframe) resizeObserver.observe(iframe);
      
      return () => {
        if (iframe) resizeObserver.unobserve(iframe);
      };
    }
  });
</script>

<main class="flex flex-col flex-1 p-4 sm:p-6 md:p-8">
  {#if selectedMessage}
    <div class="mx-auto w-full max-w-4xl animate-fadeIn">
      <div
        class="overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm border-slate-800/50 bg-slate-900/40"
      >
        <div class="p-4 sm:p-6 pb-3 border-b border-slate-800/50">
          <div class="mb-4 text-xl sm:text-2xl font-bold text-indigo-400">
            {selectedMessage.subject}
          </div>
          
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div class="space-y-1">
              <div class="text-sm sm:text-base text-slate-200">
                <span class="font-medium">{selectedMessage.sender}</span>
              </div>
              <div class="text-xs sm:text-sm text-slate-400">
                To: <span class="font-medium text-slate-300">{selectedMessage.to}</span>
              </div>
            </div>
            
            <div class="flex gap-2 sm:gap-3 items-center">
              {#if selectedFolder === "Trash"}
                <button
                  class="flex flex-col justify-center items-center p-1.5 rounded-lg transition-all duration-200 hover:bg-green-400/20 focus:bg-green-400/30 focus:ring-2 focus:ring-green-400/30 focus:outline-none"
                  title="Restore"
                  onclick={() => selectedMessage && restoreMessage(selectedMessage)}
                  disabled={restoring}
                >
                  {#if restoring}
                    <div class="w-4 h-4 rounded-full border-2 animate-spin border-green-400/30 border-t-green-400"></div>
                  {:else}
                    <Icon
                      src={ArrowUturnLeft}
                      class="mb-0.5 w-4 h-4 text-green-400"
                    />
                  {/if}
                  <span class="text-xs sm:text-sm font-medium text-green-400">Restore</span>
                </button>
              {:else if selectedFolder === "Starred"}
                <button
                  class="flex justify-center items-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 hover:bg-yellow-400/20 focus:bg-yellow-400/30 focus:ring-2 focus:ring-yellow-400/30 focus:outline-none"
                  title="Unstar"
                  onclick={() => selectedMessage && starMessage(selectedMessage)}
                  disabled={starring || !selectedMessage.starred}
                >
                  {#if starring}
                    <div class="w-5 h-5 rounded-full border-2 animate-spin border-yellow-400/30 border-t-yellow-400"></div>
                  {:else}
                    <Icon
                      src={Star}
                      class="w-5 h-5 text-yellow-400"
                      solid={true}
                    />
                  {/if}
                </button>
              {:else}
                <button
                  class="flex justify-center items-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 hover:bg-yellow-400/20 focus:bg-yellow-400/30 focus:ring-2 focus:ring-yellow-400/30 focus:outline-none"
                  title="Star"
                  onclick={() => selectedMessage && starMessage(selectedMessage)}
                  disabled={starring || selectedMessage.starred}
                >
                  {#if starring}
                    <div class="w-5 h-5 rounded-full border-2 animate-spin border-yellow-400/30 border-t-yellow-400"></div>
                  {:else}
                    <Icon
                      src={Star}
                      class="w-5 h-5 text-yellow-400"
                    />
                  {/if}
                </button>
              {/if}
              
              <button
                class="flex justify-center items-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 hover:bg-red-400/20 focus:bg-red-400/30 focus:ring-2 focus:ring-red-400/30 focus:outline-none"
                title="Delete"
                onclick={() => selectedMessage && deleteMessage(selectedMessage)}
                disabled={deleting}
              >
                {#if deleting}
                  <div class="w-5 h-5 rounded-full border-2 animate-spin border-red-400/30 border-t-red-400"></div>
                {:else}
                  <Icon
                    src={Trash}
                    class="w-5 h-5 text-red-400"
                  />
                {/if}
              </button>
              
              <button
                class="flex justify-center items-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-200 hover:bg-indigo-400/20 focus:bg-indigo-400/30 focus:ring-2 focus:ring-indigo-400/30 focus:outline-none"
                title="Reply"
                onclick={openCompose}
              >
                <Icon
                  src={PencilSquare}
                  class="w-5 h-5 text-indigo-400"
                />
              </button>
            </div>
          </div>
        </div>
        
        <div class="p-4 sm:p-6">
          {#if detailLoading}
            <div class="flex justify-center items-center py-12">
              <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-4 animate-spin border-indigo-500/30 border-t-indigo-500"></div>
            </div>
          {:else if detailError}
            <div class="flex justify-center items-center py-12 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm sm:text-base">{detailError}</span>
            </div>
          {:else}
            <iframe
              bind:this={iframe}
              class="w-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups"
              title="Message content"
            ></iframe>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col justify-center items-center h-full text-center text-slate-400">
      <div class="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-2xl sm:text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-gradient">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p class="mt-4 text-sm sm:text-base">Select a message to view its contents.</p>
    </div>
  {/if}
</main>

<style>
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
