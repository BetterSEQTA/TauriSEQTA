<script lang="ts">
import { 
  renderDraftJSText, 
  sanitizeHtml, 
  getFileIcon, 
  getFileColor, 
  formatFileSize,
  fetchLinkPreview,
  isValidUrl
} from '../utils';
import LinkPreview from './LinkPreview.svelte';
import type { 
  CoursePayload, 
  ParsedDocument, 
  WeeklyLessonContent,
  Module,
  TitleModule,
  TextBlockModule,
  ResourceModule,
  LinkModule,
  ResourceLink,
  LinkPreview as LinkPreviewType
} from '../types';

let { 
  coursePayload, 
  parsedDocument = null, 
  selectedLessonContent = null, 
  showingOverview = true 
}: {
  coursePayload: CoursePayload;
  parsedDocument?: ParsedDocument | null;
  selectedLessonContent?: WeeklyLessonContent | null;
  showingOverview?: boolean;
} = $props();

let linkPreviews: Map<string, LinkPreviewType | null> = $state(new Map());

function isModule<T extends Module>(module: Module, contentCheck: (content: any) => boolean): module is T {
  return 'content' in module && contentCheck(module.content);
}

function isTitleModule(module: Module): module is TitleModule {
  return isModule(module, (content) => content && typeof content.value === 'string');
}

function isTextBlockModule(module: Module): module is TextBlockModule {
  return isModule(module, (content) => content && content.content && content.content.blocks);
}

function isResourceModule(module: Module): module is ResourceModule {
  return isModule(module, (content) => content && content.value && content.value.resources);
}

function isLinkModule(module: Module): module is LinkModule {
  return isModule(module, (content) => content && content.url);
}

async function loadLinkPreview(url: string) {
  if (!linkPreviews.has(url)) {
    linkPreviews.set(url, null);
    const preview = await fetchLinkPreview(url);
    linkPreviews.set(url, preview);
    linkPreviews = linkPreviews;
  }
}

type RenderedModule = 
  | { type: 'title'; content: string }
  | { type: 'text'; content: string }
  | { type: 'resources'; content: ResourceLink[] }
  | { type: 'link'; content: string };

function renderModule(module: Module): RenderedModule | null {
  if (isTitleModule(module)) {
    return { type: 'title', content: module.content.value };
  } else if (isTextBlockModule(module)) {
    return { type: 'text', content: renderDraftJSText(module.content.content) };
  } else if (isResourceModule(module)) {
    return { 
      type: 'resources', 
      content: module.content.value.resources.filter(r => r.selected)
    };
  } else if (isLinkModule(module)) {
    const url = module.content.url;
    if (isValidUrl(url)) {
      loadLinkPreview(url);
    }
    return { type: 'link', content: url };
  }
  return null;
}

function parseLessonDocument(lessonContent: WeeklyLessonContent) {
  if (!lessonContent.document) return null;
  try {
    return JSON.parse(lessonContent.document.contents);
  } catch (error) {
    console.error('Failed to parse lesson document:', error);
    return null;
  }
}

function sortModules(modules: Module[]): Module[] {
  if (!modules || modules.length === 0) return [];
  
  const moduleMap = new Map<string, Module>();
  modules.forEach(module => {
    moduleMap.set(module.uuid, module);
  });
  
  const firstModule = modules.find(module => 
    !module.prevModule || !moduleMap.has(module.prevModule)
  );
  
  if (!firstModule) {
    return modules;
  }
  
  const orderedModules: Module[] = [];
  let currentModule: Module | undefined = firstModule;
  
  while (currentModule && orderedModules.length < modules.length) {
    orderedModules.push(currentModule);
    currentModule = currentModule.nextModule ? moduleMap.get(currentModule.nextModule) : undefined;
  }
  
  modules.forEach(module => {
    if (!orderedModules.includes(module)) {
      orderedModules.push(module);
    }
  });
  
  return orderedModules;
}
</script>

