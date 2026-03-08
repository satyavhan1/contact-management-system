/**
 * Authentication JavaScript
 * Handles login, register forms and authentication flow
 * 
 * @author Navioteck
 * @version 1.0
 */

// ======================== CONFIGURATION ========================
const AUTH_API_URL = '/auth';

// ======================== UTILITY FUNCTIONS ========================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success' or 'error')
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'} me-2"></i>
            <span class="me-auto">${escapeHtml(message)}</span>
            <button type="button" class="btn-close btn-close-white ms-3" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds with fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show error message for a specific form field
 * @param {string} fieldId - Field element ID
 * @param {string} message - Error message
 */
function showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorDiv = document.getElementById(`${fieldId}Error`);
    
    if (input && errorDiv) {
        input.classList.add('is-invalid');
        errorDiv.textContent = message;
    }
}

/**
 * Clear all validation error messages
 * @param {string[]} fields - Array of field IDs to clear
 */
function clearValidationErrors(fields) {
    fields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        const errorDiv = document.getElementById(`${fieldId}Error`);
        
        if (input) input.classList.remove('is-invalid');
        if (errorDiv) errorDiv.textContent = '';
    });
}

/**
 * Set loading state on button
 * @param {HTMLButtonElement} btn - Button element
 * @param {boolean} loading - Loading state
 * @param {string} originalText - Original button text
 */
function setButtonLoading(btn, loading, originalText) {
    if (loading) {
        btn.classList.add('btn-loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
    }
}

// ======================== PASSWORD VISIBILITY TOGGLE ========================

/**
 * Toggle password visibility
 */
function initPasswordToggle() {
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    // Main password toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const passwordIcon = document.getElementById('passwordIcon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordIcon.classList.remove('bi-eye');
                passwordIcon.classList.add('bi-eye-slash');
            } else {
                passwordInput.type = 'password';
                passwordIcon.classList.remove('bi-eye-slash');
                passwordIcon.classList.add('bi-eye');
            }
        });
    }
    
    // Confirm password toggle (register page)
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const confirmPasswordInput = document.getElementById('confirmPassword');
            const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');
            
            if (confirmPasswordInput.type === 'password') {
                confirmPasswordInput.type = 'text';
                confirmPasswordIcon.classList.remove('bi-eye');
                confirmPasswordIcon.classList.add('bi-eye-slash');
            } else {
                confirmPasswordInput.type = 'password';
                confirmPasswordIcon.classList.remove('bi-eye-slash');
                confirmPasswordIcon.classList.add('bi-eye');
            }
        });
    }
}

// ======================== PASSWORD STRENGTH INDICATOR ========================

/**
 * Calculate and display password strength
 */
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!passwordInput || !strengthBar || !strengthText) return;
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        // Update strength bar
        strengthBar.style.width = `${strength.score}%`;
        
        // Update color based on strength
        if (strength.score <= 25) {
            strengthBar.style.backgroundColor = '#eb3349'; // Weak - red
            strengthText.textContent = 'Weak password';
            strengthText.style.color = '#eb3349';
        } else if (strength.score <= 50) {
            strengthBar.style.backgroundColor = '#f2994a'; // Fair - orange
            strengthText.textContent = 'Fair password';
            strengthText.style.color = '#f2994a';
        } else if (strength.score <= 75) {
            strengthBar.style.backgroundColor = '#f2c94c'; // Good - yellow
            strengthText.textContent = 'Good password';
            strengthText.style.color = '#f2c94c';
        } else {
            strengthBar.style.backgroundColor = '#11998e'; // Strong - green
            strengthText.textContent = 'Strong password';
            strengthText.style.color = '#11998e';
        }
        
        // Clear strength if empty
        if (password.length === 0) {
            strengthBar.style.width = '0';
            strengthText.textContent = '';
        }
    });
}

/**
 * Calculate password strength
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength score and feedback
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) return { score: 0, feedback: 'Password is required' };
    
    // Length checks
    if (password.length >= 6) score += 10;
    if (password.length >= 8) score += 15;
    if (password.length >= 12) score += 15;
    
    // Character type checks
    if (/[a-z]/.test(password)) score += 15; // Lowercase
    if (/[A-Z]/.test(password)) score += 15; // Uppercase
    if (/[0-9]/.test(password)) score += 15; // Numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 15; // Special characters
    
    // Bonus for mixed complexity
    if (password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
        score += 10;
    }
    
    // Cap at 100
    score = Math.min(score, 100);
    
    return { score };
}

// ======================== CLIENT-SIDE VALIDATION ========================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

/**
 * Validate login form
 * @returns {Object} Validation result with errors array
 */
