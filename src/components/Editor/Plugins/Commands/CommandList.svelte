<script lang="ts">
  import { slashVisible, slashItems, slashLocation, slashProps, selectedIndex, scrollIntoView } from './stores';
	import { fly } from 'svelte/transition';
	import { get } from 'svelte/store';

  export function handleKeydown(event: any, editor: any) {
    if (!get(slashVisible)) return;

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      upHandler();
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      downHandler();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectItem(editor);
      return true;
    }

    return false;
  }

  function upHandler() {
    scrollIntoView.set(true);
    selectedIndex.set((get(selectedIndex) + get(slashItems).length - 1) % get(slashItems).length);
  }

  function downHandler() {
    scrollIntoView.set(true);
    selectedIndex.set((get(selectedIndex) + 1) % get(slashItems).length);
  }

  function selectItem(editor: any) {
    const item = get(slashItems)[get(selectedIndex)];

    if (item) {
      let range = get(slashProps).range;
      item.command({ editor, range });
      slashVisible.set(false);
    }
  }

  let height = $state(0);
  let elements = $state<any[]>([]);
  
  $effect(() => {
    if (get(scrollIntoView) && elements[0] != null) {
      elements[$selectedIndex]?.scrollIntoView({ block: 'end', behavior: 'smooth' });
      scrollIntoView.set(false);
    }
  });

  function closeSlashMenu() {
    slashVisible.set(false);
  }
  
  function handleItemMouseEnter(index: number) {
    selectedIndex.set(index);
  }
  
  function handleItemClick(item: any) {
    const editor = get(slashProps).editor;
    const range = get(slashProps).range;
    slashVisible.set(false);
    item.command({ editor, range });
  }
</script>

<svelte:window bind:innerHeight={height} />

{#if $slashVisible}
  <div class="absolute top-0 w-full h-screen" onkeydown={() => {}} onclick={closeSlashMenu} role="menu" tabindex="-1"></div>
  <div
   transition:fly={{ y: 10, duration: 300 }}
    class="overflow-scroll absolute w-96 max-w-full h-96 rounded-lg border shadow-xl bg-slate-900 border-slate-800"
    style="left: {$slashLocation.x}px; top: {$slashLocation.y + $slashLocation.height + 384 >
    height
      ? $slashLocation.y - $slashLocation.height - 384
      : $slashLocation.y + $slashLocation.height}px;">
    <div class="p-2 text-sm text-slate-500">Basic Blocks</div>
    {#each $slashItems as { title, subtitle, command, image }, i}
      <div
        class="p-3 transition duration-300 flex gap-4 cursor-pointer {i == $selectedIndex ? 'bg-slate-950' : 'bg-slate-900/0'}"
        onmouseenter={() => handleItemMouseEnter(i)}
        onclick={() => handleItemClick({ command })}
        onkeydown={() => {}}
        role="menuitem"
        tabindex="-1"
        bind:this={elements[i]}
      >
      <img class="h-12" src={image} alt={title} />
      <div>
        {title}
        <p class="text-sm text-slate-500">{subtitle ? subtitle : ''}</p>
      </div>
      </div>
    {/each}
  </div>
{/if}
