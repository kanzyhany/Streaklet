/**
 * Streaklet Settings Page
 * User profile and preferences management
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auth guard
    if (!requireAuth()) return;

    // Initialize settings page
    initSettingsPage();
});

async function initSettingsPage() {
    // Load current user data
    await loadUserSettings();

    // Setup event listeners
    setupSettingsListeners();
}

// ═══════════════════════════════════════════════════════════════
// Load User Settings
// ═══════════════════════════════════════════════════════════════

async function loadUserSettings() {
    try {
        const response = await api.getMe();

        if (response.success) {
            const user = response.data;

            // Populate form fields
            document.getElementById('userName').value = user.name || '';
            document.getElementById('userEmail').value = user.email || '';
            document.getElementById('userTimezone').value = user.timezone || 'UTC';

            // Set notification toggles
            if (user.notificationSettings) {
                document.getElementById('habitReminders').checked = user.notificationSettings.habitReminders !== false;
                document.getElementById('generalEmails').checked = user.notificationSettings.generalEmails !== false;
            }

            // Update avatar in navbar
            const avatarEl = document.querySelector('.user-avatar img');
            if (avatarEl) {
                avatarEl.alt = user.name;
            }
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Save Settings
// ═══════════════════════════════════════════════════════════════

async function saveGeneralSettings(e) {
    e.preventDefault();

    const name = document.getElementById('userName').value.trim();
    const timezone = document.getElementById('userTimezone').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name) {
        alert('Name is required');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const response = await api.updateProfile({ name, timezone });

        if (response.success) {
            showToast('Settings saved successfully!');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}

async function updateNotificationSettings() {
    const habitReminders = document.getElementById('habitReminders').checked;
    const generalEmails = document.getElementById('generalEmails').checked;

    try {
        await api.updateProfile({
            notificationSettings: {
                habitReminders,
                generalEmails
            }
        });
        showToast('Notification settings updated!');
    } catch (error) {
        console.error('Error updating notifications:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════

function setupSettingsListeners() {
    // General settings form
    const generalForm = document.getElementById('generalSettingsForm');
    if (generalForm) {
        generalForm.addEventListener('submit', saveGeneralSettings);
    }

    // Notification toggles
    const habitReminders = document.getElementById('habitReminders');
    const generalEmails = document.getElementById('generalEmails');

    if (habitReminders) {
        habitReminders.addEventListener('change', updateNotificationSettings);
    }
    if (generalEmails) {
        generalEmails.addEventListener('change', updateNotificationSettings);
    }

    // Dark mode toggle (just visual for now)
    const darkModeToggle = document.getElementById('darkMode');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            document.body.classList.toggle('dark-mode', e.target.checked);
            localStorage.setItem('streaklet_darkmode', e.target.checked);
        });

        // Load saved preference
        const savedDarkMode = localStorage.getItem('streaklet_darkmode') === 'true';
        darkModeToggle.checked = savedDarkMode;
        document.body.classList.toggle('dark-mode', savedDarkMode);
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => api.logout());
    }

    // Manage account button
    const manageAccountBtn = document.getElementById('manageAccountBtn');
    if (manageAccountBtn) {
        manageAccountBtn.addEventListener('click', () => {
            alert('Account management coming soon!');
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// Toast Notification
// ═══════════════════════════════════════════════════════════════

function showToast(message, duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #2D3748;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 2000;
    animation: slideUp 0.3s ease;
  `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
  `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ═══════════════════════════════════════════════════════════════
// Populate Timezone Dropdown
// ═══════════════════════════════════════════════════════════════

function populateTimezones() {
    const timezoneSelect = document.getElementById('userTimezone');
    if (!timezoneSelect) return;

    const timezones = [
        { value: 'UTC', label: 'UTC (GMT +0:00)' },
        { value: 'America/New_York', label: 'Eastern Time (GMT -5:00)' },
        { value: 'America/Chicago', label: 'Central Time (GMT -6:00)' },
        { value: 'America/Denver', label: 'Mountain Time (GMT -7:00)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (GMT -8:00)' },
        { value: 'Europe/London', label: 'London (GMT +0:00)' },
        { value: 'Europe/Paris', label: 'Paris (GMT +1:00)' },
        { value: 'Europe/Berlin', label: 'Berlin (GMT +1:00)' },
        { value: 'Asia/Dubai', label: 'Dubai (GMT +4:00)' },
        { value: 'Asia/Kolkata', label: 'India Standard Time (GMT +5:30)' },
        { value: 'Asia/Singapore', label: 'Singapore (GMT +8:00)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (GMT +9:00)' },
        { value: 'Australia/Sydney', label: 'Sydney (GMT +11:00)' }
    ];

    timezoneSelect.innerHTML = timezones.map(tz =>
        `<option value="${tz.value}">${tz.label}</option>`
    ).join('');
}

// Call on page load
populateTimezones();
