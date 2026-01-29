/**
 * Streaklet Dashboard
 * Main dashboard functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!requireAuth()) return;

    // Initialize dashboard
    initDashboard();
});

async function initDashboard() {
    // Set greeting
    setGreeting();

    // Setup frequency toggle listeners early to ensure they work
    setupFrequencyToggleListeners();

    // Load user info
    loadUserInfo();

    // Load data
    await Promise.all([
        loadTodaysHabits(),
        loadStreakStats(),
        loadTodayProgress(),
        loadTodaysHabits(),
        loadStreakStats(),
        loadTodayProgress(),
        loadWeeklyOverview(),
        initNotifications()
    ]);

    // Setup event listeners
    setupEventListeners();
}

// ═══════════════════════════════════════════════════════════════
// Greeting
// ═══════════════════════════════════════════════════════════════

function setGreeting() {
    const greetingEl = document.getElementById('greeting');
    const user = api.getUser();
    const hour = new Date().getHours();

    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    const firstName = user?.name?.split(' ')[0] || 'there';
    greetingEl.textContent = `${greeting}, ${firstName} 👋`;
}

function loadUserInfo() {
    const user = api.getUser();
    const avatarEl = document.querySelector('.user-avatar img');

    if (avatarEl && user) {
        // Use initials or default avatar
        avatarEl.alt = user.name;
        // You can add profile picture support here
    }
}

// ═══════════════════════════════════════════════════════════════
// Today's Habits
// ═══════════════════════════════════════════════════════════════

async function loadTodaysHabits() {
    const container = document.getElementById('habitsList');
    if (!container) return;

    try {
        const response = await api.getTodaysHabits();

        if (response.success && response.data.length > 0) {
            container.innerHTML = response.data.map(habit => createHabitCard(habit)).join('');
            attachHabitListeners();
        } else {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <h3>No habits for today</h3>
          <p>Create your first habit to start building streaks!</p>
          <button class="btn btn-primary" onclick="openCreateHabitModal()">
            + Create Habit
          </button>
        </div>
      `;
        }
    } catch (error) {
        console.error('Error loading habits:', error);
        container.innerHTML = `
      <div class="empty-state">
        <p>Failed to load habits. Please try again.</p>
        <button class="btn btn-secondary" onclick="loadTodaysHabits()">Retry</button>
      </div>
    `;
    }
}

function createHabitCard(habit) {
    const status = habit.todayStatus || 'pending';
    const statusBadge = getStatusBadge(status, habit.reminderTime);
    const categoryClass = habit.category.toLowerCase();

    return `
    <div class="habit-card" data-habit-id="${habit._id}" data-status="${status}">
      <div class="habit-icon ${categoryClass}">
        ${habit.icon || '🎯'}
      </div>
      <div class="habit-info">
        <div class="habit-title">${escapeHtml(habit.title)}</div>
        <div class="habit-category">${habit.category}</div>
      </div>
      <div class="habit-status">
        ${statusBadge}
        <button class="status-action" title="More options">
          <span>›</span>
        </button>
      </div>
    </div>
  `;
}

function getStatusBadge(status, reminderTime) {
    switch (status) {
        case 'done':
            return '<span class="status-badge done">Done! ✓</span>';
        case 'in_progress':
            return '<span class="status-badge in-progress">In Progress ›</span>';
        case 'missed':
            return '<span class="status-badge missed">Missed ›</span>';
        case 'skipped':
            return '<span class="status-badge pending">Skipped</span>';
        case 'pending':
        default:
            const now = new Date();
            const [hours, minutes] = (reminderTime || '18:00').split(':');
            const reminderDate = new Date();
            reminderDate.setHours(parseInt(hours), parseInt(minutes), 0);

            if (now < reminderDate) {
                return `<span class="status-badge upcoming">Upcoming ${reminderTime} 🕐</span>`;
            }
            return '<span class="status-badge pending">Pending ›</span>';
    }
}

function attachHabitListeners() {
    const habitCards = document.querySelectorAll('.habit-card');

    habitCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const habitId = card.dataset.habitId;
            const currentStatus = card.dataset.status;

            // If clicking the action button, show menu
            if (e.target.closest('.status-action')) {
                showHabitMenu(habitId, card);
                return;
            }

            // Quick toggle: pending/in_progress -> done
            if (currentStatus === 'pending' || currentStatus === 'in_progress') {
                updateHabitStatus(habitId, 'done');
            }
        });
    });
}

async function updateHabitStatus(habitId, status) {
    try {
        const response = await api.logHabit(habitId, status);

        if (response.success) {
            // Refresh all data
            await Promise.all([
                loadTodaysHabits(),
                loadStreakStats(),
                loadTodayProgress(),
                loadWeeklyOverview()
            ]);
        }
    } catch (error) {
        console.error('Error updating habit:', error);
        alert('Failed to update habit. Please try again.');
    }
}

function showHabitMenu(habitId, cardElement) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.habit-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'habit-menu';
    menu.style.cssText = `
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px;
    z-index: 100;
    min-width: 150px;
  `;

    menu.innerHTML = `
    <button class="menu-item" onclick="updateHabitStatus('${habitId}', 'done')">
      ✓ Mark Done
    </button>
    <button class="menu-item" onclick="updateHabitStatus('${habitId}', 'in_progress')">
      ⏳ In Progress
    </button>
    <button class="menu-item" onclick="updateHabitStatus('${habitId}', 'skipped')">
      ⏭ Skip Today
    </button>
    <button class="menu-item" onclick="updateHabitStatus('${habitId}', 'missed')">
      ✗ Mark Missed
    </button>
    <hr style="margin: 8px 0; border: none; border-top: 1px solid #e2e8f0;">
    <button class="menu-item" onclick="editHabit('${habitId}')">
      ✏️ Edit Habit
    </button>
  `;

    // Style menu items
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      text-align: left;
      border: none;
      background: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
    `;
        item.addEventListener('mouseenter', () => item.style.background = '#f5f5f5');
        item.addEventListener('mouseleave', () => item.style.background = 'none');
    });

    cardElement.style.position = 'relative';
    cardElement.appendChild(menu);

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

// ═══════════════════════════════════════════════════════════════
// Streak Stats
// ═══════════════════════════════════════════════════════════════

async function loadStreakStats() {
    const currentStreakEl = document.getElementById('currentStreak');
    const longestStreakEl = document.getElementById('longestStreak');
    const missedAlertEl = document.getElementById('missedAlert');

    try {
        const [streakResponse, todayResponse] = await Promise.all([
            api.getStreakStats(),
            api.getTodayStats()
        ]);

        if (streakResponse.success) {
            currentStreakEl.querySelector('h3').textContent = `${streakResponse.data.currentStreak} Days`;
            longestStreakEl.querySelector('h3').textContent = `${streakResponse.data.longestStreak} Days`;
        }

        if (todayResponse.success && todayResponse.data.missedHabits > 0) {
            missedAlertEl.classList.remove('hidden');
            missedAlertEl.querySelector('.missed-count').textContent = todayResponse.data.missedHabits;
            missedAlertEl.querySelector('.missed-text span').textContent =
                `${todayResponse.data.missedHabits} task${todayResponse.data.missedHabits > 1 ? 's' : ''} missed today`;
        } else {
            missedAlertEl.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading streak stats:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Today's Progress
// ═══════════════════════════════════════════════════════════════

async function loadTodayProgress() {
    const progressEl = document.getElementById('progressPercentage');
    const ringEl = document.getElementById('progressRing');

    try {
        const response = await api.getTodayStats();

        if (response.success) {
            const percentage = response.data.completionPercentage;
            progressEl.textContent = `${percentage}%`;

            // Update SVG ring
            if (ringEl) {
                const circle = ringEl.querySelector('.progress-ring-fill');
                const radius = circle.r.baseVal.value;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (percentage / 100) * circumference;

                circle.style.strokeDasharray = circumference;
                circle.style.strokeDashoffset = offset;
            }
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Weekly Overview
// ═══════════════════════════════════════════════════════════════

async function loadWeeklyOverview() {
    const chartContainer = document.getElementById('weeklyChart');
    const perfectDaysEl = document.getElementById('perfectDays');

    try {
        const response = await api.getWeeklyStats();

        if (response.success && chartContainer) {
            const { dailyStats, perfectDays } = response.data;

            // Update chart bars
            const bars = chartContainer.querySelectorAll('.chart-bar');
            dailyStats.forEach((day, index) => {
                if (bars[index]) {
                    const fillEl = bars[index].querySelector('.bar-fill');
                    const checkEl = bars[index].querySelector('.bar-check');

                    // Scale height (max 100px)
                    const height = Math.max(8, (day.percentage / 100) * 100);
                    fillEl.style.height = `${height}px`;

                    // Show checkmark for perfect days
                    checkEl.textContent = day.isPerfectDay ? '✓' : '';
                }
            });

            // Update perfect days count
            if (perfectDaysEl) {
                perfectDaysEl.innerHTML = `<strong>${perfectDays}</strong> Perfect Days this week!`;
            }
        }
    } catch (error) {
        console.error('Error loading weekly overview:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Create Habit Modal
// ═══════════════════════════════════════════════════════════════

function openCreateHabitModal() {
    const modal = document.getElementById('habitModal');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('habitForm').reset();
        document.getElementById('habitForm').dataset.habitId = '';
        document.getElementById('modalTitle').textContent = 'Create New Habit';

        // Reset frequency type to weekly
        document.querySelectorAll('.frequency-type-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.style.borderColor = 'transparent';
            opt.style.background = 'var(--bg-cream)';
            if (opt.dataset.type === 'weekly') {
                opt.classList.add('selected');
                opt.style.borderColor = 'var(--primary)';
                opt.style.background = 'rgba(74, 124, 89, 0.1)';
                opt.querySelector('input').checked = true;
            }
        });
        document.getElementById('weeklyFrequencyGroup').style.display = 'block';
        document.getElementById('yearlyFrequencyGroup').style.display = 'none';
        document.getElementById('oneTimeFrequencyGroup').style.display = 'none';
        document.getElementById('specificDate').value = '';

        // Reset all checkboxes to checked
        document.querySelectorAll('input[name="frequency"]').forEach(cb => cb.checked = true);
    }
}

function closeHabitModal() {
    const modal = document.getElementById('habitModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function saveHabit(e) {
    e.preventDefault();

    const form = document.getElementById('habitForm');
    const habitId = form.dataset.habitId;
    const frequencyType = document.querySelector('input[name="frequencyType"]:checked')?.value || 'weekly';

    const habitData = {
        title: document.getElementById('habitTitle').value.trim(),
        category: document.getElementById('habitCategory').value,
        frequencyType: frequencyType,
        reminderTime: document.getElementById('habitReminder').value,
        icon: document.getElementById('habitIcon').value || '🎯',
        color: document.getElementById('habitColor').value || '#4A7C59'
    };

    // Set frequency or yearly date based on type
    if (frequencyType === 'yearly') {
        habitData.yearlyMonth = parseInt(document.getElementById('yearlyMonth').value);
        habitData.yearlyDay = parseInt(document.getElementById('yearlyDay').value);
    } else if (frequencyType === 'one-time') {
        habitData.specificDate = document.getElementById('specificDate').value;
    } else {
        habitData.frequency = getSelectedFrequency();
    }

    try {
        let response;
        if (habitId) {
            response = await api.updateHabit(habitId, habitData);
        } else {
            response = await api.createHabit(habitData);
        }

        if (response.success) {
            closeHabitModal();
            loadTodaysHabits();
        }
    } catch (error) {
        console.error('Error saving habit:', error);
        alert('Failed to save habit. Please try again.');
    }
}

function getSelectedFrequency() {
    const checkboxes = document.querySelectorAll('input[name="frequency"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function editHabit(habitId) {
    try {
        const response = await api.getHabit(habitId);

        if (response.success) {
            const habit = response.data;
            const modal = document.getElementById('habitModal');
            const form = document.getElementById('habitForm');

            // Fill form
            document.getElementById('habitTitle').value = habit.title;
            document.getElementById('habitCategory').value = habit.category;
            document.getElementById('habitReminder').value = habit.reminderTime;
            document.getElementById('habitIcon').value = habit.icon;
            document.getElementById('habitColor').value = habit.color;

            // Set frequency type and related fields
            const frequencyType = habit.frequencyType || 'weekly';
            document.querySelectorAll('.frequency-type-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.style.borderColor = 'transparent';
                opt.style.background = 'var(--bg-cream)';
                if (opt.dataset.type === frequencyType) {
                    opt.classList.add('selected');
                    opt.style.borderColor = 'var(--primary)';
                    opt.style.background = 'rgba(74, 124, 89, 0.1)';
                    opt.querySelector('input').checked = true;
                }
            });

            const weeklyGroup = document.getElementById('weeklyFrequencyGroup');
            const yearlyGroup = document.getElementById('yearlyFrequencyGroup');
            const oneTimeGroup = document.getElementById('oneTimeFrequencyGroup');

            if (frequencyType === 'yearly') {
                weeklyGroup.style.display = 'none';
                yearlyGroup.style.display = 'block';
                oneTimeGroup.style.display = 'none';
                document.getElementById('yearlyMonth').value = habit.yearlyMonth || 1;
                // Populate days for selected month first
                const daysInMonth = new Date(2024, habit.yearlyMonth || 1, 0).getDate();
                const daySelect = document.getElementById('yearlyDay');
                daySelect.innerHTML = '';
                for (let i = 1; i <= daysInMonth; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = i;
                    daySelect.appendChild(opt);
                }
                document.getElementById('yearlyDay').value = habit.yearlyDay || 1;
            } else if (frequencyType === 'one-time') {
                weeklyGroup.style.display = 'none';
                yearlyGroup.style.display = 'none';
                oneTimeGroup.style.display = 'block';
                if (habit.specificDate) {
                    document.getElementById('specificDate').value = habit.specificDate.split('T')[0];
                }
            } else {
                weeklyGroup.style.display = 'block';
                yearlyGroup.style.display = 'none';
                oneTimeGroup.style.display = 'none';
                // Set frequency checkboxes
                document.querySelectorAll('input[name="frequency"]').forEach(cb => {
                    cb.checked = (habit.frequency || []).includes(cb.value);
                });
            }

            form.dataset.habitId = habitId;
            document.getElementById('modalTitle').textContent = 'Edit Habit';
            modal.classList.add('show');
        }
    } catch (error) {
        console.error('Error loading habit:', error);
        alert('Failed to load habit. Please try again.');
    }
}

// ═══════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════

function setupEventListeners() {
    // Create habit button
    const createBtn = document.getElementById('createHabitBtn');
    if (createBtn) {
        createBtn.addEventListener('click', openCreateHabitModal);
    }

    // Modal close
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeHabitModal);
    }

    // Modal overlay click
    const modalOverlay = document.getElementById('habitModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeHabitModal();
        });
    }

    // Habit form submit
    const habitForm = document.getElementById('habitForm');
    if (habitForm) {
        habitForm.addEventListener('submit', saveHabit);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => api.logout());
    }
}

// ═══════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════

let notificationPollInterval;

async function initNotifications() {
    // Initial load
    await loadNotificationCount();

    // Check for new notifications every minute
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    notificationPollInterval = setInterval(loadNotificationCount, 60000);

    // Attempt to generate notifications for today if needed
    try {
        await api.generateNotifications();
    } catch (e) {
        // Silent fail
    }
}

async function loadNotificationCount() {
    try {
        const response = await api.getNotificationCount();
        if (response.success) {
            updateNotificationBadge(response.data.count);
        }
    } catch (error) {
        console.error('Error loading notification count:', error);
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = count;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

async function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const isHidden = panel.classList.contains('hidden');

    if (isHidden) {
        // Show panel
        panel.classList.remove('hidden');
        loadNotifications();

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closePanel(e) {
                if (!panel.contains(e.target) && !e.target.closest('#notificationBell')) {
                    panel.classList.add('hidden');
                    document.removeEventListener('click', closePanel);
                }
            });
        }, 0);
    } else {
        panel.classList.add('hidden');
    }
}

async function loadNotifications() {
    const list = document.getElementById('notificationList');

    try {
        // Show loading state if empty
        if (!list.children.length) {
            list.innerHTML = '<div class="flex-center" style="padding: 20px;"><div class="loading-spinner"></div></div>';
        }

        const response = await api.getNotifications();

        if (response.success) {
            updateNotificationBadge(response.unreadCount);

            if (response.data.length > 0) {
                list.innerHTML = response.data.map(renderNotificationItem).join('');

                // Add click listeners to mark as read
                document.querySelectorAll('.notification-item').forEach(item => {
                    item.addEventListener('click', () => markNotificationRead(item.dataset.id));
                });
            } else {
                list.innerHTML = `
            <div class="notification-empty">
              <span>🔔</span>
              <p>No notifications yet</p>
            </div>
          `;
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        list.innerHTML = '<div class="text-center" style="padding: 20px; color: var(--text-muted);">Failed to load notifications</div>';
    }
}

function renderNotificationItem(notification) {
    const time = new Date(notification.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isUnread = !notification.read;

    return `
    <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification._id}">
      <div class="notification-icon">
        ${notification.icon}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${time}</div>
      </div>
    </div>
  `;
}

async function markNotificationRead(id) {
    try {
        await api.markNotificationAsRead(id);
        // Refresh list to update UI state
        loadNotifications();
        loadNotificationCount();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function markAllAsRead() {
    try {
        await api.markAllNotificationsAsRead();
        loadNotifications();
        loadNotificationCount();
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupFrequencyToggleListeners() {
    document.querySelectorAll('.frequency-type-option').forEach(option => {
        option.addEventListener('click', () => {
            // Update UI selection
            document.querySelectorAll('.frequency-type-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.style.borderColor = 'transparent';
                opt.style.background = 'var(--bg-cream)';
                opt.querySelector('input').checked = false;
            });

            option.classList.add('selected');
            option.style.borderColor = 'var(--primary)';
            option.style.background = 'rgba(74, 124, 89, 0.1)';
            option.querySelector('input').checked = true;

            // Show/hide relevant fields
            const type = option.dataset.type;
            const weeklyGroup = document.getElementById('weeklyFrequencyGroup');
            const yearlyGroup = document.getElementById('yearlyFrequencyGroup');
            const oneTimeGroup = document.getElementById('oneTimeFrequencyGroup');

            weeklyGroup.style.display = 'none';
            yearlyGroup.style.display = 'none';
            oneTimeGroup.style.display = 'none';

            if (type === 'weekly') {
                weeklyGroup.style.display = 'block';
            } else if (type === 'yearly') {
                yearlyGroup.style.display = 'block';
            } else if (type === 'one-time') {
                oneTimeGroup.style.display = 'block';
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// Utility Functions
