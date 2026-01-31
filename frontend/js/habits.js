document.addEventListener('DOMContentLoaded', () => {
    if (typeof requireAuth === 'function') {
        if (!requireAuth()) return;
    }
    initHabitsPage();
});

let allHabits = [];
let filteredHabits = [];
let activeFilters = {
    categories: new Set(),
    colors: new Set()
};

async function initHabitsPage() {
    try {
        const res = await api.getHabits();
        if (res.success) {
            allHabits = res.data;
            setupFilters();
            applyFiltersAndSort();
        }

        // Setup Event Listeners
        document.getElementById('habitSort').addEventListener('change', applyFiltersAndSort);
        document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
        document.getElementById('habitForm').addEventListener('submit', handleSaveHabit);

        // Load calendars for modal
        await loadCalendars();

        // Setup Notifications (reusing simple logic)
        setupNotifications();

        // Setup frequency toggle listeners
        setupFrequencyToggles();
    } catch (error) {
        console.error('Failed to load habits:', error);
    }
}

async function loadCalendars() {
    const calendarSelect = document.getElementById('habitCalendar');
    if (!calendarSelect) return;

    try {
        const response = await api.getSharedCalendars();
        if (response.success && response.data.length > 0) {
            // Keep personal option and add shared calendars
            const personalOption = '<option value="personal">👤 My Calendar (Personal)</option>';
            const sharedOptions = response.data.map(cal =>
                `<option value="${cal._id}">📅 ${cal.name}</option>`
            ).join('');
            calendarSelect.innerHTML = personalOption + sharedOptions;
        }
    } catch (error) {
        console.error('Error loading calendars:', error);
    }
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
            document.getElementById('weeklyFrequencyGroup').style.display = (type === 'weekly') ? 'block' : 'none';
            document.getElementById('yearlyFrequencyGroup').style.display = (type === 'yearly') ? 'block' : 'none';
            document.getElementById('oneTimeFrequencyGroup').style.display = (type === 'one-time') ? 'block' : 'none';

            if (type === 'yearly') {
                populateYearlyDays();
            }
        });
    });

    document.getElementById('yearlyMonth').addEventListener('change', populateYearlyDays);
}

function setupFilters() {
    const categories = [...new Set(allHabits.map(h => h.category))].sort();
    const colors = [...new Set(allHabits.map(h => h.color))];

    // Render Category Filters
    const categoryList = document.getElementById('categoryFilterList');
    categoryList.innerHTML = categories.map(cat => `
        <label class="filter-item">
            <input type="checkbox" value="${cat}" class="category-checkbox">
            <span>${cat}</span>
        </label>
    `).join('');

    // Add listeners to checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            if (e.target.checked) activeFilters.categories.add(e.target.value);
            else activeFilters.categories.delete(e.target.value);
            applyFiltersAndSort();
        });
    });

    // Render Color Filters
    const colorGrid = document.getElementById('colorFilterGrid');
    colorGrid.innerHTML = colors.map(color => `
        <div class="color-dot" data-color="${color}" 
             style="background-color: ${color};" 
             title="${color}"></div>
    `).join('');

    // Add listeners to color dots
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            if (activeFilters.colors.has(color)) {
                activeFilters.colors.delete(color);
                e.target.classList.remove('active');
            } else {
                activeFilters.colors.add(color);
                e.target.classList.add('active');
            }
            applyFiltersAndSort();
        });
    });
}

function clearAllFilters() {
    activeFilters.categories.clear();
    activeFilters.colors.clear();

    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));

    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // 1. Filter
    filteredHabits = allHabits.filter(habit => {
        const matchesCategory = activeFilters.categories.size === 0 || activeFilters.categories.has(habit.category);
        const matchesColor = activeFilters.colors.size === 0 || activeFilters.colors.has(habit.color);
        return matchesCategory && matchesColor;
    });

    // 2. Sort
    const sortVal = document.getElementById('habitSort').value;
    if (sortVal === 'newest') {
        filteredHabits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === 'oldest') {
        filteredHabits.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortVal === 'alpha') {
        filteredHabits.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderHabits();
}

