<script lang="ts">
  import { onMount } from 'svelte';
  import { seqtaFetch } from '../../utils/netUtil';
  import { Icon } from 'svelte-hero-icons';
  import { MagnifyingGlass, Funnel, User, AcademicCap, MapPin } from 'svelte-hero-icons';

  interface Student {
    id: number;
    firstname: string;
    surname: string;
    xx_display: string;
    year: string;
    sub_school: string;
    house: string;
    house_colour: string;
    campus: string;
    rollgroup: string;
  }

  let students: Student[] = $state([]);
  let loading = $state(true);
  let error: string | null = $state(null);
  let search = $state('');
  let selectedYear = $state('all');
  let selectedSubSchool = $state('all');
  let selectedHouse = $state('all');
  let selectedCampus = $state('all');
  let showFilters = $state(false);

  let years: string[] = $state([]);
  let subSchools: string[] = $state([]);
  let houses: string[] = $state([]);
  let campuses: string[] = $state([]);

  async function loadStudents() {
    loading = true;
    error = null;
    try {
      const res = await seqtaFetch('/seqta/student/load/message/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {
          mode: 'student'
        },
      });
      
      // Parse the response - it might be a string that needs parsing
      const data = typeof res === 'string' ? JSON.parse(res) : res;
      
      // Handle different possible response structures
      let studentArray: Student[] = [];
      if (Array.isArray(data)) {
        studentArray = data;
      } else if (data && typeof data === 'object') {
        // Check if it's wrapped in a payload or other property
        if (data.payload && Array.isArray(data.payload)) {
          studentArray = data.payload;
        } else if (data.data && Array.isArray(data.data)) {
          studentArray = data.data;
        } else if (data.students && Array.isArray(data.students)) {
          studentArray = data.students;
        } else {
          // Try to find any array property
          const arrayProps = Object.values(data).filter(val => Array.isArray(val));
          if (arrayProps.length > 0) {
            studentArray = arrayProps[0];
          }
        }
      }
      
      students = studentArray;
      
      // Extract unique values for filters
      const uniqueYears = [...new Set(students.map(s => s.year))].sort();
      const uniqueSubSchools = [...new Set(students.map(s => s.sub_school))].sort();
      const uniqueHouses = [...new Set(students.map(s => s.house))].sort();
      const uniqueCampuses = [...new Set(students.map(s => s.campus))].sort();
      
      years = uniqueYears;
      subSchools = uniqueSubSchools;
      houses = uniqueHouses;
      campuses = uniqueCampuses;
      
      console.log('Loaded students:', students.length, 'students');
      console.log('Sample student:', students[0]);
      console.log('Response structure:', typeof res, res);
      
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error('Failed to load students:', e);
    } finally {
      loading = false;
    }
  }

  function studentMatches(student: Student): boolean {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      student.firstname.toLowerCase().includes(searchLower) ||
      student.surname.toLowerCase().includes(searchLower) ||
      student.xx_display.toLowerCase().includes(searchLower) ||
      student.rollgroup.toLowerCase().includes(searchLower);
    
    const matchesYear = selectedYear === 'all' || student.year === selectedYear;
    const matchesSubSchool = selectedSubSchool === 'all' || student.sub_school === selectedSubSchool;
    const matchesHouse = selectedHouse === 'all' || student.house === selectedHouse;
    const matchesCampus = selectedCampus === 'all' || student.campus === selectedCampus;
    
    return matchesSearch && matchesYear && matchesSubSchool && matchesHouse && matchesCampus;
  }

  function clearFilters() {
    search = '';
    selectedYear = 'all';
    selectedSubSchool = 'all';
    selectedHouse = 'all';
    selectedCampus = 'all';
  }

  function getFilteredStudents() {
    return students.filter(studentMatches);
  }

  onMount(loadStudents);
</script>

<div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg accent-bg">
        <Icon src={User} class="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">School Directory</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Browse and search through all students
        </p>
      </div>
    </div>
    
    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
        onclick={() => (showFilters = !showFilters)}
      >
        <Icon src={Funnel} class="w-4 h-4" />
        Filters
      </button>
      
      <button
        class="px-4 py-2 text-sm font-medium text-white accent-bg rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
        onclick={clearFilters}
      >
        Clear All
      </button>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="space-y-4">
    <!-- Search Bar -->
    <div class="relative">
      <Icon src={MagnifyingGlass} class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        bind:value={search}
        placeholder="Search by name, display name, or roll group..."
        class="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors duration-200"
      />
    </div>

    <!-- Filters Panel -->
    {#if showFilters}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Year Filter -->
          <div>
            <label for="year-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Year Level
            </label>
            <select
              id="year-filter"
              bind:value={selectedYear}
              class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors duration-200"
            >
              <option value="all">All Years</option>
              {#each years as year}
                <option value={year}>Year {year}</option>
              {/each}
            </select>
          </div>

          <!-- Sub School Filter -->
          <div>
            <label for="subschool-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sub School
            </label>
            <select
              id="subschool-filter"
              bind:value={selectedSubSchool}
              class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors duration-200"
            >
              <option value="all">All Sub Schools</option>
              {#each subSchools as subSchool}
                <option value={subSchool}>{subSchool}</option>
              {/each}
            </select>
          </div>

          <!-- House Filter -->
          <div>
            <label for="house-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              House
            </label>
            <select
              id="house-filter"
              bind:value={selectedHouse}
              class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors duration-200"
            >
              <option value="all">All Houses</option>
              {#each houses as house}
                <option value={house}>{house}</option>
              {/each}
            </select>
          </div>

          <!-- Campus Filter -->
          <div>
            <label for="campus-filter" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campus
            </label>
            <select
              id="campus-filter"
              bind:value={selectedCampus}
              class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors duration-200"
            >
              <option value="all">All Campuses</option>
              {#each campuses as campus}
                <option value={campus}>Campus {campus}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Results -->
  <div class="space-y-4">
    <!-- Results Summary -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Showing {getFilteredStudents().length} of {students.length} students
      </p>
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 accent-border"></div>
        <span class="ml-3 text-gray-600 dark:text-gray-400">Loading students...</span>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error loading students</h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        </div>
      </div>
    {:else if getFilteredStudents().length === 0}
      <!-- Empty State -->
      <div class="text-center py-12">
        <Icon src={User} class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No students found</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your search or filters to find what you're looking for.
        </p>
      </div>
    {:else}
      <!-- Students Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {#each getFilteredStudents() as student (student.id)}
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200 transform hover:scale-[1.02]">
            <!-- Student Avatar -->
            <div class="flex items-center gap-3 mb-3">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style="background-color: {student.house_colour}"
              >
                {student.firstname.charAt(0)}{student.surname.charAt(0)}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {student.xx_display}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {student.firstname} {student.surname}
                </p>
              </div>
            </div>

            <!-- Student Details -->
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-xs">
                <Icon src={AcademicCap} class="w-3 h-3 text-gray-400" />
                <span class="text-gray-600 dark:text-gray-400">Year {student.year}</span>
              </div>
              
              <div class="flex items-center gap-2 text-xs">
                <Icon src={MapPin} class="w-3 h-3 text-gray-400" />
                <span class="text-gray-600 dark:text-gray-400">{student.sub_school}</span>
              </div>

              <div class="flex items-center gap-2 text-xs">
                <div 
                  class="w-3 h-3 rounded-full"
                  style="background-color: {student.house_colour}"
                ></div>
                <span class="text-gray-600 dark:text-gray-400">{student.house}</span>
              </div>

              <div class="text-xs text-gray-500 dark:text-gray-400">
                {student.rollgroup}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div> 