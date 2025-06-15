<script lang="ts">
  import { onMount } from 'svelte';

  interface TodoItem {
    id: number;
    text: string;
    completed: boolean;
    dueDate?: string;
    subtasks?: { id: number; text: string; completed: boolean }[];
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  }

  let todos = $state<TodoItem[]>([]);
  let newTodoText = $state('');
  let newTodoDueDate = $state('');
  let newTodoPriority = $state<'low' | 'medium' | 'high'>('medium');
  let newTodoTags = $state(''); // comma-separated
  let newTodoRecurring = $state<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  let newSubtasks = $state<{ id: number; text: string }[]>([]);
  let newSubtaskText = $state('');

  function addSubtask() {
    if (newSubtaskText.trim()) {
      newSubtasks = [...newSubtasks, { id: Date.now(), text: newSubtaskText.trim() }];
      newSubtaskText = '';
    }
  }

  function removeSubtask(id: number) {
    newSubtasks = newSubtasks.filter((st) => st.id !== id);
  }

  function addTodo() {
    if (newTodoText.trim()) {
      todos = [
        ...todos,
        {
          id: Date.now(),
          text: newTodoText.trim(),
          completed: false,
          dueDate: newTodoDueDate || undefined,
          subtasks: newSubtasks.map((st) => ({ ...st, completed: false })),
          priority: newTodoPriority,
          tags: newTodoTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          recurring: newTodoRecurring,
        },
      ];
      newTodoText = '';
      newTodoDueDate = '';
      newTodoPriority = 'medium';
      newTodoTags = '';
      newTodoRecurring = 'none';
      newSubtasks = [];
      saveTodos();
    }
  }

  function toggleTodo(id: number) {
    todos = todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo));
    saveTodos();
  }

  function toggleSubtask(todoId: number, subtaskId: number) {
    todos = todos.map((todo) =>
      todo.id === todoId
        ? {
            ...todo,
            subtasks: todo.subtasks?.map((st) =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st,
            ),
          }
        : todo,
    );
    saveTodos();
  }

  function deleteTodo(id: number) {
    todos = todos.filter((todo) => todo.id !== id);
    saveTodos();
  }

  function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
  }

  function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      todos = JSON.parse(savedTodos);
    }
  }

  onMount(() => {
    loadTodos();
  });
</script>

