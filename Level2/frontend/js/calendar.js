document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    if (typeof requireAuth === 'function') {
        if (!requireAuth()) return;
    } else {
        const token = localStorage.getItem('streaklet_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
    }

    initCalendar();

    // Auto-refresh calendar when returning to the page
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            console.log('Page visible again - refreshing calendar data...');
            await fetchData();
            await loadGraceStatus();
        }
    });
});

let currentDate = new Date();
let habits = [];
let monthLogs = {};
let sharedCompletions = {};
let selectedCalendarId = 'all'; // Default to 'all'
let sharedCalendars = [];
let visibleCalendarIds = new Set(['personal']); // Default visible calendars in 'all' view

const MAX_VISIBLE_HABITS = 3;

async function initCalendar() {
    // Basic Controls
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Day View Controls
    document.getElementById('backToMonth').addEventListener('click', backToMonthView);
    const prevDayBtn = document.getElementById('prevDayBtn');
    if (prevDayBtn) prevDayBtn.addEventListener('click', () => changeDay(-1));
    const nextDayBtn = document.getElementById('nextDayBtn');
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => changeDay(1));

    // Dropdown Logic
    const actionBtn = document.getElementById('calendarActionBtn');
    const dropdown = document.getElementById('calendarDropdown');
    if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
    }
    window.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('show');
    });

    // Filter Button Logic
    const openFilterBtn = document.getElementById('openFilterBtn');
    if (openFilterBtn) {
        openFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderFilterList();
            openModal('calendarFilterModal');
        });
    }

    // Grace Day Button
    const useGraceDayBtn = document.getElementById('useGraceDayBtn');
    if (useGraceDayBtn) {
        useGraceDayBtn.addEventListener('click', handleUseGraceDay);
    }

    const deleteCalendarBtn = document.getElementById('deleteCalendarBtn');
    if (deleteCalendarBtn) {
        deleteCalendarBtn.addEventListener('click', openDeleteConfirmation);
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteCalendarBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteCalendar);
    }

    // Modal Forms
    document.getElementById('createCalendarForm').addEventListener('submit', handleCreateCalendar);
    document.getElementById('joinCalendarForm').addEventListener('submit', handleJoinCalendar);
    document.getElementById('habitForm').addEventListener('submit', handleAddHabit);

    // Day View Add Habit
    const addBtn = document.getElementById('addHabitToDay');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const dateStr = document.getElementById('dayViewDate').dataset.date;
            openHabitModalForDate(dateStr);
        });
    }

    // Modal Frequency Toggles
    setupFrequencyToggles();

    // Calendar Selection Logic
    document.getElementById('calendarList').addEventListener('click', (e) => {
        const item = e.target.closest('.calendar-item');
        if (item) {
            //Check if clicking the filter gear specifically
            if (e.target.id === 'openFilterBtn') return;
            switchCalendar(item.dataset.id, item.dataset.type);
        }
    });

    // Load initial data
    try {
        await loadSharedCalendars();
        // Initialize visible calendars with all IDs
        visibleCalendarIds.add('personal');
        sharedCalendars.forEach(cal => visibleCalendarIds.add(cal._id));

        await fetchData(); // Fetches habits and logs for initial view
        await loadGraceStatus(); // Load grace day status
    } catch (error) {
        console.error('Init error:', error);
    }
}

async function loadSharedCalendars() {
    try {
        const res = await api.getSharedCalendars();
        if (res.success) {
            sharedCalendars = res.data;
            renderCalendarList();
            populateCalendarSelect();
        }
    } catch (error) {
        console.error('Error loading calendars:', error);
    }
}

function populateCalendarSelect() {
    const calendarSelect = document.getElementById('habitCalendar');
    if (!calendarSelect) return;

    const personalOption = '<option value="personal">👤 My Calendar (Personal)</option>';
    const sharedOptions = sharedCalendars.map(cal =>
        `<option value="${cal._id}">📅 ${cal.name}</option>`
    ).join('');

    calendarSelect.innerHTML = personalOption + sharedOptions;
}

