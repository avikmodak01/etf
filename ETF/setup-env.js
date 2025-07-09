/**
 * Development Environment Setup Script
 * Run this script to quickly set up your development environment
 */

// Configuration - UPDATE THESE VALUES
const SUPABASE_CONFIG = {
    // Replace with your actual Supabase project credentials
    URL: 'https://qxhyfcxyrqbqscfveijn.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aHlmY3h5cnFicXNjZnZlaWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODcyNTUsImV4cCI6MjA2NzU2MzI1NX0.gNeBLdxZlpjSm1Gowg5qRXysOUU9_xU6l-p3KG4J3lk'
};

/**
 * Set up development environment
 */
function setupDevelopmentEnvironment() {
    console.log('🚀 Setting up ETF Trading Strategy development environment...');
    
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.protocol === 'file:';
    
    if (!isDevelopment) {
        console.warn('⚠️  This script should only be run in development mode');
        return;
    }
    
    // Clear any existing credentials
    localStorage.removeItem('supabase-url');
    localStorage.removeItem('supabase-anon-key');
    
    // Set development credentials
    if (SUPABASE_CONFIG.URL && SUPABASE_CONFIG.URL !== 'https://your-project-id.supabase.co') {
        localStorage.setItem('supabase-url', SUPABASE_CONFIG.URL);
        localStorage.setItem('supabase-anon-key', SUPABASE_CONFIG.ANON_KEY);
        
        console.log('✅ Development environment configured successfully!');
        console.log('📊 Supabase URL:', SUPABASE_CONFIG.URL);
        console.log('🔑 Anon Key:', SUPABASE_CONFIG.ANON_KEY.substring(0, 20) + '...');
        
        // Reload the page to apply changes
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } else {
        console.error('❌ Please update the SUPABASE_CONFIG object with your actual credentials');
        console.log('📝 Edit setup-env.js and update:');
        console.log('   - URL: Your Supabase project URL');
        console.log('   - ANON_KEY: Your Supabase anon key');
    }
}

/**
 * Clear development environment
 */
function clearDevelopmentEnvironment() {
    localStorage.removeItem('supabase-url');
    localStorage.removeItem('supabase-anon-key');
    console.log('🧹 Development environment cleared');
    window.location.reload();
}

/**
 * Check current environment setup
 */
function checkEnvironmentSetup() {
    const url = localStorage.getItem('supabase-url');
    const key = localStorage.getItem('supabase-anon-key');
    
    console.log('🔍 Current Environment Setup:');
    console.log('URL:', url || 'Not set');
    console.log('Key:', key ? key.substring(0, 20) + '...' : 'Not set');
    
    if (url && key) {
        console.log('✅ Environment is configured');
    } else {
        console.log('❌ Environment needs configuration');
    }
}

// Global functions for console access
window.setupDev = setupDevelopmentEnvironment;
window.clearDev = clearDevelopmentEnvironment;
window.checkEnv = checkEnvironmentSetup;

// Auto-run instructions
console.log('🛠️  ETF Trading Strategy - Development Setup');
console.log('');
console.log('Available commands:');
console.log('  setupDev()  - Set up development environment');
console.log('  clearDev()  - Clear development environment');
console.log('  checkEnv()  - Check current environment setup');
console.log('');
console.log('📝 First, edit setup-env.js with your Supabase credentials');
console.log('   Then run: setupDev()');

// Auto-check environment on load
checkEnvironmentSetup();