/**
 * Level 1 - Simple Calendar Logic
 */

let currentDate = new Date();
let habits = [];
let sharedCalendars = [];
let selectedCalendarId = 'personal';

document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
});

async function initCalendar() {
    // Basic Controls
    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar();
    });

    // Form Listeners
    const createForm = document.getElementById('createCalendarForm');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateCalendar);
    }

    // Load Initial Data
    await loadData();
}

async function loadData() {
    try {
        const [habitsRes, calendarsRes] = await Promise.all([
            api.getHabits(),
            api.getSharedCalendars()
        ]);

        if (habitsRes.success) habits = habitsRes.data;
        if (calendarsRes.success) {
            sharedCalendars = calendarsRes.data;
            renderCalendarList();
        }

        renderCalendar();
    } catch (e) {
        console.error('Error fetching data:', e);
    }
}

function renderCalendarList() {
    const list = document.getElementById('calendarList');
    if (!list) return;

    const items = [
        `<div class="calendar-item ${selectedCalendarId === 'personal' ? 'active' : ''}" onclick="switchCalendar('personal')"><span>👤</span> My Calendar</div>`,
        ...sharedCalendars.map(cal => `
            <div class="calendar-item ${selectedCalendarId === cal._id ? 'active' : ''}" onclick="switchCalendar('${cal._id}')">
                <span>📅</span> ${cal.name}
                <button onclick="event.stopPropagation(); deleteCalendar('${cal._id}')" style="margin-left:auto; background:none; border:none; cursor:pointer;">🗑️</button>
            </div>
        `)
    ];

    list.innerHTML = items.join('');
}

window.switchCalendar = (id) => {
    selectedCalendarId = id;
    renderCalendarList();
    renderCalendar();
};

window.deleteCalendar = async (id) => {
    if (confirm('Delete this calendar?')) {
        await api.deleteSharedCalendar(id);
        await loadData();
    }
};

async function handleCreateCalendar(e) {
    e.preventDefault();
    const name = document.getElementById('newCalendarName').value;
    const res = await api.createSharedCalendar({ name });
    if (res.success) {
        closeModal('createCalendarModal');
        await loadData();
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('monthDisplay').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendarGrid');
    const headers = grid.querySelectorAll('.calendar-day-header');
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Padding
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day other-month';
        grid.appendChild(div);
    }

    // Days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const div = document.createElement('div');
        div.className = 'calendar-day';
        if (date.toDateString() === today.toDateString()) div.classList.add('today');

        div.innerHTML = `<div class="day-number">${day}</div>`;

        const habitsContainer = document.createElement('div');
        habitsContainer.className = 'day-habits';

        // Filter habits for this day
        const dayHabits = habits.filter(h => {
            if (selectedCalendarId !== 'personal' && h.sharedCalendarId !== selectedCalendarId) return false;
            if (selectedCalendarId === 'personal' && h.sharedCalendarId) return false;

            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            return (h.frequency || []).includes(dayName) || h.frequencyType === 'daily';
        });

        dayHabits.slice(0, 3).forEach(h => {
            const dot = document.createElement('div');
            dot.className = 'habit-dot';
            dot.style.background = `${h.color}30`;
            dot.style.color = h.color;
            dot.textContent = h.title;
            habitsContainer.appendChild(dot);
        });

        div.appendChild(habitsContainer);
        grid.appendChild(div);
    }
}

// Global modal helpers
window.openModal = (id) => document.getElementById(id).classList.add('show');
window.closeModal = (id) => document.getElementById(id).classList.remove('show');
