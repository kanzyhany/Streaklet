/**
 * Streaklet Notifications
 * Shared notification logic for all pages
 */

let notificationPollInterval = null;

async function initNotifications() {
    // Initial load
    await loadNotificationCount();

    // Check for new notifications every minute
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    notificationPollInterval = setInterval(loadNotificationCount, 60000);

    // Attempt to generate notifications for today if needed
    try {
        await api.generateNotifications();
        await loadNotificationCount();
    } catch (e) {
        // Silent fail
    }
}

async function loadNotificationCount() {
    try {
        const response = await api.getNotificationCount();
        if (response.success) {
            updateNotificationBadge(response.count);
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
    if (!panel) return;

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
    if (!list) return;

    try {
        // Show loading state if empty
        if (!list.children.length) {
            list.innerHTML = '<div class="flex-center" style="padding: 20px;"><div class="loading-spinner"></div></div>';
        }

        const response = await api.getNotifications();

        if (response.success) {
            updateNotificationBadge(response.unreadCount);

            if (response.data.length > 0) {
                // Group notifications by date (YYYY-MM-DD)
                const groups = response.data.reduce((acc, notification) => {
                    const date = new Date(notification.scheduledFor).toISOString().split('T')[0];
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(notification);
                    return acc;
                }, {});

                // Sort dates descending
                const sortedDates = Object.keys(groups).sort().reverse();

                let html = '';
                const today = new Date().toISOString().split('T')[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

                sortedDates.forEach(date => {
                    let dateLabel = date;
                    if (date === today) dateLabel = 'Today';
                    else if (date === yesterday) dateLabel = 'Yesterday';
                    else {
                        dateLabel = new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    }

                    html += `<div class="notification-date-header">${dateLabel}</div>`;
                    html += groups[date].map(renderNotificationItem).join('');
                });

                list.innerHTML = html;

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

// Global initialization if we're not on dashboard (dashboard calls it explicitly)
document.addEventListener('DOMContentLoaded', () => {
    const bell = document.getElementById('notificationBell');
    if (bell && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        initNotifications();
    }
});