function renderCalendarList() {
    const list = document.getElementById('calendarList');
    if (!list) return;

    const allCalendarsItem = `
        <div class="calendar-item ${selectedCalendarId === 'all' ? 'active' : ''}" data-type="all" data-id="all" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <span>🌎</span> All Calendars
            </div>
            <button id="openFilterBtn" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; opacity: 0.6; transition: opacity 0.2s;" title="Filter Calendars">⚙️</button>
        </div>
    `;

    const personalItem = `<div class="calendar-item ${selectedCalendarId === 'personal' ? 'active' : ''}" data-type="personal" data-id="personal">
        <span>👤</span> My Calendar
    </div>`;

    const sharedItems = sharedCalendars.map(cal => `
        <div class="calendar-item ${selectedCalendarId === cal._id ? 'active' : ''}" data-type="shared" data-id="${cal._id}">
            <span>📅</span> ${escapeHtml(cal.name)}
        </div>
    `).join('');

    list.innerHTML = allCalendarsItem + personalItem + sharedItems;

    // Re-attach filter button listener since we replaced the HTML
    const openFilterBtn = document.getElementById('openFilterBtn');
    if (openFilterBtn) {
        openFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderFilterList();
            openModal('calendarFilterModal');
        });
    }
}

function renderFilterList() {
    const filterList = document.getElementById('calendarFilterList');
    if (!filterList) return;

    const personalFilter = `
        <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 8px; transition: background 0.2s;">
            <input type="checkbox" value="personal" ${visibleCalendarIds.has('personal') ? 'checked' : ''} onchange="toggleCalendarVisibility('personal', this.checked)">
            <span>👤 My Calendar</span>
        </label>
    `;

    const sharedFilters = sharedCalendars.map(cal => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 8px; transition: background 0.2s;">
            <input type="checkbox" value="${cal._id}" ${visibleCalendarIds.has(cal._id) ? 'checked' : ''} onchange="toggleCalendarVisibility('${cal._id}', this.checked)">
            <span>📅 ${escapeHtml(cal.name)}</span>
        </label>
    `).join('');

    filterList.innerHTML = personalFilter + sharedFilters;
}

window.toggleCalendarVisibility = (id, visible) => {
    if (visible) visibleCalendarIds.add(id);
    else visibleCalendarIds.delete(id);
    if (selectedCalendarId === 'all') renderCalendar();
};

async function switchCalendar(id, type) {
    selectedCalendarId = id;
    renderCalendarList();

    // Update Title
    const title = document.getElementById('calendarTitle');
    const subtitle = document.getElementById('calendarSubtitle');
    const memberSection = document.getElementById('membersSection');

    if (type === 'all') {
        title.textContent = 'All Calendars';
        subtitle.textContent = 'Consolidated view of all your habits';
        memberSection.classList.add('hidden');
    } else if (type === 'personal') {
        title.textContent = 'My Calendar';
        subtitle.textContent = 'View your personal habit history';
        memberSection.classList.add('hidden');
    } else {
        const cal = sharedCalendars.find(c => c._id === id);
        title.textContent = cal ? cal.name : 'Shared Calendar';
        subtitle.textContent = 'Collaborative habit tracking';
        memberSection.classList.remove('hidden');
        renderMembers(id);

        // Show join code if owner
        const user = api.getUser();
        const deleteBtn = document.getElementById('deleteCalendarBtn');

        if (cal && cal.ownerId._id === user._id) {
            document.getElementById('joinCodeDisplay').classList.remove('hidden');
            document.getElementById('currentJoinCode').textContent = cal.joinCode;
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        } else {
            document.getElementById('joinCodeDisplay').classList.add('hidden');
            if (deleteBtn) deleteBtn.classList.add('hidden');
        }
    }

    // Show/Hide Shared Habit button in sidebar based on context
    const addSharedBtn = document.getElementById('addHabitSidebarBtn');
    if (addSharedBtn) {
        if (type === 'shared') addSharedBtn.classList.remove('hidden');
        else addSharedBtn.classList.add('hidden');
    }

    // Set calendar dropdown value if relevant
    const calendarSelect = document.getElementById('habitCalendar');
    if (calendarSelect) {
        if (type === 'personal') calendarSelect.value = 'personal';
        else if (type === 'shared') calendarSelect.value = id;
        // For 'all', we keep personal as default for new habits
    }

    await fetchData();
    await loadGraceStatus(); // Reload grace status for new calendar

    // If Day View is currently open, refresh it with new data
    const dayView = document.getElementById('dayView');
    if (dayView && !dayView.classList.contains('hidden')) {
        const title = document.getElementById('dayViewDate');
        const dateStr = title.dataset.date;
        if (dateStr) {
            const date = new Date(dateStr + 'T00:00:00');
            const dayHabits = getHabitsForDate(date);
            openDayView(date, dayHabits);
        }
    }
}

async function handleAddHabit(e) {
    e.preventDefault();
    const title = document.getElementById('habitTitle').value;
    const category = document.getElementById('habitCategory').value;
    const icon = document.getElementById('habitIcon').value;
    const color = document.getElementById('habitColor').value;
    const calendarId = document.getElementById('habitCalendar').value;
    const frequencyType = document.querySelector('input[name="frequencyType"]:checked').value;

    const habitData = {
        title,
        category,
        icon,
        color,
        frequencyType,
        sharedCalendarId: calendarId === 'personal' ? null : calendarId
    };

    if (frequencyType === 'weekly') {
        const checkboxes = document.querySelectorAll('input[name="frequency"]:checked');
        habitData.frequency = Array.from(checkboxes).map(cb => cb.value);
    } else if (frequencyType === 'one-time') {
        // If adding from day view, this might be pre-filled
        habitData.specificDate = document.getElementById('habitForm').dataset.specificDate || new Date().toISOString().split('T')[0];
    }

    try {
        const res = await api.createHabit(habitData);
        if (res.success) {
            closeModal('habitModal');
            document.getElementById('habitForm').reset();
            delete document.getElementById('habitForm').dataset.specificDate;
            await fetchData();
        }
    } catch (error) {
        alert(error.message);
    }
}

async function renderMembers(calendarId) {
    const list = document.getElementById('membersList');
    try {
        const res = await api.getCalendarMembers(calendarId);
        if (res.success) {
            const isOwner = res.data.ownerId === api.getUser()._id;

            list.innerHTML = res.data.members.map(member => {
                const memberId = member.user ? member.user._id : null;
                const memberName = member.user ? member.user.name : 'Unknown User';
                const isMemberOwner = memberId === res.data.ownerId;
                const role = member.role || 'view';

                let roleBadge = '';
                if (isOwner && !isMemberOwner) {
                    roleBadge = `
                        <select onchange="toggleMemberRole('${calendarId}', '${memberId}', this.value)" 
                                style="font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; border: 1px solid #ddd; background: #fff;">
                            <option value="view" ${role === 'view' ? 'selected' : ''}>View</option>
                            <option value="edit" ${role === 'edit' ? 'selected' : ''}>Edit</option>
                        </select>
                    `;
                } else if (isMemberOwner) {
                    roleBadge = '<span class="member-role" style="background: var(--primary-green-subtle); color: var(--primary-green); font-weight: 600;">Owner</span>';
                } else {
                    roleBadge = `<span class="member-role">${role === 'edit' ? 'Editor' : 'Viewer'}</span>`;
                }

                return `
                <div class="member-item">
                    <div class="member-avatar">${memberName.charAt(0)}</div>
                    <div class="member-info">
                        <span class="member-name">${escapeHtml(memberName)}</span>
                        ${roleBadge}
                    </div>
                </div>
            `}).join('');
        }
    } catch (error) {
        console.error('Error fetching members:', error);
    }
}

async function fetchData() {
    try {
        // Fetch habits for selected context
        const habitsRes = await api.getHabits(selectedCalendarId);
        if (habitsRes.success) {
            habits = habitsRes.data;
        }

        // Re-render calendar grid (this also fetches logs internally)
        await renderCalendar();
    } catch (e) { console.error(e); }
}

async function handleCreateCalendar(e) {
    e.preventDefault();
    const name = document.getElementById('newCalendarName').value;
    try {
        const res = await api.createSharedCalendar(name);
        if (res.success) {
            closeModal('createCalendarModal');
            await loadSharedCalendars();
            switchCalendar(res.data._id, 'shared');
        }
    } catch (error) {
        alert(error.message);
    }
}

async function handleJoinCalendar(e) {
    e.preventDefault();
    const code = document.getElementById('joinCalendarCode').value;
    try {
        const res = await api.joinSharedCalendar(code);
        if (res.success) {
            closeModal('joinCalendarModal');
            await loadSharedCalendars();
            switchCalendar(res.data._id, 'shared');
        }
    } catch (error) {
        alert(error.message);
    }
}

window.toggleMemberRole = async (calendarId, memberId, newRole) => {
    try {
        const res = await api.updateMemberRole(calendarId, memberId, newRole);
        if (res.success) {
            // Optional: visual feedback
        }
    } catch (error) {
        alert(error.message);
        // Revert select if possible, or just re-render
        renderMembers(calendarId);
    }
};

// ═══════════════════════════════════════════════════════════════
// Core Calendar Engine
// ═══════════════════════════════════════════════════════════════

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

    // Fetch Logs
    try {
        const logsRes = await api.getMonthlyLogs(year, month + 1, selectedCalendarId);
        monthLogs = {};
        sharedCompletions = logsRes.sharedCompletions || {};
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
    const headers = grid.querySelectorAll('.calendar-day-header');
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDayOfWeek; i++) {
        const day = prevMonthLastDay - startingDayOfWeek + 1 + i;
        grid.appendChild(createDayElement(day, true));
    }

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        grid.appendChild(createDayElement(day, false, date));
    }

    const currentCells = startingDayOfWeek + totalDays;
    const remainingCells = 42 - currentCells;
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

        const dateStr = dateObj.toLocaleDateString('en-CA');
        el.innerHTML = `<div class="day-number">${dayNumber}</div>`;

        const habitsContainer = document.createElement('div');
        habitsContainer.className = 'day-habits';

        const dayHabits = getHabitsForDate(dateObj);

        dayHabits.slice(0, MAX_VISIBLE_HABITS).forEach(habit => {
            const log = monthLogs[dateStr] ? monthLogs[dateStr][habit._id] : null;
            const status = log ? log.status : 'pending';

            const dot = document.createElement('div');
            dot.className = `habit-dot ${status}`;
            dot.textContent = habit.title;
            dot.title = habit.title;

            if (habit.color) {
                if (status === 'done') {
                    dot.style.backgroundColor = habit.color;
                    dot.style.color = '#ffffff';
                } else if (status === 'pending') {
                    dot.style.backgroundColor = `${habit.color}20`;
                    dot.style.color = habit.color;
                }
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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return habits.filter(habit => {
        if (!habit.active) return false;

        // Filtering for 'All Calendars' view
        if (selectedCalendarId === 'all') {
            const calId = habit.sharedCalendarId?._id || habit.sharedCalendarId || 'personal';
            if (!visibleCalendarIds.has(calId)) return false;
        }

        if (habit.frequencyType === 'one-time') {
            if (!habit.specificDate) return false;
            const sDate = new Date(habit.specificDate);
            return sDate >= startOfDay && sDate <= endOfDay;
        }

        if (habit.frequencyType === 'yearly') {
            return habit.yearlyMonth === month && habit.yearlyDay === day;
        }

        if (habit.frequencyType === 'weekly' || !habit.frequencyType) {
            return (habit.frequency || []).includes(dayName);
        }

        return false;
    });
}

// ═══════════════════════════════════════════════════════════════
// Utilities & Modals
// ═══════════════════════════════════════════════════════════════

function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notification Logic
async function toggleNotificationPanel() {
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

    const addBtn = document.getElementById('addHabitToDay');

    // Permission Check
    if (addBtn) {
        let canAdd = true;

        if (selectedCalendarId !== 'all' && selectedCalendarId !== 'personal') {
            const calendar = sharedCalendars.find(c => c._id === selectedCalendarId);
            if (calendar) {
                // Find current user's role
                const user = api.getUser();
                // Check if owner
                if (calendar.ownerId._id !== user._id && calendar.ownerId !== user._id) {
                    const member = calendar.members.find(m => {
                        const mId = m.user?._id || m.user || m; // Handle populated or raw ID
                        return mId.toString() === user._id;
                    });
                    if (member && member.role === 'view') {
                        canAdd = false;
                    }
                }
            }
        }

        if (canAdd) {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }
    }

    grid.classList.add('hidden');
    header.classList.add('hidden');
    dayView.classList.remove('hidden');

    const dateStr = date.toLocaleDateString('en-CA');
    title.textContent = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    title.dataset.date = dateStr;

    if (dayHabits.length === 0) {
        content.innerHTML = '<div class="empty-state"><h3>Rest Day!</h3><p>No habits scheduled for this day.</p></div>';
    } else {
        content.innerHTML = '<div class="habits-list">' + dayHabits.map(habit => {
            const log = monthLogs[dateStr] ? monthLogs[dateStr][habit._id] : null;
            const status = log ? log.status : 'pending';
            const isDone = status === 'done';

            // UI Classes based on status
            const statusClass = status === 'in_progress' ? 'in-progress' : status;

            // Badge text
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

            // Icon Background
            const categoryClass = habit.category ? habit.category.toLowerCase() : 'other';

            return `
                <div class="habit-card" style="cursor: default;">
                    <div class="habit-icon ${categoryClass}">
                        ${habit.icon || '📝'}
                    </div>
                    <div class="habit-info">
                        <div class="habit-title">${habit.title}</div>
                        <div class="habit-category">${habit.category || 'General'}</div>
                        ${(() => {
                    const others = sharedCompletions[dateStr] ? sharedCompletions[dateStr][habit._id] : [];
                    if (others && others.length > 0) {
                        const namesText = others.length > 3
                            ? others.slice(0, 3).join(', ') + ` and ${others.length - 3} more`
                            : others.join(', ');
                        return `<div class="shared-completions" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">
                                    <span title="${others.join(', ')}">✅ Completed by: ${namesText}</span>
                                </div>`;
                    }
                    return '';
                })()}
                    </div>
                    <div class="habit-status">
                        <span class="status-badge ${statusClass}">
                            ${statusLabel} 
                            ${isDone ? '✓' : ''}
                        </span>
                    </div>
                </div>
            `;
        }).join('') + '</div>';
    }

    // Attach navigation listeners if not already attached (or re-attach to be safe/simple)
    // We'll effectively replace them by cloning or just ensure we don't duplicate
    // Better to handle in init, but here works if we are careful.
    // Actually, let's just assume listeners are adding in init.
}

function backToMonthView() {
    const grid = document.getElementById('calendarGrid');
    const header = document.querySelector('.calendar-header');
    const dayView = document.getElementById('dayView');

    grid.classList.remove('hidden');
    header.classList.remove('hidden');
    dayView.classList.add('hidden');
}

function changeDay(offset) {
    const title = document.getElementById('dayViewDate');
    const dateStr = title.dataset.date;
    if (!dateStr) return;

    // Parse YYYY-MM-DD
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + offset);

    // Get habits for new date
    const dayHabits = getHabitsForDate(date);
    openDayView(date, dayHabits);
}


function openHabitModalForDate(dateStr) {
    const modal = document.getElementById('habitModal');
    const form = document.getElementById('habitForm');
    if (!modal || !form) return;

    form.reset();
    form.dataset.specificDate = dateStr;

    // Set to one-time by default
    const oneTimeOpt = document.querySelector('.frequency-type-option[data-type="one-time"]');
    if (oneTimeOpt) oneTimeOpt.click();

    document.getElementById('modalTitle').textContent = `Add Habit for ${dateStr}`;
    openModal('habitModal');
}

function setupFrequencyToggles() {
    document.querySelectorAll('.frequency-type-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.frequency-type-option').forEach(o => {
                o.classList.remove('selected');
                o.style.borderColor = 'transparent';
                o.style.background = 'var(--bg-cream)';
                o.querySelector('input').checked = false;
            });
            option.classList.add('selected');
            option.style.borderColor = 'var(--primary-green)';
            option.style.background = 'rgba(74, 124, 89, 0.1)';
            option.querySelector('input').checked = true;

            const type = option.dataset.type;
            const weeklyGroup = document.getElementById('weeklyFrequencyGroup');
            if (weeklyGroup) {
                weeklyGroup.style.display = (type === 'weekly') ? 'block' : 'none';
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// Grace Day Functions
// ═══════════════════════════════════════════════════════════════

async function loadGraceStatus() {
    try {
        const res = await api.getGraceStatus();
        if (res.success) {
            updateGraceDisplay(res.data);
        }
    } catch (error) {
        console.error('Error loading grace status:', error);
    }
}

function updateGraceDisplay(data) {
    const pointsDisplay = document.getElementById('pointsDisplay');
    const graceDaysDisplay = document.getElementById('graceDaysDisplay');
    const useGraceDayBtn = document.getElementById('useGraceDayBtn');
    const activeIndicator = document.getElementById('graceActiveIndicator');

    let currentGraceStatus = {
        points: 0,
        graceDays: 0,
        activeToday: false
    };

    if (selectedCalendarId === 'personal') {
        currentGraceStatus = data.personal;
    } else if (selectedCalendarId !== 'all') {
        const calData = data.sharedCalendars.find(c => c.calendarId === selectedCalendarId);
        if (calData) currentGraceStatus = calData;
    } else {
        currentGraceStatus = data.personal;
    }

    // Update UI
    if (pointsDisplay) pointsDisplay.textContent = `${currentGraceStatus.points}/10`;
    if (graceDaysDisplay) graceDaysDisplay.textContent = currentGraceStatus.graceDays;

    if (activeIndicator) {
        if (currentGraceStatus.activeToday) {
            activeIndicator.classList.remove('hidden');
        } else {
            activeIndicator.classList.add('hidden');
        }
    }

    if (useGraceDayBtn) {
        const canUse = currentGraceStatus.graceDays > 0 && !currentGraceStatus.activeToday;
        useGraceDayBtn.disabled = !canUse;
        useGraceDayBtn.style.opacity = canUse ? '1' : '0.5';
        useGraceDayBtn.textContent = currentGraceStatus.activeToday ? '🛡️ Grace Day Active' : '🛡️ Use Grace Day';
    }
}

async function handleUseGraceDay() {
    const calendarId = selectedCalendarId === 'personal' || selectedCalendarId === 'all' ? null : selectedCalendarId;

    const confirmed = confirm('Are you sure you want to use a grace day? This will protect your streaks for today if you miss any habits.');
    if (!confirmed) return;

    try {
        const res = await api.activateGraceDay(calendarId);
        if (res.success) {
            alert(`✅ Grace day activated! Your streaks are protected for today. Remaining grace days: ${res.data.remainingGraceDays}`);
            await loadGraceStatus(); // Refresh the display
        }
    } catch (error) {
        if (error.message === 'Grace day for today is already activated') {
            alert('Grace day for today is already activated');
        } else {
            alert(`Error: ${error.message}`);
        }
        console.error('Error activating grace day:', error);
    }
}

function openDeleteConfirmation() {
    if (selectedCalendarId === 'all' || selectedCalendarId === 'personal') return;

    const cal = sharedCalendars.find(c => c._id === selectedCalendarId);
    if (!cal) return;

    document.getElementById('deleteCalendarName').textContent = `"${cal.name}"`;
    openModal('deleteCalendarModal');
}

async function handleDeleteCalendar() {
    if (selectedCalendarId === 'all' || selectedCalendarId === 'personal') return;

    try {
        const res = await api.deleteSharedCalendar(selectedCalendarId);
        if (res.success) {
            closeModal('deleteCalendarModal');
            alert('✅ Calendar deleted successfully');
            // Reload list and switch to personal
            await loadSharedCalendars();
            switchCalendar('personal', 'personal');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
        console.error('Error deleting calendar:', error);
    }
}