<div class="relative flex-1 overflow-y-auto">
  <!-- Mesh Gradient Background -->
  <div class="absolute inset-0 -z-10 pointer-events-none" style="background: radial-gradient(circle at 20% 30%, #7b8cff 30%, transparent 60%), radial-gradient(circle at 80% 70%, #e66465 30%, transparent 60%), radial-gradient(circle at 60% 20%, #fff 20%, transparent 60%), radial-gradient(circle at 80% 20%, #b993ff 40%, transparent 70%), radial-gradient(circle at 10% 80%, #ffb6b9 30%, transparent 60%); filter: blur(12px); opacity: 0.85;"></div>
  {#if !showingOverview && selectedLessonContent}
    <div class="p-6">
      <h1 class="text-3xl font-bold text-white bg-gradient-to-r from-indigo-600/80 to-purple-700/80 backdrop-blur-sm p-6 rounded-xl mb-6">
        {selectedLessonContent.t}
      </h1>
      
      {#if selectedLessonContent.h}
        <div class="mb-4 p-4 bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-800/50">
          <h3 class="text-lg font-semibold text-white mb-2">Homework/Notes</h3>
          <div class="prose prose-invert prose-indigo max-w-none">
            <p class="text-slate-300">{selectedLessonContent.h}</p>
          </div>
        </div>
      {/if}

      {#if selectedLessonContent.r && selectedLessonContent.r.length > 0}
        <div class="mb-6">
          <h3 class="text-xl font-bold text-white bg-gradient-to-r from-indigo-600/80 to-purple-700/80 backdrop-blur-sm p-4 rounded-xl mb-4">
            Lesson Resources
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each selectedLessonContent.r as resource}
              <div class="p-4 rounded-lg border-2 {getFileColor(resource.mimetype)}/50 backdrop-blur-sm transition-all cursor-pointer hover:bg-slate-800/30">
                <div class="flex items-center mb-2">
                  <span class="text-2xl mr-3">{getFileIcon(resource.mimetype)}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-white truncate">{resource.t}</div>
                    <div class="text-xs text-slate-400">{formatFileSize(resource.size)}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if selectedLessonContent.document}
        {@const lessonDoc = parseLessonDocument(selectedLessonContent)}
        {#if lessonDoc?.document?.modules}
          {@const sortedModules = sortModules(lessonDoc.document.modules)}
          <div class="prose prose-invert prose-indigo max-w-none">
            {#each sortedModules as module}
              {@const renderedModule = renderModule(module)}
              {#if renderedModule}
                {#if renderedModule.type === 'title'}
                  <h2 class="text-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-700 p-4 rounded-xl my-4">
                    {renderedModule.content}
                  </h2>
                {:else if renderedModule.type === 'text'}
                  <div class="my-4 p-4 bg-slate-900 rounded-xl">
                    {@html sanitizeHtml(renderedModule.content)}
                  </div>
                {:else if renderedModule.type === 'link'}
                  <LinkPreview url={renderedModule.content} preview={linkPreviews.get(renderedModule.content)} />
                {/if}
              {/if}
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="p-6">
      <h1 class="text-3xl font-bold text-white bg-gradient-to-r from-indigo-600/80 to-purple-700/80 backdrop-blur-sm p-6 rounded-xl mb-6">
        {coursePayload.t}
      </h1>

      {#if parsedDocument?.document?.modules}
        {@const sortedModules = sortModules(parsedDocument.document.modules)}
        <div class="prose prose-invert prose-indigo max-w-none">
          {#each sortedModules as module}
            {@const renderedModule = renderModule(module)}
            {#if renderedModule}
              {#if renderedModule.type === 'title'}
                <h2 class="text-xl font-bold text-white bg-gradient-to-r from-indigo-600/80 to-purple-700/80 backdrop-blur-sm p-4 rounded-xl mb-4">
                  {renderedModule.content}
                </h2>
              {:else if renderedModule.type === 'text'}
                <div class="mb-6 p-4 bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/50">
                  {@html sanitizeHtml(renderedModule.content)}
                </div>
              {:else if renderedModule.type === 'resources'}
                <div class="mb-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {#each renderedModule.content as resource}
                      {@const fileDetails = coursePayload.cf.find(f => f.uuid === resource.uuid)}
                      {#if fileDetails}
                        <div class="p-4 rounded-lg border-2 {getFileColor(fileDetails.mimetype)}/50 backdrop-blur-sm transition-all cursor-pointer hover:bg-slate-800/30">
                          <div class="flex items-center mb-2">
                            <span class="text-2xl mr-3">{getFileIcon(fileDetails.mimetype)}</span>
                            <div class="flex-1 min-w-0">
                              <div class="font-semibold text-white truncate">{fileDetails.filename}</div>
                              <div class="text-xs text-slate-400">{formatFileSize(fileDetails.size)}</div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>
              {:else if renderedModule.type === 'link'}
                <LinkPreview url={renderedModule.content} preview={linkPreviews.get(renderedModule.content)} />
              {/if}
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div> 