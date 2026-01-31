/**
 * Level 1 - Simple Settings Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initSettingsPage();
});

async function initSettingsPage() {
    const user = await api.getUser();
    if (user) {
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
    }

    const form = document.getElementById('generalSettingsForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('userName').value;
        const res = await api.updateProfile({ name });
        if (res.success) {
            alert('Settings saved!');
            location.reload();
        }
    });
}
