/**
 * Level 1 - Simple Progress Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initProgressPage();
});

async function initProgressPage() {
    try {
        const [habitsRes, statsRes] = await Promise.all([
            api.getHabits(),
            api.getOverallStats()
        ]);

        if (habitsRes.success) renderWeeklyChart(habitsRes.data);
        if (statsRes.success) renderStats(statsRes.data);

        // Mock streaks for now based on habits
        renderStreaks(habitsRes.data);
    } catch (e) {
        console.error('Error loading progress:', e);
    }
}

function renderWeeklyChart(habits) {
    const chartContainer = document.getElementById('completionChart');
    if (!chartContainer) return;

    // Simple mock data for visualization in Level 1
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [40, 65, 80, 50, 90, 75, 60];

    chartContainer.innerHTML = `
        <div class="chart-bars">
            ${days.map((day, i) => `
                <div class="chart-bar">
                    <div class="bar-percentage">${data[i]}%</div>
                    <div class="bar-fill-container">
                        <div class="bar-fill" style="height: ${data[i] * 1.5}px; background: var(--primary-green);"></div>
                    </div>
                    <div class="bar-label">${day}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderStats(stats) {
    document.getElementById('totalPoints').textContent = `${stats.points} Points`;
    document.getElementById('totalGrace').textContent = `${stats.graceDays} Grace Days`;
}

function renderStreaks(habits) {
    const container = document.getElementById('bestStreaksList');
    if (!container || habits.length === 0) {
        container.innerHTML = '<p class="empty-state">No streaks yet. Keep going!</p>';
        return;
    }

    container.innerHTML = habits.slice(0, 2).map(h => `
        <div class="best-streak-item">
            <div class="habit-icon" style="background: ${h.color}20; color: ${h.color};">
                ${h.icon || '🎯'}
            </div>
            <div class="best-streak-info">
                <div class="best-streak-title">${h.title}</div>
                <div class="best-streak-category">${h.category}</div>
            </div>
            <div class="best-streak-count">
                5 Day Streak 🔥
            </div>
        </div>
    `).join('');
}
