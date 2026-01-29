/**
 * Streaklet Progress Page
 * Charts, insights, and analytics
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!requireAuth()) return;

    // Initialize progress page
    initProgressPage();
});

async function initProgressPage() {
    // Load user info
    loadUserInfo();

    // Load data
    await Promise.all([
        loadWeeklyChart(),
        loadBestStreaks(),
        loadInsights()
    ]);

    // Setup event listeners
    setupProgressListeners();
}

function loadUserInfo() {
    const user = api.getUser();
    const avatarEl = document.querySelector('.user-avatar img');

    if (avatarEl && user) {
        avatarEl.alt = user.name;
    }
}

// ═══════════════════════════════════════════════════════════════
// Weekly/Monthly Chart
// ═══════════════════════════════════════════════════════════════

let currentChartView = 'weekly';

async function loadWeeklyChart() {
    const chartContainer = document.getElementById('completionChart');
    if (!chartContainer) return;

    try {
        const response = await api.getWeeklyStats();

        if (response.success) {
            renderChart(response.data.dailyStats);
        }
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

async function loadMonthlyChart() {
    // For monthly, we'll show weekly averages
    const chartContainer = document.getElementById('completionChart');
    if (!chartContainer) return;

    try {
        const response = await api.getMonthlyStats();

        if (response.success) {
            // Show monthly summary
            chartContainer.innerHTML = `
        <div class="monthly-summary">
          <div class="stat-box">
            <span class="stat-value">${response.data.totalCompleted}</span>
            <span class="stat-label">Habits Completed</span>
          </div>
          <div class="stat-box">
            <span class="stat-value">${response.data.completionRate}%</span>
            <span class="stat-label">Completion Rate</span>
          </div>
        </div>
      `;
        }
    } catch (error) {
        console.error('Error loading monthly chart:', error);
    }
}

function renderChart(dailyStats) {
    const chartContainer = document.getElementById('completionChart');
    if (!chartContainer) return;

    const maxPercentage = 100;
    const maxHeight = 150; // pixels

    let barsHTML = dailyStats.map(day => {
        const height = (day.percentage / maxPercentage) * maxHeight;
        return `
      <div class="chart-bar-wrapper">
        <div class="chart-percentage">${day.percentage}%</div>
        <div class="chart-bar-container">
          <div class="bar-fill" style="height: ${Math.max(8, height)}px;"></div>
        </div>
        <div class="bar-label">${day.day}</div>
        <div class="bar-check">${day.isPerfectDay ? '✓' : ''}</div>
      </div>
    `;
    }).join('');

    chartContainer.innerHTML = `
    <div class="chart-bars-container">
      ${barsHTML}
    </div>
  `;

    // Add inline styles for chart
    const style = document.createElement('style');
    style.textContent = `
    .chart-bars-container {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 200px;
      padding: 20px 0;
    }
    .chart-bar-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .chart-percentage {
      font-size: 0.7rem;
      color: #718096;
      font-weight: 500;
    }
    .chart-bar-container {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 150px;
    }
    .bar-fill {
      width: 32px;
      background: linear-gradient(180deg, #4A7C59 0%, #6B9B7A 100%);
      border-radius: 6px 6px 0 0;
      transition: height 0.5s ease;
    }
    .bar-label {
      font-size: 0.75rem;
      color: #718096;
      font-weight: 500;
      margin-top: 8px;
    }
    .bar-check {
      font-size: 0.75rem;
      color: #4A7C59;
      height: 16px;
    }
    .monthly-summary {
      display: flex;
      justify-content: center;
      gap: 40px;
      padding: 40px 0;
    }
    .stat-box {
      text-align: center;
    }
    .stat-value {
      display: block;
      font-size: 2.5rem;
      font-weight: 700;
      color: #4A7C59;
    }
    .stat-label {
      font-size: 0.9rem;
      color: #718096;
    }
  `;
    document.head.appendChild(style);
}

function toggleChartView(view) {
    currentChartView = view;

    // Update toggle buttons
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Load appropriate data
    if (view === 'weekly') {
        loadWeeklyChart();
    } else {
        loadMonthlyChart();
    }
}

// ═══════════════════════════════════════════════════════════════
// Best Streaks
// ═══════════════════════════════════════════════════════════════

async function loadBestStreaks() {
    const container = document.getElementById('bestStreaksList');
    if (!container) return;

    try {
        const response = await api.getStreakStats();

        if (response.success && response.data.bestStreaks.length > 0) {
            container.innerHTML = response.data.bestStreaks.map(streak => `
        <div class="best-streak-item">
          <div class="habit-icon" style="background: ${streak.color}20;">
            ${streak.icon || '🎯'}
          </div>
          <div class="best-streak-info">
            <div class="best-streak-title">${escapeHtml(streak.title)}</div>
            <div class="best-streak-category">${streak.category}</div>
          </div>
          <div class="best-streak-count">
            ${streak.currentStreak > 0 ? streak.currentStreak + ' Day Streak' : 'Longest: ' + streak.longestStreak}
            🔥🔥
          </div>
        </div>
      `).join('');
        } else {
            container.innerHTML = `
        <div class="empty-state">
          <p>Complete habits to build streaks!</p>
        </div>
      `;
        }
    } catch (error) {
        console.error('Error loading best streaks:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Insights
// ═══════════════════════════════════════════════════════════════

async function loadInsights() {
    const container = document.getElementById('insightsGrid');
    if (!container) return;

    try {
        const response = await api.getInsights();

        if (response.success) {
            const { bestDay, bestTime } = response.data;

            let insightsHTML = '';

            if (bestDay) {
                insightsHTML += `
          <div class="insight-card">
            <div class="insight-icon">⭐</div>
            <div class="insight-text">${bestDay.message}</div>
          </div>
        `;
            }

            if (bestTime) {
                insightsHTML += `
          <div class="insight-card">
            <div class="insight-icon">🕐</div>
            <div class="insight-text">${bestTime.message}</div>
          </div>
        `;
            }

            if (insightsHTML) {
                container.innerHTML = insightsHTML;
            } else {
                container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 20px;">
            <p>Complete more habits to unlock insights!</p>
          </div>
        `;
            }
        }
    } catch (error) {
        console.error('Error loading insights:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════

function setupProgressListeners() {
    // Chart toggle buttons
    document.querySelectorAll('.chart-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleChartView(btn.dataset.view));
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => api.logout());
    }
}

// Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