<div
  class="overflow-hidden relative rounded-2xl border shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
  <div
    class="flex justify-between items-center px-4 py-3 bg-gradient-to-br border-b from-slate-100/70 dark:from-slate-800/70 to-slate-100/30 dark:to-slate-800/30 border-slate-300/50 dark:border-slate-700/50">
    <h3 class="text-xl font-semibold text-slate-900 dark:text-white">Todo List</h3>
  </div>
  <div class="p-6">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        addTodo();
      }}
      class="mb-6">
      <div
        class="flex flex-col gap-6 p-4 rounded-lg border border-slate-300 bg-slate-100/60 dark:bg-slate-800/40 dark:border-slate-700">
        <!-- Main Task -->
        <div class="flex flex-col gap-4 items-stretch sm:flex-row">
          <input
            type="text"
            bind:value={newTodoText}
            placeholder="Add a new task..."
            class="flex-1 px-4 py-2 bg-white rounded-lg border shadow-sm text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200" />
          <input
            type="date"
            bind:value={newTodoDueDate}
            class="px-4 py-2 bg-white rounded-lg border shadow-sm text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200" />
        </div>
        <!-- Details -->
        <div class="flex flex-col gap-4 items-stretch sm:flex-row">
          <div class="flex relative flex-1 items-center">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                class={newTodoPriority === 'high'
                  ? 'text-red-500'
                  : newTodoPriority === 'medium'
                    ? 'text-yellow-400'
                    : 'text-green-500'}
                ><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
            </span>
            <select
              bind:value={newTodoPriority}
              class="py-2 pr-4 pl-8 w-full bg-white rounded-lg border text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <div class="flex relative flex-1 items-center">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                class="text-blue-400"
                ><rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" /><rect
                  x="11"
                  y="4"
                  width="2"
                  height="16"
                  rx="1"
                  fill="currentColor" /></svg>
            </span>
            <input
              type="text"
              bind:value={newTodoTags}
              placeholder="Tags (comma separated, e.g. school,math)"
              class="py-2 pr-4 pl-8 w-full bg-white rounded-lg border text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200" />
          </div>
          <div class="flex relative flex-1 items-center">
            <span class="absolute left-3 top-1/2 -translate-y-1/2">
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                class="text-purple-400"
                ><circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="2" /><path
                  d="M12 6v6l4 2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round" /></svg>
            </span>
            <select
              bind:value={newTodoRecurring}
              class="py-2 pr-4 pl-8 w-full bg-white rounded-lg border text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200">
              <option value="none">No Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <!-- Subtasks -->
        <div class="p-3 rounded-lg bg-slate-200/60 dark:bg-slate-900/40">
          <div class="flex gap-2 items-center mb-2">
            <svg
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              class="text-slate-600 dark:text-slate-400"
              ><rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" /></svg>
            <input
              type="text"
              bind:value={newSubtaskText}
              placeholder="Add subtask (e.g. Read chapter 1)"
              class="flex-1 px-4 py-2 bg-white rounded-lg border text-slate-900 border-slate-300 dark:bg-slate-900/60 dark:text-white dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-200" />
            <button
              type="button"
              onclick={addSubtask}
              class="px-4 py-2 text-white rounded-lg shadow transition-all duration-200 transform hover:scale-105 active:scale-95 bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >Add Subtask</button>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each newSubtasks as st (st.id)}
              <span
                class="flex gap-2 items-center px-3 py-1 rounded-lg shadow-sm text-slate-800 bg-slate-300 dark:bg-slate-700 dark:text-white">
                {st.text}
                <button
                  type="button"
                  onclick={() => removeSubtask(st.id)}
                  class="ml-2 transition-all duration-200 transform hover:scale-[1.02] accent-text hover:accent-text/80 focus:outline-none focus:ring-2 accent-ring focus:ring-offset-2"
                  aria-label="Remove subtask">×</button>
              </span>
            {/each}
          </div>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            class="px-8 py-2 font-semibold text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
            Add Task
          </button>
        </div>
      </div>
    </form>

    <div class="space-y-4">
      {#each todos as todo (todo.id)}
        <div
          class="flex flex-col gap-2 p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 transform hover:scale-[1.02] border-slate-200 bg-white/80 dark:bg-slate-800/60 dark:border-slate-700 hover:shadow-lg group">
          <div class="flex gap-3 items-center">
            <input
              type="checkbox"
              checked={todo.completed}
              onchange={() => toggleTodo(todo.id)}
              class="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 accent-bg transition-all duration-200" />
            <div class="flex-1">
              <div class="flex gap-2 items-center">
                <p
                  class="text-slate-900 dark:text-white {todo.completed
                    ? 'line-through text-slate-500 dark:text-slate-400'
                    : ''} font-semibold">
                  {todo.text}
                </p>
                {#if todo.priority}
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold {todo.priority ===
                    'high'
                      ? 'bg-red-600'
                      : todo.priority === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-600'} text-white">
                    {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                  </span>
                {/if}
                {#if todo.tags && todo.tags.length}
                  <span class="flex gap-1 ml-2">
                    {#each todo.tags as tag}
                      <span
                        class="px-2 py-0.5 text-xs text-blue-100 rounded-full bg-blue-700/80"
                        >#{tag}</span>
                    {/each}
                  </span>
                {/if}
                {#if todo.recurring && todo.recurring !== 'none'}
                  <span class="inline-block ml-2 text-xs text-purple-300">
                    {todo.recurring.charAt(0).toUpperCase() + todo.recurring.slice(1)}
                  </span>
                {/if}
              </div>
              {#if todo.dueDate}
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Due: {new Date(todo.dueDate).toLocaleDateString()}
                </p>
              {/if}
            </div>
            <button
              onclick={() => deleteTodo(todo.id)}
              class="p-2 transition-all duration-200 transform hover:scale-[1.02] accent-text hover:accent-text/80 focus:outline-none focus:ring-2 accent-ring focus:ring-offset-2"
              title="Delete task"
              aria-label="Delete task">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
                ><path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round" /></svg>
            </button>
          </div>
          {#if todo.subtasks && todo.subtasks.length}
            <div
              class="flex flex-col gap-1 p-2 mt-2 ml-8 rounded-lg bg-slate-200/60 dark:bg-slate-900/40">
              {#each todo.subtasks as st (st.id)}
                <div class="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onchange={() => toggleSubtask(todo.id, st.id)}
                    class="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-2 accent-bg transition-all duration-200" />
                  <span
                    class="text-sm text-slate-900 dark:text-white {st.completed
                      ? 'line-through text-slate-500 dark:text-slate-400'
                      : ''}">{st.text}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div> 