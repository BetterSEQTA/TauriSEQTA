<script lang="ts">
  import { scale } from 'svelte/transition';
  import type { Assessment } from '$lib/types';

  export let data: Assessment[] = [];

  // Graph dimensions
  const width = 800;
  const height = 400;
  const padding = 40;
  const barWidth = 60;
  const barSpacing = 20;

  let barPaths: { path: string; count: number; status: string }[] = [];
  let yLabels: string[] = [];

  function getLetterGrade(percentage: number | undefined): string {
    if (percentage === undefined) return '';
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 40) return 'D';
    return 'E';
  }

  function getStatusColor(status: string): string {
    const grade = parseInt(status.split('-')[0]);
    if (grade >= 90) return 'rgb(34, 197, 94)'; // green
    if (grade >= 80) return 'rgb(34, 197, 94)'; // green
    if (grade >= 70) return 'rgb(234, 179, 8)'; // yellow
    if (grade >= 60) return 'rgb(234, 179, 8)'; // yellow
    if (grade >= 50) return 'rgb(239, 68, 68)'; // red
    return 'rgb(239, 68, 68)'; // red
  }

  $: {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('No assessments data available');
      barPaths = [];
      yLabels = [];
    } else {
      // Filter for assessments with grades and group them into ranges
      const gradedAssessments = data.filter((a) => a.finalGrade !== undefined);
      const gradeRanges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '50-59': 0,
        '0-49': 0,
      };

      gradedAssessments.forEach((assessment) => {
        const grade = assessment.finalGrade!;
        if (grade >= 90) gradeRanges['90-100']++;
        else if (grade >= 80) gradeRanges['80-89']++;
        else if (grade >= 70) gradeRanges['70-79']++;
        else if (grade >= 60) gradeRanges['60-69']++;
        else if (grade >= 50) gradeRanges['50-59']++;
        else gradeRanges['0-49']++;
      });

      const maxCount = Math.max(...Object.values(gradeRanges), 1);
      const yScale = (height - padding * 2) / maxCount;

      // Generate y-axis labels at intervals of 10
      const yStep = Math.max(10, (Math.ceil(maxCount / 10) * 10) / 10); // At least 10, or enough to keep ~10 labels
      yLabels = [];
      for (let i = 0; i <= maxCount; i += yStep) {
        yLabels.push(i.toString());
      }
      if (yLabels[yLabels.length - 1] !== maxCount.toString()) {
        yLabels.push(maxCount.toString());
      }

      // Generate bar paths
      barPaths = Object.entries(gradeRanges).map(([range, count], index) => {
        const x = padding + index * (barWidth + barSpacing);
        const barHeight = count * yScale;
        const path = `M ${x} ${height - padding} h ${barWidth} v -${barHeight} h -${barWidth} Z`;
        return { path, count, status: range };
      });
    }
  }
</script>

<div class="flex-1 min-w-[350px] max-w-[600px] flex flex-col">
  <h2 class="flex gap-2 items-center mb-6 text-2xl font-bold text-slate-900 dark:text-white">
    <span
      class="inline-block flex justify-center items-center w-6 h-6 text-white bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-full shadow">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>
    </span>
    Grade Distribution
  </h2>
  <div class="overflow-x-auto">
    <svg {width} {height} class="min-w-[350px] max-w-[600px]">
      <!-- Grid lines -->
      {#each yLabels as _, i}
        <line
          x1={padding}
          y1={height - padding - (i * (height - padding * 2)) / (yLabels.length - 1)}
          x2={width - padding}
          y2={height - padding - (i * (height - padding * 2)) / (yLabels.length - 1)}
          class="stroke-slate-200 dark:stroke-slate-700"
          stroke-width="1" />
      {/each}
      <!-- Y-axis labels -->
      {#each yLabels as label, i}
        <text
          x={padding - 10}
          y={height - padding - (i * (height - padding * 2)) / (yLabels.length - 1)}
          class="text-xs fill-slate-500 dark:fill-slate-400"
          text-anchor="end"
          dominant-baseline="middle">
          {label}
        </text>
      {/each}
      <!-- Bars -->
      {#each barPaths as { path, count, status }, i}
        <g
          class="transition-all duration-300 hover:opacity-80"
          in:scale={{ duration: 350, delay: i * 60 }}>
          <path d={path} fill={getStatusColor(status)} class="transition-all duration-300" />
          <text
            x={padding + i * (barWidth + barSpacing) + barWidth / 2}
            y={height - padding + 20}
            class="text-xs fill-slate-500 dark:fill-slate-400"
            text-anchor="middle">
            {status}% {getLetterGrade(
              (() => {
                const [min] = status.split('-');
                return Number(min);
              })(),
            )}
          </text>
          <text
            x={padding + i * (barWidth + barSpacing) + barWidth / 2}
            y={height -
              padding -
              count * ((height - padding * 2) / Math.max(...yLabels.map(Number), 1)) -
              10}
            class="text-sm font-medium fill-slate-900 dark:fill-slate-100"
            text-anchor="middle">
            {count}
          </text>
        </g>
      {/each}
    </svg>
  </div>
</div> 