function populateYearlyDays() {
    const month = parseInt(document.getElementById('yearlyMonth').value);
    const daySelect = document.getElementById('yearlyDay');
    if (!daySelect) return;
    const daysInMonth = new Date(2024, month, 0).getDate();

    const currentVal = daySelect.value;
    daySelect.innerHTML = '';
    for (let i = 1; i <= daysInMonth; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        daySelect.appendChild(opt);
    }
    if (currentVal && currentVal <= daysInMonth) daySelect.value = currentVal;
}

function renderHabits() {
    const list = document.getElementById('habitsList');
    const countDisplay = document.getElementById('habitCount');

    countDisplay.textContent = `Showing ${filteredHabits.length} of ${allHabits.length} habits`;

    if (filteredHabits.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <span style="font-size: 3rem;">🔍</span>
                <h3>No habits found</h3>
                <p>Try adjusting your filters or create a new habit.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filteredHabits.map(habit => {
        const createdDate = new Date(habit.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const frequencyText = habit.frequencyType === 'weekly'
            ? habit.frequency.join(', ')
            : habit.frequencyType === 'yearly'
                ? `Every ${getMonthName(habit.yearlyMonth)} ${habit.yearlyDay}`
                : `One-time: ${new Date(habit.specificDate).toLocaleDateString()}`;

        const calendarName = habit.sharedCalendarId ? habit.sharedCalendarId.name : 'My Calendar';

        return `
            <div class="habit-manage-card" style="border-left: 5px solid ${habit.color}">
                <div class="habit-manage-header">
                    <div class="habit-manage-icon" style="background-color: ${habit.color}20; color: ${habit.color};">
                        ${habit.icon || '🎯'}
                    </div>
                    <div class="habit-manage-info">
                        <h3>${habit.title}</h3>
                        <div class="habit-manage-meta">${habit.category}</div>
                    </div>
                </div>
                
                <div class="habit-details">
                    <div style="font-size: 0.9rem; margin-bottom: 2px;"><strong>Frequency:</strong> ${frequencyText}</div>
                    <div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>Calendar:</strong> ${calendarName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Created on ${createdDate}</div>
                </div>

                <div class="habit-manage-footer">
                    <span class="badge ${habit.active ? 'badge-active' : 'badge-inactive'}" 
                          style="background: ${habit.active ? '#e6f4ea' : '#f1f3f4'}; color: ${habit.active ? '#1e8e3e' : '#5f6368'}; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600;">
                        ${habit.active ? 'Active' : 'Paused'}
                    </span>
                    <div class="habit-actions" style="display: flex; gap: 8px;">
                         ${habit.canEdit ? `
                         <button class="btn-icon" onclick="openEditHabitModal('${habit._id}')" title="Edit Habit" style="background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1.1rem;">
                            <i class="fas fa-pencil-alt"></i>
                         </button>
                         <button class="btn-icon" onclick="deleteHabit('${habit._id}')" title="Delete Habit" style="background: none; border: none; cursor: pointer; color: #d94b3d; font-size: 1.1rem;">
                            <i class="fas fa-trash-alt"></i>
                         </button>
                         ` : '<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">View only</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function openEditHabitModal(habitId) {
    const habit = allHabits.find(h => h._id === habitId);
    if (!habit) return;

    const modal = document.getElementById('habitModal');
    const form = document.getElementById('habitForm');

    form.dataset.habitId = habitId;
    document.getElementById('habitTitle').value = habit.title;
    document.getElementById('habitCategory').value = habit.category;
    document.getElementById('habitReminder').value = habit.reminderTime || '09:00';
    document.getElementById('habitIcon').value = habit.icon || '🎯';

    // Calendar selection
    const calendarSelect = document.getElementById('habitCalendar');
    if (calendarSelect) {
        if (habit.sharedCalendarId) {
            // Note: sharedCalendarId might be the populated object or just the ID
            const calId = habit.sharedCalendarId._id || habit.sharedCalendarId;
            calendarSelect.value = calId;
        } else {
            calendarSelect.value = 'personal';
        }
    }

    // Color
    const colorRadios = document.querySelectorAll('input[name="habitColorRadio"]');
    colorRadios.forEach(radio => {
        if (radio.value.toUpperCase() === habit.color.toUpperCase()) {
            radio.checked = true;
            radio.nextElementSibling.classList.add('selected');
        } else {
            radio.nextElementSibling.classList.remove('selected');
        }
    });

    // Frequency
    const type = habit.frequencyType || 'weekly';
    const typeOption = document.querySelector(`.frequency-type-option[data-type="${type}"]`);
    if (typeOption) typeOption.click();

    if (type === 'weekly') {
        document.querySelectorAll('input[name="frequency"]').forEach(cb => {
            cb.checked = (habit.frequency || []).includes(cb.value);
        });
    } else if (type === 'yearly') {
        document.getElementById('yearlyMonth').value = habit.yearlyMonth;
        populateYearlyDays();
        document.getElementById('yearlyDay').value = habit.yearlyDay;
    } else if (type === 'one-time') {
        if (habit.specificDate) {
            document.getElementById('specificDate').value = habit.specificDate.split('T')[0];
        }
    }

    modal.classList.add('show');
}

function closeHabitModal() {
    document.getElementById('habitModal').classList.remove('show');
}

async function handleSaveHabit(e) {
    e.preventDefault();
    const form = e.target;
    const habitId = form.dataset.habitId;

    const frequencyType = document.querySelector('input[name="frequencyType"]:checked').value;
    const habitData = {
        title: document.getElementById('habitTitle').value,
        category: document.getElementById('habitCategory').value,
        frequencyType: frequencyType,
        reminderTime: document.getElementById('habitReminder').value,
        icon: document.getElementById('habitIcon').value,
        color: document.querySelector('input[name="habitColorRadio"]:checked').value,
        sharedCalendarId: document.getElementById('habitCalendar').value === 'personal' ? null : document.getElementById('habitCalendar').value
    };

    if (frequencyType === 'weekly') {
        const checkboxes = document.querySelectorAll('input[name="frequency"]:checked');
        habitData.frequency = Array.from(checkboxes).map(cb => cb.value);
    } else if (frequencyType === 'yearly') {
        habitData.yearlyMonth = parseInt(document.getElementById('yearlyMonth').value);
        habitData.yearlyDay = parseInt(document.getElementById('yearlyDay').value);
    } else if (frequencyType === 'one-time') {
        habitData.specificDate = document.getElementById('specificDate').value;
    }

    try {
        const res = await api.updateHabit(habitId, habitData);
        if (res.success) {
            closeHabitModal();
            // Refresh
            const updatedRes = await api.getHabits();
            if (updatedRes.success) {
                allHabits = updatedRes.data;
                applyFiltersAndSort();
            }
        }
    } catch (error) {
        alert('Failed to update habit: ' + error.message);
    }
}

async function deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit? This action cannot be undone.')) return;

    try {
        const res = await api.deleteHabit(habitId);
        if (res.success) {
            allHabits = allHabits.filter(h => h._id !== habitId);
            applyFiltersAndSort();
        }
    } catch (error) {
        alert('Failed to delete habit: ' + error.message);
    }
}

function getMonthName(m) {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
}

// Global UI / Notification helpers
function setupNotifications() {
    const bell = document.getElementById('notificationBell');
    if (bell) {
        loadNotificationCount();
    }
}

async function loadNotificationCount() {
    try {
        const res = await api.getNotificationCount();
        if (res.success && res.data > 0) {
            const badge = document.getElementById('notificationBadge');
            badge.textContent = res.data;
            badge.classList.remove('hidden');
        }
    } catch (e) { }
}

async function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        const list = document.getElementById('notificationList');
        try {
            const res = await api.getNotifications();
            if (res.success && res.data.length > 0) {
                list.innerHTML = res.data.map(n => `
                    <div class="notification-item ${!n.read ? 'unread' : ''}" style="padding: 12px; border-bottom: 1px solid var(--border-light);">
                        <div style="font-weight: 600; font-size: 0.9rem;">${n.title}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">${n.message}</div>
                    </div>
                `).join('');
            } else {
                list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No notifications</div>';
            }
        } catch (e) { }
    }
}

async function markAllAsRead() {
    await api.markAllNotificationsAsRead();
    const badge = document.getElementById('notificationBadge');
    badge.classList.add('hidden');
    toggleNotificationPanel();
}
