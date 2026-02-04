/**
 * Streaklet Auth Handler
 * Manages login and registration forms
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    redirectIfAuthenticated();

    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorElement = document.querySelector('.auth-error');

    // Show error message
    function showError(message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    // Hide error message
    function hideError() {
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            // Disable button while loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></span>';

            try {
                const response = await api.login(email, password);

                if (response.success) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                showError(error.message || 'Login failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            // Validate passwords match
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }

            // Validate password length
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }

            // Disable button while loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner" style="width:20px;height:20px;border-width:2px;"></span>';

            try {
                const response = await api.register(name, email, password, timezone);

                if (response.success) {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                showError(error.message || 'Registration failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
    }
});
