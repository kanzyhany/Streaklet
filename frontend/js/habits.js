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

        // Setup Notifications (reusing simple logic)
        setupNotifications();
    } catch (error) {
        console.error('Failed to load habits:', error);
    }
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
                    <div style="font-size: 0.9rem; margin-bottom: 4px;"><strong>Frequency:</strong> ${frequencyText}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Created on ${createdDate}</div>
                </div>

                <div class="habit-manage-footer">
                    <span class="badge ${habit.active ? 'badge-active' : 'badge-inactive'}" 
                          style="background: ${habit.active ? '#e6f4ea' : '#f1f3f4'}; color: ${habit.active ? '#1e8e3e' : '#5f6368'}; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600;">
                        ${habit.active ? 'Active' : 'Paused'}
                    </span>
                    <div class="habit-actions">
                         <!-- Placeholder for Edit/Delete if needed later -->
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
