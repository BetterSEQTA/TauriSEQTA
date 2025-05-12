<script lang="ts">
    import { onMount } from 'svelte';
    import { seqtaFetch } from '../../utils/seqtaFetch';

    interface HomeworkItem {
        meta: number;
        id: number;
        title: string;
        items: string[];
    }

    interface HomeworkResponse {
        payload: HomeworkItem[];
        status: string;
    }

    let homeworkData: HomeworkResponse | null = null;
    let error: string | null = null;
    let loading = true;

    async function fetchHomeworkData() {
        try {
            loading = true;
            error = null;
            console.log('Making POST request to homework endpoint...');
            const response = await seqtaFetch('/seqta/student/dashlet/summary/homework', {
                method: 'POST',
                body: {},
                params: {"majhvjju": ""}
            });
            homeworkData = JSON.parse(response);
        } catch (e: any) {
            console.error('Error details:', e);
            error = e.toString();
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        console.log('Dashboard component mounted');
        fetchHomeworkData();
    });
</script>

<div class="dashboard-container">
    <h1>Homework Dashboard</h1>
    
    {#if loading}
        <div class="loading">
            <p>Loading homework data...</p>
        </div>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else if homeworkData}
        <div class="homework-list">
            {#each homeworkData.payload as homework}
                <div class="homework-card">
                    <h2>{homework.title}</h2>
                    <div class="homework-items">
                        {#each homework.items as item}
                            <div class="homework-item">
                                <span class="bullet">•</span>
                                <span class="item-text">{item}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p>No homework data available</p>
    {/if}
</div>

<style>
    .dashboard-container {
        padding: 40px 0;
        max-width: 1200px;
        margin: 0 auto;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .loading {
        text-align: center;
        padding: 20px;
        color: #666;
    }

    .error {
        color: #d32f2f;
        padding: 16px;
        background-color: #ffebee;
        border-radius: 8px;
        margin: 16px 0;
    }

    .homework-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 100%;
        align-items: center;
    }

    .homework-card {
        background: #fcfcff;
        border-radius: 14px;
        padding: 24px 28px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10);
        border: 1.5px solid #e3e8f0;
        min-width: 340px;
        max-width: 480px;
        width: 100%;
        transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }

    .homework-card:hover {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 8px 32px rgba(26, 115, 232, 0.10);
        border-color: #b6ccf7;
    }

    .homework-card h2 {
        margin: 0 0 16px 0;
        color: #1a73e8;
        font-size: 1.25rem;
        font-weight: 600;
        border-bottom: 2px solid #e8f0fe;
        padding-bottom: 8px;
        background: none;
    }

    .homework-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .homework-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        line-height: 1.5;
        background-color: #f6f8fa;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #e8f0fe;
    }

    .bullet {
        color: #1a73e8;
        font-size: 1.2em;
        line-height: 1;
        margin-top: 2px;
    }

    .item-text {
        flex: 1;
        color: #202124;
    }
</style> 