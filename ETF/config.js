/**
 * Production Configuration
 * Supabase connection and app settings
 */

class AppConfig {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isProduction = this.detectEnvironment();
        
        // Initialize configuration
        this.init();
    }

    /**
     * Detect if running in production environment
     */
    detectEnvironment() {
        return window.location.protocol === 'https:' || 
               window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1';
    }

    /**
     * Initialize configuration
     */
    async init() {
        try {
            await this.initializeSupabase();
            await this.checkAuthState();
        } catch (error) {
            console.error('Configuration initialization error:', error);
        }
    }

    /**
     * Initialize Supabase client
     */
    async initializeSupabase() {
        // Production configuration - these should be set via environment variables
        const supabaseUrl = this.getEnvVar('SUPABASE_URL');
        const supabaseKey = this.getEnvVar('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
            this.showConfigurationError();
            return;
        }

        try {
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(supabaseUrl, supabaseKey, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                });

                console.log('Supabase client initialized successfully');
            } else {
                throw new Error('Supabase library not loaded');
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.showConfigurationError();
        }
    }

    /**
     * Get environment variable from various sources
     */
    getEnvVar(name) {
        // Try different sources for environment variables
        
        // 1. Process environment (if available)
        if (typeof process !== 'undefined' && process.env) {
            return process.env[name];
        }

        // 2. Window environment variables (set by build process)
        if (typeof window !== 'undefined' && window.ENV) {
            return window.ENV[name];
        }

        // 3. Meta tags (set in HTML)
        const metaTag = document.querySelector(`meta[name="${name}"]`);
        if (metaTag) {
            return metaTag.getAttribute('content');
        }

        // 4. Development fallback - localStorage (only for dev)
        if (!this.isProduction) {
            const stored = localStorage.getItem(name.toLowerCase().replace('_', '-'));
            if (stored) {
                return stored;
            }
        }

        return null;
    }

    /**
     * Check current authentication state
     */
    async checkAuthState() {
        if (!this.supabase) return;

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                console.log('User authenticated:', this.currentUser.email);
                this.onAuthStateChange(true);
            } else {
                this.currentUser = null;
                console.log('User not authenticated');
                this.onAuthStateChange(false);
            }

            // Listen for auth changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state change:', event, session?.user?.email);
                
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    this.currentUser = session.user;
                    this.onAuthStateChange(true);
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.onAuthStateChange(false);
                }
            });

        } catch (error) {
            console.error('Error checking auth state:', error);
        }
    }

    /**
     * Handle authentication state changes
     */
    onAuthStateChange(isAuthenticated) {
        if (isAuthenticated) {
            // Show main app
            this.showMainApp();
            
            // Initialize app with authenticated user
            if (window.app) {
                window.app.initializeWithAuth(this.supabase, this.currentUser);
            }
        } else {
            // Show login screen
            this.showLoginScreen();
        }
    }

    /**
     * Show main application
     */
    showMainApp() {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
        
        // Update user info in header
        this.updateUserInfo();
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        
        if (loginScreen) loginScreen.style.display = 'block';
        if (mainApp) mainApp.style.display = 'none';
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userEmailElement = document.getElementById('user-email');
        const userNameElement = document.getElementById('user-name');
        
        if (this.currentUser) {
            if (userEmailElement) {
                userEmailElement.textContent = this.currentUser.email;
            }
            if (userNameElement) {
                userNameElement.textContent = this.getUserDisplayName();
            }
        }
    }

    /**
     * Get user display name
     */
    getUserDisplayName() {
        if (!this.currentUser) return 'Guest';
        
        return this.currentUser.user_metadata?.full_name || 
               this.currentUser.user_metadata?.name || 
               this.currentUser.email?.split('@')[0] || 
               'User';
    }

    /**
     * Show configuration error
     */
    showConfigurationError() {
        const errorHtml = `
            <div id="config-error" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #1a1a1a;
                color: #e0e0e0;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            ">
                <div style="
                    background: #2d2d2d;
                    padding: 2rem;
                    border-radius: 8px;
                    text-align: center;
                    max-width: 500px;
                    border: 2px solid #f44336;
                ">
                    <h2 style="color: #f44336; margin-bottom: 1rem;">Configuration Error</h2>
                    <p style="margin-bottom: 1rem;">
                        Supabase configuration is missing or invalid.
                    </p>
                    <p style="margin-bottom: 1rem;">
                        Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are properly configured.
                    </p>
                    <div style="
                        background: #3a3a3a;
                        padding: 1rem;
                        border-radius: 4px;
                        margin: 1rem 0;
                        font-family: monospace;
                        font-size: 0.9rem;
                        text-align: left;
                    ">
                        <div>Required environment variables:</div>
                        <div>• SUPABASE_URL</div>
                        <div>• SUPABASE_ANON_KEY</div>
                    </div>
                    <button onclick="window.location.reload()" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                    ">
                        Retry
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHtml);
    }

    // ==================== AUTHENTICATION METHODS ====================

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Sign up with email and password
     */
    async signUp(email, password, metadata = {}) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: metadata
            }
        });

        if (error) {
            throw error;
        }

        return data;
    }

    /**
     * Sign out
     */
    async signOut() {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { error } = await this.supabase.auth.signOut();

        if (error) {
            throw error;
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized');
        }

        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });

        if (error) {
            throw error;
        }

        return data;
    }

    // ==================== GETTERS ====================

    /**
     * Get Supabase client
     */
    getSupabaseClient() {
        return this.supabase;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        return this.currentUser?.id || null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Check if running in production
     */
    isProductionMode() {
        return this.isProduction;
    }
}

// Create global instance
const appConfig = new AppConfig();

// Make available globally
if (typeof window !== 'undefined') {
    window.appConfig = appConfig;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}