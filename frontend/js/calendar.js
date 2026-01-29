document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    if (typeof requireAuth === 'function') {
        if (!requireAuth()) return;
    } else {
        // Fallback if requireAuth is not available (e.g. race condition)
        const token = localStorage.getItem('streaklet_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    initCalendar();
});

let currentDate = new Date();
let habits = [];
let monthLogs = {};

const MAX_VISIBLE_HABITS = 3;

async function initCalendar() {
    // Setup controls
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Day View controls
    document.getElementById('backToMonth').addEventListener('click', backToMonthView);

    // Load initial data
    try {
        const userRes = await api.getMe();
        if (userRes.success) {
            // Setup User Avatar if needed
        }

        // Fetch all habits once
        const habitsRes = await api.getHabits();
        if (habitsRes.success) {
            habits = habitsRes.data;
        }

        renderCalendar();
    } catch (error) {
        console.error('Init error:', error);
    }
}

function changeMonth(delta) {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    renderCalendar();
}

async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update Header
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('monthDisplay').textContent = `${months[month]} ${year}`;

    // Fetch Logs for this month
    // We fetch a bit more range to be safe or just strict month? API is strict month.
    // For padding days (prev/next month), logs won't be fetched. That's acceptable for now.
    try {
        const logsRes = await api.getMonthlyLogs(year, month + 1); // API expects 1-12
        monthLogs = {};
        if (logsRes.success) {
            logsRes.data.forEach(log => {
                const dateKey = log.date.split('T')[0];
                if (!monthLogs[dateKey]) monthLogs[dateKey] = {};
                monthLogs[dateKey][log.habitId._id || log.habitId] = log;
            });
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
    }

    const grid = document.getElementById('calendarGrid');
    // Clear existing days (keep headers)
    const headers = grid.querySelectorAll('.calendar-day-header');
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    // Calculate dates
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDayOfWeek; i++) {
        const day = prevMonthLastDay - startingDayOfWeek + 1 + i;
        grid.appendChild(createDayElement(day, true));
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        grid.appendChild(createDayElement(day, false, date));
    }

    // Next month padding
    const currentCells = startingDayOfWeek + totalDays;
    const remainingCells = 42 - currentCells; // 6 rows * 7 columns
    for (let i = 1; i <= remainingCells; i++) {
        grid.appendChild(createDayElement(i, true));
    }
}

function createDayElement(dayNumber, isOtherMonth, dateObj = null) {
    const el = document.createElement('div');
    el.className = `calendar-day ${isOtherMonth ? 'other-month' : ''}`;

    if (!isOtherMonth && dateObj) {
        const today = new Date();
        if (dateObj.toDateString() === today.toDateString()) {
            el.classList.add('today');
        }

        const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD

        el.innerHTML = `<div class="day-number">${dayNumber}</div>`;

        const habitsContainer = document.createElement('div');
        habitsContainer.className = 'day-habits';

        // Find habits for this day
        const dayHabits = getHabitsForDate(dateObj);

        dayHabits.slice(0, MAX_VISIBLE_HABITS).forEach(habit => {
            const log = monthLogs[dateStr] ? monthLogs[dateStr][habit._id] : null;
            const status = log ? log.status : 'pending'; // 'done', 'missed'

            const dot = document.createElement('div');
            dot.className = `habit-dot ${status}`;
            dot.textContent = habit.title;
            dot.title = habit.title; // Tooltip

            // Apply custom colors if available
            if (habit.color) {
                if (status === 'done') {
                    dot.style.backgroundColor = habit.color;
                    dot.style.color = '#ffffff';
                } else if (status === 'pending') {
                    dot.style.backgroundColor = `${habit.color}20`; // 12% opacity
                    dot.style.color = habit.color;
                }
                // Missed status keeps the default red styles (css)
            }

            habitsContainer.appendChild(dot);
        });

        if (dayHabits.length > MAX_VISIBLE_HABITS) {
            const more = document.createElement('div');
            more.className = 'more-indicator';
            more.textContent = `+${dayHabits.length - MAX_VISIBLE_HABITS} more`;
            habitsContainer.appendChild(more);
        }

        el.appendChild(habitsContainer);

        // Add click listener
        el.addEventListener('click', () => openDayView(dateObj, dayHabits));
    } else {
        el.innerHTML = `<div class="day-number">${dayNumber}</div>`;
    }

    return el;
}