function validateLoginForm() {
    const errors = [];
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        errors.push({ field: 'username', message: 'Username or email is required' });
    }
    
    if (!password) {
        errors.push({ field: 'password', message: 'Password is required' });
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Validate registration form
 * @returns {Object} Validation result with errors array
 */
function validateRegisterForm() {
    const errors = [];
    
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsChecked = document.getElementById('termsCheck')?.checked;
    
    // Username validation
    if (!username) {
        errors.push({ field: 'username', message: 'Username is required' });
    } else if (!isValidUsername(username)) {
        errors.push({ field: 'username', message: 'Username must be 3-20 characters (letters, numbers, underscores)' });
    }
    
    // Email validation
    if (!email) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }
    
    // Password validation
    if (!password) {
        errors.push({ field: 'password', message: 'Password is required' });
    } else if (password.length < 6) {
        errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
    }
    
    // Confirm password validation
    if (!confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
    } else if (password !== confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }
    
    // Terms validation
    if (!termsChecked) {
        errors.push({ field: 'termsCheck', message: 'You must agree to the terms' });
    }
    
    return { isValid: errors.length === 0, errors };
}

// ======================== LOGIN FORM HANDLER ========================

/**
 * Handle login form submission
 */
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearValidationErrors(['username', 'password']);
        
        // Client-side validation
        const validation = validateLoginForm();
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                showFieldError(error.field, error.message);
            });
            return;
        }
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Set loading state
        const submitBtn = document.getElementById('loginBtn');
        setButtonLoading(submitBtn, true, 'Sign In');
        
        try {
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle specific field errors
                if (data.field) {
                    showFieldError(data.field, data.error);
                    showToast(data.error, 'error');
                } else if (data.validationErrors) {
                    data.validationErrors.forEach(error => {
                        showFieldError(error.field, error.message);
                    });
                    showToast(data.error || 'Validation failed', 'error');
                } else {
                    showToast(data.error || 'Login failed', 'error');
                }
                return;
            }
            
            // Login successful
            showToast('Login successful! Redirecting...', 'success');
            
            // Store user info in sessionStorage
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            setButtonLoading(submitBtn, false, 'Sign In');
        }
    });
}

// ======================== REGISTER FORM HANDLER ========================

/**
 * Handle register form submission
 */
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear previous errors
        clearValidationErrors(['username', 'email', 'password', 'confirmPassword', 'termsCheck']);
        
        // Client-side validation
        const validation = validateRegisterForm();
        if (!validation.isValid) {
            validation.errors.forEach(error => {
                showFieldError(error.field, error.message);
            });
            return;
        }
        
        // Get form values
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Set loading state
        const submitBtn = document.getElementById('registerBtn');
        setButtonLoading(submitBtn, true, 'Create Account');
        
        try {
            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle specific field errors
                if (data.field) {
                    showFieldError(data.field, data.error);
                    showToast(data.error, 'error');
                } else if (data.validationErrors) {
                    data.validationErrors.forEach(error => {
                        showFieldError(error.field, error.message);
                    });
                    showToast(data.error || 'Validation failed', 'error');
                } else {
                    showToast(data.error || 'Registration failed', 'error');
                }
                return;
            }
            
            // Registration successful
            showToast('Account created successfully! Redirecting...', 'success');
            
            // Store user info in sessionStorage
            sessionStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            setButtonLoading(submitBtn, false, 'Create Account');
        }
    });
}

// ======================== AUTH CHECK ON LOAD ========================

/**
 * Check if user is already authenticated on page load
 */
async function checkAuthStatus() {
    try {
        const response = await fetch(`${AUTH_API_URL}/current`);
        const data = await response.json();
        
        // If already authenticated and on login/register page, redirect to dashboard
        if (data.authenticated && (window.location.pathname === '/login.html' || window.location.pathname === '/register.html' || window.location.pathname === '/login' || window.location.pathname === '/register')) {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// ======================== INITIALIZATION ========================

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize password toggles
    initPasswordToggle();
    
    // Initialize password strength (register page)
    initPasswordStrength();
    
    // Initialize forms
    initLoginForm();
    initRegisterForm();
    
    // Check authentication status
    checkAuthStatus();
});

