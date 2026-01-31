document.addEventListener('DOMContentLoaded', () => {
    if (typeof requireAuth === 'function') {
        if (!requireAuth()) return;
    }
    initNotesPage();
});

let allHabits = [];
let selectedHabitId = 'all';

async function initNotesPage() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        selectedHabitId = urlParams.get('habitId') || 'all';

        // Fetch all habits first
        const habitsRes = await api.getHabits();
        if (habitsRes.success) {
            allHabits = habitsRes.data;
            renderHabitFilters();
            await loadNotes();
        }

        // Setup Notifications
        if (typeof setupNotifications === 'function') {
            setupNotifications();
        }

    } catch (error) {
        console.error('Failed to init notes page:', error);
    }
}

function renderHabitFilters() {
    const filterList = document.getElementById('habitFilterList');

    // "All Habits" option
    let html = `
        <div class="habit-filter-item ${selectedHabitId === 'all' ? 'active' : ''}" 
             onclick="selectHabitFilter('all')">
            <div class="habit-filter-icon" style="background: var(--bg-cream);">🌎</div>
            <span class="habit-filter-name">All Habits</span>
        </div>
    `;

    allHabits.forEach(habit => {
        const isActive = habit._id === selectedHabitId;
        html += `
            <div class="habit-filter-item ${isActive ? 'active' : ''}" 
                 onclick="selectHabitFilter('${habit._id}')">
                <div class="habit-filter-icon" style="background: ${habit.color}20; color: ${habit.color};">
                    ${habit.icon || '🎯'}
                </div>
                <span class="habit-filter-name">${habit.title}</span>
            </div>
        `;
    });

    filterList.innerHTML = html;
}

function selectHabitFilter(habitId) {
    selectedHabitId = habitId;

    // Update URL without reload
    const url = new URL(window.location);
    if (habitId === 'all') {
        url.searchParams.delete('habitId');
    } else {
        url.searchParams.set('habitId', habitId);
    }
    window.history.pushState({}, '', url);

    // Update UI
    document.querySelectorAll('.habit-filter-item').forEach(el => el.classList.remove('active'));
    // Find the clicked element based on index or re-render (simpler to query current clicked but we can just re-render to be safe or use event delegation)
    // For simplicity, let's re-render
    renderHabitFilters();

    // Load notes
    loadNotes();
}

async function loadNotes() {
    const timeline = document.getElementById('notesTimeline');
    timeline.innerHTML = '<div class="loading-state" style="text-align:center; padding: 20px;">Loading notes...</div>';

    try {
        let allLogs = [];

        // If 'all', we need to fetch logs for ALL habits. 
        // Best approach: Promise.all or if backend supports getting all user logs.
        // Given current API, we probably need to fetch per habit or add an endpoint.
        // Assuming we rely on getHabitLogs per habit for now. 

        let habitsToFetch = selectedHabitId === 'all' ? allHabits : allHabits.filter(h => h._id === selectedHabitId);

        const fetchPromises = habitsToFetch.map(habit => api.getHabitLogs(habit._id));
        const results = await Promise.all(fetchPromises);

        results.forEach((res, index) => {
            if (res.success && Array.isArray(res.data)) {
                // Attach habit info to log
                const habit = habitsToFetch[index];
                const logsWithNotes = res.data
                    .filter(log => log.notes && log.notes.trim() !== '')
                    .map(log => ({
                        ...log,
                        habitTitle: habit.title,
                        habitIcon: habit.icon,
                        habitColor: habit.color
                    }));
                allLogs = allLogs.concat(logsWithNotes);
            }
        });

        // Sort by date desc
        allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allLogs.length === 0) {
            timeline.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px;">
                    <span style="font-size: 3rem;">📝</span>
                    <h3>No notes found</h3>
                    <p style="color: var(--text-muted);">Completing a habit? Add a note to see it here!</p>
                </div>
            `;
            return;
        }

        renderTimeline(allLogs);

    } catch (error) {
        console.error('Error loading notes:', error);
        timeline.innerHTML = '<div style="color:red; text-align:center;">Failed to load notes</div>';
    }
}

function renderTimeline(logs) {
    const timeline = document.getElementById('notesTimeline');
    let html = '';

    // Group by Date
    const grouped = {};
    logs.forEach(log => {
        // Use local date string for grouping key to avoid timezone splits
        const d = new Date(log.date);
        const dateKey = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(log);
    });

    Object.keys(grouped).forEach(dateKey => {
        html += `
            <div class="timeline-date-group">
                <div class="timeline-date-header">${dateKey}</div>
                ${grouped[dateKey].map(log => `
                    <div class="timeline-note-card">
                        <div class="note-card-header">
                            <div class="note-habit-badge" style="background: ${log.habitColor}20; color: ${log.habitColor};">
                                <span>${log.habitIcon || '🎯'}</span>
                                <span>${log.habitTitle}</span>
                            </div>
                            <span class="completion-status" style="font-size: 0.85rem; color: var(--text-muted);">
                                ${log.status === 'done' ? '✅ Completed' : 'Note'}
                            </span>
                        </div>
                        <div class="note-content" style="white-space: pre-wrap; line-height: 1.6; color: var(--text-secondary);">
                            ${escapeHtml(log.notes)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });

    timeline.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
