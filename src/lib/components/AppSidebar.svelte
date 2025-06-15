<script lang="ts">
  import { page } from '$app/stores';
  import { Icon } from 'svelte-hero-icons';

  interface MenuItem {
    label: string;
    icon: any;
    path: string;
  }

  interface Props {
    sidebarOpen: boolean;
    menu: MenuItem[];
  }

  let { sidebarOpen, menu }: Props = $props();
</script>

<aside
  class="overflow-hidden transition-all duration-300 ease-in-out"
  class:w-64={sidebarOpen}
  class:w-0={!sidebarOpen}>
  <nav class="p-3 py-[1px] space-y-2 w-64 min-w-64">
    {#each menu as item}
      <a
        href={item.path}
        class="flex gap-4 items-center text-md px-3 py-3 font-medium rounded-xl transition-all duration-200 hover:bg-accent-100 hover:text-slate-900 dark:hover:bg-accent-600 dark:hover:text-white focus:outline-none {(
          item.path === '/'
            ? $page.url.pathname === '/'
            : $page.url.pathname.startsWith(item.path)
        )
          ? 'bg-accent text-white'
          : 'text-slate-900 dark:text-slate-300'}">
        <Icon
          src={item.icon}
          class="w-6 h-6 {(
            item.path === '/'
              ? $page.url.pathname === '/'
              : $page.url.pathname.startsWith(item.path)
          )
            ? 'text-white'
            : 'text-slate-600 dark:text-slate-400'}" />
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>
</aside>