function getHabitsForDate(date) {
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Normalize date for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return habits.filter(habit => {
        if (!habit.active) return false;

        // One-time
        if (habit.frequencyType === 'one-time') {
            if (!habit.specificDate) return false;
            const sDate = new Date(habit.specificDate);
            return sDate >= startOfDay && sDate <= endOfDay;
        }

        // Yearly
        if (habit.frequencyType === 'yearly') {
            return habit.yearlyMonth === month && habit.yearlyDay === day;
        }

        // Weekly (default)
        if (habit.frequencyType === 'weekly' || !habit.frequencyType) {
            return (habit.frequency || []).includes(dayName);
        }

        return false;
    });
}

// Notification Logic (Minimal)
async function toggleNotificationPanel() {
    // ... copied logic or simpler redirect? 
    // Implementing full logic as user expetation
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) loadNotifications();
}

async function loadNotifications() {
    const list = document.getElementById('notificationList');
    try {
        const res = await api.getNotifications();
        if (res.success && res.data.length > 0) {
            list.innerHTML = res.data.map(n => `
                <div class="notification-item ${!n.read ? 'unread' : ''}">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                </div>
             `).join('');
        } else {
            list.innerHTML = '<div class="notification-empty">No notifications</div>';
        }
    } catch (e) { console.error(e); }
}

async function markAllAsRead() {
    await api.markAllNotificationsAsRead();
    loadNotifications();
}

function openDayView(date, dayHabits) {
    const grid = document.getElementById('calendarGrid');
    const header = document.querySelector('.calendar-header');
    const dayView = document.getElementById('dayView');
    const title = document.getElementById('dayViewDate');
    const content = document.getElementById('dayViewContent');

    // Hide Grid and main Header
    grid.classList.add('hidden');
    header.classList.add('hidden');

    // Show Day View
    dayView.classList.remove('hidden');

    title.textContent = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (dayHabits.length === 0) {
        content.innerHTML = '<div class="empty-state"><h3>Rest Day!</h3><p>No habits scheduled for this day.</p></div>';
    } else {
        const dateStr = date.toLocaleDateString('en-CA');

        content.innerHTML = dayHabits.map(habit => {
            const log = monthLogs[dateStr] ? monthLogs[dateStr][habit._id] : null;
            const status = log ? log.status : 'pending';
            let statusText = status.charAt(0).toUpperCase() + status.slice(1);
            let timeText = '';

            if (status === 'done' && log && log.completedAt) {
                const time = new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                timeText = `<span style="font-size: 0.85em; color: var(--text-muted); margin-top: 4px; display: block;">Completed at ${time}</span>`;
            }

            // Status Badge Colors
            let badgeStyle = 'background: #eee; color: #666; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 500;';

            if (status === 'done') {
                badgeStyle = `background: ${habit.color ? habit.color + '20' : 'var(--primary-green-subtle)'}; color: ${habit.color || 'var(--primary-green)'}; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;`;
            } else if (status === 'missed') {
                badgeStyle = 'background: #ffe5e5; color: #d94b3d; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600;';
            }

            return `
                <div class="day-habit-item">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="font-size: 1.8rem;">${habit.icon || '📝'}</span>
                        <div>
                            <div style="font-weight: 600; color: var(--text-dark); font-size: 1.1rem;">${habit.title}</div>
                            ${timeText}
                        </div>
                    </div>
                    <span style="${badgeStyle}">${statusText}</span>
                </div>
            `;
        }).join('');
    }
}

function backToMonthView() {
    const grid = document.getElementById('calendarGrid');
    const header = document.querySelector('.calendar-header');
    const dayView = document.getElementById('dayView');

    grid.classList.remove('hidden');
    header.classList.remove('hidden');
    dayView.classList.add('hidden');
}
