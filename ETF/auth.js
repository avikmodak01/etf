/**
 * Authentication Management Module
 * Handles user authentication UI and logic
 */

class AuthManager {
    constructor() {
        this.currentView = 'login'; // 'login', 'register', 'forgot-password'
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize authentication manager
     */
    init() {
        this.setupEventListeners();
        this.showInitialView();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'login-form') {
                e.preventDefault();
                this.handleLogin(e.target);
            }
        });

        // Register form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'register-form') {
                e.preventDefault();
                this.handleRegister(e.target);
            }
        });

        // Forgot password form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'forgot-password-form') {
                e.preventDefault();
                this.handleForgotPassword(e.target);
            }
        });

        // View switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('auth-link')) {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            }
        });

        // Logout
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logout-btn') {
                e.preventDefault();
                this.handleLogout();
            }
        });
    }

    /**
     * Show initial authentication view
     */
    showInitialView() {
        this.switchView('login');
    }

    /**
     * Switch authentication view
     */
    switchView(view) {
        this.currentView = view;
        
        // Hide all views
        const views = document.querySelectorAll('.auth-view');
        views.forEach(v => v.style.display = 'none');
        
        // Show selected view
        const selectedView = document.getElementById(`${view}-view`);
        if (selectedView) {
            selectedView.style.display = 'block';
        }
        
        // Update form title
        this.updateFormTitle();
    }

    /**
     * Update form title based on current view
     */
    updateFormTitle() {
        const titleElement = document.getElementById('auth-title');
        if (!titleElement) return;
        
        const titles = {
            'login': 'Sign In to ETF Strategy',
            'register': 'Create Your Account',
            'forgot-password': 'Reset Your Password'
        };
        
        titleElement.textContent = titles[this.currentView] || 'Authentication';
    }

    /**
     * Handle login form submission
     */
    async handleLogin(form) {
        if (this.isLoading) return;
        
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }
        
        this.setLoading(true);
        this.clearError();
        
        try {
            await window.appConfig.signIn(email, password);
            this.showSuccess('Successfully signed in!');
            
            // Clear form
            form.reset();
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(form) {
        if (this.isLoading) return;
        
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const fullName = formData.get('fullName');
        
        if (!email || !password || !confirmPassword) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters long');
            return;
        }
        
        this.setLoading(true);
        this.clearError();
        
        try {
            const metadata = {};
            if (fullName) {
                metadata.full_name = fullName;
            }
            
            await window.appConfig.signUp(email, password, metadata);
            
            this.showSuccess('Account created successfully! Please check your email to confirm your account.');
            
            // Clear form
            form.reset();
            
            // Switch to login view after a delay
            setTimeout(() => {
                this.switchView('login');
            }, 3000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle forgot password form submission
     */
    async handleForgotPassword(form) {
        if (this.isLoading) return;
        
        const formData = new FormData(form);
        const email = formData.get('email');
        
        if (!email) {
            this.showError('Please enter your email address');
            return;
        }
        
        this.setLoading(true);
        this.clearError();
        
        try {
            await window.appConfig.resetPassword(email);
            this.showSuccess('Password reset link sent to your email!');
            
            // Clear form
            form.reset();
            
            // Switch to login view after a delay
            setTimeout(() => {
                this.switchView('login');
            }, 3000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        if (this.isLoading) return;
        
        this.setLoading(true);
        
        try {
            await window.appConfig.signOut();
            this.showSuccess('Successfully signed out!');
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Error signing out. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        
        // Update submit buttons
        const submitBtns = document.querySelectorAll('.auth-submit-btn');
        submitBtns.forEach(btn => {
            btn.disabled = loading;
            btn.textContent = loading ? 'Please wait...' : this.getButtonText(btn);
        });
        
        // Update logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.disabled = loading;
            logoutBtn.textContent = loading ? 'Signing out...' : 'Sign Out';
        }
    }

    /**
     * Get button text based on current view
     */
    getButtonText(btn) {
        const form = btn.closest('form');
        if (!form) return 'Submit';
        
        const buttonTexts = {
            'login-form': 'Sign In',
            'register-form': 'Create Account',
            'forgot-password-form': 'Send Reset Link'
        };
        
        return buttonTexts[form.id] || 'Submit';
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        const successElement = document.getElementById('auth-success');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }
        
        // Hide after 5 seconds
        setTimeout(() => {
            if (successElement) {
                successElement.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * Clear error message
     */
    clearError() {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        const successElement = document.getElementById('auth-success');
        if (successElement) {
            successElement.style.display = 'none';
        }
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        const errorMessages = {
            'Invalid login credentials': 'Invalid email or password',
            'Email not confirmed': 'Please confirm your email address before signing in',
            'User already registered': 'An account with this email already exists',
            'Password should be at least 6 characters': 'Password must be at least 6 characters long',
            'Invalid email': 'Please enter a valid email address'
        };
        
        return errorMessages[error.message] || error.message || 'An error occurred. Please try again.';
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const toggleBtn = document.querySelector(`[data-target="${inputId}"]`);
        
        if (input && toggleBtn) {
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.textContent = '👁️';
            } else {
                input.type = 'password';
                toggleBtn.textContent = '👁️‍🗨️';
            }
        }
    }
}

// Global functions for HTML onclick events
function switchAuthView(view) {
    if (window.authManager) {
        window.authManager.switchView(view);
    }
}

function togglePassword(inputId) {
    if (window.authManager) {
        window.authManager.togglePasswordVisibility(inputId);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}