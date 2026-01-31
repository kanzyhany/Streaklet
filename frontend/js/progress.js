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
      renderChart(response.data.dailyStats, 'completionChart', 'var(--primary-green)');
      renderChart(response.data.dailyStats, 'missedChart', 'var(--status-missed)', 'missed');
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

function renderChart(dailyStats, containerId, barColor, type = 'completed') {
  const chartContainer = document.getElementById(containerId);
  if (!chartContainer) return;

  const maxCount = Math.max(...dailyStats.map(d => type === 'missed' ? d.missed : d.total), 5); // Minimum scale of 5 
  const maxHeight = 150; // pixels

  let barsHTML = dailyStats.map(day => {
    const value = type === 'missed' ? day.missed : day.percentage;
    const maxVal = type === 'missed' ? maxCount : 100;
    const label = type === 'missed' ? day.missed : `${day.percentage}%`;

    const height = (value / maxVal) * maxHeight;

    return `
      <div class="chart-bar">
        <div class="bar-percentage">${label}</div>
        <div class="bar-fill-container">
          <div class="bar-fill" style="height: ${Math.max(8, height)}px; background: ${barColor}; opacity: ${height > 0 ? 1 : 0.3}"></div>
        </div>
        <div class="bar-label">${day.day}</div>
      </div>
    `;
  }).join('');

  chartContainer.innerHTML = `
    <div class="chart-bars">
      ${barsHTML}
    </div>
  `;
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
      // Filter out 0 streaks, Sort by highest (current or longest), and take top 2
      const topStreaks = response.data.bestStreaks
        .filter(s => s.currentStreak > 0 || s.longestStreak > 0)
        .sort((a, b) => {
          const maxA = Math.max(a.currentStreak, a.longestStreak);
          const maxB = Math.max(b.currentStreak, b.longestStreak);
          return maxB - maxA;
        })
        .slice(0, 2);

      if (topStreaks.length > 0) {
        container.innerHTML = topStreaks.map(streak => `
              <div class="best-streak-item">
                  <div class="habit-icon" style="background: ${streak.color}20; color: ${streak.color}; border: 1px solid ${streak.color}40;">
                      ${streak.icon || '🎯'}
                  </div>
                  <div class="best-streak-info">
                      <div class="best-streak-title">${escapeHtml(streak.title)}</div>
                      <div class="best-streak-category">${streak.category}</div>
                  </div>
                  <div class="best-streak-count">
                      ${streak.currentStreak > 0 ? streak.currentStreak + ' Day Streak' : 'Longest: ' + streak.longestStreak + ' Days'}
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
